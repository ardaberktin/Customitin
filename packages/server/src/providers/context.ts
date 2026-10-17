import type { CapabilityRegistry, PlannerRequest } from '@customitin/core';

/** Minimize model context separately from validating against the complete server manifest. */
export function planningContext(
  registry: CapabilityRegistry,
  request: PlannerRequest,
) {
  const ids =
    request.surfaceIds ?? (request.surfaceId ? [request.surfaceId] : []);
  const surfaces = registry.surfaces.filter((surface) =>
    ids.includes(surface.id),
  );
  const components = new Set(
    surfaces.flatMap((surface) => surface.allowedComponentIds),
  );
  const actions = new Set(
    surfaces.flatMap((surface) => surface.policy.actionIds),
  );
  const destinations = new Set(
    surfaces.flatMap((surface) => surface.policy.destinationIds),
  );
  const tokens = new Set(
    surfaces.flatMap((surface) => surface.policy.themeTokenIds),
  );
  const fields = new Map<string, Set<string>>();
  for (const surface of surfaces)
    for (const [id, names] of Object.entries(surface.policy.sourceFields)) {
      const allowed = fields.get(id) ?? new Set<string>();
      names.forEach((name) => allowed.add(name));
      fields.set(id, allowed);
    }
  const capabilities: CapabilityRegistry = {
    ...registry,
    surfaces,
    components: registry.components.filter((component) =>
      components.has(component.id),
    ),
    sources: registry.sources
      .filter((source) => fields.has(source.id))
      .map((source) => ({
        ...source,
        fields: Object.fromEntries(
          Object.entries(source.fields).filter(([name]) =>
            fields.get(source.id)!.has(name),
          ),
        ),
      })),
    actions: registry.actions.filter((action) => actions.has(action.id)),
    relations: registry.relations.filter(
      (relation) =>
        fields.get(relation.leftSourceId)?.has(relation.leftField) &&
        fields.get(relation.rightSourceId)?.has(relation.rightField),
    ),
    destinations: registry.destinations.filter((destination) =>
      destinations.has(destination.id),
    ),
    themeTokens: Object.fromEntries(
      Object.entries(registry.themeTokens).filter(([name]) => tokens.has(name)),
    ),
    defaultNavigation: registry.defaultNavigation.filter((item) =>
      destinations.has(item.id),
    ),
  };
  const configuration = {
    ...request.configuration,
    surfaces: Object.fromEntries(
      Object.entries(request.configuration.surfaces).filter(([id]) =>
        ids.includes(id),
      ),
    ),
    theme: Object.fromEntries(
      Object.entries(request.configuration.theme).filter(([name]) =>
        tokens.has(name),
      ),
    ),
    views: request.configuration.views.filter((view) =>
      fields.has(view.sourceId),
    ),
    dataViews: request.configuration.dataViews?.filter((view) =>
      fields.has(view.plan.sourceId),
    ),
    navigation: request.configuration.navigation.filter(
      (item) => item.target === 'destination' && destinations.has(item.id),
    ),
  };
  return { registry: capabilities, request: { ...request, configuration } };
}
