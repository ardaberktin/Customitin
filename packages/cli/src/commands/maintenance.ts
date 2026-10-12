import { unlink } from 'node:fs/promises';
import { registrySchema } from '@customitin/core';
import {
  atomicWrite,
  hash,
  manifestPath,
  readOptional,
  readOwnership,
  safePath,
} from './files';
import { inspectProject } from '../discovery/scan';
import { integrationDiagnostics } from './diagnostics';
import { identityPath } from '../configuration/identity';
export async function doctorProject(
  root: string,
  options: { typecheck?: boolean } = {},
) {
  const report = await inspectProject(root);
  const ownership = await readOwnership(root);
  const issues: string[] = [];
  const recommendations: string[] = [];
  if (!ownership) issues.push('No installation manifest. Run init --dry-run.');
  for (const file of ownership?.files ?? [])
    if (
      hash((await readOptional(await safePath(root, file.path))) ?? '') !==
      file.hash
    )
      issues.push(`Drift: ${file.path}`);
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
    !report.versions['@customitin/react-native']
  )
    issues.push(
      'Install @customitin/core and @customitin/react-native (local tarballs until published).',
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
    nextChecks: [
      'Run the host typecheck, lint and bundle commands.',
      'Review complete-source declarations and demonstrate a customization.',
    ],
  };
}
export async function removeProject(root: string, dryRun = true) {
  const manifest = await readOwnership(root);
  if (!manifest) return { removed: [], conflicts: [] };
  const conflicts: string[] = [];
  const removed: string[] = [];
  for (const file of manifest.files) {
    const path = await safePath(root, file.path);
    const current = await readOptional(path);
    if (current === null) continue;
    if (hash(current) !== file.hash) {
      conflicts.push(file.path);
      continue;
    }
    // Overrides can reference past selectors. Retain their identity history for reinstall.
    if (file.path !== identityPath) removed.push(file.path);
  }
  // Preserve the complete integration if any part has user changes.
  if (!dryRun && conflicts.length === 0) {
    for (const file of manifest.files.filter((f) => removed.includes(f.path))) {
      if (file.before === null) await unlink(await safePath(root, file.path));
      else await atomicWrite(root, file.path, file.before);
    }
    await unlink(await safePath(root, manifestPath));
  }
  return { removed, conflicts };
}
