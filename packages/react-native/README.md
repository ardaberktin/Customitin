# @customitin/react-native

Customitin's React Native provider, rendering, personalization UI and runtime adapters. Functional 0.1 alpha, not yet published. See the bundled [AI integration guides](dist/docs/index.md) after building, or [repository guides](../../docs/ai/index.md).

Prefer CLI generation for routine bindings. CustomizationProvider accepts options (registry, storage, scope, optional planner) and bindings (sources, host components, item renderers, navigate, session). CustomizableSurface renders a registered surface; PersonalizationScreen provides preview/apply/undo/reset. PersonalizationHost combines them with Original app/My space/Customize while keeping the host navigator mounted.

For an existing screen, use the CLI's repeatable `--screen` selection. It generates CustomizableLayout under CustomizationProvider, retains ordinary editable container/section JSX and handlers, and adds controls on that screen without a separate My space. CustomizableLayout takes a screen ID, generated sectionIds map and one JSX container child. It delegates to CustomizableScreen, whose lower-level API accepts a sections map and render-function child. Stable section wrappers retain local state when hidden or reordered. ScreenText, ScreenView and ScreenScrollView forward native props/refs and connect explicit text metrics and numeric gaps to shared preferences. Use watch --apply alongside the normal dev server for automatic section registration; no removal/reinstall cycle is required. See [existing-screen contracts](../../docs/ai/contracts.md#existing-screens) before using flex-sensitive, virtualized or complex native layouts.

Optional exports:

- /storage: StorageAdapter, memoryStorage and asyncStorageAdapter. Memory is for tests/preview; use persistent or encrypted host storage for deployment.
- /adapters: createHttpPlanner, createCachedSource, createQuerySource, projectRows and queryInvalidation. No TanStack or model-provider dependency is bundled.
- /navigation: validated destination closures and personal-slot utilities.

Read the active host session through generated config.ts's useHostConfiguration hook, update scope on account changes, and supply custom bindings there. The host owns authorization and data mutations. The assistant receives configuration/capability metadata rather than collection records. Manual preferences and saved layouts work without a planner; domain data availability depends on the host.

Run the consuming app's typecheck/lint and interaction tests. Verify native devices, storage recovery, account switching and cache invalidation before shipping. The guides describe supported patterns and explicit gaps.

Native entry points resolve built CommonJS, including validation dependencies, so the standard bare React Native template needs no SDK-specific Jest transform or Babel plugin. The generated root detects installed safe-area-context; custom integrations can pass `insets` to PersonalizationHost without adding a required SDK dependency.
