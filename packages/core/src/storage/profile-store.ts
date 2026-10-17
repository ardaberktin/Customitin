import { createProfile, validateProfile } from '../validation/profile';
import { reconcileProfile } from '../migrations/reconcile';
import type { CapabilityRegistry } from '../schema/registry';
import type { Profile } from '../schema/configuration';

/** setItem must atomically replace one key. Multi-key transactions are not assumed. */
export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}
export interface ProfileRecord {
  current: Profile;
  history: Profile[];
}
const queues = new WeakMap<StorageAdapter, Map<string, Promise<unknown>>>();
export class ProfileStore {
  private readonly key: string;
  constructor(
    private storage: StorageAdapter,
    private registry: CapabilityRegistry,
    private scope: string,
  ) {
    this.key = `customitin:${registry.appId}:v2:${encodeURIComponent(scope)}`;
  }
  private serial<T>(work: () => Promise<T>): Promise<T> {
    let scopes = queues.get(this.storage);
    if (!scopes) {
      scopes = new Map();
      queues.set(this.storage, scopes);
    }
    const task = (scopes.get(this.key) ?? Promise.resolve())
      .catch(() => undefined)
      .then(work);
    scopes.set(this.key, task);
    return task;
  }
  private decode(raw: string): { record: ProfileRecord; warnings: string[] } {
    if (raw.length > 2_000_000) throw new Error('Stored profile is too large');
    const value = JSON.parse(raw) as ProfileRecord;
    if (!Array.isArray(value.history) || value.history.length > 20)
      throw new Error('Invalid history');
    const { profile, warnings } = reconcileProfile(
      value.current,
      this.registry,
      this.scope,
    );
    const history: Profile[] = [];
    for (const previous of value.history) {
      try {
        if (previous.scope !== this.scope) throw new Error('Scope mismatch');
        history.push(validateProfile(previous, this.registry));
      } catch {
        /* Obsolete history cannot be activated. */
      }
    }
    return { record: { current: profile, history }, warnings };
  }
  private async read(): Promise<{ record: ProfileRecord; warnings: string[] }> {
    const warnings: string[] = [];
    const retired = await this.storage.getItem(`${this.key}:v1-retired`);
    const candidates = ['head', 'backup'].map(
      (suffix) => `${this.key}:${suffix}`,
    );
    if (!retired)
      candidates.push(
        ...['head', 'backup'].map(
          (suffix) => `${this.key.replace(':v2:', ':v1:')}:${suffix}`,
        ),
      );
    for (const key of candidates) {
      const raw = await this.storage.getItem(key);
      if (raw === null) continue;
      try {
        const decoded = this.decode(raw);
        return {
          record: decoded.record,
          warnings: [...warnings, ...decoded.warnings],
        };
      } catch {
        warnings.push(
          'A saved layout could not be restored. Recovered the last usable version.',
        );
      }
    }
    return {
      record: {
        current: createProfile(this.registry, this.scope),
        history: [],
      },
      warnings,
    };
  }
  load(): Promise<{ record: ProfileRecord; warnings: string[] }> {
    return this.serial(() => this.read());
  }
  update(
    change: (record: ProfileRecord) => ProfileRecord,
  ): Promise<ProfileRecord> {
    return this.serial(async () => {
      const { record: previous } = await this.read();
      const next = change(previous);
      if (next.current.scope !== this.scope)
        throw new Error('Profile scope mismatch');
      validateProfile(next.current, this.registry);
      const payload = JSON.stringify(next);
      this.decode(payload);
      // Backup first; interruption before/after either write leaves at least one valid record.
      await this.storage.setItem(
        `${this.key}:backup`,
        JSON.stringify(previous),
      );
      await this.storage.setItem(`${this.key}:head`, payload);
      if ((await this.storage.getItem(`${this.key}:head`)) !== payload)
        throw new Error('Storage did not retain the complete profile');
      await this.storage.setItem(`${this.key}:v1-retired`, 'true');
      return next;
    });
  }
  erase(): Promise<void> {
    return this.serial(async () => {
      // Keep v1 recovery bytes, but never reactivate them after the account clears v2.
      await this.storage.setItem(`${this.key}:v1-retired`, 'true');
      await this.storage.removeItem(`${this.key}:head`);
      await this.storage.removeItem(`${this.key}:backup`);
    });
  }
}
export function memoryStorage(): StorageAdapter {
  const data = new Map<string, string>();
  return {
    async getItem(key) {
      return data.get(key) ?? null;
    },
    async setItem(key, value) {
      data.set(key, value);
    },
    async removeItem(key) {
      data.delete(key);
    },
  };
}
/** Accept AsyncStorage or an encrypted host implementation; no mandatory native dependency. */
export function asyncStorageAdapter(storage: StorageAdapter): StorageAdapter {
  return storage;
}
