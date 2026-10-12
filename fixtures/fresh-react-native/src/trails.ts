import { queryOptions } from '@tanstack/react-query';
import { queryClient } from './client';

export interface Trail {
  id: string;
  title: string;
  distance: number;
  favorite: boolean;
  terrain: 'forest' | 'coast';
}

const trails: Trail[] = Array.from({ length: 35 }, (_, index) => ({
  id: String(index + 1),
  title: `Trail ${index + 1}`,
  distance: index + 1,
  favorite: index % 2 === 0,
  terrain: index % 2 === 0 ? 'forest' : 'coast',
}));

export const trailOptions = () =>
  queryOptions({
    queryKey: ['trails'],
    queryFn: async (): Promise<Trail[]> => trails.map(trail => ({ ...trail })),
  });

export async function renameTrail(id: string, title: string): Promise<void> {
  const trail = trails.find(item => item.id === id);
  if (trail) {
    trail.title = title;
    await queryClient.invalidateQueries({ queryKey: ['trails'] });
  }
}
