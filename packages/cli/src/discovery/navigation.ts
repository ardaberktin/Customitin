import { createHash } from 'node:crypto';
import { relative } from 'node:path';
import type { SourceFile } from 'ts-morph';
import { scalarFields } from './fields';
import type { DiscoveredRoute } from './types';

/** Explicit React Navigation ParamList declarations, never guesses from component names. */
export function discoverNavigation(
  root: string,
  source: SourceFile,
): DiscoveredRoute[] {
  const file = relative(root, source.getFilePath()).replaceAll('\\', '/');
  return source
    .getTypeAliases()
    .filter((a) => /ParamList$/.test(a.getName()))
    .flatMap((alias) =>
      alias
        .getType()
        .getProperties()
        .map((property) => {
          const type = property.getTypeAtLocation(alias).getNonNullableType();
          const params = scalarFields(type, alias);
          const selector = `${file}#${alias.getName()}.${property.getName()}`;
          return {
            id: `route-${createHash('sha256').update(selector).digest('hex').slice(0, 12)}`,
            selector,
            file,
            path: property.getName(),
            params,
            supported:
              type.isNever() ||
              type.isUndefined() ||
              type.getProperties().length === Object.keys(params).length,
          };
        }),
    );
}
