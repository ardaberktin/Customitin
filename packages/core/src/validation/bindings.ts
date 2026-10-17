import type { LayoutNode, Profile } from '../schema/configuration';
import type { CapabilityRegistry } from '../schema/registry';
import { invariant, type ValueRule } from '../schema/primitives';
import { validateDataPlan } from '../data/plans/validate';
import { expressionType } from '../data/plans/expression';

export function compatibleField(
  actual: ValueRule,
  expected: ValueRule,
): boolean {
  return (
    (actual.type === expected.type ||
      (actual.values?.length === 1 &&
        actual.values[0] === null &&
        expected.nullable)) &&
    (!(actual.nullable || !actual.required) ||
      expected.nullable ||
      !expected.required) &&
    (!expected.values ||
      (!!actual.values &&
        actual.values.every((value) => expected.values!.includes(value))))
  );
}

export function validateNodeBindings(
  node: LayoutNode,
  profile: Profile,
  registry: CapabilityRegistry,
  surfaceId: string,
): string[] {
  const component = registry.components.find(
    (item) => item.id === node.componentId,
  )!;
  const surface = registry.surfaces.find((item) => item.id === surfaceId)!;
  const sources = new Set<string>();
  for (const [name, input] of Object.entries(component.dataInputs ?? {}))
    invariant(
      !input.required || node.data?.[name],
      `Missing data input ${name}`,
    );
  for (const [name, binding] of Object.entries(node.data ?? {})) {
    const input = component.dataInputs?.[name];
    invariant(input, `Unknown data input ${name}`);
    const view = profile.dataViews?.find((item) => item.id === binding.viewId);
    invariant(view, 'Unknown data view');
    const validated = validateDataPlan(view.plan, registry, surfaceId);
    validated.sourceIds.forEach((id) => sources.add(id));
    invariant(
      !component.sourceIds ||
        validated.sourceIds.every((id) => component.sourceIds!.includes(id)),
      'Component does not support this data source',
    );
    for (const [field, rule] of Object.entries(input.fields)) {
      const mapping = binding.mapping[field];
      invariant(!rule.required || mapping, `Missing input mapping ${field}`);
      if (mapping)
        invariant(
          validated.fields[mapping] &&
            compatibleField(validated.fields[mapping]!, rule),
          `Incompatible input mapping ${field}`,
        );
    }
    for (const key of Object.keys(binding.mapping))
      invariant(input.fields[key], `Unknown input field ${key}`);
  }
  for (const [event, binding] of Object.entries(node.events ?? {})) {
    const fields = component.events?.[event];
    invariant(fields, `Unknown event ${event}`);
    const action = registry.actions.find(
      (item) => item.id === binding.actionId,
    );
    invariant(
      action &&
        surface.policy?.operations.includes('actions') &&
        surface.policy.actionIds.includes(action.id),
      'Action is unavailable on this surface',
    );
    for (const [name, rule] of Object.entries(action.arguments)) {
      const expression = binding.arguments[name];
      invariant(
        !rule.required || expression,
        `Missing action argument ${name}`,
      );
      if (expression)
        invariant(
          compatibleField(expressionType(expression, fields), rule),
          `Incompatible action argument ${name}`,
        );
    }
    for (const key of Object.keys(binding.arguments))
      invariant(action.arguments[key], `Unknown action argument ${key}`);
  }
  return [...sources];
}
