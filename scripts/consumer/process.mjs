import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

export function command(cwd, executable, args, log) {
  const env = { ...process.env, CI: '1' };
  delete env.NO_COLOR;
  delete env.FORCE_COLOR;
  const result = spawnSync(executable, args, {
    cwd,
    env,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 20 * 1024 * 1024,
  });
  if (log) writeFileSync(log, `${result.stdout ?? ''}${result.stderr ?? ''}`);
  if (result.error || result.status !== 0) {
    throw new Error(
      `${executable} ${args.join(' ')} failed. ${log ? `See ${log}` : (result.error?.message ?? result.stderr)}`,
    );
  }
  return result.stdout;
}
export function cli(app, artifacts, name, args) {
  return JSON.parse(
    command(
      app,
      join(app, 'node_modules/.bin/customitin'),
      args,
      join(artifacts, `${name}.json`),
    ),
  );
}
