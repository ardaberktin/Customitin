import { readFile, realpath } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
const topics = [
  'index',
  'integration',
  'contracts',
  'maintenance',
  'troubleshooting',
  'testing',
  'cli-reference',
];
export async function readGuide(topic = 'index'): Promise<string> {
  if (!topics.includes(topic))
    throw new Error(`Unknown guide topic. Choose ${topics.join(', ')}.`);
  const entry = dirname(await realpath(resolve(process.argv[1] ?? '.')));
  for (const directory of [
    resolve(entry, 'docs'),
    resolve(entry, '../../../docs/ai'),
  ]) {
    try {
      return await readFile(resolve(directory, `${topic}.md`), 'utf8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }
  throw new Error(
    'Guide files are missing. Rebuild the CLI or read docs/ai in the repository.',
  );
}
