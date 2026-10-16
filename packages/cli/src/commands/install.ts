import { unlink } from 'node:fs/promises';
import { inspectProject, type DiscoveryReport } from '../discovery/scan';
import { generateRegistry } from '../generation/registry';
import { generateFiles, initialConfig } from '../generation/templates';
import { generateHostFiles } from './host-files';
import { formatGenerated } from '../generation/format';
import {
  identityPath,
  preserveIdentity,
  readIdentity,
} from '../configuration/identity';
import {
  readOverrides,
  overridesPath,
  emptyOverrides,
  overridesSchema,
  type IntegrationOverrides,
} from '../configuration/overrides';
import { resolveIntegration } from '../configuration/resolve';
import { importLegacyIdentity } from '../configuration/legacy';
import { projectSnapshot } from './snapshot';
import { readHostOwnership } from './host-ownership';
import { planDevScripts } from '../development/scripts';
import {
  atomicWrite,
  hash,
  manifestPath,
  readOptional,
  safePath,
  type Ownership,
} from './files';
export interface InstallPlan {
  report: DiscoveryReport;
  files: Record<string, string>;
  conflicts: string[];
  ownership: Ownership;
  changes: string[];
  setup: Record<string, string>;
  issues: string[];
}
export async function planInstall(
  root: string,
  selectedIds?: string[],
  requestedOverrides?: IntegrationOverrides,
): Promise<InstallPlan> {
  const report = await inspectProject(root);
  const previous = await readHostOwnership(root);
  const overrides = overridesSchema.parse(
    requestedOverrides ?? (await readOverrides(root)),
  );
  const identity = await importLegacyIdentity(
    root,
    report,
    await readIdentity(root),
  );
  const selectedSelectors = report.symbols
    .filter((s) => selectedIds?.includes(s.id))
    .map((s) => s.selector);
  const lock = preserveIdentity(report, identity, overrides);
  if (selectedIds)
    lock.selectedSources = report.symbols
      .filter((s) => selectedSelectors.includes(s.selector))
      .map((s) => s.id);
  const integration = resolveIntegration(report, overrides, lock);
  report.unresolved = [
    ...report.unresolved.filter(
      (issue) =>
        !integration.sources.some((s) => issue.startsWith(s.symbol.selector)),
    ),
    ...integration.issues,
  ];
  const registry = generateRegistry(report, integration);
  const files: Record<string, string> = {
    ...generateFiles(report, registry, integration),
    [identityPath]: JSON.stringify(lock, null, 2) + '\n',
  };
  const setup: Record<string, string> = {};
  if (
    (await readOptional(await safePath(root, 'personalize/config.ts'))) === null
  )
    setup['personalize/config.ts'] = initialConfig(report);
  const previousOverrides = await readOptional(
    await safePath(root, overridesPath),
  );
  if (previousOverrides === null || requestedOverrides)
    setup[overridesPath] =
      JSON.stringify(requestedOverrides ?? emptyOverrides(), null, 2) + '\n';
  const conflicts: string[] = [];
  const host = await generateHostFiles(root, report, integration, previous);
  Object.assign(files, host.files);
  await formatGenerated(root, files);
  Object.assign(files, host.restored);
  await formatGenerated(root, setup);
  const development = await planDevScripts(
    root,
    previous?.devScripts,
    overrides.devScripts,
  );
  conflicts.push(...development.conflicts);
  if (development.changed) files['package.json'] = development.content;
  const ownership: Ownership = {
    version: 1,
    contextDigest: report.contextDigest,
    registryRevision: registry.revision,
    files: [],
    ...(development.bindings.length
      ? { devScripts: development.bindings }
      : {}),
  };
  const changes: string[] = [];
  for (const [path, content] of Object.entries(files)) {
    const current = await readOptional(await safePath(root, path));
    const owned = previous?.files.find((f) => f.path === path);
    if (path === 'package.json') {
      if (current !== content) changes.push(path);
      continue;
    }
    if (
      current !== null &&
      current !== content &&
      ((!owned &&
        !host.selected.has(path) &&
        path !== report.entry &&
        path !== identityPath) ||
        (owned && !(path in host.before) && hash(current) !== owned.hash))
    )
      conflicts.push(path);
    if (current !== content) changes.push(path);
    if (!(path in host.restored))
      ownership.files.push({
        path,
        hash: hash(content),
        before: host.before[path] ?? (owned ? owned.before : current),
        ...(host.bindings[path] ? { host: host.bindings[path] } : {}),
      });
  }
  return {
    report,
    files,
    setup,
    conflicts,
    ownership,
    changes,
    issues: integration.issues,
  };
}
export async function installProject(
  root: string,
  {
    dryRun = true,
    selectedIds,
    overrides,
  }: {
    dryRun?: boolean;
    selectedIds?: string[];
    overrides?: IntegrationOverrides;
  } = {},
) {
  const snapshot = dryRun ? undefined : await projectSnapshot(root);
  const plan = await planInstall(root, selectedIds, overrides);
  if (dryRun || plan.conflicts.length || plan.issues.length) return plan;
  if (snapshot !== (await projectSnapshot(root))) {
    plan.issues.push(
      'Project changed while planning. Retry refresh after saving your edits.',
    );
    return plan;
  }
  const priorManifest = await readOptional(await safePath(root, manifestPath));
  const backup = new Map<string, string | null>();
  for (const path of [...plan.changes, ...Object.keys(plan.setup)])
    backup.set(path, await readOptional(await safePath(root, path)));
  // Record ownership before writes so an interrupted installation is diagnosable.
  await atomicWrite(
    root,
    manifestPath,
    JSON.stringify(plan.ownership, null, 2) + '\n',
  );
  try {
    for (const [path, content] of Object.entries(plan.setup))
      await atomicWrite(root, path, content);
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
