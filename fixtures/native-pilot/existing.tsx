import { View } from 'react-native';
import { useCustomization, useSurface } from '@customitin/react';
import { ExistingSections } from './sections';
import { Control } from './controls';
import { en } from './en';
import { styles } from './styles';
export function Existing({
  id,
  run,
  disabled,
}: {
  id: string;
  run(task: () => void | Promise<void>): void;
  disabled: boolean;
}) {
  const surface = useSurface(id);
  const { preview } = useCustomization();
  const nodes = preview?.surfaces[id] ?? surface.nodes;
  const note = surface.descriptor.defaultLayout[1]!;
  const visible = nodes.some((node) => node.id === note.id);
  return (
    <>
      <View style={styles.row}>
        <Control
          title={visible ? en.hideNotes : en.showNotes}
          disabled={disabled}
          onPress={() =>
            run(() =>
              surface.preview(
                visible
                  ? nodes.filter((node) => node.id !== note.id)
                  : [...nodes, note],
              ),
            )
          }
        />
        <Control
          title={en.sectionOrder}
          disabled={disabled}
          onPress={() => run(() => surface.preview([...nodes].reverse()))}
        />
      </View>
      <ExistingSections />
    </>
  );
}
