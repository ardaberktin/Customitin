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

`test:consumer` packs local packages and installs isolated native and Vite fixtures without workspace SDK aliases. It follows separate runtime/development installs, exercises Vite's referenced app tsconfig and aliased named chart interface, verifies no-write dry runs, digest approval/exclusions, stale approval rejection and pending discoveries, and checks provider-only install/doctor/idempotency/reversible removal. It then uses the actual generated provider, adapters and source loaders to preview/discard/apply one existing chart with two datasets (`team`/`hours` and `department`/`budget`), reload saved layout and undo. The chart stays unrestricted to a single source; mappings are explicit.

These packed interactions run in jsdom with React DOM; the native harness substitutes React Native Web and in-memory AsyncStorage only for that interaction check. Separate iOS/Android Metro bundles use the real native packages, and Vite runs its TypeScript build and production bundle. This is JavaScript integration evidence, not a native-device launch. The runner prints its temporary evidence directory, including commands/reports, interaction logs and bundle logs. Peer/test packages are installed from the npm cache with `--offline`; seed the cache normally first if required. It does not generate signed native binaries or publish packages. The older official-template fixture under `fixtures/fresh-react-native` is historical and is not the v2 acceptance runner.

The runner also renders each generated existing-screen integration from installed packages and exercises its original callback. Native import/require identity checks and both Metro source maps verify that the shared provider/hooks use one module instance. Source aliases or successful compilation alone would miss duplicate-context failures at package entry points.

It also enables an SDK collection around the consumer's existing record card, generates platform bindings, verifies doctor/typecheck, and exercises generated counts, filtering and density controls. The collection imports remain present for Vite and real iOS/Android Metro bundle checks. Unit/interaction tests additionally cover source operation restrictions, identity-only mappings, partial-data rejection, numeric/null sorting, dynamic group counts, card state during reordering and configuration resets.

## Native simulator pilot

`fixtures/native-pilot/README.md` describes a separate official React Native 0.83.10 app created with the community CLI and installed from packed SDK artifacts. Run `node scripts/consumer/pilot.mjs /path/to/fresh/app` after installing its dependencies. The setup reviews the fixture's capabilities, generates its integration, configures real AsyncStorage and checks strict TypeScript. Build a Release simulator app with embedded JavaScript for actual terminate/relaunch persistence checks.

This pilot covers general UI customization: a reusable chart with two source mappings, summary cards, nested panel/text composition, a host wrapper around a native slider library, a property-only heading, and existing keyed input/callback sections. Its controls and keyboard/safe-area layout are host code. Use its documented checklist for preview/discard/apply, process-restart persistence, undo, reorder/hide, mounted form state, keyboard visibility and rotation. A deterministic planner isolates SDK behavior; it does not validate a live model.

Browser tests use developer-owned controls: the Vite workspace and task-app native workspace exercise chart/table data recombination, preview/discard/apply, layout persistence/undo, and explicit action confirmation. Existing examples exercise legacy host-owned controls. Playwright starts local dev servers; install a browser in the normal host environment or set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to an available browser executable.

## Acceptance evidence

- Installer tests compare provider-only output and unchanged host styles/navigation; unsupported unselected candidates do not block valid ones. Compiling fixtures cover array/record props, memo, children, shared imports/re-exports and DOM/native sections.
- Surface interactions preserve keyed local inputs/callbacks through reordering/hiding/cancel/apply and profile reload. Host state persistence across a process restart is not supplied by the SDK.
- Core/server tests reject unavailable components, fields/actions, cross-surface mutations, missing targets, stale revisions and account changes.
- Data tests cover joins/nulls/type mismatch/incomplete sources, budgets, cancellation, remote result validation and invalidation. Adapters must independently prove full authorized dataset semantics.
- Action tests cover explicit confirmation, preview/save exclusion, duplicate IDs, failures, no automatic retry, account cancellation and backend revalidation/idempotency hooks. Tests use deterministic adapters, not live business mutations.
- Storage tests cover atomic writes/recovery, v1 byte preservation, compatible migration, unsupported appearance settings and prevention of v1 resurrection after erasure.

## Required host and release work

Choose surface placement and assistant/confirmation UI. Collection controls may be supplied by the opt-in SDK binding. Review provider context and source completeness. Implement adapter exceptions, stable record IDs, account scope/storage, backend authorization, remote aggregation/pagination where necessary, action confirmation and durable idempotency. Deploy the matching manifest before requiring its revision in a client build.

Check real native devices, navigation/provider geometry, screen-reader focus and hidden content, keyboard/text scaling, performance on realistic data, offline/online transitions and account switching. Measure bundle/startup/frame/memory behavior rather than inferring it from unit tests. Validate live-model clarification, reliability, prompt injection, costs and recovery against the host's actual policies. Signed binaries, accessibility, performance, independent developer pilots and live-model validation remain explicit release gates. A passing automated suite does not establish them.
