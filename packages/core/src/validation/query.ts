import {
  querySchema,
  type SavedView,
  type ValidatedQuery,
} from '../schema/configuration';
import { invariant } from '../schema/primitives';
import type { CapabilityRegistry, SourceDescriptor } from '../schema/registry';
import { validateValue } from './values';

export function validateQuery(
  input: unknown,
  source: SourceDescriptor,
): ValidatedQuery {
  const query = querySchema.parse(input);
  invariant(
    source.completeness !== 'partial' ||
      (query.filters.length === 0 && query.sort.length === 0 && !query.groupBy),
    'This collection is only partially loaded; filtering and sorting are unavailable',
  );
  for (const filter of query.filters) {
    const field = source.fields[filter.field];
    invariant(field, `Unknown field ${filter.field}`);
    invariant(
      field.filterOps.includes(filter.op),
      `Filtering ${filter.field} with ${filter.op} is unavailable`,
    );
    invariant(
      filter.op === 'in'
        ? Array.isArray(filter.value)
        : !Array.isArray(filter.value),
      'Invalid filter value',
    );
    for (const value of Array.isArray(filter.value)
      ? filter.value
      : [filter.value])
      validateValue(value, field, filter.field);
    invariant(
      !['lt', 'lte', 'gt', 'gte'].includes(filter.op) ||
        (field.type !== 'boolean' && filter.value !== null),
      'Ordered comparisons require a number or string',
    );
    invariant(
      filter.op !== 'contains' || field.type === 'string',
      'Contains requires text',
    );
  }
  for (const order of query.sort)
    invariant(
      source.fields[order.field]?.sortable,
      `Sorting ${order.field} is unavailable`,
    );
  if (query.groupBy)
    invariant(
      source.supportsGrouping &&
        source.completeness === 'complete' &&
        source.fields[query.groupBy]?.groupable,
      'Complete grouping is unavailable',
    );
  return query;
}
export function validateView(
  view: SavedView,
  registry: CapabilityRegistry,
): void {
  const source = registry.sources.find((s) => s.id === view.sourceId);
  invariant(source, `Unknown collection ${view.sourceId}`);
  validateQuery(view.query, source);
  const renderer = registry.components.find(
    (c) => c.id === view.presentation.itemRendererId && c.kind === 'item',
  );
  invariant(renderer, 'Unknown item renderer');
  invariant(
    !renderer.sourceIds || renderer.sourceIds.includes(view.sourceId),
    'Item renderer does not support this collection',
  );
}
