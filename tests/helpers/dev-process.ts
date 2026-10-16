import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  symlink,
  unlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { spawn } from 'node:child_process';
import { setTimeout } from 'node:timers/promises';
import { build } from 'esbuild';
import { installProject, overridesSchema } from '@customitin/cli';
import { consumer } from './consumer';
import { stopProcessTree } from '../../packages/cli/src/development/process-tree';
import { watchLockPath } from '../../packages/cli/src/development/watch-lock';

export async function readLock(root: string): Promise<{ pid: number }> {
  return JSON.parse(await readFile(await watchLockPath(root), 'utf8')) as {
    pid: number;
  };
}

let cli: Promise<string> | undefined;
async function buildCli() {
  const root = await mkdtemp(join(tmpdir(), 'customitin-dev-bin-'));
  const output = join(root, 'customitin.cjs');
  await symlink(
    join(process.cwd(), 'node_modules'),
    join(root, 'node_modules'),
  );
  await build({
    entryPoints: ['packages/cli/src/index.ts'],
    outfile: output,
    bundle: true,
    platform: 'node',
    format: 'cjs',
    packages: 'external',
    alias: {
      '@customitin/core': join(process.cwd(), 'packages/core/src/index.ts'),
      '@customitin/server': join(process.cwd(), 'packages/server/src/index.ts'),
    },
  });
  await chmod(output, 0o755);
  return output;
}

export async function until<T>(
  read: () => Promise<T>,
  accept: (value: T) => boolean,
  timeout = 15000,
): Promise<T> {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    try {
      const value = await read();
      if (accept(value)) return value;
    } catch (error) {
      if (
        (error as NodeJS.ErrnoException).code !== 'ENOENT' &&
        !(error instanceof SyntaxError)
      )
        throw error;
    }
    await setTimeout(50);
  }
  throw new Error('Timed out waiting for the development process');
}
export const readJson = async <T>(root: string, path: string): Promise<T> =>
  JSON.parse(await readFile(join(root, path), 'utf8')) as T;

export async function devProcess(
  args: string[] = [],
  grandchild = false,
  nested = false,
) {
  const root = await consumer({
    'host.cjs': `const fs = require('node:fs');
const child = process.env.TEST_GRANDCHILD ? require('node:child_process').spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], {stdio:'inherit'}) : undefined;
fs.appendFileSync('events.txt', 'host\\n');
fs.writeFileSync('ready.json', JSON.stringify({pid:process.pid, child:child?.pid, args:process.argv.slice(2), flag:process.env.TEST_HOST_FLAG}));
setInterval(() => { if (fs.existsSync('exit.txt')) process.exit(Number(fs.readFileSync('exit.txt', 'utf8'))); }, 50);`,
    'hook.cjs': `require('node:fs').appendFileSync('events.txt', process.argv[2] + '\\n');`,
  });
  const pkg = await readJson<Record<string, unknown>>(root, 'package.json');
  pkg.scripts = {
    dev: nested ? 'npm run serve --' : 'node host.cjs',
    ...(nested ? { serve: 'node host.cjs' } : {}),
    predev: 'node hook.cjs pre',
    postdev: 'node hook.cjs post',
  };
  await writeFile(join(root, 'package.json'), JSON.stringify(pkg));
  const plan = await installProject(root, {
    dryRun: false,
    overrides: overridesSchema.parse({
      version: 1,
      devScripts: nested ? ['dev', 'serve'] : ['dev'],
    }),
  });
  if (plan.conflicts.length || plan.issues.length)
    throw new Error(JSON.stringify(plan.conflicts.concat(plan.issues)));
  // Give the consumer its own executable; never change the workspace's shared bin symlink.
  await unlink(join(root, 'node_modules'));
  await mkdir(join(root, 'node_modules/.bin'), { recursive: true });
  await symlink(
    await (cli ??= buildCli()),
    join(root, 'node_modules/.bin/customitin'),
  );
  let npm = process.env.npm_execpath!;
  if (basename(npm) === 'npx-cli.js') npm = join(dirname(npm), 'npm-cli.js');
  const child = spawn(process.execPath, [npm, 'run', 'dev', '--', ...args], {
    cwd: root,
    detached: process.platform !== 'win32',
    env: {
      ...process.env,
      TEST_HOST_FLAG: 'inherited',
      TEST_GRANDCHILD: grandchild ? '1' : '',
      CUSTOMITIN_DEV_ROOT: '',
    },
  });
  let output = '';
  child.stdout.on('data', (data: Buffer) => {
    output += data.toString();
  });
  child.stderr.on('data', (data: Buffer) => {
    output += data.toString();
  });
  const exited = new Promise<number | null>((resolve, reject) => {
    child.once('error', reject);
    child.once('close', (code) => resolve(code));
  });
  return {
    root,
    exited,
    output: () => output,
    stop: () => stopProcessTree(child),
  };
}
