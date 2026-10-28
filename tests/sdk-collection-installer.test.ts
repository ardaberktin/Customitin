import { readFile, rename } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import {
  installProject,
  overridesSchema,
  planInstall,
  removeProject,
} from '@customitin/cli';
import { consumer, compileConsumer } from './helpers/consumer';
it.each(['web', 'native'])(
  'generates and compiles opt-in %s collection bindings, preserving host ownership and identities',
  async (platform) => {
    const native = platform === 'native';
    const root = await consumer(
      {
        'App.tsx': native
          ? "import {View} from 'react-native'; export default function App(){return <View/>;}"
          : 'export default function App(){return <main/>;}',
        'data.ts':
          "export interface Entry {id:string;title:string;stage:'Draft'|'Done'}\n/** @customitinComplete */\nexport async function loadEntries():Promise<Entry[]>{return [];}",
        'Card.tsx': `${native ? "import {Text} from 'react-native';" : ''}import type {Entry} from './data'; export function Card({item}:{item:Entry}){return <${native ? 'Text' : 'p'}>{item.title}</${native ? 'Text' : 'p'}>;}`,
      },
      native ? {} : { 'react-dom': '19.2.0' },
    );
    const overrides = overridesSchema.parse({
      version: 1,
      sources: { 'data.ts#loadEntries': { enabled: true } },
      components: {
        'Card.tsx#Card': {
          enabled: true,
          collection: { source: 'data.ts#loadEntries' },
        },
      },
    });
    const result = await installProject(root, { dryRun: false, overrides });
    expect(result.issues).toEqual([]);
    expect(result.conflicts).toEqual([]);
    expect(result.files['personalize/components.tsx']).toContain(
      native ? '@customitin/react-native/collection' : '@customitin/react/dom',
    );
    compileConsumer(root);
    const before = JSON.parse(result.files['personalize/capabilities.json']!);
    expect(before.components).toHaveLength(2);
    expect((await planInstall(root)).changes).toEqual([]);
    const config = await readFile(join(root, 'personalize/config.ts'), 'utf8');
    await rename(join(root, 'Card.tsx'), join(root, 'Tile.tsx'));
    const refresh = await installProject(root, { dryRun: false });
    expect(
      JSON.parse(refresh.files['personalize/capabilities.json']!).revision,
    ).toBe(before.revision);
    compileConsumer(root);
    expect(await readFile(join(root, 'personalize/config.ts'), 'utf8')).toBe(
      config,
    );
    expect((await removeProject(root, false)).conflicts).toEqual([]);
    expect(
      JSON.parse(
        await readFile(join(root, 'personalize/overrides.json'), 'utf8'),
      ),
    ).toEqual(overrides);
  },
);
