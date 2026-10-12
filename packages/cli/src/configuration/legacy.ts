import { registrySchema } from '@customitin/core';
import type { DiscoveryReport } from '../discovery/types';
import type { IdentityLock } from './identity';
import { readOptional, safePath } from '../commands/files';

/** Import IDs from pre-lock installations so saved views keep their source identity. */
export async function importLegacyIdentity(
  root: string,
  report: DiscoveryReport,
  lock: IdentityLock,
): Promise<IdentityLock> {
  if (lock.bindings.length) return lock;
  const raw = await readOptional(
    await safePath(root, 'personalize/capabilities.json'),
  );
  if (!raw) return lock;
  const registry = registrySchema.parse(JSON.parse(raw));
  const bindings = report.symbols
    .filter((s) => s.kind === 'source')
    .flatMap((symbol) => {
      const oldId = `${symbol.file.replace(/[^a-zA-Z0-9]/g, '-')}.${symbol.name}`;
      const old = registry.sources.find((s) => s.id === oldId);
      return old
        ? [
            {
              id: old.id,
              selector: symbol.selector,
              name: symbol.name,
              kind: symbol.kind,
              aliases: [],
            },
          ]
        : [];
    });
  return { ...lock, bindings };
}
