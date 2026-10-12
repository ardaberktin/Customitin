import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { Project, Node, type Type } from 'ts-morph';
import type { ValueRule } from '@customitin/core';

export interface DiscoveredSymbol {
  id: string;
  name: string;
  file: string;
  line: number;
  kind: 'component' | 'source' | 'hook';
  signature: string;
  fields: Record<string, ValueRule>;
  complete: boolean;
}
export interface DiscoveryReport {
  project: string;
  appId: string;
  framework: 'expo-router' | 'react-navigation' | 'unknown';
  entry?: string;
  versions: Record<string, string>;
  symbols: DiscoveredSymbol[];
  routes: string[];
  unsupported: string[];
  unresolved: string[];
  excludedFiles: number;
  contextDigest: string;
  context: string;
}
const excluded =
  /^(node_modules|dist|build|coverage|\.git|\.expo|\.customitin|personalize|ios|android|fixtures|__tests__)$/;
const secretName =
  /(^\.|secret|credential|token|private|\.test\.|\.spec\.|\.d\.ts$)/i;
const secretContent =
  /(?:sk-(?:proj-)?[a-zA-Z0-9_-]{12,}|-----BEGIN .*PRIVATE KEY|(?:api[_-]?key|password|secret)\s*[:=]\s*['"][^'"]+['"])/i;
async function sourceFiles(
  root: string,
  dir = root,
  depth = 0,
): Promise<string[]> {
  if (depth > 8) return [];
  const result: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.isSymbolicLink() || excluded.test(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory())
      result.push(...(await sourceFiles(root, path, depth + 1)));
    else if (
      /\.tsx?$/.test(entry.name) &&
      !secretName.test(entry.name) &&
      (await stat(path)).size < 150_000
    )
      result.push(path);
    if (result.length > 500)
      throw new Error(
        'Project exceeds the 500-file discovery budget. Run in a single app workspace.',
      );
  }
  return result.sort();
}
function rule(type: Type): ValueRule | undefined {
  const base = type.getNonNullableType();
  const kind =
    base.isString() || base.isStringLiteral()
      ? 'string'
      : base.isNumber() || base.isNumberLiteral()
        ? 'number'
        : base.isBoolean() || base.isBooleanLiteral()
          ? 'boolean'
          : undefined;
  if (!kind) return undefined;
  return {
    type: kind,
    required: !type.isNullable(),
    nullable: type.isNullable(),
  };
}
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
  try {
    project.addSourceFilesFromTsConfig(join(root, 'tsconfig.json'));
  } catch {
    /* Syntax-only discovery still works without tsconfig. */
  }
  const paths = await sourceFiles(root);
  let excludedFiles = 0;
  const allowed = new Set<string>();
  for (const file of paths) {
    const text = await readFile(file, 'utf8');
    if (secretContent.test(text)) {
      excludedFiles++;
      continue;
    }
    allowed.add(file);
    project.createSourceFile(file, text, { overwrite: true });
  }
  const symbols: DiscoveredSymbol[] = [];
  const unresolved: string[] = [];
  for (const source of project.getSourceFiles()) {
    if (!allowed.has(source.getFilePath())) continue;
    for (const [name, declarations] of source.getExportedDeclarations())
      for (const declaration of declarations) {
        if (declaration.getSourceFile() !== source) continue;
        const type = declaration.getType();
        const signature = type.getCallSignatures()[0];
        if (!signature) continue;
        const file = relative(root, source.getFilePath());
        const returns = signature.getReturnType();
        const item = (
          returns.getAwaitedType() ?? returns
        ).getArrayElementType();
        const fields: Record<string, ValueRule> = {};
        if (item)
          for (const prop of item.getProperties()) {
            const value = rule(prop.getTypeAtLocation(declaration));
            if (value) fields[prop.getName()] = value;
          }
        const complete =
          Node.isFunctionDeclaration(declaration) &&
          declaration
            .getJsDocs()
            .some((doc) => /@customitinComplete\b/.test(doc.getText()));
        const kind = /^use[A-Z]/.test(name)
          ? 'hook'
          : item &&
              signature.getParameters().length === 0 &&
              Object.keys(fields).length > 0
            ? 'source'
            : /^[A-Z]/.test(name) && signature.getParameters().length === 0
              ? 'component'
              : undefined;
        if (!kind) continue;
        const id = `${file.replace(/[^a-zA-Z0-9]/g, '-')}.${name}`;
        symbols.push({
          id,
          name,
          file,
          line: declaration.getStartLineNumber(),
          kind,
          signature: `${name}(): ${
            item
              ? `Promise<Array<{ ${Object.entries(fields)
                  .map(
                    ([key, v]) =>
                      `${key}: ${v.type}${v.nullable ? ' | null' : ''}`,
                  )
                  .join('; ')} }>>`
              : kind === 'component'
                ? 'ReactElement'
                : 'hook result (unresolved)'
          }`,
          fields,
          complete,
        });
        if (kind === 'source' && !complete)
          unresolved.push(
            `${file}:${name}: confirm the returned array is complete; type information cannot establish completeness.`,
          );
        if (kind === 'hook')
          unresolved.push(
            `${file}:${name}: hook requires a component adapter or extracted query function.`,
          );
      }
  }
  const framework = versions['expo-router']
    ? 'expo-router'
    : versions['@react-navigation/native']
      ? 'react-navigation'
      : 'unknown';
  const files = paths.map((p) => relative(root, p));
  const entry = [
    'src/app/_layout.tsx',
    'app/_layout.tsx',
    'App.tsx',
    'src/App.tsx',
  ].find((p) => files.includes(p));
  const routes = files.filter(
    (p) => /(?:^|\/)app\/.+\.tsx$/.test(p) && !p.endsWith('_layout.tsx'),
  );
  const context = JSON.stringify({
    framework,
    symbols: symbols.map(({ id, file, line, kind, signature, complete }) => ({
      id,
      file,
      line,
      kind,
      signature,
      complete,
    })),
    routes,
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
    routes,
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
