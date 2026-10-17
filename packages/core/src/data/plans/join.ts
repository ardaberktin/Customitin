import type { CapabilityRegistry } from '../../schema/registry';
import type { DataPlan } from '../../schema/data-plan';
import { invariant } from '../../schema/primitives';
import type { Row } from '../source';

export interface KeyedRow {
  row: Row;
  key: string;
}
export function joinRows(
  rows: KeyedRow[],
  loaded: Map<string, Row[]>,
  plan: DataPlan,
  registry: CapabilityRegistry,
  maxRows: number,
  tick: () => void,
) {
  const source = registry.sources.find((item) => item.id === plan.sourceId)!;
  for (const join of plan.joins) {
    const relation = registry.relations.find(
      (item) => item.id === join.relationId,
    )!;
    const right = registry.sources.find(
      (item) => item.id === relation.rightSourceId,
    )!;
    const indexed = new Map<string, Row[]>();
    for (const row of loaded.get(right.id)!) {
      tick();
      const value = row[relation.rightField];
      if (value == null) continue;
      const key = JSON.stringify(value),
        entries = indexed.get(key) ?? [];
      if (relation.cardinality !== 'one-to-many')
        invariant(
          entries.length === 0,
          'Join cardinality differs from the approved relationship',
        );
      entries.push(row);
      indexed.set(key, entries);
    }
    const seen = new Map<string, string>();
    const next: KeyedRow[] = [];
    for (const item of rows) {
      tick();
      const key = item.row[relation.leftField];
      if (relation.cardinality !== 'many-to-one' && key != null) {
        const identity = JSON.stringify(key);
        // Earlier joins may repeat a base row, but not a different row with the same unique key.
        const unique = JSON.stringify(item.row[source.idField]);
        invariant(
          !seen.has(identity) || seen.get(identity) === unique,
          'Join left key is not unique',
        );
        seen.set(identity, unique);
      }
      const matches: (Row | null)[] =
        key == null ? [] : [...(indexed.get(JSON.stringify(key)) ?? [])];
      if (!matches.length && join.kind === 'left') matches.push(null);
      for (const match of matches) {
        tick();
        invariant(next.length < maxRows, 'Join result exceeds its row budget');
        const row: Row = { ...item.row };
        for (const name of Object.keys(right.fields))
          row[`${join.alias}.${name}`] = match?.[name] ?? null;
        next.push({
          row,
          key: JSON.stringify([
            item.key,
            join.alias,
            match?.[right.idField] ?? null,
          ]),
        });
      }
    }
    rows = next;
  }
  return rows;
}
