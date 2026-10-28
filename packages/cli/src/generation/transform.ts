import { Node, Project, SyntaxKind } from 'ts-morph';
import { basename } from 'node:path';
import { relativeImport } from './imports';
import {
  emptyHostBindings,
  syntaxHash,
  type HostBindings,
} from './host-bindings';

export function wrapEntry(
  path: string,
  text: string,
  bindings: HostBindings = emptyHostBindings(),
): string {
  const project = new Project({ useInMemoryFileSystem: true });
  const source = project.createSourceFile(path, text);
  if (
    source
      .getImportDeclarations()
      .some((i) => i.getModuleSpecifierValue().includes('personalize/root'))
  )
    return text;
  const declaration = source.getFunctions().find((f) => f.isDefaultExport());
  const exported = source
    .getExportAssignments()
    .find((e) => !e.isExportEquals())
    ?.getExpression();
  const target =
    exported && Node.isIdentifier(exported)
      ? exported.getSymbol()?.getValueDeclaration()
      : exported;
  // App.tsx is a recognized conventional entry. A named App is common in Vite.
  // Never guess another export or choose among arbitrary component names.
  const named =
    basename(path) === 'App.tsx'
      ? source.getExportedDeclarations().get('App')?.[0]
      : undefined;
  const root =
    declaration ??
    (target && Node.isVariableDeclaration(target)
      ? target.getInitializer()
      : target) ??
    (named && Node.isVariableDeclaration(named)
      ? named.getInitializer()
      : named);
  if (
    !root ||
    !(
      Node.isFunctionDeclaration(root) ||
      Node.isArrowFunction(root) ||
      Node.isFunctionExpression(root)
    )
  )
    throw new Error(
      'Automatic wiring supports default function/arrow components or a named App in App.tsx. Wrapped or conditional roots need a host integration.',
    );
  const body = root.getBody();
  const returns =
    body && Node.isBlock(body)
      ? body.getStatements().filter(Node.isReturnStatement)
      : [];
  if (
    !body ||
    (Node.isBlock(body) &&
      (returns.length !== 1 ||
        body
          .getDescendantsOfKind(SyntaxKind.ReturnStatement)
          .some(
            (r) =>
              r.getFirstAncestor((n) => Node.isFunctionLikeDeclaration(n)) ===
                root && !returns.includes(r),
          )))
  )
    throw new Error(
      'Conditional root returns require a developer-reviewed integration.',
    );
  let expression = Node.isBlock(body) ? returns[0]?.getExpression() : body;
  while (expression && Node.isParenthesizedExpression(expression))
    expression = expression.getExpression();
  if (
    !expression ||
    !(
      Node.isJsxElement(expression) ||
      Node.isJsxSelfClosingElement(expression) ||
      Node.isJsxFragment(expression)
    )
  )
    throw new Error('Root does not return supported JSX.');
  // Preserve shared context above the shell. Do not move provider props/hooks.
  while (
    Node.isJsxElement(expression) &&
    /Provider$/.test(expression.getOpeningElement().getTagNameNode().getText())
  ) {
    const children: Node[] = expression
      .getJsxChildren()
      .filter(
        (child) => !Node.isJsxText(child) || child.getText().trim().length > 0,
      );
    if (
      children.length === 1 &&
      children[0] &&
      Node.isJsxElement(children[0])
    ) {
      expression = children[0];
    } else {
      const opening = expression.getOpeningElement().getText();
      const closing = expression.getClosingElement().getText();
      const contents = expression
        .getFullText()
        .trim()
        .slice(opening.length, -closing.length);
      expression.replaceWithText(
        `${opening}<PersonalizationRoot>${contents}</PersonalizationRoot>${closing}`,
      );
      expression = undefined;
      break;
    }
  }
  expression?.replaceWithText(
    `<PersonalizationRoot>${expression.getText()}</PersonalizationRoot>`,
  );
  source.addImportDeclaration({
    namedImports: ['PersonalizationRoot'],
    moduleSpecifier: relativeImport(path, 'personalize/root.tsx'),
  });
  bindings.imports.push({
    module: relativeImport(path, 'personalize/root.tsx'),
    name: 'PersonalizationRoot',
    local: 'PersonalizationRoot',
  });
  bindings.wrappers.push({
    local: 'PersonalizationRoot',
    attributes: syntaxHash(''),
    singleChild: false,
  });
  return source.getFullText();
}
