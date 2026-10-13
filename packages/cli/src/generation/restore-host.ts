import { Node, Project, SyntaxKind, ts, type SourceFile } from 'ts-morph';
import { hash, type Ownership } from '../commands/files';
import { syntaxHash, type HostBindings } from './host-bindings';

type OwnedFile = Ownership['files'][number];
const meaningfulChildren = (node: import('ts-morph').JsxElement) =>
  node
    .getJsxChildren()
    .filter((child) => !Node.isJsxText(child) || child.getText().trim());

function findImport(
  source: SourceFile,
  binding: HostBindings['imports'][number],
) {
  const matches = source
    .getImportDeclarations()
    .filter((item) => item.getModuleSpecifierValue() === binding.module)
    .flatMap((item) => item.getNamedImports())
    .filter(
      (item) =>
        item.getName() === binding.name &&
        (item.getAliasNode() ?? item.getNameNode()).getText() === binding.local,
    );
  if (
    !matches.length &&
    binding.restore &&
    !source
      .getDescendantsOfKind(SyntaxKind.Identifier)
      .some((node) => node.getText() === binding.local && !node.getSymbol())
  )
    return;
  if (matches.length !== 1)
    throw new Error(
      `SDK import changed: ${binding.local}. Restore its generated import before refreshing.`,
    );
  return matches[0]!;
}

function restoreImport(
  source: SourceFile,
  binding: HostBindings['imports'][number],
) {
  const item = findImport(source, binding);
  // Editors commonly remove the unused primitive import when deleting a section.
  if (!item) return;
  const local = item.getAliasNode() ?? item.getNameNode();
  if (!Node.isIdentifier(local)) throw new Error('Unsupported SDK import');
  const references = local
    .findReferencesAsNodes()
    .filter(
      (node) => !node.getFirstAncestorByKind(SyntaxKind.ImportDeclaration),
    );
  const restore = binding.restore;
  if (!restore && references.length)
    throw new Error(
      `SDK wrapper changed: ${binding.local}. Restore its generated wrapper before refreshing.`,
    );
  if (restore && references.length) {
    let name = restore.local;
    const isNative = (node: Node) =>
      Node.isImportSpecifier(node) &&
      node.getName() === restore.name &&
      node.getImportDeclaration().getModuleSpecifierValue() === restore.module;
    const collides = references.some((node) =>
      node
        .getSymbolsInScope(ts.SymbolFlags.Value)
        .find((symbol) => symbol.getName() === name)
        ?.getDeclarations()
        .some((declaration) => !isNative(declaration)),
    );
    if (collides) {
      const names = new Set(
        source
          .getDescendantsOfKind(SyntaxKind.Identifier)
          .map((node) => node.getText()),
      );
      name = `${name}Native`;
      while (names.has(name)) name += '_';
    }
    for (const reference of references.sort(
      (a, b) => b.getStart() - a.getStart(),
    ))
      reference.replaceWithText(name);
    const existing = source
      .getImportDeclarations()
      .filter(
        (declaration) =>
          declaration.getModuleSpecifierValue() === restore.module,
      )
      .flatMap((declaration) => declaration.getNamedImports())
      .some(
        (specifier) =>
          specifier.getName() === restore.name &&
          (specifier.getAliasNode() ?? specifier.getNameNode()).getText() ===
            name,
      );
    if (!existing)
      source.addImportDeclaration({
        moduleSpecifier: restore.module,
        namedImports: [
          {
            name: restore.name,
            ...(name === restore.name ? {} : { alias: name }),
          },
        ],
      });
  }
  const declaration = item.getImportDeclaration();
  item.remove();
  if (
    !declaration.getNamedImports().length &&
    !declaration.getDefaultImport() &&
    !declaration.getNamespaceImport()
  )
    declaration.remove();
}

/** Remove only recognized SDK syntax from the latest host source, preserving edits. */
export function restoreHost(
  path: string,
  current: string,
  owned?: OwnedFile,
): string {
  if (!owned) return current;
  if (hash(current) === owned.hash) return owned.before ?? current;
  if (!owned.host)
    throw new Error(
      `Drift: ${path}. This older installation has no editable-host metadata; restore its last generated version before upgrading.`,
    );
  const source = new Project({ useInMemoryFileSystem: true }).createSourceFile(
    path,
    current,
  );
  for (const wrapper of [...owned.host.wrappers].reverse()) {
    const binding = owned.host.imports.find(
      (item) => item.local === wrapper.local,
    )!;
    const imported = findImport(source, binding)!;
    const elements = source
      .getDescendantsOfKind(SyntaxKind.JsxElement)
      .filter((element) =>
        element
          .getOpeningElement()
          .getTagNameNode()
          .getSymbol()
          ?.getDeclarations()
          .includes(imported),
      );
    if (elements.length !== 1)
      throw new Error(
        `SDK wrapper changed: ${wrapper.local}. Keep exactly one generated wrapper.`,
      );
    const element = elements[0]!;
    const attributes = element
      .getOpeningElement()
      .getAttributes()
      .map((attr) => attr.getText())
      .join(' ');
    if (syntaxHash(attributes) !== wrapper.attributes)
      throw new Error(
        `SDK wrapper props changed: ${wrapper.local}. Edit screen JSX; let refresh maintain the SDK props.`,
      );
    const children = meaningfulChildren(element);
    if (
      wrapper.singleChild &&
      (children.length !== 1 || !Node.isJsxElement(children[0]!))
    )
      throw new Error(`Keep one JSX container inside ${wrapper.local}.`);
    const content = element
      .getFullText()
      .trim()
      .slice(
        element.getOpeningElement().getText().length,
        -element.getClosingElement().getText().length,
      );
    element.replaceWithText(
      children.length === 1 ? children[0]!.getText() : `<>${content}</>`,
    );
  }
  for (const binding of owned.host.imports) restoreImport(source, binding);
  return source.getFullText();
}
