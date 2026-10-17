import { execFile, spawn, type ChildProcess } from 'node:child_process';
import { promisify } from 'node:util';
import { setTimeout } from 'node:timers/promises';

async function signalGroup(
  pid: number,
  signal: NodeJS.Signals | 0,
): Promise<boolean> {
  try {
    process.kill(-pid, signal);
    return true;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ESRCH') return false;
    if (code === 'EPERM') {
      // A process group can retain exited members during reaping. Never suppress
      // a permission error for a live process, and never signal unrelated PIDs.
      const { stdout } = await promisify(execFile)(
        'ps',
        ['-axo', 'pid=,pgid=,stat='],
        { maxBuffer: 1024 * 1024 },
      );
      const live = stdout
        .trim()
        .split('\n')
        .some((line) => {
          const [, group, status] = line.trim().split(/\s+/);
          return Number(group) === pid && status && !status.startsWith('Z');
        });
      if (!live) return false;
    }
    throw error;
  }
}

export async function stopProcessTree(
  child: ChildProcess,
  signal: NodeJS.Signals = 'SIGTERM',
) {
  if (!child.pid) return;
  if (process.platform === 'win32') {
    await new Promise<void>((resolve, reject) => {
      const task = spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], {
        stdio: 'ignore',
        windowsHide: true,
      });
      task.once('error', reject);
      task.once('exit', () => resolve());
    });
    return;
  }
  if (!(await signalGroup(child.pid, signal))) return;
  for (let attempt = 0; attempt < 10; attempt++) {
    await setTimeout(100);
    if (!(await signalGroup(child.pid, 0))) return;
  }
  await signalGroup(child.pid, 'SIGKILL');
}
