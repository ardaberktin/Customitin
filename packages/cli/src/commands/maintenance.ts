import { unlink } from 'node:fs/promises';
import { registrySchema } from '@customitin/core';
import {
  atomicWrite,
  hash,
  manifestPath,
  readOptional,
  safePath,
} from './files';
import { inspectProject } from '../discovery/scan';
import { integrationDiagnostics } from './diagnostics';
import { identityPath } from '../configuration/identity';
import { restoreHost } from '../generation/restore-host';
import { readHostOwnership } from './host-ownership';
import { planDevScripts } from '../development/scripts';
export async function doctorProject(
  root: string,
  options: { typecheck?: boolean } = {},
) {
  const report = await inspectProject(root);
  const ownership = await readHostOwnership(root);
  const issues: string[] = [];
  const recommendations: string[] = [];
  if (!ownership) issues.push('No installation manifest. Run init --dry-run.');
  for (const file of ownership?.files ?? []) {
    const current = await readOptional(await safePath(root, file.path));
    if (current === null) {
      issues.push(`Missing: ${file.path}`);
      continue;
    }
    if (file.host) {
      try {
        restoreHost(file.path, current, file);
      } catch (error) {
        issues.push(`${file.path}: ${(error as Error).message}`);
      }
    } else if (hash(current) !== file.hash) issues.push(`Drift: ${file.path}`);
  }
  const mobile = await readOptional(
    await safePath(root, 'personalize/capabilities.json'),
  );
  const server = await readOptional(
    await safePath(root, 'personalize/server-manifest.json'),
  );
  if (mobile && server) {
    try {
      const a = registrySchema.parse(JSON.parse(mobile));
      const b = registrySchema.parse(JSON.parse(server));
      if (JSON.stringify(a) !== JSON.stringify(b))
        issues.push(
          'Mobile/server manifest mismatch. Refresh and deploy the matching server manifest.',
        );
    } catch {
      issues.push('Invalid capability manifest.');
    }
  }
  if (
    !report.versions['@customitin/core'] ||
    !(
      report.versions['@customitin/react'] ||
      report.versions['@customitin/react-native']
    )
  )
    issues.push(
      `Install @customitin/core and ${report.platform === 'web' ? '@customitin/react' : '@customitin/react-native'} (local tarballs until published).`,
    );
  const config = await readOptional(
    await safePath(root, 'personalize/config.ts'),
  );
  if (config?.includes('memoryStorage()'))
    issues.push(
      'Connect persistent host storage. The scaffold currently uses in-memory preview storage.',
    );
  if (config?.includes('= undefined'))
    recommendations.push(
      'Optional: connect a planner endpoint for natural-language customization. Manual preferences work offline.',
    );
  if (config?.includes("scope = 'local-device'"))
    recommendations.push(
      'Review local-device scope: connect an account-specific scope before using authenticated data.',
    );
  issues.push(...(await integrationDiagnostics(root, !!options.typecheck)));
  return {
    issues,
    recommendations,
    coverage: report,
    verification:
      options.typecheck && !issues.length
        ? { status: 'verified', check: 'doctor --typecheck (static only)' }
        : { status: 'unverified' },
    nextChecks: [
      'Run the host typecheck, lint and bundle commands.',
      'Review complete-source declarations and demonstrate a customization.',
    ],
  };
}
export async function removeProject(root: string, dryRun = true) {
  const manifest = await readHostOwnership(root);
  if (!manifest) return { removed: [], conflicts: [] };
  const conflicts: string[] = [];
  const removed: string[] = [];
  const restored = new Map<string, string | null>();
  const development = await planDevScripts(root, manifest.devScripts, false);
  conflicts.push(...development.conflicts);
  if (development.changed) removed.push('package.json');
  for (const file of manifest.files) {
    const path = await safePath(root, file.path);
    const current = await readOptional(path);
    if (current === null) continue;
    try {
      if (file.host)
        restored.set(file.path, restoreHost(file.path, current, file));
      else if (hash(current) !== file.hash)
        throw new Error('Generated file drift');
      else restored.set(file.path, file.before);
    } catch {
      conflicts.push(file.path);
      continue;
    }
    // Overrides can reference past selectors. Retain their identity history for reinstall.
    if (file.path !== identityPath) removed.push(file.path);
  }
  // Preserve the complete integration if any part has user changes.
  if (!dryRun && conflicts.length === 0) {
    if (development.changed)
      await atomicWrite(root, 'package.json', development.content);
    for (const file of manifest.files.filter((f) => removed.includes(f.path))) {
      const content = restored.get(file.path)!;
      if (content === null) await unlink(await safePath(root, file.path));
      else await atomicWrite(root, file.path, content);
    }
    await unlink(await safePath(root, manifestPath));
  }
  return { removed, conflicts };
}
