import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { ts } from 'ts-morph';

/** Resolve solution-style app configs without executing host configuration. */
export function applicationConfig(root: string) {
  const initial = join(root, 'tsconfig.json');
  const inputs = new Map<string, string>();
  if (!existsSync(initial)) return { path: undefined, inputs };
  const configs = new Map<string, ts.ParsedCommandLine>();
  const visit = (path: string) => {
    if (configs.has(path)) return;
    if (configs.size >= 20)
      throw new Error(
        'TypeScript configuration exceeds 20 referenced projects.',
      );
    const parsed = ts.getParsedCommandLineOfConfigFile(
      path,
      {},
      {
        ...ts.sys,
        readFile(file) {
          const text = ts.sys.readFile(file);
          if (text !== undefined && /\.json$/i.test(file))
            inputs.set(file, text);
          return text;
        },
        onUnRecoverableConfigFileDiagnostic(diagnostic) {
          throw new Error(
            ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
          );
        },
      },
    );
    if (!parsed)
      throw new Error(`Cannot read TypeScript configuration: ${path}`);
    configs.set(path, parsed);
    for (const reference of parsed.projectReferences ?? [])
      visit(ts.resolveProjectReferencePath(reference));
  };
  visit(initial);
  const primary = configs.get(initial)!;
  if (
    !primary.projectReferences?.length ||
    primary.fileNames.some((file) => /\.tsx$/.test(file))
  )
    return { path: initial, inputs };
  const candidates = [...configs].filter(([path]) => path !== initial);
  const entry = [
    'src/app/_layout.tsx',
    'app/_layout.tsx',
    'App.tsx',
    'src/App.tsx',
  ]
    .map((file) => resolve(root, file))
    .find((file) => existsSync(file));
  const matching = candidates.filter(
    ([, config]) => entry && config.fileNames.includes(entry),
  );
  const apps = matching.length
    ? matching
    : candidates.filter(([, config]) => config.options.jsx !== undefined);
  if (apps.length !== 1)
    throw new Error(
      'Cannot select one application TypeScript project. Ensure exactly one referenced config includes the app entrypoint.',
    );
  return { path: apps[0]![0], inputs };
}
