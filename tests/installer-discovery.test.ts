import { expect, it } from 'vitest';
import {
  inspectProject,
  reviewProject,
  installProject,
  overridesSchema,
  planInstall,
} from '@customitin/cli';
import { consumer, compileConsumer, entries } from './helpers/consumer';

it('discovers arrow loaders, nullable/enumerated fields and repository methods; emits compiling adapters', async () => {
  const root = await consumer({
    'data.ts':
      entries +
      `
export const repository = {
  /** @customitinComplete */
  async list(): Promise<Entry[]> { return loadEntries(); }
};
export const useEntries = () => [];
`,
  });
  const report = await inspectProject(root);
  expect(
    report.symbols.find((s) => s.name === 'loadEntries')?.fields.stage?.values,
  ).toEqual(['draft', 'done']);
  expect(
    report.symbols.find((s) => s.name === 'loadEntries')?.fields.note,
  ).toMatchObject({ nullable: true, required: false });
  expect(
    report.symbols.find((s) => s.name === 'repository.list')?.complete,
  ).toBe(true);
  expect(report.symbols.find((s) => s.name === 'useEntries')?.kind).toBe(
    'hook',
  );
  const plan = await installProject(root, {
    dryRun: false,
    approvalDigest: (await reviewProject(root)).digest,
  });
  expect(
    JSON.parse(plan.files['personalize/capabilities.json']!).sources,
  ).toHaveLength(2);
  compileConsumer(root);
});

it('reuses exported TanStack query options and the existing query client', async () => {
  const root = await consumer(
    {
      'data.ts':
        entries +
        `
import { queryOptions, QueryClient } from '@tanstack/react-query';
export const queryClient = new QueryClient();
/** @customitinComplete */
export const entryOptions = () => queryOptions({ queryKey: ['entries'], queryFn: loadEntries });
`,
    },
    { '@tanstack/react-query': '5.90.12' },
  );
  const report = await inspectProject(root);
  expect(report.symbols.find((s) => s.name === 'entryOptions')?.adapter).toBe(
    'query-options',
  );
  expect(report.symbols.find((s) => s.name === 'queryClient')?.kind).toBe(
    'query-client',
  );
  const plan = await installProject(root, {
    dryRun: false,
    approvalDigest: (await reviewProject(root)).digest,
  });
  expect(plan.files['personalize/sources.ts']).toContain(
    'queryClient.fetchQuery',
  );
  compileConsumer(root);
});

it('binds reviewed host/item components and Expo detail routes with source restrictions', async () => {
  const root = await consumer(
    {
      'data.ts': entries,
      'Card.tsx': `import { Text } from 'react-native';
import type { Entry } from './data';
export function EntryCard({ entry, onPress }: { entry: Entry; onPress?: () => void }) { return <Text onPress={onPress}>{entry.title}</Text>; }
export const Heading = ({ label = 'Hello' }: { label?: string }) => <Text>{label}</Text>;
export const Banner = () => <Text>Welcome</Text>;
`,
      'app/[id].tsx': 'export default function Detail() { return null; }',
    },
    { 'expo-router': '55.0.18' },
  );
  const overrides = overridesSchema.parse({
    version: 1,
    sources: {
      'data.ts#loadEntries': {
        enabled: true,
        detailDestination: 'app/[id].tsx',
      },
    },
    components: {
      'Card.tsx#EntryCard': { enabled: true, source: 'data.ts#loadEntries' },
      'Card.tsx#Heading': { enabled: true },
      'Card.tsx#Banner': { enabled: true },
    },
    routes: { 'app/[id].tsx': { enabled: true } },
  });
  const plan = await installProject(root, { dryRun: false, overrides });
  const registry = JSON.parse(plan.files['personalize/capabilities.json']!);
  expect(
    registry.components.find((c: { title: string }) => c.title === 'EntryCard')
      .sourceIds,
  ).toEqual([registry.sources[0].id]);
  expect(registry.sources[0].detailDestinationId).toBe(
    registry.destinations[0].id,
  );
  expect(plan.files['personalize/navigation.ts']).toContain('router.push');
  compileConsumer(root);
});

it('generates typed React Navigation bindings for an existing exported ref', async () => {
  const root = await consumer(
    {
      'navigation.ts': `import { createNavigationContainerRef } from '@react-navigation/native';
export type RootStackParamList = { Home: undefined; Detail: { id: string } };
export const navigationRef = createNavigationContainerRef<RootStackParamList>();
`,
    },
    { '@react-navigation/native': '7.5.0' },
  );
  const overrides = overridesSchema.parse({
    version: 1,
    routes: {
      'navigation.ts#RootStackParamList.Detail': { enabled: true },
      'navigation.ts#RootStackParamList.Home': { enabled: true },
    },
  });
  const plan = await installProject(root, { dryRun: false, overrides });
  expect(plan.files['personalize/navigation.ts']).toContain(
    'navigationRef.navigate',
  );
  compileConsumer(root);
});

it('requires explicit remote query operators and rejects an unknown exposed field', async () => {
  const root = await consumer({
    'data.ts':
      entries +
      `
import type { ValidatedQuery, QueryContext } from '@customitin/core';
/** @customitinQuery */
export async function page(_query: ValidatedQuery, _context: QueryContext, _cursor?: string): Promise<{ items: Entry[]; nextCursor: string | null; complete: boolean }> { return { items: await loadEntries(), nextCursor: null, complete: true }; }
`,
  });
  const plan = await installProject(root, {
    dryRun: false,
    approvalDigest: (await reviewProject(root)).digest,
  });
  const remote = JSON.parse(
    plan.files['personalize/capabilities.json']!,
  ).sources.find((s: { title: string }) => s.title === 'page');
  expect(remote.fields.title.filterOps).toEqual([]);
  expect(remote.supportsGrouping).toBe(false);
  compileConsumer(root);
  await expect(
    planInstall(
      root,
      undefined,
      overridesSchema.parse({
        version: 1,
        sources: {
          'data.ts#page': { enabled: true, fields: ['id', 'missing'] },
        },
      }),
    ),
  ).rejects.toThrow('unknown field');
});

it('discovers default-export components and rejects conditional root rewriting', async () => {
  const root = await consumer({
    'Banner.tsx':
      "import { Text } from 'react-native';\nexport default function Banner() { return <Text>Banner</Text>; }\n",
    'App.tsx':
      "import { Text } from 'react-native';\nexport default function App() { if (Math.random() > 0.5) return <Text>One</Text>; return <Text>Two</Text>; }\n",
  });
  const plan = await installProject(root, {
    dryRun: false,
    overrides: overridesSchema.parse({
      version: 1,
      components: { 'Banner.tsx#default': { enabled: true } },
    }),
  });
  expect(plan.files['personalize/components.tsx']).toContain(
    'import Host0 from',
  );
  expect(plan.files['App.tsx']).toBeUndefined();
  expect(
    plan.report.unresolved.some((issue) => issue.includes('Conditional root')),
  ).toBe(true);
  compileConsumer(root);
});
