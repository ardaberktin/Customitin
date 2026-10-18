import {
  dataPlanSchema,
  type LayoutNode,
  type PlannerTransport,
} from '@customitin/core';
import registry from './personalize/capabilities.json';
import { en } from './en';
const component = (name: string) => {
  const found = registry.components.find((item) => item.title === name);
  if (!found) throw new Error(`Missing reviewed component ${name}`);
  return found.id;
};
export const planner: PlannerTransport = {
  async plan(request) {
    const budgets = request.instruction === en.budgets;
    const source = registry.sources.find(
      (item) => item.title === (budgets ? 'loadBudgets' : 'loadHours'),
    )!;
    const label = budgets ? 'department' : 'team';
    const value = budgets ? 'budget' : 'hours';
    const data = { data: { viewId: 'series', mapping: { label, value } } };
    const chart: LayoutNode = {
      id: 'chart',
      componentId: component('Chart'),
      props: { title: budgets ? en.budgets : en.hours },
      children: [],
      data,
    };
    const nodes: LayoutNode[] =
      request.instruction === en.cards
        ? [
            {
              ...chart,
              id: 'cards',
              componentId: component('Cards'),
              props: {},
            },
          ]
        : request.instruction === en.mixed
          ? [
              {
                id: 'panel',
                componentId: component('Panel'),
                props: { title: en.group },
                children: [
                  {
                    id: 'message',
                    componentId: component('Message'),
                    props: { text: en.headingAlt, emphasis: true },
                    children: [],
                  },
                ],
              },
              chart,
              {
                id: 'progress',
                componentId: component('ProgressMeter'),
                props: { value: 65 },
                children: [],
              },
            ]
          : [chart];
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
              id: 'series',
              title: request.instruction,
              plan: dataPlanSchema.parse({
                sourceId: source.id,
                project: [label, value],
              }),
            },
          },
          { op: 'setSurfaceLayout', surfaceId: 'workspace', nodes },
        ],
      },
    };
  },
};
