import {
  createProfile,
  registrySchema,
  type CapabilityRegistry,
} from '@customitin/core';
import type { DiscoveryReport } from '../discovery/scan';
export function generateRegistry(
  report: DiscoveryReport,
  selectedIds?: string[],
): CapabilityRegistry {
  const sources = report.symbols.filter(
    (s) =>
      s.kind === 'source' &&
      s.complete &&
      (!selectedIds || selectedIds.includes(s.id)) &&
      s.fields.id &&
      Object.values(s.fields).every((f) => !f.nullable),
  );
  const provenance = {
    version: 1,
    evidence: 'Installer template',
    status: 'proposed' as const,
  };
  const registry = registrySchema.parse({
    appId: 'installed-app',
    revision: `r-${report.contextDigest.slice(0, 16)}`,
    components: [
      {
        id: 'welcome',
        title: 'Welcome',
        kind: 'text',
        props: { text: { type: 'string', required: true } },
        acceptsChildren: false,
        provenance,
      },
      {
        id: 'collection',
        title: 'Collection',
        kind: 'collection',
        props: {},
        acceptsChildren: false,
        provenance,
      },
      {
        id: 'item',
        title: 'Item card',
        kind: 'item',
        props: {},
        acceptsChildren: false,
        provenance,
      },
    ],
    surfaces: [
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
        allowedComponentIds: ['welcome', 'collection'],
      },
    ],
    sources: sources.map((s) => ({
      id: s.id,
      title: s.name,
      provenance: { ...provenance, evidence: `${s.file}:${s.line}` },
      completeness: 'complete',
      fields: Object.fromEntries(
        Object.entries(s.fields).map(([name, rule]) => [
          name,
          {
            ...rule,
            filterOps:
              rule.type === 'boolean'
                ? ['eq', 'neq']
                : rule.type === 'number'
                  ? ['eq', 'lt', 'lte', 'gt', 'gte']
                  : ['eq', 'contains'],
            sortable: true,
            groupable: true,
          },
        ]),
      ),
      idField: 'id',
      titleField:
        Object.keys(s.fields).find((f) =>
          ['title', 'name', 'label'].includes(f),
        ) ?? 'id',
      maxRows: 500,
      pageSize: 50,
      supportsCount: true,
      supportsGrouping: true,
    })),
    destinations: [
      {
        id: 'original',
        title: 'Original app',
        params: {},
        placements: ['tab', 'shortcut'],
        protected: true,
        provenance,
      },
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
      'appearance.mode': {
        type: 'string',
        values: ['light', 'dark'],
        default: 'light',
        consumers: ['SDK surfaces'],
      },
      'type.scale': {
        type: 'number',
        min: 1,
        max: 1.4,
        default: 1,
        consumers: ['SDK text'],
      },
      'layout.density': {
        type: 'string',
        values: ['comfortable', 'compact'],
        default: 'comfortable',
        consumers: ['SDK collections'],
      },
    },
    limits: { depth: 5, nodes: 40, tabs: 4, sources: 3 },
  });
  registry.appId = report.appId;
  createProfile(registry, 'validation');
  return registry;
}
