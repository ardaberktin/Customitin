import { inspectProject } from '../discovery/scan';
import {
  preserveIdentity,
  readIdentity,
  referenceId,
} from '../configuration/identity';
import {
  readOverrides,
  type IntegrationOverrides,
} from '../configuration/overrides';
export interface SelectionFlags {
  complete?: string[];
  component?: string[];
  route?: string[];
  detail?: string[];
  'query-client'?: string;
  'navigation-ref'?: string;
}
export async function selectedOverrides(
  root: string,
  flags: SelectionFlags,
): Promise<IntegrationOverrides | undefined> {
  if (
    !flags.complete?.length &&
    !flags.component?.length &&
    !flags.route?.length &&
    !flags.detail?.length &&
    !flags['query-client'] &&
    !flags['navigation-ref']
  )
    return;
  const overrides = await readOverrides(root);
  const lock = preserveIdentity(
    await inspectProject(root),
    await readIdentity(root),
    overrides,
  );
  const keyFor = (entries: Record<string, unknown>, selector: string) => {
    const id = referenceId(lock, selector);
    if (!lock.bindings.some((binding) => binding.id === id))
      throw new Error(
        `Unknown selector: ${selector}. Run inspect for available selectors.`,
      );
    return (
      Object.keys(entries).find((key) => referenceId(lock, key) === id) ??
      selector
    );
  };
  for (const selector of flags.complete ?? []) {
    const key = keyFor(overrides.sources, selector);
    overrides.sources[key] = {
      ...overrides.sources[key],
      enabled: true,
      completeness: 'complete',
    };
  }
  for (const selector of flags.component ?? []) {
    const key = keyFor(overrides.components, selector);
    overrides.components[key] = {
      defaults: {},
      ...overrides.components[key],
      enabled: true,
    };
  }
  for (const selector of flags.route ?? []) {
    const key = keyFor(overrides.routes, selector);
    overrides.routes[key] = {
      ...overrides.routes[key],
      enabled: true,
    };
  }
  for (const detail of flags.detail ?? []) {
    const parts = detail.split('=');
    const [source, route] = parts;
    if (parts.length !== 2 || !source || !route)
      throw new Error(
        '--detail requires SOURCE=ROUTE using selectors from inspect.',
      );
    const sourceKey = keyFor(overrides.sources, source);
    const routeKey = keyFor(overrides.routes, route);
    overrides.sources[sourceKey] = {
      ...overrides.sources[sourceKey],
      detailDestination: route,
    };
    overrides.routes[routeKey] = {
      ...overrides.routes[routeKey],
      enabled: true,
    };
  }
  if (flags['query-client']) {
    keyFor({}, flags['query-client']);
    overrides.queryClient = flags['query-client'];
  }
  if (flags['navigation-ref']) {
    keyFor({}, flags['navigation-ref']);
    overrides.navigationRef = flags['navigation-ref'];
  }
  return overrides;
}
