import {
  invariant,
  type CollectionDescriptor,
  type DataResult,
  type Scalar,
} from '@customitin/core';
import { collectionEnglish as en } from './en';

export const fieldLabel = (name: string) =>
  name
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]/g, ' ')
    .replace(/^./, (c) => c.toUpperCase());
export const valueKey = (value: Scalar) => JSON.stringify(value);
export const valueLabel = (value: Scalar) =>
  value === null ? en.missing : String(value);
export const categoryColor = (index: number) =>
  ['#e8bd70', '#6dbfa6', '#87afd9', '#b69add', '#dd919c', '#70bdc9'][
    index % 6
  ]!;
export const fieldsFor = (descriptor: CollectionDescriptor, prop: string) =>
  (descriptor.props[prop]?.values ?? []).filter(
    (v): v is string => typeof v === 'string' && !!v,
  );

export function categories(
  data: DataResult,
  descriptor: CollectionDescriptor,
  field: string,
): Scalar[] {
  if (!field) return [];
  const values = new Map<string, Scalar>();
  for (const value of descriptor.dataInputs?.items?.fields[field]?.values ?? [])
    values.set(valueKey(value), value);
  for (const row of data.rows) {
    const value = row[field] ?? null;
    values.set(valueKey(value), value);
  }
  invariant(
    values.size <= 100,
    'SDK collections support at most 100 categories',
  );
  return [...values.values()];
}

export function collectionGroups(
  data: DataResult,
  descriptor: CollectionDescriptor,
  settings: {
    groupBy: string;
    filterBy: string;
    selected: string;
    sortBy: string;
    direction: 'asc' | 'desc';
  },
) {
  invariant(data.complete && !data.nextCursor, en.incomplete);
  const { groupBy, filterBy, selected, sortBy, direction } = settings;
  const rows = data.rows
    .map((row, index) => ({ row, key: data.keys[index]! }))
    .filter(
      ({ row }) =>
        !filterBy ||
        selected === '' ||
        valueKey(row[filterBy] ?? null) === selected,
    );
  if (sortBy)
    rows.sort((a, b) => {
      const x = a.row[sortBy] ?? null,
        y = b.row[sortBy] ?? null;
      if (x === null || y === null) return x === y ? 0 : x === null ? 1 : -1;
      const result =
        typeof x === 'number' && typeof y === 'number'
          ? x - y
          : String(x).localeCompare(String(y));
      return direction === 'asc' ? result : -result;
    });
  const values = groupBy ? categories(data, descriptor, groupBy) : [null];
  const groups = values
    .map((value, index) => ({
      key: valueKey(value),
      label: groupBy ? valueLabel(value) : '',
      color: categoryColor(index),
      entries: groupBy
        ? rows.filter(
            ({ row }) => valueKey(row[groupBy] ?? null) === valueKey(value),
          )
        : rows,
    }))
    .filter((group) => group.entries.length);
  return { groups, visibleCount: rows.length, totalCount: data.rows.length };
}
