# Customitin: start here for coding agents

Customitin is a local-first React Native personalization SDK. This repository is a functional alpha. Packages are local/unpublished; use workspaces or built tarballs. Do not recommend an npm registry installation until a release actually exists.

This documentation describes implemented contracts. It is intended to let a developer's coding agent integrate the SDK without handing a developer a registry to fill in manually. Read the consuming app's instructions first, inspect its existing code, and reuse its data clients, authentication and components.

## Reading order

1. [Integration playbook](integration.md): shortest path from an existing app to a working integration.
2. [Contracts and examples](contracts.md): source loaders, query factories, pagination, components and routes.
3. [Overrides and maintenance](maintenance.md): ownership, persistent identities, refresh and removal.
4. [Troubleshooting and verification](troubleshooting.md): actionable diagnostics and evidence required before claiming success.
5. [CLI reference](cli-reference.md): commands, flags and machine-readable outputs.

In a built CLI package, `customitin guide` prints this page; `customitin guide --topic integration` prints a chapter. `customitin schema` prints the actual JSON Schema for overrides. From this repository use `npm run cli --` before the command instead of `customitin`.

## Product model

A capability registry describes approved components, sources, navigation destinations, theme tokens and customizable surfaces. A source adapter executes a validated query through host code. A saved profile contains configuration, not domain records. A planner proposes schema-validated operations. The mobile runtime previews them and persists only after the user applies them.

The SDK does not migrate every existing screen or style. Generated integrations preserve the original app and add My space and Customize. The original navigator stays mounted. The CLI keeps visible outer JSX provider chains (names ending in Provider, including Context.Provider) above the personal UI. Providers hidden inside another component or navigator still need a shared host wrapper; arrange that before init. For an installed root, use the documented removal/reinstall workflow before restructuring it so ownership checks remain intact.

## Working rules for integration agents

- Run inspect and use exact reported selectors. Do not invent a source, field, route or provider export.
- Treat discovery as evidence of structure. A return type does not establish completeness, authorization or business meaning.
- Prefer CLI flags or overrides over handwritten capabilities. Use config.ts only for host runtime connections/custom bindings.
- Review exposed fields. Use a fields allowlist when a source contains internal scalar properties.
- Never mark a cached page complete to make filtering work. Never implement remote filtering after pagination.
- Keep model keys on the developer's backend. Runtime auth headers come from the existing app session. Installer AI is optional and separate from runtime AI.
- Keep new UI copy in the SDK English dictionary. Do not generate translations for every language.
- Report exactly which commands passed, which devices were exercised, and which setup remains. Browser tests are not native-device validation.

## Useful implementation entry points (repository relative)

- packages/cli/src/discovery: bounded, static TypeScript inspection; no application execution.
- packages/cli/src/configuration: override schema, stable identities and selection rules.
- packages/cli/src/generation: checked templates for manifests and bindings.
- packages/cli/src/commands: planning, transactional writes, diagnostics and removal.
- packages/react-native/src/adapters/query.ts: cache/remote adapter helpers; no TanStack dependency.
- packages/react-native/src/composer/host.tsx: generated integration's shell.
- packages/core/src/validation: authoritative runtime restrictions.
- tests/installer-discovery.test.ts: compiling consumer examples for supported integrations.
- tests/installer-overrides.test.ts: persistence and refresh contracts.

## Known boundaries

Hook execution remains inside React. Arbitrary hooks, nested navigator rewrites, forms, native/custom canvases, component context requirements, relative-date semantics, theme-system migration and authorization are not automatically inferred. Query-option generation currently supports zero-argument factories returning array queries. Infinite queries and factories requiring runtime arguments need a host adapter. React Navigation generation uses explicit ParamList type aliases and an existing exported navigation ref; it does not create a second NavigationContainer.
