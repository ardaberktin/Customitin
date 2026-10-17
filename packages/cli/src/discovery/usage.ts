import { relative } from 'node:path';
import { SyntaxKind, type SourceFile } from 'ts-morph';

export function componentUsage(root: string, sources: SourceFile[]) {
  const imports: {
    module: string;
    exportName: string;
    file: string;
    line: number;
  }[] = [];
  const usage = new Map<string, { file: string; line: number }[]>();
  for (const source of sources) {
    const tags = [
      ...source.getDescendantsOfKind(SyntaxKind.JsxOpeningElement),
      ...source.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement),
    ].map((element) => element.getTagNameNode());
    const site = (line: number) => ({
      file: relative(root, source.getFilePath()).replaceAll('\\', '/'),
      line,
    });
    for (const tag of tags) {
      const symbol = tag.getSymbol();
      const original = symbol?.getAliasedSymbol() ?? symbol;
      const declaration = original?.getDeclarations()[0];
      if (!declaration) continue;
      const key = `${declaration.getSourceFile().getFilePath()}#${original!.getName()}`;
      const sites = usage.get(key) ?? [];
      sites.push(site(tag.getStartLineNumber()));
      usage.set(key, sites);
    }
    for (const declaration of source.getImportDeclarations()) {
      const module = declaration.getModuleSpecifierValue();
      const resolved = declaration
        .getModuleSpecifierSourceFile()
        ?.getFilePath();
      if (
        module.startsWith('.') ||
        (resolved && !resolved.includes('/node_modules/')) ||
        ['react', 'react-native', 'react-dom'].includes(module)
      )
        continue;
      const bindings = declaration.getNamedImports().map((imported) => ({
        local: imported.getAliasNode()?.getText() ?? imported.getName(),
        exportName: imported.getName(),
      }));
      const defaultImport = declaration.getDefaultImport();
      if (defaultImport)
        bindings.push({
          local: defaultImport.getText(),
          exportName: 'default',
        });
      const namespace = declaration.getNamespaceImport()?.getText();
      for (const tag of tags) {
        const name = tag.getText();
        const imported = bindings.find((binding) => binding.local === name);
        if (imported || (namespace && name.startsWith(`${namespace}.`)))
          imports.push({
            module,
            exportName:
              imported?.exportName ?? name.slice(namespace!.length + 1),
            ...site(tag.getStartLineNumber()),
          });
      }
    }
  }
  return { imports, usage };
}
