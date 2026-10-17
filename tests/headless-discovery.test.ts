import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { expect, it } from 'vitest';
import {
  inspectProject,
  reviewProject,
  installProject,
  overridesSchema,
  planInstall,
} from '@customitin/cli';
import { compileConsumer, consumer, entries } from './helpers/consumer';

it('generates provider-only Vite bindings for array inputs and child slots; imports no native code', async () => {
  const root = await consumer({
    'package.json': JSON.stringify({
      name: 'web-consumer',
      dependencies: {
        react: '19.2.0',
        'react-dom': '19.2.0',
        '@customitin/core': '0.1.0-alpha.1',
        '@customitin/react': '0.1.0-alpha.1',
      },
      scripts: { dev: 'vite' },
    }),
    'App.tsx':
      'export default function App() { return <main><p>Original appearance</p></main>; }',
    'Chart.tsx':
      "import { memo, type ReactNode } from 'react'; export const Chart = memo(({ data, children }: { data: { label: string; value: number }[]; children?: ReactNode }) => <section>{data.map(item => <p key={item.label}>{item.value}</p>)}{children}</section>);",
  });
  const report = await reviewProject(root);
  expect(report.platform).toBe('web');
  const installed = await installProject(root, {
    dryRun: false,
    approvalDigest: report.digest,
  });
  expect(installed.issues).toEqual([]);
  const capabilities = JSON.parse(
    installed.files['personalize/capabilities.json']!,
  );
  expect(capabilities.themeTokens).toEqual({});
  expect(capabilities.destinations).toEqual([]);
  expect(capabilities.surfaces).toEqual([]);
  expect(installed.files['personalize/components.tsx']).toContain(
    'data.data?.rows',
  );
  expect(installed.files['personalize/root.tsx']).toContain(
    'CustomizationProvider',
  );
  expect(
    Object.values(installed.files)
      .filter((content) => content.includes('from '))
      .join('\n'),
  ).not.toMatch(/from ['"](?:react-native|@customitin\/react-native)/);
  compileConsumer(root);
  expect((await planInstall(root)).changes).toEqual([]);
});

it('approves a snapshot with exclusions, rejects stale approval and keeps newly discovered capabilities pending', async () => {
  const root = await consumer({ 'data.ts': entries });
  const first = await reviewProject(root);
  await installProject(root, { dryRun: false, approvalDigest: first.digest });
  await writeFile(
    join(root, 'data.ts'),
    entries +
      '\n/** @customitinComplete */\nexport const another = loadEntries;',
  );
  await expect(
    installProject(root, { dryRun: false, approvalDigest: first.digest }),
  ).rejects.toThrow('changed');
  const refreshed = await installProject(root, { dryRun: false });
  expect(
    JSON.parse(refreshed.files['personalize/capabilities.json']!).sources,
  ).toHaveLength(1);
  const next = await reviewProject(root);
  expect(
    next.capabilities.find((item) => item.selector.endsWith('#another'))
      ?.status,
  ).toBe('bindable');
  const excluded = await installProject(root, {
    dryRun: false,
    approvalDigest: next.digest,
    exclude: ['data.ts#another'],
  });
  expect(
    JSON.parse(excluded.files['personalize/capabilities.json']!).sources,
  ).toHaveLength(1);
});

it('follows reachable workspace aliases/re-exports while inventorying imported dependency usage', async () => {
  const root = await consumer({
    'App.tsx':
      "import { SharedCard } from '../shared'; import { GestureDetector } from 'some-gesture-library'; export default function App() { return <GestureDetector><SharedCard label='One' /></GestureDetector>; }",
  });
  const workspace = dirname(root);
  // Isolate the workspace boundary inside the temporary fixture instead of marking the OS temp root.
  const app = join(root, 'app');
  await mkdir(app);
  await writeFile(
    join(root, 'package.json'),
    JSON.stringify({ name: 'workspace', workspaces: ['app', 'shared'] }),
  );
  await writeFile(
    join(app, 'package.json'),
    JSON.stringify({ name: 'web', dependencies: { 'react-dom': '19.2.0' } }),
  );
  await writeFile(
    join(app, 'App.tsx'),
    await readFile(join(root, 'App.tsx'), 'utf8'),
  );
  await writeFile(
    join(app, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        module: 'ESNext',
        moduleResolution: 'Bundler',
        jsx: 'react-jsx',
        paths: { '@host/shared': ['../shared/index.ts'] },
      },
    }),
  );
  await writeFile(
    join(app, 'App.tsx'),
    (await readFile(join(app, 'App.tsx'), 'utf8')).replace(
      "'../shared'",
      "'@host/shared'",
    ),
  );
  await mkdir(join(root, 'shared'));
  await writeFile(
    join(root, 'shared', 'package.json'),
    JSON.stringify({ name: '@host/shared', main: 'index.ts' }),
  );
  await writeFile(
    join(root, 'shared', 'index.ts'),
    "export { SharedCard } from './Card';",
  );
  await writeFile(
    join(root, 'shared', 'Card.tsx'),
    "import { type ReactNode } from 'react'; export function SharedCard({label}: {label:string}): ReactNode { return <article>{label}</article>; }",
  );
  expect(workspace).toBeTruthy();
  const report = await inspectProject(app);
  expect(
    report.symbols.some(
      (symbol) => symbol.selector === '../shared/Card.tsx#SharedCard',
    ),
  ).toBe(true);
  expect(
    report.importedComponents.some(
      (item) => item.module === 'some-gesture-library',
    ),
  ).toBe(true);
});

it('instruments static DOM regions without replacing host primitives or adding controls', async () => {
  const root = await consumer(
    {
      'App.tsx':
        "export default function App() { return <main><section key='a'><input aria-label='Draft' /></section><p key='b'>Keep style</p></main>; }",
    },
    { 'react-dom': '19.2.0' },
  );
  const result = await installProject(root, {
    dryRun: false,
    overrides: overridesSchema.parse({
      version: 1,
      screens: { 'App.tsx#default': { enabled: true } },
    }),
  });
  expect(result.issues).toEqual([]);
  expect(result.files['App.tsx']).toContain('@customitin/react/dom');
  expect(result.files['App.tsx']).not.toContain('button');
  compileConsumer(root);
});

it('initializes generated bindings when host components are colocated with the app root', async () => {
  const root = await consumer(
    {
      'App.tsx':
        "import { memo } from 'react'; export const Card = memo(({label}: {label:string}) => <p>{label}</p>); export default function App() { return <main><Card label='Original' /></main>; }",
    },
    { 'react-dom': '19.2.0' },
  );
  const report = await reviewProject(root);
  await installProject(root, { dryRun: false, approvalDigest: report.digest });
  compileConsumer(root);
  const { build } = await import('esbuild');
  const { execFileSync } = await import('node:child_process');
  const entry = join(root, 'load.mjs');
  await build({
    entryPoints: [join(root, 'App.tsx')],
    outfile: entry,
    bundle: true,
    platform: 'node',
    format: 'esm',
    packages: 'external',
    logLevel: 'silent',
  });
  // Module initialization must not read an uninitialized component through the generated root cycle.
  expect(() =>
    execFileSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        `import App from ${JSON.stringify(entry)}; if (typeof App !== 'function') throw Error('Missing root');`,
      ],
      { cwd: root, stdio: 'pipe' },
    ),
  ).not.toThrow();
});
