import { planningContext } from '../providers/context';
import {
  applyProposal,
  boundedJson,
  plannerRequestSchema,
  plannerResponseSchema,
  validateProfile,
  validatePlanningTarget,
  validateActionProposal,
  type CapabilityRegistry,
  type PlannerRequest,
} from '@customitin/core';
import {
  readBoundedBody,
  withDeadline,
  type ModelProvider,
} from '../providers/provider';
export interface Principal {
  subject: string;
  appIds: string[];
}
export interface PlannerHandlerOptions {
  manifests: CapabilityRegistry[];
  provider: ModelProvider;
  authenticate(request: Request): Promise<Principal | null>;
  allowRequest(subject: string, appId: string): Promise<boolean>;
  timeoutMs?: number;
}
const json = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
function currentProfile(request: PlannerRequest) {
  return {
    ...request.configuration,
    schemaVersion: 2 as const,
    scope: 'server-validation',
    registryRevision: request.registryRevision,
    revision: request.baseRevision,
    name: 'Validation',
  };
}
export function createPlannerHandler(
  options: PlannerHandlerOptions,
): (request: Request) => Promise<Response> {
  if (!options.authenticate || !options.allowRequest)
    throw new Error('Authentication and usage policy are required');
  const timeoutMs = options.timeoutMs ?? 20_000;
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 300_000)
    throw new Error('timeoutMs must be an integer between 1 and 300000');
  return async (httpRequest) => {
    if (httpRequest.method !== 'POST')
      return json({ kind: 'rejected', message: 'Use POST.' }, 405);
    try {
      const principal = await withDeadline(
        () => options.authenticate(httpRequest),
        httpRequest.signal,
        5000,
      );
      if (!principal)
        return json(
          { kind: 'rejected', message: 'Please sign in again.' },
          401,
        );
      if (
        !httpRequest.headers.get('content-type')?.startsWith('application/json')
      )
        return json({ kind: 'rejected', message: 'JSON is required.' }, 415);
      const contentLength = Number(
        httpRequest.headers.get('content-length') ?? '0',
      );
      if (contentLength > 64_000)
        return json(
          { kind: 'rejected', message: 'This request is too large.' },
          413,
        );
      let request: PlannerRequest;
      try {
        request = plannerRequestSchema.parse(
          JSON.parse(
            await withDeadline(
              () => readBoundedBody(httpRequest, 64_000),
              httpRequest.signal,
              5000,
            ),
          ),
        );
      } catch {
        return json(
          {
            kind: 'rejected',
            message: 'This request is invalid or too large.',
          },
          400,
        );
      }
      if (!principal.appIds.includes(request.appId))
        return json(
          { kind: 'rejected', message: 'This application is unavailable.' },
          403,
        );
      if (!(await options.allowRequest(principal.subject, request.appId)))
        return json(
          {
            kind: 'retryable-error',
            message: 'Please wait before asking again.',
          },
          429,
        );
      const registry = options.manifests.find(
        (m) =>
          m.appId === request.appId && m.revision === request.registryRevision,
      );
      if (!registry)
        return json(
          {
            kind: 'rejected',
            message:
              'Update the app or planner connection before trying again.',
          },
          409,
        );
      const profile = currentProfile(request);
      try {
        validateProfile(profile, registry);
        if (
          request.surfaceId &&
          request.surfaceIds &&
          !request.surfaceIds.includes(request.surfaceId)
        )
          throw new Error('Conflicting planning targets');
        validatePlanningTarget(
          registry,
          request.surfaceIds ?? request.surfaceId,
        );
      } catch {
        return json(
          { kind: 'rejected', message: 'Your layout needs to be refreshed.' },
          422,
        );
      }
      const result = await withDeadline(
        async (signal) => {
          for (let attempt = 0; attempt < 2; attempt++) {
            const output = await options.provider.generate(
              {
                ...planningContext(registry, request),
                ...(attempt
                  ? {
                      repair:
                        'The prior response failed validation. Check schema, references, query operators, required controls and exact revisions. Return unsupported if the request cannot be satisfied.',
                    }
                  : {}),
              },
              signal,
            );
            try {
              boundedJson(output);
              const response = plannerResponseSchema.parse(output);
              if (response.kind === 'proposal') {
                if (response.proposal.requestId !== request.requestId)
                  throw new Error('Request mismatch');
                applyProposal(profile, response.proposal, registry);
                validatePlanningTarget(
                  registry,
                  request.surfaceIds ?? request.surfaceId,
                  response.proposal.operations,
                  profile,
                );
              }
              if (response.kind === 'action-proposal') {
                if (response.proposal.requestId !== request.requestId)
                  throw new Error('Request mismatch');
                validateActionProposal(
                  response.proposal,
                  registry,
                  request.baseRevision,
                  request.surfaceIds ??
                    (request.surfaceId ? [request.surfaceId] : []),
                );
              }
              return response;
            } catch {
              if (attempt === 1)
                return {
                  kind: 'rejected' as const,
                  message:
                    'That change is unavailable. Your current space is unchanged.',
                };
            }
          }
          throw new Error('Planning failed');
        },
        httpRequest.signal,
        timeoutMs,
      );
      return json(result);
    } catch {
      return json(
        {
          kind: 'retryable-error',
          message:
            'The assistant is temporarily unavailable. Your saved space still works.',
        },
        503,
      );
    }
  };
}
