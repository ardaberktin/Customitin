import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { Project } from 'ts-morph';
import { secretContent, sourceFiles } from './files';
import { discoverSymbols } from './symbols';
import { discoverRoutes } from './routes';
import { discoverNavigation } from './navigation';
import type { DiscoveryReport } from './types';
import { screenStructure } from './screen-structure';
import { readHostOwnership } from '../commands/host-ownership';
import { restoreHost } from '../generation/restore-host';
export type {
  DiscoveredSymbol,
  DiscoveryReport,
  DiscoveredRoute,
} from './types';

export async function inspectProject(root: string): Promise<DiscoveryReport> {
  const manifest = JSON.parse(
    await readFile(join(root, 'package.json'), 'utf8'),
  ) as {
    name?: string;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  const versions = { ...manifest.dependencies, ...manifest.devDependencies };
  const config = join(root, 'tsconfig.json');
  const project = new Project({
    ...(existsSync(config) ? { tsConfigFilePath: config } : {}),
    compilerOptions: { strict: true, jsx: 4 },
    skipAddingFilesFromTsConfig: true,
  });
  const paths = await sourceFiles(root);
  const ownership = await readHostOwnership(root);
  let excludedFiles = 0;
  const allowed: string[] = [];
  for (const file of paths) {
    const current = await readFile(file, 'utf8');
    const owned = ownership?.files.find(
      (entry) => entry.path === relative(root, file).replaceAll('\\', '/'),
    );
    let text = current;
    try {
      text = restoreHost(file, current, owned);
    } catch {
      /* Planning reports ownership errors; discovery still returns other capabilities. */
    }
    if (secretContent.test(text)) {
      excludedFiles++;
      continue;
    }
    allowed.push(file);
    project.createSourceFile(file, text, { overwrite: true });
  }
  project.resolveSourceFileDependencies();
  const symbols = allowed.flatMap((file) =>
    discoverSymbols(root, project.getSourceFileOrThrow(file)),
  );
  for (const symbol of symbols.filter((item) => item.kind === 'component')) {
    try {
      const structure = screenStructure(
        project.getSourceFileOrThrow(join(root, symbol.file)),
        symbol.exportName,
      );
      symbol.screen = {
        sections: structure.sections.map(({ key, title }) => ({ key, title })),
      };
    } catch (error) {
      symbol.screenIssue = (error as Error).message;
    }
  }
  const framework = versions['expo-router']
    ? 'expo-router'
    : versions['@react-navigation/native']
      ? 'react-navigation'
      : 'unknown';
  const files = allowed.map((p) => relative(root, p).replaceAll('\\', '/'));
  const entry = [
    'src/app/_layout.tsx',
    'app/_layout.tsx',
    'App.tsx',
    'src/App.tsx',
  ].find((p) => files.includes(p));
  const routeDetails =
    framework === 'expo-router'
      ? discoverRoutes(files)
      : framework === 'react-navigation'
        ? allowed.flatMap((file) =>
            discoverNavigation(root, project.getSourceFileOrThrow(file)),
          )
        : [];
  const unresolved = symbols.flatMap((s) => {
    if (s.kind === 'source' && !s.complete && s.adapter !== 'query-page')
      return [
        `${s.selector}: confirm completeness in personalize/overrides.json or with @customitinComplete.`,
      ];
    if (s.kind === 'hook')
      return [
        `${s.selector}: hook requires a component adapter or extracted query function.`,
      ];
    if (s.unsupportedProps.length)
      return [
        `${s.selector}: required non-scalar props need a host wrapper: ${s.unsupportedProps.join(', ')}.`,
      ];
    return [];
  });
  const context = JSON.stringify({
    framework,
    symbols: symbols.map(
      ({ id, selector, file, line, kind, signature, complete }) => ({
        id,
        selector,
        file,
        line,
        kind,
        signature,
        complete,
      }),
    ),
    routes: routeDetails,
  });
  return {
    project: root,
    appId: `app-${createHash('sha256')
      .update(manifest.name ?? 'customitin-app')
      .digest('hex')
      .slice(0, 12)}`,
    framework,
    entry,
    versions,
    symbols,
    routes: routeDetails.map((r) => r.file),
    routeDetails,
    unsupported: [
      ...(entry ? [] : ['No supported root component found.']),
      'Private state, active forms, custom canvas and nested navigator rewrites require review.',
    ],
    unresolved,
    excludedFiles,
    context,
    contextDigest: createHash('sha256').update(context).digest('hex'),
  };
}
