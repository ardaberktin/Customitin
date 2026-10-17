import { Component, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import { validateDestination, type LayoutNode } from '@customitin/core';
import { useCustomization, useRenderedProfile } from '@customitin/react';
import { ActionButton } from '../composer/button';
import { Collection } from './collection';
import { usePersonalTheme } from './theme';

class SurfaceBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed
      ? (this.props.fallback ?? (
          <Text>
            This layout is unavailable. Open Customize to restore the original.
          </Text>
        ))
      : this.props.children;
  }
}
function Node({ node }: { node: LayoutNode }) {
  const { registry, bindings } = useCustomization();
  const profile = useRenderedProfile();
  const theme = usePersonalTheme();
  const descriptor = registry.components.find((c) => c.id === node.componentId);
  const children = node.children.map((child) => (
    <Node key={child.id} node={child} />
  ));
  if (!descriptor) return null;
  switch (descriptor.kind) {
    case 'stack':
      return <View style={{ gap: theme.gap }}>{children}</View>;
    case 'text':
      return (
        <Text
          selectable
          style={{
            fontSize: Number(node.props.size ?? 20) * theme.scale,
            color: theme.ink,
            fontWeight: '600',
          }}
        >
          {String(node.props.text ?? '')}
        </Text>
      );
    case 'collection':
    case 'summary': {
      const view = profile?.views.find((v) => v.id === node.viewId);
      return view ? (
        <View style={{ gap: theme.gap }}>
          <Text
            accessibilityRole="header"
            style={{
              color: theme.ink,
              fontSize: 23 * theme.scale,
              fontWeight: '600',
            }}
          >
            {view.title}
          </Text>
          <Collection
            key={`${profile?.scope}:${view.id}`}
            view={view}
            summary={descriptor.kind === 'summary'}
          />
        </View>
      ) : null;
    }
    case 'shortcut':
      return (
        <ActionButton
          label={String(node.props.label ?? descriptor.title)}
          onPress={() => {
            if (node.destinationId) {
              validateDestination(
                node.destinationId,
                node.params,
                registry,
                'shortcut',
              );
              bindings.navigate?.(node.destinationId, node.params ?? {});
            }
          }}
          secondary
        />
      );
    case 'host': {
      const Host = bindings.components?.[node.componentId];
      return Host ? (
        <Host values={node.props}>{children}</Host>
      ) : (
        <Text>This section is unavailable.</Text>
      );
    }
    case 'item':
      return null;
  }
}
export function CustomizableSurface({
  id,
  fallback,
}: {
  id: string;
  fallback?: ReactNode;
}) {
  const profile = useRenderedProfile();
  const theme = usePersonalTheme();
  if (!profile) return fallback ?? null;
  return (
    <SurfaceBoundary
      key={`${profile.scope}:${profile.revision}`}
      fallback={fallback}
    >
      <View testID={`surface-${id}`} style={{ gap: theme.gap }}>
        {profile.surfaces[id]?.map((node) => (
          <Node key={node.id} node={node} />
        )) ?? fallback}
      </View>
    </SurfaceBoundary>
  );
}
