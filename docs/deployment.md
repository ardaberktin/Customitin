# Developer-owned planner deployment

`createPlannerHandler` accepts and returns standard Web `Request`/`Response` objects. Supply:

1. Immutable server capability manifests generated from the same source as the mobile registry. Keep revisions for supported older builds. Unknown revisions return HTTP 409.
2. `authenticate(request)`, verifying the application's existing session. Return `{ subject, appIds }` from trusted verification, never from request JSON.
3. `allowRequest(subject, appId)`, enforcing spending/access policy. The bundled memory limiter is only for one-process deployments.
4. `createOpenAIProvider({ apiKey, model })`, `createAnthropicProvider({ apiKey, model })`, or your own `ModelProvider`. Both built-ins are server-only REST adapters. No provider SDK is imported by mobile code.

```ts
import { createPlannerHandler, createOpenAIProvider } from '@customitin/server';
const handler = createPlannerHandler({
  manifests: [reviewedManifest],
  authenticate: verifyExistingSession,
  allowRequest: consumeDeploymentQuota,
  provider: createOpenAIProvider({
    apiKey: process.env.OPENAI_API_KEY!,
    model: process.env.CUSTOMITIN_MODEL!,
  }),
});
export const POST = handler;
```

The `!` above is illustrative; validate configuration at server startup as the reference deployment does. Use a provider model supporting JSON chat output. Set budgets in the provider account. Maximum provider output defaults to 4096 tokens and is capped at 8192. A planner request has a 20-second total deadline (maximum configurable 30 seconds), a 64 KB body limit, and one validation repair attempt. Auth also has a deadline. No profile database is needed. Do not log prompts, configuration values, or provider errors containing credentials.

The reference Node server supports an absolute-path `CUSTOMITIN_AUTH_MODULE` exporting `authenticate`. It intentionally fails to start in live mode without that callback and server credentials. `--demo` works only outside production and listens on 127.0.0.1. Do not expose that demo through a public tunnel. A deployment wrapper must enforce ingress body/time limits before buffering and use HTTPS. Configure `CUSTOMITIN_WEB_ORIGIN` for the one allowed browser origin.

On mobile, use `createHttpPlanner({ url, getHeaders })` from the optional `/adapters` export. Fetch the existing session in `getHeaders`; never embed the model key or a reusable shared application secret. Supply `CustomizationProvider` a stable opaque local scope and change it immediately on logout/account switching. Host authorization and mandatory tenant filters remain inside source adapters.

The model receives the user instruction, current configuration, and approved capability descriptions. It receives no collection records, application source, auth token, local profile scope, or credentials. Labels and filter values can still be personal information. Review your provider's data policy.

REST references: [OpenAI Chat Completions](https://developers.openai.com/api/reference/resources/chat), [Anthropic Messages](https://docs.anthropic.com/en/api/messages). Live-provider semantic evaluation has not been performed without developer credentials.

## Headless v2 data and actions

The current contracts and profiles are v2. Deploy the exact matching approved manifest and retain older supported revisions as needed. Client planner requests include explicit `surfaceIds` (or one `surfaceId`); the server validates both target scope and returned operations and reduces model metadata to those surfaces. Optional host-permitted scalar context does not authorize a domain record.

`createDataHandler` accepts POST envelopes with appId, registryRevision, surfaceId, a remote data plan and optional cursor. Supply authenticate/allowRequest, a trusted account context lookup, and a RemoteDataAdapter. It validates plans/projections/completeness; the adapter must execute over the complete authorized dataset before aggregation/pagination and enforce database/service authorization.

`createActionHandler` accepts the same app/revision/surface envelope plus an action proposal. Supply trusted current scope/revision, registered action handlers and a durable idempotent(key, execute) adapter. That adapter must atomically deduplicate and retain outcomes across instances/restarts. Match request identity to the action/arguments in your durable store. Do not automatically retry a mutation after timeout; reconcile its result. The handler rechecks scope/revision immediately before dispatch. Host confirmation in the client is separate from backend authorization.

No domain endpoint, credential, durable database or deployment is created automatically. Developer-owned controls must show confirmation, failures and uncertain outcomes. Layout persistence/undo does not reverse actions. See [contracts](ai/contracts.md) and [release checks](ai/testing.md).
