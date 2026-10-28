# @customitin/react-native

Native integration for the Customitin v2 headless SDK. Re-exports the shared React provider, hooks and SurfaceRenderer, and adds CustomizableLayout/CustomizableScreen for existing keyed native sections. Default integration adds no navigation, theme, editor or chat. The opt-in /collection entry supplies filtering, sorting, grouping, counts and grid controls around an approved existing card. Earlier visual components now live in examples.

The host owns UI, session/storage, permissions and authenticated adapters. Use CLI `--screen` for supported static View/ScrollView sections, or place an approved empty surface yourself. Keep local section identities and provider context stable. Hiding keeps sections mounted; actual native geometry, accessibility and performance require device checks.

/storage exports ProfileStore, memoryStorage and asyncStorageAdapter. /adapters and /navigation expose shared adapters. Native entrypoints resolve built CommonJS for Metro; web-only consumers use @customitin/react.

See the [packaged integration guide](dist/docs/integration.md), [contracts](dist/docs/contracts.md) and [repository migration guide](../../docs/ai/maintenance.md). Locally distributed alpha; no publishing or deployment occurs automatically.
