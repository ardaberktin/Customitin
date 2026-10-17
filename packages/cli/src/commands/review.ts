import { inspectProject } from '../discovery/scan';
import { capabilityReport } from '../discovery/report';
import {
  readIdentity,
  preserveIdentity,
  referenceId,
  type IdentityLock,
} from '../configuration/identity';
import { readOverrides } from '../configuration/overrides';

export async function reviewProject(root: string) {
  const discovery = await inspectProject(root);
  const overrides = await readOverrides(root);
  const lock = preserveIdentity(discovery, await readIdentity(root), overrides);
  return capabilityReport(discovery, overrides, lock);
}
function approve<T extends { enabled?: boolean; symbol?: string }>(
  entries: Record<string, T>,
  capability: { id: string; selector: string },
  lock: IdentityLock,
  enabled: boolean,
  fallback: T,
) {
  const keys = Object.keys(entries).filter(
    (key) =>
      referenceId(lock, key) === capability.id ||
      key === capability.selector ||
      entries[key]?.symbol === capability.selector,
  );
  let value = fallback;
  for (const key of keys) {
    value = { ...value, ...entries[key] };
    delete entries[key];
  }
  entries[capability.id] = { ...value, enabled };
}
export async function approveProject(
  root: string,
  digest: string,
  excluded: string[] = [],
) {
  const report = await reviewProject(root);
  if (report.digest !== digest)
    throw new Error(
      'The discovery report changed. Review inspect again before approving.',
    );
  const overrides = await readOverrides(root);
  const lock = await readIdentity(root);
  for (const selector of excluded)
    if (
      !report.capabilities.some(
        (item) => item.id === selector || item.selector === selector,
      )
    )
      throw new Error(`Unknown exclusion ${selector}`);
  for (const capability of report.capabilities) {
    const enabled =
      !excluded.includes(capability.id) &&
      !excluded.includes(capability.selector);
    if (!capability.suggested && enabled) continue;
    if (capability.kind === 'source')
      approve(overrides.sources, capability, lock, enabled, {});
    else
      approve(overrides.components, capability, lock, enabled, {
        defaults: {},
      });
  }
  return overrides;
}
