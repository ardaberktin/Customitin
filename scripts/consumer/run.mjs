import assert from 'node:assert/strict';
import { cp, mkdtemp, mkdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cli, command } from './process.mjs';
import { lifecycle } from './lifecycle.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const directory = await mkdtemp(join(tmpdir(), 'customitin-fresh-'));
const app = join(directory, 'app');
const artifacts = join(directory, 'artifacts');
await mkdir(artifacts);
console.log(`Fresh consumer and evidence: ${directory}`);
console.log(
  'Building local packages and downloading the official React Native template…',
);
command(
  root,
  process.execPath,
  ['scripts/pack-local.mjs', artifacts],
  join(artifacts, 'pack.log'),
);
command(
  root,
  process.execPath,
  [
    'node_modules/@react-native-community/cli/build/bin.js',
    'init',
    'CustomitinFresh',
    '--version',
    '0.83.10',
    '--directory',
    app,
    '--pm',
    'npm',
    '--skip-git-init',
    '--install-pods',
    'false',
  ],
  join(artifacts, 'template.log'),
);
const tarballs = JSON.parse(
  await readFile(join(artifacts, 'packages.json'), 'utf8'),
);
console.log(
  'Installing tarballs and host libraries, with no workspace aliases…',
);
command(
  app,
  'npm',
  [
    'install',
    '--save-exact',
    tarballs.core,
    tarballs['react-native'],
    '@react-native-async-storage/async-storage@2.2.0',
    '@tanstack/react-query@5.90.12',
    '@react-navigation/native@7.5.0',
    '@react-navigation/native-stack@7.20.0',
    'react-native-screens@4.23.0',
  ],
  join(artifacts, 'install.log'),
);
command(
  app,
  'npm',
  [
    'install',
    '--save-dev',
    '--save-exact',
    tarballs.server,
    tarballs.cli,
    '@testing-library/react-native@13.3.3',
  ],
  join(artifacts, 'install-dev.log'),
);
command(
  app,
  join(app, 'node_modules/.bin/customitin'),
  ['guide', '--topic', 'testing'],
  join(artifacts, 'guide.md'),
);
const template = await readFile(join(app, 'App.tsx'), 'utf8');
cli(app, artifacts, 'template-install', ['init', '--apply']);
cli(app, artifacts, 'template-doctor', ['doctor', '--typecheck']);
cli(app, artifacts, 'template-remove', ['remove', '--apply']);
assert.equal(await readFile(join(app, 'App.tsx'), 'utf8'), template);
await cp(join(root, 'fixtures/fresh-react-native'), app, { recursive: true });
const original = await readFile(join(app, 'App.tsx'), 'utf8');
const flags = [
  '--complete',
  'src/trails.ts#trailOptions',
  '--component',
  'src/TrailCard.tsx#TrailCard',
  '--component',
  'src/TrailCard.tsx#Greeting',
  '--detail',
  'src/trails.ts#trailOptions=src/navigation.ts#RootParamList.Trail',
];
cli(app, artifacts, 'inspect', ['inspect']);
const dry = cli(app, artifacts, 'dry-run', ['init', ...flags, '--dry-run']);
assert.deepEqual(dry.issues, []);
assert.equal(await readFile(join(app, 'App.tsx'), 'utf8'), original);
assert.deepEqual(
  cli(app, artifacts, 'install', ['init', ...flags, '--apply']).issues,
  [],
);
cli(app, artifacts, 'doctor', ['doctor', '--typecheck']);
console.log(
  'Checking app types, zero-warning lint, and native component interactions…',
);
command(
  app,
  join(app, 'node_modules/.bin/tsc'),
  ['--noEmit'],
  join(artifacts, 'typecheck.log'),
);
command(
  app,
  join(app, 'node_modules/.bin/eslint'),
  ['.', '--ext', '.js,.jsx,.ts,.tsx', '--max-warnings', '0'],
  join(artifacts, 'lint.log'),
);
command(
  app,
  'npm',
  ['test', '--', '--runInBand', '--watch=false'],
  join(artifacts, 'interactions.log'),
);
console.log(
  'Bundling iOS and Android with the unmodified template Babel/Metro configs…',
);
for (const platform of ['ios', 'android']) {
  command(
    app,
    join(app, 'node_modules/.bin/react-native'),
    [
      'bundle',
      '--platform',
      platform,
      '--dev',
      'false',
      '--entry-file',
      'index.js',
      '--bundle-output',
      join(artifacts, `main.${platform}.jsbundle`),
      '--assets-dest',
      join(artifacts, `${platform}-assets`),
      '--max-workers',
      '2',
    ],
    join(artifacts, `${platform}-bundle.log`),
  );
}
console.log(
  'Checking source moves, idempotency, drift protection, remove, and reinstall…',
);
await lifecycle(app, artifacts, original);
cli(app, artifacts, 'final-doctor', ['doctor', '--typecheck']);
console.log(
  `Passed. App: ${app}\nEvidence: ${artifacts}\nNative binaries/device checks and a live planner are separate checks.`,
);
