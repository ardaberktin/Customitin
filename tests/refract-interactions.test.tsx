// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { plannerResponseSchema, type PlannerRequest } from '@customitin/core';
import { App } from '../examples/refract-app/src/App';
import { en } from '../examples/refract-app/src/en';
import recorded from './fixtures/refract/collection-sdk-response.json';
import refinement from './fixtures/refract/collection-sdk-refinement.json';
const captured = plannerResponseSchema.parse(recorded);
const refined = plannerResponseSchema.parse(refinement);
let fail = false;
const requests: PlannerRequest[] = [];
beforeEach(() => {
  localStorage.clear();
  fail = false;
  requests.length = 0;
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  // jsdom has no native dialog rendering; real keyboard/focus behavior is checked in-browser.
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
  };
  vi.stubGlobal(
    'fetch',
    vi.fn<typeof fetch>(async (url, init) => {
      if (url === '/api/session') return new Response(null, { status: 204 });
      if (fail) return new Response(null, { status: 503 });
      const request = JSON.parse(String(init?.body)) as PlannerRequest;
      requests.push(request);
      const output =
        request.instruction === 'Larger cards' ? refined : captured;
      if (output.kind !== 'proposal')
        throw new Error('Expected recorded live proposal');
      return Response.json({
        ...output,
        proposal: {
          ...output.proposal,
          requestId: request.requestId,
          baseRevision: request.baseRevision,
          registryRevision: request.registryRevision,
        },
      });
    }),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
const click = (name: string) =>
  fireEvent.click(screen.getByRole('button', { name }));
async function prepare() {
  click(en.collection);
  await screen.findByText(en.emptyCollection);
  fireEvent.click(screen.getAllByRole('button', { name: en.customize })[0]!);
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: en.prepare }).hasAttribute('disabled'),
    ).toBe(false),
  );
  click(en.prepare);
  await screen.findByRole('button', { name: en.preview });
  click(en.preview);
  await screen.findByRole('heading', { name: /^Watching/ });
}
const groups = () =>
  [...document.querySelectorAll('[data-customitin-grid]')].map(
    (grid) => grid.closest('section')!,
  );
const titles = () =>
  [...document.querySelectorAll('[data-customitin-grid] .media-title')].map(
    (node) => node.textContent,
  );

it('uses the real generated provider/bindings to preview, discard, apply, filter, sort, reload and undo the recorded live response', async () => {
  const app = render(<App />);
  expect(screen.getByRole('heading', { name: en.continue })).toBeTruthy();
  await prepare();
  expect(groups().map((group) => group.getAttribute('aria-label'))).toEqual(
    en.statuses,
  );
  expect(
    groups().map((group) => within(group).getAllByRole('button').length),
  ).toEqual([9, 2, 2, 3, 2, 2, 2, 2]);
  expect(
    document.querySelector('[aria-label="Total items: 24"]')?.textContent,
  ).toBe('(24)');
  expect(titles().slice(0, 3)).toEqual([
    'VisionQuest',
    'Konuşanlar - Disney+',
    'The Night Agent',
  ]);
  click(en.discard);
  expect(screen.getByText(en.emptyCollection)).toBeTruthy();
  // Discard must leave the saved surface empty, including after remount.
  app.unmount();
  render(<App />);
  await prepare();
  click(en.apply);
  await waitFor(() =>
    expect(screen.queryByRole('button', { name: en.apply })).toBeNull(),
  );
  fireEvent.click(screen.getAllByRole('button', { name: 'Plan to Watch' })[0]!);
  expect(groups()).toHaveLength(1);
  expect(titles()).toHaveLength(3);
  fireEvent.change(screen.getByRole('combobox', { name: 'Sort by' }), {
    target: { value: 'title' },
  });
  click('Descending');
  expect(titles()).toEqual(['Clayface', 'Crossed', 'The Walking Dead']);
  const opener = screen.getByRole('button', { name: 'Clayface, 2026' });
  click('Clayface, 2026');
  expect(screen.getByRole('dialog', { name: en.detail })).toBeTruthy();
  click(en.close);
  expect(document.activeElement).toBe(opener);
  cleanup();
  render(<App />);
  click(en.collection);
  await screen.findByRole('heading', { name: /^Watching/ });
  expect(groups()).toHaveLength(8);
  expect(requests).toHaveLength(2); // Reload never calls the model.
  expect(requests[0]?.surfaceIds).toEqual(['collection']);
  expect(JSON.stringify(requests)).not.toContain('OPENAI_API_KEY');
  const stored = Object.values(localStorage).join('');
  expect(stored).toContain('collection-library');
  expect(stored).not.toContain('VisionQuest'); // Plans, not library records, are saved.
  click(en.customize);
  click(en.undo);
  await screen.findByText(en.emptyCollection);
  click(en.close);
  click(en.home);
  expect(screen.getByRole('heading', { name: en.continue })).toBeTruthy();
  expect(screen.getByRole('heading', { name: en.watchlist })).toBeTruthy();
});

it('retains a saved collection when the live connection fails', async () => {
  render(<App />);
  await prepare();
  click(en.apply);
  await waitFor(() =>
    expect(screen.queryByRole('button', { name: en.apply })).toBeNull(),
  );
  fail = true;
  click(en.customize);
  click(en.prepare);
  await waitFor(() =>
    expect(screen.getByRole('status').textContent).toContain(
      'could not be prepared',
    ),
  );
  click(en.close);
  expect(groups()).toHaveLength(8);
  expect(screen.queryByRole('button', { name: en.apply })).toBeNull();
});

it('applies the recorded refinement and undoes it without another planner request', async () => {
  render(<App />);
  await prepare();
  click(en.apply);
  await waitFor(() =>
    expect(screen.queryByRole('button', { name: en.apply })).toBeNull(),
  );
  click(en.customize);
  fireEvent.change(screen.getByRole('textbox', { name: en.instruction }), {
    target: { value: 'Larger cards' },
  });
  click(en.prepare);
  await screen.findByRole('button', { name: en.preview });
  click(en.preview);
  expect(groups()).toHaveLength(8);
  expect(
    document.querySelector<HTMLElement>('[data-customitin-grid]')!.style
      .gridTemplateColumns,
  ).toContain('repeat(2');
  expect(screen.getByRole('button', { name: 'Expand filters' })).toBeTruthy();
  click(en.apply);
  await waitFor(() =>
    expect(screen.queryByRole('button', { name: en.apply })).toBeNull(),
  );
  click(en.customize);
  click(en.undo);
  await waitFor(() =>
    expect(
      document.querySelector<HTMLElement>('[data-customitin-grid]')!.style
        .gridTemplateColumns,
    ).toContain('repeat(3'),
  );
  expect(groups()).toHaveLength(8);
  expect(screen.getByRole('button', { name: 'Collapse filters' })).toBeTruthy();
  expect(requests).toHaveLength(2);
  expect(requests[1]?.baseRevision).toBe(1);
});
