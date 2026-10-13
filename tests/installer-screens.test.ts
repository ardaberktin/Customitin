import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import {
  inspectProject,
  installProject,
  planInstall,
  removeProject,
  overridesSchema,
} from '@customitin/cli';
import { selectedOverrides } from '../packages/cli/src/commands/options';
import { consumer, compileConsumer } from './helpers/consumer';
import { screenConsumer } from './helpers/screen-consumer';

it('discovers and instruments existing screens with one durable flag, preserves providers and compiles', async () => {
  const root = await consumer(screenConsumer, {
    'react-native-safe-area-context': '5.6.2',
  });
  const report = await inspectProject(root);
  expect(
    report.symbols
      .find((symbol) => symbol.name === 'Home')
      ?.screen?.sections.map((section) => section.key),
  ).toEqual(['heading', 'notes', 'action']);
  const overrides = await selectedOverrides(root, {
    screen: ['Home.tsx#Home'],
  });
  const installed = await installProject(root, { dryRun: false, overrides });
  expect(installed.issues).toEqual([]);
  expect(installed.conflicts).toEqual([]);
  expect(installed.files['personalize/root.tsx']).toContain(
    'CustomizationProvider',
  );
  expect(installed.files['personalize/root.tsx']).not.toContain(
    'PersonalizationHost',
  );
  expect(installed.files['App.tsx']).toMatch(
    /<Session.Provider value="signed-in">\s*<PersonalizationRoot>/,
  );
  expect(installed.files['Home.tsx']).toContain('setCount(count + 1)');
  const registry = JSON.parse(
    installed.files['personalize/capabilities.json']!,
  );
  expect(registry.surfaces).toHaveLength(1);
  expect(registry.surfaces[0].kind).toBe('screen');
  expect((await planInstall(root)).changes).toEqual([]);
  compileConsumer(root);
  await removeProject(root, false);
  expect(await readFile(join(root, 'Home.tsx'), 'utf8')).toBe(
    screenConsumer['Home.tsx'],
  );
  expect(await readFile(join(root, 'App.tsx'), 'utf8')).toBe(
    screenConsumer['App.tsx'],
  );
});

it('supports a selected root screen and default arrow exports without unused imports', async () => {
  const root = await consumer({
    'App.tsx': `import { View, Text } from 'react-native';
const App = () => <View style={{ gap: 12 }}><Text key="one" style={{fontSize: 16}}>One</Text><Text key="two">Two</Text></View>;
export default App;`,
  });
  const installed = await installProject(root, {
    dryRun: false,
    overrides: await selectedOverrides(root, { screen: ['App.tsx#default'] }),
  });
  expect(installed.issues).toEqual([]);
  compileConsumer(root);
  expect((await planInstall(root)).changes).toEqual([]);
});

it('protects selected sections and restores a disabled screen without retaining ownership', async () => {
  const root = await consumer(screenConsumer);
  const overrides = overridesSchema.parse({
    version: 1,
    screens: {
      'Home.tsx#Home': { enabled: true, requiredSections: ['action'] },
    },
  });
  const first = await installProject(root, { dryRun: false, overrides });
  const registry = JSON.parse(first.files['personalize/capabilities.json']!);
  expect(registry.surfaces[0].requiredNodeIds).toEqual([
    registry.surfaces[0].defaultLayout[2].id,
  ]);
  const disabled = overridesSchema.parse({
    version: 1,
    screens: { 'Home.tsx#Home': { enabled: false } },
  });
  const restored = await installProject(root, {
    dryRun: false,
    overrides: disabled,
  });
  expect(restored.conflicts).toEqual([]);
  expect(await readFile(join(root, 'Home.tsx'), 'utf8')).toBe(
    screenConsumer['Home.tsx'],
  );
  expect(
    restored.ownership.files.some((file) => file.path === 'Home.tsx'),
  ).toBe(false);
});

it('refuses ambiguous sections and conditional roots before any writes', async () => {
  for (const jsx of [
    '<View><Text>One</Text><Text>Two</Text></View>',
    '<View>{[1,2].map(n => <Text key={n}>{n}</Text>)}</View>',
  ]) {
    const root = await consumer({
      'App.tsx': `import { View, Text } from 'react-native'; export default function App() { return ${jsx}; }`,
    });
    const plan = await installProject(root, {
      dryRun: false,
      overrides: await selectedOverrides(root, { screen: ['App.tsx#default'] }),
    });
    expect(plan.issues.length).toBeGreaterThan(0);
    await expect(
      readFile(join(root, '.customitin/ownership.json')),
    ).rejects.toThrow();
  }
});

it('preserves developer changes to instrumented screen files during refresh and removal', async () => {
  const root = await consumer(screenConsumer);
  await installProject(root, {
    dryRun: false,
    overrides: await selectedOverrides(root, { screen: ['Home.tsx#Home'] }),
  });
  const path = join(root, 'Home.tsx');
  const edited = (await readFile(path, 'utf8')) + '\n// Developer edit\n';
  await writeFile(path, edited);
  const plan = await installProject(root, { dryRun: false });
  expect(plan.conflicts).toEqual([]);
  expect(plan.issues).toEqual([]);
  expect((await planInstall(root)).changes).toEqual([]);
  expect((await removeProject(root, false)).conflicts).toEqual([]);
  const restored = await readFile(path, 'utf8');
  expect(restored).toContain('// Developer edit');
  expect(restored).toContain('setCount(count + 1)');
  expect(restored).not.toContain('Customitin');
});
