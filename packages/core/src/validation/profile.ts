import {
  profileSchema,
  type LayoutNode,
  type Profile,
  type Placement,
} from '../schema/configuration';
import { boundedJson, invariant } from '../schema/primitives';
import { registrySchema, type CapabilityRegistry } from '../schema/registry';
import { validateView } from './query';
import { validateValues } from './values';

export function validateDestination(
  id: string,
  params: Placement['params'],
  registry: CapabilityRegistry,
  placement: 'shortcut' | 'tab' | 'overflow',
): void {
  const destination = registry.destinations.find((d) => d.id === id);
  invariant(destination, `Unknown destination ${id}`);
  invariant(
    destination.placements.includes(placement),
    'This destination is unavailable here',
  );
  validateValues(params ?? {}, destination.params, destination.title);
}
export function validateLayout(
  nodes: LayoutNode[],
  surfaceId: string,
  profile: Profile,
  registry: CapabilityRegistry,
): Set<string> {
  const surface = registry.surfaces.find((s) => s.id === surfaceId);
  invariant(surface, `Unknown surface ${surfaceId}`);
  if (surface.kind === 'screen')
    for (const node of nodes)
      invariant(
        surface.defaultLayout.some(
          (original) => JSON.stringify(original) === JSON.stringify(node),
        ),
        'Existing screen sections may only be reordered or hidden',
      );
  const ids = new Set<string>();
  const sources = new Set<string>();
  function visit(node: LayoutNode, depth: number): void {
    invariant(
      depth <= registry.limits.depth && ids.size < registry.limits.nodes,
      'Layout is too complex',
    );
    invariant(!ids.has(node.id), 'Duplicate section identity');
    ids.add(node.id);
    const component = registry.components.find(
      (c) => c.id === node.componentId,
    );
    invariant(
      component && surface?.allowedComponentIds.includes(component.id),
      'Unknown or unavailable component',
    );
    invariant(component.kind !== 'item', 'Item renderers require a collection');
    validateValues(node.props, component.props, component.title);
    invariant(
      component.acceptsChildren || node.children.length === 0,
      'This component cannot contain sections',
    );
    if (component.kind === 'collection' || component.kind === 'summary') {
      const view = profile.views.find((v) => v.id === node.viewId);
      invariant(view, 'Collection requires an existing saved view');
      sources.add(view.sourceId);
      if (component.kind === 'summary')
        invariant(
          registry.sources.find((s) => s.id === view.sourceId)?.supportsCount,
          'A complete count is unavailable',
        );
    } else
      invariant(
        !node.viewId,
        'Only collections and summaries accept saved views',
      );
    if (component.kind === 'shortcut') {
      invariant(node.destinationId, 'Shortcut requires a destination');
      validateDestination(
        node.destinationId,
        node.params,
        registry,
        'shortcut',
      );
    } else
      invariant(
        !node.destinationId && !node.params,
        'Only shortcuts accept destinations',
      );
    node.children.forEach((child) => visit(child, depth + 1));
  }
  nodes.forEach((node) => visit(node, 1));
  for (const id of surface.requiredNodeIds) {
    invariant(ids.has(id), 'Required controls must remain available');
    const find = (items: LayoutNode[]): LayoutNode | undefined => {
      for (const item of items) {
        if (item.id === id) return item;
        const nested = find(item.children);
        if (nested) return nested;
      }
      return undefined;
    };
    invariant(
      JSON.stringify(find(nodes)) ===
        JSON.stringify(find(surface.defaultLayout)),
      'Required controls cannot be changed',
    );
  }
  invariant(
    sources.size <= registry.limits.sources,
    'Too many simultaneous collections',
  );
  return sources;
}
export function validateProfile(
  input: unknown,
  registry: CapabilityRegistry,
): Profile {
  boundedJson(input);
  const profile = profileSchema.parse(input);
  invariant(
    profile.registryRevision === registry.revision,
    'Application capabilities changed',
    'REGISTRY_MISMATCH',
  );
  validateValues(profile.theme, registry.themeTokens, 'Appearance', false);
  invariant(
    new Set(profile.views.map((v) => v.id)).size === profile.views.length,
    'Duplicate saved view',
  );
  profile.views.forEach((view) => validateView(view, registry));
  for (const [id, nodes] of Object.entries(profile.surfaces))
    validateLayout(nodes, id, profile, registry);
  invariant(
    registry.surfaces.every((s) => s.id in profile.surfaces),
    'Missing surface',
  );
  const navigationIds = new Set<string>();
  for (const item of profile.navigation) {
    const key = `${item.target}:${item.id}`;
    invariant(!navigationIds.has(key), 'Duplicate destination');
    navigationIds.add(key);
    if (item.target === 'destination')
      validateDestination(item.id, item.params, registry, item.placement);
    else {
      invariant(
        profile.views.some((v) => v.id === item.id),
        'Unknown personal destination',
      );
      invariant(!item.params, 'Personal views do not accept route parameters');
    }
  }
  invariant(
    profile.navigation.filter((p) => p.placement === 'tab').length <=
      registry.limits.tabs,
    'Too many pinned destinations',
  );
  for (const d of registry.destinations.filter((d) => d.protected))
    invariant(
      profile.navigation.some(
        (p) => p.target === 'destination' && p.id === d.id,
      ),
      'Required navigation must remain available',
    );
  return profile;
}
export function createProfile(
  registry: CapabilityRegistry,
  scope: string,
): Profile {
  registrySchema.parse(registry);
  for (const list of [
    registry.components,
    registry.surfaces,
    registry.sources,
    registry.destinations,
  ])
    invariant(
      new Set(list.map((v) => v.id)).size === list.length,
      'Duplicate capability',
    );
  return validateProfile(
    {
      schemaVersion: 1,
      registryRevision: registry.revision,
      scope,
      revision: 0,
      name: 'My space',
      theme: {},
      views: [],
      surfaces: Object.fromEntries(
        registry.surfaces.map((s) => [s.id, s.defaultLayout]),
      ),
      navigation: registry.defaultNavigation,
    },
    registry,
  );
}
