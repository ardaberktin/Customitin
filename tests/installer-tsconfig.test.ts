import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import {
  doctorProject,
  inspectProject,
  installProject,
  reviewProject,
} from '@customitin/cli';
import { consumer } from './helpers/consumer';
import { projectSnapshot } from '../packages/cli/src/commands/snapshot';

it('uses the referenced Vite app config for aliases, discovery, doctor and approval freshness', async () => {
  const root = await consumer(
    {
      'App.tsx':
        "import { Chart } from '@/Chart'; export default function App() { return <main><Chart data={[]} /></main>; }",
      'src/Chart.tsx':
        "import type { Row } from '@/data'; export function Chart({ data }: { data: Row[] }) { return <section>{data.map(row => <p key={row.label}>{row.value}</p>)}</section>; }",
      'src/data.ts': 'export interface Row { label: string; value: number }',
    },
    { 'react-dom': '19.2.0' },
  );
  const original = JSON.parse(
    await readFile(join(root, 'tsconfig.json'), 'utf8'),
  );
  await writeFile(join(root, 'tsconfig.base.json'), JSON.stringify(original));
  await writeFile(
    join(root, 'tsconfig.app.json'),
    JSON.stringify({
      extends: './tsconfig.base.json',
      compilerOptions: { baseUrl: '.', paths: { '@/*': ['src/*'] } },
      include: ['App.tsx', 'src', 'personalize'],
    }),
  );
  await writeFile(
    join(root, 'tsconfig.node.json'),
    JSON.stringify({
      compilerOptions: { noEmit: true },
      files: ['vite.config.ts'],
    }),
  );
  await writeFile(
    join(root, 'vite.config.ts'),
    'export const port: number = 8080;',
  );
  await writeFile(
    join(root, 'tsconfig.json'),
    JSON.stringify({
      files: [],
      references: [
        { path: './tsconfig.node.json' },
        { path: './tsconfig.app.json' },
      ],
    }),
  );
  const discovery = await inspectProject(root);
  expect(
    discovery.symbols.find((symbol) => symbol.name === 'Chart'),
  ).toMatchObject({
    unsupportedProps: [],
    dataProps: {
      data: { cardinality: 'many', fields: { value: { type: 'number' } } },
    },
  });
  const report = await reviewProject(root);
  const snapshot = await projectSnapshot(root);
  await writeFile(
    join(root, 'tsconfig.base.json'),
    JSON.stringify({
      ...original,
      compilerOptions: {
        ...original.compilerOptions,
        noFallthroughCasesInSwitch: true,
      },
    }),
  );
  expect(await projectSnapshot(root)).not.toBe(snapshot);
  await expect(
    installProject(root, { dryRun: false, approvalDigest: report.digest }),
  ).rejects.toThrow('report changed');
  const approved = await reviewProject(root);
  expect(
    (
      await installProject(root, {
        dryRun: false,
        approvalDigest: approved.digest,
      })
    ).issues,
  ).toEqual([]);
  expect((await doctorProject(root, { typecheck: true })).issues).toEqual([]);
  await writeFile(
    join(root, 'src/broken.ts'),
    'export const invalid: number = "wrong";',
  );
  expect(
    (await doctorProject(root, { typecheck: true })).issues.some((issue) =>
      issue.includes('TypeScript 2322'),
    ),
  ).toBe(true);
});

it('reports ambiguous referenced app projects instead of guessing compiler options', async () => {
  const root = await consumer({
    'tsconfig.json': JSON.stringify({
      files: [],
      references: [{ path: './one.json' }, { path: './two.json' }],
    }),
    'one.json': JSON.stringify({
      compilerOptions: { jsx: 'react-jsx' },
      include: ['App.tsx'],
    }),
    'two.json': JSON.stringify({
      compilerOptions: { jsx: 'react-jsx' },
      include: ['App.tsx'],
    }),
  });
  await expect(inspectProject(root)).rejects.toThrow(
    'exactly one referenced config',
  );
});
