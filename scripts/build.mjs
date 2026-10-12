import { build } from 'tsup';
for (const name of ['core', 'react-native', 'server', 'cli']) {
  const entry =
    name === 'react-native'
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
    platform: name === 'core' || name === 'react-native' ? 'neutral' : 'node',
    external: [
      '@customitin/core',
      '@customitin/react-native',
      '@customitin/server',
      'react',
      'react-native',
      'zod',
      'ts-morph',
    ],
    target: 'es2022',
  });
}
