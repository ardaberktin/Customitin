# Integration playbook for coding agents

## 1. Inspect before generating

Work in the consuming application's workspace, not the whole monorepo. The tested alpha baseline is Node 24.15 (minimum 22.13), React 19.2, React Native 0.83.10, TypeScript 5.9.3, Expo 55.0.31 / Expo Router 55.0.18 when applicable, React Navigation 7.5 / native-stack 7.20, AsyncStorage 2.2, and TanStack Query 5.90.12. The CLI does not upgrade the host framework. Query, navigation and storage integrations are optional and reuse the libraries the app already has.

Packages are unpublished. In a Customitin checkout, run:

```sh
npm ci
npm run pack:local -- /tmp/customitin-packages
```

This builds all four packages, includes the AI guides, writes a packages.json map and prints two exact install commands. Run those printed commands inside the consuming app. The first installs core and react-native together as runtime dependencies. The second installs cli and server together as development dependencies; server is a dependency of the development CLI and must also resolve locally until publication. Do not install only the CLI tarball and let npm search for the unpublished server package. No model credentials are needed for these steps. A backend that uses the planner handler installs its own core/server pair separately.

Once installed, all commands run from the consuming app, with no dependency on the SDK checkout:

```sh
npx --no-install customitin guide --topic integration
npx --no-install customitin inspect
npx --no-install customitin init --dry-run
```

`--no-install` avoids accidentally fetching a similarly named public package. You can also use the local `node_modules/.bin/customitin` executable. Add `--cwd /absolute/path/to/app` when running outside the app. Inside the SDK checkout, `npm run cli -- <command>` remains available for contributors.

For a genuinely new bare app, the official template command for this baseline is:

```sh
npx @react-native-community/cli@20.2.0 init MyApp --version 0.83.10
```

Finish the template's own platform setup before native testing. Install persistent storage if the app has none (`npm install @react-native-async-storage/async-storage@2.2.0`), then run Customitin init so it is detected automatically. Follow the native library's pod/rebuild steps; the CLI does not install or upgrade native libraries. Without persistent storage, init creates an in-memory preview setup and doctor reports the remaining storage work.

`inspect` reports exact selectors such as `src/data.ts#loadEntries`, field rules, component props, query clients, routes, root candidates and unresolved hooks. It does not import or run the host app. Its `context` is hidden unless `--context` is supplied; ordinary inspection uses no external AI.

Use the developer's existing AI to read this report and the application's own repository. Optional `--ai` sends a separately reviewed bounded metadata context to a provider, but is not required to automate integration.

## 2. Make the few semantic decisions once

For existing-screen customization, start with the screen metadata in `inspect`. Enable the intended exported screens (selectors are examples; use the report's actual values):

```sh
npx --no-install customitin init --screen 'src/screens/Home.tsx#Home' --dry-run
npx --no-install customitin init --screen 'src/screens/Home.tsx#Home' --apply
```

Repeat `--screen` for additional screens. No source adapters, navigation ref, hand-written registry, or model key are needed just to personalize an existing screen. The original screen continues to obtain its own data and run its own callbacks. Generated root wiring uses CustomizationProvider, leaving the host navigator in place. The selected screens receive inline controls instead of a separate My space.

After installation, edit the screens' ordinary JSX, hooks and handlers in place. Content/style changes use normal Fast Refresh. Run `npx --no-install customitin watch --apply` alongside the existing dev server to update section registration automatically after structural edits. No removal/reinstall cycle is needed. One-shot `refresh --apply` is also available; keep React section keys stable and leave the generated wrapper ID/sectionIds props alone. See [editable host ownership](maintenance.md#file-ownership).

Supported screens return a vertical React Native View/ScrollView with static JSX sections. Give repeated siblings stable string `key` or `testID` values; wrap mapped/conditional groups in a keyed View. Inspect reports the sections or an actionable reason automatic instrumentation is unavailable. Review the dry-run and mark business-critical sections with `screens[selector].requiredSections` in overrides before shipping. Section labels default to the key/testID or component name. See [exact screen contracts](contracts.md#existing-screens) for layout and appearance boundaries.

A source with @customitinComplete is automatically eligible. For an unannotated array loader you have verified returns the entire authorized collection, use `--complete`. Enable suitable display components and routes using repeatable flags:

```sh
npx --no-install customitin init \
  --complete 'src/data.ts#loadEntries' \
  --component 'src/EntryCard.tsx#EntryCard' \
  --detail 'src/data.ts#loadEntries=src/app/entries/[id].tsx' \
  --dry-run
```

These flags merge into `personalize/overrides.json` when applied. They do not modify the source annotations. Review the exact generated output and developerOwnedSetup, then repeat with `--apply` instead of `--dry-run`.

If several sources match a card's object prop, set the component override's `source` to the intended source selector. For detail navigation set source `detailDestination` to the enabled route selector. A route with exactly one parameter needs no `detailParam`; otherwise automatic detail binding is unavailable. ID and route parameter scalar types must match.

Use `fields` to limit data exposure, `titleField`/`subtitleField` for display, and defaults for required fixed item-card props. The full schema is available through `customitin schema`. Unknown keys and unresolved selectors fail before writes.

## 3. Connect host runtime state

The CLI creates config.ts once. When AsyncStorage is already installed it uses that implementation automatically. Otherwise it starts with memory storage, which doctor reports as a setup issue. Do not ship memory storage if settings must survive a restart.

The generated root calls `useHostConfiguration` when exported. This is the supported place to read the existing session hook and provide reactive scope/session/bindings. For example, adapt this sketch to actual exports in the host:

```tsx
import { useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { asyncStorageAdapter } from '@customitin/react-native/storage';
import { createHttpPlanner } from '@customitin/react-native/adapters';
import { useSession, getSessionHeaders } from '../auth';

export const storage = asyncStorageAdapter(AsyncStorage);
export const scope = 'signed-out';
export const planner = createHttpPlanner({
  url: 'https://your-backend.example/plan',
  getHeaders: getSessionHeaders,
});

export function useHostConfiguration() {
  const session = useSession();
  const bindings = useMemo(() => ({ session }), [session]);
  return { scope: session?.localProfileKey ?? 'signed-out', bindings };
}
```

`localProfileKey` above is illustrative, not an SDK session property. Choose the app's actual stable opaque account scope. Change it immediately on logout/account switching. The SDK clears active personalization and cancels pending work when its scope changes. Host query keys/authentication must also isolate users.

The generated root merges custom sources, components and items over generated bindings. `bindings.navigate` can replace generated navigation. Custom hooks must be under their required providers. The CLI preserves visible outer JSX provider chains whose names end in Provider (including Context.Provider). Providers hidden inside other components or navigators need a shared host wrapper arranged before init. Edit an installed host root normally while retaining its PersonalizationRoot boundary; refresh preserves the changes and recalculates supported provider placement. Do not hand-edit personalize/root.tsx. Keep options and custom bindings stable/memoized to avoid unnecessary runtime resets or data reloads.

## 4. Connect the assistant

Manual appearance and saved layouts work without a planner. The generated scaffold does not pretend to understand arbitrary prompts offline. For natural language, deploy a developer-owned authenticated endpoint with the generated server-manifest.json.

The backend uses createPlannerHandler from @customitin/server. Supply manifests, a verified-session authenticate callback, an allowRequest quota callback, and an OpenAI/Anthropic/custom provider. Validate environment configuration at startup. Keep provider keys on the server; getHeaders on mobile sends the existing user's session, not the provider key.

The backend must serve the registry revision used by the mobile build. Retain supported older manifests during rollout. The planner is stateless and does not require a profile database. The repository's loopback demo server is for local demonstrations, not a deployment template with production authentication already completed.

## 5. Verify and hand off

```sh
npx --no-install customitin doctor --typecheck
```

Then run the host's lint, tests and bundle commands. Doctor's typecheck is static; it never runs arbitrary package scripts. Exercise Original app, Customize, preview, apply, My space, saved views, detail navigation, undo, reset, restart and account switching. For query-backed collections, mutate data through the original workflow and verify the personal view refreshes.

Report the actual connected source/component/route names, storage, account scope, planner status, checks and manual deployment/device work. Commit generated files, overrides, config and bindings.lock.json together. Subsequent app changes use refresh, not a new manually written registry.

For selected existing screens, exercise each original route, customize its layout, hide/show a section containing local state, apply, restart, undo, and restore. Confirm the app's existing callbacks and provider context still work. Check native layout, keyboard/focus and accessibility because section wrappers can affect flex geometry. Text scaling applies only to explicit fontSize/lineHeight values in connected Text nodes, and compact spacing scales numeric gap/rowGap/columnGap values. It does not restyle imported custom component internals.

When no screens are selected, the generated My space initially displays a welcome message. Registering sources, cards and routes makes them available for proposals; it does not automatically insert them into a saved layout. Appearance controls work immediately without a planner. See [testing](testing.md) for a deterministic proposal that exercises data/card/navigation integration without buying model credits, and for the native Jest setup. Do not ship the test planner as a natural-language assistant.

When react-native-safe-area-context is already installed, generation connects its provider/insets to the SDK shell automatically. Personal panels and shell buttons stay inside the safe area while the original navigator retains its own layout. The SDK itself has no mandatory safe-area dependency; custom hosts can pass insets directly to PersonalizationHost.
