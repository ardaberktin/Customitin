import assert from 'node:assert/strict';
import { readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { cli, command } from './process.mjs';

export async function lifecycle(app, artifacts, original) {
  const capabilities = () =>
    readFile(join(app, 'personalize/capabilities.json'), 'utf8').then(
      JSON.parse,
    );
  const before = await capabilities();
  const config = await readFile(join(app, 'personalize/config.ts'), 'utf8');
  const overrides = await readFile(
    join(app, 'personalize/overrides.json'),
    'utf8',
  );
  assert.deepEqual(
    cli(app, artifacts, 'idempotent', ['refresh', '--dry-run']).changes,
    [],
  );
  await rename(join(app, 'src/trails.ts'), join(app, 'src/data.ts'));
  // A normal host refactor updates imports; the durable override keeps its old selector.
  const consumers = [
    'src/TrailCard.tsx',
    'src/screens.tsx',
    '__tests__/Integration.test.tsx',
  ];
  for (const file of consumers) {
    const path = join(app, file);
    const text = await readFile(path, 'utf8');
    await writeFile(
      path,
      text
        .replaceAll("'/trails'", "'/data'")
        .replaceAll("'./trails'", "'./data'")
        .replaceAll("'../src/trails'", "'../src/data'"),
    );
  }
  const moved = cli(app, artifacts, 'moved', ['refresh', '--apply']);
  assert.deepEqual(moved.issues, []);
  assert.equal((await capabilities()).revision, before.revision);
  assert.equal((await capabilities()).sources[0].id, before.sources[0].id);
  cli(app, artifacts, 'moved-doctor', ['doctor', '--typecheck']);
  command(
    app,
    'npm',
    ['test', '--', '--runInBand', '--watch=false'],
    join(artifacts, 'moved-interactions.log'),
  );
  const sourcePath = join(app, 'personalize/sources.ts');
  const source = await readFile(sourcePath, 'utf8');
  await writeFile(sourcePath, `${source}\n// Intentional drift test\n`);
  assert.throws(() => cli(app, artifacts, 'drift', ['refresh', '--apply']));
  assert.throws(() =>
    cli(app, artifacts, 'drift-remove', ['remove', '--apply']),
  );
  assert.equal(
    await readFile(sourcePath, 'utf8'),
    `${source}\n// Intentional drift test\n`,
  );
  await writeFile(sourcePath, source);
  assert.deepEqual(
    cli(app, artifacts, 'remove', ['remove', '--apply']).conflicts,
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
  // Leave a usable app at the end, with its source refactor intact.
  cli(app, artifacts, 'reinstall', ['init', '--apply']);
}
