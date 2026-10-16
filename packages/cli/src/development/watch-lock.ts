import { randomUUID } from 'node:crypto';
import { mkdir, realpath, stat, unlink, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { setTimeout } from 'node:timers/promises';
import { z } from 'zod';
import { hash, readOptional } from '../commands/files';

export async function watchLockPath(root: string) {
  return join(
    tmpdir(),
    `customitin-watch-${hash(await realpath(root))}`,
    'owner.json',
  );
}

const ownerSchema = z.object({
  pid: z.number().int().positive(),
  token: z.string(),
});
export class WatchAlreadyRunningError extends Error {
  constructor() {
    super('A Customitin watcher is already applying changes in this app.');
  }
}
async function stale(path: string): Promise<boolean> {
  const text = await readOptional(path);
  if (text === null) return true;
  let owner: z.infer<typeof ownerSchema> | undefined;
  try {
    owner = ownerSchema.parse(JSON.parse(text));
  } catch {
    /* An exclusive creator may still be writing its PID. */
  }
  if (owner) {
    try {
      process.kill(owner.pid, 0);
      return false;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ESRCH') return false;
    }
  } else {
    const info = await stat(path).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== 'ENOENT') throw error;
      return undefined;
    });
    if (!info) return true;
    if (Date.now() - info.mtimeMs < 30_000) return false;
  }
  if ((await readOptional(path)) === text)
    await unlink(path).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== 'ENOENT') throw error;
    });
  return true;
}

/** An exclusive lease prevents nested scripts or separate dev commands from writing together. */
export async function acquireWatchLock(
  root: string,
  signal: AbortSignal,
  wait: boolean,
) {
  const path = await watchLockPath(root);
  const owner = JSON.stringify({ pid: process.pid, token: randomUUID() });
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  while (!signal.aborted) {
    try {
      await writeFile(path, owner, { flag: 'wx', mode: 0o600 });
      return async () => {
        if ((await readOptional(path)) === owner) await unlink(path);
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      if (await stale(path)) continue;
      if (!wait) throw new WatchAlreadyRunningError();
      try {
        await setTimeout(1000, undefined, { signal });
      } catch (error) {
        if (!signal.aborted) throw error;
      }
    }
  }
}
