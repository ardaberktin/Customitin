import { throwIfAborted } from '@customitin/core';
/** Also settles when a host transport ignores AbortSignal. Its late result is discarded. */
export function abortable<T>(
  work: Promise<T>,
  signal: AbortSignal,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const abort = () => reject(new Error('Request cancelled'));
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) abort();
    work
      .then(resolve, reject)
      .finally(() => signal.removeEventListener('abort', abort));
  });
}
export class QueryScheduler {
  private active = 0;
  private waiting: (() => void)[] = [];
  constructor(private limit: number) {}
  async run<T>(work: () => Promise<T>, signal: AbortSignal): Promise<T> {
    throwIfAborted(signal);
    if (this.active >= this.limit) {
      await new Promise<void>((resolve, reject) => {
        const resume = () => {
          signal.removeEventListener('abort', cancel);
          resolve();
        };
        const cancel = () => {
          this.waiting = this.waiting.filter((item) => item !== resume);
          reject(new Error('Request cancelled'));
        };
        this.waiting.push(resume);
        signal.addEventListener('abort', cancel, { once: true });
        if (signal.aborted) cancel();
      });
    } else this.active++;
    try {
      throwIfAborted(signal);
      return await abortable(work(), signal);
    } finally {
      const next = this.waiting.shift();
      if (next) next();
      else this.active--;
    }
  }
}
