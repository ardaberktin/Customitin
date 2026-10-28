// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import type { HostComponentProps } from '@customitin/react';
import { createCollectionBinding as webBinding } from '@customitin/react/dom';
import { createCollectionBinding as nativeBinding } from '@customitin/react-native/collection';
import { collectionData, sdkCollection } from './helpers/sdk-collection';
afterEach(cleanup);
function Card({ data }: HostComponentProps) {
  const [clicks, setClicks] = useState(0);
  const row = data!.item!.rows[0]!;
  return (
    <button
      onClick={() => setClicks(clicks + 1)}
      aria-label={`Card ${row.title}`}
    >
      {row.title}: {clicks}
    </button>
  );
}
it.each(['web', 'native'])(
  'supplies %s filters, sort, dynamic counts and card identity without host collection logic',
  (platform) => {
    const Component = (platform === 'web' ? webBinding : nativeBinding)(
      Card,
      sdkCollection,
    );
    const values = {
      title: 'Entries',
      groupBy: 'stage',
      filterBy: 'stage',
      sortBy: 'score',
      columns: 3,
      expanded: true,
    };
    const app = render(
      <Component values={values} data={{ items: collectionData }} />,
    );
    expect(screen.getByText('(3)')).toBeTruthy();
    const order = () =>
      screen
        .getAllByRole('button', { name: /^Card / })
        .map((b) => b.getAttribute('aria-label'));
    expect(order()).toEqual(['Card Alpha', 'Card Gamma', 'Card Beta']);
    fireEvent.click(screen.getAllByRole('button', { name: 'Ready' })[0]!);
    expect(order()).toEqual(['Card Gamma', 'Card Beta']);
    fireEvent.click(screen.getByRole('button', { name: 'Card Beta' }));
    if (platform === 'web')
      fireEvent.change(screen.getByRole('combobox', { name: 'Sort by' }), {
        target: { value: 'title' },
      });
    else fireEvent.click(screen.getByRole('button', { name: 'Title' }));
    fireEvent.click(screen.getByRole('button', { name: 'Descending' }));
    expect(order()).toEqual(['Card Beta', 'Card Gamma']);
    expect(screen.getByText('Beta: 1')).toBeTruthy();
    fireEvent.click(
      screen.getByRole('button', { name: 'Toggle grid density' }),
    );
    if (platform === 'web')
      expect(
        document.querySelector<HTMLElement>('[data-customitin-grid]')!.style
          .gridTemplateColumns,
      ).toContain('repeat(2');
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    const next = {
      ...collectionData,
      keys: [...collectionData.keys, 'd'],
      rows: [
        ...collectionData.rows,
        { id: 'd', title: 'Delta', stage: 'Done', score: 5 },
      ],
    };
    app.rerender(<Component values={values} data={{ items: next }} />);
    expect(screen.getByText('(4)')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Card Delta' })).toBeTruthy();
    app.rerender(
      <Component
        values={{ ...values, columns: 1, showFilters: false }}
        data={{ items: next }}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Ready' })).toBeNull();
    if (platform === 'web')
      expect(
        document.querySelector<HTMLElement>('[data-customitin-grid]')!.style
          .gridTemplateColumns,
      ).toContain('repeat(1');
    app.rerender(
      <Component
        values={values}
        data={{ items: { ...next, complete: false, nextCursor: 'more' } }}
      />,
    );
    expect(
      screen.getByText('This collection requires complete data.'),
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Card Delta' })).toBeNull();
  },
);
