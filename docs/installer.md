# Installer behavior

The v2 installer adds provider wiring and reviewed bindings only. It preserves appearance/navigation and adds no screen, tab, theme, editor or chat. Vite is the initial automatic React web integration; native/Expo are supported, while other React roots use manual placement.

Use the [integration workflow](ai/integration.md), [CLI reference](ai/cli-reference.md), [supported discovery contracts](ai/contracts.md) and [ownership/maintenance rules](ai/maintenance.md). These are the canonical maintained guides and are copied into all package artifacts.

Discovery follows bounded reachable local workspace imports, compiler aliases and re-exports and inventories imported third-party UI usage. It never runs host modules or scans entire dependency trees. Supported scalar/record/array/children patterns generate compiling adapters; callback/provider/complex-type exceptions receive diagnostics. Unsupported unselected candidates do not block other bindings.

`inspect --json` includes `review.digest`. Approve the suggested set with exclusions against that digest. Explicit stable IDs remain enabled across refresh; new candidates stay pending. `doctor --typecheck` verifies static installation, not business semantics or runtime/device behavior.

Developer config and overrides are never replaced by refresh or removed by uninstall. Generated drift blocks mutation. Stable identity history and reversible host wrappers preserve current host edits. See the packed native/Vite consumer checks in `scripts/consumer/run.mjs` and [testing guide](ai/testing.md).
