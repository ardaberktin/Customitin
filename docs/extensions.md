# Extending the headless SDK

The authoritative v2 extension contracts are in [AI contracts](ai/contracts.md). Keep application rules and executable adapters in host code.

- Components declare scalar props, typed data inputs, child acceptance and typed events. Register an adapter to the application's existing chart/table/list/container; install no prescribed UI library.
- Sources provide authorized data with stable IDs, field rules and explicit completeness. Cache contents alone never establish completeness.
- Surfaces grant approved operations/components/fields/actions and node limits. Compose, reorder and constrained-property modes have different structural guarantees.
- Relations approve compatible equality keys/cardinality. Formula/query trees are serializable and interpreted within budgets; remote execution is explicitly provided by the host.
- Actions reuse host services, authentication, availability and durable idempotency. They require separate execution and configured confirmation. Layout apply/undo has no domain mutation semantics.
- Planner transports use host endpoints and optional explicitly permitted scalar context. Source records, session objects and action results are not automatically model context.

See the [integration guide](ai/integration.md) and compiling examples under `examples/shared/src/headless`. The older fixed list/grid contract remains for compatible host-owned v1 configurations; new integrations use data views and input mappings. The previous shell/theme/editor implementation is in `examples/shared/src/ui`, outside SDK packages.
