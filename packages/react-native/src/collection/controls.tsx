import type { ReactNode } from 'react';
import { View, Text, Pressable } from 'react-native';
import {
  collectionEnglish as en,
  valueKey,
  valueLabel,
  type useCollectionModel,
} from '@customitin/react/collection';
import { styles as s } from './styles';
export function Button({
  children,
  label,
  selected,
  onPress,
}: {
  children: ReactNode;
  label?: string;
  selected?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={selected === undefined ? {} : { selected }}
      style={[s.button, selected ? s.selected : undefined]}
      onPress={onPress}
    >
      <Text>{children}</Text>
    </Pressable>
  );
}

export function CollectionControls({
  model: m,
}: {
  model: ReturnType<typeof useCollectionModel>;
}) {
  return (
    <>
      {m.showFilters && (
        <View style={s.controls}>
          <Button selected={!m.selected} onPress={() => m.setSelected('')}>
            {en.all}
          </Button>
          <Button
            label={m.expanded ? en.collapse : en.expand}
            onPress={() => m.setExpanded(!m.expanded)}
          >
            {m.expanded ? '⌃' : '⌄'}
          </Button>
          {m.expanded &&
            m.options.map((value) => (
              <Button
                key={valueKey(value)}
                selected={m.selected === valueKey(value)}
                onPress={() =>
                  m.setSelected(
                    m.selected === valueKey(value) ? '' : valueKey(value),
                  )
                }
              >
                {valueLabel(value)}
              </Button>
            ))}
        </View>
      )}
      {m.showSort && (
        <View style={s.controls}>
          <Text>{en.sort}</Text>
          {m.sorts.map((field) => (
            <Button
              key={field}
              selected={m.sortBy === field}
              onPress={() => m.setSortBy(field)}
            >
              {m.label(field)}
            </Button>
          ))}
          <Button
            onPress={() =>
              m.setDirection(m.direction === 'asc' ? 'desc' : 'asc')
            }
          >
            {m.direction === 'asc' ? en.ascending : en.descending}
          </Button>
          <Button onPress={() => m.setSelected('')}>{en.clear}</Button>
        </View>
      )}
    </>
  );
}
