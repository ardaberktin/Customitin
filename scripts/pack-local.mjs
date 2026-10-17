import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = fileURLToPath(new URL('..', import.meta.url));
const destination = resolve(process.argv[2] ?? '/tmp/customitin-packages');
await mkdir(destination, { recursive: true });
execFileSync('npm', ['run', 'build'], { cwd: root, stdio: 'inherit' });
const packages = ['core', 'react', 'react-native', 'server', 'cli'];
const tarballs = {};
for (const name of packages) {
  const manifest = JSON.parse(
    await readFile(join(root, 'packages', name, 'package.json'), 'utf8'),
  );
  execFileSync(
    'npm',
    [
      'pack',
      '--workspace',
      manifest.name,
      '--pack-destination',
      destination,
      '--silent',
    ],
    { cwd: root, stdio: 'inherit' },
  );
  tarballs[name] = join(
    destination,
    `${manifest.name.replace('@', '').replace('/', '-')}-${manifest.version}.tgz`,
  );
}
await writeFile(
  join(destination, 'packages.json'),
  JSON.stringify(tarballs, null, 2) + '\n',
);
const quote = (value) => `'${value.replaceAll("'", "'\\''")}'`;
console.log('\nChoose the runtime install for the consuming app.');
console.log('React web:');
console.log(
  `npm install ${['core', 'react'].map((name) => quote(tarballs[name])).join(' ')}`,
);
console.log('React Native / Expo:');
console.log(
  `npm install ${['core', 'react', 'react-native'].map((name) => quote(tarballs[name])).join(' ')}`,
);
console.log('Development tooling for either platform:');
console.log(
  `npm install --save-dev ${['server', 'cli'].map((name) => quote(tarballs[name])).join(' ')}`,
);
console.log('npx --no-install customitin guide --topic integration');
