import { expect, it } from 'vitest';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Project, SyntaxKind } from 'ts-morph';
import { installProject, planInstall } from '@customitin/cli';
import { selectedOverrides } from '../packages/cli/src/commands/options';
import { consumer, compileConsumer } from './helpers/consumer';

it('instruments multiple screens in one file and keeps locally shadowed native names intact', async () => {
  const root = await consumer({
    'Screens.tsx': `import { View as Box, Text } from 'react-native';
export function First() { return <Box><Text key="title" style={{fontSize:20}}>First</Text></Box>; }
export function Second() {
  const Text = ({ value }: { value: string }) => <Box accessibilityLabel={value} />;
  return <Box><Text key="custom" value="Host component" /></Box>;
}`,
  });
  const plan = await installProject(root, {
    dryRun: false,
    overrides: await selectedOverrides(root, {
      screen: ['Screens.tsx#First', 'Screens.tsx#Second'],
    }),
  });
  expect(plan.issues).toEqual([]);
  expect(plan.files['Screens.tsx']).toContain(
    '<Text key="custom" value="Host component" />',
  );
  expect(
    JSON.parse(plan.files['personalize/capabilities.json']!).surfaces,
  ).toHaveLength(2);
  compileConsumer(root);
  expect((await planInstall(root)).changes).toEqual([]);
});

it('reports conditional, horizontal and index-dependent containers instead of rewriting them', async () => {
  const root = await consumer({
    'Screens.tsx': `import { ScrollView, Text } from 'react-native';
export function Conditional({ ready }: { ready: boolean }) { if (!ready) return null; return <ScrollView><Text>Ready</Text></ScrollView>; }
export function Horizontal() { return <ScrollView horizontal><Text>Horizontal</Text></ScrollView>; }
export function Sticky() { return <ScrollView stickyHeaderIndices={[0]}><Text>Sticky</Text></ScrollView>; }
`,
  });
  const plan = await installProject(root, {
    overrides: await selectedOverrides(root, {
      screen: [
        'Screens.tsx#Conditional',
        'Screens.tsx#Horizontal',
        'Screens.tsx#Sticky',
      ],
    }),
  });
  expect(plan.issues).toHaveLength(3);
  expect(plan.issues.join(' ')).toMatch(
    /Conditional.*Horizontal.*Index-dependent/,
  );
});

it('accepts deleting a section and organizing away its unused host primitive import', async () => {
  const root = await consumer({
    'App.tsx': `import {ScrollView, View, Text} from 'react-native';
export default function App() { return <ScrollView><View key="optional" /><Text key="title">Keep this</Text></ScrollView>; }`,
  });
  await installProject(root, {
    dryRun: false,
    overrides: await selectedOverrides(root, { screen: ['App.tsx#default'] }),
  });
  const path = join(root, 'App.tsx');
  const source = new Project({ useInMemoryFileSystem: true }).createSourceFile(
    'App.tsx',
    await readFile(path, 'utf8'),
  );
  source
    .getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement)
    .find((node) => node.getText().includes('key="optional"'))!
    .replaceWithText('{/* Removed optional section */}');
  source
    .getImportDeclarations()
    .flatMap((declaration) => declaration.getNamedImports())
    .find((specifier) => specifier.getName() === 'View')!
    .remove();
  await writeFile(path, source.getFullText());
  const result = await installProject(root, { dryRun: false });
  expect(result.issues).toEqual([]);
  expect(result.conflicts).toEqual([]);
  expect(result.files['App.tsx']).toContain('Removed optional section');
  expect(
    JSON.parse(result.files['personalize/capabilities.json']!).surfaces[0]
      .defaultLayout,
  ).toHaveLength(1);
  compileConsumer(root);
});
