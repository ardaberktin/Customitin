import { z } from 'zod';
import { idSchema } from '@customitin/core';
import type { DiscoveryReport } from '../discovery/types';
import type { IntegrationOverrides } from './overrides';
import { readOptional, safePath } from '../commands/files';

export const identityPath = 'personalize/bindings.lock.json';
const bindingSchema = z
  .object({
    id: idSchema,
    selector: z.string(),
    name: z.string(),
    kind: z.string(),
    aliases: z.array(z.string()).default([]),
  })
  .strict();
export const identitySchema = z
  .object({
    version: z.literal(1),
    bindings: z.array(bindingSchema).max(1000),
    selectedSources: z.array(z.string()).optional(),
  })
  .strict();
export type IdentityLock = z.infer<typeof identitySchema>;
export function referenceId(lock: IdentityLock, reference: string): string {
  return (
    lock.bindings.find((b) =>
      [b.id, b.selector, ...b.aliases].includes(reference),
    )?.id ?? reference
  );
}
export async function readIdentity(root: string): Promise<IdentityLock> {
  const raw = await readOptional(await safePath(root, identityPath));
  return raw
    ? identitySchema.parse(JSON.parse(raw))
    : { version: 1, bindings: [] };
}
export function preserveIdentity(
  report: DiscoveryReport,
  previous: IdentityLock,
  overrides: IntegrationOverrides,
): IdentityLock {
  const current = [
    ...report.symbols.map((s) => ({ value: s, kind: s.kind, name: s.name })),
    ...report.routeDetails.map((r) => ({
      value: r,
      kind: 'route',
      name: r.path,
    })),
  ];
  const bindings = previous.bindings.map((b) => ({
    ...b,
    aliases: [...b.aliases],
  }));
  const used = new Set<string>();
  for (const { value, kind, name } of current) {
    const explicit = Object.entries({
      ...overrides.sources,
      ...overrides.components,
      ...overrides.routes,
    }).find(([, o]) => o.symbol === value.selector)?.[0];
    let match = bindings.find(
      (b) =>
        b.kind === kind &&
        (b.selector === value.selector ||
          b.aliases.includes(value.selector) ||
          b.id === explicit ||
          b.selector === explicit ||
          b.aliases.includes(explicit ?? '')),
    );
    if (!match) {
      const candidates = bindings.filter(
        (b) =>
          b.kind === kind &&
          b.name === name &&
          !current.some((c) => c.value.selector === b.selector),
      );
      if (
        candidates.length === 1 &&
        current.filter((c) => c.kind === kind && c.name === name).length === 1
      )
        match = candidates[0];
    }
    if (match) {
      if (used.has(match.id))
        throw new Error(`Ambiguous stable binding: ${value.selector}`);
      value.id = match.id;
      if (match.selector !== value.selector) match.aliases.push(match.selector);
      match.selector = value.selector;
      match.name = name;
    } else
      bindings.push({
        id: value.id,
        selector: value.selector,
        name,
        kind,
        aliases: [],
      });
    used.add(value.id);
  }
  return { ...previous, bindings };
}
export function lookupOverride<T extends { symbol?: string }>(
  entries: Record<string, T>,
  value: { id: string; selector: string },
  lock: IdentityLock,
): T | undefined {
  const identity = lock.bindings.find((b) => b.id === value.id);
  return (
    entries[value.id] ??
    entries[value.selector] ??
    Object.entries(entries).find(
      ([key, o]) =>
        o.symbol === value.selector || identity?.aliases.includes(key),
    )?.[1]
  );
}
