import { throwIfAborted } from '../schema/primitives';
import type { Scalar } from '../schema/primitives';
import { invariant } from '../schema/primitives';
import type { SourceDescriptor } from '../schema/registry';
import type { ValidatedQuery } from '../schema/configuration';
import { validateQuery } from '../validation/query';
import { validateValues } from '../validation/values';

export type Row = Record<string, Scalar>;
export interface QueryContext {
  signal: AbortSignal;
  scope: string;
  session?: unknown;
}
export interface QueryPage {
  items: Row[];
  nextCursor: string | null;
  totalCount?: number;
  complete: boolean;
}
export interface SourceAdapter {
  descriptor: SourceDescriptor;
  query(
    query: ValidatedQuery,
    context: QueryContext,
    cursor?: string,
  ): Promise<QueryPage>;
  subscribeInvalidation?(onChange: () => void): () => void;
}
export function filterRows(rows: Row[], query: ValidatedQuery): Row[] {
  const result = rows.filter((row) =>
    query.filters.every(({ field, op, value }) => {
      const actual = row[field];
      switch (op) {
        case 'eq':
          return actual === value;
        case 'neq':
          return actual !== value;
        case 'in':
          return Array.isArray(value) && value.includes(actual ?? null);
        case 'contains':
          return (
            typeof actual === 'string' &&
            typeof value === 'string' &&
            actual.toLocaleLowerCase().includes(value.toLocaleLowerCase())
          );
        default: {
          if (
            actual === null ||
            actual === undefined ||
            value === null ||
            Array.isArray(value)
          )
            return false;
          switch (op) {
            case 'lt':
              return actual < value;
            case 'lte':
              return actual <= value;
            case 'gt':
              return actual > value;
            case 'gte':
              return actual >= value;
          }
        }
      }
    }),
  );
  return result.sort((a, b) => {
    for (const { field, direction } of query.sort) {
      const left = a[field];
      const right = b[field];
      const delta =
        left === right
          ? 0
          : left == null
            ? 1
            : right == null
              ? -1
              : left < right
                ? -1
                : 1;
      if (delta) return direction === 'asc' ? delta : -delta;
    }
    return 0;
  });
}
export function validatePage(
  page: QueryPage,
  source: SourceDescriptor,
): QueryPage {
  invariant(
    Array.isArray(page.items) && page.items.length <= source.maxRows,
    'Collection exceeded its row budget',
  );
  invariant(
    page.nextCursor === null ||
      (typeof page.nextCursor === 'string' && page.nextCursor.length <= 500),
    'Invalid cursor',
  );
  invariant(
    typeof page.complete === 'boolean' &&
      (!page.complete || page.nextCursor === null),
    'Invalid completeness',
  );
  invariant(
    source.completeness !== 'complete' ||
      (page.complete && page.nextCursor === null),
    'A complete source returned partial data',
  );
  invariant(
    source.completeness !== 'partial' ||
      (!page.complete && page.totalCount === undefined),
    'A partial cache cannot claim completeness',
  );
  const ids = new Set<Scalar>();
  for (const row of page.items) {
    validateValues(row, source.fields, source.title, true, false);
    const id = row[source.idField];
    invariant(
      typeof id === 'string' || typeof id === 'number',
      'Missing stable row identity',
    );
    invariant(!ids.has(id), 'Duplicate row identity');
    ids.add(id);
  }
  if (page.totalCount !== undefined)
    invariant(
      source.supportsCount &&
        Number.isInteger(page.totalCount) &&
        page.totalCount >= page.items.length,
      'Invalid collection count',
    );
  return page;
}
export function createLocalSource(
  descriptor: SourceDescriptor,
  load: (context: QueryContext) => Promise<Row[]>,
  subscribeInvalidation?: SourceAdapter['subscribeInvalidation'],
): SourceAdapter {
  invariant(
    descriptor.completeness === 'complete',
    'Local filtering requires a complete repository',
  );
  return {
    descriptor,
    subscribeInvalidation,
    async query(input, context) {
      const query = validateQuery(input, descriptor);
      throwIfAborted(context.signal);
      const rows = await load(context);
      throwIfAborted(context.signal);
      validatePage(
        {
          items: rows,
          complete: true,
          nextCursor: null,
          ...(descriptor.supportsCount ? { totalCount: rows.length } : {}),
        },
        descriptor,
      );
      const items = filterRows(rows, query);
      return {
        items,
        nextCursor: null,
        complete: true,
        ...(descriptor.supportsCount ? { totalCount: items.length } : {}),
      };
    },
  };
}
