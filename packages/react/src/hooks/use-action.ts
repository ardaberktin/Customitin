import { useSyncExternalStore } from 'react';
import {
  invariant,
  type ActionConfirmation,
  type Scalar,
} from '@customitin/core';
import { useCustomization } from '../provider/context';

export function useAction(surfaceId: string, actionId?: string) {
  const { runtime, registry, profile } = useCustomization();
  const state = useSyncExternalStore(
    runtime.actions.subscribe,
    runtime.actions.getSnapshot,
    runtime.actions.getSnapshot,
  );
  return {
    ...(state.proposal &&
    (state.proposal.surfaceId !== surfaceId ||
      (actionId && state.proposal.actionId !== actionId))
      ? { status: 'idle' as const }
      : state),
    propose(args: Record<string, Scalar>, summary: string) {
      if (!actionId || !profile)
        throw new Error('Select an action after customization has loaded');
      runtime.actions.propose({
        requestId: runtime.allocateId(),
        registryRevision: registry.revision,
        baseRevision: profile.revision,
        surfaceId,
        actionId,
        arguments: args,
        summary,
      });
    },
    execute(confirm?: ActionConfirmation) {
      invariant(
        state.proposal?.surfaceId === surfaceId &&
          (!actionId || state.proposal.actionId === actionId),
        'Action belongs to another surface',
      );
      return runtime.actions.execute(confirm);
    },
    cancel() {
      if (!state.proposal || state.proposal.surfaceId === surfaceId)
        runtime.actions.cancel();
    },
  };
}
