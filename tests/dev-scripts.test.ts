import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import {
  doctorProject,
  installProject,
  planInstall,
  removeProject,
} from '@customitin/cli';
import { selectedOverrides } from '../packages/cli/src/commands/options';
import { consumer, compileConsumer } from './helpers/consumer';

async function fixture(scripts: Record<string, string>) {
  const root = await consumer({});
  const path = join(root, 'package.json');
  const value = JSON.parse(await readFile(path, 'utf8'));
  await writeFile(path, JSON.stringify({ ...value, scripts }, null, 2) + '\n');
  return root;
}
async function manifest(root: string) {
  return JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
}

it('automatically wires Expo/Metro start scripts, previews without writes and refreshes idempotently', async () => {
  const root = await fixture({
    start: 'expo start',
    web: 'expo start --web',
    android: 'react-native run-android',
    lint: 'eslint .',
    prestart: 'node prepare.js',
  });
  const before = await readFile(join(root, 'package.json'), 'utf8');
  const dry = await planInstall(root);
  expect(dry.changes).toContain('package.json');
  expect(await readFile(join(root, 'package.json'), 'utf8')).toBe(before);
  const installed = await installProject(root, { dryRun: false });
  expect(installed.issues).toEqual([]);
  expect(installed.conflicts).toEqual([]);
  expect((await manifest(root)).scripts).toEqual({
    start: 'customitin dev --script start --',
    web: 'customitin dev --script web --',
    'customitin:host:start': 'expo start',
    'customitin:host:web': 'expo start --web',
    android: 'react-native run-android',
    lint: 'eslint .',
    prestart: 'node prepare.js',
  });
  expect((await planInstall(root)).changes).toEqual([]);
  compileConsumer(root);
});

it('preserves edited original commands and unrelated package fields on refresh and removal', async () => {
  const root = await fixture({ dev: 'react-native start' });
  await installProject(root, { dryRun: false });
  const pkg = await manifest(root);
  pkg.scripts['customitin:host:dev'] = 'react-native start --reset-cache';
  pkg.scripts.test = 'host-test';
  pkg.description = 'Host-owned metadata';
  await writeFile(join(root, 'package.json'), JSON.stringify(pkg, null, 2));
  expect((await installProject(root, { dryRun: false })).conflicts).toEqual([]);
  expect((await removeProject(root, false)).conflicts).toEqual([]);
  expect((await manifest(root)).scripts).toEqual({
    dev: 'react-native start --reset-cache',
    test: 'host-test',
  });
  expect((await manifest(root)).description).toBe('Host-owned metadata');
});

it('persists custom selections and restores scripts when automatic watching is disabled', async () => {
  const root = await fixture({
    preview: 'node custom-dev.js',
    build: 'node build.js',
  });
  expect((await planInstall(root)).changes).not.toContain('package.json');
  await installProject(root, {
    dryRun: false,
    overrides: await selectedOverrides(root, { 'dev-script': ['preview'] }),
  });
  expect((await manifest(root)).scripts.preview).toBe(
    'customitin dev --script preview --',
  );
  expect((await planInstall(root)).changes).toEqual([]);
  const disabled = await installProject(root, {
    dryRun: false,
    overrides: await selectedOverrides(root, { 'no-dev-watch': true }),
  });
  expect(disabled.conflicts).toEqual([]);
  expect((await manifest(root)).scripts).toEqual({
    preview: 'node custom-dev.js',
    build: 'node build.js',
  });
  expect((await planInstall(root)).changes).toEqual([]);
});

it('refuses conflicting helpers and edited wrappers without touching the integration', async () => {
  const root = await fixture({
    start: 'expo start',
    'customitin:host:start': 'my-command',
  });
  const initial = await readFile(join(root, 'package.json'), 'utf8');
  expect(
    (await installProject(root, { dryRun: false })).conflicts.join(' '),
  ).toContain('reserved helper');
  expect(await readFile(join(root, 'package.json'), 'utf8')).toBe(initial);
  const other = await fixture({ start: 'expo start' });
  await installProject(other, { dryRun: false });
  const pkg = await manifest(other);
  pkg.scripts.start += ' --changed';
  await writeFile(join(other, 'package.json'), JSON.stringify(pkg));
  expect(
    (await installProject(other, { dryRun: false })).conflicts.length,
  ).toBeGreaterThan(0);
  expect((await doctorProject(other)).issues.join(' ')).toContain('wrapper');
  expect((await removeProject(other, false)).conflicts.length).toBeGreaterThan(
    0,
  );
  expect((await manifest(other)).scripts.start).toBe(pkg.scripts.start);
});
