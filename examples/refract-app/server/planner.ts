import { loadEnvFile } from 'node:process';
import { resolve } from 'node:path';
import { readFile } from 'node:fs/promises';
import { registrySchema } from '@customitin/core';
import {
  createOpenAIProvider,
  createPlannerHandler,
  createMemoryRateLimit,
} from '@customitin/server';
import { auditedFetch } from './audit';
export async function localPlanner(root: string, session: string) {
  if (process.env.NODE_ENV === 'production')
    throw new Error('The Refract local planner must not run in production.');
  try {
    loadEnvFile(process.env.REFRACT_ENV_FILE ?? resolve(root, '../../.env'));
  } catch {
    /* An existing process environment is also supported. */
  }
  const registry = registrySchema.parse(
    JSON.parse(
      await readFile(resolve(root, 'personalize/server-manifest.json'), 'utf8'),
    ),
  );
  if (!process.env.OPENAI_API_KEY)
    throw new Error('OPENAI_API_KEY is required in the server environment.');
  const provider = createOpenAIProvider({
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-6.1-sol',
    reasoningEffort: 'xhigh',
    maxTokens: 32768,
    fetch: auditedFetch(process.env.REFRACT_AUDIT_DIR),
  });
  return createPlannerHandler({
    manifests: [registry],
    provider,
    timeoutMs: 290_000,
    authenticate: async (request) =>
      request.headers
        .get('cookie')
        ?.split(';')
        .some((part) => part.trim() === `refract-session=${session}`)
        ? { subject: 'local-refract-tester', appIds: [registry.appId] }
        : null,
    allowRequest: createMemoryRateLimit({ requests: 12, windowMs: 3_600_000 }),
  });
}
