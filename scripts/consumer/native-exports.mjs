import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { command } from './process.mjs';

/** A provider and its hooks must use one context across ESM host/CJS native imports. */
export function verifyNativeExports(app, logs) {
  command(
    app,
    process.execPath,
    [
      '--conditions=react-native',
      '--input-type=module',
      '-e',
      `import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const imported = await import('@customitin/react');
const required = createRequire(import.meta.url)('@customitin/react');
const shared = imported.default ?? imported;
for (const name of ['CustomizationProvider', 'useCustomization', 'useSurface', 'SurfaceRenderer']) {
  assert.equal(typeof shared[name], 'function');
  assert.equal(shared[name], required[name], name + ' must share the native module instance');
}
console.log('Native import/require context identity passed.');`,
    ],
    join(logs, 'native-exports.log'),
  );
}

/** Check Metro's actual module graph too, rather than relying on Node's resolver. */
export async function verifyNativeBundle(sourceMap) {
  const { sources } = JSON.parse(await readFile(sourceMap, 'utf8'));
  const entries = sources.filter((source) =>
    /@customitin\/react\/dist\/index\.(?:cjs|js)$/.test(source),
  );
  assert.equal(
    entries.length,
    1,
    'Metro must bundle exactly one shared React context',
  );
  assert.match(entries[0], /index\.cjs$/);
}
