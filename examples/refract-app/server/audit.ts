import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
/** Opt-in local test evidence. Never records HTTP headers or environment variables. */
export function auditedFetch(directory: string | undefined): typeof fetch {
  let sequence = 0;
  return async (url, init) => {
    const started = Date.now();
    const id = `${started}-${++sequence}`;
    const payload = JSON.parse(String(init?.body)) as Record<string, unknown>;
    const save = async (value: unknown) => {
      if (!directory) return;
      await mkdir(directory, { recursive: true });
      await writeFile(
        resolve(directory, `model-${id}.json`),
        JSON.stringify(value, null, 2) + '\n',
      );
    };
    try {
      const response = await fetch(url, init);
      // The endpoint returns bounded non-streaming JSON. Audit is local test support only.
      const result: unknown = await response.clone().json();
      await save({
        model: payload.model,
        reasoningEffort: payload.reasoning_effort,
        maxCompletionTokens: payload.max_completion_tokens,
        elapsedMs: Date.now() - started,
        status: response.status,
        request: payload.messages,
        response: result,
      });
      return response;
    } catch (error) {
      await save({
        model: payload.model,
        reasoningEffort: payload.reasoning_effort,
        elapsedMs: Date.now() - started,
        error: error instanceof Error ? error.name : 'Request failed',
      });
      throw error;
    }
  };
}
