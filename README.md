# Customitin

A headless personalization SDK for React Native/Expo and React web. Developers choose which spaces, components, data and actions users can customize. Users request a change, preview it and apply it inside the approved space.

The host owns every screen, tab, theme, editor, chat control and confirmation. Customitin supplies discovery, reviewed bindings, validation, data composition, action execution state and persistence. Opt-in SDK collection controls can reuse an existing card without a developer prebuilding the target screen's filters, sorting or grouped grid. Importing the library never scans production source or inserts UI.

**Status: v2 contracts in a locally distributed alpha.** Packages are not published. Native device, accessibility, performance and live-model validation remain release gates.

## Run the examples

```sh
npm ci
npm run build
npm run dev:web       # Vite: http://localhost:8084
npm run dev:tasks     # Native host app on web: http://localhost:8083; select Workspace
```

Both workspace examples reuse existing host charts/tables with other compatible data through the same contracts and different host styling. Their explicitly labelled deterministic assistant supports “Show team hours”, “Show targets as a table”, and “Complete activity one”. The action requires a separate host confirmation. A production app connects its own authenticated planner.

The older recipe/movie/task shell is now optional example code under `examples/shared/src/ui`. SDK packages do not export or install it. `npm run dev` and `npm run dev:movie` still run those examples.

## Packages

| Package                    | Responsibility                                                                                                                         |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `@customitin/core`         | v2 registration/contracts, scoped runtime/storage, preview/apply/undo, bounded joins/formulas/data plans, action/assistant controllers |
| `@customitin/react`        | Shared hooks and host-component SurfaceRenderer; browser storage/DOM integration; no native dependency                                 |
| `@customitin/react-native` | Shared React API plus in-place native section integration                                                                              |
| `@customitin/server`       | Authenticated planner, remote data and action handler factories; host-owned services and credentials                                   |
| `@customitin/cli`          | Development discovery/reports, reviewed enablement, generated bindings, refresh/watch/doctor/removal                                   |

## Integrate

Build tarballs with `npm run pack:local -- /tmp/customitin-packages` and install the emitted paths in the app. Then:

```sh
npx --no-install customitin inspect
npx --no-install customitin inspect --json
npx --no-install customitin init --approve-report REVIEWED_DIGEST --dry-run
npx --no-install customitin init --approve-report REVIEWED_DIGEST --apply
npx --no-install customitin doctor --typecheck
```

Use the actual `review.digest` and repeat `--exclude ID_OR_SELECTOR` for exclusions. Installation adds a provider and reviewed bindings only. Create an empty screen/region in the host, declare its surface policy, place `SurfaceRenderer`, and build your own controls with `useSurface`, `useDataView`, `useAssistant` and `useAction`. `--screen FILE#EXPORT` can connect supported existing keyed sections without replacing their styles or callbacks. Individual-element surfaces permit only declared property changes.

Discovery follows reachable local workspace imports, aliases and re-exports and reports imported third-party usage. It binds supported scalar/record/array/children patterns and reports exceptions. It does not infer authorization, complete data or mutation semantics. Refresh preserves stable IDs and developer-owned config/overrides; new capabilities remain pending approval. Recognized Vite/Expo/Metro development commands automatically refresh registration. Other React frameworks use documented manual integration.

Data views combine approved fields with projection, filtering, sorting, grouping, aggregates, interpreted formulas and declared inner/left equality joins. Local execution requires verified complete datasets within budgets. Larger/paginated work uses developer-owned remote adapters. No JavaScript evaluation, SQL, arbitrary callback synthesis or automatic record transmission to a model occurs.

Action proposals require explicit execution, host confirmation by default, and current permissions/account/revision. Applying a layout never executes its actions; layout undo does not reverse business mutations. The host backend owns authorization and durable idempotency. Persisted v2 profiles contain plans/mappings, not fetched records or conversation history; v1 bytes remain recoverable.

Start with the [integration guide](docs/ai/integration.md), [contracts](docs/ai/contracts.md), and [maintenance/migration guide](docs/ai/maintenance.md). Agents can use [llms.txt](llms.txt), [llms-full.txt](llms-full.txt) or `customitin guide`. Matching guides are packaged under `dist/docs`.

## Verify

```sh
npm run docs:build
npm run check
npm run test:consumer
npm run test:e2e
npm run build -w @customitin/web-example
npm run bundle:ios -w @customitin/task-example
npm run bundle:android -w @customitin/task-example
```

Packed consumer tests install isolated native and Vite fixtures from local tarballs without workspace SDK aliases. See the [testing guide](docs/ai/testing.md) for cache/browser requirements and remaining host/device/deployment checks. Nothing is published or deployed by these commands.

MIT licensed. No telemetry or required vendor account. The developer owns the application, services, model provider and user experience.
