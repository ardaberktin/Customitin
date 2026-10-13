import type { ResolvedIntegration } from '../configuration/resolve';
import type { DiscoveryReport } from '../discovery/types';
import { instrumentScreen } from '../generation/screens';
import { wrapEntry } from '../generation/transform';
import { restoreHost } from '../generation/restore-host';
import {
  emptyHostBindings,
  type HostBindings,
} from '../generation/host-bindings';
import { readOptional, safePath, type Ownership } from './files';

export async function generateHostFiles(
  root: string,
  report: DiscoveryReport,
  integration: ResolvedIntegration,
  previous?: Ownership,
) {
  const files: Record<string, string> = {};
  const selected = new Set(
    integration.screens.map(({ symbol }) => symbol.file),
  );
  const restored: Record<string, string> = {};
  const before: Record<string, string> = {};
  const bindings: Record<string, HostBindings> = {};
  async function original(path: string) {
    if (before[path] !== undefined) return before[path];
    const current = await readOptional(await safePath(root, path));
    if (current === null) throw new Error(`Missing host file: ${path}`);
    before[path] = restoreHost(
      path,
      current,
      previous?.files.find((file) => file.path === path),
    );
    bindings[path] = emptyHostBindings();
    return before[path];
  }
  for (const screen of integration.screens) {
    const path = screen.symbol.file;
    try {
      const text = files[path] ?? (await original(path));
      files[path] = instrumentScreen(path, text, screen, bindings[path]);
    } catch (error) {
      integration.issues.push(`${path}: ${(error as Error).message}`);
    }
  }
  for (const owned of previous?.files ?? []) {
    if (
      owned.before !== null &&
      owned.path.endsWith('.tsx') &&
      !owned.path.startsWith('personalize/') &&
      owned.path !== report.entry &&
      !selected.has(owned.path)
    ) {
      try {
        if ((await readOptional(await safePath(root, owned.path))) === null)
          continue;
        restored[owned.path] = await original(owned.path);
      } catch (error) {
        integration.issues.push(`${owned.path}: ${(error as Error).message}`);
      }
    }
  }
  if (report.entry) {
    try {
      const text = files[report.entry] ?? (await original(report.entry));
      files[report.entry] = wrapEntry(
        report.entry,
        text,
        bindings[report.entry],
      );
    } catch (error) {
      report.unresolved.push((error as Error).message);
      integration.issues.push((error as Error).message);
    }
  } else
    integration.issues.push(
      'No supported root found; mount PersonalizationRoot inside the host provider tree.',
    );
  return { files, selected, restored, before, bindings };
}
