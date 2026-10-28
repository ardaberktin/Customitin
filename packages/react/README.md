# @customitin/react

Headless React bindings for Customitin v2. No React Native dependency; the default entry has no visual shell, theme or chat. Opt-in collection controls are available from /dom.

Use CustomizationProvider with host registry/storage/account/planner/bindings. SurfaceRenderer renders only registered host components. useCustomization, useSurface, useDataView, useAssistant and useAction expose state, diagnostics and commands for developer-owned controls. The /dom entry supports existing keyed DOM sections and createCollectionBinding for an approved existing card; /collection exports the shared collection model; /storage adapts host browser storage; /adapters supplies planner/query/navigation adapters.

Start with the [integration guide](dist/docs/integration.md) or [repository guide](../../docs/ai/integration.md). Vite receives automatic CLI setup; other React frameworks use manual client-provider placement and host-specific SSR/storage decisions. Packages remain locally distributed.
