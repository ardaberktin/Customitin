import { Node, Project, SyntaxKind } from 'ts-morph';
import { relativeImport } from './templates';
export function wrapEntry(path: string, text: string): string {
  const project = new Project({ useInMemoryFileSystem: true });
  const source = project.createSourceFile(path, text);
  if (
    source
      .getImportDeclarations()
      .some((i) => i.getModuleSpecifierValue().includes('personalize/root'))
  )
    return text;
  const functions = source.getFunctions().filter((f) => f.isDefaultExport());
  const root = functions[0];
  if (!root)
    throw new Error(
      'Automatic wiring supports a default function component. Other roots require a developer adapter.',
    );
  const returns =
    root.getBody()?.getChildrenOfKind(SyntaxKind.ReturnStatement) ?? [];
  if (returns.length !== 1)
    throw new Error(
      'Conditional root returns require a developer-reviewed integration.',
    );
  const expression = returns[0]?.getExpression();
  if (
    !expression ||
    !(
      Node.isJsxElement(expression) ||
      Node.isJsxSelfClosingElement(expression) ||
      Node.isParenthesizedExpression(expression)
    )
  )
    throw new Error('Root does not return supported JSX.');
  const jsx = Node.isParenthesizedExpression(expression)
    ? expression.getExpression().getText()
    : expression.getText();
  expression.replaceWithText(
    `(<PersonalizationRoot>${jsx}</PersonalizationRoot>)`,
  );
  source.addImportDeclaration({
    namedImports: ['PersonalizationRoot'],
    moduleSpecifier: relativeImport(path, 'personalize/root.tsx'),
  });
  return source.getFullText();
}
