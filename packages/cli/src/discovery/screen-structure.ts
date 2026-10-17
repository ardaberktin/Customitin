import {
  Node,
  SyntaxKind,
  type SourceFile,
  type JsxElement,
  type JsxSelfClosingElement,
} from 'ts-morph';

type Element = JsxElement | JsxSelfClosingElement;
const opening = (node: Element) =>
  Node.isJsxElement(node) ? node.getOpeningElement() : node;
export function nativeTagName(node: Node): string | undefined {
  const declaration = node
    .getSymbol()
    ?.getDeclarations()
    .find(Node.isImportSpecifier);
  return declaration?.getImportDeclaration().getModuleSpecifierValue() ===
    'react-native'
    ? declaration.getName()
    : undefined;
}
function literalAttribute(node: Element, name: string): string | undefined {
  const attr = opening(node).getAttribute(name);
  if (!attr || !Node.isJsxAttribute(attr)) return;
  let value: Node | undefined = attr.getInitializer();
  if (value && Node.isJsxExpression(value)) value = value.getExpression();
  if (value && Node.isStringLiteral(value)) return value.getLiteralValue();
  throw new Error(`Section ${name} must be a static string.`);
}

/** Bounded structural inspection; never executes the host or extracts callbacks. */
export function screenStructure(source: SourceFile, exportName: string) {
  const declaration = source
    .getExportedDeclarations()
    .get(exportName)
    ?.find((node) => node.getSourceFile() === source);
  const root =
    declaration && Node.isVariableDeclaration(declaration)
      ? declaration.getInitializer()
      : declaration;
  if (
    !root ||
    !(
      Node.isFunctionDeclaration(root) ||
      Node.isArrowFunction(root) ||
      Node.isFunctionExpression(root)
    )
  )
    throw new Error('Screens require an exported function or arrow component.');
  const body = root.getBody();
  const returns =
    body
      ?.getDescendantsOfKind(SyntaxKind.ReturnStatement)
      .filter(
        (node) =>
          node.getFirstAncestor((parent) =>
            Node.isFunctionLikeDeclaration(parent),
          ) === root,
      ) ?? [];
  if (
    !body ||
    (Node.isBlock(body) &&
      (returns.length !== 1 || returns[0]?.getParent() !== body))
  )
    throw new Error('Conditional screen returns need a host wrapper.');
  let element = Node.isBlock(body) ? returns[0]?.getExpression() : body;
  while (element && Node.isParenthesizedExpression(element))
    element = element.getExpression();
  while (
    element &&
    Node.isJsxElement(element) &&
    /Provider$/.test(element.getOpeningElement().getTagNameNode().getText())
  ) {
    const children = element
      .getJsxChildren()
      .filter((child) => !Node.isJsxText(child) || child.getText().trim());
    if (children.length !== 1)
      throw new Error('Shared providers require one screen container.');
    element = children[0];
  }
  if (
    !element ||
    !Node.isJsxElement(element) ||
    !(
      ['View', 'ScrollView'].includes(
        nativeTagName(element.getOpeningElement().getTagNameNode()) ?? '',
      ) ||
      ['div', 'section', 'main', 'article', 'aside'].includes(
        element.getOpeningElement().getTagNameNode().getText(),
      )
    )
  )
    throw new Error(
      'Screens require a React Native View or ScrollView container.',
    );
  if (element.getOpeningElement().getAttribute('horizontal'))
    throw new Error('Horizontal containers need a host integration.');
  if (
    ['stickyHeaderIndices', 'maintainVisibleContentPosition'].some((prop) =>
      element.getOpeningElement().getAttribute(prop),
    )
  )
    throw new Error(
      'Index-dependent scroll containers need a host integration.',
    );
  const children = element.getJsxChildren().filter((child) => {
    if (Node.isJsxText(child)) return !!child.getText().trim();
    if (Node.isJsxExpression(child) && !child.getExpression()) return false;
    return true;
  });
  if (
    !children.length ||
    children.length > 40 ||
    children.some(
      (node) => !Node.isJsxElement(node) && !Node.isJsxSelfClosingElement(node),
    )
  )
    throw new Error(
      'Use 1–40 static JSX sections; wrap conditional or mapped children in a keyed View.',
    );
  const seen = new Set<string>();
  const sections = children.map((child) => {
    const node = child as Element;
    const tag = opening(node).getTagNameNode().getText();
    const key =
      literalAttribute(node, 'key') ?? literalAttribute(node, 'testID') ?? tag;
    if (seen.has(key))
      throw new Error(
        `Repeated section ${key}; add unique static key or testID values.`,
      );
    seen.add(key);
    return { key, title: key, node };
  });
  return {
    element,
    sections,
    platform: nativeTagName(element.getOpeningElement().getTagNameNode())
      ? ('native' as const)
      : ('web' as const),
  };
}
