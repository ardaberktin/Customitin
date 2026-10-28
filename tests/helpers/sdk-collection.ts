import {
  createCollectionDescriptor,
  createProfile,
  defineCapabilities,
  defineComponent,
  defineSource,
  type DataResult,
} from '@customitin/core';
const provenance = {
  version: 1,
  status: 'developer-reviewed' as const,
  evidence: 'Generic SDK collection test',
};
export const collectionSource = defineSource({
  id: 'entries',
  title: 'Entries',
  provenance,
  completeness: 'complete',
  idField: 'id',
  titleField: 'title',
  maxRows: 100,
  pageSize: 20,
  supportsCount: true,
  supportsGrouping: true,
  fields: {
    id: {
      type: 'string',
      required: true,
      filterOps: ['eq'],
      sortable: false,
      groupable: false,
    },
    title: {
      type: 'string',
      required: true,
      filterOps: ['eq'],
      sortable: true,
      groupable: false,
    },
    stage: {
      type: 'string',
      required: true,
      values: ['Draft', 'Ready', 'Done'],
      filterOps: ['eq'],
      sortable: true,
      groupable: true,
    },
    score: {
      type: 'number',
      nullable: true,
      required: true,
      filterOps: [],
      sortable: true,
      groupable: false,
    },
  },
});
export const collectionCard = defineComponent({
  id: 'card',
  title: 'Card',
  kind: 'host',
  acceptsChildren: false,
  props: {},
  dataInputs: {
    item: {
      cardinality: 'one',
      fields: Object.fromEntries(
        Object.entries(collectionSource.fields).map(
          ([f, { filterOps: _f, sortable: _s, groupable: _g, ...rule }]) => [
            f,
            rule,
          ],
        ),
      ),
    },
  },
  provenance,
});
export const sdkCollection = createCollectionDescriptor(
  collectionCard,
  collectionSource,
);
export const collectionRegistry = defineCapabilities({
  appId: 'collection-test',
  revision: 'r1',
  components: [collectionCard, sdkCollection],
  sources: [collectionSource],
  surfaces: [
    {
      id: 'workspace',
      title: 'Workspace',
      defaultLayout: [],
      requiredNodeIds: [],
      allowedComponentIds: ['card', 'card.collection'],
      policy: {
        operations: ['data', 'layout'],
        sourceFields: { entries: Object.keys(collectionSource.fields) },
      },
      provenance,
    },
  ],
  destinations: [],
  defaultNavigation: [],
  themeTokens: {},
  limits: { depth: 3, nodes: 10, tabs: 2, sources: 1 },
});
export const collectionData: DataResult = {
  complete: true,
  nextCursor: null,
  keys: ['b', 'a', 'c'],
  rows: [
    { id: 'b', title: 'Beta', stage: 'Ready', score: 2 },
    { id: 'a', title: 'Alpha', stage: 'Draft', score: null },
    { id: 'c', title: 'Gamma', stage: 'Ready', score: 10 },
  ],
};
export function collectionProfile() {
  const p = createProfile(collectionRegistry, 'alice');
  p.dataViews = [
    {
      id: 'all',
      title: 'All',
      plan: {
        sourceId: 'entries',
        joins: [],
        computed: {},
        groupBy: [],
        aggregates: {},
        sort: [],
        project: Object.keys(collectionSource.fields),
        execution: 'local',
      },
    },
  ];
  p.surfaces.workspace = [
    {
      id: 'collection',
      componentId: 'card.collection',
      props: {
        title: 'Entries',
        groupBy: 'stage',
        filterBy: 'stage',
        sortBy: 'score',
        columns: 3,
      },
      children: [],
      data: {
        items: {
          viewId: 'all',
          mapping: Object.fromEntries(
            Object.keys(collectionSource.fields).map((f) => [f, f]),
          ),
        },
      },
    },
  ];
  return p;
}
