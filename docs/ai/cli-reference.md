# CLI reference

Run `customitin` from a built/installed CLI package. In this repository use `npm run cli --`. All project operations accept `--cwd /absolute/path/to/app`. Discovery requires a readable package.json; a valid tsconfig improves type resolution. Missing framework dependencies reduce what can be discovered reliably.

## Commands

| Command | Result                                                                                                  |
| ------- | ------------------------------------------------------------------------------------------------------- |
| inspect | JSON report: framework, entry, versions, symbols, routes/routeDetails, unresolved items, context digest |
| init    | Installation plan, dry-run unless --apply                                                               |
| refresh | Regenerated plan using persistent overrides and binding identity, dry-run unless --apply                |
| watch   | Continuously refresh an installed integration after local edits; dry-run unless --apply; Ctrl+C stops   |
| dev     | Run a wired host package script and applying watcher together; used by generated development scripts    |
| doctor  | JSON issues, recommendations, coverage and suggested checks; exits nonzero for issues                   |
| remove  | Owned-file removal/root restoration plan, dry-run unless --apply; config/overrides/identity lock remain |
| schema  | JSON Schema for personalize/overrides.json; no host project required                                    |
| guide   | AI documentation index; no host project required                                                        |

## Options

| Flag                      | Meaning                                                                                                 |
| ------------------------- | ------------------------------------------------------------------------------------------------------- |
| --dry-run                 | Preview only; takes precedence over --apply                                                             |
| --apply                   | Write planned changes if there are no ownership conflicts or integration issues                         |
| --context                 | For inspect, include the exact bounded metadata eligible for optional AI analysis                       |
| --complete SELECTOR       | Confirm a discovered complete array/query-options source; repeatable; saved to overrides on apply       |
| --component SELECTOR      | Enable a discovered component; repeatable; saved to overrides                                           |
| --screen SELECTOR         | Instrument an existing screen in place; repeatable; saved to overrides                                  |
| --dev-script NAME         | For init/refresh, select a custom development script; repeat for an exact set; saved to overrides       |
| --no-dev-watch            | For init/refresh, disable automatic script wiring and restore current host commands; saved to overrides |
| --route SELECTOR          | Enable a discovered route; repeatable; saved to overrides                                               |
| --detail SOURCE=ROUTE     | Connect row details and enable the route; repeatable; does not assert completeness                      |
| --query-client SELECTOR   | Choose an existing exported QueryClient                                                                 |
| --navigation-ref SELECTOR | Choose an existing exported React Navigation ref                                                        |
| --typecheck               | For doctor, statically check host/generated TypeScript                                                  |
| --ai                      | For init/refresh, use optional installer AI to select complete discovered sources                       |
| --approve-context DIGEST  | Required exact inspect context digest for AI transmission                                               |
| --topic TOPIC             | For guide: index, integration, contracts, maintenance, troubleshooting, testing, cli-reference          |
| --help                    | Print command help                                                                                      |

Selectors are printed by inspect. Symbols use `file.ts#exportName` or `file.ts#repository.method`. Expo routes use their file path. React Navigation routes use `file.ts#RootParamList.Screen`. Overrides may also use persisted capability IDs. Quote selectors in shell commands, especially paths containing brackets or parentheses.

`dev` has its own arguments: `customitin dev --script NAME [--cwd APP] -- [host arguments]`. Generated package scripts supply the script name and separator; developers keep their existing package-manager command. Everything after the separator is forwarded to the host. Dev applies refreshes and executes the saved host script; it does not accept --dry-run/--apply or selection flags. See [development command integration](maintenance.md#development-command-integration) for automatic detection, ownership and opt-out.

## Machine-readable plan

init/refresh print mode, changes, conflicts, unresolved, issues, generated, developerOwnedSetup and contextDigest. generated contains the exact proposed generated contents, including package.json when development-script wiring changes. Only selected script entries are SDK-maintained; package.json is not owned as a whole file. developerOwnedSetup contains new config/override files or an explicitly requested override merge. Unresolved includes informational discovery gaps; issues identifies actionable integration problems. A dry-run writes none of them. Existing config is never overwritten. init/refresh exit nonzero and write nothing for actionable integration issues or conflicts. Unknown CLI selectors fail before writing.

Screen candidates appear on discovered component symbols as screen.sections, with stable section keys/titles. Ineligible components expose screenIssue. --screen uses the same file#export selector as the component and preserves its stable identity; it does not require enabling --component. Enabled screen selections replace generated My space shell wiring with a provider around the original app. The planner endpoint and persistence remain optional/host-configured as documented in the integration guide.

`watch --apply` is available for externally managed or opted-out dev commands. The automatic dev wrapper uses the same watcher. Standalone watch emits JSON lines containing mode, changes, conflicts, issues and applied; dev prefixes actionable output with [customitin] on stderr while retaining host output. Unsupported edits are reported without replacing output; watch resumes after a corrected save. It does not accept new selections or invoke AI; use init/refresh or overrides for those decisions. Ordinary host code is editable, while generated wrapper imports/props retain structural checks. Watch handles atomic saves and new source files by polling once per second. It regenerates integration files and selected script wiring but never executes package scripts itself. Stop watchers, then run refresh --apply and doctor --typecheck before a release.

Writes preserve an ownership manifest and roll back known files if a write fails. The manifest supports diagnosing a process interruption. Conflicts prevent the entire apply. remove similarly refuses to proceed if any tracked file has drifted.

## Optional AI context

Set CUSTOMITIN_INSTALLER_API_KEY and CUSTOMITIN_INSTALLER_MODEL on the development machine. Run inspect --context, review it, and pass its exact digest with --ai --approve-context. This key is for optional installer analysis, not the app's runtime planner.

The context contains synthesized field/prop signatures, symbol locations and route descriptors. It does not contain function bodies, comments, domain records or environment-file contents. Secret-like filenames and detected credential literals are excluded. Type literal enum values are metadata and can still contain private vocabulary: review the actual context. The scanner uses bounded file sizes/count/depth; large monorepos should target a single app workspace.

The AI may select existing complete sources only. Selection is validated and retained in bindings.lock.json for later refreshes. AI does not generate executable code or select shell commands. Unsupported patterns remain diagnostics.

Doctor recommendations are advisory: an offline local-device app can pass without login or a planner. Persistent storage is required for saved settings to survive restart. For authenticated data, connect an account-specific scope and verify isolation; the CLI cannot prove authorization from types.
