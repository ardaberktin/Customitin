import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';

const excluded =
  /^(node_modules|dist|build|coverage|\.git|\.expo|\.customitin|personalize|ios|android|fixtures|__tests__)$/;
const secretName =
  /(^\.|secret|credential|token|private|\.test\.|\.spec\.|\.d\.ts$)/i;
export const secretContent =
  /(?:sk-(?:proj-)?[a-zA-Z0-9_-]{12,}|-----BEGIN .*PRIVATE KEY|(?:api[_-]?key|password|secret)\s*[:=]\s*['"][^'"]+['"])/i;
export async function sourceFiles(dir: string, depth = 0): Promise<string[]> {
  if (depth > 8) return [];
  const result: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.isSymbolicLink() || excluded.test(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory())
      result.push(...(await sourceFiles(path, depth + 1)));
    else if (
      /\.tsx?$/.test(entry.name) &&
      !secretName.test(entry.name) &&
      (await stat(path)).size < 150_000
    )
      result.push(path);
    if (result.length > 500)
      throw new Error(
        'Project exceeds the 500-file discovery budget. Run in a single app workspace.',
      );
  }
  return result.sort();
}
