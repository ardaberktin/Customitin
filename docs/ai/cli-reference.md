# CLI reference

Commands operate in the current app or `--cwd /absolute/path`. Default mutations are dry runs; `--apply` writes and `--dry-run` takes precedence. Source analysis never executes host modules/scripts. Only `dev` launches the requested host development command.

| Command/flag                                           | Behavior                                                                                                     |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `inspect`                                              | Readable v2 report, suggested bindings, attention items and approval digest                                  |
| `inspect --json`                                       | Versioned source inventory and `review` (including `review.digest`)                                          |
| `inspect --context`                                    | Exact optional installer-model context and separate `contextDigest`                                          |
| `init`, `refresh`                                      | Provider/binding plan; neither adds visual UI/navigation/theme                                               |
| `--approve-report DIGEST`                              | Enable the reviewed suggested set; stale reports fail                                                        |
| `--exclude ID_OR_SELECTOR`                             | Repeatable exclusions from that reviewed set                                                                 |
| `--complete SELECTOR`                                  | Enable a source and explicitly confirm completeness                                                          |
| `--component SELECTOR`                                 | Explicitly enable a reusable host component                                                                  |
| `--screen SELECTOR`                                    | Instrument static existing sections, retaining their host scope                                              |
| `--route SELECTOR`                                     | Register a navigation binding; adds no route or tab                                                          |
| `--detail SOURCE=ROUTE`                                | Explicit legacy item-detail binding                                                                          |
| `--query-client SELECTOR`, `--navigation-ref SELECTOR` | Choose existing exported host instances                                                                      |
| `doctor --typecheck`                                   | Ownership, package, manifest and static TypeScript checks; not runtime/device verification                   |
| `watch --apply`                                        | Refresh an installed integration without enabling new discoveries                                            |
| `dev --script NAME -- ARGS`                            | Run the saved host command and one shared applying watcher                                                   |
| `--dev-script NAME`, `--no-dev-watch`                  | Persist script selection/opt-out while preserving host commands                                              |
| `remove --apply`                                       | Remove tracked SDK instrumentation while preserving current host code, config, overrides and IDs             |
| `schema`                                               | Authoritative JSON schema for developer-owned overrides                                                      |
| `guide --topic TOPIC`                                  | Print packaged AI guide: index, integration, contracts, maintenance, troubleshooting, testing, cli-reference |

Enablement is independent from the optional installer model. `--ai --approve-context DIGEST` requires `CUSTOMITIN_INSTALLER_API_KEY` and `CUSTOMITIN_INSTALLER_MODEL`, sends only the separately reviewed bounded context, and can choose known supported source adapters. It cannot invent bindings, infer authorization/completeness or bypass manifest validation. Runtime personalization uses the developer's authenticated planner endpoint instead.

Use stable IDs and actual selectors from the report. Review exclusions and source field permissions before approving. Generated `personalize/discovery.json` records evidence; executable adapters stay in TypeScript. Exit code 1 indicates actionable issues/conflicts. Preserve generated drift for review; do not rewrite ownership hashes.
