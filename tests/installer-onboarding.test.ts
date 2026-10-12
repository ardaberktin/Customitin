import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import {
  doctorProject,
  installProject,
  planInstall,
  removeProject,
} from '@customitin/cli';
import { selectedOverrides } from '../packages/cli/src/commands/options';
import { consumer, entries } from './helpers/consumer';

it('preserves outer provider context, formats generated code, and restores original bytes', async () => {
  const original = `import { createContext } from 'react';
import { Text } from 'react-native';
const Context = createContext('host');
export default function App() {
  return <Context.Provider value="shared"><Text>First</Text><Text>Second</Text></Context.Provider>;
}`;
  const root = await consumer({
    'App.tsx': original,
    '.prettierrc.js':
      'module.exports = {singleQuote: true, bracketSpacing: false};',
  });
  const plan = await installProject(root, { dryRun: false });
  const app = plan.files['App.tsx']!;
  expect(app).toMatch(
    /<Context.Provider value="shared">\s*<PersonalizationRoot>/,
  );
  expect(app).toContain('import {PersonalizationRoot}');
  expect((await planInstall(root)).changes).toEqual([]);
  await removeProject(root, false);
  expect(await readFile(join(root, 'App.tsx'), 'utf8')).toBe(original);
});

it('does not execute host formatter configs or their plugins', async () => {
  const root = await consumer({
    '.prettierrc.cjs':
      "throw new Error('never execute'); module.exports = {singleQuote: true, plugins: ['missing-plugin']};",
  });
  expect((await planInstall(root)).files['personalize/root.tsx']).toContain(
    "from 'react'",
  );
});

it('connects details with one durable CLI flag and rejects unknown selections without overwriting decisions', async () => {
  const root = await consumer(
    {
      'data.ts': entries,
      'navigation.ts':
        "import { createNavigationContainerRef } from '@react-navigation/native';\nexport type RootParamList = { Detail: { id: string } };\nexport const navigationRef = createNavigationContainerRef<RootParamList>();",
    },
    { '@react-navigation/native': '7.5.0' },
  );
  const overrides = await selectedOverrides(root, {
    detail: ['data.ts#loadEntries=navigation.ts#RootParamList.Detail'],
  });
  const plan = await installProject(root, { dryRun: false, overrides });
  expect(plan.issues).toEqual([]);
  expect(
    JSON.parse(plan.files['personalize/capabilities.json']!).sources[0]
      .detailParam,
  ).toBe('id');
  expect((await planInstall(root)).changes).toEqual([]);
  const before = await readFile(
    join(root, 'personalize/overrides.json'),
    'utf8',
  );
  await expect(
    selectedOverrides(root, { component: ['typo.ts#Missing'] }),
  ).rejects.toThrow('Unknown selector');
  await expect(
    selectedOverrides(root, { detail: ['missing separator'] }),
  ).rejects.toThrow('SOURCE=ROUTE');
  expect(await readFile(join(root, 'personalize/overrides.json'), 'utf8')).toBe(
    before,
  );
});

it('accepts persistent offline installations without requiring a planner or login', async () => {
  const root = await consumer(
    {},
    { '@react-native-async-storage/async-storage': '2.2.0' },
  );
  await installProject(root, { dryRun: false });
  const diagnosis = await doctorProject(root);
  expect(diagnosis.issues).toEqual([]);
  expect(diagnosis.recommendations).toHaveLength(2);
  const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
  delete pkg.dependencies['@customitin/core'];
  await writeFile(join(root, 'package.json'), JSON.stringify(pkg));
  expect((await doctorProject(root)).issues).toContain(
    'Install @customitin/core and @customitin/react-native (local tarballs until published).',
  );
});

it('retains moved selector identities when an integration is removed and reinstalled', async () => {
  const { rename } = await import('node:fs/promises');
  const root = await consumer({ 'data.ts': entries });
  await installProject(root, {
    dryRun: false,
    overrides: await selectedOverrides(root, {
      complete: ['data.ts#loadEntries'],
    }),
  });
  await rename(join(root, 'data.ts'), join(root, 'moved.ts'));
  const before = await installProject(root, { dryRun: false });
  await removeProject(root, false);
  const after = await installProject(root, { dryRun: false });
  expect(after.conflicts).toEqual([]);
  expect(after.files['personalize/capabilities.json']).toBe(
    before.files['personalize/capabilities.json'],
  );
});
