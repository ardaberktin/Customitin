import type { Operation, Profile } from '../schema/configuration';
import type { CapabilityRegistry } from '../schema/registry';
import { invariant } from '../schema/primitives';
import { validateDataPlan } from '../data/plans/validate';

export function validatePlanningTarget(
  registry: CapabilityRegistry,
  target?: string | string[],
  operations: Operation[] = [],
  current?: Profile,
): void {
  const ids = typeof target === 'string' ? [target] : target;
  invariant(ids, 'Select the surfaces to customize');
  invariant(
    ids.length > 0 && new Set(ids).size === ids.length,
    'Select distinct surfaces',
  );
  const surfaces = ids.map((id) => {
    const surface = registry.surfaces.find((item) => item.id === id);
    invariant(surface, 'Unknown customization surface');
    return surface;
  });
  for (const operation of operations) {
    if (operation.op === 'setSurfaceLayout') {
      const surface = surfaces.find((item) => item.id === operation.surfaceId);
      invariant(surface, 'The proposal changes another screen or surface');
      invariant(
        surface.policy?.operations.includes(
          surface.mode === 'properties' ? 'properties' : 'layout',
        ),
        'Layout changes are unavailable on this surface',
      );
    } else if (
      operation.op === 'setDataView' ||
      operation.op === 'removeDataView'
    ) {
      const surface = surfaces.find((item) => item.id === operation.surfaceId);
      invariant(
        surface?.policy?.operations.includes('data'),
        'Data changes are unavailable on this surface',
      );
      const viewId =
        operation.op === 'setDataView' ? operation.view.id : operation.viewId;
      const visits = (nodes: Profile['surfaces'][string]): boolean =>
        nodes.some(
          (node) =>
            Object.values(node.data ?? {}).some(
              (binding) => binding.viewId === viewId,
            ) || visits(node.children),
        );
      for (const [id, nodes] of Object.entries(current?.surfaces ?? {}))
        invariant(
          ids.includes(id) || !visits(nodes),
          'The data view is used by another surface',
        );
      if (operation.op === 'setDataView')
        validateDataPlan(operation.view.plan, registry, operation.surfaceId);
    } else if (operation.op === 'setThemeTokens') {
      for (const surface of registry.surfaces)
        invariant(
          ids.includes(surface.id) ||
            !Object.keys(operation.tokens).some((key) =>
              surface.policy?.themeTokenIds.includes(key),
            ),
          'Appearance affects another surface',
        );
      for (const key of Object.keys(operation.tokens))
        invariant(
          surfaces.every(
            (surface) =>
              surface.policy?.operations.includes('theme') &&
              surface.policy.themeTokenIds.includes(key),
          ),
          'Appearance changes are unavailable on this surface',
        );
    } else if (operation.op === 'setNavigationPlacements') {
      invariant(
        surfaces.every((surface) =>
          surface.policy?.operations.includes('navigation'),
        ),
        'Navigation changes are unavailable on this surface',
      );
      invariant(
        registry.surfaces.every((surface) => ids.includes(surface.id)),
        'Navigation requires all affected surfaces',
      );
      for (const placement of operation.placements) {
        if (placement.target === 'destination')
          invariant(
            surfaces.every((surface) =>
              surface.policy?.destinationIds.includes(placement.id),
            ),
            'Destination is unavailable on this surface',
          );
        else
          invariant(
            surfaces.every((surface) =>
              surface.policy?.operations.includes('data'),
            ),
            'Personal destinations require data permission',
          );
      }
    } else {
      // Compatibility for host-rendered v1 collections. They are global; every surface must be targeted.
      invariant(
        registry.surfaces.every((surface) => ids.includes(surface.id)),
        'Legacy view changes require all affected surfaces',
      );
      const view =
        operation.op === 'removeView'
          ? current?.views.find((view) => view.id === operation.viewId)
          : operation.view;
      invariant(view, 'Unknown saved view');
      const source = registry.sources.find(
        (source) => source.id === view.sourceId,
      );
      invariant(
        source &&
          surfaces.every(
            (surface) =>
              surface.policy?.operations.includes('data') &&
              Object.keys(source.fields).every((field) =>
                surface.policy?.sourceFields[source.id]?.includes(field),
              ),
          ),
        'Saved view is unavailable on this surface',
      );
    }
  }
}
