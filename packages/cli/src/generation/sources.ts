import type { ResolvedIntegration } from '../configuration/resolve';
import { symbolImport } from './imports';

export function generateSources(integration: ResolvedIntegration): string {
  if (!integration.sources.length) return 'export const sources = {};\n';
  const imports = [
    `import { registrySchema } from '@customitin/core';`,
    `import capabilities from './capabilities.json';`,
  ];
  const helpers = new Set<string>();
  const declarations = [`const registry = registrySchema.parse(capabilities);`];
  const entries: string[] = [];
  if (
    integration.sources.some(
      ({ symbol }) => symbol.adapter === 'query-options',
    ) &&
    integration.queryClient
  )
    imports.push(
      symbolImport(
        integration.queryClient,
        'queryClient',
        'personalize/sources.ts',
      ).statement,
    );
  integration.sources.forEach(({ symbol }, index) => {
    const binding = symbolImport(
      symbol,
      `source${index}`,
      'personalize/sources.ts',
    );
    imports.push(binding.statement);
    const descriptor = `descriptor${index}`;
    declarations.push(
      `const ${descriptor} = registry.sources.find(s => s.id === ${JSON.stringify(symbol.id)})!;`,
    );
    if (symbol.adapter === 'query-page') {
      helpers.add('createQuerySource');
      helpers.add('projectRows');
      entries.push(
        `${JSON.stringify(symbol.id)}: createQuerySource(${descriptor}, async (query, context, cursor) => { const page = await ${binding.expression}(query, context, cursor); return { ...page, items: projectRows(page.items, ${descriptor}) }; })`,
      );
    } else {
      helpers.add('createCachedSource');
      if (symbol.adapter === 'query-options') {
        helpers.add('queryInvalidation');
        entries.push(
          `${JSON.stringify(symbol.id)}: createCachedSource(${descriptor}, async (context) => { const options = ${binding.expression}(); return queryClient.fetchQuery({ ...options, queryKey: [...options.queryKey, 'customitin-scope', context.scope], staleTime: 0 }); }, queryInvalidation(queryClient.getQueryCache(), () => ${binding.expression}().queryKey))`,
        );
      } else
        entries.push(
          `${JSON.stringify(symbol.id)}: createCachedSource(${descriptor}, async () => ${binding.expression}())`,
        );
    }
  });
  if (helpers.size)
    imports.push(
      `import { ${[...helpers].join(', ')} } from '@customitin/react-native/adapters';`,
    );
  return [
    ...imports,
    ...declarations,
    `export const sources = {\n${entries.join(',\n')}\n};`,
    '',
  ].join('\n');
}
