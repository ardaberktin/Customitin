import { selectSources } from './select-sources';
import { selectComponents } from './select-components';
import type {
  DiscoveredSymbol,
  DiscoveryReport,
  DiscoveredRoute,
} from '../discovery/types';
import { lookupOverride, referenceId, type IdentityLock } from './identity';
import { type IntegrationOverrides, type SourceOverride } from './overrides';

export interface SelectedSource {
  symbol: DiscoveredSymbol;
  options: SourceOverride;
}
export interface SelectedComponent {
  symbol: DiscoveredSymbol;
  options: IntegrationOverrides['components'][string];
  sourceId?: string;
  collectionSourceId?: string;
}
export interface ResolvedIntegration {
  overrides: IntegrationOverrides;
  sources: SelectedSource[];
  components: SelectedComponent[];
  routes: { route: DiscoveredRoute; title: string }[];
  screens: {
    symbol: DiscoveredSymbol;
    options: IntegrationOverrides['screens'][string];
  }[];
  queryClient?: DiscoveredSymbol;
  navigationRef?: DiscoveredSymbol;
  issues: string[];
}
export function resolveIntegration(
  report: DiscoveryReport,
  overrides: IntegrationOverrides,
  lock: IdentityLock,
): ResolvedIntegration {
  const issues: string[] = [];
  const clients = report.symbols.filter((s) => s.kind === 'query-client');
  const queryClient = overrides.queryClient
    ? clients.find((s) => s.id === referenceId(lock, overrides.queryClient!))
    : clients.length === 1
      ? clients[0]
      : undefined;
  if (overrides.queryClient && !queryClient)
    issues.push(`Query client not found: ${overrides.queryClient}`);
  const refs = report.symbols.filter((s) => s.kind === 'navigation-ref');
  const navigationRef = overrides.navigationRef
    ? refs.find((s) => s.id === referenceId(lock, overrides.navigationRef!))
    : refs.length === 1
      ? refs[0]
      : undefined;
  const sources = selectSources(report, overrides, lock, queryClient, issues);
  const components = selectComponents(report, overrides, lock, sources, issues);
  const screens = report.symbols.flatMap((symbol) => {
    const options = lookupOverride(overrides.screens, symbol, lock);
    if (!options?.enabled) return [];
    if (!symbol.screen) {
      issues.push(
        `${symbol.selector}: ${symbol.screenIssue ?? 'Not a supported screen.'}`,
      );
      return [];
    }
    for (const key of options.requiredSections)
      if (!symbol.screen.sections.some((section) => section.key === key))
        throw new Error(`${symbol.selector}: unknown required section ${key}`);
    return [{ symbol, options }];
  });
  const routes = report.routeDetails.flatMap((route) => {
    const options = lookupOverride(overrides.routes, route, lock);
    if (!options?.enabled) return [];
    if (report.framework === 'react-navigation' && !navigationRef) {
      issues.push(
        `${route.selector}: export an existing navigation ref or select navigationRef in overrides.`,
      );
      return [];
    }
    if (!route.supported) {
      issues.push(
        `${route.selector}: catch-all routes require a host navigation binding.`,
      );
      return [];
    }
    return [{ route, title: options.title ?? route.path }];
  });
  for (const [kind, entries] of Object.entries({
    sources: overrides.sources,
    components: overrides.components,
    routes: overrides.routes,
    screens: overrides.screens,
  })) {
    const seen = new Set<string>();
    for (const key of Object.keys(entries)) {
      if (
        !lock.bindings.some((b) =>
          [b.id, b.selector, ...b.aliases].includes(key),
        )
      )
        throw new Error(
          `Unknown ${kind} override ${key}; use a discovered selector or stable ID.`,
        );
      const binding = lock.bindings.find((b) =>
        [b.id, b.selector, ...b.aliases].includes(key),
      );
      if (
        binding &&
        binding.kind !==
          {
            sources: 'source',
            components: 'component',
            routes: 'route',
            screens: 'component',
          }[kind]
      )
        throw new Error(`${key}: override is in the wrong category (${kind})`);
      if (binding && seen.has(binding.id))
        throw new Error(
          `${key}: multiple overrides target the same capability; keep one key`,
        );
      if (binding) seen.add(binding.id);
      if (
        binding &&
        ![...report.symbols, ...report.routeDetails].some(
          (v) => v.id === binding.id,
        ) &&
        entries[key]?.enabled !== false
      )
        issues.push(
          `${key}: binding is missing. Set symbol to its replacement selector or disable it.`,
        );
    }
  }
  return {
    overrides,
    sources,
    components,
    routes,
    screens,
    queryClient,
    navigationRef,
    issues,
  };
}
