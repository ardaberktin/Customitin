import type { CapabilityRegistry } from '../schema/registry';
import type { LayoutNode, Profile } from '../schema/configuration';
import { invariant } from '../schema/primitives';
import { createCollectionDescriptor } from './descriptor';

export function validateCollectionDescriptors(registry: CapabilityRegistry) {
  for (const component of registry.components) {
    if (!component.collection) continue;
    const item = registry.components.find(
      (c) => c.id === component.collection!.itemComponentId,
    );
    const source = registry.sources.find(
      (s) => s.id === component.collection!.sourceId,
    );
    invariant(item && source, 'Collection card or source is missing');
    const expected = createCollectionDescriptor(item, source);
    for (const key of [
      'id',
      'kind',
      'props',
      'dataInputs',
      'collection',
      'sourceIds',
      'acceptsChildren',
    ] as const)
      invariant(
        JSON.stringify(component[key]) === JSON.stringify(expected[key]),
        `Invalid SDK collection contract: ${key}`,
      );
  }
}

export function validateCollectionBinding(
  node: LayoutNode,
  profile: Profile,
  registry: CapabilityRegistry,
  surfaceId: string,
) {
  const component = registry.components.find((c) => c.id === node.componentId)!;
  if (!component.collection) return;
  const surface = registry.surfaces.find((s) => s.id === surfaceId)!;
  invariant(
    surface.allowedComponentIds.includes(component.collection.itemComponentId),
    'The collection card must also be approved on this surface',
  );
  const binding = node.data?.items;
  const view = profile.dataViews?.find((v) => v.id === binding?.viewId);
  invariant(binding && view, 'Collection requires an items data view');
  const plan = view.plan;
  invariant(
    plan.sourceId === component.collection.sourceId &&
      plan.execution === 'local' &&
      !plan.joins.length &&
      !plan.groupBy.length &&
      !Object.keys(plan.computed).length &&
      !Object.keys(plan.aggregates).length,
    'SDK collections require a flat complete local view',
  );
  for (const [field, mapped] of Object.entries(binding.mapping))
    invariant(
      field === mapped,
      'SDK collections require identity field mappings',
    );
  for (const prop of ['groupBy', 'filterBy', 'sortBy']) {
    const field = node.props[prop];
    invariant(
      !field || (typeof field === 'string' && binding.mapping[field] === field),
      `Collection ${prop} field must be bound`,
    );
  }
}
