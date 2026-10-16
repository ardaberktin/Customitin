import { spawn, type ChildProcess } from 'node:child_process';
import { setTimeout } from 'node:timers/promises';

function signalGroup(pid: number, signal: NodeJS.Signals | 0): boolean {
  try {
    process.kill(-pid, signal);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ESRCH') return false;
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
  if (!signalGroup(child.pid, signal)) return;
  for (let attempt = 0; attempt < 10; attempt++) {
    await setTimeout(100);
    if (!signalGroup(child.pid, 0)) return;
  }
  signalGroup(child.pid, 'SIGKILL');
}
