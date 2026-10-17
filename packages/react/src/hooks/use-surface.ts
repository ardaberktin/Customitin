import { useCustomization, useRenderedProfile } from '../provider/context';
import { invariant, type LayoutNode } from '@customitin/core';

export function useSurface(id: string) {
  const { registry, runtime, loading, code } = useCustomization();
  const profile = useRenderedProfile();
  const descriptor = registry.surfaces.find((surface) => surface.id === id);
  invariant(descriptor, `Unknown surface ${id}`);
  return {
    descriptor,
    nodes: profile?.surfaces[id] ?? descriptor.defaultLayout,
    loading,
    code,
    components: registry.components.filter((component) =>
      descriptor.allowedComponentIds.includes(component.id),
    ),
    preview(nodes: LayoutNode[], summary = 'Update layout') {
      runtime.previewOperations(
        [{ op: 'setSurfaceLayout', surfaceId: id, nodes }],
        summary,
        id,
      );
    },
    request: (instruction: string) => runtime.request(instruction, id),
    apply: () => runtime.apply(),
    cancel: () => runtime.cancelPreview(),
    undo: () => runtime.undo([id]),
    restore: () =>
      runtime.previewOperations(
        [
          {
            op: 'setSurfaceLayout',
            surfaceId: id,
            nodes: descriptor.defaultLayout,
          },
        ],
        'Restore layout',
        id,
      ),
  };
}

export function useAssistant(surfaceIds: string[]) {
  const { runtime, ...state } = useCustomization();
  return {
    ...state,
    actions: runtime.actions,
    request: (instruction: string) => runtime.request(instruction, surfaceIds),
    cancel: () => runtime.cancelPreview(),
    apply: () => runtime.apply(),
    undo: () => runtime.undo(surfaceIds),
    reset: () => runtime.reset(surfaceIds),
    clearConversation: () => runtime.assistant.clear(),
  };
}
