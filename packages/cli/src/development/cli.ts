import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { runDevelopment } from './run';
import { scriptNameSchema } from './schema';

export async function developmentCommand(args: string[]) {
  const separator = args.indexOf('--');
  const { values } = parseArgs({
    args: separator < 0 ? args : args.slice(0, separator),
    options: {
      cwd: { type: 'string' },
      script: { type: 'string' },
      help: { type: 'boolean', short: 'h' },
    },
  });
  if (values.help) {
    console.log(
      'customitin dev --script NAME [--cwd APP] -- [host arguments]\nUsed by generated package scripts to start the host and applying watcher together.',
    );
    return;
  }
  const name = scriptNameSchema.parse(values.script);
  process.exitCode = await runDevelopment(
    resolve(values.cwd ?? process.cwd()),
    name,
    separator < 0 ? [] : args.slice(separator + 1),
  );
}
