import type { ResolvedIntegration } from '../configuration/resolve';
import { propertyAccess, symbolImport } from './imports';

export function generateComponents(integration: ResolvedIntegration): string {
  const imports: string[] = [];
  const hosts: string[] = [];
  const items: string[] = [];
  for (const [
    index,
    { symbol, options, sourceId },
  ] of integration.components.entries()) {
    const binding = symbolImport(
      symbol,
      `Host${index}`,
      'personalize/components.tsx',
    );
    imports.push(binding.statement);
    const component = `Bound${index}`;
    // Resolve live host exports during render so components colocated with the root do not create initialization cycles.
    const props = Object.keys(symbol.props).map((name) => {
      const value = sourceId
        ? (JSON.stringify(options.defaults[name]) ?? 'undefined')
        : `${propertyAccess('values', name)} ?? ${JSON.stringify(options.defaults[name]) ?? 'undefined'}`;
      return `${JSON.stringify(name)}: (${value}) as ComponentProps<typeof ${component}>[${JSON.stringify(name)}]`;
    });
    for (const [name, input] of Object.entries(
      sourceId ? {} : (symbol.dataProps ?? {}),
    )) {
      const rows = `${propertyAccess('data', name)}?.rows`;
      // SurfaceRenderer validates mapped rows against the discovered input schema.
      // Named host interfaces need an explicit boundary from index-signature rows.
      props.push(
        `${JSON.stringify(name)}: (${input.cardinality === 'many' ? rows : rows + '?.[0]'}) as unknown as ComponentProps<typeof ${component}>[${JSON.stringify(name)}]`,
      );
    }
    if (symbol.acceptsChildren) props.push('children');
    if (sourceId && symbol.itemProp) {
      props.push(
        `${JSON.stringify(symbol.itemProp)}: { ${Object.keys(
          symbol.itemFields ?? {},
        )
          .map(
            (name) =>
              `${JSON.stringify(name)}: ${propertyAccess('row', name)}${symbol.itemFields?.[name]?.required ? '' : ' ?? undefined'}`,
          )
          .join(
            ', ',
          )} } as ComponentProps<typeof ${component}>[${JSON.stringify(symbol.itemProp)}]`,
      );
      if (symbol.pressProp) props.push(`${symbol.pressProp}: onPress`);
      items.push(
        `${JSON.stringify(symbol.id)}: ({ row${symbol.pressProp ? ', onPress' : ''} }: ItemProps) => { const ${component} = ${binding.expression}; return <${component} {...{ ${props.join(', ')} }} />; }`,
      );
    } else
      hosts.push(
        `${JSON.stringify(symbol.id)}: (${props.length ? `{ ${[Object.keys(symbol.props).length ? 'values' : '', symbol.dataProps ? 'data = {}' : '', symbol.acceptsChildren ? 'children' : ''].filter(Boolean).join(', ')} }` : '_props'}: HostComponentProps) => { const ${component} = ${binding.expression}; return <${component} {...{ ${props.join(', ')} }} />; }`,
      );
  }
  const types = [
    hosts.length ? 'HostComponentProps' : '',
    items.length ? 'ItemProps' : '',
  ].filter(Boolean);
  if (
    integration.components.some(
      ({ symbol }) =>
        symbol.itemProp || symbol.dataProps || Object.keys(symbol.props).length,
    )
  )
    imports.unshift(`import type { ComponentProps } from 'react';`);
  if (types.length)
    imports.unshift(
      `import type { ${types.join(', ')} } from '@customitin/react';`,
    );
  return [
    ...imports,
    `export const components = {\n${hosts.join(',\n')}\n};`,
    `export const items = {\n${items.join(',\n')}\n};`,
    '',
  ].join('\n');
}
