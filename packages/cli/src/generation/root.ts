import type { DiscoveryReport } from '../discovery/types';

export function generateRoot(report: DiscoveryReport, inline = false): string {
  const safeArea =
    !inline && !!report.versions['react-native-safe-area-context'];
  return `import { useMemo, type ReactNode } from 'react';
${safeArea ? "import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';" : ''}
import { registrySchema } from '@customitin/core';
import { ${inline ? 'CustomizationProvider' : 'PersonalizationHost'}, type RuntimeBindings, type RuntimeOptions } from '@customitin/react-native';
import capabilities from './capabilities.json';
import { sources } from './sources';
import { components, items } from './components';
import { navigate } from './navigation';
import * as config from './config';
const registry = registrySchema.parse(capabilities);
type HostConfiguration = Partial<Omit<RuntimeOptions, 'registry'>> & { bindings?: Partial<RuntimeBindings> };
const useHostConfiguration = (config as typeof config & { useHostConfiguration?: () => HostConfiguration }).useHostConfiguration ?? (() => ({}));
${
  safeArea
    ? `export function PersonalizationRoot({ children }: { children: ReactNode }) {
  return <SafeAreaProvider><ConnectedRoot>{children}</ConnectedRoot></SafeAreaProvider>;
}
function ConnectedRoot`
    : 'export function PersonalizationRoot'
}({ children }: { children: ReactNode }) {
  ${safeArea && !inline ? 'const insets = useSafeAreaInsets();' : ''}
  const host: HostConfiguration = useHostConfiguration();
  const custom = host.bindings;
  const bindings = useMemo(() => ({ ...custom, sources: { ...sources, ...custom?.sources }, components: { ...components, ...custom?.components }, items: { ...items, ...custom?.items }, navigate: custom?.navigate ?? navigate }), [custom]);
  return <${inline ? 'CustomizationProvider' : 'PersonalizationHost'} ${safeArea && !inline ? 'insets={insets}' : ''} options={{ registry, storage: host.storage ?? config.storage, scope: host.scope ?? config.scope, planner: host.planner ?? config.planner }} bindings={bindings}>{children}</${inline ? 'CustomizationProvider' : 'PersonalizationHost'}>;
}
`;
}
