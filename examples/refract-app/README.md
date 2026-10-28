# Refract adoption test

A React web study of the supplied Refract screenshots. Home is ordinary host UI; Collection starts as an empty Customitin surface. The model configures an opt-in SDK collection using the original Home card and complete local library. The SDK supplies heading/count, filters, sorting, grouping and grid controls. The host has no Collection-specific control components, filter/sort state, grid shelf mode, or preloaded layout/proposal.

## Run

From the repository root, with dependencies installed:

```sh
npm run build
npm run dev:refract
```

Open `http://127.0.0.1:8086`. The local Vite backend reads `OPENAI_API_KEY` from the repository's ignored `.env`. To select a different existing environment file, set `REFRACT_ENV_FILE` to its absolute path. The key stays on the server. All live model requests, including a validation repair, use **gpt-6.1-sol / xhigh** with a 32,768 completion-token budget. There is no model fallback.

Open **Collection → Customize collection → Preview layout**. The editable starting prompt describes the reference. Wait for the response, select **Layout preview**, inspect it, then **Apply layout** or **Discard preview**. The assistant also provides **Undo** and **Reset collection**. A request can take a couple of minutes; **Cancel request** remains available. Reload restores applied plans. Temporary filter/sort/density choices reset on reload.

Home supports horizontal scrolling, episode completion indicators, title details, search and favorites. Header social/notification buttons use local explanatory messages; they do not connect to external services.

## Developer integration

- `personalize/overrides.json` enables the existing `MediaCard` with `collection: { source: <loadLibrary ID> }`. The Collection surface approves that card plus its generated `.collection` capability, the required source fields, and layout/data changes only.
- `personalize/config.ts` supplies account scope, browser storage, the HTTP planner and a 300-second client deadline.
- `personalize/root.tsx`, component/source bindings, manifests, discovery evidence and the identity lock are CLI-generated. Preserve their ownership; change the developer files and run `npm run cli -- refresh --cwd examples/refract-app --apply` after stopping the dev watcher.
- The CLI puts Customitin **inside** `LibraryProvider`, preserving the original card-detail interaction. This host context now holds only the selected card; SDK controls own their filtering, sorting and density state.
- The generated collection binding imports `createCollectionBinding` from `@customitin/react/dom`. Its counterpart on native is `@customitin/react-native/collection`. No handwritten wrapper or target-control styling was added for this test.
- `server/` is a loopback-only development service. It requires an HttpOnly local session, checks the request origin/host, limits request bodies and calls, and uses the matching server manifest. It refuses production mode. Production needs a separately deployed authenticated planner.

The actual adoption test installed tarballs in an isolated directory, not workspace source aliases. To repeat that package-boundary check, run `npm run pack:local -- /tmp/customitin-refract-packages`, copy this example to a fresh directory outside the repository, then follow the emitted runtime/dev installation commands. Run the installed `customitin refresh --apply`, `customitin doctor --typecheck`, and `npm run build`. Start Vite with `REFRACT_ENV_FILE` pointing to your existing server environment file.

## Verification and evidence

```sh
npm run check
npm run test:consumer
npm run build -w @customitin/refract-example
npx vitest run tests/refract-interactions.test.tsx
```

The interaction test replays a **recorded real model response**, changing request/revision envelopes to the current test runtime. It does not call a model and is not a measure of repeated model reliability. The production app does not import that fixture.

Set `REFRACT_AUDIT_DIR` to a local directory to opt into request/response evidence for a live test. It records approved model context, responses, usage and latency; it never records HTTP authorization headers or environment values. Keep audit files local and out of version control. See [the repeat test report](../../reports/refract-sdk-controls/report.md) and [the historical first report](../../reports/refract-adoption/report.md).

## Visual and data limits

The supplied screenshots are local CSS artwork atlases, including the prism logo. The surrounding layout, text, controls, card metadata and navigation are React/CSS. Some artwork regions retain small screenshot overlays; these are reference assets, not clean original poster files. Several icons are approximations. Replace the atlas with original licensed artwork before distributing the app.

The fixture contains **24 records**, including distinct sample records that reuse artwork, across all eight statuses. Watching has **9** records. Counts are computed; the screenshot's 814/11 values are not fabricated. SDK controls use generic appearance and category colors rather than Refract-specific icons. No native device, OS status bar, production media catalog or business backend is simulated. The visual comparison is qualitative at a phone-sized browser viewport, not a pixel-diff or native-device certification.
