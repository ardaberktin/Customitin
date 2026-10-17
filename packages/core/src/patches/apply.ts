import {
  proposalSchema,
  type LayoutNode,
  type Profile,
  type Proposal,
} from '../schema/configuration';
import { boundedJson, invariant } from '../schema/primitives';
import type { CapabilityRegistry } from '../schema/registry';
import { validateProfile } from '../validation/profile';

export function applyProposal(
  current: Profile,
  input: unknown,
  registry: CapabilityRegistry,
  allocateId?: () => string,
): Profile {
  boundedJson(input);
  const proposal = proposalSchema.parse(input);
  invariant(
    proposal.baseRevision === current.revision,
    'Your space changed. Please preview again.',
    'STALE_REVISION',
  );
  invariant(
    proposal.registryRevision === registry.revision &&
      current.registryRevision === registry.revision,
    'Application capabilities changed',
    'REGISTRY_MISMATCH',
  );
  const next = JSON.parse(JSON.stringify(current)) as Profile;
  for (const change of proposal.operations) {
    switch (change.op) {
      case 'setDataView':
        next.dataViews = [
          ...(next.dataViews ?? []).filter(
            (view) => view.id !== change.view.id,
          ),
          change.view,
        ];
        break;
      case 'removeDataView':
        next.dataViews = (next.dataViews ?? []).filter(
          (view) => view.id !== change.viewId,
        );
        break;
      case 'setThemeTokens':
        next.theme = { ...next.theme, ...change.tokens };
        break;
      case 'setSurfaceLayout':
        next.surfaces[change.surfaceId] = change.nodes;
        break;
      case 'createView':
        invariant(
          !next.views.some((v) => v.id === change.view.id),
          'Saved view already exists',
        );
        next.views.push(change.view);
        break;
      case 'updateView': {
        const index = next.views.findIndex((v) => v.id === change.view.id);
        invariant(index >= 0, 'Saved view no longer exists');
        next.views[index] = change.view;
        break;
      }
      case 'removeView':
        invariant(
          next.views.some((v) => v.id === change.viewId),
          'Saved view no longer exists',
        );
        next.views = next.views.filter((v) => v.id !== change.viewId);
        break;
      case 'setNavigationPlacements':
        next.navigation = change.placements;
        break;
    }
  }
  next.revision++;
  validateProfile(next, registry);
  if (allocateId) {
    const ids = new Map(
      proposal.operations
        .filter((op) => op.op === 'createView')
        .map((op) => [op.view.id, allocateId()]),
    );
    const renameNodes = (nodes: LayoutNode[]): LayoutNode[] =>
      nodes.map((node) => ({
        ...node,
        ...(node.viewId ? { viewId: ids.get(node.viewId) ?? node.viewId } : {}),
        children: renameNodes(node.children),
      }));
    next.views = next.views.map((view) => ({
      ...view,
      id: ids.get(view.id) ?? view.id,
    }));
    next.navigation = next.navigation.map((p) => ({
      ...p,
      id: p.target === 'view' ? (ids.get(p.id) ?? p.id) : p.id,
    }));
    next.surfaces = Object.fromEntries(
      Object.entries(next.surfaces).map(([id, nodes]) => [
        id,
        renameNodes(nodes),
      ]),
    );
  }
  return validateProfile(next, registry);
}
export function makeProposal(
  profile: Profile,
  operations: Proposal['operations'],
  requestId: string,
  summary: string,
): Proposal {
  return {
    requestId,
    baseRevision: profile.revision,
    registryRevision: profile.registryRevision,
    operations,
    summary,
  };
}
