import { createHash } from 'node:crypto';
import {
  lstat,
  mkdir,
  readFile,
  realpath,
  rename,
  writeFile,
} from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { z } from 'zod';
import { hostBindingsSchema } from '../generation/host-bindings';
export const hash = (text: string) =>
  createHash('sha256').update(text).digest('hex');
export const manifestPath = '.customitin/ownership.json';
const ownedFile = z
  .object({
    path: z.string(),
    hash: z.string(),
    before: z.string().nullable(),
    host: hostBindingsSchema.optional(),
  })
  .strict();
export const ownershipSchema = z
  .object({
    version: z.literal(1),
    registryRevision: z.string(),
    contextDigest: z.string(),
    files: z.array(ownedFile).max(80),
  })
  .strict();
export type Ownership = z.infer<typeof ownershipSchema>;
export async function safePath(root: string, path: string): Promise<string> {
  const screenPath =
    path.endsWith('.tsx') &&
    !path
      .split(/[\\/]/)
      .some((part) =>
        /^(\.|node_modules$|dist$|build$|coverage$|ios$|android$|fixtures$|__tests__$)/.test(
          part,
        ),
      ) &&
    !/(secret|credential|token|private|\.test\.|\.spec\.)/i.test(path);
  if (
    isAbsolute(path) ||
    path.split(/[\\/]/).some((s) => s === '..') ||
    !(
      screenPath ||
      /^(personalize\/|src\/app\/_layout\.tsx$|app\/_layout\.tsx$|App\.tsx$|src\/App\.tsx$|\.customitin\/ownership\.json$)/.test(
        path,
      )
    )
  )
    throw new Error('Unowned integration path');
  const absolute = resolve(root, path);
  const realRoot = await realpath(root);
  let parent = absolute;
  for (;;) {
    try {
      const info = await lstat(parent);
      if (info.isSymbolicLink()) throw new Error('Symlinks are not editable');
      const real = await realpath(parent);
      if (relative(realRoot, real).startsWith('..'))
        throw new Error('Path escapes project');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
    if (parent === resolve(root)) break;
    parent = dirname(parent);
  }
  return absolute;
}
export async function readOptional(path: string): Promise<string | null> {
  try {
    return await readFile(path, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}
export async function atomicWrite(
  root: string,
  path: string,
  content: string,
): Promise<void> {
  const target = await safePath(root, path);
  await mkdir(dirname(target), { recursive: true });
  const temporary = `${target}.customitin-tmp`;
  await writeFile(temporary, content, { flag: 'wx' });
  await rename(temporary, target);
}
export async function readOwnership(
  root: string,
): Promise<Ownership | undefined> {
  const path = await safePath(root, manifestPath);
  const text = await readOptional(path);
  return text ? ownershipSchema.parse(JSON.parse(text)) : undefined;
}
export const fullPath = (root: string, path: string) => join(root, path);
