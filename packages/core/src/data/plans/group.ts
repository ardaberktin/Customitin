import type { DataPlan } from '../../schema/data-plan';
import type { Row } from '../source';
import { invariant } from '../../schema/primitives';

export function aggregateRows(
  rows: { row: Row; key: string }[],
  plan: DataPlan,
  tick: () => void,
) {
  if (!plan.groupBy.length && !Object.keys(plan.aggregates).length) return rows;
  const groups = new Map<string, Row[]>();
  if (!plan.groupBy.length) groups.set('[]', []);
  for (const { row } of rows) {
    tick();
    const key = JSON.stringify(plan.groupBy.map((field) => row[field] ?? null));
    const group = groups.get(key) ?? [];
    group.push(row);
    groups.set(key, group);
  }
  return [...groups].map(([key, group]) => {
    const row: Row = Object.fromEntries(
      plan.groupBy.map((field) => [field, group[0]?.[field] ?? null]),
    );
    for (const [name, aggregate] of Object.entries(plan.aggregates)) {
      tick();
      const values = group
        .map((item) => {
          tick();
          return aggregate.field ? item[aggregate.field] : 1;
        })
        .filter((value) => value != null);
      if (aggregate.op === 'count') {
        row[name] = values.length;
        continue;
      }
      if (!values.length) {
        row[name] = null;
        continue;
      }
      let total = 0,
        min = Infinity,
        max = -Infinity;
      for (const value of values) {
        tick();
        invariant(
          typeof value === 'number',
          'Numeric aggregate received a nonnumeric value',
        );
        total += value;
        min = Math.min(min, value);
        max = Math.max(max, value);
      }
      const result =
        aggregate.op === 'sum'
          ? total
          : aggregate.op === 'average'
            ? total / values.length
            : aggregate.op === 'min'
              ? min
              : max;
      invariant(
        Number.isFinite(result),
        'Aggregate produced a non-finite number',
      );
      row[name] = result;
    }
    return { row, key: `group:${key}` };
  });
}
