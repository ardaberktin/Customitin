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
for (const pkg of ['core', 'react', 'react-native'])
  for (const file of await walk(`packages/${pkg}/src`)) {
    const source = await readFile(file, 'utf8');
    if (
      /from\s+['"](?:node:|@customitin\/(?:server|cli)|openai|ts-morph)/.test(
        source,
      )
    )
      throw new Error(`Server dependency in ${file}`);
    if (
      pkg !== 'react-native' &&
      /from\s+['"](?:react-native|@customitin\/react-native)/.test(source)
    )
      throw new Error(`Native dependency in shared package ${file}`);
    if (/from\s+['"]@customitin\/examples/.test(source))
      throw new Error(`Example dependency in SDK ${file}`);
    if (pkg === 'core' && /from\s+['"]react/.test(source))
      throw new Error(`React dependency in core ${file}`);
    if (/\b(?:movieId|recipeId|dueAt|watchlist|ingredients)\b/.test(source))
      throw new Error(`Domain dependency in ${file}`);
  }
console.log('Headless platform boundaries and domain independence passed.');
