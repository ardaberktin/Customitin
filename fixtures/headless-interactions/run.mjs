import { JSDOM } from 'jsdom';
const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'http://localhost',
});
for (const name of [
  'window',
  'document',
  'navigator',
  'HTMLElement',
  'ShadowRoot',
  'Node',
  'MutationObserver',
  'getComputedStyle',
])
  Object.defineProperty(globalThis, name, {
    configurable: true,
    value: dom.window[name],
  });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
// jsdom does not lay out native views. Geometry remains a device check.
dom.window.ResizeObserver = globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
try {
  const { run } = await import(`./${process.argv[2] ?? 'interaction'}.cjs`);
  await run();
} finally {
  dom.window.close();
}
