import type { CapabilityRegistry } from '../../schema/registry';
import { invariant, throwIfAborted } from '../../schema/primitives';
import type { DataPlan } from '../../schema/data-plan';
import {
  validatePage,
  type Row,
  type SourceAdapter,
  type QueryContext,
} from '../source';
import { validateDataPlan } from './validate';
import { evaluateExpression } from './expression';
import { aggregateRows } from './group';
import { joinRows } from './join';
import { validateDataResult, type DataResult } from './result';
export type { DataResult } from './result';

export interface RemoteDataContext extends QueryContext {
  appId: string;
  registryRevision: string;
  surfaceId: string;
}
export interface RemoteDataAdapter {
  execute(
    plan: DataPlan,
    context: RemoteDataContext,
    cursor?: string,
  ): Promise<DataResult>;
}
export interface DataExecutionOptions {
  registry: CapabilityRegistry;
  sources: Record<string, SourceAdapter>;
  remote?: RemoteDataAdapter;
  maxRows?: number;
  maxOperations?: number;
}

export async function executeDataPlan(
  input: DataPlan,
  options: DataExecutionOptions,
  context: QueryContext,
  surfaceId: string,
  cursor?: string,
): Promise<DataResult> {
  const { plan, fields, sourceIds } = validateDataPlan(
    input,
    options.registry,
    surfaceId,
  );
  const maxRows = Math.min(options.maxRows ?? 10000, 10000);
  throwIfAborted(context.signal);
  let result: DataResult;
  if (plan.execution === 'remote') {
    invariant(options.remote, 'A remote data adapter is required');
    result = await options.remote.execute(
      plan,
      {
        ...context,
        appId: options.registry.appId,
        registryRevision: options.registry.revision,
        surfaceId,
      },
      cursor,
    );
  } else {
    invariant(!cursor, 'Local results are not paginated');
    let operations = 0;
    const tick = () => {
      throwIfAborted(context.signal);
      invariant(
        ++operations <= Math.min(options.maxOperations ?? 100000, 1000000),
        'Data operation budget exceeded',
      );
    };
    const loaded = new Map<string, Row[]>();
    for (const sourceId of sourceIds) {
      const adapter = options.sources[sourceId];
      const descriptor = options.registry.sources.find(
        (item) => item.id === sourceId,
      )!;
      invariant(
        adapter &&
          JSON.stringify(adapter.descriptor) === JSON.stringify(descriptor),
        'Source adapter does not match the approved descriptor',
      );
      const page = validatePage(
        await adapter.query({ filters: [], sort: [] }, context),
        descriptor,
      );
      throwIfAborted(context.signal);
      invariant(
        page.complete &&
          page.nextCursor === null &&
          page.items.length <= maxRows,
        'Local data is incomplete or exceeds its budget',
      );
      loaded.set(sourceId, page.items);
    }
    const source = options.registry.sources.find(
      (item) => item.id === plan.sourceId,
    )!;
    let rows = loaded.get(source.id)!.map((row) => ({
      row: { ...row },
      key: JSON.stringify([source.id, row[source.idField]]),
    }));
    rows = joinRows(rows, loaded, plan, options.registry, maxRows, tick);
    for (const { row } of rows)
      for (const [name, expression] of Object.entries(plan.computed)) {
        tick();
        row[name] = evaluateExpression(expression, row, tick);
      }
    if (plan.filter)
      rows = rows.filter(({ row }) => {
        tick();
        return evaluateExpression(plan.filter!, row, tick) === true;
      });
    rows = aggregateRows(rows, plan, tick);
    rows.sort((left, right) => {
      tick();
      for (const order of plan.sort) {
        const a = left.row[order.field] ?? null,
          b = right.row[order.field] ?? null;
        const comparison =
          a === b ? 0 : a === null ? 1 : b === null ? -1 : a < b ? -1 : 1;
        if (comparison)
          return comparison * (order.direction === 'asc' ? 1 : -1);
      }
      return left.key === right.key ? 0 : left.key < right.key ? -1 : 1;
    });
    result = {
      rows: rows.map(({ row }) =>
        Object.fromEntries(
          plan.project.map((name) => [name, row[name] ?? null]),
        ),
      ),
      keys: rows.map((item) => item.key),
      complete: true,
      nextCursor: null,
    };
  }
  throwIfAborted(context.signal);
  return validateDataResult(result, fields, maxRows, cursor);
}
