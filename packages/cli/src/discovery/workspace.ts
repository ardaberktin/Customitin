import { readFile, realpath } from 'node:fs/promises';
import { dirname, relative, resolve, isAbsolute, join } from 'node:path';
import type { Project } from 'ts-morph';
import { secretContent } from './files';

/** Only follow compiler-resolved local imports within the containing workspace. */
export async function reachableWorkspaceFiles(
  root: string,
  project: Project,
  seeds: string[],
) {
  const boundary = await workspaceBoundary(root);
  const visited = new Set(seeds.map((file) => resolve(file)));
  const queue = seeds.map((file) => project.getSourceFileOrThrow(file));
  const added: string[] = [];
  while (queue.length) {
    const source = queue.shift()!;
    const dependencies = [
      ...source.getImportDeclarations(),
      ...source.getExportDeclarations(),
    ];
    for (const declaration of dependencies) {
      const dependency = declaration.getModuleSpecifierSourceFile();
      if (!dependency) continue;
      const path = dependency.getFilePath();
      if (visited.has(path)) continue;
      visited.add(path);
      const within = relative(boundary, await realpath(path));
      if (
        within.startsWith('..') ||
        isAbsolute(within) ||
        /(?:^|\/)(?:node_modules|dist|build|\.git|personalize|ios|android)(?:\/|$)/.test(
          within,
        ) ||
        /(?:\.d\.ts|\.test\.tsx?|\.spec\.tsx?)$/.test(path)
      )
        continue;
      const text = dependency.getFullText();
      if (
        text.length > 150000 ||
        secretContent.test(text) ||
        /(?:secret|credential|private)/i.test(path.split('/').at(-1)!)
      )
        continue;
      if (visited.size > 1000 || added.length + seeds.length >= 500)
        throw new Error('Reachable workspace exceeds the discovery budget');
      added.push(path);
      queue.push(dependency);
    }
  }
  return added;
}

export async function workspaceBoundary(root: string) {
  let directory = await realpath(root),
    boundary = directory;
  while (dirname(directory) !== directory) {
    directory = dirname(directory);
    try {
      const manifest = JSON.parse(
        await readFile(join(directory, 'package.json'), 'utf8'),
      ) as { workspaces?: unknown };
      if (manifest.workspaces) {
        boundary = await realpath(directory);
        break;
      }
    } catch {
      /* A parent need not be a package. */
    }
  }
  return boundary;
}
