import { createHash } from 'node:crypto';
import type { DiscoveredRoute } from './types';

export function discoverRoutes(files: string[]): DiscoveredRoute[] {
  return files
    .filter(
      (f) =>
        /(?:^|\/)app\/.+\.tsx$/.test(f) &&
        !f.endsWith('_layout.tsx') &&
        !/\+[^/]*\.tsx$/.test(f),
    )
    .map((file) => {
      const path =
        '/' +
        file
          .replace(/^(?:src\/)?app\//, '')
          .replace(/\.tsx$/, '')
          .replace(/(?:^|\/)index$/, '');
      const params: DiscoveredRoute['params'] = {};
      for (const match of path.matchAll(/\[([^\]]+)\]/g)) {
        const name = match[1];
        if (name && !name.startsWith('...'))
          params[name] = { type: 'string', required: true, nullable: false };
      }
      return {
        id: `route-${createHash('sha256').update(path).digest('hex').slice(0, 12)}`,
        selector: file,
        file,
        path: path || '/',
        params,
        supported: !path.includes('[...') && !path.includes('[['),
      };
    });
}
