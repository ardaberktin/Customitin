import { dataPlanSchema, type PlannerTransport } from '@customitin/core';
import registry from '../personalize/capabilities.json';
export const planner: PlannerTransport = {
  async plan(request) {
    const budgets = request.instruction === 'budgets';
    const source = registry.sources.find(
      (item) => item.title === (budgets ? 'loadBudgets' : 'loadHours'),
    )!;
    const chart = registry.components.find((item) => item.title === 'Chart')!;
    const label = budgets ? 'department' : 'team';
    const value = budgets ? 'budget' : 'hours';
    return {
      kind: 'proposal',
      proposal: {
        requestId: request.requestId,
        registryRevision: request.registryRevision,
        baseRevision: request.baseRevision,
        summary: request.instruction,
        operations: [
          {
            op: 'setDataView',
            surfaceId: 'workspace',
            view: {
              id: 'chart-data',
              title: request.instruction,
              plan: dataPlanSchema.parse({
                sourceId: source.id,
                project: [label, value],
              }),
            },
          },
          {
            op: 'setSurfaceLayout',
            surfaceId: 'workspace',
            nodes: [
              {
                id: 'existing-chart',
                componentId: chart.id,
                props: {},
                children: [],
                data: {
                  data: { viewId: 'chart-data', mapping: { label, value } },
                },
              },
            ],
          },
        ],
      },
    };
  },
};
