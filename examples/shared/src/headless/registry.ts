import { en } from './strings';
import {
  defineCapabilities,
  defineComponent,
  defineSource,
  defineSurface,
  defineAction,
  defineRelation,
} from '@customitin/core';
const provenance = {
  version: 1,
  status: 'developer-reviewed' as const,
  evidence: 'Host-owned example capabilities',
};
const scalar = (type: 'string' | 'number' | 'boolean') => ({
  type,
  required: true,
  nullable: false,
});
const field = (type: 'string' | 'number' | 'boolean') => ({
  ...scalar(type),
  filterOps: [],
  sortable: false,
  groupable: false,
});
const series = { label: scalar('string'), value: scalar('number') };
export const workspaceRegistry = defineCapabilities({
  appId: 'headless-workspace',
  revision: 'workspace-v2',
  components: ['chart', 'table'].map((id) =>
    defineComponent({
      id,
      title: id === 'chart' ? en.hostChart : en.hostTable,
      kind: 'host',
      props: { title: scalar('string') },
      dataInputs: { series: { fields: series, cardinality: 'many' } },
      acceptsChildren: false,
      provenance,
    }),
  ),
  sources: [
    defineSource({
      id: 'activity',
      title: en.activity,
      completeness: 'complete',
      fields: {
        id: field('string'),
        teamId: field('string'),
        hours: field('number'),
        done: field('boolean'),
      },
      idField: 'id',
      titleField: 'id',
      maxRows: 100,
      pageSize: 100,
      supportsCount: true,
      supportsGrouping: false,
      provenance,
    }),
    defineSource({
      id: 'teams',
      title: en.teams,
      completeness: 'complete',
      fields: {
        id: field('string'),
        name: field('string'),
        target: field('number'),
      },
      idField: 'id',
      titleField: 'name',
      maxRows: 100,
      pageSize: 100,
      supportsCount: true,
      supportsGrouping: false,
      provenance,
    }),
  ],
  relations: [
    defineRelation({
      id: 'activity-team',
      leftSourceId: 'activity',
      rightSourceId: 'teams',
      leftField: 'teamId',
      rightField: 'id',
      cardinality: 'many-to-one',
    }),
  ],
  actions: [
    defineAction({
      id: 'complete',
      title: en.complete,
      arguments: { id: scalar('string') },
      result: { done: scalar('boolean') },
      effect: 'write',
      invalidates: ['activity'],
    }),
  ],
  surfaces: [
    defineSurface({
      id: 'workspace',
      title: en.nativeTitle,
      mode: 'compose',
      defaultLayout: [],
      requiredNodeIds: [],
      allowedComponentIds: ['chart', 'table'],
      policy: {
        operations: ['layout', 'data', 'actions'],
        sourceFields: {
          activity: ['id', 'teamId', 'hours', 'done'],
          teams: ['id', 'name', 'target'],
        },
        actionIds: ['complete'],
      },
      provenance,
    }),
  ],
  destinations: [],
  defaultNavigation: [],
  themeTokens: {},
  limits: { depth: 5, nodes: 40, sources: 3, tabs: 4 },
});
