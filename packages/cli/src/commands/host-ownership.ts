import { readFile } from 'node:fs/promises';
import { relative } from 'node:path';
import { sourceFiles } from '../discovery/files';
import { restoreHost } from '../generation/restore-host';
import { readOptional, readOwnership, safePath, type Ownership } from './files';

/** Follow a moved screen only when its complete SDK wrapper still identifies it. */
export async function readHostOwnership(
  root: string,
): Promise<Ownership | undefined> {
  const ownership = await readOwnership(root);
  if (!ownership) return;
  const missing = [];
  for (const file of ownership.files) {
    if (
      file.host?.wrappers.length &&
      (await readOptional(await safePath(root, file.path))) === null
    )
      missing.push(file);
  }
  if (!missing.length) return ownership;
  const occupied = new Set(ownership.files.map((file) => file.path));
  const candidates = await sourceFiles(root);
  for (const file of missing) {
    const matches: string[] = [];
    for (const candidate of candidates) {
      const path = relative(root, candidate).replaceAll('\\', '/');
      if (occupied.has(path) || !path.endsWith('.tsx')) continue;
      const text = await readFile(candidate, 'utf8');
      if (!file.host!.wrappers.every((wrapper) => text.includes(wrapper.local)))
        continue;
      try {
        restoreHost(path, text, file);
        matches.push(path);
      } catch {
        /* A partial or changed wrapper is not evidence of a move. */
      }
    }
    if (matches.length > 1)
      throw new Error(
        `Ambiguous moved screen: ${file.path}. Restore a unique file before refreshing.`,
      );
    if (matches[0]) {
      file.path = matches[0];
      occupied.add(file.path);
    }
  }
  return ownership;
}
