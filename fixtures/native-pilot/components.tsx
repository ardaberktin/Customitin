import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { en } from './en';
import { styles } from './styles';
export interface SeriesRow {
  label: string;
  value: number;
}
export function Chart({
  data,
  title,
}: {
  data: readonly SeriesRow[];
  title: string;
}) {
  const maximum = Math.max(1, ...data.map((row) => row.value));
  return (
    <View style={styles.card} testID="host-chart">
      <Text style={styles.cardTitle}>{title}</Text>
      {data.map((row) => (
        <View key={row.label} style={styles.chartRow}>
          <Text style={styles.body}>
            {row.label}: {row.value}
          </Text>
          <View style={styles.track}>
            <View
              style={[styles.bar, { width: `${(row.value / maximum) * 100}%` }]}
            />
          </View>
        </View>
      ))}
    </View>
  );
}
export function Cards({ data }: { data: readonly SeriesRow[] }) {
  return (
    <View style={styles.sections} testID="host-cards">
      {data.map((row) => (
        <View key={row.label} style={styles.card}>
          <Text style={styles.cardTitle}>{row.label}</Text>
          <Text style={styles.body}>{row.value}</Text>
        </View>
      ))}
    </View>
  );
}
export function Message({
  text,
  emphasis = false,
}: {
  text: string;
  emphasis?: boolean;
}) {
  return (
    <Text
      testID="host-message"
      style={[styles.heading, emphasis && styles.emphasis]}
    >
      {text}
    </Text>
  );
}
export function Panel({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <View style={styles.card} testID="host-panel">
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}
// A host-owned wrapper keeps the library's complex styling and event API in host code.
export function ProgressMeter({ value }: { value: number }) {
  return (
    <View style={styles.card} testID="host-library">
      <Text style={styles.cardTitle}>
        {en.progress}: {value}%
      </Text>
      <Slider
        accessibilityLabel={en.slider}
        value={value}
        minimumValue={0}
        maximumValue={100}
        disabled
        minimumTrackTintColor="#23877a"
      />
    </View>
  );
}
