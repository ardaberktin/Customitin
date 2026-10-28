import { registrySchema } from '@customitin/core';
import capabilities from './capabilities.json';
import { loadLibrary as source0 } from '../src/data/library';
import { createCachedSource } from '@customitin/react/adapters';
const registry = registrySchema.parse(capabilities);
const descriptor0 = registry.sources.find(
  (s) => s.id === 'cap-83a3e73694ceb2c9',
)!;
export const sources = {
  'cap-83a3e73694ceb2c9': createCachedSource(descriptor0, async () =>
    source0(),
  ),
};
