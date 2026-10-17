# Overrides, identities and maintenance

## File ownership

| File                               | Owner                       | Behavior                                                                                                 |
| ---------------------------------- | --------------------------- | -------------------------------------------------------------------------------------------------------- |
| personalize/config.ts              | Developer                   | Created once; never overwritten or removed by refresh/remove                                             |
| personalize/overrides.json         | Developer                   | Created once; CLI selection flags explicitly merge requested decisions                                   |
| personalize/bindings.lock.json     | Installer                   | Stable IDs and previous selectors; retained on removal; commit this file                                 |
| personalize/capabilities.json      | Installer                   | Client v2 registry generated from discovery plus overrides                                               |
| personalize/server-manifest.json   | Installer                   | Matching backend registry; deploy with planner                                                           |
| personalize/discovery.json         | Installer                   | Versioned discovery/review evidence and reachable workspace files                                        |
| personalize/sources.ts             | Installer                   | Data adapter bindings                                                                                    |
| personalize/components.tsx         | Installer                   | Host data-input/children adapters (explicit legacy items supported)                                      |
| personalize/navigation.ts          | Installer                   | Approved destination closures                                                                            |
| personalize/root.tsx               | Installer                   | Provider-only integration and custom binding merge                                                       |
| .customitin/ownership.json         | Installer                   | Generated hashes, reversible host bindings and unwrapped host snapshots                                  |
| Root and selected screen TSX files | Developer with SDK wrappers | Host code stays editable; only recognized SDK imports/props/wrappers are maintained                      |
| package.json scripts               | Shared                      | Only selected script wrappers/helper entries are maintained; other package fields remain developer-owned |

Do not edit installer-owned files to customize behavior. Change overrides or supply runtime bindings through config.ts, then refresh. Existing generated-file edits block replacement/removal rather than being silently discarded. Developer config, overrides and the identity lock remain on removal. Retaining the lock keeps moved/renamed selector overrides usable if the integration is installed again.

Edit selected screens and the app root normally: JSX content, props, styles, hooks, callbacks, imports and surrounding providers belong to the developer. Generated screens keep ordinary nested JSX inside CustomizableLayout. The CLI supplies a static sectionIds map and adds stable React keys where missing. Keep section keys stable; an added key remains ordinary host code if an edited screen is later removed from the integration.

Discovery and refresh unwrap recognized SDK syntax from the **current** file, retain host edits and regenerate the bindings. Formatting changes are accepted. Removing the integration or disabling a screen strips only SDK instrumentation from the latest source; an unchanged host file is restored byte-for-byte from its unwrapped snapshot. Root edits are preserved too. Removing a section, adding a section, or changing its default order requires regeneration, while content/style/handler changes work immediately through normal Fast Refresh.

Do not hand-edit generated wrapper imports, aliases, IDs or sectionIds. Changes to those boundaries stop refresh/removal with diagnostics and no writes. Restore the indicated SDK syntax; there is no need to remove/reinstall the integration. Ordinary generated adapters under personalize/ retain whole-file drift protection. Never edit ownership hashes to bypass checks. Older installations without reversible host metadata upgrade on a refresh when their tracked host files are unchanged; if already modified, preserve those edits and restore the last generated host version before upgrading, then reapply the edits.

A moved screen is recognized only when its original path is absent and exactly one new file retains its complete SDK wrapper. A unique unchanged export name keeps the existing identity; use an explicit symbol override for renames. Ambiguous copies, splitting/merging instrumented files and modified wrapper aliases need deliberate host wiring or restoring the known SDK boundaries first. No move is inferred from a partial match.

## Complete override example

```json
{
  "version": 1,
  "sources": {
    "src/data.ts#loadEntries": {
      "enabled": true,
      "completeness": "complete",
      "title": "Entries",
      "fields": ["id", "title", "stage"],
      "idField": "id",
      "titleField": "title",
      "maxRows": 500,
      "detailDestination": "src/app/entries/[id].tsx"
    }
  },
  "components": {
    "src/EntryCard.tsx#EntryCard": {
      "enabled": true,
      "source": "src/data.ts#loadEntries",
      "defaults": {}
    }
  },
  "routes": {
    "src/app/entries/[id].tsx": { "enabled": true, "title": "Entry details" }
  }
}
```

Only use actual discovered selectors. The example is not universally applicable: if EntryCard requires an excluded field such as note, include it or adapt the host card. Defaults must satisfy the component's scalar rules. Use the JSON Schema produced by `customitin schema` as the authoritative list of supported properties.

`enabled: false` disables a discovered capability without changing application code. Disabling a source can make dependent card bindings unavailable; diagnostics report the mismatch. A field allowlist controls what gets projected to SDK collections. It does not change the host repository.

## Stable identity

The lock records a persistent ID, current selector and previous selectors for each discovered capability. On refresh, an exact selector keeps its ID. A unique export name of the same kind moved to another file can also keep its ID. Ambiguous names do not get guessed. Previous selectors remain aliases, so existing override keys still resolve after a file move.

For a rename or an ambiguous move, retain the old override key or stable ID and point `symbol` to the new selector:

```json
{
  "version": 1,
  "sources": {
    "src/data.ts#loadEntries": {
      "symbol": "src/repository.ts#readEntries",
      "title": "Entries"
    }
  }
}
```

Use this only for the same logical capability. Rebinding a source ID to unrelated data can make saved filters misleading. The CLI preserves identity, not business equivalence.

Manifest revisions are derived from capability semantics, excluding evidence file/line locations. Moving an otherwise unchanged source does not obsolete profiles. Changing fields, operators, labels or binding restrictions can change the revision. Deploy the new server manifest and retain older supported revisions. When a field disappears, runtime reconciliation disables incompatible views rather than removing restrictive filters.

Bindings missing from the current scan remain in the lock as identity history. Overrides that refer to missing active bindings produce diagnostics. Update symbol or explicitly disable them. The lock also stores optional installer-AI source selections, so a later refresh without --ai retains the choice.

Pre-lock installations import matching original source IDs when possible. If a legacy source moved or was renamed before the first upgrade refresh, review the old manifest and restore its selector first or perform an explicit reviewed migration. Do not delete the lock to resolve conflicts.

## Development command integration

Init/refresh automatically wraps recognized `start`, `dev`, `web`, `ios` and `android` scripts that directly run `vite`, `expo start`, `react-native start` or `rnc-cli start`. Optional `npx`/`npx --no-install`, `pnpm exec` and `yarn exec` prefixes are recognized. Build/run-ios/run-android scripts and custom environment/launcher prefixes are not inferred. No process-runner dependency is added. Existing installations need one `refresh --apply` with the updated CLI.

For example, an existing `"start": "expo start"` becomes:

```json
{
  "start": "customitin dev --script start --",
  "customitin:host:start": "expo start"
}
```

Developers continue to use `npm start`, including arguments such as `npm start -- --port 8085`. The wrapper runs the saved host command through the invoking package manager, inherits its environment and terminal streams, starts an applying watcher, and shuts down both together. Host exit codes are retained; SIGINT/SIGTERM stop the host process tree. Existing pre/post hooks remain on the original script and run according to the package manager's normal rules. The host command's `npm_lifecycle_event` is the helper name; scripts that inspect it need adjustment or opt-out.

To select a custom development script, or an exact set of scripts, use repeatable flags:

```sh
npx --no-install customitin refresh --dev-script develop --apply
```

This persists `"devScripts": ["develop"]` in overrides. Only those names are wired when an explicit list is present. `--no-dev-watch` persists `"devScripts": false`, restores current host commands and disables automatic wiring. Remove that override to return to automatic detection. Lifecycle hooks and scripts already running Customitin dev/watch cannot be selected.

Edit `customitin:host:<name>` when changing a wrapped command's flags or launcher. The current helper value is preserved through refresh and restored to the original script on opt-out/removal. Unrelated package fields/scripts are preserved. Missing/modified wrappers and conflicting reserved helper or helper lifecycle names block writes with diagnostics; restore the recorded boundary before retrying. Package formatting may normalize when script entries change. Do not edit ownership metadata to bypass a conflict.

Nested wrapped scripts share their parent watcher. Separate development commands for the same real app directory elect one applying watcher through a temporary OS-directory lock; another command can take over when its owner exits. An additional standalone applying watcher reports a conflict. Dead process locks are recovered automatically. Stop development processes before one-shot applying init/refresh/remove commands. Dry-run watchers do not acquire a writer lock.

Only invoking the development command executes host scripts. Init, refresh, inspect, doctor and standalone watch retain static discovery. The real process tests cover npm on macOS; verify interactive Metro/Expo shortcuts, shutdown and argument forwarding on other package managers and operating systems before claiming support for them.

## Refresh workflow

Normally, use the app's wired development command. For an opted-out or externally managed dev server, the standalone command remains available:

```sh
npx --no-install customitin watch --apply
```

Watch requires an installed integration. It polls bounded source files, overrides, config and tracked output once per second, serializes regeneration and reports changed files or actionable issues as JSON lines. It never runs host scripts or invokes installer AI. Without --apply it only reports plans; --dry-run takes precedence. Stop with Ctrl+C. Edits arriving during planning cause that plan to be skipped and retried on a later poll. Unsupported JSX or altered SDK boundaries keep the last generated integration intact; save a supported correction and watch resumes. Newly added/removed sections show the host container without customization controls while registration is stale, so a save does not hide new UI or throw a section mismatch error. Structural changes can remount sections during this development transition.

Watch is optional. A one-shot workflow is also supported:

1. Update the host code directly; keep section keys stable.
2. Run inspect; compare actual signatures and fields.
3. Update only overrides/config as needed.
4. Run refresh --dry-run and review changed files, unresolved items and conflicts.
5. Apply the same plan with refresh --apply.
6. Run doctor --typecheck and the host's lint/tests/bundles.
7. Exercise a previously saved profile and any changed data/navigation behavior.
8. Deploy matching backend manifests before requiring them in a new app build.

Before a release, stop development commands, run refresh --apply, doctor --typecheck and the app's checks even if watch was running. Review and commit source/generated changes together, including package.json, .customitin/ownership.json and bindings.lock.json. Deploy matching server manifests when capability semantics change. Do not run one-shot applying CLI operations concurrently with an applying watcher.

## What refresh does not do

It does not run application modules, silently change credentials, upgrade frameworks, infer tenant restrictions, merge arbitrary custom code, migrate all existing styles, deploy a backend, or publish a mobile release. These remain explicit host implementation/release tasks.

## Generated formatting

The CLI formats generated TypeScript and the root wrapper before recording ownership hashes. It reads portable literal settings from JSON prettier files, package.json.prettier, and simple module.exports/export-default object configs. It never executes a host configuration or loads formatter plugins. Dynamic configs, YAML, overrides and custom plugins fall back to portable defaults; these are not a promise to reproduce every host formatting rule. To change generated output, adjust a supported static config and refresh before running a formatter over installer-owned files. Check TypeScript files explicitly: the default bare React Native lint script may only scan JavaScript unless `--ext .js,.jsx,.ts,.tsx` is supplied.

## Reviewed enablement and v2 migration

`inspect` prints a readable report; `inspect --json` contains the exact `review.digest`. `init/refresh --approve-report DIGEST --exclude ID_OR_SELECTOR` approves the suggested compatible set against that snapshot. The CLI persists explicit enabled stable IDs. New components/sources discovered by watch stay pending. Completeness annotations do not enable sources, and component annotations do not bypass report review. Required callback/complex-prop candidates remain reported with adapter work; they do not block unrelated unselected bindings.

Workspace discovery follows reachable local files, including compiler-resolved aliases and re-exports. Watch hashes those files as well as app sources. Changing an existing source's shape can change its capability revision; surface field allowlists still control access. Review semantic changes and deploy matching manifests. Source moves retain identity only under the existing unambiguous rules; no identity implies authorization for a new logical dataset.

The alpha SDK now exports headless APIs. Existing config/overrides remain developer-owned during installer migration. Refresh replaces tracked generated files only after ownership checks. The old shell, editors and theme primitives live in examples; update host imports deliberately if the app chose to use them. Installation no longer inserts routes, tabs, appearance tokens or controls. Plan/inspect the migration before applying it, then supply host UI and surface policies.

V2 profile storage uses separate keys. Migration preserves compatible host components by stable ID and reports unsupported shell/theme/navigation settings. It never overwrites v1 bytes. V2 writes and erasure record a retirement marker to prevent automatic v1 fallback after the user resets their retained configuration. Recovery from old bytes is a separate deliberate host workflow, with scope verification. Do not remove those bytes as a side effect of SDK installation. Legacy configuration/identity-lock file formats remain version 1 for ownership compatibility; runtime manifests/profiles/reports are version 2.
