import type { PlannerTransport } from '@customitin/react-native';
import { registrySchema, type PlannerResponse } from '@customitin/core';
import capabilities from '../personalize/capabilities.json';

const registry = registrySchema.parse(capabilities);
const source = registry.sources[0];
const item = registry.components.find(component =>
  component.sourceIds?.includes(source.id),
);
const greeting = registry.components.find(
  component => component.kind === 'host',
);

// Deterministic test transport. This is not an AI planner or a production fallback.
export const planner: PlannerTransport = {
  async plan(request): Promise<PlannerResponse> {
    return {
      kind: 'proposal',
      proposal: {
        requestId: request.requestId,
        registryRevision: request.registryRevision,
        baseRevision: request.baseRevision,
        summary: 'Favorite trails, longest first',
        operations: [
          {
            op: 'createView',
            view: {
              id: 'favorites',
              title: 'Favorite trails',
              sourceId: source.id,
              query: {
                filters: [{ field: 'favorite', op: 'eq', value: true }],
                sort: [{ field: 'distance', direction: 'desc' }],
              },
              presentation: {
                mode: 'list',
                itemRendererId: item?.id ?? 'item',
                density: 'comfortable',
              },
            },
          },
          {
            op: 'setSurfaceLayout',
            surfaceId: 'home',
            nodes: [
              ...(greeting
                ? [
                    {
                      id: 'hello',
                      componentId: greeting.id,
                      props: { message: 'Ready for a hike' },
                      children: [],
                    },
                  ]
                : []),
              {
                id: 'list',
                componentId: 'collection',
                props: {},
                children: [],
                viewId: 'favorites',
              },
            ],
          },
          {
            op: 'setNavigationPlacements',
            placements: [
              ...request.configuration.navigation,
              {
                target: 'view',
                id: 'favorites',
                label: 'Favorite trails',
                placement: 'tab',
              },
            ],
          },
        ],
      },
    };
  },
};
