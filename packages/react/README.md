# @customitin/react

Headless React bindings for Customitin v2. No React Native dependency and no visual shell, theme, chat or controls.

Use CustomizationProvider with host registry/storage/account/planner/bindings. SurfaceRenderer renders only registered host components. useCustomization, useSurface, useDataView, useAssistant and useAction expose state, diagnostics and commands for developer-owned controls. The /dom entry supports existing keyed DOM sections; /storage adapts host browser storage; /adapters supplies planner/query/navigation adapters.

Start with the [integration guide](dist/docs/integration.md) or [repository guide](../../docs/ai/integration.md). Vite receives automatic CLI setup; other React frameworks use manual client-provider placement and host-specific SSR/storage decisions. Packages remain locally distributed.
