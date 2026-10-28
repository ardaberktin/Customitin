import { describe, expect, it, vi } from 'vitest';
import { createOpenAIProvider, createPlannerHandler } from '@customitin/server';
import { createProfile, type PlannerRequest } from '@customitin/core';
import { registries } from '../examples/shared/src/registry';
const registry = registries.recipe;
const profile = createProfile(registry, 'local');
const request: PlannerRequest = {
  appId: registry.appId,
  requestId: 'reasoning-test',
  registryRevision: registry.revision,
  baseRevision: 0,
  instruction: 'Help me arrange Home.',
  surfaceIds: ['home'],
  configuration: {
    theme: profile.theme,
    surfaces: profile.surfaces,
    views: [],
    navigation: profile.navigation,
  },
};
const input = { registry, request };
describe('reasoning model configuration', () => {
  it('forwards the exact model and effort without silently reducing the completion budget', async () => {
    const transport = vi.fn<typeof fetch>(async (_url, init) => {
      expect(JSON.parse(String(init?.body))).toMatchObject({
        model: 'gpt-6.1-sol',
        reasoning_effort: 'xhigh',
        max_completion_tokens: 32768,
      });
      return Response.json({
        choices: [
          {
            message: {
              content: '{"kind":"clarification","message":"Which group?"}',
            },
          },
        ],
      });
    });
    const provider = createOpenAIProvider({
      apiKey: 'test-secret',
      model: 'gpt-6.1-sol',
      reasoningEffort: 'xhigh',
      maxTokens: 32768,
      fetch: transport,
    });
    expect(
      await provider.generate(input, new AbortController().signal),
    ).toEqual({ kind: 'clarification', message: 'Which group?' });
    expect(transport).toHaveBeenCalledTimes(1);
  });
  it('leaves provider defaults intact when effort is omitted and rejects invalid budgets', async () => {
    const transport: typeof fetch = async (_url, init) => {
      expect(JSON.parse(String(init?.body))).not.toHaveProperty(
        'reasoning_effort',
      );
      return Response.json({ choices: [{ message: { content: '{}' } }] });
    };
    await createOpenAIProvider({
      apiKey: 'test',
      model: 'configured',
      fetch: transport,
    }).generate(input, new AbortController().signal);
    for (const maxTokens of [0, -1, 1.5, Infinity, NaN, 65537])
      expect(() =>
        createOpenAIProvider({
          apiKey: 'test',
          model: 'configured',
          maxTokens,
        }),
      ).toThrow('maxTokens');
  });
  it('honors an explicit deadline longer than 30 seconds and still cancels at the bound', async () => {
    vi.useFakeTimers();
    try {
      let signal: AbortSignal | undefined;
      const handler = createPlannerHandler({
        manifests: [registry],
        timeoutMs: 120_000,
        authenticate: async () => ({
          subject: 'local',
          appIds: [registry.appId],
        }),
        allowRequest: async () => true,
        provider: {
          generate: (_input, incoming) => {
            signal = incoming;
            return new Promise(() => {});
          },
        },
      });
      const pending = handler(
        new Request('https://test.example/plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
        }),
      );
      await vi.advanceTimersByTimeAsync(31_000);
      expect(signal?.aborted).toBe(false);
      await vi.advanceTimersByTimeAsync(120_000);
      expect((await pending).status).toBe(503);
      expect(signal?.aborted).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
  it('rejects unbounded or invalid planner timeouts', () => {
    for (const timeoutMs of [0, -1, 1.5, Infinity, NaN, 300001])
      expect(() =>
        createPlannerHandler({
          manifests: [registry],
          provider: { generate: async () => ({}) },
          authenticate: async () => null,
          allowRequest: async () => true,
          timeoutMs,
        }),
      ).toThrow('timeoutMs');
  });
});
