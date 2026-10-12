import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import {
  createMemoryRateLimit,
  createPlannerHandler,
  createOpenAIProvider,
  type ModelProvider,
  type PlannerHandlerOptions,
} from '@customitin/server';
import { registries } from '../../shared/src/registry';
import { demoPlan } from '../../shared/src/demo-planner';
import type { DemoKind } from '../../shared/src/data';
import { dataRoute } from './data-routes';
const demo = process.argv.includes('--demo');
if (demo && process.env.NODE_ENV === 'production')
  throw new Error('Demo access is disabled in production');
async function authentication(): Promise<
  PlannerHandlerOptions['authenticate']
> {
  if (demo)
    return async () => ({
      subject: 'local-development',
      appIds: Object.values(registries).map((r) => r.appId),
    });
  const file = process.env.CUSTOMITIN_AUTH_MODULE;
  if (!file)
    throw new Error(
      'Set CUSTOMITIN_AUTH_MODULE to a server-only module exporting authenticate(request).',
    );
  const module = (await import(pathToFileURL(file).href)) as {
    authenticate?: PlannerHandlerOptions['authenticate'];
  };
  if (typeof module.authenticate !== 'function')
    throw new Error('Authentication module must export authenticate');
  return module.authenticate;
}
const provider: ModelProvider = demo
  ? {
      async generate({ request }) {
        return demoPlan(
          request.appId.replace('-demo', '') as DemoKind,
          request,
        );
      },
    }
  : createOpenAIProvider({
      apiKey: process.env.OPENAI_API_KEY ?? '',
      model: process.env.CUSTOMITIN_MODEL ?? '',
    });
const handler = createPlannerHandler({
  manifests: Object.values(registries),
  provider,
  authenticate: await authentication(),
  allowRequest: createMemoryRateLimit(),
});
const server = createServer(async (incoming, outgoing) => {
  const origin = incoming.headers.origin;
  const allowedOrigin =
    process.env.CUSTOMITIN_WEB_ORIGIN ?? 'http://localhost:8081';
  if (origin && origin === allowedOrigin) {
    outgoing.setHeader('Access-Control-Allow-Origin', origin);
    outgoing.setHeader('Vary', 'Origin');
    outgoing.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization',
    );
    outgoing.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  }
  if (incoming.method === 'OPTIONS') {
    outgoing.writeHead(origin === allowedOrigin ? 204 : 403);
    outgoing.end();
    return;
  }
  const controller = new AbortController();
  incoming.on('aborted', () => controller.abort());
  outgoing.on('close', () => {
    if (!outgoing.writableEnded) controller.abort();
  });
  try {
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of incoming) {
      const data = Buffer.from(chunk as Uint8Array);
      size += data.length;
      if (size > 64_000) {
        outgoing.writeHead(413);
        outgoing.end();
        return;
      }
      chunks.push(data);
    }
    const headers = new Headers();
    for (const [key, value] of Object.entries(incoming.headers))
      if (value)
        headers.set(key, Array.isArray(value) ? value.join(',') : value);
    const method = incoming.method ?? 'GET';
    const request = new Request(`http://127.0.0.1${incoming.url ?? '/'}`, {
      method,
      headers,
      signal: controller.signal,
      ...(['GET', 'HEAD'].includes(method)
        ? {}
        : { body: Buffer.concat(chunks) }),
    });
    const response =
      new URL(request.url).pathname === '/plan'
        ? await handler(request)
        : demo
          ? (dataRoute(request) ?? new Response('Not found', { status: 404 }))
          : new Response('Not found', { status: 404 });
    outgoing.writeHead(response.status, Object.fromEntries(response.headers));
    outgoing.end(await response.text());
  } catch {
    outgoing.writeHead(400);
    outgoing.end('Invalid request');
  }
});
server.requestTimeout = 30_000;
server.headersTimeout = 10_000;
server.listen(Number(process.env.PORT ?? 4318), '127.0.0.1', () =>
  console.log(
    `Customitin ${demo ? 'DEMO' : 'authenticated'} planner: http://127.0.0.1:${process.env.PORT ?? 4318}/plan`,
  ),
);
