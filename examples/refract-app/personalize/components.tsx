import type { HostComponentProps } from '@customitin/react';
import type { ComponentProps } from 'react';
import capabilities from './capabilities.json';
import { registrySchema } from '@customitin/core';
const registry = registrySchema.parse(capabilities);
import { createCollectionBinding } from '@customitin/react/dom';
import { MediaCard as Host0 } from '../src/components/MediaShelf';
const hosts = {
  'cap-70c1f279aa8ab465': ({ data = {} }: HostComponentProps) => {
    const Bound0 = Host0;
    return (
      <Bound0
        {...{
          item: data.item?.rows?.[0] as unknown as ComponentProps<
            typeof Bound0
          >['item'],
        }}
      />
    );
  },
};
export const components = {
  ...hosts,
  'cap-70c1f279aa8ab465.collection': createCollectionBinding(
    hosts['cap-70c1f279aa8ab465'],
    registry.components.find(
      (c) => c.id === 'cap-70c1f279aa8ab465.collection',
    )!,
  ),
};
export const items = {};
