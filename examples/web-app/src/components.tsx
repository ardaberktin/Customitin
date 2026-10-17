import { en } from '@customitin/examples/headless';
export interface SeriesItem {
  label: string;
  value: number;
}
export function Chart({
  title,
  series,
}: {
  title: string;
  series: SeriesItem[];
}) {
  return (
    <section className="visual">
      <h3>{title}</h3>
      {series.map((item) => (
        <div className="bar-row" key={item.label}>
          <span>{item.label}</span>
          <div
            className="bar"
            style={{ width: `${Math.min(100, item.value * 4)}%` }}
          />
          <strong>{item.value}</strong>
        </div>
      ))}
    </section>
  );
}
export function Table({
  title,
  series,
}: {
  title: string;
  series: SeriesItem[];
}) {
  return (
    <section className="visual">
      <h3>{title}</h3>
      <table>
        <thead>
          <tr>
            <th>{en.team}</th>
            <th>{en.value}</th>
          </tr>
        </thead>
        <tbody>
          {series.map((item) => (
            <tr key={item.label}>
              <td>{item.label}</td>
              <td>{item.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
