import type { ReactNode } from 'react';
import {
  validateValues,
  type DataResult,
  type LayoutNode,
} from '@customitin/core';
import { useCustomization } from '../provider/context';
import { useDataView } from '../hooks/use-data-view';
import type { StatusRenderer } from './types';
export function Input({
  node,
  surfaceId,
  names,
  index,
  data,
  children,
  status,
}: {
  node: LayoutNode;
  surfaceId: string;
  names: string[];
  index: number;
  data: Record<string, DataResult>;
  children: (data: Record<string, DataResult>) => ReactNode;
  status?: StatusRenderer;
}) {
  const name = names[index]!;
  const binding = node.data![name]!;
  const result = useDataView(binding.viewId, surfaceId);
  const { registry } = useCustomization();
  if (result.code || !result.data)
    return (
      status?.({
        code: result.code ?? 'DATA_LOADING',
        surfaceId,
        nodeId: node.id,
      }) ?? null
    );
  const descriptor = registry.components.find(
    (item) => item.id === node.componentId,
  )?.dataInputs?.[name];
  if (descriptor?.cardinality === 'one' && result.data.rows.length > 1)
    return (
      status?.({ code: 'DATA_CARDINALITY', surfaceId, nodeId: node.id }) ?? null
    );
  if (
    descriptor?.cardinality === 'one' &&
    descriptor.required &&
    result.data.rows.length === 0
  )
    return status?.({ code: 'DATA_EMPTY', surfaceId, nodeId: node.id }) ?? null;
  const mapped = {
    ...data,
    [name]: {
      ...result.data,
      rows: result.data.rows.map((row) =>
        Object.fromEntries(
          Object.entries(binding.mapping).flatMap(([field, source]) => {
            const rule = descriptor?.fields[field];
            const value = row[source] ?? null;
            return value === null && rule && !rule.required && !rule.nullable
              ? []
              : [[field, value]];
          }),
        ),
      ),
    },
  };
  if (descriptor)
    for (const row of mapped[name]!.rows)
      validateValues(row, descriptor.fields, 'Component input', true, false);
  return index + 1 < names.length ? (
    <Input
      {...{ node, surfaceId, names, data: mapped, status, children }}
      index={index + 1}
    />
  ) : (
    children(mapped)
  );
}
