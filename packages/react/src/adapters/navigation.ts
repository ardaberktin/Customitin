import {
  validateDestination,
  type CapabilityRegistry,
  type Placement,
  type Profile,
  type Scalar,
} from '@customitin/core';
export function personalSlots(
  profile: Profile,
  registry: CapabilityRegistry,
): Placement[] {
  return profile.navigation
    .filter((p) => p.placement === 'tab')
    .slice(0, registry.limits.tabs);
}
export function resolvePersonalSlot(
  profile: Profile,
  slot: number,
  registry: CapabilityRegistry,
): Placement | undefined {
  return personalSlots(profile, registry)[slot];
}
export function createNavigationAdapter(
  registry: CapabilityRegistry,
  routes: Record<string, (params: Record<string, Scalar>) => void>,
) {
  return (id: string, params: Record<string, Scalar> = {}) => {
    validateDestination(id, params, registry, 'shortcut');
    const route = routes[id];
    if (!route) throw new Error('Destination is not connected');
    route(params);
  };
}
