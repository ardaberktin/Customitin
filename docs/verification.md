# Verification record

Recorded October 11, 2026 on macOS arm64 with Node 24.15.0. This is a functional alpha verification record, not a public-release certification. The supplied specification is preserved in [original-plan.md](original-plan.md).

## Editable screens and development watch — October 12, 2026

Selected screens now retain ordinary nested JSX through CustomizableLayout. Refresh reads current host code, validates SDK boundaries and regenerates section bindings without removing/reinstalling the integration. Root edits, current screen edits, stable section IDs, developer configuration and recognized file moves are preserved. Removal/disable strips SDK syntax from edited host files. The optional local watch command runs alongside the existing dev server, reports unsupported saves and resumes after corrections; input snapshots prevent applying a plan after a save during planning.

Verified for this change:

- `npm run check`: 82 tests across 19 files, strict TypeScript, zero-warning lint, formatting, package/declaration builds, domain boundaries and AI documentation freshness.
- Compiling consumer tests cover JSX/handler/style edits, added/removed sections, deleted unused imports, formatter changes, stable IDs after a move, removal/disable preserving current edits, and protected SDK boundary failures.
- Watch tests cover automatic regeneration, dry-run without writes, cancellation, unsupported saves without output writes and recovery after a correction.
- Generated-consumer interactions cover original screen behavior and form state, plus rendering new UI while registration is stale and customizing the added section after refresh.
- Three cross-app Playwright regressions passed with local Expo servers and installed Chromium revision 1223. Offline dependency-validation notices are expected for these fixtures.
- Built CLI help exposes watch. No package publication or backend deployment was performed.

These fixtures use source aliases and React Native Web. This change did not rerun packed fresh-native-consumer acceptance, native-device/simulator Fast Refresh, or live-model checks. Exercise real Metro/Expo saves, section geometry, keyboard/focus and accessibility on iOS/Android before shipping. Structural updates may remount sections while registration catches up. Publish/update the local SDK packages for consuming apps once, refresh their integration, and deploy matching planner manifests when registry semantics change; regular screen edits then use watch or refresh without reinstalling.

## Existing-screen personalization — October 12, 2026 (earlier run)

Added opt-in `--screen` instrumentation for supported existing View/ScrollView screens, provider-only root wiring, stable section identities, in-place layout controls and connected text/gap preferences. The original JSX, callbacks, provider context and local section state remain in the host. Screen-scoped planning is validated on both client and server; no data source registration or live planner is needed for manual changes.

Verified for this change:

- `npm run check`: 72 tests across 16 files; strict TypeScript; zero-warning lint; formatting; all package builds; domain boundaries; regenerated AI documentation freshness.
- New consumer fixtures compile named/default/root screens, multiple screens per file and imported-native aliases/shadowed names. Lifecycle tests cover no-op refresh, exact restoration on remove/disable, required sections, unsupported structures and drift protection.
- Two generated-consumer interaction scenarios run the instrumented app through React Native Web. They cover host context and existing actions, section order/visibility, retaining typed form state while hidden, typography preview/discard/apply, persistence across remount, undo and restoring the layout.
- Contract/runtime/server checks cover duplicate/replaced/modified sections, required controls, migration after a removed section, account-switch preview cancellation, and rejecting planner changes outside the requested screen, including the repair attempt.
- All three existing cross-app Playwright regressions passed using installed Chromium revision 1223. The first sandboxed attempt could not bind Expo ports; the successful retry used local server/browser permissions. Expo's offline dependency-validation notices are expected in this test configuration.
- The built CLI exposes --screen in its help. No packages were published and no backend was deployed.

This run did not exercise the new path on native devices/simulators, rerun packed fresh-native-consumer acceptance, or call a live model. Section wrapper geometry, flex-dependent children, scrolling/editor reachability, keyboard/focus, accessibility and host account/storage integration still require device checks. Inline appearance only connects explicit text metrics and numeric gaps; it does not migrate arbitrary host styling. See [screen contracts](ai/contracts.md#existing-screens) and [ownership workflow](ai/maintenance.md).

## Fresh-app acceptance — October 12, 2026

The follow-up [fresh React Native verification](fresh-app-verification.md) used actual tarballs and the packaged CLI in independent official templates. It passed the 58-test SDK check, three native consumer interaction tests, both platform Metro bundles, lifecycle/override checks, three browser regressions, an iOS simulator build and interactive native customization/data/navigation checks. It fixed native package resolution, shared-provider placement, safe areas, generated lint/formatting, offline diagnostics and reinstall identity. No live provider or physical device was used.

## CLI integration update — October 12, 2026 (earlier run)

The expanded installer was verified with `npm run check`: strict TypeScript, zero-warning lint, formatting, 53 tests across 11 files, ESM/CJS/declaration builds for all four packages, mobile boundaries and AI documentation freshness checks. New fixtures compile generated complete-repository, TanStack Query, paginated-contract, component, Expo Router and React Navigation integrations. Tests also cover field allowlists, persistent identity and selections, explicit renames, ownership conflicts, cache invalidation/cancellation, source-restricted renderers and the generated shell's interactions.

All three cross-app Playwright acceptance tests passed using the installed Chromium headless revision 1223 through `PLAYWRIGHT_CHROMIUM_EXECUTABLE`. The configured default browser revision 1200 was absent, and the initial sandbox disallowed loopback server binding; the successful run used local server/browser permissions. Expo's offline dependency-validation notices are expected in this test configuration.

The CLI guide was exercised from source and built output; a package dry-run confirmed all six AI guide chapters are included. No npm packages were published. This update did not rerun native exports, simulator/device tests or live model-provider evaluation; the older results below remain a historical record, not evidence for new native behavior.

## Passed

| Check             | Result                                                                                                          |
| ----------------- | --------------------------------------------------------------------------------------------------------------- |
| Strict TypeScript | No errors                                                                                                       |
| ESLint            | No errors or warnings; `--max-warnings 0`                                                                       |
| Prettier          | All checked source/configuration/documentation files formatted                                                  |
| Vitest            | 35 tests across seven files passed                                                                              |
| Playwright        | Three cross-app browser acceptance tests passed                                                                 |
| Package builds    | Four packages, ESM/CJS and declaration files                                                                    |
| Package contents  | All four npm tarballs generated locally with source, build output, README and MIT license                       |
| Expo recipe app   | Production web, iOS Hermes and Android Hermes exports                                                           |
| Expo movie app    | Production web, iOS Hermes and Android Hermes exports                                                           |
| Bare task app     | React Native CLI production JavaScript bundles for iOS and Android                                              |
| iOS interactive   | Preview, apply, filtered personal grid, tab navigation, restart restoration and existing item-detail navigation |
| HTTP planner      | Loopback reference server returned a validated proposal over HTTP                                               |
| Installer         | Discovery and dry-run exercised; generated consumer compiled; repeat install and reversible removal tested      |
| Boundaries        | Core/mobile source checked for server/CLI/provider imports and example-domain branches                          |

The iOS test used a dedicated iPhone 17 Pro simulator, iOS 26.5 and Expo Go 55.0.34. [Saved native screenshot](screenshots/ios-personal-grid.png) shows the restored four-item personal grid. The bare task app's browser test exercises React Navigation, but does not constitute a native binary test.

The automated suite covers invalid capabilities/props/queries, atomic changes, stale revisions, required controls, conservative migrations, data completeness and pagination, late responses after account switches, cancellation, bounded query concurrency, interrupted/corrupt storage recovery, undo/reset/rename, server authentication/access limits, malformed model output, one repair, deadlines, provider REST contracts, installer ownership conflicts, secret exclusion and hook rejection. Browser flows cover persistence, existing detail navigation, rejected requests, and collection invalidation after an existing task mutation.

Reproduce the main checks with:

```sh
npm ci
npm run check
npx playwright install chromium
npm run test:e2e
npm run bundle -w @customitin/recipe-example
npm run bundle -w @customitin/movie-example
mkdir -p examples/task-app/dist
npm run bundle:ios -w @customitin/task-example
npm run bundle:android -w @customitin/task-example
```

GitHub Actions is configured to run these commands. No remote CI run is claimed; the repository has no configured remote. No packages were published.

## Open verification and release work

- Android interactive acceptance remains unverified: the local API 35 emulator's System UI became unresponsive. Android production JavaScript/Hermes exports succeeded, which is a separate check.
- No signed iOS/Android app, physical-device performance measurement, full accessibility audit, or external pilot installation has been performed. Native bare-app simulator compilation and a local independent fresh-app installation are covered by the follow-up record above. Maestro flow source is supplied but was not run.
- OpenAI/Anthropic adapters passed mocked HTTP contract tests. No live provider key was used, no paid inference was performed, and the proposed 60-request semantic-quality target remains unmeasured. Demo prompts are deterministic and labelled accordingly.
- Installer automation now covers the patterns in the October 12 update. Nested navigation/theme migrations, arbitrary hooks, providers hidden inside host components and parameterized/infinite query patterns still need host adapters; see [installer coverage](installer.md).
- The renderer bounds query work and row counts, but has not met a measured physical-device scrolling or memory budget. Large-list virtualization remains follow-up release work.

## Dependency audit

The October 11 `npm audit` reported **40 affected dependency entries: 32 high, eight moderate, zero critical**. These counts include parent packages inheriting transitive findings; the remaining underlying advisories are:

| Dependency             | Advisory                                                                                        | Current limitation                                                                                                                   |
| ---------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `braces`               | [Stack-exhaustion denial of service](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)         | No patched version offered by the audit                                                                                              |
| `decode-uri-component` | [Malformed-input decoding denial of service](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr) | Expo Router's dependency chain requires a compatible upgrade; forcing the latest ESM dependency broke the existing CommonJS consumer |
| `node-forge`           | [Signature verification issue](https://github.com/advisories/GHSA-86w9-cpqp-85rv)               | No safe compatible framework fix was established                                                                                     |
| `sprintf-js`           | [Unbounded-precision denial of service](https://github.com/advisories/GHSA-hp3w-g68c-fv3c)      | Audit's proposed framework upgrade is outside the tested compatibility matrix                                                        |

Compatible fixes were applied, including the Vitest upgrade, pinned esbuild/uuid overrides, and React Native CLI 20.2.0 (which resolves the XML parser advisory). Both bare platform bundles passed after the CLI update. The remaining findings are unresolved release gates; they are not dismissed as harmless. Review exact reachable paths and update the compatibility matrix before public release. Do not apply `npm audit fix --force` blindly: its suggestions include incompatible framework changes.

See [release-checklist.md](release-checklist.md) for the remaining acceptance work and [deployment.md](deployment.md) for the developer-owned authentication, credentials and hosting steps.
