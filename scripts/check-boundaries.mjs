import { readdir, readFile } from 'node:fs/promises';
async function walk(dir) {
  return (
    await Promise.all(
      (await readdir(dir, { withFileTypes: true })).map((e) =>
        e.isDirectory() ? walk(`${dir}/${e.name}`) : [`${dir}/${e.name}`],
      ),
    )
  ).flat();
}
for (const pkg of ['core', 'react-native'])
  for (const file of await walk(`packages/${pkg}/src`)) {
    const source = await readFile(file, 'utf8');
    if (
      /from\s+['"](?:node:|@customitin\/(?:server|cli)|openai|ts-morph)/.test(
        source,
      )
    )
      throw new Error(`Server dependency in ${file}`);
    if (/\b(?:movieId|recipeId|dueAt|watchlist|ingredients)\b/.test(source))
      throw new Error(`Domain dependency in ${file}`);
  }
console.log('Mobile boundaries and domain independence passed.');
