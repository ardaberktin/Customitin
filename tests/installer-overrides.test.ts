import { readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import {
  installProject,
  overridesSchema,
  planInstall,
  removeProject,
} from '@customitin/cli';
import { consumer, entries } from './helpers/consumer';

it('persists source decisions, excludes private fields, and keeps IDs/revision after a file move', async () => {
  const root = await consumer({ 'data.ts': entries });
  const overrides = overridesSchema.parse({
    version: 1,
    sources: {
      'data.ts#loadEntries': { fields: ['id', 'title'], title: 'Entries' },
    },
  });
  const first = await installProject(root, { dryRun: false, overrides });
  const before = JSON.parse(first.files['personalize/capabilities.json']!);
  const ownedConfig = await readFile(
    join(root, 'personalize/config.ts'),
    'utf8',
  );
  await rename(join(root, 'data.ts'), join(root, 'repository.ts'));
  const refreshed = await installProject(root, { dryRun: false });
  const after = JSON.parse(refreshed.files['personalize/capabilities.json']!);
  expect(after.sources[0].id).toBe(before.sources[0].id);
  expect(after.revision).toBe(before.revision);
  expect(Object.keys(after.sources[0].fields)).toEqual(['id', 'title']);
  expect(await readFile(join(root, 'personalize/config.ts'), 'utf8')).toBe(
    ownedConfig,
  );
  expect((await planInstall(root)).changes).toEqual([]);
  expect((await removeProject(root, false)).conflicts).toEqual([]);
  expect(
    JSON.parse(
      await readFile(join(root, 'personalize/overrides.json'), 'utf8'),
    ),
  ).toEqual(overrides);
});

it('retains explicit AI source selection on refresh and supports a reviewed rename', async () => {
  const root = await consumer({
    'data.ts':
      entries +
      '\n/** @customitinComplete */\nexport const other = loadEntries;\n',
  });
  const discovery = await planInstall(root);
  const selected = discovery.report.symbols.find(
    (s) => s.name === 'loadEntries',
  )!;
  await installProject(root, { dryRun: false, selectedIds: [selected.id] });
  expect(
    JSON.parse(
      (await planInstall(root)).files['personalize/capabilities.json']!,
    ).sources,
  ).toHaveLength(1);
  await writeFile(
    join(root, 'data.ts'),
    entries.replaceAll('loadEntries', 'readEntries'),
  );
  const renamed = await installProject(root, {
    dryRun: false,
    overrides: overridesSchema.parse({
      version: 1,
      sources: {
        [selected.id]: { symbol: 'data.ts#readEntries', title: 'Entries' },
      },
    }),
  });
  expect(
    JSON.parse(renamed.files['personalize/capabilities.json']!).sources[0].id,
  ).toBe(selected.id);
});

it('rejects invalid overrides before writing and preserves modified generated adapters', async () => {
  const root = await consumer({ 'data.ts': entries });
  await expect(
    installProject(root, {
      dryRun: false,
      overrides: overridesSchema.parse({
        version: 1,
        sources: { nonexistent: { enabled: true } },
      }),
    }),
  ).rejects.toThrow('Unknown sources');
  await expect(readFile(join(root, 'personalize/config.ts'))).rejects.toThrow();
  await installProject(root, { dryRun: false });
  const path = join(root, 'personalize/sources.ts');
  const custom = (await readFile(path, 'utf8')) + '\n// developer edit\n';
  await writeFile(path, custom);
  expect((await installProject(root, { dryRun: false })).conflicts).toContain(
    'personalize/sources.ts',
  );
  expect(await readFile(path, 'utf8')).toBe(custom);
});

it('keeps component source references working after the source file moves', async () => {
  const root = await consumer({
    'data.ts': entries,
    'Card.tsx':
      "import { Text } from 'react-native';\nexport const Card = ({ item }: { item: { id: string; title: string } }) => <Text>{item.title}</Text>;\n",
  });
  const overrides = overridesSchema.parse({
    version: 1,
    components: {
      'Card.tsx#Card': { enabled: true, source: 'data.ts#loadEntries' },
    },
  });
  await installProject(root, { dryRun: false, overrides });
  await rename(join(root, 'data.ts'), join(root, 'moved.ts'));
  const next = await planInstall(root);
  expect(next.issues).toEqual([]);
  expect(
    JSON.parse(next.files['personalize/capabilities.json']!).components.some(
      (c: { title: string; kind: string }) =>
        c.title === 'Card' && c.kind === 'item',
    ),
  ).toBe(true);
});

it('rejects overrides in the wrong capability category', async () => {
  const root = await consumer({ 'data.ts': entries });
  await expect(
    planInstall(
      root,
      undefined,
      overridesSchema.parse({
        version: 1,
        components: { 'data.ts#loadEntries': { enabled: true } },
      }),
    ),
  ).rejects.toThrow('wrong category');
});

it('CLI selection flags preserve existing decisions when a selector moves', async () => {
  const { selectedOverrides } =
    await import('../packages/cli/src/commands/options');
  const root = await consumer({ 'data.ts': entries });
  await installProject(root, {
    dryRun: false,
    overrides: overridesSchema.parse({
      version: 1,
      sources: { 'data.ts#loadEntries': { fields: ['id', 'title'] } },
    }),
  });
  await rename(join(root, 'data.ts'), join(root, 'moved.ts'));
  const overrides = await selectedOverrides(root, {
    complete: ['moved.ts#loadEntries'],
  });
  expect(Object.keys(overrides!.sources)).toEqual(['data.ts#loadEntries']);
  const plan = await planInstall(root, undefined, overrides);
  expect(
    Object.keys(
      JSON.parse(plan.files['personalize/capabilities.json']!).sources[0]
        .fields,
    ),
  ).toEqual(['id', 'title']);
});
