import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { Project, ts } from 'ts-morph';
import { secretContent, sourceFiles } from './files';
import { discoverSymbols } from './symbols';
import { discoverRoutes } from './routes';
import { discoverNavigation } from './navigation';
import type { DiscoveryReport } from './types';
import { reachableWorkspaceFiles } from './workspace';
import { componentUsage } from './usage';
import { screenStructure } from './screen-structure';
import { applicationConfig } from './tsconfig';
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
  const config = applicationConfig(root);
  const project = new Project({
    ...(config.path ? { tsConfigFilePath: config.path } : {}),
    compilerOptions: {
      ...(config.path
        ? {}
        : {
            module: ts.ModuleKind.ESNext,
            moduleResolution: ts.ModuleResolutionKind.Bundler,
          }),
      strict: true,
      jsx: ts.JsxEmit.ReactJSX,
    },
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
  allowed.push(...(await reachableWorkspaceFiles(root, project, allowed)));
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
        platform: structure.platform,
        sections: structure.sections.map(({ key, title }) => ({ key, title })),
      };
    } catch (error) {
      symbol.screenIssue = (error as Error).message;
    }
  }
  const files = allowed.map((p) => relative(root, p).replaceAll('\\', '/'));
  const imported = new Set(
    allowed.flatMap((path) =>
      project
        .getSourceFileOrThrow(path)
        .getImportDeclarations()
        .map((item) => item.getModuleSpecifierValue()),
    ),
  );
  const hasExpoRoutes = files.some((file) =>
    /^(src\/)?app\/.+\.tsx$/.test(file),
  );
  const ambiguousRouting =
    hasExpoRoutes &&
    !!versions['expo-router'] &&
    imported.has('@react-navigation/native');
  const framework = ambiguousRouting
    ? 'unknown'
    : hasExpoRoutes && versions['expo-router']
      ? 'expo-router'
      : imported.has('@react-navigation/native')
        ? 'react-navigation'
        : 'unknown';
  const platform =
    versions['react-native'] || hasExpoRoutes || imported.has('react-native')
      ? 'native'
      : versions['react-dom'] || imported.has('react-dom/client')
        ? 'web'
        : 'unknown';
  const entry = [
    ...(framework === 'expo-router'
      ? ['src/app/_layout.tsx', 'app/_layout.tsx']
      : []),
    'App.tsx',
    'src/App.tsx',
  ].find((p) => files.includes(p));
  const usages = componentUsage(
    root,
    allowed.map((file) => project.getSourceFileOrThrow(file)),
  );
  for (const symbol of symbols) {
    const source = project.getSourceFileOrThrow(join(root, symbol.file));
    const declaration = source
      .getExportedDeclarations()
      .get(symbol.exportName)?.[0];
    const name =
      symbol.member ?? declaration?.getSymbol()?.getName() ?? symbol.name;
    symbol.usage = usages.usage.get(`${source.getFilePath()}#${name}`) ?? [];
  }
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
    version: 2,
    platform,
    files,
    importedComponents: usages.imports,
    sourceDigest: createHash('sha256')
      .update(JSON.stringify([...config.inputs]))
      .update(
        allowed
          .map((path) => project.getSourceFileOrThrow(path).getFullText())
          .join('\0'),
      )
      .digest('hex'),
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
      ...(ambiguousRouting
        ? [
            'Multiple routing systems are in use. Select a provider entrypoint manually; navigation bindings need review.',
          ]
        : []),
      'Private state, active forms, custom canvas and nested navigator rewrites require review.',
    ],
    unresolved,
    excludedFiles,
    context,
    contextDigest: createHash('sha256').update(context).digest('hex'),
  };
}
