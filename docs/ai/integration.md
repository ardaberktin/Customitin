# Headless integration

## Install and review

Packages remain local until separately published. In the SDK repository:

```sh
npm ci
npm run pack:local -- /tmp/customitin-packages
```

Use the exact installation commands printed by the pack command. Install the emitted core and React tarballs as runtime dependencies; native apps also install the native tarball. Install **both server and CLI tarballs as development dependencies**: the local CLI depends on the unpublished server package for its bounded response reader. Omitting the server tarball makes npm try to fetch it from the registry. Do not import server code or model credentials into the app. The authenticated planner runs on the backend. Do not prescribe or install a chart, table or styling library: reuse the host's choices.

For example, using the default artifact directory and current alpha version:

```sh
npm install /tmp/customitin-packages/customitin-core-0.1.0-alpha.1.tgz /tmp/customitin-packages/customitin-react-0.1.0-alpha.1.tgz
# Native only, after the shared runtime packages:
npm install /tmp/customitin-packages/customitin-react-native-0.1.0-alpha.1.tgz
npm install --save-dev /tmp/customitin-packages/customitin-server-0.1.0-alpha.1.tgz /tmp/customitin-packages/customitin-cli-0.1.0-alpha.1.tgz
```

Use the consuming app's existing compatible React/framework versions; the native peer ranges are React Native `>=0.83.0 <0.84` and React `>=19.2.0 <20`. Vite solution configs are supported: discovery and doctor select the referenced project containing the app entrypoint and honor its inherited settings and aliases. If multiple projects include that entrypoint, correct their includes before installing. Doctor checks the selected app project; still run the host's full build to check tooling/other projects.

In the app:

```sh
npx --no-install customitin inspect
npx --no-install customitin inspect --json
npx --no-install customitin init --approve-report REVIEWED_DIGEST --exclude FILE_OR_ID --dry-run
npx --no-install customitin init --approve-report REVIEWED_DIGEST --exclude FILE_OR_ID --apply
npx --no-install customitin doctor --typecheck
```

Replace the digest/exclusion with actual report values; omit `--exclude` when none is needed. JSON contains `review.digest`, source locations, usage sites, compatibility evidence, exclusions and actionable diagnostics. An approval fails if the reviewed source or policy changes. Approval stores enabled stable capability IDs, preserving overrides. `--complete`, `--component`, `--screen` and `--route` remain explicit individual decisions. New discoveries on refresh are not implicitly enabled.

The default installer adds a provider and generated bindings only. Conventional `App.tsx` roots may use a default export or a named `App` function/arrow export; ambiguous, wrapped or conditional roots need manual placement. It preserves the host's styling and navigation. It does not create an empty surface automatically. Select the region to customize. Supply host controls or opt into the SDK collection controls below. Recognized Vite, Expo and Metro development commands are wrapped to refresh registration during development. Production imports do not discover code. Other React frameworks use manual provider placement; SSR/request-scoped storage and client component boundaries are host responsibilities.

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

### Opt-in SDK collection controls

A developer does not need to implement a target screen's filter bar, sort selector, heading/count, grouped grid or density toggle. Enable the existing single-record card with an approved complete source:

```json
{
  "version": 1,
  "sources": { "src/data.ts#loadEntries": { "enabled": true } },
  "components": {
    "src/Card.tsx#Card": {
      "enabled": true,
      "collection": { "source": "src/data.ts#loadEntries" }
    }
  }
}
```

Use real discovered selectors and verify completeness (`@customitinComplete` or the explicit source override). Refresh generates the ordinary card binding and a second capability with ID `<stable-card-id>.collection`. Approve **both IDs** on the intended compose surface, together with `layout`/`data` permission and the required source fields. No layout is inserted. Mount `SurfaceRenderer` in the existing host destination and use the normal assistant workflow.

The CLI generates `createCollectionBinding` from `@customitin/react/dom` on web or `@customitin/react-native/collection` on native. It reuses the card's original data prop and surrounding providers/callbacks. Manual integrations can call `createCollectionDescriptor(cardDescriptor, sourceDescriptor)` from core and `createCollectionBinding(cardBinding, descriptor)` from the appropriate platform entry.

The planner selects `title`, `groupBy`, `filterBy`, `sortBy`, `sortDirection`, `sortLabel`, `columns` (1–4), `showCount`, `showFilters`, `showSort`, and `expanded`. The SDK implements the controls and state. Groups follow declared enum order, with other observed values afterward; empty groups are omitted. Null values have a separate category and sort last. Clicking a filter or sort control changes local presentation without a model call. Applying a new component configuration resets temporary control state. Saved profiles contain the AI's props/data plans, not temporary selections or records.

This capability currently accepts one scalar-record input per card, optional/defaulted scalar props, host-owned interactions, and one compatible complete, count-enabled source. Required callback props still need a host adapter. Source `filterOps`, `sortable` and `groupable` declarations constrain control fields. Card fields must map by identical names to a flat complete local data view: remote/paginated results, joins, computed fields and aggregates are rejected for this binding. Other host bindings retain their existing richer data-plan support. At most 49 card fields and 100 categories are supported; collection rendering is not virtualized. Existing source/result budgets still apply.

DOM controls inherit host font/color and use neutral chrome. Optional app-wide `--customitin-panel` and `--customitin-accent` CSS variables can match existing design tokens; no target-specific control CSS is required. Native controls use a generic native appearance and segmented choices. Exact brand styling, native device geometry, production authentication, source completeness and responsive host-card behavior remain developer/release responsibilities.

Customization applies to the host's UI generally: text, cards, forms, containers, controls and library components. Charts are one data-binding example. Use `compose` for approved components and child slots, `properties` for a fixed element's allowed scalar props, and `reorder` for existing keyed sections. These modes share preview, apply, persistence and undo.

A host adapter receives `values`, `data`, `events` and `children`. Map these to the existing component's public API. A chart/table can accept the same typed series input and use different sources through validated field mappings. Discovery supports compatible scalar-record and array props plus `children`; unusual providers, callbacks, generic types and complex object shapes need reviewed adapters. Installed third-party usage is inventoried without scanning the dependency tree.

For example, a host `ProgressMeter({ value }: { value: number })` can wrap an installed native slider while keeping its styling, provider requirements and event behavior in host code. Approve that wrapper and expose only the intended props. The SDK does not need a slider dependency or a slider-specific renderer. For interactive controls, retain their callbacks in keyed existing sections or supply explicit host event/action bindings; do not turn callbacks into serializable props. See `fixtures/native-pilot` for this library wrapper, nested panel content, a property-only heading and existing input/callback sections.

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

For reasoning models, configure both ends of the planning deadline. `RuntimeOptions.plannerTimeoutMs` defaults to 30,000 ms; generated integrations pass it through `useHostConfiguration()`. The server's `createPlannerHandler({ timeoutMs })` defaults to 20,000 ms. Both accept integers from 1 to 300,000; keep the server deadline below the client deadline. Cancellation still aborts the transport and late output cannot overwrite the current profile. These settings do not alter data-query deadlines.

The server-only `createOpenAIProvider` accepts an explicit `reasoningEffort` and `maxTokens` (1–65,536, default 4,096). Choose values supported by the exact model. Reasoning consumes the completion budget too. The adapter forwards `reasoning_effort` and `max_completion_tokens` without substituting a model or silently reducing a valid budget. Never place a model key in browser configuration.

`examples/refract-app` is a consumer workflow study: Home's existing poster shelf, library heading, status filters and sort control feed an initially empty Collection surface through generated bindings. Its loopback-only Vite planner uses a server-side environment key and an HttpOnly local test session. It is development infrastructure, not a production authentication or deployment template. The accompanying report separates live-model evidence, recorded-response regression tests and remaining device checks.

See compiling examples in `examples/shared/src/headless` and `examples/web-app`. Their host controls centralize English copy and handle rejected saves. `examples/shared/src/ui` contains the earlier optional visual demo, now owned by the examples.

## Reuse an existing chart with another dataset

An exported chart taking `data: readonly ChartRow[]`, where `ChartRow` is an interface with `label: string` and `value: number`, can use a generated binding. Named interfaces, readonly arrays, memo and child slots are supported. Approve the chart and each source independently. For example, a complete hours loader might return `{ id, team, hours }` and a complete budget loader `{ id, department, budget }`. The chart's prop names need not match either source.

1. Review `inspect --json`; apply the reviewed digest, with any exclusions. Find the chart/source **stable IDs** in `personalize/capabilities.json`.
2. Add a `compose` surface to the existing overrides, as above. Allow the chart ID, `layout` and `data` operations, and the selected fields from both sources. Run `refresh --apply`. Keep `components[chartId].source` unset: it is a legacy single-source item restriction, not a chart dataset selection.
3. Render `SurfaceRenderer` and host controls using `useAssistant(['workspace'])`. Connect a planner through the developer-owned config. A planner proposal uses `setDataView` followed by `setSurfaceLayout` with these shapes (replace the placeholder IDs):

```ts
const view = {
  id: 'chart-data',
  title: 'Budget by department',
  plan: dataPlanSchema.parse({
    sourceId: budgetSourceId,
    project: ['department', 'budget'],
  }),
};
const node = {
  id: 'existing-chart',
  componentId: chartId,
  props: {},
  children: [],
  data: {
    data: {
      viewId: 'chart-data',
      mapping: { label: 'department', value: 'budget' },
    },
  },
};
```

Here `data` is the chart's actual prop name. Import `dataPlanSchema` from core. Wrap these values in the proposal's `setDataView`/`setSurfaceLayout` operations with `surfaceId: 'workspace'`, the current request ID, registry revision and base revision. To show hours, keep the same component ID, change the source and projection to `team`/`hours`, and map `{ label: 'team', value: 'hours' }`. No replacement chart or handwritten chart adapter is needed. Preview does not save; host controls call apply, cancel or undo separately.

The packed consumer runner implements this exact sequence in `fixtures/headless-interactions/planner.ts` and `interaction.tsx`, using the generated root and bindings in fresh native/Vite apps. Its planner is deterministic test support, not a natural-language service. Mismatched field types, denied fields and incomplete datasets remain errors; supply a reviewed host adapter for unsupported shapes.

## Existing screens and elements

`customitin init --screen 'src/screens/Home.tsx#Home' --apply` connects supported static keyed sections in place. The generated wrapper preserves the host's lexical scope, callbacks and provider context. No editor or style primitive substitution is inserted. Implement reorder/hide controls with `useSurface`; see the compiling/interaction fixtures in `tests/helpers/screen-consumer.ts`. Web uses `@customitin/react/dom`; native uses `@customitin/react-native`.

For a single element, register a `mode: 'properties'` surface whose default layout contains the host element. Grant `operations: ['properties']` and an `editableProps` allowlist. It may change only those props; identity, position, children, bindings and locked props remain fixed. The compiling property example is `examples/shared/src/headless/element.tsx`.

## Connect account, persistence and endpoints

Generated `personalize/config.ts` is developer-owned. Its optional `useHostConfiguration()` reads host context above the SDK provider and supplies reactive `scope`, `storage`, `planner`, `plannerContext` and `bindings`. `bindings.session` stays local and flows to data/action adapters. Changing scope/session rebuilds transient runtime state; do not use a shared local-device scope for authenticated datasets.

Vite setup uses a lazy browser storage adapter. Native setup reuses installed AsyncStorage, otherwise reports memory storage as unfinished setup. Provide encrypted storage when required by the host. Storage keys include app, schema version and account scope.

`plannerContext` is an explicit host callback returning up to 20 permitted scalar values (for example a selected record ID). Nothing reads source rows or action results into model context automatically. Treat model output as proposals; unresolved record references need clarification or host selection.

Deploy matching manifests with `createPlannerHandler`. For remote transformations, register a `RemoteDataAdapter` and optionally use `createDataHandler` on the authenticated backend. For domain actions, adapters call existing services; `createActionHandler` requires authentication, account/revision resolution and durable host idempotency. Client adapters may use existing networking clients; include the registry revision and surface ID in endpoint requests. The SDK does not supply backend domain logic, credentials or deployment.

Remote data adapters receive `context.appId`, `context.registryRevision` and `context.surfaceId` alongside the plan, optional cursor, cancellation signal and local session. Send `{ appId, registryRevision, surfaceId, plan, cursor }` to `createDataHandler`. Action handlers receive `context.appId` and the validated `context.proposal` alongside the idempotency key; send `{ appId, registryRevision: proposal.registryRevision, surfaceId: proposal.surfaceId, proposal }` to `createActionHandler`. Forward the signal to the host network client and supply host authentication. Session objects stay local; server handlers obtain account scope and current revision from their trusted host context adapter.
