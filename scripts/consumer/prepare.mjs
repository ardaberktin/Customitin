import assert from 'node:assert/strict';
import { cp, mkdir, realpath, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { command } from './process.mjs';

export async function prepare(root, directory, platform, tarballs) {
  const app = join(directory, platform);
  const logs = join(directory, 'artifacts', platform);
  await mkdir(logs);
  await cp(join(root, `fixtures/headless-${platform}`), app, {
    recursive: true,
  });
  await cp(
    join(root, 'fixtures/headless-interactions/data.ts'),
    join(app, 'data.ts'),
  );
  const json = (file, value) =>
    writeFile(join(app, file), JSON.stringify(value, null, 2) + '\n');
  await json('package.json', {
    name: `headless-${platform}-consumer`,
    private: true,
    version: '1.0.0',
    scripts:
      platform === 'web'
        ? { dev: 'vite', build: 'tsc -b && vite build' }
        : { start: 'react-native start' },
  });
  const config = {
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
    include: ['*.ts', '*.tsx', 'personalize'],
  };
  if (platform === 'web') {
    await json('tsconfig.json', {
      files: [],
      references: [{ path: './tsconfig.app.json' }],
    });
    await json('tsconfig.app.json', {
      ...config,
      compilerOptions: {
        ...config.compilerOptions,
        baseUrl: '.',
        paths: { '@host/*': ['./*'] },
      },
    });
  } else await json('tsconfig.json', config);
  const peers =
    platform === 'web'
      ? ['react-dom@19.2.0']
      : [
          'react-native@0.83.10',
          '@react-native-async-storage/async-storage@2.2.0',
        ];
  console.log(`Installing isolated ${platform} consumer from tarballs…`);
  const install = [
    'install',
    '--offline',
    '--ignore-scripts',
    '--no-audit',
    '--no-fund',
    '--save-exact',
  ];
  // Follow the pack command's runtime/dev dependency split, including the local CLI dependency.
  command(
    app,
    'npm',
    [
      ...install,
      tarballs.core,
      tarballs.react,
      ...(platform === 'native' ? [tarballs['react-native']] : []),
      'react@19.2.0',
      ...peers,
    ],
    join(logs, 'runtime-install.log'),
  );
  const tooling =
    platform === 'web'
      ? ['vite@7.3.7']
      : [
          '@react-native/babel-preset@0.83.10',
          '@react-native/metro-config@0.83.10',
          '@react-native-community/cli@20.2.0',
          'react-native-web@0.21.4',
          'react-dom@19.2.0',
        ];
  command(
    app,
    'npm',
    [
      ...install,
      '--save-dev',
      tarballs.server,
      tarballs.cli,
      '@types/react@19.2.2',
      '@types/react-dom@19.2.2',
      'typescript@5.9.3',
      '@testing-library/react@16.3.0',
      '@testing-library/dom@10.4.1',
      'jsdom@27.2.0',
      'esbuild@0.28.2',
      ...tooling,
    ],
    join(logs, 'tooling-install.log'),
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
  return { app, logs, typecheck: platform === 'web' ? ['-b'] : ['--noEmit'] };
}
