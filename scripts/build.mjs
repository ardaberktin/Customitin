import { build } from 'tsup';
import { cp } from 'node:fs/promises';
for (const name of ['core', 'react', 'react-native', 'server', 'cli']) {
  const entry =
    name === 'react'
      ? [
          'src/index.ts',
          'src/adapters/index.ts',
          'src/storage/index.ts',
          'src/dom/index.ts',
        ]
      : name === 'react-native'
        ? [
            'src/index.ts',
            'src/storage/index.ts',
            'src/adapters/index.ts',
            'src/navigation/index.ts',
          ]
        : name === 'cli'
          ? ['src/index.ts', 'src/api.ts']
          : ['src/index.ts'];
  await build({
    entry: entry.map((e) => `packages/${name}/${e}`),
    outDir: `packages/${name}/dist`,
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    clean: true,
    splitting: false,
    tsconfig: `packages/${name}/tsconfig.json`,
    platform: ['core', 'react', 'react-native'].includes(name)
      ? 'neutral'
      : 'node',
    external: [
      '@customitin/core',
      '@customitin/react-native',
      '@customitin/react',
      '@customitin/server',
      'react',
      'react-native',
      'zod',
      'ts-morph',
      'prettier',
    ],
    target: 'es2022',
  });
  await cp('docs/ai', `packages/${name}/dist/docs`, { recursive: true });
}
