import {
  dataPlanSchema,
  validateDataPlan,
  validateDataResult,
  invariant,
  throwIfAborted,
  type RemoteDataAdapter,
} from '@customitin/core';
import { z } from 'zod';
import {
  executionEnvelope,
  executionHandler,
  type ExecutionOptions,
} from './execution-common';
const dataRequest = executionEnvelope
  .extend({ plan: dataPlanSchema, cursor: z.string().max(500).optional() })
  .strict();
export function createDataHandler(
  options: ExecutionOptions & { adapter: RemoteDataAdapter },
) {
  return executionHandler(options, async (body, principal, signal) => {
    const request = dataRequest.parse(body);
    const registry = options.manifests.find(
      (item) =>
        item.appId === request.appId &&
        item.revision === request.registryRevision,
    );
    invariant(registry, 'Registry is unavailable');
    const { plan, fields } = validateDataPlan(
      request.plan,
      registry,
      request.surfaceId,
    );
    invariant(plan.execution === 'remote', 'Remote execution must be explicit');
    const context = await options.context(principal, request.appId);
    const result = await options.adapter.execute(
      plan,
      {
        ...context,
        signal,
        appId: registry.appId,
        registryRevision: registry.revision,
        surfaceId: request.surfaceId,
      },
      request.cursor,
    );
    throwIfAborted(signal);
    return validateDataResult(result, fields, 10000, request.cursor);
  });
}
