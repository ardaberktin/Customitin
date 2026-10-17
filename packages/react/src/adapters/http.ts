import { throwIfAborted } from '@customitin/core';
import { plannerResponseSchema } from '@customitin/core';
import type { PlannerTransport } from '@customitin/core';
export function createHttpPlanner(options: {
  url: string;
  getHeaders: () => Promise<Record<string, string>>;
  allowLocalhost?: boolean;
}): PlannerTransport {
  const url = new URL(options.url);
  if (
    url.protocol !== 'https:' &&
    !(
      options.allowLocalhost &&
      ['localhost', '127.0.0.1', '10.0.2.2'].includes(url.hostname)
    )
  )
    throw new Error('Planner endpoint must use HTTPS');
  return {
    async plan(request, signal) {
      const headers = await options.getHeaders();
      throwIfAborted(signal);
      const response = await fetch(options.url, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        signal,
      });
      if (!response.ok) throw new Error('Planner is unavailable');
      const body = await response.text();
      if (body.length > 64_000) throw new Error('Planner response too large');
      return plannerResponseSchema.parse(JSON.parse(body));
    },
  };
}
