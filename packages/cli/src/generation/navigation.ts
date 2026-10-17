import type { DiscoveryReport } from '../discovery/types';
import type { ResolvedIntegration } from '../configuration/resolve';
import { propertyAccess, symbolImport } from './imports';
export function generateNavigation(
  report: DiscoveryReport,
  integration: ResolvedIntegration,
): string {
  if (!integration.routes.length)
    return `import type { RuntimeBindings } from '@customitin/react';\nexport const navigate: RuntimeBindings['navigate'] = undefined;\n`;
  const imports: string[] = [];
  let routes: string[];
  if (report.framework === 'expo-router') {
    imports.push("import { router, type Href } from 'expo-router';");
    routes = integration.routes.map(
      ({ route }) =>
        `${JSON.stringify(route.id)}: (params: Record<string, Scalar>) => router.push({ pathname: ${JSON.stringify(route.path)}, params: Object.fromEntries(Object.entries(params).map(([key, value]) => [key, String(value)])) } as Href)`,
    );
  } else if (integration.navigationRef) {
    const binding = symbolImport(
      integration.navigationRef,
      'navigationRef',
      'personalize/navigation.ts',
    );
    imports.push(binding.statement);
    routes = integration.routes.map(({ route }) => {
      const params = Object.entries(route.params).map(
        ([name, rule]) =>
          `${JSON.stringify(name)}: ${propertyAccess('params', name)} as ${rule.values ? rule.values.map((v) => JSON.stringify(v)).join(' | ') : rule.type}${rule.required ? '' : ' | undefined'}`,
      );
      return `${JSON.stringify(route.id)}: (${params.length ? 'params' : '_params'}: Record<string, Scalar>) => { if (!navigationRef.isReady()) throw new Error('Host navigation is not ready'); navigationRef.navigate(${JSON.stringify(route.path)}${params.length ? `, { ${params.join(', ')} }` : ''}); }`;
    });
  } else
    throw new Error('Enabled routes require a supported navigator binding');
  return `${imports.join('\n')}
import type { Scalar } from '@customitin/core';
import { registrySchema } from '@customitin/core';
import { createNavigationAdapter } from '@customitin/react/adapters';
import capabilities from './capabilities.json';
export const navigate = createNavigationAdapter(registrySchema.parse(capabilities), {
${routes.join(',\n')}
});
`;
}
