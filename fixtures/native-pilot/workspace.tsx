import { Text, View } from 'react-native';
import {
  SurfaceRenderer,
  useCustomization,
  useSurface,
} from '@customitin/react';
import { Control } from './controls';
import { en } from './en';
import { styles } from './styles';
const renderStatus = () => <Text>{en.status}</Text>;
export function Workspace({
  run,
  disabled,
}: {
  run(task: () => void | Promise<void>): void;
  disabled: boolean;
}) {
  const state = useCustomization();
  const surface = useSurface('workspace');
  const heading = useSurface('heading');
  const nodes = state.preview?.surfaces.workspace ?? surface.nodes;
  const hasPreview = state.previewSurfaceIds?.includes('workspace');
  return (
    <>
      <SurfaceRenderer id="heading" preview />
      <View style={styles.row}>
        {[en.hours, en.budgets, en.cards, en.mixed].map((title) => (
          <Control
            key={title}
            title={title}
            disabled={disabled}
            onPress={() => run(() => surface.request(title))}
          />
        ))}
      </View>
      <View style={styles.row}>
        <Control
          title={en.rename}
          disabled={disabled}
          onPress={() =>
            run(() =>
              heading.preview([
                {
                  ...heading.nodes[0]!,
                  props: { text: en.headingAlt, emphasis: true },
                },
              ]),
            )
          }
        />
        <Control
          title={en.reorder}
          disabled={disabled || nodes.length < 2}
          onPress={() => run(() => surface.preview([...nodes].reverse()))}
        />
        <Control
          title={en.hide}
          disabled={disabled || nodes.length === 0}
          onPress={() => run(() => surface.preview(nodes.slice(1)))}
        />
      </View>
      {hasPreview && (
        <View style={[styles.surface, styles.preview]} testID="layout-preview">
          <Text style={styles.label}>{en.preview}</Text>
          <SurfaceRenderer id="workspace" preview status={renderStatus} />
        </View>
      )}
      <View style={styles.surface} testID="saved-layout">
        <Text style={styles.label}>{en.applied}</Text>
        {surface.nodes.length === 0 && (
          <Text style={styles.body}>{en.empty}</Text>
        )}
        <SurfaceRenderer id="workspace" status={renderStatus} />
      </View>
    </>
  );
}
