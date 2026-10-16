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
customitin refresh --cwd /path/to/app --dev-script develop --apply # custom launchers only
```

The CLI derives capabilities/adapters from typed repositories, query factories, components and routes. Completeness requires evidence. Components/routes are enabled with repeatable --component/--route flags or durable overrides. Generated code reuses host exports; discovery does not execute them.

Keep custom logic in personalize/config.ts and decisions in personalize/overrides.json. Commit bindings.lock.json. Generated edits block refresh/removal; never edit ownership hashes to bypass that protection. See guide --topic maintenance for moves, renames and safe removal.

Host screens and roots remain editable. Change their ordinary JSX, styles, hooks and handlers directly. Init/refresh automatically wires recognized Expo/Metro scripts so developers keep using `npm start`, `npm run web` or their existing dev command. The command starts the app and applying watcher together, forwards arguments, retains existing lifecycle hooks and shuts down both on exit. No extra process-runner dependency is required.

Existing integrations need one `refresh --apply` after updating the CLI. Custom commands can be selected once with repeatable `--dev-script NAME`; `--no-dev-watch` opts out and restores original commands. Edit `customitin:host:NAME` in package.json when changing a wrapped command. Refresh/removal preserve that current command and unrelated package fields. See [development command integration](../../docs/ai/maintenance.md#development-command-integration) for detection rules, ownership and platform verification limits.

Preserve section keys and generated wrapper imports/props. Refresh/removal retain current host edits. Watch requires an existing installation, polls once per second, stays local and reports unsupported edits without overwriting files. Standalone `watch --apply` and one-shot `refresh --apply` remain available; standalone watch defaults to dry-run. Stop development processes before one-shot applying operations.

Use `npm run pack:local -- /tmp/customitin-packages` in the SDK checkout to build tarballs and print exact app install commands. Use `--detail SOURCE=ROUTE` to connect item navigation without editing JSON. `doctor` separates optional offline/account recommendations from integration errors. Removal retains the identity lock so durable overrides still work on reinstall. See `guide --topic testing` for native Jest, deterministic proposal tests, and fresh-consumer verification.
