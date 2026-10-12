import { dirname, relative } from 'node:path';
import type { DiscoveredSymbol } from '../discovery/types';
export function relativeImport(from: string, to: string): string {
  const path = relative(dirname(from), to)
    .replace(/\\/g, '/')
    .replace(/\.tsx?$/, '');
  return path.startsWith('.') ? path : `./${path}`;
}
export function symbolImport(
  symbol: DiscoveredSymbol,
  alias: string,
  from: string,
) {
  const path = JSON.stringify(relativeImport(from, symbol.file));
  const statement =
    symbol.exportName === 'default'
      ? `import ${alias} from ${path};`
      : `import { ${symbol.exportName} as ${alias} } from ${path};`;
  return {
    statement,
    expression: symbol.member ? propertyAccess(alias, symbol.member) : alias,
  };
}
/** Keep valid property names readable without breaking unusual host field names. */
export function propertyAccess(object: string, name: string): string {
  return /^[$A-Z_a-z][$\w]*$/.test(name)
    ? `${object}.${name}`
    : `${object}[${JSON.stringify(name)}]`;
}
