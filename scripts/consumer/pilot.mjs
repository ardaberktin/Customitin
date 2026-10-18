import assert from 'node:assert/strict';
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cli, command } from './process.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const app = resolve(process.argv[2] ?? '/tmp/customitin-native-pilot');
const logs = join(app, 'evidence');
await mkdir(logs, { recursive: true });
// Run only in a fresh app: ownership must be established from these original host files.
await assert.rejects(readFile(join(app, '.customitin/ownership.json')));
await cp(join(root, 'fixtures/native-pilot'), app, { recursive: true });
const podfile = join(app, 'ios/Podfile');
const nativeSetup = await readFile(podfile, 'utf8');
assert(
  nativeSetup.includes('  post_install do |installer|'),
  'Expected the official React Native Podfile',
);
await writeFile(
  podfile,
  "require_relative '../ios-compatibility'\n" +
    nativeSetup.replace(
      '  post_install do |installer|',
      '  post_install do |installer|\n    configure_pilot_ios(installer)',
    ),
);
const configPath = join(app, 'tsconfig.json');
await writeFile(
  configPath,
  JSON.stringify(
    {
      extends: '@react-native/typescript-config',
      compilerOptions: {
        strict: true,
        noUnusedLocals: true,
        noUnusedParameters: true,
        types: ['jest'],
        resolveJsonModule: true,
      },
      include: ['**/*.ts', '**/*.tsx'],
      exclude: ['**/node_modules', '**/Pods', 'evidence'],
    },
    null,
    2,
  ),
);
const report = cli(app, logs, 'inspect', ['inspect', '--json']);
const selected = new Set([
  'Chart',
  'Cards',
  'Message',
  'Panel',
  'ProgressMeter',
  'loadHours',
  'loadBudgets',
]);
const exclusions = report.review.capabilities
  .filter(
    (item) => item.suggested && !selected.has(item.selector.split('#')[1]),
  )
  .flatMap((item) => ['--exclude', item.selector]);
const args = ['init', '--approve-report', report.review.digest, ...exclusions];
assert.deepEqual(
  cli(app, logs, 'init-dry-run', [...args, '--dry-run']).issues,
  [],
);
assert.deepEqual(cli(app, logs, 'init', [...args, '--apply']).issues, []);
const registry = JSON.parse(
  await readFile(join(app, 'personalize/capabilities.json'), 'utf8'),
);
const component = (title) =>
  registry.components.find((item) => item.title === title).id;
const overridesPath = join(app, 'personalize/overrides.json');
const overrides = JSON.parse(await readFile(overridesPath, 'utf8'));
const provenance = {
  version: 1,
  status: 'developer-reviewed',
  evidence: 'Native simulator consumer policies',
};
overrides.surfaces = [
  {
    id: 'workspace',
    title: 'Workspace',
    mode: 'compose',
    defaultLayout: [],
    requiredNodeIds: [],
    allowedComponentIds: registry.components.map((item) => item.id),
    policy: {
      operations: ['layout', 'data'],
      sourceFields: Object.fromEntries(
        registry.sources.map((source) => [
          source.id,
          Object.keys(source.fields),
        ]),
      ),
      maxNodes: 12,
    },
    provenance,
  },
  {
    id: 'heading',
    title: 'Heading',
    mode: 'properties',
    defaultLayout: [
      {
        id: 'heading-text',
        componentId: component('Message'),
        props: { text: 'Your weekly overview', emphasis: false },
        children: [],
      },
    ],
    requiredNodeIds: [],
    allowedComponentIds: [component('Message')],
    policy: { operations: ['properties'], editableProps: ['text', 'emphasis'] },
    provenance,
  },
];
await writeFile(overridesPath, JSON.stringify(overrides, null, 2) + '\n');
const hostConfig = join(app, 'personalize/config.ts');
await writeFile(
  hostConfig,
  `import AsyncStorage from '@react-native-async-storage/async-storage';
import { asyncStorageAdapter } from '@customitin/react-native/storage';
export { planner } from '../planner';
export const storage = asyncStorageAdapter(AsyncStorage);
export const scope = 'simulator-pilot';
export function useHostConfiguration() { return { scope }; }
`,
);
assert.deepEqual(
  cli(app, logs, 'screen', [
    'refresh',
    '--screen',
    'sections.tsx#ExistingSections',
    '--apply',
  ]).issues,
  [],
);
assert.equal(
  cli(app, logs, 'doctor', ['doctor', '--typecheck']).verification.status,
  'verified',
);
command(
  app,
  join(app, 'node_modules/.bin/tsc'),
  ['--noEmit'],
  join(logs, 'typecheck.log'),
);
console.log(`Native pilot ready: ${app}. Evidence: ${logs}`);
