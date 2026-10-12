import { join } from 'node:path';
import { format, type Options } from 'prettier';
import { Node, Project, SyntaxKind, type Expression } from 'ts-morph';
import { readOptional } from '../commands/files';

// Read literal formatter settings only. Never execute a host JS config or plugin.
function literal(expression: Expression): unknown {
  if (Node.isStringLiteral(expression)) return expression.getLiteralValue();
  if (Node.isNumericLiteral(expression)) return expression.getLiteralValue();
  if (expression.getKind() === SyntaxKind.TrueKeyword) return true;
  if (expression.getKind() === SyntaxKind.FalseKeyword) return false;
  if (!Node.isObjectLiteralExpression(expression)) return undefined;
  return Object.fromEntries(
    expression.getProperties().flatMap((property) => {
      if (!Node.isPropertyAssignment(property)) return [];
      const value = property.getInitializer();
      return value
        ? [[property.getName().replace(/^['"]|['"]$/g, ''), literal(value)]]
        : [];
    }),
  );
}

async function settings(root: string): Promise<Options> {
  const names = [
    '.prettierrc',
    '.prettierrc.json',
    '.prettierrc.js',
    '.prettierrc.cjs',
    'prettier.config.js',
    'prettier.config.cjs',
    'prettier.config.mjs',
  ];
  let config: unknown;
  for (const name of names) {
    const text = await readOptional(join(root, name));
    if (text === null) continue;
    if (!name.endsWith('js')) {
      try {
        config = JSON.parse(text);
      } catch {
        /* Unsupported YAML: use portable defaults. */
      }
    } else {
      const project = new Project({ useInMemoryFileSystem: true });
      const source = project.createSourceFile(name, text);
      const expression =
        source.getExportAssignments()[0]?.getExpression() ??
        source
          .getDescendantsOfKind(SyntaxKind.BinaryExpression)
          .find((node) => node.getLeft().getText() === 'module.exports')
          ?.getRight();
      if (expression) config = literal(expression);
    }
    break;
  }
  if (!config) {
    const manifest = JSON.parse(
      (await readOptional(join(root, 'package.json'))) ?? '{}',
    ) as { prettier?: unknown };
    config = manifest.prettier;
  }
  const allowed = new Set([
    'arrowParens',
    'bracketSameLine',
    'bracketSpacing',
    'endOfLine',
    'printWidth',
    'quoteProps',
    'semi',
    'singleAttributePerLine',
    'singleQuote',
    'tabWidth',
    'trailingComma',
    'useTabs',
  ]);
  const options =
    typeof config === 'object' && config !== null
      ? Object.fromEntries(
          Object.entries(config).filter(
            ([key, value]) =>
              allowed.has(key) &&
              ['boolean', 'number', 'string'].includes(typeof value),
          ),
        )
      : {};
  return { singleQuote: true, ...options };
}

export async function formatGenerated(
  root: string,
  files: Record<string, string>,
): Promise<void> {
  const options = await settings(root);
  for (const [path, content] of Object.entries(files)) {
    if (/\.tsx?$/.test(path))
      files[path] = await format(content, {
        ...options,
        filepath: path,
        parser: 'typescript',
      });
  }
}
