# CLI reference

Run `customitin` from a built/installed CLI package. In this repository use `npm run cli --`. All project operations accept `--cwd /absolute/path/to/app`. Discovery requires a readable package.json; a valid tsconfig improves type resolution. Missing framework dependencies reduce what can be discovered reliably.

## Commands

| Command | Result                                                                                                  |
| ------- | ------------------------------------------------------------------------------------------------------- |
| inspect | JSON report: framework, entry, versions, symbols, routes/routeDetails, unresolved items, context digest |
| init    | Installation plan, dry-run unless --apply                                                               |
| refresh | Regenerated plan using persistent overrides and binding identity, dry-run unless --apply                |
| doctor  | JSON issues, recommendations, coverage and suggested checks; exits nonzero for issues                   |
| remove  | Owned-file removal/root restoration plan, dry-run unless --apply; config/overrides/identity lock remain |
| schema  | JSON Schema for personalize/overrides.json; no host project required                                    |
| guide   | AI documentation index; no host project required                                                        |

## Options

| Flag                      | Meaning                                                                                           |
| ------------------------- | ------------------------------------------------------------------------------------------------- |
| --dry-run                 | Preview only; takes precedence over --apply                                                       |
| --apply                   | Write planned changes if there are no ownership conflicts                                         |
| --context                 | For inspect, include the exact bounded metadata eligible for optional AI analysis                 |
| --complete SELECTOR       | Confirm a discovered complete array/query-options source; repeatable; saved to overrides on apply |
| --component SELECTOR      | Enable a discovered component; repeatable; saved to overrides                                     |
| --route SELECTOR          | Enable a discovered route; repeatable; saved to overrides                                         |
| --detail SOURCE=ROUTE     | Connect row details and enable the route; repeatable; does not assert completeness                |
| --query-client SELECTOR   | Choose an existing exported QueryClient                                                           |
| --navigation-ref SELECTOR | Choose an existing exported React Navigation ref                                                  |
| --typecheck               | For doctor, statically check host/generated TypeScript                                            |
| --ai                      | For init/refresh, use optional installer AI to select complete discovered sources                 |
| --approve-context DIGEST  | Required exact inspect context digest for AI transmission                                         |
| --topic TOPIC             | For guide: index, integration, contracts, maintenance, troubleshooting, testing, cli-reference    |
| --help                    | Print command help                                                                                |

Selectors are printed by inspect. Symbols use `file.ts#exportName` or `file.ts#repository.method`. Expo routes use their file path. React Navigation routes use `file.ts#RootParamList.Screen`. Overrides may also use persisted capability IDs. Quote selectors in shell commands, especially paths containing brackets or parentheses.

## Machine-readable plan

init/refresh print mode, changes, conflicts, unresolved, issues, generated, developerOwnedSetup and contextDigest. generated contains the exact proposed contents of installer-owned files. developerOwnedSetup contains new config/override files or an explicitly requested override merge. Unresolved includes informational discovery gaps; issues identifies actionable integration problems. A dry-run writes none of them. Existing config is never overwritten. init/refresh exit nonzero for actionable integration issues as well as conflicts; inspect the report even if some generated files were written. Unknown CLI selectors fail before writing.

Writes preserve an ownership manifest and roll back known files if a write fails. The manifest supports diagnosing a process interruption. Conflicts prevent the entire apply. remove similarly refuses to proceed if any tracked file has drifted.

## Optional AI context

Set CUSTOMITIN_INSTALLER_API_KEY and CUSTOMITIN_INSTALLER_MODEL on the development machine. Run inspect --context, review it, and pass its exact digest with --ai --approve-context. This key is for optional installer analysis, not the app's runtime planner.

The context contains synthesized field/prop signatures, symbol locations and route descriptors. It does not contain function bodies, comments, domain records or environment-file contents. Secret-like filenames and detected credential literals are excluded. Type literal enum values are metadata and can still contain private vocabulary: review the actual context. The scanner uses bounded file sizes/count/depth; large monorepos should target a single app workspace.

The AI may select existing complete sources only. Selection is validated and retained in bindings.lock.json for later refreshes. AI does not generate executable code or select shell commands. Unsupported patterns remain diagnostics.

Doctor recommendations are advisory: an offline local-device app can pass without login or a planner. Persistent storage is required for saved settings to survive restart. For authenticated data, connect an account-specific scope and verify isolation; the CLI cannot prove authorization from types.
