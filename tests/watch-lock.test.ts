import { mkdtemp, readFile, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { expect, it } from 'vitest';
import {
  acquireWatchLock,
  watchLockPath,
} from '../packages/cli/src/development/watch-lock';

it('excludes a second writer, lets a waiting writer take over and cancels waiting cleanly', async () => {
  const root = await mkdtemp(join(tmpdir(), 'customitin-lock-'));
  const first = new AbortController();
  const second = new AbortController();
  const release = await acquireWatchLock(root, first.signal, false);
  try {
    await expect(acquireWatchLock(root, second.signal, false)).rejects.toThrow(
      'already applying',
    );
    const waiting = acquireWatchLock(root, second.signal, true);
    await release!();
    const releaseSecond = await waiting;
    expect(releaseSecond).toBeTypeOf('function');
    try {
      const cancelled = new AbortController();
      const wait = acquireWatchLock(root, cancelled.signal, true);
      cancelled.abort();
      expect(await wait).toBeUndefined();
    } finally {
      await releaseSecond!();
    }
    await expect(readFile(await watchLockPath(root))).rejects.toThrow();
  } finally {
    await release!();
  }
});

it('recovers a stale lock left by a process that no longer exists', async () => {
  const root = await mkdtemp(join(tmpdir(), 'customitin-lock-'));
  const path = await watchLockPath(root);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify({ pid: 2147483647, token: 'stale' }));
  const release = await acquireWatchLock(
    root,
    new AbortController().signal,
    false,
  );
  expect(release).toBeTypeOf('function');
  await release!();
});
