import { useId } from 'react';
import {
  collectionEnglish as en,
  categoryColor,
  valueKey,
  valueLabel,
  type useCollectionModel,
} from '../../collection';
import { styles as s, selectedStyle } from './styles';
export type Model = ReturnType<typeof useCollectionModel>;

export function CollectionFilters({ model: m }: { model: Model }) {
  const id = useId();
  const toggle = (key: string) => m.setSelected(m.selected === key ? '' : key);
  return (
    <section
      style={s.filters}
      aria-label={`${en.filters}: ${m.label(m.filterBy)}`}
    >
      <div style={s.strip}>
        <button
          style={{ ...s.button, ...(!m.selected ? selectedStyle : {}) }}
          aria-pressed={!m.selected}
          onClick={() => m.setSelected('')}
        >
          {en.all}
        </button>
        {m.options.map((value, index) => (
          <button
            key={valueKey(value)}
            style={{
              ...s.button,
              ...(m.selected === valueKey(value) ? selectedStyle : {}),
            }}
            aria-label={valueLabel(value)}
            aria-pressed={m.selected === valueKey(value)}
            onClick={() => toggle(valueKey(value))}
          >
            <span style={{ ...s.dot, background: categoryColor(index) }} />
          </button>
        ))}
        <button
          style={s.button}
          aria-controls={id}
          aria-expanded={m.expanded}
          aria-label={m.expanded ? en.collapse : en.expand}
          onClick={() => m.setExpanded(!m.expanded)}
        >
          {m.expanded ? '⌃' : '⌄'}
        </button>
      </div>
      {m.expanded && (
        <div id={id} style={s.choices}>
          {m.options.map((value, index) => (
            <button
              key={valueKey(value)}
              style={{
                ...s.button,
                ...s.choice,
                ...(m.selected === valueKey(value) ? selectedStyle : {}),
              }}
              aria-pressed={m.selected === valueKey(value)}
              onClick={() => toggle(valueKey(value))}
            >
              <span style={{ ...s.dot, background: categoryColor(index) }} />
              {valueLabel(value)}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
export function CollectionSort({ model: m }: { model: Model }) {
  return (
    <div style={s.sorting}>
      <label>
        {en.sort}{' '}
        <select
          style={s.select}
          value={m.sortBy}
          onChange={(e) => m.setSortBy(e.target.value)}
        >
          <option value="">{en.original}</option>
          {m.sorts.map((field) => (
            <option key={field} value={field}>
              {m.label(field)}
            </option>
          ))}
        </select>
      </label>
      <button
        style={s.button}
        aria-label={m.direction === 'asc' ? en.ascending : en.descending}
        onClick={() => m.setDirection(m.direction === 'asc' ? 'desc' : 'asc')}
      >
        {m.direction === 'asc' ? '↑' : '↓'}
      </button>
      <button style={s.button} onClick={() => m.setSelected('')}>
        {en.clear}
      </button>
    </div>
  );
}
