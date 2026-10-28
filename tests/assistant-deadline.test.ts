import { describe, expect, it, vi } from 'vitest';
import {
  CustomizationRuntime,
  memoryStorage,
  type PlannerResponse,
} from '@customitin/core';
import { registries } from '../examples/shared/src/registry';
const registry = registries.recipe;
describe('client reasoning deadlines', () => {
  it('allows a long request, then honors cancellation and ignores its late response', async () => {
    vi.useFakeTimers();
    const signals: AbortSignal[] = [];
    let resolve: ((response: PlannerResponse) => void) | undefined;
    const runtime = new CustomizationRuntime({
      registry,
      storage: memoryStorage(),
      scope: 'local',
      plannerTimeoutMs: 120_000,
      planner: {
        plan: (_request, signal) => {
          signals.push(signal);
          return new Promise((done) => {
            resolve = done;
          });
        },
      },
    });
    try {
      await runtime.start();
      const pending = runtime.request('Change Home', ['home']);
      await vi.advanceTimersByTimeAsync(31_000);
      expect(runtime.getSnapshot().busy).toBe(true);
      expect(signals[0]?.aborted).toBe(false);
      runtime.cancelPreview();
      await pending;
      expect(signals[0]?.aborted).toBe(true);
      resolve?.({ kind: 'clarification', message: 'Late output' });
      await vi.advanceTimersByTimeAsync(1);
      expect(runtime.getSnapshot().message).not.toBe('Late output');
      expect(runtime.getSnapshot().preview).toBeUndefined();
      expect(runtime.getSnapshot().profile?.revision).toBe(0);
    } finally {
      runtime.dispose();
      vi.useRealTimers();
    }
  });
  it.each([undefined, 90_000])(
    'retains the default or configured deadline (%s)',
    async (plannerTimeoutMs) => {
      vi.useFakeTimers();
      const runtime = new CustomizationRuntime({
        registry,
        storage: memoryStorage(),
        scope: 'local',
        plannerTimeoutMs,
        planner: { plan: () => new Promise(() => {}) },
      });
      try {
        await runtime.start();
        const pending = runtime.request('Change Home', ['home']);
        await vi.advanceTimersByTimeAsync((plannerTimeoutMs ?? 30_000) - 1);
        expect(runtime.getSnapshot().busy).toBe(true);
        await vi.advanceTimersByTimeAsync(1);
        await pending;
        expect(runtime.getSnapshot()).toMatchObject({
          busy: false,
          code: 'PLANNING_CANCELLED',
        });
        expect(runtime.getSnapshot().profile?.revision).toBe(0);
      } finally {
        runtime.dispose();
        vi.useRealTimers();
      }
    },
  );
  it('rejects invalid client deadlines', () => {
    for (const plannerTimeoutMs of [0, -1, NaN, Infinity, 300001])
      expect(
        () =>
          new CustomizationRuntime({
            registry,
            storage: memoryStorage(),
            scope: 'local',
            plannerTimeoutMs,
          }),
      ).toThrow('plannerTimeoutMs');
  });
});
