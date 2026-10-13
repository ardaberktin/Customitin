# Troubleshooting and verification

## Read the diagnostic, then inspect its evidence

| Symptom                              | Likely cause                                                            | Action                                                                              |
| ------------------------------------ | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Source listed but not generated      | Completeness is unknown                                                 | Verify the repository, then use --complete or a completeness override               |
| Query factory skipped                | No unique exported QueryClient                                          | Export/select the existing client; do not create a replacement cache                |
| Hook requires adapter                | Discovery found useSomething                                            | Expose an underlying query factory or provide a React-safe host binding             |
| Card has no unique source            | More than one matching row shape, or required fields excluded           | Set component.source or correct the field selection                                 |
| Component requires unsupported props | Callback, children, object or provider dependency cannot be synthesized | Export a small wrapper with a supported interface                                   |
| Remote filters unavailable           | No explicit server operator contract                                    | Declare supported filters/sort fields after verifying endpoint behavior             |
| Detail parameter mismatch            | Row ID and route parameter differ in type/count                         | Use compatible schema or a custom navigation/data binding                           |
| No navigation ref                    | React Navigation ref is absent or ambiguous                             | Export/select the ref already attached to the root navigator                        |
| Root needs manual integration        | HOC, conditional return or unsupported root expression                  | Place PersonalizationRoot in the appropriate existing provider tree                 |
| Settings vanish on restart           | Memory storage                                                          | Install/connect persistent host storage                                             |
| Planner unavailable                  | No endpoint, invalid session, revision mismatch or provider failure     | Verify backend configuration and matching manifest; inspect safe server diagnostics |
| Refresh required                     | Source/override/template changed                                        | Review refresh --dry-run, then apply and recheck                                    |
| Drift                                | Someone edited an owned file                                            | Preserve those edits in config/host code; resolve deliberately before regeneration  |
| SDK wrapper props/imports changed    | A generated host boundary was altered                                   | Restore the indicated SDK syntax; ordinary host JSX/logic can remain edited         |
| Project changed while planning       | A new save arrived during regeneration                                  | Let watch retry after the next save settles, or rerun refresh                       |

Generated sources and routes are typed but still depend on truthful host contracts. A passing typecheck does not prove completeness, correct filtering, authorization or visual quality.

## SDK contributor checks

Run `npm run check` after changes. It includes strict TypeScript, zero-warning lint, formatting, unit/integration tests, package builds and mobile dependency/domain boundaries. Relevant tests include:

- installer-discovery: compile real consumer integrations against installed framework types.
- installer-overrides: field exposure, identity through moves/renames, selection persistence and conflict preservation.
- query-adapters: remote query/cursor forwarding, row projection, cache notifications and cancellation.
- host-ui: preview/apply, saved-view navigation, detail navigation and original-screen state preservation.
- installer: baseline install/idempotency/remove, context exclusion and ownership behavior.

Run `npm run test:e2e` for browser interactions across the recipe/movie/task reference apps. Browser prerequisites include a Playwright Chromium installation. A missing browser, blocked port or native toolchain problem must be reported as a limitation, not as a passing check.

## Consumer checks

Use `doctor --typecheck` to include TypeScript diagnostics from the consuming app's tsconfig and generated integration. This performs static analysis, not host script execution. It reports up to 50 TypeScript diagnostics. Run the app's own lint/tests/bundle scripts separately using its documented workflow.

Verify these behaviors with the developer's actual app:

1. Original app navigation and unsaved screen state survive entering/leaving customization.
2. Manual appearance changes require preview/apply and survive restart with persistent storage.
3. A planner proposal cannot reference unregistered fields/components/routes.
4. Filters match the complete authorized dataset, including records beyond the first page.
5. Paginated results have stable IDs, no duplicate rows and meaningful counts.
6. Existing mutations update personal views through cache invalidation/custom subscriptions.
7. Tapping an item uses the existing detail workflow.
8. Logout/account switching clears active personalization and cannot render late old-user results.
9. Undo/reset and storage failure recovery behave correctly.
10. Existing saved views remain usable after a compatible refresh; incompatible views fail conservatively.

See [testing.md](testing.md) for the packed-consumer regression command, Jest configuration and native bundling commands. Run native iOS/Android builds and device checks before a production release. Check VoiceOver/TalkBack, larger text, keyboard navigation where applicable, safe areas, screen-reader visibility of the hidden original view, scrolling/memory with large collections, and lifecycle behavior while the host screen remains mounted. Generated personal navigation lives inside My space; it is not a rewrite of the host's native tab bar.

## Completion report template

State which sources, components and routes were connected; whether storage is persistent; how scope/auth are connected; whether the planner was exercised with a live provider; and the actual checks executed. List remaining manual deployment, native device or unsupported-pattern work plainly. Do not claim a fully automatic integration when the report still contains unresolved required bindings.
