import { mkdir, writeFile } from 'node:fs/promises';
import { registries } from '../examples/shared/src/registry';
await mkdir('fixtures/planner', { recursive: true });
for (const [kind, registry] of Object.entries(registries))
  await writeFile(
    `fixtures/planner/${kind}-manifest.json`,
    JSON.stringify(registry, null, 2) + '\n',
  );
