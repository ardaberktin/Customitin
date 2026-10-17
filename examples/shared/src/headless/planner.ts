import { en } from './strings';
import { dataPlanSchema, type PlannerTransport } from '@customitin/core';
/** Deterministic example recipes, explicitly not an unrestricted natural-language model. */
export const workspacePlanner: PlannerTransport = {
  async plan(request) {
    const common = {
      requestId: request.requestId,
      registryRevision: request.registryRevision,
      baseRevision: request.baseRevision,
    };
    if (request.instruction === en.actionPrompt)
      return {
        kind: 'action-proposal',
        proposal: {
          ...common,
          surfaceId: 'workspace',
          actionId: 'complete',
          arguments: { id: 'one' },
          summary: en.actionPrompt,
        },
      };
    if (![en.hoursPrompt, en.targetsPrompt].includes(request.instruction))
      return { kind: 'clarification', message: en.clarification };
    const targets = request.instruction === en.targetsPrompt;
    const plan = dataPlanSchema.parse(
      targets
        ? { sourceId: 'teams', project: ['name', 'target'] }
        : {
            sourceId: 'activity',
            joins: [
              { relationId: 'activity-team', kind: 'inner', alias: 'team' },
            ],
            computed: {
              doubled: {
                op: 'multiply',
                args: [{ field: 'hours' }, { literal: 2 }],
              },
            },
            groupBy: ['team.name'],
            aggregates: { hours: { op: 'sum', field: 'hours' } },
            project: ['team.name', 'hours'],
          },
    );
    return {
      kind: 'proposal',
      proposal: {
        ...common,
        summary: targets ? en.tableSummary : en.chartSummary,
        operations: [
          {
            op: 'setDataView',
            surfaceId: 'workspace',
            view: { id: 'personal-series', title: en.series, plan },
          },
          {
            op: 'setSurfaceLayout',
            surfaceId: 'workspace',
            nodes: [
              {
                id: 'personal-visual',
                componentId: targets ? 'table' : 'chart',
                props: { title: targets ? en.targets : en.hours },
                children: [],
                data: {
                  series: {
                    viewId: 'personal-series',
                    mapping: {
                      label: targets ? 'name' : 'team.name',
                      value: targets ? 'target' : 'hours',
                    },
                  },
                },
              },
            ],
          },
        ],
      },
    };
  },
};
