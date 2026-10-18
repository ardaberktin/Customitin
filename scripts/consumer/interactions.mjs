import assert from 'node:assert/strict';
import { cp, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { cli, command } from './process.mjs';

export async function interactions(root, app, logs, platform) {
  const registry = JSON.parse(
    await readFile(join(app, 'personalize/capabilities.json'), 'utf8'),
  );
  const chart = registry.components.find((item) => item.title === 'Chart');
  assert(chart);
  assert.equal(
    chart.sourceIds,
    undefined,
    'A reusable chart must not be tied to one dataset',
  );
  const path = join(app, 'personalize/overrides.json');
  const overrides = JSON.parse(await readFile(path, 'utf8'));
  overrides.surfaces = [
    {
      id: 'workspace',
      title: 'Workspace',
      mode: 'compose',
      defaultLayout: [],
      requiredNodeIds: [],
      allowedComponentIds: [chart.id],
      policy: {
        operations: ['layout', 'data'],
        sourceFields: Object.fromEntries(
          registry.sources.map((source) => [
            source.id,
            Object.keys(source.fields),
          ]),
        ),
        actionIds: [],
        maxNodes: 5,
      },
      provenance: {
        version: 1,
        status: 'developer-reviewed',
        evidence: 'Fresh consumer test host surface',
      },
    },
  ];
  await writeFile(path, JSON.stringify(overrides, null, 2) + '\n');
  await cp(
    join(root, 'fixtures/headless-interactions'),
    join(app, '__tests__'),
    { recursive: true },
  );
  const configPath = join(app, 'personalize/config.ts');
  const config = await readFile(configPath, 'utf8');
  await writeFile(
    configPath,
    config
      .replace(
        /import type \{ PlannerTransport(?:, RuntimeBindings)? \} from '@customitin\/react';/,
        platform === 'native'
          ? "import type { RuntimeBindings } from '@customitin/react';"
          : '',
      )
      .replace(
        'export const planner: PlannerTransport | undefined = undefined;',
        "export { planner } from '../__tests__/planner';",
      ),
  );
  assert.deepEqual(
    cli(app, logs, 'surface', ['refresh', '--apply']).issues,
    [],
  );
  assert.equal(
    cli(app, logs, 'surface-doctor', ['doctor', '--typecheck']).verification
      .status,
    'verified',
  );
  runInteraction(app, logs, platform, 'interaction');
  // Production bundles must not import the deterministic test planner (Metro excludes __tests__).
  await writeFile(configPath, config);
  // Only the harness uses DOM/native-storage substitutions; bundle checks use the actual native packages.
}

export function runInteraction(app, logs, platform, entry) {
  const options = {
    entryPoints: [`__tests__/${entry}.tsx`],
    outfile: `__tests__/${entry}.cjs`,
    bundle: true,
    platform: 'node',
    format: 'cjs',
    packages: 'external',
    jsx: 'automatic',
    alias:
      platform === 'native'
        ? {
            // Bundle the installed native entry so its React Native import receives
            // the same DOM substitution as host code. Never alias SDK sources.
            '@customitin/react-native': join(
              app,
              'node_modules/@customitin/react-native/dist',
            ),
            'react-native': 'react-native-web',
            '@react-native-async-storage/async-storage': join(
              app,
              '__tests__/storage.ts',
            ),
          }
        : {},
  };
  command(
    app,
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `import { build } from 'esbuild'; await build(${JSON.stringify(options)});`,
    ],
    join(logs, `${entry}-build.log`),
  );
  command(
    app,
    process.execPath,
    ['__tests__/run.mjs', entry],
    join(logs, `${entry}.log`),
  );
}
