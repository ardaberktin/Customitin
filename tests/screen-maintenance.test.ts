import { readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import {
  doctorProject,
  installProject,
  planInstall,
  removeProject,
  overridesSchema,
} from '@customitin/cli';
import { selectedOverrides } from '../packages/cli/src/commands/options';
import { consumer, compileConsumer } from './helpers/consumer';
import { screenConsumer } from './helpers/screen-consumer';

async function setup() {
  const root = await consumer(screenConsumer);
  const installed = await installProject(root, {
    dryRun: false,
    overrides: await selectedOverrides(root, { screen: ['Home.tsx#Home'] }),
  });
  expect(installed.issues).toEqual([]);
  return { root, installed };
}
const surface = (plan: Awaited<ReturnType<typeof planInstall>>) =>
  JSON.parse(plan.files['personalize/capabilities.json']!).surfaces[0] as {
    id: string;
    defaultLayout: { id: string }[];
  };

it('refreshes edited JSX, hooks and styles, and adds/removes sections without losing stable IDs or developer config', async () => {
  const { root, installed } = await setup();
  const path = join(root, 'Home.tsx');
  const config =
    (await readFile(join(root, 'personalize/config.ts'), 'utf8')) +
    '\n// Host configuration stays here\n';
  await writeFile(join(root, 'personalize/config.ts'), config);
  const edited = (await readFile(path, 'utf8'))
    .replace('setCount(count + 1)', 'setCount(count + 2)')
    .replace('gap: 20', 'gap: 30')
    .replace(
      '<Pressable',
      '<Text key="summary">New summary</Text>\n<Pressable',
    );
  await writeFile(path, edited);
  const next = await installProject(root, { dryRun: false });
  expect(next.conflicts).toEqual([]);
  expect(next.issues).toEqual([]);
  const saved = await readFile(path, 'utf8');
  expect(saved).toContain('setCount(count + 2)');
  expect(saved).toContain('gap: 30');
  expect(saved).toContain('New summary');
  expect(surface(next).id).toBe(surface(installed).id);
  expect(surface(next).defaultLayout.map((node) => node.id)).toEqual([
    surface(installed).defaultLayout[0]!.id,
    surface(installed).defaultLayout[1]!.id,
    expect.any(String),
    surface(installed).defaultLayout[2]!.id,
  ]);
  expect(await readFile(join(root, 'personalize/config.ts'), 'utf8')).toBe(
    config,
  );
  compileConsumer(root);
  await writeFile(
    path,
    saved.replace(
      /<Text key="summary">[\s\S]*?<\/Text>/,
      '{/* Removed summary */}',
    ),
  );
  const removed = await installProject(root, { dryRun: false });
  expect(removed.issues).toEqual([]);
  expect(surface(removed).defaultLayout).toEqual(
    surface(installed).defaultLayout,
  );
  expect((await planInstall(root)).changes).toEqual([]);
  expect((await doctorProject(root)).issues.join('\n')).not.toMatch(
    /Drift|SDK wrapper|Refresh required/,
  );
});

it('removes only SDK syntax from unrefreshed screens and roots, keeping current provider and handler edits', async () => {
  const { root } = await setup();
  const path = join(root, 'Home.tsx');
  await writeFile(
    path,
    (await readFile(path, 'utf8')).replace(
      'setCount(count + 1)',
      'setCount(count + 3)',
    ) + '\n// Latest host edit\n',
  );
  await writeFile(
    join(root, 'App.tsx'),
    (await readFile(join(root, 'App.tsx'), 'utf8')).replace(
      'signed-in',
      'new-session',
    ),
  );
  expect((await removeProject(root, false)).conflicts).toEqual([]);
  const restored = await readFile(path, 'utf8');
  expect(restored).toContain('setCount(count + 3)');
  expect(restored).toContain('// Latest host edit');
  expect(restored).not.toContain('@customitin');
  expect(await readFile(join(root, 'App.tsx'), 'utf8')).toContain(
    'new-session',
  );
  compileConsumer(root);
});

it('retains an edited screen when disabled and allows safe formatter changes', async () => {
  const { root } = await setup();
  const path = join(root, 'Home.tsx');
  const { format } = await import('prettier');
  await writeFile(
    path,
    await format(
      (await readFile(path, 'utf8')).replace(
        'setCount(count + 1)',
        'setCount(count + 4)',
      ),
      {
        parser: 'typescript',
        semi: false,
        singleQuote: false,
        trailingComma: 'none',
      },
    ),
  );
  const next = await installProject(root, {
    dryRun: false,
    overrides: overridesSchema.parse({
      version: 1,
      screens: { 'Home.tsx#Home': { enabled: false } },
    }),
  });
  expect(next.issues).toEqual([]);
  expect(next.conflicts).toEqual([]);
  expect(await readFile(path, 'utf8')).toContain('setCount(count + 4)');
  expect(await readFile(path, 'utf8')).not.toContain('@customitin');
  expect(next.ownership.files.some((file) => file.path === 'Home.tsx')).toBe(
    false,
  );
  compileConsumer(root);
});

it('follows a moved screen and preserves its identity without reinstalling', async () => {
  const { root, installed } = await setup();
  await rename(join(root, 'Home.tsx'), join(root, 'Dashboard.tsx'));
  await writeFile(
    join(root, 'App.tsx'),
    (await readFile(join(root, 'App.tsx'), 'utf8')).replace(
      "'./Home'",
      "'./Dashboard'",
    ),
  );
  const refreshed = await installProject(root, { dryRun: false });
  expect(refreshed.issues).toEqual([]);
  expect(refreshed.conflicts).toEqual([]);
  expect(surface(refreshed).id).toBe(surface(installed).id);
  expect(surface(refreshed).defaultLayout).toEqual(
    surface(installed).defaultLayout,
  );
  expect(
    JSON.parse(refreshed.files['personalize/capabilities.json']!).revision,
  ).toBe(
    JSON.parse(installed.files['personalize/capabilities.json']!).revision,
  );
  expect(
    refreshed.ownership.files.some((file) => file.path === 'Home.tsx'),
  ).toBe(false);
  compileConsumer(root);
  expect((await removeProject(root, false)).conflicts).toEqual([]);
  expect(await readFile(join(root, 'Dashboard.tsx'), 'utf8')).not.toContain(
    '@customitin',
  );
});

it('refuses changed SDK props or unsupported host structure without overwriting any files', async () => {
  const { root } = await setup();
  const path = join(root, 'Home.tsx');
  const original = await readFile(path, 'utf8');
  const manifest = await readFile(
    join(root, 'personalize/capabilities.json'),
    'utf8',
  );
  const changedId = original.replace(/id="cap-[^"]+"/, 'id="changed-screen"');
  expect(changedId).not.toBe(original);
  await writeFile(path, changedId);
  const refused = await installProject(root, { dryRun: false });
  expect(refused.issues.join(' ')).toContain('SDK wrapper props changed');
  expect((await removeProject(root, false)).conflicts).toContain('Home.tsx');
  expect(await readFile(path, 'utf8')).toBe(changedId);
  await writeFile(
    path,
    original.replace('<ScrollView', '<ScrollView horizontal'),
  );
  const unsupported = await installProject(root, { dryRun: false });
  expect(unsupported.issues.join(' ')).toContain('Horizontal');
  expect(
    await readFile(join(root, 'personalize/capabilities.json'), 'utf8'),
  ).toBe(manifest);
});
