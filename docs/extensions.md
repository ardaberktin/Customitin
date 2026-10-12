# Extension contracts

## Source adapter

A `SourceAdapter` has serializable `descriptor`, `query(query, context, cursor?)`, and optional `subscribeInvalidation(listener)`. The context contains the host session, opaque local scope and cancellation signal. It is never model-controlled. Apply authorization and mandatory tenant restrictions in the host client. Support stable IDs, deduplicate pages, and cancel work when signaled. Runtime concurrency follows `registry.limits.sources`.

A complete source must return every matching row within its declared row budget, with `complete: true` and no cursor. `createLocalSource` validates completeness before filtering. A paginated source must filter/sort remotely before applying its cursor. `totalCount` is the total matching count, not loaded page count. A partial cache cannot expose personal filters/sorts, global grouping or a fabricated complete count. Remote grouping is intentionally unavailable in this alpha; supply a complete supported repository or a reviewed future aggregate capability.

## Components and appearance

Declare component kind, validated props, children policy and provenance in the registry. Supply host components and item renderers through `RuntimeBindings`; executable functions stay out of planner metadata. An item renderer receives the approved row, title/subtitle, density and existing detail callback. Item component descriptors can include sourceIds to restrict them to compatible collections; validateView enforces that restriction. Only registered destinations receive navigation callbacks. Generic nodes support stack, text, host section, collection, summary and shortcut. Required nodes are preserved exactly.

`usePersonalTheme` supports the documented SDK tokens: `appearance.mode`, `type.scale`, `layout.density`, `shape.radius`, and static/reduced motion. Color values are constrained to the two reviewed palettes. To connect an existing theme system, read `useRenderedProfile().theme` in the host theme bridge and map only registered tokens. State which consumers are connected; wrapping the app does not migrate styles automatically.

## Storage

Pass `StorageAdapter` with async getItem/setItem/removeItem. A single setItem must replace one value atomically. Multi-key atomicity is not assumed. Namespace is app ID + schema version + encoded local scope. The store serializes writes, saves a prior valid record, verifies new bytes, and restores the backup after corruption. It keeps up to 20 previous profiles. Failed saves do not activate the preview. Scope switches clear active state and cancel old work. Undo advances the revision; it never reuses old revision numbers.

`asyncStorageAdapter(AsyncStorage)` adds no required native dependency. AsyncStorage is unencrypted. Use encrypted host storage for sensitive labels/filter values. Memory storage is for preview/tests only. Persisted schemas newer than supported are rejected; registry changes disable whole incompatible views rather than removing a restrictive filter. Original bytes are untouched during loading/reconciliation. Unknown structural schema versions fall back to a recoverable profile; version 1 is the first supported structure.

## Navigation

`createNavigationAdapter` validates registered destination IDs and params before invoking a host route closure. `personalSlots` and `resolvePersonalSlot` validate bounded placements. Expo reference apps compile two personal view slots, an overflow list, and direct-route guards. React Navigation uses compiled generic screens with stable view identity. Required Home/Customize controls remain accessible. The host owns deep-link authentication and authorization.

## Planner provider

Implement `ModelProvider.generate({ request, registry, repair? }, signal)`. Return a proposal, clarification, unsupported, retryable-error, or rejected response matching core schemas. The handler independently validates every response. Source functions, identity, and secrets never appear in configuration. The mobile runtime uses a separate `PlannerTransport`; a local/on-device planner can implement that interface without a hosted service.

## Generated integrations and query helpers

The CLI derives capabilities from supported TypeScript patterns and merges durable overrides. Start at [AI integration guide](ai/integration.md). Generated files belong to the installer; host custom bindings belong in config.ts's useHostConfiguration hook. Keep shared providers above that integration when its components need them.

The optional /adapters export includes createCachedSource (complete repositories), createQuerySource (validated remote query/context/cursor contract), projectRows (approved-field projection) and queryInvalidation (structural query-cache notifications). These helpers do not import TanStack Query. Generated TanStack adapters reuse the existing client with scope-suffixed keys and subscribe to invalidation/manual cache updates. Infinite query caches are not treated as complete sources.

PersonalizationHost supplies Original app, My space and Customize controls plus saved-view navigation. It preserves the mounted host subtree while personal UI is visible. This maintains navigator/form state but also means existing host effects can continue running; check lifecycle/performance and accessibility on target devices.
