import type { CapabilityRegistry } from '../schema/registry';
import { actionProposalSchema } from '../schema/data-plan';
import { invariant, boundedJson } from '../schema/primitives';
import { validateValues } from '../validation/values';

export function validateActionProposal(
  input: unknown,
  registry: CapabilityRegistry,
  revision: number,
  targets: string[],
) {
  boundedJson(input);
  const proposal = actionProposalSchema.parse(input);
  invariant(
    proposal.registryRevision === registry.revision &&
      proposal.baseRevision === revision,
    'Action proposal is stale',
    'STALE_ACTION',
  );
  invariant(
    targets.includes(proposal.surfaceId),
    'Action targets another surface',
  );
  const surface = registry.surfaces.find(
    (item) => item.id === proposal.surfaceId,
  );
  const action = registry.actions.find((item) => item.id === proposal.actionId);
  invariant(
    action &&
      surface?.policy?.operations.includes('actions') &&
      surface.policy.actionIds.includes(action.id),
    'Action is unavailable on this surface',
  );
  validateValues(proposal.arguments, action.arguments, action.title);
  return { proposal, action };
}
