import { realpath } from 'node:fs/promises';
import { workspaceBoundary } from '../discovery/workspace';
import { join, relative, resolve, isAbsolute } from 'node:path';
import { sourceFiles } from '../discovery/files';
import {
  hash,
  manifestPath,
  readOptional,
  readOwnership,
  safePath,
} from './files';

/** Bounded polling also handles editor atomic saves and newly created source files. */
export async function projectSnapshot(root: string): Promise<string> {
  const ownership = await readOwnership(root);
  const paths = new Set([
    ...(await sourceFiles(root)).map((path) => relative(root, path)),
    'package.json',
    'tsconfig.json',
    manifestPath,
    'personalize/config.ts',
    'personalize/overrides.json',
    '.prettierrc',
    '.prettierrc.json',
    '.prettierrc.js',
    '.prettierrc.cjs',
    'prettier.config.js',
    'prettier.config.cjs',
    'prettier.config.mjs',
  ]);
  const priorReport = await readOptional(
    join(root, 'personalize/discovery.json'),
  );
  if (priorReport) {
    const report = JSON.parse(priorReport) as { files?: string[] };
    const boundary = await workspaceBoundary(root);
    for (const file of report.files ?? []) {
      // Read-only snapshot; only bounded TypeScript files previously found by workspace traversal.
      if (
        typeof file !== 'string' ||
        !/\.tsx?$/.test(file) ||
        file.includes('node_modules') ||
        file.length >= 1000
      )
        continue;
      const path = resolve(root, file);
      const canonical = await realpath(path).catch(() => undefined);
      if (!canonical) continue;
      const within = relative(boundary, canonical);
      if (!within.startsWith('..') && !isAbsolute(within))
        paths.add(relative(root, path));
    }
  }
  for (const file of ownership?.files ?? []) {
    await safePath(root, file.path);
    paths.add(file.path);
  }
  const contents = await Promise.all(
    [...paths]
      .sort()
      .map(async (path) => [
        path,
        hash((await readOptional(join(root, path))) ?? '\0missing'),
      ]),
  );
  return hash(JSON.stringify(contents));
}
