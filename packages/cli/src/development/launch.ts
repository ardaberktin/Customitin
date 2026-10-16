import { basename, dirname, join } from 'node:path';
import { spawn } from 'node:child_process';

/** Let the invoking package manager handle script shells and argument quoting. */
export function launchHost(
  root: string,
  script: string,
  args: string[],
  environment: NodeJS.ProcessEnv,
) {
  let executable = environment.npm_execpath;
  if (!executable)
    throw new Error(
      'Start this command through your package manager, for example npm run dev.',
    );
  if (basename(executable) === 'npx-cli.js')
    executable = join(dirname(executable), 'npm-cli.js');
  const npm = /(?:^|[\\/])npm(?:-cli\.js|\.c?js)?$/.test(executable);
  const scriptArgs = ['run', script, ...(npm ? ['--'] : []), ...args];
  const javascript = /\.[cm]?js$/.test(executable);
  return spawn(
    javascript ? process.execPath : executable,
    javascript ? [executable, ...scriptArgs] : scriptArgs,
    {
      cwd: root,
      env: environment,
      stdio: 'inherit',
      detached: process.platform !== 'win32',
      windowsHide: false,
    },
  );
}
