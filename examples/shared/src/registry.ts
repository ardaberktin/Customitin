import {
  registrySchema,
  type CapabilityRegistry,
  type LayoutNode,
} from '@customitin/core';
import type { DemoKind } from './data';
const provenance = {
  version: 1,
  evidence: 'examples/shared/src/registry.ts',
  status: 'developer-reviewed' as const,
};
export const section = (id: string, componentId = id): LayoutNode => ({
  id,
  componentId,
  props: {},
  children: [],
});
const field = (type: string, groupable = false) => ({
  type,
  required: true,
  filterOps:
    type === 'number'
      ? ['eq', 'lt', 'lte', 'gt', 'gte']
      : type === 'boolean'
        ? ['eq', 'neq']
        : ['eq', 'neq', 'contains', 'in', 'lt', 'lte', 'gt', 'gte'],
  sortable: true,
  groupable,
});
export function demoRegistry(kind: DemoKind): CapabilityRegistry {
  const fields =
    kind === 'recipe'
      ? {
          category: field('string', true),
          minutes: field('number'),
          ingredients: field('string'),
          favorite: field('boolean'),
        }
      : kind === 'movie'
        ? {
            genre: field('string', true),
            year: field('number'),
            watched: field('boolean'),
          }
        : {
            category: field('string', true),
            dueAt: field('string'),
            completed: field('boolean'),
          };
  return registrySchema.parse({
    appId: `${kind}-demo`,
    revision: 'demo-v2',
    components: [
      ...['intro', 'featured', 'library'].map((id) => ({
        id,
        title:
          id === 'intro'
            ? 'Welcome'
            : id === 'featured'
              ? 'Featured collection'
              : 'Library',
        provenance,
        kind: 'host',
        props: {},
        acceptsChildren: false,
      })),
      {
        id: 'collection',
        title: 'Personal collection',
        provenance,
        kind: 'collection',
        props: {},
        acceptsChildren: false,
      },
      {
        id: 'summary',
        title: 'Collection count',
        provenance,
        kind: 'summary',
        props: {},
        acceptsChildren: false,
      },
      {
        id: 'stack',
        title: 'Section group',
        provenance,
        kind: 'stack',
        props: {},
        acceptsChildren: true,
      },
      {
        id: 'text',
        title: 'Heading',
        provenance,
        kind: 'text',
        props: {
          text: { type: 'string', required: true },
          size: { type: 'number', min: 14, max: 32 },
        },
        acceptsChildren: false,
      },
      {
        id: 'shortcut',
        title: 'Shortcut',
        provenance,
        kind: 'shortcut',
        props: { label: { type: 'string', required: true } },
        acceptsChildren: false,
      },
      {
        id: 'card',
        title: 'Item card',
        provenance,
        kind: 'item',
        props: {},
        acceptsChildren: false,
      },
    ],
    sources: [
      {
        id: 'catalog',
        title:
          kind === 'recipe'
            ? 'Recipes'
            : kind === 'movie'
              ? 'Watchlist'
              : 'Tasks',
        provenance,
        completeness: kind === 'movie' ? 'paginated' : 'complete',
        fields: {
          id: field('string'),
          title: field('string'),
          note: field('string'),
          ...fields,
        },
        idField: 'id',
        titleField: 'title',
        subtitleField: 'note',
        maxRows: 500,
        pageSize: 2,
        supportsCount: true,
        supportsGrouping: kind !== 'movie',
        detailDestinationId: 'detail',
        detailParam: 'id',
      },
    ],
    surfaces: [
      {
        id: 'home',
        title: 'Home',
        provenance,
        mode: 'compose',
        policy: {
          operations: ['layout', 'data', 'theme', 'navigation'],
          sourceFields: {
            catalog: ['id', 'title', 'note', ...Object.keys(fields)],
          },
          destinationIds: ['home', 'customize', 'detail'],
          themeTokenIds: [
            'appearance.mode',
            'type.scale',
            'layout.density',
            'shape.radius',
            'motion.reduced',
          ],
        },
        defaultLayout: [
          section('intro'),
          section('featured'),
          section('library'),
        ],
        requiredNodeIds: ['intro'],
        allowedComponentIds: [
          'intro',
          'featured',
          'library',
          'collection',
          'summary',
          'stack',
          'text',
          'shortcut',
        ],
      },
    ],
    destinations: [
      {
        id: 'home',
        title: 'Home',
        provenance,
        params: {},
        placements: ['tab', 'shortcut', 'overflow'],
        protected: true,
      },
      {
        id: 'customize',
        title: 'Customize',
        provenance,
        params: {},
        placements: ['tab', 'shortcut', 'overflow'],
        protected: true,
      },
      {
        id: 'detail',
        title: 'Details',
        provenance,
        params: { id: { type: 'string', required: true } },
        placements: ['shortcut', 'overflow'],
        protected: false,
      },
    ],
    defaultNavigation: [
      {
        target: 'destination',
        id: 'home',
        label:
          kind === 'recipe'
            ? 'My kitchen'
            : kind === 'movie'
              ? 'Watchlist'
              : 'My day',
        placement: 'tab',
      },
      {
        target: 'destination',
        id: 'customize',
        label: 'Customize',
        placement: 'tab',
      },
    ],
    themeTokens: {
      'appearance.mode': {
        type: 'string',
        values: ['light', 'dark'],
        default: 'light',
        consumers: ['Home', 'Cards', 'Composer', 'Personal destinations'],
      },
      'type.scale': {
        type: 'number',
        min: 1,
        max: 1.4,
        default: 1,
        consumers: ['All SDK text', 'Host home text'],
      },
      'layout.density': {
        type: 'string',
        values: ['comfortable', 'compact'],
        default: 'comfortable',
        consumers: ['All SDK sections', 'Host cards'],
      },
      'shape.radius': {
        type: 'number',
        min: 0,
        max: 28,
        default: 18,
        consumers: ['Cards'],
      },
      'motion.reduced': {
        type: 'boolean',
        default: true,
        consumers: ['Static SDK renderer (no motion)'],
      },
    },
    limits: { depth: 5, nodes: 50, sources: 3, tabs: 4 },
  });
}
export const registries = {
  recipe: demoRegistry('recipe'),
  movie: demoRegistry('movie'),
  task: demoRegistry('task'),
};
