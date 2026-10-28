import type { ComponentType } from 'react';
import { View, Text } from 'react-native';
import type { CollectionDescriptor } from '@customitin/core';
import type { HostComponentProps } from '@customitin/react';
import {
  CollectionItem,
  useCollectionModel,
  collectionEnglish as en,
  type CollectionProps,
} from '@customitin/react/collection';
import { styles as s } from './styles';
import { Button, CollectionControls } from './controls';

function Collection(props: CollectionProps) {
  const m = useCollectionModel(props);
  if (!m.complete)
    return <Text accessibilityRole="alert">{en.incomplete}</Text>;
  return (
    <View style={s.root}>
      <View style={s.header}>
        <View>
          {!!m.title && (
            <Text accessibilityRole="header" style={s.title}>
              {m.title}
            </Text>
          )}
          {m.showCount && <Text style={s.count}>({m.totalCount})</Text>}
        </View>
        <Button
          label={en.density}
          onPress={() => m.setColumns(m.columns === 3 ? 2 : 3)}
        >
          ▦
        </Button>
      </View>
      <CollectionControls model={m} />
      {m.groups.map((group) => (
        <View key={group.key} style={s.group}>
          {!!group.label && (
            <Text accessibilityRole="header" style={s.heading}>
              <Text style={{ color: group.color }}>● </Text>
              {group.label}
              {m.showCount ? ` (${group.entries.length})` : ''}
            </Text>
          )}
          <View style={s.grid}>
            {group.entries.map(({ row, key }) => (
              <View
                key={key}
                style={[s.item, { width: `${100 / m.columns}%` }]}
              >
                <CollectionItem
                  Item={props.Item}
                  descriptor={props.descriptor}
                  row={row}
                  rowKey={key}
                />
              </View>
            ))}
          </View>
        </View>
      ))}
      {!m.visibleCount && <Text accessibilityRole="alert">{en.empty}</Text>}
    </View>
  );
}
export function createCollectionBinding(
  Item: ComponentType<HostComponentProps>,
  descriptor: CollectionDescriptor,
): ComponentType<HostComponentProps> {
  if (!descriptor.collection)
    throw new Error('Expected an SDK collection descriptor');
  return function BoundCollection(props) {
    return (
      <Collection
        key={JSON.stringify(props.values)}
        {...props}
        Item={Item}
        descriptor={descriptor}
      />
    );
  };
}
