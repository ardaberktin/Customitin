import { mkdtemp, readFile, writeFile, mkdir, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { expect, it } from 'vitest';
import {
  doctorProject,
  inspectProject,
  installProject,
  planInstall,
  proposeMapping,
  removeProject,
} from '@customitin/cli';
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'customitin-installer-'));
  await writeFile(
    join(root, 'package.json'),
    JSON.stringify({
      name: 'fixture',
      dependencies: {
        'expo-router': '55.0.18',
        '@customitin/react-native': '0.1.0-alpha.1',
      },
    }),
  );
  await writeFile(
    join(root, 'App.tsx'),
    "import { Text } from 'react-native';\nexport default function App() { return <Text>Existing workflow</Text>; }\n",
  );
  await writeFile(
    join(root, 'repository.ts'),
    'export interface Entry { id: string; title: string; done: boolean; }\n/** @customitinComplete */\nexport async function loadEntries(): Promise<Entry[]> { return [{ id: "1", title: "Private record", done: false }]; }\n',
  );
  await writeFile(join(root, '.env'), 'API_KEY=secret-value');
  await writeFile(
    join(root, 'secrets.ts'),
    'export const apiKey = "sk-secret-value-not-for-context";',
  );
  return root;
}
it('discovers concrete source evidence without sending bodies, records or secrets', async () => {
  const root = await fixture();
  const report = await inspectProject(root);
  expect(
    report.symbols.some((s) => s.name === 'loadEntries' && s.complete),
  ).toBe(true);
  expect(report.context).not.toMatch(/Private record|secret-value|API_KEY/);
  expect(report.context).toContain('repository.ts');
  await expect(
    proposeMapping(report, {
      approvedDigest: 'wrong',
      apiKey: 'unused',
      model: 'unused',
    }),
  ).rejects.toThrow('digest');
});
it('installs a compiling fixture, reruns without changes, and restores the original source on removal', async () => {
  const root = await fixture();
  const before = await readFile(join(root, 'App.tsx'), 'utf8');
  const dry = await planInstall(root);
  expect(dry.changes).toContain('App.tsx');
  await expect(readFile(join(root, 'personalize/root.tsx'))).rejects.toThrow();
  const installed = await installProject(root, { dryRun: false });
  expect(installed.conflicts).toEqual([]);
  const again = await installProject(root, { dryRun: false });
  expect(again.changes).toEqual([]);
  await symlink(
    join(process.cwd(), 'node_modules'),
    join(root, 'node_modules'),
    'dir',
  );
  await writeFile(
    join(root, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        strict: true,
        jsx: 'react-jsx',
        module: 'ESNext',
        moduleResolution: 'Bundler',
        target: 'ES2022',
        esModuleInterop: true,
        skipLibCheck: true,
        resolveJsonModule: true,
        noEmit: true,
        baseUrl: process.cwd(),
        paths: {
          '@customitin/core': ['packages/core/src/index.ts'],
          '@customitin/react-native': ['packages/react-native/src/index.ts'],
          '@customitin/react-native/storage': [
            'packages/react-native/src/storage/index.ts',
          ],
        },
      },
      include: ['*.tsx', '*.ts', 'personalize'],
    }),
  );
  execFileSync(
    process.execPath,
    [
      join(process.cwd(), 'node_modules/typescript/bin/tsc'),
      '--project',
      join(root, 'tsconfig.json'),
    ],
    { stdio: 'pipe' },
  );
  const removed = await removeProject(root, false);
  expect(removed.conflicts).toEqual([]);
  expect(await readFile(join(root, 'App.tsx'), 'utf8')).toBe(before);
  expect(await readFile(join(root, 'personalize/config.ts'), 'utf8')).toContain(
    'Developer-owned',
  );
});
it('preserves developer edits during refresh and removal and detects manifest mismatch', async () => {
  const root = await fixture();
  await installProject(root, { dryRun: false });
  const path = join(root, 'personalize/sources.ts');
  const edited = (await readFile(path, 'utf8')) + '\n// My reviewed adapter\n';
  await writeFile(path, edited);
  expect((await installProject(root, { dryRun: false })).conflicts).toContain(
    'personalize/sources.ts',
  );
  expect((await removeProject(root, false)).conflicts).toContain(
    'personalize/sources.ts',
  );
  expect(await readFile(path, 'utf8')).toBe(edited);
  const server = JSON.parse(
    await readFile(join(root, 'personalize/server-manifest.json'), 'utf8'),
  );
  server.revision = 'different';
  await writeFile(
    join(root, 'personalize/server-manifest.json'),
    JSON.stringify(server),
  );
  expect(
    (await doctorProject(root)).issues.some((s) => s.includes('mismatch')),
  ).toBe(true);
});
it('does not overwrite symlinked directories or invent completeness for hooks', async () => {
  const root = await fixture();
  await writeFile(
    join(root, 'hooks.ts'),
    'export function useEntries() { return []; }\nexport async function getEntries(): Promise<{ id: string }[]> { return []; }',
  );
  const report = await inspectProject(root);
  expect(report.unresolved.some((s) => s.includes('hook'))).toBe(true);
  expect(report.unresolved.some((s) => s.includes('completeness'))).toBe(true);
  const outside = await mkdtemp(join(tmpdir(), 'customitin-outside-'));
  await mkdir(join(root, 'parent'));
  await symlink(outside, join(root, 'personalize'), 'dir');
  await expect(installProject(root, { dryRun: false })).rejects.toThrow(
    'Symlinks',
  );
});
