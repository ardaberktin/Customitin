import { memo, type ReactNode, useState } from 'react';
import { View, Text, Button } from 'react-native';
import type { ChartRow } from './data';

export const Chart = memo(
  ({ data, children }: { data: readonly ChartRow[]; children?: ReactNode }) => (
    <View>
      {data.map((row) => (
        <Text key={row.label}>
          {row.label}: {row.value}
        </Text>
      ))}
      {children}
    </View>
  ),
);
export function Card({
  record,
  title = 'Host card',
}: {
  record: { label: string; value: number };
  title?: string;
}) {
  return (
    <Text>
      {title}: {record.label} {record.value}
    </Text>
  );
}
export default function App() {
  const [count, setCount] = useState(0);
  return (
    <View>
      <Text>Original native screen</Text>
      <Button title={`Count ${count}`} onPress={() => setCount(count + 1)} />
      <Chart data={[{ label: 'Original data', value: 5 }]} />
    </View>
  );
}
