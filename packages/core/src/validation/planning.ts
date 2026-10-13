import type { Operation } from '../schema/configuration';
import type { CapabilityRegistry } from '../schema/registry';
import { invariant } from '../schema/primitives';

/** A screen editor may affect only its layout and the declared shared theme. */
export function validatePlanningTarget(
  registry: CapabilityRegistry,
  surfaceId?: string,
  operations: Operation[] = [],
): void {
  if (!surfaceId) return;
  invariant(
    registry.surfaces.some((s) => s.id === surfaceId && s.kind === 'screen'),
    'Unknown existing screen',
  );
  invariant(
    operations.every(
      (op) =>
        op.op === 'setThemeTokens' ||
        (op.op === 'setSurfaceLayout' && op.surfaceId === surfaceId),
    ),
    'The proposal changes another screen or navigation',
  );
}
