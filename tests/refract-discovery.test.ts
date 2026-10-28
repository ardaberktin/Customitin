import { describe, expect, it } from 'vitest';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  inspectProject,
  installProject,
  planInstall,
  removeProject,
  reviewProject,
} from '@customitin/cli';
import { compileConsumer, consumer } from './helpers/consumer';
import { check } from 'prettier';
describe('Refract consumer discovery regressions', () => {
  it('emits formatter-clean JSON without causing ownership drift on refresh', async () => {
    const root = await consumer(
      {
        'data.ts': `/** @customitinComplete */
      export async function loadItems(): Promise<{id:string;title:string;status:'watching'|'watched'|'planned'}[]> {return [];}`,
      },
      { 'react-dom': '19.2.0' },
    );
    const report = await reviewProject(root);
    const installed = await installProject(root, {
      dryRun: false,
      approvalDigest: report.digest,
    });
    expect(installed.issues).toEqual([]);
    for (const [path, source] of Object.entries(installed.files))
      if (path.endsWith('.json'))
        expect(await check(source, { parser: 'json' }), path).toBe(true);
    expect((await planInstall(root)).changes).toEqual([]);
  });
  it('ignores array prototype methods while retaining complete repository methods', async () => {
    const root = await consumer({
      'data.ts': `
      interface Item { id: string; title: string }
      export const items: Item[] = [];
      export const readonlyItems: readonly Item[] = [];
      export const tuple: [Item] = [{id: 'a', title: 'A'}];
      export const repository = { /** @customitinComplete */ load(): Item[] { return items; } };
    `,
    });
    const report = await inspectProject(root);
    expect(
      report.symbols
        .filter((item) => item.kind === 'source')
        .map((item) => item.name),
    ).toEqual(['repository.load']);
  });
  it('distinguishes optional fields from explicitly nullable values', async () => {
    const root = await consumer(
      {
        'Card.tsx': `export function Card({label, note}: { label?: string; note?: string | null }) { return <p>{label}{note}</p>; }`,
      },
      { 'react-dom': '19.2.0' },
    );
    const card = (await inspectProject(root)).symbols.find(
      (item) => item.name === 'Card',
    );
    expect(card?.props.label).toMatchObject({
      required: false,
      nullable: false,
    });
    expect(card?.props.note).toMatchObject({ required: false, nullable: true });
  });
  it.each(['function', 'arrow'])(
    'installs, compiles, refreshes and removes a named %s App without changing its provider order',
    async (shape) => {
      const original = `import { createContext, type ReactNode } from 'react';
      const Context = createContext('host');
      function HostProvider({children}: {children: ReactNode}) { return <Context.Provider value="host">{children}</Context.Provider>; }
      export ${shape === 'function' ? 'function App() { return' : 'const App = () =>'} <HostProvider><main><p>Original</p></main></HostProvider>${shape === 'function' ? '; }' : ';'}
    `;
      const root = await consumer(
        { 'App.tsx': original },
        { 'react-dom': '19.2.0' },
      );
      const report = await reviewProject(root);
      const installed = await installProject(root, {
        dryRun: false,
        approvalDigest: report.digest,
      });
      expect(installed.issues).toEqual([]);
      expect(installed.files['App.tsx']).toMatch(
        /<HostProvider>\s*<PersonalizationRoot>/,
      );
      compileConsumer(root);
      expect((await planInstall(root)).changes).toEqual([]);
      await writeFile(
        join(root, 'App.tsx'),
        (await readFile(join(root, 'App.tsx'), 'utf8')).replace(
          'Original',
          'Host edit',
        ),
      );
      expect((await removeProject(root, false)).conflicts).toEqual([]);
      expect(await readFile(join(root, 'App.tsx'), 'utf8')).toContain(
        'Host edit',
      );
      expect(await readFile(join(root, 'App.tsx'), 'utf8')).not.toContain(
        'PersonalizationRoot',
      );
      compileConsumer(root);
    },
  );
});
