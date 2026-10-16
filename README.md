# Customitin

An open-source, local-first personalization SDK for React Native. Users describe a change, preview it, and apply it to their own space. Applications keep their existing data clients and authentication. Developers own their planner endpoint and AI credentials.

Existing screens can also be personalized in place. Select a supported screen with `customitin init --screen 'src/screens/Home.tsx#Home' --dry-run`, then repeat with `--apply`. The CLI retains its original JSX/data/callbacks and adds section reorder/hide, text-size/spacing preferences, preview/apply, undo and layout restoration directly to that screen. This path uses the app's existing navigation and does not add My space. See [screen contracts and boundaries](docs/ai/contracts.md#existing-screens).

Keep editing those screens normally. Content, styles and handlers work with Fast Refresh. Init/refresh wires recognized Expo/Metro scripts so the app's existing development command starts the section-registration watcher automatically. Existing integrations need one `customitin refresh --apply` after updating the CLI; custom launchers can be selected with `--dev-script NAME`, and `--no-dev-watch` opts out. Refresh and removal preserve current host edits. Keep section keys stable and generated SDK wrapper props/imports intact. See the [maintenance workflow](docs/ai/maintenance.md).

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

The CLI discovers typed array loaders, exported repository methods, zero-argument TanStack Query option factories and explicit paginated query contracts. It derives scalar fields, enums, nullable values, component props and route parameters. Existing exported query clients and React Navigation refs can be reused; Expo Router routes have generated bindings.

Use `--complete <selector>` to confirm an unannotated complete source, `--component <selector>` and `--route <selector>` to enable discovered UI capabilities. These repeatable flags save decisions in developer-owned `personalize/overrides.json`. Use field allowlists and query operator overrides there; `customitin schema` prints its exact schema. `personalize/config.ts` supplies host session/scope, planner and custom bindings. Neither developer-owned file is removed by uninstall.

Without screen selections, the installer creates a personal surface, saved-view navigation and a customization entry point while keeping the original app mounted. With `--screen`, it instruments selected vertical View/ScrollView screens instead. It supports simple default function/arrow roots and retains hooks/callbacks inside selected screens. Existing provider placement, nested navigator rewrites, flex-dependent section geometry and deep style migration still need host review. AsyncStorage is wired automatically when already installed; otherwise the scaffold uses memory storage and doctor reports it.

`personalize/bindings.lock.json` preserves capability IDs and source selections through refreshes. File moves with unique unchanged export names retain IDs; explicit symbol overrides handle renames. Commit the lock with the integration. Generated file edits block refresh/removal instead of being overwritten. `doctor --typecheck` checks the host and generated TypeScript without executing host scripts.

Start an AI-assisted integration with [llms.txt](llms.txt), the [AI playbook](docs/ai/integration.md), or `npm run cli -- guide`. Every built package includes the guides under `dist/docs`; the CLI can print individual chapters with `guide --topic contracts`. See the [CLI reference](docs/ai/cli-reference.md) and [installer coverage](docs/installer.md).

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

Fresh-install verification is reproducible with `npm run test:consumer`; it creates an official React Native app and exercises packed artifacts without workspace aliases. `npm run pack:local -- /tmp/customitin-packages` builds tarballs and prints install commands. Read the [AI testing guide](docs/ai/testing.md) and [fresh-app results](docs/fresh-app-verification.md) for scope and remaining native/deployment checks.
