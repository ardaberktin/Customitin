# @customitin/server

Developer-owned planner, remote data and action handlers for Customitin v2. Supply approved manifests, authentication, usage policy and host-owned services. Unknown revisions and unavailable surfaces/fields/actions are rejected.

createPlannerHandler reduces metadata to requested surfaces, validates model responses and allows one bounded repair attempt. OpenAI/Anthropic REST adapters keep model keys on the backend. No source rows or action results enter model context automatically.

createDataHandler validates explicit remote query plans and output. createActionHandler requires trusted scope/revision lookup and a durable idempotency adapter. Domain handlers own record authorization and business logic. Client confirmation is not backend authorization; cancellation after dispatch does not prove that a mutation was rolled back.

See the [bundled contracts](dist/docs/contracts.md) and [integration guide](dist/docs/integration.md). Deploy matching manifests, HTTPS and shared quotas. Live-model and authenticated deployment validation remain separate release checks. Locally distributed alpha.
