# Verify a real consuming app

Use the app's actual installed packages, native types and scripts. A workspace test with TypeScript path aliases does not prove that the published artifacts work. Do not hand-edit generated code to get a test passing: fix the SDK or developer-owned host configuration, then refresh.

## Existing-screen acceptance

Run `npm run check` in the SDK checkout. The screen consumer fixtures compile generated named/default/root-screen integrations with strict unused-import checks. Generated-screen interaction tests execute the instrumented app with React Native Web: existing provider context and callbacks, reorder/hide/show, retained form drafts, in-place typography previews, discard/apply, restart restoration, undo and restoring the original layout. Core/server tests reject replacement section IDs, changed props, duplicate/required-node removal and planner changes outside the requested screen. These are deterministic component tests, not native-device or live-model acceptance.

Editable-host fixtures cover JSX/handler/style edits, added/removed sections, stable IDs, formatter changes, a moved screen, removal/disable preserving unrefreshed edits, and refusing changed SDK boundaries or unsupported containers. Watch tests cover applied saves, dry-run without writes and cancellation. A generated-consumer interaction test shows new UI while the registry is stale, then hides/shows the new section after refresh. On devices, also verify the real Metro/Expo Fast Refresh sequence while watch is running; the component test rebuilds bundles and does not claim to emulate the dev server.

For an actual --screen integration, exercise the same actions on iOS and Android. Verify original geometry (especially flex-dependent children), scrolling with the inline editor open, sticky headers, keyboard focus when hiding forms, accessibility exclusion of hidden sections, account switching, storage failures and the original navigation. Hidden sections remain mounted, so subscriptions/effects continue. No physical-device, performance or live-provider claim is implied by the fixture suite. Deploy the new matching manifest and server package before using surfaceId-aware planner requests.

## Automatic development command acceptance

Script fixtures cover dry-run, automatic Expo/Metro selection, custom script selection, compiling the generated consumer, no-op refresh, preserved helper edits/unrelated package fields, opt-out/removal and ownership conflicts. Real npm processes exercise the existing command, literal forwarded arguments, environment, pre/post hooks, source regeneration, nested scripts, host failures, SIGINT/SIGTERM and descendant cleanup. Lock tests verify one applying writer, takeover, aborted waits and stale-process recovery. These tests build the CLI from source and run on the test host; they are not packed-package or native-device acceptance.

For a consuming app, update the CLI once, review/apply refresh and run its usual development command. Add a supported section while Metro/Expo is running; verify automatic regeneration and Fast Refresh. Check terminal shortcuts, Ctrl+C, restarting and simultaneous app commands. Validate the same workflow on each supported OS/package manager. Do not infer yarn/pnpm/Bun/Windows behavior from the npm/macOS checks.

## Reproduce the fresh-app acceptance test

From a Customitin checkout with dependencies installed:

```sh
npm run test:consumer
```

This downloads the official React Native 0.83.10 template into a new temporary directory, builds/packs all SDK packages, installs those tarballs with their actual dependencies, and runs the packaged CLI. It does not use workspace symlinks or source aliases. Network access and a supported Node version are required. Set `npm_config_cache` to a writable directory when working in a sandbox.

The command prints the fresh app and evidence directories and leaves them available for inspection. It checks:

- Unmodified template init, doctor/typecheck, removal and original-root restoration.
- A small independent trail app with a complete TanStack query, shared QueryClientProvider, custom item card, a host component requiring query context, AsyncStorage and React Navigation details.
- Inspect, dry-run without root writes, durable CLI choices, idempotent refresh and a source move.
- Host TypeScript, explicit zero-warning TypeScript lint, native React component interactions and iOS/Android Metro production bundles.
- Preview/apply, full-data filtering and sorting, mutation invalidation, existing detail navigation, preserved original form state, persistence, undo/reset and scope switching.
- Drift protection, removal retaining config/overrides/identity history, and reinstall.

It uses a deterministic test transport, not a live model. It does not install pods, build native binaries, deploy a planner, launch simulators or claim physical-device acceptance. Those are separate checks below. Fixture source is in fixtures/fresh-react-native in the SDK checkout; the CLI steps are replayed by scripts/consumer.

## Native Jest setup

The SDK's native package entry points use built JavaScript. Standard React Native Jest does not need a transform exception for @customitin. Existing host libraries can still require their normal native mocks or ESM transform settings.

If using AsyncStorage and safe-area-context, add a Jest setup file:

```js
/* eslint-env jest */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);
```

Merge it into the app's Jest config. For the documented React Navigation example:

```js
module.exports = {
  preset: 'react-native',
  setupFiles: ['./jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-navigation)/)',
  ],
};
```

Preserve existing config and any exceptions needed by the app's other dependencies. Tests can use @testing-library/react-native with react-test-renderer matching the installed React version. Await async actions with act, await the visible result, unmount/cleanup, and clear the app's QueryClient after each test. The template's original smoke test leaves its renderer mounted; when adding async data providers, replace that test with one that waits for content and cleans up so Jest exits cleanly. Do not use forceExit or suppress console warnings to hide pending work.

## Test a proposal without a model key

Natural-language creation requires a backend planner, but validating the mobile integration does not. Use a test-only PlannerTransport (mock personalize/config in Jest or inject it through a development-only host configuration). Never change personalize/root.tsx or generated adapters.

This example creates a list using the first approved source and a compatible renderer. It uses no domain assumptions, filters or fabricated capability IDs:

```ts
import { registrySchema, type PlannerResponse } from '@customitin/core';
import type { PlannerTransport } from '@customitin/react-native';
import capabilities from '../personalize/capabilities.json';

const registry = registrySchema.parse(capabilities);
export const testPlanner: PlannerTransport = {
  async plan(request): Promise<PlannerResponse> {
    const source = registry.sources[0];
    if (!source)
      return { kind: 'unsupported', message: 'Enable a source first.' };
    const renderer = registry.components.find(
      (component) =>
        component.kind === 'item' && component.sourceIds?.includes(source.id),
    );
    return {
      kind: 'proposal',
      proposal: {
        requestId: request.requestId,
        registryRevision: request.registryRevision,
        baseRevision: request.baseRevision,
        summary: 'Show the approved collection.',
        operations: [
          {
            op: 'createView',
            view: {
              id: 'test-list',
              title: 'Test collection',
              sourceId: source.id,
              query: { filters: [], sort: [] },
              presentation: {
                mode: 'list',
                itemRendererId: renderer?.id ?? 'item',
                density: 'comfortable',
              },
            },
          },
          {
            op: 'setSurfaceLayout',
            surfaceId: 'home',
            nodes: [
              {
                id: 'test-list-node',
                componentId: 'collection',
                viewId: 'test-list',
                props: {},
                children: [],
              },
            ],
          },
        ],
      },
    };
  },
};
```

In a test, mock config by spreading jest.requireActual('../personalize/config') and replacing planner with this transport. Keep the helper outside **tests**, or give Jest an explicit testMatch: the standard template treats every file under **tests** as a test suite. Clear storage between unrelated tests; retain it when testing remount persistence.

Open Customize, enter any text, preview, then apply. My space should display the approved collection. To verify filters, adapt the proposal to real allowed field/operators and include a matching record beyond the first host page. To verify a host card or section, select the actual discovered component and provide its required props. Verify that its provider hooks still work. Clicking a card should open the existing detail route after --detail has connected it.

The requestId, baseRevision and registryRevision must echo the current request. Reusing an old proposal is expected to fail. Invalid fields/routes/components must not change the saved profile. This transport is a test fixture, not an AI implementation or fallback for production prompts.

## Consumer checks and native bundles

From the app:

```sh
npx --no-install customitin doctor --typecheck
npx --no-install tsc --noEmit
npx --no-install eslint . --ext .js,.jsx,.ts,.tsx --max-warnings 0
npm test -- --runInBand --watch=false
npx --no-install react-native bundle --platform ios --dev false --entry-file index.js --bundle-output /tmp/customitin-ios.jsbundle --assets-dest /tmp/customitin-ios-assets --max-workers 2
npx --no-install react-native bundle --platform android --dev false --entry-file index.js --bundle-output /tmp/customitin-android.jsbundle --assets-dest /tmp/customitin-android-assets --max-workers 2
```

These are bare React Native commands; Expo apps use their own export/build workflow. A successful bundle is not a native build or a launched application. The packaged SDK resolves its native validation dependencies through CommonJS, so the stock bare template does not need an export-namespace Babel plugin solely for Customitin. If an app imports Zod ESM independently, that separate import can still need its own Babel configuration.

For iOS, follow the template's bundle install / bundle exec pod install steps, then build/run with Xcode or the React Native CLI. With Xcode 27, pinned AsyncStorage 2.2's resource pod may target iOS 13.4, below that toolchain's simulator floor. The fresh-app check used an explicit IPHONEOS_DEPLOYMENT_TARGET=15.1 build setting. Align dependency deployment targets with the app's supported minimum in your Podfile/toolchain configuration when needed; do not lower the app's intended support floor or edit Pods by hand. Template/dependency warnings should be reported separately from SDK lint results.

For Android, a Metro bundle still leaves JDK, Android SDK/Gradle, emulator/device, and native acceptance to verify. On both platforms, exercise real storage across process restart, safe areas (including after apply/scroll), VoiceOver/TalkBack, larger text, hidden-screen accessibility, offline behavior, account switching and native navigation. Keep live-provider, authorization, deployment and physical-device claims separate from deterministic local tests.
