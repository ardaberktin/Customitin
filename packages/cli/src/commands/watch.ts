import { setTimeout } from 'node:timers/promises';
import { installProject } from './install';
import { readOwnership } from './files';
import { projectSnapshot } from './snapshot';

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
}

/** Local regeneration only: never executes host scripts or invokes installer AI. */
export async function watchProject(
  root: string,
  { signal, onUpdate, dryRun = true, intervalMs = 1000 }: WatchOptions,
) {
  if (!(await readOwnership(root)))
    throw new Error('Run init --apply before starting watch.');
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
