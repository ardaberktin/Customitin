import {
  actionProposalSchema,
  validateActionProposal,
  validateValues,
  invariant,
  throwIfAborted,
  type ActionContext,
  type ActionBinding,
  type Scalar,
} from '@customitin/core';
import {
  executionEnvelope,
  executionHandler,
  type ExecutionOptions,
} from './execution-common';
const actionRequest = executionEnvelope
  .extend({ proposal: actionProposalSchema })
  .strict();
export function createActionHandler(
  options: ExecutionOptions & {
    actions: Record<string, ActionBinding>;
    /** Must atomically deduplicate and persist results in the application's durable backend store. */
    idempotent(
      key: string,
      execute: () => Promise<Record<string, Scalar>>,
    ): Promise<Record<string, Scalar>>;
  },
) {
  return executionHandler(options, async (body, principal, signal) => {
    const request = actionRequest.parse(body);
    const registry = options.manifests.find(
      (item) =>
        item.appId === request.appId &&
        item.revision === request.registryRevision,
    );
    invariant(registry, 'Registry is unavailable');
    const host = await options.context(principal, request.appId);
    const { proposal, action } = validateActionProposal(
      request.proposal,
      registry,
      host.revision,
      [request.surfaceId],
    );
    const binding = options.actions[action.id];
    invariant(binding, 'Action handler is unavailable');
    const context: ActionContext = {
      ...host,
      signal,
      appId: registry.appId,
      proposal,
      idempotencyKey: JSON.stringify([
        request.appId,
        principal.subject,
        host.scope,
        proposal.requestId,
      ]),
    };
    if (binding.available)
      invariant(
        await binding.available(proposal.arguments, context),
        'Action is unavailable',
      );
    const outcome = await options.idempotent(
      context.idempotencyKey,
      async () => {
        throwIfAborted(signal);
        const latest = await options.context(principal, request.appId);
        invariant(
          latest.scope === host.scope,
          'Account changed before action dispatch',
        );
        validateActionProposal(proposal, registry, latest.revision, [
          request.surfaceId,
        ]);
        throwIfAborted(signal);
        const currentContext = {
          ...context,
          ...latest,
          signal,
        };
        if (binding.available)
          invariant(
            await binding.available(proposal.arguments, currentContext),
            'Action is unavailable',
          );
        throwIfAborted(signal);
        const result = await binding.execute(
          proposal.arguments,
          currentContext,
        );
        throwIfAborted(signal);
        validateValues(result, action.result, 'Action result');
        return result;
      },
    );
    validateValues(outcome, action.result, 'Action result');
    return outcome;
  });
}
