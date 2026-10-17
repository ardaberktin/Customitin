import { dataPlanSchema, type DataPlan } from '../../schema/data-plan';
import {
  boundedJson,
  invariant,
  type ValueRule,
} from '../../schema/primitives';
import type { CapabilityRegistry } from '../../schema/registry';
import { expressionType } from './expression';

export function validateDataPlan(
  input: unknown,
  registry: CapabilityRegistry,
  surfaceId?: string,
) {
  boundedJson(input);
  const plan = dataPlanSchema.parse(input);
  const source = registry.sources.find((item) => item.id === plan.sourceId);
  invariant(source, 'Unknown data source');
  const sources = new Set([source.id]);
  const surface = surfaceId
    ? registry.surfaces.find((item) => item.id === surfaceId)
    : undefined;
  if (surfaceId)
    invariant(
      surface?.policy?.operations.includes('data'),
      'Data is unavailable on this surface',
    );
  const fields: Record<string, ValueRule> = Object.fromEntries(
    Object.entries(source.fields).map(([name, field]) => [
      name,
      { ...field, nullable: field.nullable || !field.required },
    ]),
  );
  const permitted = (id: string, field: string) =>
    !surfaceId || surface?.policy?.sourceFields[id]?.includes(field);
  for (const field of Object.keys(fields))
    if (!permitted(source.id, field)) delete fields[field];
  const aliases = new Set<string>();
  for (const join of plan.joins) {
    const relation = registry.relations.find(
      (item) => item.id === join.relationId && item.leftSourceId === source.id,
    );
    invariant(relation, 'Unknown or unavailable join relationship');
    const right = registry.sources.find(
      (item) => item.id === relation.rightSourceId,
    );
    invariant(
      right && !aliases.has(join.alias),
      'Invalid join source or duplicate alias',
    );
    aliases.add(join.alias);
    const leftKey = source.fields[relation.leftField],
      rightKey = right.fields[relation.rightField];
    invariant(
      leftKey && rightKey && leftKey.type === rightKey.type,
      'Join keys must have compatible types',
    );
    invariant(
      permitted(source.id, relation.leftField) &&
        permitted(right.id, relation.rightField),
      'Join keys are unavailable on this surface',
    );
    sources.add(right.id);
    for (const [name, field] of Object.entries(right.fields)) {
      if (!permitted(right.id, name)) continue;
      const key = `${join.alias}.${name}`;
      invariant(!fields[key], 'Join field collision');
      fields[key] = {
        ...field,
        nullable: field.nullable || !field.required || join.kind === 'left',
      };
    }
  }
  invariant(sources.size <= registry.limits.sources, 'Too many data sources');
  for (const id of sources) {
    if (surfaceId)
      invariant(
        surface?.policy?.sourceFields[id],
        'Source is unavailable on this surface',
      );
    if (plan.execution === 'local')
      invariant(
        registry.sources.find((item) => item.id === id)?.completeness ===
          'complete',
        'Local transformations require complete sources; use a remote adapter',
      );
  }
  invariant(
    Object.keys(plan.computed).length <= 20 &&
      Object.keys(plan.aggregates).length <= 20,
    'Too many computed fields',
  );
  for (const [name, expression] of Object.entries(plan.computed)) {
    invariant(!fields[name], 'Computed field shadows a source field');
    fields[name] = expressionType(expression, fields);
  }
  if (plan.filter)
    invariant(
      expressionType(plan.filter, fields).type === 'boolean',
      'Filter must produce a boolean',
    );
  const output = aggregateFields(plan, fields);
  for (const order of plan.sort)
    invariant(output[order.field], `Unknown sort field ${order.field}`);
  const selected: Record<string, ValueRule> = {};
  for (const name of plan.project) {
    invariant(
      output[name] && !selected[name],
      `Unknown or duplicate projection ${name}`,
    );
    selected[name] = output[name]!;
  }
  return { plan, fields: selected, sourceIds: [...sources] };
}

function aggregateFields(plan: DataPlan, fields: Record<string, ValueRule>) {
  if (!plan.groupBy.length && !Object.keys(plan.aggregates).length)
    return fields;
  const result: Record<string, ValueRule> = {};
  for (const key of plan.groupBy) {
    invariant(fields[key], `Unknown grouping field ${key}`);
    result[key] = fields[key]!;
  }
  for (const [key, aggregate] of Object.entries(plan.aggregates)) {
    invariant(!result[key], 'Aggregate field collision');
    if (aggregate.op !== 'count' || aggregate.field) {
      const field = aggregate.field && fields[aggregate.field];
      invariant(field, 'Aggregate field is missing');
      if (aggregate.op !== 'count')
        invariant(
          field.type === 'number',
          'Numeric aggregate requires a numeric field',
        );
    }
    result[key] = {
      type: 'number',
      required: true,
      nullable:
        aggregate.op !== 'count' &&
        (plan.groupBy.length === 0 ||
          !aggregate.field ||
          fields[aggregate.field]!.nullable ||
          !fields[aggregate.field]!.required),
    };
  }
  return result;
}
