import type { DiscoveryReport } from '../discovery/types';

/** Provider-only wiring intentionally leaves the host tree's appearance unchanged. */
export function generateRoot(_report: DiscoveryReport): string {
  return `import { useMemo, type ReactNode } from 'react';
import { registrySchema } from '@customitin/core';
import { CustomizationProvider, type RuntimeBindings, type RuntimeOptions } from '@customitin/react';
import capabilities from './capabilities.json';
import { sources } from './sources';
import { components, items } from './components';
import { navigate } from './navigation';
import * as config from './config';
const registry = registrySchema.parse(capabilities);
type HostConfiguration = Partial<Omit<RuntimeOptions, 'registry'>> & { bindings?: Partial<RuntimeBindings> };
const useHostConfiguration = (config as typeof config & { useHostConfiguration?: () => HostConfiguration }).useHostConfiguration ?? (() => ({}));
export function PersonalizationRoot({ children }: { children: ReactNode }) {
  const host: HostConfiguration = useHostConfiguration();
  const custom = host.bindings;
  const bindings = useMemo(() => ({ ...custom, sources: { ...sources, ...custom?.sources }, components: { ...components, ...custom?.components }, items: { ...items, ...custom?.items }, navigate: custom?.navigate ?? navigate }), [custom]);
  return <CustomizationProvider options={{ registry, storage: host.storage ?? config.storage, scope: host.scope ?? config.scope, planner: host.planner ?? config.planner, plannerContext: host.plannerContext }} bindings={bindings}>{children}</CustomizationProvider>;
}
`;
}
