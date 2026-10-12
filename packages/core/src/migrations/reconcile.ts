import { profileSchema, type Profile } from '../schema/configuration';
import type { CapabilityRegistry } from '../schema/registry';
import {
  createProfile,
  validateLayout,
  validateProfile,
  validateDestination,
} from '../validation/profile';
import { validateView } from '../validation/query';
import { validateValues } from '../validation/values';

/** Never edits a query to make it less restrictive. An obsolete view is disabled in full. */
export function reconcileProfile(
  input: unknown,
  registry: CapabilityRegistry,
  scope: string,
): { profile: Profile; warnings: string[] } {
  const original = profileSchema.parse(input);
  if (original.scope !== scope) throw new Error('Profile scope mismatch');
  if (original.registryRevision === registry.revision)
    return { profile: validateProfile(original, registry), warnings: [] };
  const profile = createProfile(registry, scope);
  const warnings: string[] = [];
  profile.revision = original.revision + 1;
  profile.name = original.name;
  for (const [key, value] of Object.entries(original.theme)) {
    try {
      validateValues(
        { [key]: value },
        registry.themeTokens,
        'Appearance',
        false,
      );
      profile.theme[key] = value;
    } catch {
      warnings.push('An appearance setting is no longer available.');
    }
  }
  for (const view of original.views) {
    try {
      validateView(view, registry);
      profile.views.push(view);
    } catch {
      warnings.push(
        `“${view.title}” is unavailable after this app update. Your original screen is available.`,
      );
    }
  }
  for (const [id, nodes] of Object.entries(original.surfaces)) {
    try {
      validateLayout(nodes, id, profile, registry);
      profile.surfaces[id] = nodes;
    } catch {
      warnings.push('A layout was restored to its original sections.');
    }
  }
  for (const item of original.navigation) {
    if (
      profile.navigation.some(
        (p) => p.id === item.id && p.target === item.target,
      )
    )
      continue;
    try {
      if (item.target === 'destination')
        validateDestination(item.id, item.params, registry, 'overflow');
      else if (!profile.views.some((v) => v.id === item.id)) continue;
      profile.navigation.push({ ...item, placement: 'overflow' });
    } catch {
      warnings.push('A destination is no longer available.');
    }
  }
  return { profile: validateProfile(profile, registry), warnings };
}
