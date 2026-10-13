import { join, relative } from 'node:path';
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
