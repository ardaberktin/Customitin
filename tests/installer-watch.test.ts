import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { installProject, planInstall, watchProject } from '@customitin/cli';
import { selectedOverrides } from '../packages/cli/src/commands/options';
import { consumer, compileConsumer } from './helpers/consumer';
import { screenConsumer } from './helpers/screen-consumer';

it('watches ordinary saves, updates section registration, and stops cleanly', async () => {
  const root = await consumer(screenConsumer);
  await installProject(root, {
    dryRun: false,
    overrides: await selectedOverrides(root, { screen: ['Home.tsx#Home'] }),
  });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  let updates = 0;
  try {
    await watchProject(root, {
      signal: controller.signal,
      intervalMs: 50,
      dryRun: false,
      onUpdate: async (result) => {
        expect(result.issues).toEqual([]);
        expect(result.conflicts).toEqual([]);
        expect(result.applied).toBe(true);
        updates++;
        if (updates === 1) {
          const path = join(root, 'Home.tsx');
          await writeFile(
            path,
            (await readFile(path, 'utf8')).replace(
              '<Pressable',
              '<CustomitinText key="watched">Watched section</CustomitinText><Pressable',
            ),
          );
        } else if (result.changes.includes('personalize/capabilities.json'))
          controller.abort();
      },
    });
  } finally {
    clearTimeout(timeout);
    controller.abort();
  }
  expect(updates).toBe(2);
  expect((await planInstall(root)).changes).toEqual([]);
  compileConsumer(root);
});

it('keeps watch in dry-run by default without writing', async () => {
  const root = await consumer(screenConsumer);
  const controller = new AbortController();
  await expect(
    watchProject(root, { signal: controller.signal, onUpdate: () => {} }),
  ).rejects.toThrow('init --apply');
  await installProject(root, {
    dryRun: false,
    overrides: await selectedOverrides(root, { screen: ['Home.tsx#Home'] }),
  });
  const path = join(root, 'Home.tsx');
  const changed = (await readFile(path, 'utf8')).replace(
    '<Pressable',
    '<CustomitinText key="dry">Dry run</CustomitinText><Pressable',
  );
  await writeFile(path, changed);
  const manifest = await readFile(
    join(root, '.customitin/ownership.json'),
    'utf8',
  );
  await watchProject(root, {
    signal: controller.signal,
    onUpdate: (result) => {
      expect(result.applied).toBe(false);
      expect(result.changes).toContain('personalize/capabilities.json');
      controller.abort();
    },
  });
  expect(await readFile(path, 'utf8')).toBe(changed);
  expect(await readFile(join(root, '.customitin/ownership.json'), 'utf8')).toBe(
    manifest,
  );
});

it('reports unsupported saves without writing and resumes after the correction', async () => {
  const root = await consumer(screenConsumer);
  await installProject(root, {
    dryRun: false,
    overrides: await selectedOverrides(root, { screen: ['Home.tsx#Home'] }),
  });
  const path = join(root, 'Home.tsx');
  const supported = await readFile(path, 'utf8');
  const manifest = await readFile(
    join(root, '.customitin/ownership.json'),
    'utf8',
  );
  await writeFile(
    path,
    supported.replace(
      '<CustomitinScrollView',
      '<CustomitinScrollView horizontal',
    ),
  );
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  let updates = 0;
  try {
    await watchProject(root, {
      signal: controller.signal,
      dryRun: false,
      intervalMs: 50,
      onUpdate: async (result) => {
        updates++;
        if (updates === 1) {
          expect(result.applied).toBe(false);
          expect(result.issues.join(' ')).toContain('Horizontal');
          expect(
            await readFile(join(root, '.customitin/ownership.json'), 'utf8'),
          ).toBe(manifest);
          await writeFile(path, supported);
        } else {
          expect(result.issues).toEqual([]);
          expect(result.applied).toBe(true);
          controller.abort();
        }
      },
    });
  } finally {
    clearTimeout(timeout);
    controller.abort();
  }
  expect(updates).toBe(2);
});
