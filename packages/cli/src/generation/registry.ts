import { createHash } from 'node:crypto';
import {
  createProfile,
  registrySchema,
  validateValues,
  type CapabilityRegistry,
} from '@customitin/core';
import type { DiscoveryReport } from '../discovery/types';
import type { ResolvedIntegration } from '../configuration/resolve';
import { sourceDescriptor } from './source-descriptor';
import { screenCapabilities } from './screens';

export function generateRegistry(
  report: DiscoveryReport,
  integration: ResolvedIntegration,
): CapabilityRegistry {
  const provenance = {
    version: 1,
    evidence: 'Installer template',
    status: 'proposed',
  };
  const screens = screenCapabilities(integration.screens);
  const components = integration.components.map(
    ({ symbol, options, sourceId }) => {
      validateValues(options.defaults, symbol.props, symbol.name, false);
      return {
        id: symbol.id,
        title: options.title ?? symbol.name,
        kind: sourceId ? 'item' : 'host',
        ...(sourceId ? { sourceIds: [sourceId] } : {}),
        acceptsChildren: symbol.acceptsChildren ?? false,
        dataInputs: sourceId ? undefined : symbol.dataProps,
        props: sourceId
          ? {}
          : Object.fromEntries(
              Object.entries(symbol.props).map(([name, rule]) => [
                name,
                {
                  ...rule,
                  required: rule.required && !(name in options.defaults),
                },
              ]),
            ),
        provenance: {
          ...provenance,
          evidence: `${symbol.file}:${symbol.line}`,
        },
      };
    },
  );
  const registry = registrySchema.parse({
    appId: report.appId,
    revision: 'pending',
    components: [
      ...components,
      ...screens.components,
      ...integration.overrides.customComponents,
    ],
    surfaces: [...screens.surfaces, ...integration.overrides.surfaces],
    actions: integration.overrides.actions,
    relations: integration.overrides.relations,
    sources: integration.sources.map((s) => sourceDescriptor(s, integration)),
    destinations: [
      ...integration.routes.map(({ route, title }) => ({
        id: route.id,
        title,
        params: route.params,
        placements: ['shortcut', 'overflow'],
        protected: false,
        provenance: { ...provenance, evidence: route.file },
      })),
    ],
    defaultNavigation: [],
    themeTokens: {},
    limits: { depth: 5, nodes: 40, tabs: 4, sources: 3 },
  });
  // Locations are evidence, not a capability change. Moving a file must not obsolete profiles.
  registry.sources.sort((a, b) => a.id.localeCompare(b.id));
  registry.components.sort((a, b) => a.id.localeCompare(b.id));
  registry.destinations.sort((a, b) => a.id.localeCompare(b.id));
  for (const surface of registry.surfaces) surface.allowedComponentIds.sort();
  const semantics = JSON.stringify(registry, (key, value: unknown) =>
    key === 'provenance' || key === 'revision' ? undefined : value,
  );
  registry.revision = `r-${createHash('sha256').update(semantics).digest('hex').slice(0, 16)}`;
  createProfile(registry, 'validation');
  return registry;
}
