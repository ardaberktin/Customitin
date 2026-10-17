import {
  createLocalSource,
  type ActionBinding,
  type SourceAdapter,
  type Row,
} from '@customitin/core';
import { workspaceRegistry } from './registry';
export const teams: Row[] = [
  { id: 'a', name: 'Design', target: 12 },
  { id: 'b', name: 'Engineering', target: 24 },
];
export const activity: Row[] = [
  { id: 'one', teamId: 'a', hours: 3, done: false },
  { id: 'two', teamId: 'a', hours: 5, done: false },
  { id: 'three', teamId: 'b', hours: 10, done: false },
];
export function workspaceData() {
  const records = activity.map((row) => ({ ...row }));
  const sources: Record<string, SourceAdapter> = Object.fromEntries(
    workspaceRegistry.sources.map((descriptor) => [
      descriptor.id,
      createLocalSource(descriptor, async () =>
        descriptor.id === 'teams' ? teams : records,
      ),
    ]),
  );
  const actions: Record<string, ActionBinding> = {
    complete: {
      available: (args) => records.some((row) => row.id === args.id),
      async execute(args) {
        const row = records.find((item) => item.id === args.id);
        if (!row) throw new Error('Activity is unavailable');
        row.done = true;
        return { done: true };
      },
    },
  };
  return { sources, actions };
}
