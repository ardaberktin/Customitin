# Customitin: start here

Customitin is a headless personalization SDK for React Native/Expo and React web. These alpha packages are locally distributed, not published. Contracts and profiles are v2; breaking changes from the earlier styled shell are intentional.

The developer owns screen/tab placement, application styling, chat and confirmation UI. An opt-in SDK collection can supply generic filtering, sorting, grouping, counts and grid controls around an existing host card; see integration. Installation adds a provider and reviewed bindings. It does not add navigation, a theme, an editor, an empty screen or an AI chat. A developer-owned empty surface is the recommended starting example. Users can compose approved existing components with compatible approved data inside that space.

Read [integration](integration.md) before changing SDK integration or the CLI. [Contracts](contracts.md) defines supported behavior; [maintenance](maintenance.md) defines ownership, identities and recovery. [Testing](testing.md) distinguishes automated checks from release validation. `customitin guide --topic <name>` prints these same guides from packed artifacts.

## Packages

| Package                    | Responsibility                                                                                                                                     |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@customitin/core`         | v2 contracts, registration, profile validation/storage, preview/apply/undo, conversation and action controllers, bounded data plans/formulas/joins |
| `@customitin/react`        | Shared provider/hooks, SurfaceRenderer plus opt-in DOM collection controls, HTTP/query adapters, browser storage; no React Native dependency       |
| `@customitin/react-native` | Shared React APIs plus in-place native section integration and native storage/navigation adapter exports                                           |
| `@customitin/server`       | Authenticated planner, remote data and action handlers; developer-owned model, data and domain services                                            |
| `@customitin/cli`          | Development-time source discovery, reports, reviewed enablement, generated bindings, refresh/watch/doctor/removal                                  |

## Rules for integrations

- Discover at development time. Runtime imports perform no filesystem scans, source edits or network requests. Provider registration diagnostics compare declared capabilities with executable bindings.
- Separate discovery, compatibility, enablement and static verification. A type signature is not authorization, evidence of complete data, mutation semantics or provider independence.
- Approve a report digest with explicit exclusions. Refresh preserves enabled IDs; new candidates remain pending. Completeness annotations describe source semantics and do not grant access.
- Choose explicit surface IDs for every planning request. Whole-app customization is an explicit collection of approved surfaces. Missing operation/field/action permissions deny access.
- Keep executable adapters in host code and serializable metadata in matching client/server manifests. Never evaluate AI-generated JavaScript or SQL.
- Only transform complete datasets locally. Partial caches and pagination need an explicitly registered remote executor.
- Action proposals are separate from layout proposals. Applying a layout never executes an action. Mutations require host confirmation by default, and layout undo does not reverse domain changes.
- Keep account scope and host authentication aligned. Store plans and mappings, not records, action results or chat history. V1 bytes are retained for recovery.
- Preserve developer-owned config/overrides, stable IDs and generated ownership boundaries. Never overwrite drift to make a check pass.

## Examples

`npm run dev:web` runs the Vite workspace. `npm run dev:tasks` includes a developer-owned Workspace tab with different native styling and the same core contracts. Both examples explicitly use a deterministic planner for their listed prompts. The existing recipe/movie/task visual shell is now example code under `examples/shared/src/ui`; it is not an SDK export or the default installation experience.

Use `npm run check`, packed consumer checks and interaction tests after changes. Update these source guides and run `npm run docs:build`; builds copy them into each package's `dist/docs`. Device, accessibility, performance and live-model checks remain release gates even when automated checks pass.
