import { describe, expect, it } from 'vitest';
import {
  memoryStorage,
  ProfileStore,
  type StorageAdapter,
} from '../packages/react-native/src/storage/profile-store';
import { CustomizationRuntime } from '../packages/react-native/src/provider/runtime';
import { registries } from '../examples/shared/src/registry';
import { demoPlan } from '../examples/shared/src/demo-planner';
const registry = registries.recipe;
const options = (storage = memoryStorage(), scope = 'alice') => ({
  registry,
  storage,
  scope,
});
describe('local profiles and runtime', () => {
  it('persists a committed preview across restart with no planner calls, then undoes and resets', async () => {
    const config = options();
    const first = new CustomizationRuntime(config);
    await first.start();
    first.previewOperations(
      [{ op: 'setThemeTokens', tokens: { 'type.scale': 1.2 } }],
      'Read comfortably',
      ['home'],
    );
    expect(first.getSnapshot().profile?.theme).toEqual({});
    await first.apply();
    const restarted = new CustomizationRuntime(config);
    await restarted.start();
    expect(restarted.getSnapshot().profile?.theme['type.scale']).toBe(1.2);
    await restarted.undo();
    expect(restarted.getSnapshot().profile?.theme).toEqual({});
    await restarted.rename('Weekend kitchen');
    expect(restarted.getSnapshot().profile?.name).toBe('Weekend kitchen');
    await restarted.reset();
    expect(restarted.getSnapshot().profile?.name).toBe('My space');
    await restarted.undo();
    expect(restarted.getSnapshot().profile?.name).toBe('Weekend kitchen');
  });
  it.each([1, 2])(
    'recovers when a write is interrupted at write %i',
    async (at) => {
      const backing = memoryStorage();
      let count = 0;
      let fail = false;
      const storage: StorageAdapter = {
        ...backing,
        async setItem(key, value) {
          if (fail && ++count === at) throw new Error('Power loss');
          await backing.setItem(key, value);
        },
      };
      const runtime = new CustomizationRuntime(options(storage));
      await runtime.start();
      await runtime.rename('Known good');
      fail = true;
      await expect(runtime.rename('Interrupted')).rejects.toThrow('Power loss');
      fail = false;
      const { record } = await new ProfileStore(
        storage,
        registry,
        'alice',
      ).load();
      expect(record.current.name).toBe('Known good');
    },
  );
  it('recovers a corrupted head from the last known good backup', async () => {
    const storage = memoryStorage();
    const runtime = new CustomizationRuntime(options(storage));
    await runtime.start();
    await runtime.rename('Last good');
    await runtime.rename('Latest');
    await storage.setItem('customitin:recipe-demo:v2:alice:head', '{broken');
    const restored = new CustomizationRuntime(options(storage));
    await restored.start();
    expect(restored.getSnapshot().profile?.name).toBe('Last good');
    expect(restored.getSnapshot().warnings).not.toEqual([]);
  });
  it('clears the old profile immediately on account switch and ignores late planner output', async () => {
    let resolve: (() => void) | undefined;
    const gate = new Promise<void>((r) => {
      resolve = r;
    });
    const runtime = new CustomizationRuntime({
      ...options(),
      planner: {
        async plan(request) {
          await gate;
          return demoPlan('recipe', request);
        },
      },
    });
    await runtime.start();
    await runtime.rename('Alice');
    const request = runtime.request('dark', ['home']);
    const switching = runtime.switchScope('bob');
    expect(runtime.getSnapshot().profile).toBeUndefined();
    await switching;
    resolve?.();
    await request;
    expect(runtime.getSnapshot().profile?.scope).toBe('bob');
    expect(runtime.getSnapshot().preview).toBeUndefined();
    expect(runtime.getSnapshot().profile?.theme).toEqual({});
    await runtime.switchScope('alice');
    expect(runtime.getSnapshot().profile?.name).toBe('Alice');
  });
  it('serializes writes and rejects applying a preview after another writer changed the scope', async () => {
    const config = options();
    const a = new CustomizationRuntime(config);
    const b = new CustomizationRuntime(config);
    await a.start();
    await b.start();
    a.previewOperations(
      [{ op: 'setThemeTokens', tokens: { 'type.scale': 1.2 } }],
      'Larger',
      ['home'],
    );
    await b.rename('Changed elsewhere');
    await expect(a.apply()).rejects.toThrow('changed');
    await Promise.all([b.rename('First'), b.rename('Second')]);
    expect(b.getSnapshot().profile?.name).toBe('Second');
    expect(b.getSnapshot().profile?.revision).toBe(3);
  });
  it('keeps the active profile when persistence fails', async () => {
    const runtime = new CustomizationRuntime(
      options({
        ...memoryStorage(),
        async setItem() {
          throw new Error('Disk full');
        },
      }),
    );
    await runtime.start();
    await expect(runtime.rename('Unsaved')).rejects.toThrow();
    expect(runtime.getSnapshot().profile?.name).toBe('My space');
  });
});
