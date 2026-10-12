import { unlink } from 'node:fs/promises';
import { inspectProject, type DiscoveryReport } from '../discovery/scan';
import { generateRegistry } from '../generation/registry';
import { generateFiles, initialConfig } from '../generation/templates';
import { wrapEntry } from '../generation/transform';
import {
  atomicWrite,
  hash,
  manifestPath,
  readOptional,
  readOwnership,
  safePath,
  type Ownership,
} from './files';
export interface InstallPlan {
  report: DiscoveryReport;
  files: Record<string, string>;
  conflicts: string[];
  ownership: Ownership;
  changes: string[];
}
export async function planInstall(
  root: string,
  selectedIds?: string[],
): Promise<InstallPlan> {
  const report = await inspectProject(root);
  const previous = await readOwnership(root);
  const registry = generateRegistry(report, selectedIds);
  const files = generateFiles(report, registry);
  const conflicts: string[] = [];
  if (report.entry) {
    const current = await readOptional(await safePath(root, report.entry));
    const owned = previous?.files.find((f) => f.path === report.entry);
    if (current !== null) {
      try {
        files[report.entry] = wrapEntry(report.entry, owned?.before ?? current);
      } catch (error) {
        report.unresolved.push((error as Error).message);
      }
    }
  }
  const ownership: Ownership = {
    version: 1,
    contextDigest: report.contextDigest,
    registryRevision: registry.revision,
    files: [],
  };
  const changes: string[] = [];
  for (const [path, content] of Object.entries(files)) {
    const current = await readOptional(await safePath(root, path));
    const owned = previous?.files.find((f) => f.path === path);
    if (
      current !== null &&
      current !== content &&
      ((!owned && path !== report.entry) ||
        (owned && hash(current) !== owned.hash))
    )
      conflicts.push(path);
    if (current !== content) changes.push(path);
    ownership.files.push({
      path,
      hash: hash(content),
      before: owned ? owned.before : current,
    });
  }
  return { report, files, conflicts, ownership, changes };
}
export async function installProject(
  root: string,
  {
    dryRun = true,
    selectedIds,
  }: { dryRun?: boolean; selectedIds?: string[] } = {},
) {
  const plan = await planInstall(root, selectedIds);
  if (dryRun || plan.conflicts.length) return plan;
  // A developer-owned config is never overwritten or removed by refresh/remove.
  if (
    (await readOptional(await safePath(root, 'personalize/config.ts'))) === null
  )
    await atomicWrite(root, 'personalize/config.ts', initialConfig);
  const priorManifest = await readOptional(await safePath(root, manifestPath));
  const backup = new Map<string, string | null>();
  for (const path of plan.changes)
    backup.set(path, await readOptional(await safePath(root, path)));
  // Record ownership before writes so an interrupted installation is diagnosable.
  await atomicWrite(
    root,
    manifestPath,
    JSON.stringify(plan.ownership, null, 2) + '\n',
  );
  try {
    for (const path of plan.changes) {
      const content = plan.files[path];
      if (content !== undefined) await atomicWrite(root, path, content);
    }
  } catch (error) {
    for (const [path, content] of backup) {
      if (content === null) {
        try {
          await unlink(await safePath(root, path));
        } catch {
          /* May not have been written. */
        }
      } else await atomicWrite(root, path, content);
    }
    if (priorManifest) await atomicWrite(root, manifestPath, priorManifest);
    else await unlink(await safePath(root, manifestPath));
    throw error;
  }
  return plan;
}
