# Verification record

Recorded October 11, 2026 on macOS arm64 with Node 24.15.0. This is a functional alpha verification record, not a public-release certification. The supplied specification is preserved in [original-plan.md](original-plan.md).

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
