import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { devProcess, readJson, readLock, until } from './helpers/dev-process';
import type { CapabilityRegistry } from '@customitin/core';
type Ready = { pid: number; child: number; args: string[]; flag: string };

it('starts the watcher through the existing npm command, forwards literal arguments and preserves hooks', async () => {
  const args = [
    '--port',
    '8099',
    'two words',
    '$(touch injected)',
    'semi;colon',
    'quote"value',
  ];
  const app = await devProcess(args);
  try {
    const ready = await until(
      () => readJson<Ready>(app.root, 'ready.json'),
      Boolean,
    );
    expect(ready.args).toEqual(args);
    expect(ready.flag).toBe('inherited');
    await until(() => readLock(app.root), Boolean);
    await writeFile(
      join(app.root, 'data.ts'),
      '/** @customitinComplete */\nexport async function loadTasks(): Promise<{id:string; title:string}[]> { return []; }',
    );
    await until(
      () =>
        readJson<{ capabilities: { selector: string; status: string }[] }>(
          app.root,
          'personalize/discovery.json',
        ),
      (report) =>
        report.capabilities.some(
          (item) =>
            item.selector === 'data.ts#loadTasks' && item.status === 'bindable',
        ),
    );
    expect(
      (
        await readJson<CapabilityRegistry>(
          app.root,
          'personalize/capabilities.json',
        )
      ).sources,
    ).toEqual([]);
    await writeFile(join(app.root, 'exit.txt'), '0');
    expect(await app.exited).toBe(0);
    expect(await readFile(join(app.root, 'events.txt'), 'utf8')).toBe(
      'pre\nhost\npost\n',
    );
    await expect(readFile(join(app.root, 'injected'))).rejects.toThrow();
    await expect(readLock(app.root)).rejects.toThrow();
  } catch (error) {
    throw new Error(`${String(error)}\n${app.output()}`, { cause: error });
  } finally {
    await app.stop();
  }
});

it('shares one watcher when a development command calls another wrapped script', async () => {
  const app = await devProcess(['--port', '8099'], false, true);
  try {
    const ready = await until(
      () => readJson<Ready>(app.root, 'ready.json'),
      Boolean,
    );
    expect(ready.args).toEqual(['--port', '8099']);
    await until(() => readLock(app.root), Boolean);
    await writeFile(join(app.root, 'exit.txt'), '0');
    expect(await app.exited).toBe(0);
    expect(await readFile(join(app.root, 'events.txt'), 'utf8')).toBe(
      'pre\nhost\npost\n',
    );
    await expect(readLock(app.root)).rejects.toThrow();
  } catch (error) {
    throw new Error(`${String(error)}\n${app.output()}`, { cause: error });
  } finally {
    await app.stop();
  }
});

it('preserves host failures and releases the watcher', async () => {
  const app = await devProcess();
  try {
    await until(() => readJson(app.root, 'ready.json'), Boolean);
    await writeFile(join(app.root, 'exit.txt'), '7');
    expect(await app.exited).toBe(7);
    expect(await readFile(join(app.root, 'events.txt'), 'utf8')).toBe(
      'pre\nhost\n',
    );
    await expect(readLock(app.root)).rejects.toThrow();
  } catch (error) {
    throw new Error(`${String(error)}\n${app.output()}`, { cause: error });
  } finally {
    await app.stop();
  }
});

it.each([
  ['SIGINT', false],
  ['SIGTERM', false],
  ['SIGINT', true],
  ['SIGTERM', true],
] as const)(
  'stops the app, its descendants and the watcher on %s (nested: %s)',
  async (signal, nested) => {
    const app = await devProcess([], true, nested);
    try {
      const ready = await until(
        () => readJson<Ready>(app.root, 'ready.json'),
        Boolean,
      );
      const lock = await until(() => readLock(app.root), Boolean);
      process.kill(lock.pid, signal);
      expect(await app.exited).toBe(signal === 'SIGINT' ? 130 : 143);
      for (const pid of [ready.pid, ready.child]) {
        await until(async () => {
          try {
            process.kill(pid, 0);
            return false;
          } catch (error) {
            return (error as NodeJS.ErrnoException).code === 'ESRCH';
          }
        }, Boolean);
      }
      await expect(readLock(app.root)).rejects.toThrow();
    } catch (error) {
      throw new Error(`${String(error)}\n${app.output()}`, { cause: error });
    } finally {
      await app.stop();
    }
  },
);
