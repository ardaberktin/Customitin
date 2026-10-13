import { useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { ProfilePreview, useCustomization } from '../provider/context';
import { ActionButton } from '../composer/button';
import { en } from '../composer/strings';
import { ScreenEditor } from './editor';

export interface CustomizableScreenProps {
  id: string;
  sections: Record<string, ReactNode>;
  children: (content: ReactNode) => ReactNode;
}

/** Retains original React elements and their state, including hidden sections. */
export function CustomizableScreen(props: CustomizableScreenProps) {
  const { runtime } = useCustomization();
  // Account changes discard an open editor along with the old runtime.
  return <Screen key={runtime.activeScope} {...props} />;
}

function Screen({ id, sections, children }: CustomizableScreenProps) {
  const { registry, profile, preview, previewSurfaceId, runtime, loading } =
    useCustomization();
  const [editing, setEditing] = useState(false);
  const surface = registry.surfaces.find((s) => s.id === id);
  const rendered =
    editing && previewSurfaceId === id ? (preview ?? profile) : profile;
  if (!surface || surface.kind !== 'screen')
    throw new Error(`Register the existing screen surface: ${id}`);
  if (surface.defaultLayout.some((node) => !(node.id in sections)))
    throw new Error(
      `Screen sections do not match the registered surface: ${id}`,
    );
  const nodes = rendered?.surfaces[id] ?? surface.defaultLayout;
  const visible = new Set(nodes.map((node) => node.id));
  const ordered = [
    ...nodes,
    ...surface.defaultLayout.filter((node) => !visible.has(node.id)),
  ];
  const content = (
    <>
      {ordered.map((node) => (
        <View
          key={node.id}
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
      {editing ? <ScreenEditor surface={surface} /> : null}
      {!profile && !loading ? (
        <ActionButton label={en.retry} onPress={() => void runtime.start()} />
      ) : (
        <ActionButton
          label={editing ? en.finishScreen : en.customizeScreen}
          disabled={!profile || loading}
          onPress={() => {
            runtime.cancelPreview();
            setEditing(!editing);
          }}
          secondary
        />
      )}
    </>
  );
  return (
    <ProfilePreview profile={rendered ?? null}>
      {children(content)}
    </ProfilePreview>
  );
}
