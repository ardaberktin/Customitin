import { createHash } from 'node:crypto';
import { Node, Project, SyntaxKind } from 'ts-morph';
import type { ResolvedIntegration } from '../configuration/resolve';
import { nativeTagName, screenStructure } from '../discovery/screen-structure';
import {
  emptyHostBindings,
  syntaxHash,
  type HostBindings,
} from './host-bindings';

type SelectedScreen = ResolvedIntegration['screens'][number];
export const sectionId = (screen: string, key: string) =>
  `section-${createHash('sha256')
    .update(JSON.stringify([screen, key]))
    .digest('hex')
    .slice(0, 16)}`;

export function screenCapabilities(screens: SelectedScreen[]) {
  const components = screens.flatMap(({ symbol }) =>
    symbol.screen!.sections.map((section) => ({
      id: sectionId(symbol.id, section.key),
      title: section.title,
      kind: 'host' as const,
      props: {},
      acceptsChildren: false,
      provenance: {
        version: 1,
        evidence: `${symbol.selector}:${section.key}`,
        status: 'developer-reviewed' as const,
      },
    })),
  );
  const surfaces = screens.map(({ symbol, options }) => ({
    id: symbol.id,
    title: options.title ?? symbol.name,
    kind: 'screen' as const,
    provenance: {
      version: 1,
      evidence: symbol.selector,
      status: 'developer-reviewed' as const,
    },
    defaultLayout: symbol.screen!.sections.map((section) => ({
      id: sectionId(symbol.id, section.key),
      componentId: sectionId(symbol.id, section.key),
      props: {},
      children: [],
    })),
    allowedComponentIds: symbol.screen!.sections.map((section) =>
      sectionId(symbol.id, section.key),
    ),
    requiredNodeIds: options.requiredSections.map((key) =>
      sectionId(symbol.id, key),
    ),
  }));
  return { components, surfaces };
}

/** Keep JSX expressions, callbacks, hooks and navigation in their original scope. */
export function instrumentScreen(
  path: string,
  text: string,
  selected: SelectedScreen,
  bindings: HostBindings = emptyHostBindings(),
): string {
  const project = new Project({ useInMemoryFileSystem: true });
  const source = project.createSourceFile(path, text);
  const structure = screenStructure(source, selected.symbol.exportName);
  const names = new Set(
    source
      .getDescendantsOfKind(SyntaxKind.Identifier)
      .map((node) => node.getText()),
  );
  function alias(name: string) {
    let candidate = `Customitin${name}`;
    while (names.has(candidate)) candidate += '_';
    names.add(candidate);
    return candidate;
  }
  const screen = alias('Screen');
  const imports = [{ name: 'CustomizableLayout', alias: screen }];
  bindings.imports.push({
    module: '@customitin/react-native',
    name: 'CustomizableLayout',
    local: screen,
  });
  // Give unkeyed sections a durable, ordinary React key before changing tags.
  for (const { node, key } of structure.sections) {
    const opening = Node.isJsxElement(node) ? node.getOpeningElement() : node;
    if (!opening.getAttribute('key'))
      opening.addAttribute({ name: 'key', initializer: JSON.stringify(key) });
  }
  const replacements = new Map<string, string>();
  const tags = [
    structure.element.getOpeningElement().getTagNameNode(),
    ...structure.element
      .getDescendantsOfKind(SyntaxKind.JsxOpeningElement)
      .map((node) => node.getTagNameNode()),
    ...structure.element
      .getDescendantsOfKind(SyntaxKind.JsxClosingElement)
      .map((node) => node.getTagNameNode()),
    ...structure.element
      .getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement)
      .map((node) => node.getTagNameNode()),
  ];
  for (const tag of tags) {
    const original = tag.getText();
    const native = nativeTagName(tag);
    if (!native || !['View', 'Text', 'ScrollView'].includes(native)) continue;
    let replacement = replacements.get(original);
    if (!replacement) {
      replacement = alias(native);
      replacements.set(original, replacement);
      imports.push({ name: `Screen${native}`, alias: replacement });
      bindings.imports.push({
        module: '@customitin/react-native',
        name: `Screen${native}`,
        local: replacement,
        restore: { module: 'react-native', name: native, local: original },
      });
    }
    tag.replaceWithText(replacement);
  }
  const ids = structure.sections
    .map(
      ({ key }) =>
        `${key === '__proto__' ? '["__proto__"]' : JSON.stringify(key)}: ${JSON.stringify(sectionId(selected.symbol.id, key))}`,
    )
    .join(',');
  const attributes = `id=${JSON.stringify(selected.symbol.id)} sectionIds={{${ids}}}`;
  structure.element.replaceWithText(
    `<${screen} ${attributes}>${structure.element.getText()}</${screen}>`,
  );
  bindings.wrappers.push({
    local: screen,
    attributes: syntaxHash(attributes),
    singleChild: true,
  });
  source.addImportDeclaration({
    moduleSpecifier: '@customitin/react-native',
    namedImports: imports,
  });
  for (const declaration of source
    .getImportDeclarations()
    .filter((item) => item.getModuleSpecifierValue() === 'react-native')) {
    for (const item of declaration.getNamedImports()) {
      const local = item.getAliasNode() ?? item.getNameNode();
      if (
        replacements.has(local.getText()) &&
        Node.isIdentifier(local) &&
        local
          .findReferencesAsNodes()
          .every(
            (node) =>
              !!node.getFirstAncestorByKind(SyntaxKind.ImportDeclaration),
          )
      )
        item.remove();
    }
    if (
      !declaration.getNamedImports().length &&
      !declaration.getDefaultImport() &&
      !declaration.getNamespaceImport()
    )
      declaration.remove();
  }
  return source.getFullText();
}
