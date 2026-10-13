# @customitin/cli

Use `inspect` to find existing-screen candidates, then `init --screen 'src/screens/Home.tsx#Home' --dry-run` and `--apply` for in-place personalization. Repeat `--screen` as needed. The CLI derives stable section IDs, retains the screen's JSX/handlers, connects supported text/spacing primitives and installs provider-only root wiring. No separate My space is added in this mode. Set `screens[selector].requiredSections` in overrides for controls users must not hide. See [contracts](../../docs/ai/contracts.md#existing-screens) and [ownership/removal](../../docs/ai/maintenance.md).

Customitin's static integration generator. Functional 0.1 alpha; this package is not yet published to npm.

Start with `customitin guide`. Use `customitin guide --topic integration` for the AI-assisted playbook and `customitin schema` for the overrides JSON Schema. Built packages include the full guides in [dist/docs](dist/docs/index.md); the repository source is [docs/ai](../../docs/ai/index.md).

```sh
customitin inspect --cwd /path/to/app
customitin init --cwd /path/to/app --dry-run
customitin init --cwd /path/to/app --complete 'src/data.ts#loadItems' --apply
customitin doctor --cwd /path/to/app --typecheck
customitin refresh --cwd /path/to/app --dry-run
customitin watch --cwd /path/to/app --apply
```

The CLI derives capabilities/adapters from typed repositories, query factories, components and routes. Completeness requires evidence. Components/routes are enabled with repeatable --component/--route flags or durable overrides. Generated code reuses host exports; discovery does not execute them.

Keep custom logic in personalize/config.ts and decisions in personalize/overrides.json. Commit bindings.lock.json. Generated edits block refresh/removal; never edit ownership hashes to bypass that protection. See guide --topic maintenance for moves, renames and safe removal.

Host screens and roots remain editable. Change their ordinary JSX, styles, hooks and handlers directly; run watch --apply alongside Metro/Expo for automatic section registration, or refresh --apply on demand. Preserve section keys and generated wrapper imports/props. Refresh/removal retain current host edits. Watch requires an existing installation, polls once per second, stays local and reports unsupported edits without overwriting files. Ctrl+C stops it; --dry-run overrides --apply. No dev-script changes or additional runtime dependencies are required.

Use `npm run pack:local -- /tmp/customitin-packages` in the SDK checkout to build tarballs and print exact app install commands. Use `--detail SOURCE=ROUTE` to connect item navigation without editing JSON. `doctor` separates optional offline/account recommendations from integration errors. Removal retains the identity lock so durable overrides still work on reinstall. See `guide --topic testing` for native Jest, deterministic proposal tests, and fresh-consumer verification.
