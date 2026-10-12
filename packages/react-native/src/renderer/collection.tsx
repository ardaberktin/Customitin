import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import {
  validateDestination,
  type Row,
  type SavedView,
} from '@customitin/core';
import { useCustomization, type ItemProps } from '../provider/context';
import { ActionButton } from '../composer/button';
import { en } from '../composer/strings';
import { usePersonalTheme } from './theme';
import { useCollection } from './use-collection';

export function DefaultItem({ title, subtitle, compact, onPress }: ItemProps) {
  const theme = usePersonalTheme();
  const content = (
    <>
      <Text
        selectable={!onPress}
        style={{
          color: theme.ink,
          fontSize: (compact ? 16 : 19) * theme.scale,
          fontWeight: '600',
        }}
      >
        {title}
      </Text>
      {subtitle ? (
        <Text
          selectable
          style={{
            color: theme.muted,
            fontSize: 13 * theme.scale,
            marginTop: 7,
          }}
        >
          {subtitle}
        </Text>
      ) : null}
    </>
  );
  const style = {
    padding: compact ? 14 : 20,
    backgroundColor: theme.card,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.border,
    minHeight: 84,
  };
  return onPress ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${title}`}
      onPress={onPress}
      style={style}
    >
      {content}
    </Pressable>
  ) : (
    <View style={style}>{content}</View>
  );
}
export function Collection({
  view,
  summary = false,
}: {
  view: SavedView;
  summary?: boolean;
}) {
  const { registry, bindings } = useCustomization();
  const theme = usePersonalTheme();
  const { page, loading, error, descriptor, refresh, more } =
    useCollection(view);
  if (loading && !page)
    return (
      <ActivityIndicator accessibilityLabel={en.loading} color={theme.accent} />
    );
  if (error)
    return (
      <View style={{ gap: 12 }}>
        <Text accessibilityRole="alert" style={{ color: theme.error }}>
          {en.error}
        </Text>
        <ActionButton label={en.refresh} onPress={refresh} secondary />
      </View>
    );
  if (!page || !descriptor) return null;
  if (summary)
    return (
      <Text selectable style={{ color: theme.ink, fontSize: 26 * theme.scale }}>
        {page.totalCount !== undefined
          ? `${page.totalCount} ${view.title.toLocaleLowerCase()}`
          : 'A complete count is unavailable.'}
      </Text>
    );
  const Item =
    bindings.items?.[view.presentation.itemRendererId] ?? DefaultItem;
  const groups = new Map<string, Row[]>();
  for (const row of page.items) {
    const key = view.query.groupBy
      ? String(row[view.query.groupBy] ?? 'Other')
      : '';
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  return (
    <View style={{ gap: theme.gap }}>
      {page.items.length === 0 ? (
        <Text style={{ color: theme.muted }}>{en.empty}</Text>
      ) : null}
      {[...groups].map(([group, rows]) => (
        <View key={group} style={{ gap: theme.gap }}>
          {group ? (
            <Text
              accessibilityRole="header"
              style={{
                color: theme.ink,
                fontWeight: '600',
                fontSize: 20 * theme.scale,
              }}
            >
              {group}
            </Text>
          ) : null}
          <View
            style={{
              flexDirection:
                view.presentation.mode === 'grid' ? 'row' : 'column',
              flexWrap: 'wrap',
              gap: theme.gap,
            }}
          >
            {rows.map((row) => {
              const destinationId = descriptor.detailDestinationId;
              const param = descriptor.detailParam;
              const onPress =
                destinationId && param && bindings.navigate
                  ? () => {
                      const params = {
                        [param]: row[descriptor.idField] ?? null,
                      };
                      validateDestination(
                        destinationId,
                        params,
                        registry,
                        'shortcut',
                      );
                      bindings.navigate?.(destinationId, params);
                    }
                  : undefined;
              return (
                <View
                  key={String(row[descriptor.idField])}
                  style={{
                    width: view.presentation.mode === 'grid' ? '47%' : '100%',
                    flexGrow: 1,
                  }}
                >
                  <Item
                    row={row}
                    title={String(row[descriptor.titleField] ?? '')}
                    subtitle={
                      descriptor.subtitleField
                        ? String(row[descriptor.subtitleField] ?? '')
                        : undefined
                    }
                    compact={view.presentation.density === 'compact'}
                    onPress={onPress}
                  />
                </View>
              );
            })}
          </View>
        </View>
      ))}
      {page.nextCursor ? (
        <ActionButton
          label={loading ? en.loading : en.loadMore}
          disabled={loading}
          onPress={more}
          secondary
        />
      ) : null}
      {descriptor.completeness === 'partial' ? (
        <Text style={{ color: theme.muted }}>
          Showing available items. This is not the complete collection.
        </Text>
      ) : null}
    </View>
  );
}
