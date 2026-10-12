import {
  sourceDescriptorSchema,
  type SourceDescriptor,
} from '@customitin/core';
import type {
  ResolvedIntegration,
  SelectedSource,
} from '../configuration/resolve';

export function sourceDescriptor(
  { symbol, options }: SelectedSource,
  integration: ResolvedIntegration,
): SourceDescriptor {
  const remote = symbol.adapter === 'query-page';
  const selected = options.fields ?? Object.keys(symbol.fields);
  const fields = Object.fromEntries(
    selected.map((name) => {
      const rule = symbol.fields[name];
      if (!rule) throw new Error(`${symbol.selector}: unknown field ${name}`);
      return [
        name,
        {
          ...rule,
          filterOps:
            options.filters?.[name] ??
            (remote
              ? []
              : rule.type === 'boolean'
                ? ['eq', 'neq']
                : rule.type === 'number'
                  ? ['eq', 'neq', 'lt', 'lte', 'gt', 'gte']
                  : ['eq', 'neq', 'contains', 'in']),
          sortable: options.sortable
            ? options.sortable.includes(name)
            : !remote,
          groupable: options.groupable
            ? options.groupable.includes(name)
            : !remote,
        },
      ];
    }),
  );
  for (const field of [
    ...Object.keys(options.filters ?? {}),
    ...(options.sortable ?? []),
    ...(options.groupable ?? []),
  ])
    if (!fields[field])
      throw new Error(
        `${symbol.selector}: query option references unexposed field ${field}`,
      );
  const idField = options.idField ?? 'id';
  const titleField =
    options.titleField ??
    ['title', 'name', 'label'].find((f) => fields[f]) ??
    idField;
  for (const name of [idField, titleField, options.subtitleField].filter(
    (f): f is string => !!f,
  ))
    if (!fields[name])
      throw new Error(
        `${symbol.selector}: display field ${name} is not exposed`,
      );
  const destination = integration.routes.find(({ route }) =>
    [route.id, route.selector].includes(options.detailDestination ?? ''),
  )?.route;
  if (options.detailDestination && !destination)
    throw new Error(
      `${symbol.selector}: detailDestination must refer to an enabled route`,
    );
  const detailParam =
    options.detailParam ??
    (destination && Object.keys(destination.params).length === 1
      ? Object.keys(destination.params)[0]
      : undefined);
  if (
    destination &&
    (!detailParam ||
      Object.keys(destination.params).length !== 1 ||
      !destination.params[detailParam])
  )
    throw new Error(
      `${symbol.selector}: automatic detail navigation needs exactly one route parameter`,
    );
  if (
    destination &&
    detailParam &&
    destination.params[detailParam]?.type !== fields[idField]?.type
  )
    throw new Error(
      `${symbol.selector}: detail parameter and idField must have the same scalar type; supply a custom binding for conversion`,
    );
  return sourceDescriptorSchema.parse({
    id: symbol.id,
    title: options.title ?? symbol.name,
    provenance: {
      version: 1,
      evidence: `${symbol.file}:${symbol.line}`,
      status: 'proposed',
    },
    completeness: remote ? 'paginated' : 'complete',
    fields,
    idField,
    titleField,
    ...(options.subtitleField ? { subtitleField: options.subtitleField } : {}),
    maxRows: options.maxRows ?? 500,
    pageSize: options.pageSize ?? 50,
    supportsCount: options.supportsCount ?? true,
    supportsGrouping: !remote && Object.values(fields).some((f) => f.groupable),
    ...(destination
      ? { detailDestinationId: destination.id, detailParam }
      : {}),
  });
}
