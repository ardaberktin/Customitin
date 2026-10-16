import { setTimeout } from 'node:timers/promises';
import { installProject } from './install';
import { readOwnership } from './files';
import { projectSnapshot } from './snapshot';
import { acquireWatchLock } from '../development/watch-lock';

export interface WatchUpdate {
  changes: string[];
  conflicts: string[];
  issues: string[];
  applied: boolean;
}
export interface WatchOptions {
  signal: AbortSignal;
  dryRun?: boolean;
  intervalMs?: number;
  onUpdate: (result: WatchUpdate) => void | Promise<void>;
  waitForLock?: boolean;
}

/** Local regeneration only: never executes host scripts or invokes installer AI. */
export async function watchProject(root: string, options: WatchOptions) {
  if (!(await readOwnership(root)))
    throw new Error('Run init --apply before starting watch.');
  if (options.dryRun !== false) return watchLoop(root, options);
  const release = await acquireWatchLock(
    root,
    options.signal,
    !!options.waitForLock,
  );
  if (!release) return;
  try {
    await watchLoop(root, options);
  } finally {
    await release();
  }
}

async function watchLoop(
  root: string,
  { signal, onUpdate, dryRun = true, intervalMs = 1000 }: WatchOptions,
) {
  let previous: string | undefined;
  let lastError: string | undefined;
  let previouslyBlocked = false;
  while (!signal.aborted) {
    let snapshot: string | undefined;
    try {
      snapshot = await projectSnapshot(root);
      if (snapshot !== previous) {
        if (!(await readOwnership(root)))
          throw new Error(
            'Integration removed. Stop watch or run init --apply again.',
          );
        const result = await installProject(root, { dryRun });
        const applied =
          !dryRun && !result.conflicts.length && !result.issues.length;
        if (
          previous === undefined ||
          result.changes.length ||
          result.conflicts.length ||
          result.issues.length ||
          previouslyBlocked ||
          lastError
        )
          await onUpdate({
            changes: result.changes,
            conflicts: result.conflicts,
            issues: result.issues,
            applied,
          });
        lastError = undefined;
        previouslyBlocked = !!(result.conflicts.length || result.issues.length);
        // Re-scan after our own writes on the next tick, so concurrent saves are not swallowed.
        previous = snapshot;
      }
    } catch (error) {
      const message = (error as Error).message;
      if (message !== lastError)
        await onUpdate({
          changes: [],
          conflicts: [],
          issues: [message],
          applied: false,
        });
      previous = snapshot;
      lastError = message;
    }
    try {
      await setTimeout(Math.max(50, intervalMs), undefined, { signal });
    } catch (error) {
      if (!signal.aborted) throw error;
    }
  }
}
