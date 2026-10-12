import { filterRows, validateQuery } from '@customitin/core';
import { movies, tasks } from '../../shared/src/data';
import { registries } from '../../shared/src/registry';
export function dataRoute(request: Request): Response | undefined {
  const url = new URL(request.url);
  if (url.pathname === '/movies' && request.method === 'GET') {
    const source = registries.movie.sources[0];
    if (!source) return new Response(null, { status: 500 });
    const query = validateQuery(
      JSON.parse(url.searchParams.get('query') ?? '{"filters":[],"sort":[]}'),
      source,
    );
    const offset = Number(url.searchParams.get('cursor') ?? '0');
    if (!Number.isInteger(offset) || offset < 0 || offset > 500)
      return new Response(null, { status: 400 });
    const filtered = filterRows(movies, query);
    const items = filtered.slice(offset, offset + source.pageSize);
    const next = offset + items.length;
    return Response.json({
      items,
      totalCount: filtered.length,
      nextCursor: next < filtered.length ? String(next) : null,
      complete: next >= filtered.length,
    });
  }
  if (url.pathname === '/tasks' && request.method === 'GET')
    return Response.json(tasks);
  if (
    /^\/tasks\/[^/]+\/complete$/.test(url.pathname) &&
    request.method === 'POST'
  ) {
    const id = decodeURIComponent(url.pathname.split('/')[2] ?? '');
    const task = tasks.find((row) => row.id === id);
    if (!task) return new Response(null, { status: 404 });
    task.completed = true;
    return Response.json(task);
  }
  return undefined;
}
