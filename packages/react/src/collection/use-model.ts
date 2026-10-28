import { useState, type ComponentType } from 'react';
import { validateValues, type CollectionDescriptor } from '@customitin/core';
import type { HostComponentProps } from '../provider/context';
import { categories, collectionGroups, fieldsFor, fieldLabel } from './model';

export interface CollectionProps extends HostComponentProps {
  descriptor: CollectionDescriptor;
  Item: ComponentType<HostComponentProps>;
}
export function useCollectionModel({
  values,
  data,
  descriptor,
}: CollectionProps) {
  validateValues(values, descriptor.props, descriptor.title);
  const text = (key: string) =>
    typeof values[key] === 'string' ? (values[key] as string) : '';
  const [selected, setSelected] = useState('');
  const [sortBy, setSortBy] = useState(text('sortBy'));
  const [direction, setDirection] = useState<'asc' | 'desc'>(
    values.sortDirection === 'asc' ? 'asc' : 'desc',
  );
  const [columns, setColumns] = useState(
    typeof values.columns === 'number' ? values.columns : 3,
  );
  const [expanded, setExpanded] = useState(values.expanded !== false);
  const result = data?.items;
  const complete = !!result?.complete && !result.nextCursor;
  const filterBy = text('filterBy');
  const groupBy = text('groupBy');
  const display = complete
    ? collectionGroups(result, descriptor, {
        groupBy,
        filterBy,
        selected,
        sortBy,
        direction,
      })
    : { groups: [], visibleCount: 0, totalCount: 0 };
  return {
    ...display,
    complete,
    result,
    title: text('title'),
    filterBy,
    selected,
    setSelected,
    options: complete ? categories(result, descriptor, filterBy) : [],
    sorts: fieldsFor(descriptor, 'sortBy').filter((field) =>
      result?.rows.every((row) => field in row),
    ),
    sortBy,
    setSortBy,
    direction,
    setDirection,
    columns,
    setColumns,
    expanded,
    setExpanded,
    label: (field: string) =>
      field === text('sortBy') && text('sortLabel')
        ? text('sortLabel')
        : fieldLabel(field),
    showCount: values.showCount !== false,
    showFilters: values.showFilters !== false && !!filterBy,
    showSort: values.showSort !== false,
  };
}
