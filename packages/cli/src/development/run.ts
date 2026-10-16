import { realpath } from 'node:fs/promises';
import { constants } from 'node:os';
import { readOwnership } from '../commands/files';
import { watchProject } from '../commands/watch';
import { readPackage, wrapperCommand } from './scripts';
import { launchHost } from './launch';
import { stopProcessTree } from './process-tree';

/** Only this explicit development command executes a host script. */
export async function runDevelopment(
  root: string,
  name: string,
  args: string[],
): Promise<number> {
  const ownership = await readOwnership(root);
  const binding = ownership?.devScripts?.find((entry) => entry.name === name);
  const { value } = await readPackage(root);
  if (
    !binding ||
    value.scripts?.[name] !== wrapperCommand(name) ||
    !value.scripts[binding.host]
  )
    throw new Error(
      `Development script ${name} is not wired. Run refresh --dev-script ${name} --apply first.`,
    );
  const activeRoot = await realpath(root);
  const nested = process.env.CUSTOMITIN_DEV_ROOT === activeRoot;
  const controller = new AbortController();
  const child = launchHost(root, binding.host, args, {
    ...process.env,
    CUSTOMITIN_DEV_ROOT: activeRoot,
  });
  let requestedExit: number | undefined;
  let stopping: Promise<void> | undefined;
  const stop = (signal: NodeJS.Signals = 'SIGTERM') => {
    controller.abort();
    stopping ??= stopProcessTree(child, signal);
    return stopping;
  };
  const interrupt = () => {
    requestedExit = 130;
    void stop('SIGINT');
  };
  const terminate = () => {
    requestedExit = 143;
    void stop();
  };
  process.on('SIGINT', interrupt);
  process.on('SIGTERM', terminate);
  const exited = new Promise<number>((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code, signal) =>
      resolve(code ?? (signal ? 128 + constants.signals[signal] : 1)),
    );
  });
  let watchFailure: unknown;
  const watching = nested
    ? Promise.resolve()
    : watchProject(root, {
        dryRun: false,
        waitForLock: true,
        signal: controller.signal,
        onUpdate: (update) => {
          if (
            update.changes.length ||
            update.issues.length ||
            update.conflicts.length
          )
            console.error(`[customitin] ${JSON.stringify(update)}`);
        },
      }).catch(async (error: unknown) => {
        watchFailure = error;
        await stop();
      });
  try {
    const code = await exited;
    await stop();
    await watching;
    if (watchFailure) throw watchFailure;
    return requestedExit ?? code;
  } finally {
    await stop();
    await watching;
    process.removeListener('SIGINT', interrupt);
    process.removeListener('SIGTERM', terminate);
  }
}
