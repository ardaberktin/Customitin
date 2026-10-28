import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { cli } from './process.mjs';
import { runInteraction } from './interactions.mjs';

export async function collectionInteractions(app, logs, platform) {
  await writeFile(
    join(app, 'cards.ts'),
    `/** @customitinComplete */
export async function loadCards(){return [{id:'a',label:'Alpha',value:2},{id:'b',label:'Beta',value:10}];}\n`,
  );
  const path = join(app, 'personalize/overrides.json');
  const overrides = JSON.parse(await readFile(path, 'utf8'));
  const report = cli(app, logs, 'collection-inspect', ['inspect', '--json']);
  const card = report.symbols.find((s) => s.selector === 'App.tsx#Card');
  const source = report.symbols.find(
    (s) => s.selector === 'cards.ts#loadCards',
  );
  assert(card && source);
  delete overrides.components['App.tsx#Card'];
  overrides.components[card.id] = {
    enabled: true,
    defaults: {},
    collection: { source: source.id },
  };
  overrides.sources[source.id] = { enabled: true };
  overrides.surfaces.push({
    id: 'sdk-collection',
    title: 'SDK collection',
    defaultLayout: [],
    requiredNodeIds: [],
    allowedComponentIds: [card.id, card.id + '.collection'],
    policy: {
      operations: ['data', 'layout'],
      sourceFields: { [source.id]: ['id', 'label', 'value'] },
    },
    provenance: {
      version: 1,
      status: 'developer-reviewed',
      evidence: 'Packed SDK collection test',
    },
  });
  await writeFile(path, JSON.stringify(overrides, null, 2) + '\n');
  assert.deepEqual(
    cli(app, logs, 'collection-refresh', ['refresh', '--apply']).issues,
    [],
  );
  assert.equal(
    cli(app, logs, 'collection-doctor', ['doctor', '--typecheck']).verification
      .status,
    'verified',
  );
  runInteraction(app, logs, platform, 'collection-interaction');
}
