import { expect, it, vi } from 'vitest';
import {
  QueryScheduler,
  abortable,
} from '../packages/react-native/src/provider/cancellation';
it('bounds active queries and removes cancelled queued work without losing capacity', async () => {
  const scheduler = new QueryScheduler(1);
  let release: (() => void) | undefined;
  const first = scheduler.run(
    () =>
      new Promise<void>((r) => {
        release = r;
      }),
    new AbortController().signal,
  );
  const controller = new AbortController();
  const work = vi.fn(async () => 'never');
  const second = scheduler.run(work, controller.signal);
  const rejected = expect(second).rejects.toThrow('cancelled');
  controller.abort();
  release?.();
  await first;
  await rejected;
  expect(work).not.toHaveBeenCalled();
  expect(
    await scheduler.run(async () => 'next', new AbortController().signal),
  ).toBe('next');
});
it('settles cancelled transports even when the host ignores its signal', async () => {
  const controller = new AbortController();
  const work = abortable(new Promise(() => {}), controller.signal);
  const rejected = expect(work).rejects.toThrow('cancelled');
  controller.abort();
  await rejected;
});
