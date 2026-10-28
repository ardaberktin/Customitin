import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cli, command } from './process.mjs';
import { prepare } from './prepare.mjs';
import { interactions, runInteraction } from './interactions.mjs';
import { verifyNativeBundle, verifyNativeExports } from './native-exports.mjs';
import { collectionInteractions } from './collections.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const directory = await mkdtemp(join(tmpdir(), 'customitin-packed-'));
const artifacts = join(directory, 'artifacts');
await mkdir(artifacts);
console.log(`Packed consumer evidence: ${directory}`);
command(
  root,
  process.execPath,
  ['scripts/pack-local.mjs', artifacts],
  join(artifacts, 'pack.log'),
);
const tarballs = JSON.parse(
  await readFile(join(artifacts, 'packages.json'), 'utf8'),
);
for (const platform of ['web', 'native']) {
  const { app, logs, typecheck } = await prepare(
    root,
    directory,
    platform,
    tarballs,
  );
  const original = await readFile(join(app, 'App.tsx'), 'utf8');
  const report = cli(app, logs, 'inspect', ['inspect', '--json']);
  const approval = [
    'init',
    '--approve-report',
    report.review.digest,
    '--exclude',
    'App.tsx#Card',
  ];
  const preview = cli(app, logs, 'init-dry-run', [...approval, '--dry-run']);
  assert.deepEqual(preview.issues, []);
  await assert.rejects(access(join(app, 'personalize')));
  const result = cli(app, logs, 'init', [...approval, '--apply']);
  assert.deepEqual(result.issues, []);
  const registry = JSON.parse(
    await readFile(join(app, 'personalize/capabilities.json'), 'utf8'),
  );
  assert.deepEqual(registry.surfaces, []);
  assert.deepEqual(registry.themeTokens, {});
  assert.deepEqual(registry.destinations, []);
  assert.equal(registry.components.length, 1);
  assert.equal(registry.sources.length, 2);
  const source = await readFile(join(app, 'App.tsx'), 'utf8');
  assert(source.includes('Original '));
  assert(!source.includes('PersonalizationScreen'));
  command(
    app,
    join(app, 'node_modules/.bin/tsc'),
    typecheck,
    join(logs, 'typecheck.log'),
  );
  assert.equal(
    cli(app, logs, 'doctor', ['doctor', '--typecheck']).verification.status,
    'verified',
  );
  assert.deepEqual(
    cli(app, logs, 'idempotent', ['refresh', '--dry-run']).changes,
    [],
  );
  const additional = join(app, 'NewChart.tsx');
  await writeFile(
    additional,
    'export function NewChart() { return null as import("react").ReactElement | null; }',
  );
  assert.throws(() =>
    cli(app, logs, 'stale-approval', [...approval, '--apply']),
  );
  assert.match(
    await readFile(join(logs, 'stale-approval.json'), 'utf8'),
    /report changed/,
  );
  assert.deepEqual(
    cli(app, logs, 'pending-refresh', ['refresh', '--apply']).issues,
    [],
  );
  const pending = cli(app, logs, 'pending-inspect', ['inspect', '--json']);
  assert.equal(
    pending.review.capabilities.find(
      (item) => item.selector === 'NewChart.tsx#NewChart',
    )?.status,
    'bindable',
  );
  assert.equal(
    JSON.parse(
      await readFile(join(app, 'personalize/capabilities.json'), 'utf8'),
    ).components.length,
    1,
  );
  await interactions(root, app, logs, platform);
  // Opt into an existing region separately; the default install above adds none.
  assert.deepEqual(
    cli(app, logs, 'screen', [
      'refresh',
      '--screen',
      'App.tsx#default',
      '--apply',
    ]).issues,
    [],
  );
  command(
    app,
    join(app, 'node_modules/.bin/tsc'),
    typecheck,
    join(logs, 'screen-typecheck.log'),
  );
  runInteraction(app, logs, platform, 'screen-interaction');
  await collectionInteractions(app, logs, platform);
  if (platform === 'web') {
    command(app, 'npm', ['run', 'build'], join(logs, 'bundle.log'));
    command(
      app,
      process.execPath,
      [
        '--input-type=module',
        '-e',
        "import { SurfaceRenderer, useAssistant } from '@customitin/react'; if (!SurfaceRenderer || !useAssistant) throw Error('missing exports');",
      ],
      join(logs, 'imports.log'),
    );
  } else {
    verifyNativeExports(app, logs);
    for (const target of ['ios', 'android']) {
      command(
        app,
        join(app, 'node_modules/.bin/react-native'),
        [
          'bundle',
          '--platform',
          target,
          '--dev',
          'false',
          '--entry-file',
          'index.js',
          '--bundle-output',
          join(logs, `${target}.jsbundle`),
          '--sourcemap-output',
          join(logs, `${target}.map`),
          '--assets-dest',
          join(logs, `${target}-assets`),
          '--max-workers',
          '2',
        ],
        join(logs, `${target}-bundle.log`),
      );
      await verifyNativeBundle(join(logs, `${target}.map`));
    }
  }
  const exportCheck =
    platform === 'native'
      ? "import { asyncStorageAdapter } from '@customitin/react-native/storage'; import { createHttpPlanner } from '@customitin/react-native/adapters'; if (typeof asyncStorageAdapter !== 'function' || typeof createHttpPlanner !== 'function') throw Error('missing native exports');"
      : "import { browserStorage } from '@customitin/react/storage'; import { createHttpPlanner } from '@customitin/react/adapters'; if (typeof browserStorage !== 'function' || typeof createHttpPlanner !== 'function') throw Error('missing web exports');";
  command(
    app,
    process.execPath,
    ['--input-type=module', '-e', exportCheck],
    join(logs, 'subpath-exports.log'),
  );
  const config = await readFile(join(app, 'personalize/config.ts'), 'utf8');
  const overrides = await readFile(
    join(app, 'personalize/overrides.json'),
    'utf8',
  );
  const identities = await readFile(
    join(app, 'personalize/bindings.lock.json'),
    'utf8',
  );
  assert.deepEqual(
    cli(app, logs, 'remove', ['remove', '--apply']).conflicts,
    [],
  );
  assert.equal(await readFile(join(app, 'App.tsx'), 'utf8'), original);
  assert.equal(
    await readFile(join(app, 'personalize/config.ts'), 'utf8'),
    config,
  );
  assert.equal(
    await readFile(join(app, 'personalize/overrides.json'), 'utf8'),
    overrides,
  );
  assert.equal(
    await readFile(join(app, 'personalize/bindings.lock.json'), 'utf8'),
    identities,
  );
  assert.deepEqual(cli(app, logs, 'reinstall', ['init', '--apply']).issues, []);
  assert.equal(
    cli(app, logs, 'reinstall-doctor', ['doctor', '--typecheck']).verification
      .status,
    'verified',
  );
}
console.log(
  `Packed native and Vite checks passed. Evidence: ${artifacts}. Device and live-model checks remain separate.`,
);
