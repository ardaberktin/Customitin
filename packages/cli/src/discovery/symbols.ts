import { discoverComponent } from './components';
import { arrayItem, callable } from './signatures';
import { createHash } from 'node:crypto';
import { relative } from 'node:path';
import { Node, type SourceFile } from 'ts-morph';
import { scalarFields } from './fields';
import type { DiscoveredSymbol } from './types';

function annotations(node: Node): string {
  const owner = Node.isVariableDeclaration(node)
    ? node.getVariableStatement()
    : undefined;
  return [
    ...node.getLeadingCommentRanges(),
    ...(owner?.getLeadingCommentRanges() ?? []),
  ]
    .map((c) => c.getText())
    .join('\n');
}
function describe(
  root: string,
  source: SourceFile,
  declaration: Node,
  exportName: string,
  member?: string,
): DiscoveredSymbol | undefined {
  const name =
    exportName === 'default' &&
    (Node.isFunctionDeclaration(declaration) ||
      Node.isVariableDeclaration(declaration))
      ? (declaration.getName() ?? 'DefaultComponent')
      : member
        ? `${exportName}.${member}`
        : exportName;
  const type = member
    ? declaration.getType().getProperty(member)?.getTypeAtLocation(declaration)
    : declaration.getType();
  if (!type) return;
  const signature = callable(type);
  const file = relative(root, source.getFilePath()).replaceAll('\\', '/');
  const selector = `${file}#${exportName}${member ? `.${member}` : ''}`;
  const location = member
    ? (declaration.getType().getProperty(member)?.getDeclarations()[0] ??
      declaration)
    : declaration;
  const comments = annotations(location);
  const base = {
    id: `cap-${createHash('sha256').update(selector).digest('hex').slice(0, 16)}`,
    name,
    exportName,
    member,
    selector,
    file,
    line: location.getStartLineNumber(),
    fields: {},
    props: {},
    unsupportedProps: [],
    complete: /@customitinComplete\b/.test(comments),
    approved: /@customitinComponent\b/.test(comments),
  };
  if (!signature) {
    if (
      !member &&
      /NavigationContainerRefWithCurrent/.test(type.getText(declaration))
    )
      return {
        ...base,
        kind: 'navigation-ref',
        signature: `${name}: NavigationContainerRef`,
      };
    if (
      !member &&
      type.getSymbol()?.getName() === 'QueryClient' &&
      source
        .getImportDeclarations()
        .some((i) => i.getModuleSpecifierValue() === '@tanstack/react-query')
    )
      return {
        ...base,
        kind: 'query-client',
        signature: `${name}: QueryClient`,
      };
    return;
  }
  if (/^use[A-Z]/.test(name))
    return {
      ...base,
      kind: 'hook',
      signature: `${name}: hook (requires React bridge)`,
    };
  const parameters = signature.getParameters();
  const returns = signature.getReturnType();
  const resolved = returns.getAwaitedType() ?? returns;
  const queryFn = resolved.getProperty('queryFn')?.getTypeAtLocation(location);
  const queryReturn = queryFn && callable(queryFn)?.getReturnType();
  if (queryReturn && returns.getProperty('then')) return;
  const item =
    arrayItem(returns) ?? (queryReturn ? arrayItem(queryReturn) : undefined);
  const pageItems = resolved.getProperty('items')?.getTypeAtLocation(location);
  const page = pageItems && arrayItem(pageItems);
  const explicitQuery = /@customitinQuery\b/.test(comments);
  if ((item && parameters.length === 0) || (page && explicitQuery)) {
    const fields = scalarFields(item ?? page!, location, true);
    const adapter = page
      ? 'query-page'
      : queryReturn && resolved.getProperty('queryKey')
        ? 'query-options'
        : 'array';
    return {
      ...base,
      kind: 'source',
      fields,
      adapter,
      acceptsQuery: adapter === 'query-page',
      signature: `${name}: ${adapter} ${JSON.stringify(fields)}`,
    };
  }
  return discoverComponent(base, signature, location);
}

export function discoverSymbols(
  root: string,
  source: SourceFile,
): DiscoveredSymbol[] {
  const symbols: DiscoveredSymbol[] = [];
  for (const [name, declarations] of source.getExportedDeclarations()) {
    const declaration = declarations.find((d) => d.getSourceFile() === source);
    if (!declaration) continue;
    const symbol = describe(root, source, declaration, name);
    if (symbol) symbols.push(symbol);
    else if (Node.isVariableDeclaration(declaration)) {
      const type = declaration.getType();
      // Array prototype methods (for example reverse) are not repository loaders.
      if (type.isArray() || type.isReadonlyArray() || type.isTuple()) continue;
      for (const member of type.getProperties().slice(0, 30)) {
        const found = describe(
          root,
          source,
          declaration,
          name,
          member.getName(),
        );
        if (found) symbols.push(found);
      }
    }
  }
  return symbols;
}
