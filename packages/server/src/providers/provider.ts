import type { CapabilityRegistry, PlannerRequest } from '@customitin/core';
export interface PlanningInput {
  request: PlannerRequest;
  registry: CapabilityRegistry;
  repair?: string;
}
export interface ModelProvider {
  generate(input: PlanningInput, signal: AbortSignal): Promise<unknown>;
}
export async function readBoundedBody(
  response: Response | Request,
  maxBytes: number,
): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return '';
  const decoder = new TextDecoder();
  let body = '';
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) throw new Error('Body exceeded its limit');
      body += decoder.decode(value, { stream: true });
    }
    return body + decoder.decode();
  } finally {
    await reader.cancel();
    reader.releaseLock();
  }
}
export async function withDeadline<T>(
  work: (signal: AbortSignal) => Promise<T>,
  parent: AbortSignal,
  milliseconds: number,
): Promise<T> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  parent.addEventListener('abort', abort, { once: true });
  if (parent.aborted) controller.abort();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work(controller.signal),
      new Promise<never>((_, reject) => {
        const fail = () => reject(new Error('Request cancelled or timed out'));
        controller.signal.addEventListener('abort', fail, { once: true });
        if (controller.signal.aborted) fail();
        timer = setTimeout(() => controller.abort(), milliseconds);
      }),
    ]);
  } finally {
    clearTimeout(timer);
    parent.removeEventListener('abort', abort);
    controller.abort();
  }
}
