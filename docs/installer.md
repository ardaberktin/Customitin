# Installer coverage and ownership

Discovery reads TypeScript, package manifests, and tsconfig as data. It does not import application modules or execute project scripts. Exported symbols have file/line evidence. Secret-like files, dependency/build/native directories, symlinks, and files with detected credential literals are excluded from selected AI context. Context consists of synthesized signatures and locations, not source bodies or comments. It is inspectable with `inspect --context`; the SHA-256 digest must match before optional AI transmission.

Supported automatic binding: exported zero-argument typed array loader, primitive non-nullable fields, `id`, and the explicit `@customitinComplete` contract. The source remains proposed until a developer verifies its semantics. There are generic cards when component prop contracts cannot be proven. Hook functions are reported for a hook-safe adapter, never invoked as ordinary loaders. Paginated endpoints and query factories can use the public runtime adapter; automatic extraction of those patterns is a documented alpha gap.

Supported root edit: a named default function with one top-level JSX return. AST editing adds a `PersonalizationRoot` wrapper without changing existing JSX. This creates a separate personal surface and an explicit entry control. The original component remains available. Existing nested navigation is not rewritten, hardcoded styles are not migrated, and the wrapper does not expose private application state.

`init` and `refresh` are dry-run by default and print exact proposed file content plus changes and conflicts. `--apply` explicitly writes the reviewed integration. `personalize/config.ts` is always developer-owned. The ownership manifest stores generated hashes and original root content. Repeated install is a no-op with the same evidence. Changed generated files block refresh. Removal refuses the entire removal when an owned file has drifted, preventing a partially broken integration; it never removes config.ts. A crash during installation remains diagnosable from ownership hashes. Refresh supports template regeneration; resolving consumer changes is a manual review step.

The doctor checks ownership drift, mobile/server manifest agreement, required SDK dependencies, and default in-memory/unconfigured-endpoint placeholders. Consumers run their existing typecheck, lint, adapter tests, and bundle scripts explicitly; the CLI does not execute unknown project scripts. Tests compile a clean generated consumer and compare the original source after removal. Model-selected shell commands and arbitrary model-generated code are never executed.

For a source you have verified complete:

```ts
interface Item {
  id: string;
  title: string;
  available: boolean;
}
/** @customitinComplete */
export async function loadItems(): Promise<Item[]> {
  return existingRepository.readAll();
}
```

The model may select only discovered, complete symbols. Ambiguous fields remain unresolved. A metadata confidence score is never treated as verification. App identity derives from the package name and stays stable across checkout paths. Use a unique package name and review identity changes when renaming an app.
