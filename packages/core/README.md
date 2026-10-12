# @customitin/core

Framework-independent schemas, query validation, profile validation, atomic configuration operations and migration helpers for Customitin. Functional 0.1 alpha; not yet published.

Start with the [bundled AI guides](dist/docs/index.md) or [repository guides](../../docs/ai/index.md). Prefer deriving a registry with the CLI over duplicating app types manually.

CapabilityRegistry describes approved sources, components, surfaces, destinations, theme tokens and limits. Runtime code/functions/credentials never belong in the registry. Source descriptors define field rules, permitted operators, completeness, row budgets and optional detail destinations. Item components may declare sourceIds to restrict compatible sources.

SourceAdapter.query receives a validated query plus host-controlled scope/session/cancellation context. createLocalSource requires a complete bounded repository. Partial caches cannot claim complete filtering/grouping/counts. Paginated hosts must filter/sort before pagination.

applyProposal validates revisions, applies the complete operation set to a copy, and validates the resulting profile. Required nodes/protected destinations remain available. Saved-view queries and renderer/source compatibility are enforced. Changes become active through the React Native runtime only after persistence succeeds.

Core has no React Native, AI-provider, server, database or application-domain dependency. Keep domain rules in host adapters. See docs/extensions.md in the repository for the full extension contracts.
