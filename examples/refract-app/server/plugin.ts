import { randomBytes } from 'node:crypto';
import type { Plugin } from 'vite';
import { localPlanner } from './planner';
/** Loopback-only development backend. Deploy a real authenticated server for production. */
export function refractPlannerPlugin(): Plugin {
  return {
    name: 'refract-local-planner',
    apply: 'serve',
    async configureServer(server) {
      const session = randomBytes(32).toString('hex');
      const plan = await localPlanner(server.config.root, session);
      server.middlewares.use(async (incoming, outgoing, next) => {
        if (!incoming.url?.startsWith('/api/')) return next();
        const host = incoming.headers.host ?? '';
        const origin = incoming.headers.origin;
        if (
          !/^127\.0\.0\.1:\d+$/.test(host) ||
          (origin && origin !== `http://${host}`)
        ) {
          outgoing.writeHead(403);
          outgoing.end();
          return;
        }
        if (incoming.url === '/api/session' && incoming.method === 'GET') {
          outgoing.setHeader(
            'Set-Cookie',
            `refract-session=${session}; HttpOnly; SameSite=Strict; Path=/api`,
          );
          outgoing.setHeader('Cache-Control', 'no-store');
          outgoing.writeHead(204);
          outgoing.end();
          return;
        }
        if (incoming.url !== '/api/plan' || incoming.method !== 'POST') {
          outgoing.writeHead(404);
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
            const bytes = Buffer.from(chunk as Uint8Array);
            size += bytes.length;
            if (size > 64_000) {
              outgoing.writeHead(413);
              outgoing.end();
              return;
            }
            chunks.push(bytes);
          }
          const response = await plan(
            new Request(`http://${host}/api/plan`, {
              method: 'POST',
              headers: {
                'Content-Type': incoming.headers['content-type'] ?? '',
                Cookie: incoming.headers.cookie ?? '',
              },
              body: Buffer.concat(chunks),
              signal: controller.signal,
            }),
          );
          outgoing.writeHead(
            response.status,
            Object.fromEntries(response.headers),
          );
          outgoing.end(await response.text());
        } catch {
          outgoing.writeHead(500);
          outgoing.end('Local planner unavailable');
        }
      });
    },
  };
}
