# Verification and release checks

Run from the repository:

```sh
npm run docs:build
npm run check
npm run test:consumer
npm run test:e2e
npm run build -w @customitin/web-example
npm run bundle:ios -w @customitin/task-example
npm run bundle:android -w @customitin/task-example
```

`check` includes strict TypeScript, zero-warning lint, formatting, unit/interaction/installer tests, all five package builds, platform/domain boundaries and documentation freshness. The process-tree tests send SIGINT to their own children; a restricted sandbox may deny process-group signalling. Run that verification in an environment permitting owned-child cleanup rather than suppressing the assertion.

`test:consumer` packs local packages, installs isolated native and Vite fixtures without workspace SDK aliases, compiles generated scalar/record/array/child-slot bindings, checks provider-only install/doctor/idempotency/reversible removal, bundles Vite and native iOS/Android, and prints its temporary evidence directory. Peer packages are installed from the npm cache with `--offline`; seed the cache normally first if required. It does not generate signed native binaries or publish packages. The older official-template fixture under `fixtures/fresh-react-native` is historical and is not the v2 acceptance runner.

Browser tests use developer-owned controls: the Vite workspace and task-app native workspace exercise chart/table data recombination, preview/discard/apply, layout persistence/undo, and explicit action confirmation. Existing examples exercise legacy host-owned controls. Playwright starts local dev servers; install a browser in the normal host environment or set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to an available browser executable.

## Acceptance evidence

- Installer tests compare provider-only output and unchanged host styles/navigation; unsupported unselected candidates do not block valid ones. Compiling fixtures cover array/record props, memo, children, shared imports/re-exports and DOM/native sections.
- Surface interactions preserve keyed local inputs/callbacks through reordering/hiding/cancel/apply and profile reload. Host state persistence across a process restart is not supplied by the SDK.
- Core/server tests reject unavailable components, fields/actions, cross-surface mutations, missing targets, stale revisions and account changes.
- Data tests cover joins/nulls/type mismatch/incomplete sources, budgets, cancellation, remote result validation and invalidation. Adapters must independently prove full authorized dataset semantics.
- Action tests cover explicit confirmation, preview/save exclusion, duplicate IDs, failures, no automatic retry, account cancellation and backend revalidation/idempotency hooks. Tests use deterministic adapters, not live business mutations.
- Storage tests cover atomic writes/recovery, v1 byte preservation, compatible migration, unsupported appearance settings and prevention of v1 resurrection after erasure.

## Required host and release work

Choose surface placement and all user-facing UI. Review provider context and source completeness. Implement adapter exceptions, stable record IDs, account scope/storage, backend authorization, remote aggregation/pagination where necessary, action confirmation and durable idempotency. Deploy the matching manifest before requiring its revision in a client build.

Check real native devices, navigation/provider geometry, screen-reader focus and hidden content, keyboard/text scaling, performance on realistic data, offline/online transitions and account switching. Measure bundle/startup/frame/memory behavior rather than inferring it from unit tests. Validate live-model clarification, reliability, prompt injection, costs and recovery against the host's actual policies. Signed binaries, accessibility, performance, independent developer pilots and live-model validation remain explicit release gates. A passing automated suite does not establish them.
