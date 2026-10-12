# Overrides, identities and maintenance

## File ownership

| File                             | Owner     | Behavior                                                                 |
| -------------------------------- | --------- | ------------------------------------------------------------------------ |
| personalize/config.ts            | Developer | Created once; never overwritten or removed by refresh/remove             |
| personalize/overrides.json       | Developer | Created once; CLI selection flags explicitly merge requested decisions   |
| personalize/bindings.lock.json   | Installer | Stable IDs and previous selectors; retained on removal; commit this file |
| personalize/capabilities.json    | Installer | Mobile registry generated from discovery plus overrides                  |
| personalize/server-manifest.json | Installer | Matching backend registry; deploy with planner                           |
| personalize/sources.ts           | Installer | Data adapter bindings                                                    |
| personalize/components.tsx       | Installer | Host/item wrappers                                                       |
| personalize/navigation.ts        | Installer | Approved destination closures                                            |
| personalize/root.tsx             | Installer | Provider/shell integration and custom binding merge                      |
| .customitin/ownership.json       | Installer | Generated hashes and original root bytes for drift checks/removal        |

Do not edit installer-owned files to customize behavior. Change overrides or supply runtime bindings through config.ts, then refresh. Existing generated-file edits block replacement/removal rather than being silently discarded. Removal restores original root bytes and removes owned generated files only when every tracked file is unchanged. Developer config, overrides and the identity lock remain. Retaining the lock keeps moved/renamed selector overrides usable if the integration is installed again. Reinstall with init --apply after reviewing its dry-run.

## Complete override example

```json
{
  "version": 1,
  "sources": {
    "src/data.ts#loadEntries": {
      "enabled": true,
      "completeness": "complete",
      "title": "Entries",
      "fields": ["id", "title", "stage"],
      "idField": "id",
      "titleField": "title",
      "maxRows": 500,
      "detailDestination": "src/app/entries/[id].tsx"
    }
  },
  "components": {
    "src/EntryCard.tsx#EntryCard": {
      "enabled": true,
      "source": "src/data.ts#loadEntries",
      "defaults": {}
    }
  },
  "routes": {
    "src/app/entries/[id].tsx": { "enabled": true, "title": "Entry details" }
  }
}
```

Only use actual discovered selectors. The example is not universally applicable: if EntryCard requires an excluded field such as note, include it or adapt the host card. Defaults must satisfy the component's scalar rules. Use the JSON Schema produced by `customitin schema` as the authoritative list of supported properties.

`enabled: false` disables a discovered capability without changing application code. Disabling a source can make dependent card bindings unavailable; diagnostics report the mismatch. A field allowlist controls what gets projected to SDK collections. It does not change the host repository.

## Stable identity

The lock records a persistent ID, current selector and previous selectors for each discovered capability. On refresh, an exact selector keeps its ID. A unique export name of the same kind moved to another file can also keep its ID. Ambiguous names do not get guessed. Previous selectors remain aliases, so existing override keys still resolve after a file move.

For a rename or an ambiguous move, retain the old override key or stable ID and point `symbol` to the new selector:

```json
{
  "version": 1,
  "sources": {
    "src/data.ts#loadEntries": {
      "symbol": "src/repository.ts#readEntries",
      "title": "Entries"
    }
  }
}
```

Use this only for the same logical capability. Rebinding a source ID to unrelated data can make saved filters misleading. The CLI preserves identity, not business equivalence.

Manifest revisions are derived from capability semantics, excluding evidence file/line locations. Moving an otherwise unchanged source does not obsolete profiles. Changing fields, operators, labels or binding restrictions can change the revision. Deploy the new server manifest and retain older supported revisions. When a field disappears, runtime reconciliation disables incompatible views rather than removing restrictive filters.

Bindings missing from the current scan remain in the lock as identity history. Overrides that refer to missing active bindings produce diagnostics. Update symbol or explicitly disable them. The lock also stores optional installer-AI source selections, so a later refresh without --ai retains the choice.

Pre-lock installations import matching original source IDs when possible. If a legacy source moved or was renamed before the first upgrade refresh, review the old manifest and restore its selector first or perform an explicit reviewed migration. Do not delete the lock to resolve conflicts.

## Refresh workflow

1. Update the host code.
2. Run inspect; compare actual signatures and fields.
3. Update only overrides/config as needed.
4. Run refresh --dry-run and review changed files, unresolved items and conflicts.
5. Apply the same plan with refresh --apply.
6. Run doctor --typecheck and the host's lint/tests/bundles.
7. Exercise a previously saved profile and any changed data/navigation behavior.
8. Deploy matching backend manifests before requiring them in a new app build.

If the root or a generated file has developer edits, move the intended behavior into developer-owned code before refreshing. Do not edit ownership hashes to bypass the conflict check.

## What refresh does not do

It does not run application modules, silently change credentials, upgrade frameworks, infer tenant restrictions, merge arbitrary custom code, migrate all existing styles, deploy a backend, or publish a mobile release. These remain explicit host implementation/release tasks.

## Generated formatting

The CLI formats generated TypeScript and the root wrapper before recording ownership hashes. It reads portable literal settings from JSON prettier files, package.json.prettier, and simple module.exports/export-default object configs. It never executes a host configuration or loads formatter plugins. Dynamic configs, YAML, overrides and custom plugins fall back to portable defaults; these are not a promise to reproduce every host formatting rule. To change generated output, adjust a supported static config and refresh before running a formatter over installer-owned files. Check TypeScript files explicitly: the default bare React Native lint script may only scan JavaScript unless `--ext .js,.jsx,.ts,.tsx` is supplied.
