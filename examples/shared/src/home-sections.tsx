import { Pressable, Text, View } from 'react-native';
import { type ItemProps } from '@customitin/react-native';
import { Collection, usePersonalTheme } from '@customitin/examples/ui';
import type { SavedView } from '@customitin/core';
import type { DemoKind } from './data';
const copy = {
  recipe: {
    brand: 'GATHER',
    title: 'Good food.\nYour kind of rhythm.',
    subtitle: 'A little collection of things you love to make.',
    label: 'FROM YOUR RECIPE BOX',
    feature: 'Something simple,\nsomething lovely.',
    note: 'Six recipes. A hundred ways to make them yours.',
    color: '#DDE7CB',
    stamp: '01 / THE EVERYDAY TABLE',
  },
  movie: {
    brand: 'FRAME',
    title: 'A good story\nis waiting for you.',
    subtitle: 'Keep the films that stay with you, close.',
    label: 'THE WATCHLIST',
    feature: 'For the next\nunhurried evening.',
    note: 'Your collection, one great film at a time.',
    color: '#DCDDEB',
    stamp: '01 / THE EVENING EDIT',
  },
  task: {
    brand: 'DAYBOOK',
    title: 'A little focus.\nA little breathing room.',
    subtitle: 'Make space for the things that matter today.',
    label: 'ON YOUR MIND',
    feature: 'Less rushing.\nMore making room.',
    note: 'A thoughtful place for the day ahead.',
    color: '#EEE0CE',
    stamp: '01 / THE DAILY PRACTICE',
  },
};
export function Intro({ kind }: { kind: DemoKind }) {
  const theme = usePersonalTheme();
  const c = copy[kind];
  return (
    <View style={{ gap: 18, paddingTop: 18, paddingBottom: 8 }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Text
          style={{
            fontWeight: '800',
            letterSpacing: 5,
            color: theme.accent,
            fontSize: 13,
          }}
        >
          {c.brand}
        </Text>
        <Text style={{ color: theme.muted, fontSize: 11, letterSpacing: 1 }}>
          A SPACE OF YOUR OWN
        </Text>
      </View>
      <Text
        accessibilityRole="header"
        style={{
          fontSize: 40 * theme.scale,
          fontWeight: '500',
          lineHeight: 48 * theme.scale,
          letterSpacing: -1.6,
          color: theme.ink,
        }}
      >
        {c.title}
      </Text>
      <Text
        style={{
          fontSize: 16 * theme.scale,
          lineHeight: 25,
          color: theme.muted,
        }}
      >
        {c.subtitle}
      </Text>
    </View>
  );
}
export function Featured({ kind }: { kind: DemoKind }) {
  const theme = usePersonalTheme();
  const c = copy[kind];
  return (
    <View
      style={{
        padding: 28,
        borderRadius: theme.radius,
        backgroundColor: c.color,
        gap: 18,
        overflow: 'hidden',
      }}
    >
      <Text
        style={{
          fontSize: 10,
          letterSpacing: 2,
          color: '#435541',
          fontWeight: '600',
        }}
      >
        {c.stamp}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Text
          style={{
            flex: 1,
            color: '#283B2B',
            fontSize: 28 * theme.scale,
            lineHeight: 34 * theme.scale,
            fontWeight: '500',
          }}
        >
          {c.feature}
        </Text>
        <View
          accessibilityElementsHidden
          style={{
            width: 76,
            height: 76,
            borderRadius: 38,
            borderWidth: 1,
            borderColor: '#8B9C79',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: '#536D3F', fontSize: 34 }}>
            {kind === 'recipe' ? '✳' : kind === 'movie' ? '▶' : '✓'}
          </Text>
        </View>
      </View>
      <Text style={{ color: '#4F604A', fontSize: 13, lineHeight: 20 }}>
        {c.note}
      </Text>
    </View>
  );
}
export function Library({ kind }: { kind: DemoKind }) {
  const theme = usePersonalTheme();
  const view: SavedView = {
    id: 'original',
    title: 'Your collection',
    sourceId: 'catalog',
    query: { filters: [], sort: [] },
    presentation: {
      mode: 'list',
      itemRendererId: 'card',
      density: theme.gap < 15 ? 'compact' : 'comfortable',
    },
  };
  return (
    <View style={{ gap: 20, paddingTop: 10 }}>
      <Text
        accessibilityRole="header"
        style={{
          color: theme.ink,
          fontSize: 11,
          letterSpacing: 2,
          fontWeight: '700',
        }}
      >
        {copy[kind].label}
      </Text>
      <Collection view={view} />
    </View>
  );
}
export function DemoCard({
  kind,
  row,
  title,
  subtitle,
  compact,
  onPress,
}: ItemProps & { kind: DemoKind }) {
  const theme = usePersonalTheme();
  const category = String(row.category ?? row.genre ?? 'Collection');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${title}`}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: theme.card,
        padding: compact ? 14 : 22,
        borderRadius: theme.radius,
        borderWidth: 1,
        borderColor: theme.border,
        gap: 10,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <Text
          style={{
            color: theme.accent,
            fontSize: 10,
            fontWeight: '700',
            letterSpacing: 1.4,
          }}
        >
          {category.toUpperCase()}
        </Text>
        <Text style={{ color: theme.muted, fontSize: 11 }}>
          {kind === 'recipe'
            ? `${row.minutes} min`
            : kind === 'movie'
              ? String(row.year)
              : row.completed
                ? 'Done'
                : String(row.dueAt)}
        </Text>
      </View>
      <Text
        style={{
          color: theme.ink,
          fontSize: (compact ? 17 : 21) * theme.scale,
          fontWeight: '500',
        }}
      >
        {title}
      </Text>
      {!compact ? (
        <Text
          style={{
            color: theme.muted,
            fontSize: 13 * theme.scale,
            lineHeight: 21,
          }}
        >
          {subtitle}
        </Text>
      ) : null}
    </Pressable>
  );
}
