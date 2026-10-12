# @customitin/cli

Customitin's static integration generator. Functional 0.1 alpha; this package is not yet published to npm.

Start with `customitin guide`. Use `customitin guide --topic integration` for the AI-assisted playbook and `customitin schema` for the overrides JSON Schema. Built packages include the full guides in [dist/docs](dist/docs/index.md); the repository source is [docs/ai](../../docs/ai/index.md).

```sh
customitin inspect --cwd /path/to/app
customitin init --cwd /path/to/app --dry-run
customitin init --cwd /path/to/app --complete 'src/data.ts#loadItems' --apply
customitin doctor --cwd /path/to/app --typecheck
customitin refresh --cwd /path/to/app --dry-run
```

The CLI derives capabilities/adapters from typed repositories, query factories, components and routes. Completeness requires evidence. Components/routes are enabled with repeatable --component/--route flags or durable overrides. Generated code reuses host exports; discovery does not execute them.

Keep custom logic in personalize/config.ts and decisions in personalize/overrides.json. Commit bindings.lock.json. Generated edits block refresh/removal; never edit ownership hashes to bypass that protection. See guide --topic maintenance for moves, renames and safe removal.

Use `npm run pack:local -- /tmp/customitin-packages` in the SDK checkout to build tarballs and print exact app install commands. Use `--detail SOURCE=ROUTE` to connect item navigation without editing JSON. `doctor` separates optional offline/account recommendations from integration errors. Removal retains the identity lock so durable overrides still work on reinstall. See `guide --topic testing` for native Jest, deterministic proposal tests, and fresh-consumer verification.
