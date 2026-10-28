import type { Row } from '@customitin/core';
import type { CollectionProps } from './use-model';

/** Keep the host card and its lexical context; only supply its already-validated single record input. */
export function CollectionItem({
  Item,
  descriptor,
  row,
  rowKey,
}: Pick<CollectionProps, 'Item' | 'descriptor'> & {
  row: Row;
  rowKey: string;
}) {
  return (
    <Item
      values={{}}
      data={{
        [descriptor.collection!.input]: {
          rows: [row],
          keys: [rowKey],
          complete: true,
          nextCursor: null,
        },
      }}
    />
  );
}
