import {
  createLocalSource,
  throwIfAborted,
  validatePage,
  validateQuery,
  type QueryContext,
  type QueryPage,
  type Row,
  type SourceAdapter,
  type SourceDescriptor,
  type ValidatedQuery,
} from '@customitin/core';
import { abortable } from '../provider/cancellation';

/** Explicit remote contract: the host applies authorization and query BEFORE pagination. */
export function createQuerySource(
  descriptor: SourceDescriptor,
  load: (
    query: ValidatedQuery,
    context: QueryContext,
    cursor?: string,
  ) => Promise<QueryPage>,
  subscribeInvalidation?: SourceAdapter['subscribeInvalidation'],
): SourceAdapter {
  if (descriptor.completeness !== 'paginated')
    throw new Error('Query sources require a paginated descriptor');
  return {
    descriptor,
    subscribeInvalidation,
    async query(input, context, cursor) {
      throwIfAborted(context.signal);
      const query = validateQuery(input, descriptor);
      const result = await abortable(
        load(query, context, cursor),
        context.signal,
      );
      throwIfAborted(context.signal);
      return validatePage(result, descriptor);
    },
  };
}
/** Project only approved fields; optional scalar properties normalize to null. */
export function projectRows(
  rows: readonly object[],
  descriptor: SourceDescriptor,
): Row[] {
  return rows.map(
    (row) =>
      Object.fromEntries(
        Object.keys(descriptor.fields).map((name) => [
          name,
          (row as Record<string, unknown>)[name] ?? null,
        ]),
      ) as Row,
  );
}
export function createCachedSource(
  descriptor: SourceDescriptor,
  load: (context: QueryContext) => Promise<readonly object[]>,
  subscribeInvalidation?: SourceAdapter['subscribeInvalidation'],
): SourceAdapter {
  return createLocalSource(
    descriptor,
    async (context) => {
      throwIfAborted(context.signal);
      const rows = await abortable(load(context), context.signal);
      return projectRows(rows, descriptor);
    },
    subscribeInvalidation,
  );
}
interface CacheEvent {
  type: string;
  query: { queryKey: readonly unknown[] };
  action?: { type: string; manual?: boolean };
}
interface QueryCacheLike {
  subscribe(listener: (event: CacheEvent) => void): () => void;
}
/** Structural bridge: no TanStack dependency is bundled into the SDK. */
export function queryInvalidation(
  cache: QueryCacheLike,
  key: () => readonly unknown[],
): NonNullable<SourceAdapter['subscribeInvalidation']> {
  return (listener) =>
    cache.subscribe((event) => {
      if (
        event.type !== 'updated' ||
        !event.action ||
        !(
          event.action.type === 'invalidate' ||
          (event.action.type === 'success' && event.action.manual)
        )
      )
        return;
      const expected = key();
      if (
        expected.every(
          (part, index) =>
            JSON.stringify(part) ===
            JSON.stringify(event.query.queryKey[index]),
        )
      )
        listener();
    });
}
