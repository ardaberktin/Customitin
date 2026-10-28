import {
  registrySchema,
  type CapabilityRegistry,
  type SourceDescriptor,
} from '../schema/registry';
import { invariant, type ValueRule } from '../schema/primitives';
import { compatibleField } from '../validation/bindings';

export type CollectionDescriptor = CapabilityRegistry['components'][number];
const choice = (values: string[]): ValueRule => ({
  type: 'string',
  required: false,
  nullable: false,
  values: ['', ...values],
});
const boolean: ValueRule = {
  type: 'boolean',
  required: false,
  nullable: false,
};

/** Opt-in, domain-independent presentation of a complete source through an existing record component. */
export function createCollectionDescriptor(
  item: CollectionDescriptor,
  source: SourceDescriptor,
): CollectionDescriptor {
  const inputs = Object.entries(item.dataInputs ?? {});
  invariant(
    item.kind === 'host' &&
      inputs.length === 1 &&
      inputs[0]![1].cardinality === 'one',
    'SDK collections require a host component with one record input',
  );
  invariant(
    !Object.values(item.props).some((rule) => rule.required),
    'Supply defaults for required card props before enabling its collection',
  );
  invariant(
    !Object.keys(item.events ?? {}).length && !item.collection,
    'SDK collections require a card with host-owned interactions',
  );
  invariant(
    source.completeness === 'complete',
    'SDK collections require a complete source',
  );
  invariant(source.supportsCount, 'SDK collections require count permission');
  invariant(
    !item.sourceIds || item.sourceIds.includes(source.id),
    'The card does not allow this collection source',
  );
  const [input, data] = inputs[0]!;
  const fields = Object.keys(data.fields);
  invariant(
    fields.length > 0 && fields.length <= 49,
    'SDK collections support 1–49 card fields',
  );
  for (const [field, rule] of Object.entries(data.fields))
    invariant(
      source.fields[field] && compatibleField(source.fields[field]!, rule),
      `Collection source is incompatible with card field ${field}`,
    );
  return registrySchema.shape.components.element.parse({
    id: `${item.id}.collection`,
    title:
      `SDK collection of ${item.title}: built-in count, grouping, filters, sorting and grid; reuses host cards`.slice(
        0,
        120,
      ),
    kind: 'host',
    acceptsChildren: false,
    collection: { itemComponentId: item.id, input, sourceId: source.id },
    sourceIds: [source.id],
    dataInputs: { items: { ...data, cardinality: 'many', required: true } },
    props: {
      title: { type: 'string' },
      groupBy: choice(
        source.supportsGrouping
          ? fields.filter((f) => source.fields[f]!.groupable)
          : [],
      ),
      filterBy: choice(
        fields.filter((f) => source.fields[f]!.filterOps.includes('eq')),
      ),
      sortBy: choice(fields.filter((f) => source.fields[f]!.sortable)),
      sortDirection: { type: 'string', values: ['asc', 'desc'] },
      sortLabel: { type: 'string' },
      columns: { type: 'number', values: [1, 2, 3, 4] },
      showCount: boolean,
      showFilters: boolean,
      showSort: boolean,
      expanded: boolean,
    },
    provenance: {
      version: 1,
      status: 'developer-reviewed',
      evidence: `Opt-in SDK collection of ${item.id} from ${source.id}`,
    },
  });
}
