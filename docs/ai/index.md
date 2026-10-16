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

To personalize existing UI, use `inspect` and enable supported screen selectors with `init --screen <selector>`. The CLI instruments the selected screen's existing JSX, registers its sections, and mounts a provider around the original app. Each selected screen gets its own customization controls; this mode does not add My space or replace navigation. Users can reorder/hide optional sections, preview/apply, undo, restore the layout, and change connected text sizes/spacing without a planner. Hooks, callbacks and data stay in host code. See [screen contracts](contracts.md#existing-screens).

Without screen selections, generated integrations retain the separate My space/Customize shell. Neither mode migrates every existing screen or style. The CLI keeps visible outer JSX provider chains (names ending in Provider, including Context.Provider) above personalization. Providers hidden inside another component or navigator still need a shared host wrapper. Edit host screens/root normally; init/refresh wires recognized Expo/Metro development scripts to start the watcher automatically. Keep using the app's existing command. Refresh/remove preserve current host edits. Keep the generated SDK wrapper props/imports intact. See [maintenance](maintenance.md) for custom scripts, opt-out and ownership.

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
- packages/cli/src/development: reversible package-script wiring, host process lifecycle and exclusive watcher ownership.
- packages/react-native/src/adapters/query.ts: cache/remote adapter helpers; no TanStack dependency.
- packages/react-native/src/composer/host.tsx: generated integration's shell.
- packages/core/src/validation: authoritative runtime restrictions.
- tests/installer-discovery.test.ts: compiling consumer examples for supported integrations.
- tests/installer-overrides.test.ts: persistence and refresh contracts.

## Known boundaries

Hook execution remains inside React. Existing-screen instrumentation supports static sections in a vertical View/ScrollView. Conditional roots, virtualized/horizontal layouts, native/custom canvases, required-control semantics, deep custom-component styling, relative-date semantics, theme-system migration and authorization are not automatically inferred. Existing forms can remain inside a section; the SDK preserves their mounted state but does not edit their behavior. Query-option generation currently supports zero-argument factories returning array queries. Infinite queries and factories requiring runtime arguments need a host adapter. React Navigation generation uses explicit ParamList type aliases and an existing exported navigation ref; it does not create a second NavigationContainer.
