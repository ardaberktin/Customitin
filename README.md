# Customitin

An open-source, local-first personalization SDK for React Native. Users describe a change, preview it, and apply it to their own space. Applications keep their existing data clients and authentication. Developers own their planner endpoint and AI credentials.

**Status: functional 0.1 alpha.** Four buildable packages, three working reference applications, a bounded installer, and deterministic tests. The full public-release targets in the original plan (independent pilots, hardware performance budgets, store builds, and live-provider evaluations) remain release gates, not claims of completion.

## Run it

```sh
npm ci
npm run build
npm run dev                 # Gather: offline recipe app, localhost:8081
npm run dev:movie           # Frame: movie app
npm run dev:tasks           # Daybook: React Navigation, localhost:8083
```

Select **Customize**, then an example request, inspect the preview, and apply. Appearance controls, undo, reset, rename, saved destinations, and restoration after restart work without an API key. The default assistant is explicitly labelled a deterministic demo. It supports the example requests; it does not pretend to interpret arbitrary language.

Expo projects: `npm run ios -w @customitin/recipe-example` or `npm run android -w @customitin/recipe-example` with SDK 55 Expo Go. The task app also includes native iOS and Android projects generated with the React Native community CLI. See [native setup](docs/native-testing.md).

## What is implemented

| Package                    | Responsibility                                                                                                                                                   |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@customitin/core`         | Strict schemas, serializable capability metadata, typed queries, reference/constraint validation, atomic operations, stable IDs, conservative registry migration |
| `@customitin/react-native` | Provider, scoped local storage/recovery, composition, collections, preview/apply/undo/reset/rename, manual settings, endpoint transport, navigation contracts    |
| `@customitin/server`       | Authenticated stateless planner, usage hooks, deadlines, bounded input/output, one repair attempt, OpenAI and Anthropic REST adapters                            |
| `@customitin/cli`          | TypeScript discovery, evidence preview/consent, optional AI mapping, generated adapters/root wiring, ownership tracking, doctor/refresh/remove                   |

The recipe app uses a complete local repository and supports grouping. The movie app demonstrates filtering before pagination. The task app uses TanStack Query and invalidates personalized collections after an existing edit workflow. All use the same SDK schema and renderer. English UI copy is centralized for later translation.

## A real developer-owned endpoint

```sh
npm run server   # explicit, loopback-only demo server on 4318
```

The demo server also exposes `/movies` and `/tasks`. To exercise HTTP data rather than in-process fixtures, restart the movie/task app with `EXPO_PUBLIC_DATA_URL=http://localhost:4318` (Android emulator: `http://10.0.2.2:4318`). To exercise the HTTP planner, set `EXPO_PUBLIC_PLANNER_URL=http://localhost:4318/plan` in a reference app. Reference-app `getHeaders` is intentionally empty for the loopback demo; replace it with your existing session integration for an authenticated deployment.

Production setup uses `npm run server:live`, server-only `OPENAI_API_KEY`, `CUSTOMITIN_MODEL`, and `CUSTOMITIN_AUTH_MODULE`. The auth module exports `authenticate(request)` and returns a verified subject plus allowed app IDs. There is no default production guest access. Use a shared limiter for multiple instances, set the exact allowed web origin, and terminate HTTPS at your host. The reference server binds to loopback; wrap `createPlannerHandler` in your own deployment framework for hosting. See [deployment](docs/deployment.md).

## Integrate another app

These packages are local, **not published to npm**. Build and use workspaces or create tarballs with `npm pack --workspace <package-name>`.

```sh
npm run cli -- inspect --cwd /absolute/path/to/app --context
npm run cli -- init --cwd /absolute/path/to/app --dry-run
npm run cli -- init --cwd /absolute/path/to/app --apply
npm run cli -- doctor --cwd /absolute/path/to/app
npm run cli -- refresh --cwd /absolute/path/to/app --dry-run
npm run cli -- remove --cwd /absolute/path/to/app --apply
```

The first automatic data adapter supports exported zero-argument functions returning a typed complete array with an `id` field and primitive, non-nullable fields. A `@customitinComplete` JSDoc tag is an explicit host completeness contract, not an inference from a cache. Without that declaration the installer reports the ambiguity and generates appearance/surface scaffolding. The automatically wired root must be a default function returning one JSX expression. Hooks, conditional roots, nested navigator rewrites, existing style migration and business semantics require review.

The generated integration gives the host an original screen, a personal surface, and a customization entry point. It does **not** claim complete control over the host's private screens or styles. `personalize/config.ts` is developer-owned and is never overwritten. Connect persistent storage, active profile scope, and planner headers there. See [installer coverage](docs/installer.md).

Optional installer AI analysis requires `CUSTOMITIN_INSTALLER_API_KEY`, `CUSTOMITIN_INSTALLER_MODEL`, `--ai`, and `--approve-context <digest>` matching the locally reviewed `inspect --context` output. Only bounded symbol signatures and locations are transmitted, never file bodies, environment files, or domain records. There is no vendor service or required vendor account.

## Check it

```sh
npm run check               # types, zero-warning lint, formatting, tests, builds, boundaries
npx playwright install chromium
npm run test:e2e            # browser interactions across all three apps
npm run bundle -w @customitin/recipe-example
npm run bundle -w @customitin/movie-example
```

See [verification record](docs/verification.md), [compatibility](docs/compatibility.md), [extension contracts](docs/extensions.md), and [remaining release gates](docs/release-checklist.md). Saved configurations contain no collection records or prompt history. AsyncStorage is unencrypted: supply encrypted host storage if layout labels or filters are sensitive.

MIT licensed. No telemetry. No payments, deletions, arbitrary code, SQL, or model-selected network execution.
