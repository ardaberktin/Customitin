import { z } from 'zod';
import { readOptional, safePath } from '../commands/files';

import { scriptNameSchema, type DevScript } from './schema';
const packageSchema = z
  .object({ scripts: z.record(z.string(), z.string()).optional() })
  .passthrough();
export const wrapperCommand = (name: string) =>
  `customitin dev --script ${name} --`;
export const hostScriptName = (name: string) => `customitin:host:${name}`;

export async function readPackage(root: string) {
  const text = await readOptional(await safePath(root, 'package.json'));
  if (text === null) throw new Error('Missing package.json');
  return { text, value: packageSchema.parse(JSON.parse(text)) };
}

function recognized(name: string, command: string): boolean {
  return (
    ['start', 'dev', 'web', 'ios', 'android'].includes(name) &&
    /^(?:(?:npx(?: --no-install)?|pnpm exec|yarn exec)\s+)?(?:(?:expo|react-native|rnc-cli)\s+start|vite)(?:\s|$)/.test(
      command.trim(),
    )
  );
}

function lifecycleHook(name: string, scripts: Record<string, string>): boolean {
  const target = /^(?:pre|post)(.+)$/.exec(name)?.[1];
  return (
    [
      'prepare',
      'prepublish',
      'prepublishOnly',
      'prepack',
      'postpack',
      'preinstall',
      'install',
      'postinstall',
    ].includes(name) ||
    (target !== undefined && Object.hasOwn(scripts, target))
  );
}

/** Own individual script entries, never the whole package manifest. */
export async function planDevScripts(
  root: string,
  previous: DevScript[] = [],
  selection?: false | string[],
) {
  const { text, value } = await readPackage(root);
  const scripts = { ...value.scripts };
  const conflicts: string[] = [];
  const bindings: DevScript[] = [];
  for (const binding of previous) {
    if (
      scripts[binding.name] !== wrapperCommand(binding.name) ||
      !scripts[binding.host]
    ) {
      conflicts.push(
        `package.json scripts.${binding.name}: generated wrapper or ${binding.host} is missing/changed.`,
      );
    } else {
      scripts[binding.name] = scripts[binding.host]!;
      delete scripts[binding.host];
    }
  }
  const names =
    selection === false
      ? []
      : (selection ?? [
          ...previous.map((binding) => binding.name),
          ...Object.entries(scripts)
            .filter(([name, command]) => recognized(name, command))
            .map(([name]) => name),
        ]);
  for (const name of new Set(names)) {
    scriptNameSchema.parse(name);
    const command = scripts[name];
    const host = hostScriptName(name);
    if (
      !command ||
      name.startsWith('customitin:') ||
      lifecycleHook(name, scripts) ||
      /\bcustomitin\s+(?:dev|watch)\b/.test(command)
    ) {
      conflicts.push(
        `package.json scripts.${name}: select an existing app development script, not a lifecycle hook or Customitin command.`,
      );
      continue;
    }
    if (
      Object.hasOwn(scripts, host) ||
      Object.hasOwn(scripts, `pre${host}`) ||
      Object.hasOwn(scripts, `post${host}`)
    ) {
      conflicts.push(
        `package.json scripts.${host}: reserved helper script already exists; nothing was overwritten.`,
      );
      continue;
    }
    scripts[name] = wrapperCommand(name);
    scripts[host] = command;
    bindings.push({ name, host });
  }
  const changed =
    JSON.stringify(value.scripts ?? {}) !== JSON.stringify(scripts);
  const indent = text.match(/\n([\t ]+)"/)?.[1] ?? '  ';
  const content = changed
    ? JSON.stringify({ ...value, scripts }, null, indent) + '\n'
    : text;
  return { content, changed, conflicts, bindings };
}
