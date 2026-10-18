import { memo, type ReactNode, useState } from 'react';
import type { ChartRow } from '@host/data';

export const Chart = memo(
  ({ data, children }: { data: readonly ChartRow[]; children?: ReactNode }) => (
    <section>
      {data.map((row) => (
        <p key={row.label}>
          {row.label}: {row.value}
        </p>
      ))}
      {children}
    </section>
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
    <p>
      {title}: {record.label} {record.value}
    </p>
  );
}
export default function App() {
  const [count, setCount] = useState(0);
  return (
    <main>
      <h1>Original web screen</h1>
      <button onClick={() => setCount(count + 1)}>Count {count}</button>
      <Chart data={[{ label: 'Original data', value: 5 }]} />
    </main>
  );
}
