import { Pressable, Text, View } from 'react-native';
import type { HostComponentProps } from '@customitin/react-native';
export function HostChart({ values, data: inputs }: HostComponentProps) {
  return (
    <View
      style={{
        padding: 18,
        backgroundColor: '#fff7df',
        borderRadius: 18,
        gap: 12,
      }}
    >
      <Text style={{ fontWeight: '700', fontSize: 20 }}>
        {String(values.title)}
      </Text>
      {inputs?.series?.rows.map((row) => (
        <View key={String(row.label)} style={{ gap: 5 }}>
          <Text>
            {String(row.label)} · {String(row.value)}
          </Text>
          <View
            style={{
              height: 14,
              width: Math.min(240, Number(row.value) * 8),
              backgroundColor: '#997b3d',
              borderRadius: 7,
            }}
          />
        </View>
      ))}
    </View>
  );
}
export function HostTable({ values, data: inputs }: HostComponentProps) {
  return (
    <View
      style={{
        padding: 18,
        backgroundColor: '#e7f1e8',
        borderRadius: 18,
        gap: 12,
      }}
    >
      <Text style={{ fontWeight: '700', fontSize: 20 }}>
        {String(values.title)}
      </Text>
      {inputs?.series?.rows.map((row) => (
        <View
          key={String(row.label)}
          style={{ flexDirection: 'row', justifyContent: 'space-between' }}
        >
          <Text>{String(row.label)}</Text>
          <Text>{String(row.value)}</Text>
        </View>
      ))}
    </View>
  );
}
export function Button({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress(): void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={{
        padding: 12,
        backgroundColor: disabled ? '#ddd' : '#263d37',
        borderRadius: 12,
      }}
    >
      <Text style={{ color: disabled ? '#444' : '#fff' }}>{label}</Text>
    </Pressable>
  );
}
