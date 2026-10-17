import type { ProfileRecord } from '../storage/profile-store';
import type { CapabilityRegistry } from '../schema/registry';
import type { Profile } from '../schema/configuration';
import { invariant } from '../schema/primitives';
import { validatePlanningTarget } from '../validation/planning';
export function undoRecord(
  record: ProfileRecord,
  registry: CapabilityRegistry,
  target?: string[],
): ProfileRecord {
  const previous = record.history.at(-1);
  invariant(previous, 'There are no changes to undo');
  if (target) {
    validatePlanningTarget(registry, target);
    for (const id of Object.keys(record.current.surfaces))
      invariant(
        target.includes(id) ||
          JSON.stringify(previous.surfaces[id]) ===
            JSON.stringify(record.current.surfaces[id]),
        'Undo affects another surface',
      );
    const changedViews = new Set(
      [...(previous.dataViews ?? []), ...(record.current.dataViews ?? [])]
        .filter(
          (view) =>
            JSON.stringify(
              previous.dataViews?.find((item) => item.id === view.id),
            ) !==
            JSON.stringify(
              record.current.dataViews?.find((item) => item.id === view.id),
            ),
        )
        .map((view) => view.id),
    );
    const usesChangedView = (nodes: Profile['surfaces'][string]): boolean =>
      nodes.some(
        (node) =>
          Object.values(node.data ?? {}).some((binding) =>
            changedViews.has(binding.viewId),
          ) || usesChangedView(node.children),
      );
    for (const [id, nodes] of Object.entries(record.current.surfaces))
      invariant(
        target.includes(id) || !usesChangedView(nodes),
        'Undo affects data on another surface',
      );
    invariant(
      target.length === registry.surfaces.length ||
        (JSON.stringify(previous.theme) ===
          JSON.stringify(record.current.theme) &&
          JSON.stringify(previous.navigation) ===
            JSON.stringify(record.current.navigation)),
      'Undo affects shared configuration',
    );
  }
  return {
    current: { ...previous, revision: record.current.revision + 1 },
    history: record.history.slice(0, -1),
  };
}
