import assert from 'node:assert/strict';
import {
  cp,
  mkdtemp,
  mkdir,
  readFile,
  writeFile,
  realpath,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cli, command } from './process.mjs';

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
  const app = join(directory, platform);
  const logs = join(artifacts, platform);
  await mkdir(logs);
  await cp(join(root, `fixtures/headless-${platform}`), app, {
    recursive: true,
  });
  await writeFile(
    join(app, 'package.json'),
    JSON.stringify(
      {
        name: `headless-${platform}-consumer`,
        private: true,
        version: '1.0.0',
        scripts:
          platform === 'web'
            ? { dev: 'vite', build: 'vite build' }
            : { start: 'react-native start' },
      },
      null,
      2,
    ),
  );
  await writeFile(
    join(app, 'tsconfig.json'),
    JSON.stringify(
      {
        compilerOptions: {
          strict: true,
          noUnusedLocals: true,
          noUnusedParameters: true,
          jsx: 'react-jsx',
          target: 'ES2022',
          module: 'ESNext',
          moduleResolution: 'Bundler',
          esModuleInterop: true,
          skipLibCheck: true,
          resolveJsonModule: true,
          noEmit: true,
        },
        include: ['**/*.ts', '**/*.tsx'],
      },
      null,
      2,
    ),
  );
  const peers =
    platform === 'web'
      ? ['react-dom@19.2.0', '@types/react-dom@19.2.2', 'vite@7.3.7']
      : [
          'react-native@0.83.10',
          '@react-native/babel-preset@0.83.10',
          '@react-native/metro-config@0.83.10',
          '@react-native-community/cli@20.2.0',
          '@react-native-async-storage/async-storage@2.2.0',
        ];
  console.log(`Installing isolated ${platform} consumer from tarballs…`);
  command(
    app,
    'npm',
    [
      'install',
      '--offline',
      '--ignore-scripts',
      '--no-audit',
      '--no-fund',
      '--save-exact',
      tarballs.core,
      tarballs.react,
      tarballs.cli,
      tarballs.server,
      ...(platform === 'native' ? [tarballs['react-native']] : []),
      'react@19.2.0',
      '@types/react@19.2.2',
      'typescript@5.9.3',
      ...peers,
    ],
    join(logs, 'install.log'),
  );
  for (const pkg of [
    'core',
    'react',
    'cli',
    ...(platform === 'native' ? ['react-native'] : []),
  ])
    assert(
      (await realpath(join(app, 'node_modules/@customitin', pkg))).startsWith(
        await realpath(app),
      ),
      'SDK package must be isolated, never a workspace alias',
    );
  const original = await readFile(join(app, 'App.tsx'), 'utf8');
  const report = cli(app, logs, 'inspect', ['inspect', '--json']);
  const result = cli(app, logs, 'init', [
    'init',
    '--approve-report',
    report.review.digest,
    '--apply',
  ]);
  assert.deepEqual(result.issues, []);
  const registry = JSON.parse(
    await readFile(join(app, 'personalize/capabilities.json'), 'utf8'),
  );
  assert.deepEqual(registry.surfaces, []);
  assert.deepEqual(registry.themeTokens, {});
  assert.deepEqual(registry.destinations, []);
  assert.equal(registry.components.length, 2);
  assert.equal(registry.sources.length, 1);
  const source = await readFile(join(app, 'App.tsx'), 'utf8');
  assert(source.includes('Original '));
  assert(!source.includes('PersonalizationScreen'));
  command(
    app,
    join(app, 'node_modules/.bin/tsc'),
    ['--noEmit'],
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
    ['--noEmit'],
    join(logs, 'screen-typecheck.log'),
  );
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
  } else
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
          '--assets-dest',
          join(logs, `${target}-assets`),
          '--max-workers',
          '2',
        ],
        join(logs, `${target}-bundle.log`),
      );
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
  assert.deepEqual(
    cli(app, logs, 'remove', ['remove', '--apply']).conflicts,
    [],
  );
  assert.equal(await readFile(join(app, 'App.tsx'), 'utf8'), original);
  assert.equal(
    await readFile(join(app, 'personalize/config.ts'), 'utf8'),
    config,
  );
}
console.log(
  `Packed native and Vite checks passed. Evidence: ${artifacts}. Device and live-model checks remain separate.`,
);
