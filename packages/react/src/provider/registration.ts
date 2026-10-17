import type { CapabilityRegistry } from '@customitin/core';
import type { RuntimeBindings } from './context';

export interface RegistrationDiagnostic {
  code:
    | 'COMPONENT_UNBOUND'
    | 'SOURCE_UNBOUND'
    | 'SOURCE_DESCRIPTOR_MISMATCH'
    | 'ACTION_UNBOUND';
  capabilityId: string;
}
/** Production checks compare registrations only; importing the SDK never scans application code. */
export function inspectRegistration(
  registry: CapabilityRegistry,
  bindings: RuntimeBindings,
): RegistrationDiagnostic[] {
  const diagnostics: RegistrationDiagnostic[] = [];
  for (const component of registry.components) {
    const registered =
      component.kind === 'item'
        ? bindings.items?.[component.id]
        : bindings.components?.[component.id];
    // In-place sections are rendered by the host in their original lexical scope.
    const local = registry.surfaces.some(
      (surface) =>
        surface.kind === 'screen' &&
        surface.allowedComponentIds.includes(component.id),
    );
    if (!registered && !local)
      diagnostics.push({
        code: 'COMPONENT_UNBOUND',
        capabilityId: component.id,
      });
  }
  for (const source of registry.sources) {
    const adapter = bindings.sources[source.id];
    if (!adapter)
      diagnostics.push({ code: 'SOURCE_UNBOUND', capabilityId: source.id });
    else if (JSON.stringify(adapter.descriptor) !== JSON.stringify(source))
      diagnostics.push({
        code: 'SOURCE_DESCRIPTOR_MISMATCH',
        capabilityId: source.id,
      });
  }
  for (const action of registry.actions)
    if (!bindings.actions?.[action.id])
      diagnostics.push({ code: 'ACTION_UNBOUND', capabilityId: action.id });
  return diagnostics;
}
