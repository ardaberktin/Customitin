# Headless integration

## Install and review

Packages remain local until separately published. In the SDK repository:

```sh
npm ci
npm run pack:local -- /tmp/customitin-packages
```

Install the emitted core, React and CLI tarballs in the consuming app. Native apps also install the native tarball. Keep server packages and model credentials on the backend. The pack command prints exact paths. Do not prescribe or install a chart, table or styling library: reuse the host's choices.

In the app:

```sh
npx --no-install customitin inspect
npx --no-install customitin inspect --json
npx --no-install customitin init --approve-report REVIEWED_DIGEST --exclude FILE_OR_ID --dry-run
npx --no-install customitin init --approve-report REVIEWED_DIGEST --exclude FILE_OR_ID --apply
npx --no-install customitin doctor --typecheck
```

Replace the digest/exclusion with actual report values; omit `--exclude` when none is needed. JSON contains `review.digest`, source locations, usage sites, compatibility evidence, exclusions and actionable diagnostics. An approval fails if the reviewed source or policy changes. Approval stores enabled stable capability IDs, preserving overrides. `--complete`, `--component`, `--screen` and `--route` remain explicit individual decisions. New discoveries on refresh are not implicitly enabled.

The default installer adds a provider and generated bindings only. It preserves the host's styling and navigation. It does not create an empty surface automatically. Select the region to customize and create its controls in host code. Recognized Vite, Expo and Metro development commands are wrapped to refresh registration during development. Production imports do not discover code. Other React frameworks use manual provider placement; SSR/request-scoped storage and client component boundaries are host responsibilities.

## Declare a space

Use `defineComponent`, `defineSource`, `defineSurface`, `defineRelation`, `defineAction` and `defineCapabilities` from core for manual integrations. For generated integrations, put additional surface/component/action/relation descriptors in `personalize/overrides.json`, then refresh. IDs in those descriptors refer to the stable IDs in the generated registry.

A surface explicitly declares its mode, allowed components, required nodes, and policy:

```ts
const surface = defineSurface({
  id: 'workspace',
  title: 'Workspace',
  mode: 'compose',
  defaultLayout: [],
  requiredNodeIds: [],
  allowedComponentIds: ['host-chart', 'host-table'],
  policy: {
    operations: ['layout', 'data', 'actions'],
    sourceFields: {
      activity: ['id', 'teamId', 'hours'],
      teams: ['id', 'name'],
    },
    actionIds: ['complete-activity'],
    maxNodes: 20,
  },
  provenance: {
    version: 1,
    status: 'developer-reviewed',
    evidence: 'Host configuration',
  },
});
```

Use actual registered IDs. Absence of a permission denies it. A whole-app experience passes an explicit list of approved surfaces to `useAssistant`. A local section stays attached to its screen; reusing it elsewhere requires a separate reusable component adapter.

## Render with the host's components

A host adapter receives `values`, `data`, `events` and `children`. Map these to the existing component's public API. A chart/table can accept the same typed series input and use different sources through validated field mappings. Discovery supports compatible scalar-record and array props plus `children`; unusual providers, callbacks, generic types and complex object shapes need reviewed adapters. Installed third-party usage is inventoried without scanning the dependency tree.

```tsx
const bindings = {
  sources: hostSources,
  components: {
    'host-chart': ({ values, data }: HostComponentProps) => (
      <ExistingChart
        title={String(values.title)}
        data={data?.series?.rows ?? []}
      />
    ),
  },
  actions: hostActions,
};

<CustomizationProvider
  options={{ registry, storage, scope, planner }}
  bindings={bindings}
>
  <YourExistingApplication />
</CustomizationProvider>;
```

This sketch requires the host's real types/exports. Strongly typed charts may need an explicit conversion from scalar rows; validate against their declared data input first. Keep component functions stable rather than declaring new component types inside renders.

In a host-owned screen, place `<SurfaceRenderer id="workspace" />`. It renders registered host components and containers only. Supply its `status` callback for loading, empty single-record, unavailable binding or render failures. It inserts no fallback text or visuals. For array inputs, the host component owns its empty-state appearance.

Use `useAssistant(['workspace'])` for request, cancel, preview, apply, undo, reset and conversation state. Render previews explicitly with `<SurfaceRenderer id="workspace" preview />`. Use `useSurface(id)` for approved nodes and manual preview commands; `useDataView(id, surfaceId)` for data/loading/more/refresh; `useAction(surfaceId, actionId)` for explicit proposals and execution. Display errors and disable controls during pending host writes. Hooks expose structured codes; choose your own user-facing wording.

See compiling examples in `examples/shared/src/headless` and `examples/web-app`. Their host controls centralize English copy and handle rejected saves. `examples/shared/src/ui` contains the earlier optional visual demo, now owned by the examples.

## Existing screens and elements

`customitin init --screen 'src/screens/Home.tsx#Home' --apply` connects supported static keyed sections in place. The generated wrapper preserves the host's lexical scope, callbacks and provider context. No editor or style primitive substitution is inserted. Implement reorder/hide controls with `useSurface`; see the compiling/interaction fixtures in `tests/helpers/screen-consumer.ts`. Web uses `@customitin/react/dom`; native uses `@customitin/react-native`.

For a single element, register a `mode: 'properties'` surface whose default layout contains the host element. Grant `operations: ['properties']` and an `editableProps` allowlist. It may change only those props; identity, position, children, bindings and locked props remain fixed. The compiling property example is `examples/shared/src/headless/element.tsx`.

## Connect account, persistence and endpoints

Generated `personalize/config.ts` is developer-owned. Its optional `useHostConfiguration()` reads host context above the SDK provider and supplies reactive `scope`, `storage`, `planner`, `plannerContext` and `bindings`. `bindings.session` stays local and flows to data/action adapters. Changing scope/session rebuilds transient runtime state; do not use a shared local-device scope for authenticated datasets.

Vite setup uses a lazy browser storage adapter. Native setup reuses installed AsyncStorage, otherwise reports memory storage as unfinished setup. Provide encrypted storage when required by the host. Storage keys include app, schema version and account scope.

`plannerContext` is an explicit host callback returning up to 20 permitted scalar values (for example a selected record ID). Nothing reads source rows or action results into model context automatically. Treat model output as proposals; unresolved record references need clarification or host selection.

Deploy matching manifests with `createPlannerHandler`. For remote transformations, register a `RemoteDataAdapter` and optionally use `createDataHandler` on the authenticated backend. For domain actions, adapters call existing services; `createActionHandler` requires authentication, account/revision resolution and durable host idempotency. Client adapters may use existing networking clients; include the registry revision and surface ID in endpoint requests. The SDK does not supply backend domain logic, credentials or deployment.

Remote data adapters receive `context.appId`, `context.registryRevision` and `context.surfaceId` alongside the plan, optional cursor, cancellation signal and local session. Send `{ appId, registryRevision, surfaceId, plan, cursor }` to `createDataHandler`. Action handlers receive `context.appId` and the validated `context.proposal` alongside the idempotency key; send `{ appId, registryRevision: proposal.registryRevision, surfaceId: proposal.surfaceId, proposal }` to `createActionHandler`. Forward the signal to the host network client and supply host authentication. Session objects stay local; server handlers obtain account scope and current revision from their trusted host context adapter.
