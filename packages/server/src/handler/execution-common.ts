import { z } from 'zod';
import { idSchema, type CapabilityRegistry } from '@customitin/core';
import { readBoundedBody, withDeadline } from '../providers/provider';
import type { Principal } from './planner';

export interface ExecutionOptions {
  manifests: CapabilityRegistry[];
  authenticate(request: Request): Promise<Principal | null>;
  allowRequest(subject: string, appId: string): Promise<boolean>;
  /** Resolve account context/revision from trusted host state, never the request payload. */
  context(
    principal: Principal,
    appId: string,
  ): Promise<{ scope: string; session?: unknown; revision: number }>;
}
export const executionEnvelope = z.object({
  appId: idSchema,
  registryRevision: idSchema,
  surfaceId: idSchema,
});
const response = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

export function executionHandler(
  options: ExecutionOptions,
  execute: (
    body: unknown,
    principal: Principal,
    signal: AbortSignal,
  ) => Promise<unknown>,
) {
  return async (request: Request) => {
    if (request.method !== 'POST')
      return response({ code: 'METHOD_NOT_ALLOWED' }, 405);
    if (!request.headers.get('content-type')?.startsWith('application/json'))
      return response({ code: 'JSON_REQUIRED' }, 415);
    try {
      return await withDeadline(
        async (signal) => {
          const principal = await options.authenticate(request);
          if (!principal) return response({ code: 'UNAUTHENTICATED' }, 401);
          const body: unknown = JSON.parse(
            await readBoundedBody(request, 64000),
          );
          const parsed = executionEnvelope.parse(body);
          if (!principal.appIds.includes(parsed.appId))
            return response({ code: 'FORBIDDEN' }, 403);
          if (!(await options.allowRequest(principal.subject, parsed.appId)))
            return response({ code: 'RATE_LIMITED' }, 429);
          return response(await execute(body, principal, signal));
        },
        request.signal,
        30000,
      );
    } catch {
      return response({ code: 'EXECUTION_REJECTED' }, 422);
    }
  };
}
