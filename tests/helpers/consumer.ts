import { mkdtemp, mkdir, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { execFileSync } from 'node:child_process';

export async function consumer(
  files: Record<string, string>,
  dependencies: Record<string, string> = {},
) {
  const root = await mkdtemp(join(tmpdir(), 'customitin-consumer-'));
  await symlink(
    join(process.cwd(), 'node_modules'),
    join(root, 'node_modules'),
    'dir',
  );
  const content = {
    'package.json': JSON.stringify({
      name: 'consumer-fixture',
      dependencies: {
        '@customitin/core': '0.1.0-alpha.1',
        '@customitin/react': '0.1.0-alpha.1',
        '@customitin/react-native': '0.1.0-alpha.1',
        ...dependencies,
      },
    }),
    'App.tsx':
      "import { Text } from 'react-native';\nconst App = () => <Text>Original</Text>;\nexport default App;\n",
    'tsconfig.json': JSON.stringify({
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
        baseUrl: process.cwd(),
        paths: {
          '@customitin/core': ['packages/core/src/index.ts'],
          '@customitin/react': ['packages/react/src/index.ts'],
          '@customitin/react/*': ['packages/react/src/*'],
          '@customitin/react-native': ['packages/react-native/src/index.ts'],
          '@customitin/react-native/*': ['packages/react-native/src/*'],
        },
      },
      include: ['**/*.ts', '**/*.tsx'],
    }),
    ...files,
  };
  for (const [path, value] of Object.entries(content)) {
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), value);
  }
  return root;
}
export function compileConsumer(root: string) {
  try {
    execFileSync(
      process.execPath,
      [
        join(process.cwd(), 'node_modules/typescript/bin/tsc'),
        '--project',
        join(root, 'tsconfig.json'),
      ],
      { stdio: 'pipe' },
    );
  } catch (error) {
    throw new Error(String((error as { stdout?: Buffer }).stdout ?? error), {
      cause: error,
    });
  }
}
export const entries = `export interface Entry { id: string; title: string; stage: 'draft' | 'done'; note?: string; }
/** @customitinComplete */
export const loadEntries = async (): Promise<Entry[]> => [{ id: '1', title: 'Entry', stage: 'draft' }];
`;
