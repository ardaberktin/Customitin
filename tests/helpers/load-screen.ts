import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import type { ComponentType } from 'react';
import type { StorageAdapter } from '../../packages/react-native/src/storage/profile-store';

/** Execute the actual generated consumer with the same React instance as the test. */
export function loadScreenConsumer(root: string) {
  const outfile = join(root, `screen-test-${randomUUID()}.cjs`);
  const options = {
    stdin: {
      contents:
        "export { default } from './App'; export { storage } from './personalize/config';",
      resolveDir: root,
      loader: 'tsx',
    },
    outfile,
    bundle: true,
    platform: 'node',
    format: 'cjs',
    packages: 'external',
    alias: {
      '@customitin/react': join(process.cwd(), 'packages/react/src'),
      '@customitin/core': join(process.cwd(), 'packages/core/src/index.ts'),
      '@customitin/react-native': join(
        process.cwd(),
        'packages/react-native/src',
      ),
      'react-native': 'react-native-web',
    },
  };
  execFileSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `import { buildSync } from 'esbuild'; buildSync(${JSON.stringify(options)});`,
    ],
    { stdio: 'pipe' },
  );
  const require = createRequire(import.meta.url);
  return require(outfile) as {
    default: ComponentType;
    storage: StorageAdapter;
  };
}
