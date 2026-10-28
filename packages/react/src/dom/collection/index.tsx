import type { ComponentType } from 'react';
import type { CollectionDescriptor } from '@customitin/core';
import type { HostComponentProps } from '../../provider/context';
import {
  CollectionItem,
  useCollectionModel,
  collectionEnglish as en,
  type CollectionProps,
} from '../../collection';
import { CollectionFilters, CollectionSort } from './controls';
import { styles as s } from './styles';

function Collection(props: CollectionProps) {
  const m = useCollectionModel(props);
  if (!m.complete) return <p role="status">{en.incomplete}</p>;
  return (
    <section
      style={s.root}
      data-customitin-collection
      aria-label={m.title || en.collection}
    >
      <header style={s.header}>
        <div>
          {m.title && <h1 style={s.heading}>{m.title}</h1>}
          {m.showCount && (
            <span style={s.count} aria-label={`${en.total}: ${m.totalCount}`}>
              ({m.totalCount})
            </span>
          )}
        </div>
        <div style={s.toolbar}>
          <button
            style={s.button}
            aria-label={en.density}
            onClick={() => m.setColumns(m.columns === 3 ? 2 : 3)}
          >
            ▦
          </button>
        </div>
      </header>
      {m.showFilters && <CollectionFilters model={m} />}
      {m.showSort && <CollectionSort model={m} />}
      {m.groups.map((group) => (
        <section
          key={group.key}
          style={s.group}
          aria-label={group.label || undefined}
        >
          {group.label && (
            <h2 style={s.groupHeading}>
              <span style={{ ...s.dot, background: group.color }} />
              {group.label}
              {m.showCount && (
                <span style={s.groupCount}>{group.entries.length}</span>
              )}
            </h2>
          )}
          <div
            data-customitin-grid
            style={{
              ...s.grid,
              gridTemplateColumns: `repeat(${m.columns}, minmax(0, 1fr))`,
            }}
          >
            {group.entries.map(({ row, key }) => (
              <div key={key} style={s.item}>
                <CollectionItem
                  Item={props.Item}
                  descriptor={props.descriptor}
                  row={row}
                  rowKey={key}
                />
              </div>
            ))}
          </div>
        </section>
      ))}
      {!m.visibleCount && (
        <p role="status" style={s.empty}>
          {en.empty}
        </p>
      )}
    </section>
  );
}
/** Opt-in DOM controls; the main React entry remains headless and platform independent. */
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
