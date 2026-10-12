import type {
  Operation,
  PlannerRequest,
  PlannerResponse,
  SavedView,
} from '@customitin/core';
import type { DemoKind } from './data';
import { section } from './registry';
export const demoPrompts = {
  recipe: [
    'Show quick recipes in a grid',
    'Group recipes by category',
    'Use a dark reading theme',
  ],
  movie: [
    'Show unwatched movies in a grid',
    'Pin my watchlist',
    'Use compact spacing',
  ],
  task: [
    'Put overdue tasks first',
    'Show upcoming tasks',
    'Make the text larger',
  ],
};
/** Deterministic demonstration only. This never pretends to be general natural-language inference. */
export function demoPlan(
  kind: DemoKind,
  request: PlannerRequest,
): PlannerResponse {
  const text = request.instruction.toLowerCase().trim();
  const operations: Operation[] = [];
  const tokens: Record<string, string | number> = {};
  if (/dark/.test(text)) tokens['appearance.mode'] = 'dark';
  else if (/light/.test(text)) tokens['appearance.mode'] = 'light';
  if (/larger|bigger/.test(text)) tokens['type.scale'] = 1.2;
  if (/compact/.test(text)) tokens['layout.density'] = 'compact';
  if (Object.keys(tokens).length)
    operations.push({ op: 'setThemeTokens', tokens });
  else if (/quick|group|unwatched|upcoming|overdue|watchlist|grid/.test(text)) {
    if (text.includes('group') && kind === 'movie')
      return {
        kind: 'unsupported',
        message:
          'Grouping the entire watchlist is unavailable. Try a filtered list or grid.',
      };
    const view: SavedView = {
      id: `new-${request.requestId}`,
      title:
        kind === 'recipe'
          ? text.includes('group')
            ? 'Recipes by category'
            : 'Quick & lovely'
          : kind === 'movie'
            ? 'Next on your watchlist'
            : text.includes('overdue')
              ? 'Overdue tasks'
              : 'Upcoming work',
      sourceId: 'catalog',
      query: {
        filters:
          kind === 'recipe' && !text.includes('group')
            ? [{ field: 'minutes', op: 'lte', value: 25 }]
            : kind === 'movie'
              ? [{ field: 'watched', op: 'eq', value: false }]
              : kind === 'task'
                ? [
                    { field: 'completed', op: 'eq', value: false },
                    {
                      field: 'dueAt',
                      op: text.includes('overdue') ? 'lt' : 'gte',
                      value: new Date().toISOString().slice(0, 10),
                    },
                  ]
                : [],
        sort: [
          {
            field:
              kind === 'recipe'
                ? 'minutes'
                : kind === 'movie'
                  ? 'year'
                  : 'dueAt',
            direction: 'asc',
          },
        ],
        ...(text.includes('group') ? { groupBy: 'category' } : {}),
      },
      presentation: {
        mode: text.includes('grid') ? 'grid' : 'list',
        itemRendererId: 'card',
        density: 'comfortable',
      },
    };
    operations.push(
      { op: 'createView', view },
      {
        op: 'setSurfaceLayout',
        surfaceId: 'home',
        nodes: [
          section('intro'),
          { ...section('personal', 'collection'), viewId: view.id },
          section('library'),
        ],
      },
    );
    const existing = request.configuration.navigation.filter(
      (p) => !(p.target === 'view' && p.label === view.title),
    );
    operations.push({
      op: 'setNavigationPlacements',
      placements: [
        ...existing,
        {
          target: 'view',
          id: view.id,
          label: view.title,
          placement:
            existing.filter((p) => p.placement === 'tab').length < 4
              ? 'tab'
              : 'overflow',
        },
      ],
    });
  } else if (/reorder|library first/.test(text))
    operations.push({
      op: 'setSurfaceLayout',
      surfaceId: 'home',
      nodes: [section('intro'), section('library'), section('featured')],
    });
  else
    return {
      kind: 'unsupported',
      message:
        'This demo understands the example requests, appearance changes, and “library first”. Connect your own planner for open-ended requests.',
    };
  return {
    kind: 'proposal',
    proposal: {
      requestId: request.requestId,
      baseRevision: request.baseRevision,
      registryRevision: request.registryRevision,
      summary: Object.keys(tokens).length
        ? 'Make your space easier to read with your preferred appearance.'
        : 'Bring your personal collection to the home screen and add a destination for it.',
      operations,
    },
  };
}
