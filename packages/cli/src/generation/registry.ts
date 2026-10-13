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
  const generic = [
    {
      id: 'welcome',
      title: 'Welcome',
      kind: 'text',
      props: { text: { type: 'string', required: true } },
    },
    { id: 'collection', title: 'Collection', kind: 'collection', props: {} },
    { id: 'item', title: 'Item card', kind: 'item', props: {} },
    {
      id: 'shortcut',
      title: 'Shortcut',
      kind: 'shortcut',
      props: { label: { type: 'string', required: true } },
    },
  ];
  const components = integration.components.map(
    ({ symbol, options, sourceId }) => {
      validateValues(options.defaults, symbol.props, symbol.name, false);
      return {
        id: symbol.id,
        title: options.title ?? symbol.name,
        kind: sourceId ? 'item' : 'host',
        ...(sourceId ? { sourceIds: [sourceId] } : {}),
        acceptsChildren: false,
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
      ...generic.map((c) => ({ ...c, provenance, acceptsChildren: false })),
      ...components,
      ...screens.components,
    ],
    surfaces: screens.surfaces.length
      ? screens.surfaces
      : [
          {
            id: 'home',
            title: 'Personal home',
            provenance,
            defaultLayout: [
              {
                id: 'intro',
                componentId: 'welcome',
                props: { text: 'Your personal space' },
                children: [],
              },
            ],
            requiredNodeIds: [],
            allowedComponentIds: [
              'welcome',
              'collection',
              'shortcut',
              ...components.filter((c) => c.kind === 'host').map((c) => c.id),
            ],
          },
        ],
    sources: integration.sources.map((s) => sourceDescriptor(s, integration)),
    destinations: [
      {
        id: 'original',
        title: 'Original app',
        params: {},
        placements: ['tab', 'shortcut'],
        protected: true,
        provenance,
      },
      ...integration.routes.map(({ route, title }) => ({
        id: route.id,
        title,
        params: route.params,
        placements: ['shortcut', 'overflow'],
        protected: false,
        provenance: { ...provenance, evidence: route.file },
      })),
    ],
    defaultNavigation: [
      {
        target: 'destination',
        id: 'original',
        label: 'Original app',
        placement: 'tab',
      },
    ],
    themeTokens: {
      ...(screens.surfaces.length
        ? {}
        : {
            'appearance.mode': {
              type: 'string',
              values: ['light', 'dark'],
              default: 'light',
              consumers: ['SDK surfaces'],
            },
          }),
      'type.scale': {
        type: 'number',
        min: 1,
        max: 1.4,
        default: 1,
        consumers: screens.surfaces.length
          ? ['Connected screen text with explicit font sizes']
          : ['SDK text'],
      },
      'layout.density': {
        type: 'string',
        values: ['comfortable', 'compact'],
        default: 'comfortable',
        consumers: screens.surfaces.length
          ? ['Connected screen numeric gaps']
          : ['SDK collections'],
      },
    },
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
