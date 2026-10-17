import { type ReactNode } from 'react';
import { View } from 'react-native';
import { useCustomization } from '@customitin/react';

export interface CustomizableScreenProps {
  id: string;
  sections: Record<string, ReactNode>;
  children: (content: ReactNode) => ReactNode;
}
/** Keeps hidden host sections mounted. The host owns every customization control. */
export function CustomizableScreen({
  id,
  sections,
  children,
}: CustomizableScreenProps) {
  const { registry, profile, preview, previewSurfaceIds, runtime } =
    useCustomization();
  const surface = registry.surfaces.find((item) => item.id === id);
  if (!surface) throw new Error(`Unknown existing surface ${id}`);
  const nodes =
    (previewSurfaceIds?.includes(id) ? preview : undefined)?.surfaces[id] ??
    profile?.surfaces[id] ??
    surface.defaultLayout;
  const visible = new Set(nodes.map((node) => node.id));
  const ordered = [
    ...nodes,
    ...surface.defaultLayout.filter((node) => !visible.has(node.id)),
  ];
  return children(
    <>
      {ordered.map((node) => (
        <View
          key={`${runtime.activeScope}:${node.id}`}
          testID={`screen-section-${node.id}`}
          accessibilityElementsHidden={!visible.has(node.id)}
          importantForAccessibility={
            visible.has(node.id) ? 'auto' : 'no-hide-descendants'
          }
          style={{ display: visible.has(node.id) ? 'flex' : 'none' }}
        >
          {sections[node.id]}
        </View>
      ))}
    </>,
  );
}
