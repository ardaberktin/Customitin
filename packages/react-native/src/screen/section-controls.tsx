import { Text, View } from 'react-native';
import type { CapabilityRegistry, LayoutNode } from '@customitin/core';
import { ActionButton } from '../composer/button';
import { en } from '../composer/strings';
import { usePersonalTheme } from '../renderer/theme';

export type ScreenSurface = CapabilityRegistry['surfaces'][number];
export function SectionControls({
  surface,
  nodes,
  registry,
  disabled,
  change,
}: {
  surface: ScreenSurface;
  nodes: LayoutNode[];
  registry: CapabilityRegistry;
  disabled: boolean;
  change: (nodes: LayoutNode[]) => void;
}) {
  const theme = usePersonalTheme();
  function move(index: number, offset: number) {
    const next = [...nodes];
    const [node] = next.splice(index, 1);
    if (node) next.splice(index + offset, 0, node);
    change(next);
  }
  return surface.defaultLayout.map((node) => {
    const index = nodes.findIndex((item) => item.id === node.id);
    const required = surface.requiredNodeIds.includes(node.id);
    const title =
      registry.components.find((component) => component.id === node.componentId)
        ?.title ?? node.id;
    return (
      <View key={node.id} style={{ gap: 8 }}>
        <Text style={{ color: theme.ink }}>
          {title}
          {required ? ` · ${en.requiredSection}` : ''}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <ActionButton
            label={`${index < 0 ? en.showSection : en.hideSection} ${title}`}
            disabled={disabled || required}
            onPress={() =>
              change(
                index < 0
                  ? [...nodes, node]
                  : nodes.filter((n) => n.id !== node.id),
              )
            }
            secondary
          />
          <ActionButton
            label={`${en.moveUp}: ${title}`}
            disabled={disabled || index <= 0}
            onPress={() => move(index, -1)}
            secondary
          />
          <ActionButton
            label={`${en.moveDown}: ${title}`}
            disabled={disabled || index < 0 || index === nodes.length - 1}
            onPress={() => move(index, 1)}
            secondary
          />
        </View>
      </View>
    );
  });
}
