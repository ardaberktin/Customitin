# Installer coverage and ownership

Read the [AI integration playbook](ai/integration.md), [contracts](ai/contracts.md), [override/refresh guide](ai/maintenance.md), and [CLI reference](ai/cli-reference.md) for complete instructions. `customitin guide` exposes these guides without network access; `customitin schema` exposes the actual override schema.

## Discovery and generation

Discovery reads TypeScript as data, resolves its type graph and does not execute app modules or package scripts. It handles exported functions, arrow loaders, repository methods, scalar-record component props, zero-argument query-option factories, query clients, Expo routes and explicit React Navigation ParamList aliases/refs. Scalar enums and nullable/optional values are supported; nested records stay unexposed.

Complete array repositories require @customitinComplete or a reviewed completeness override. This is a host completeness contract, not an inference from a cache. Paginated functions require @customitinQuery and the documented query/context/cursor contract. Remote operators must be explicitly declared. Query factories use the existing selected QueryClient with scoped keys and invalidation subscriptions; arbitrary hooks/infinite queries need host adapters.

Components require --component, an enabled override, or @customitinComponent. Supported host sections have scalar props; item cards have one compatible scalar-record prop and optional onPress. Generated item descriptors restrict their source IDs. Context providers, complex required props and active forms require host wrappers. Routes are discovered but only enabled explicitly. Expo catch-all routes and nested React Navigation params require custom bindings.

Default function and arrow roots returning a single JSX expression/fragment can be wrapped. Conditional returns and higher-order roots are diagnosed instead of rewritten. The generated shell keeps the original app mounted and offers Original app, My space and Customize, including saved-view navigation inside My space. It does not rewrite the host tab navigator or migrate styles.

## Persistent configuration

config.ts and overrides.json are developer-owned. Generated bindings/manifests and bindings.lock.json are installer-owned. The lock retains stable IDs across unique file moves and reviewed symbol rebindings. Semantic manifest revisions exclude source evidence locations. Optional AI source selections persist across refreshes. Older installations preserve matching legacy source IDs during their first lock migration.

init/refresh are dry-run by default and print exact generated content, new developer-owned setup, changes, conflicts and unresolved items. --apply writes the plan; --dry-run wins when both are supplied. Selection flags explicitly merge requested decisions into overrides. Existing config is never overwritten. Generated-file drift blocks replacement/removal. remove restores the original root and leaves config/overrides.

## Diagnostics and context

Doctor checks ownership, manifest agreement, source/override resolution, generated changes and storage/planner/scope placeholders. --typecheck adds static host/generated TypeScript diagnostics; it does not run package scripts. Developers still run host lint, adapter tests, interaction tests and bundles.

Secret-like filenames, dependency/build/native directories, symlinks and files with detected credential literals are excluded from selected AI context. Context consists of synthesized signatures, prop/field contracts and route locations; never function bodies, comments, environment files or domain records. Literal enum metadata can still be private. Review inspect --context; its SHA-256 digest must match before optional transmission. The model selects only existing complete sources and never emits executable installer code or shell commands.

The test suite compiles generated consumers using actual installed framework types, checks stable identity through moves/renames, validates cache invalidation/cancellation and exercises generated-shell interactions. Physical devices, live provider behavior and independent pilots remain separate release checks.
