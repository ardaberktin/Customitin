# @customitin/server

Developer-owned stateless planner handler and OpenAI/Anthropic REST adapters. Functional 0.1 alpha; not yet published. Read the [bundled AI guides](dist/docs/index.md) or [repository guides](../../docs/ai/index.md), then the repository's docs/deployment.md.

createPlannerHandler accepts standard Web Request/Response. Supply immutable approved capability manifests, verified-session authenticate(request), an allowRequest(subject, appId) usage policy, and a ModelProvider. Deploy manifests matching each supported app revision. Unknown revisions are rejected.

Provider keys stay on the backend. Mobile uses createHttpPlanner with existing session headers. Model input contains the user instruction, current configuration and approved capabilities; host data records/session secrets are not included. User text and labels may still contain personal data.

The handler validates input/output, imposes bounded bodies and deadlines, and allows one repair after invalid model output. The host must provide ingress limits, HTTPS, production authentication and deployment-wide quotas. The bundled memory limiter is for a single process. Do not expose the loopback demo as a production service.

Successful schema validation does not prove semantic AI quality. Run live-provider evaluations with a budget and test the actual authenticated deployment before claiming production readiness.
