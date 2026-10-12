import { invariant, type Scalar, type ValueRule } from '../schema/primitives';

export function validateValue(
  value: Scalar,
  rule: ValueRule,
  label: string,
  configuration = true,
): void {
  if (value === null) {
    invariant(rule.nullable, `${label} cannot be empty`);
    return;
  }
  invariant(typeof value === rule.type, `${label} has an invalid type`);
  if (rule.values)
    invariant(rule.values.includes(value), `${label} is not an approved value`);
  if (typeof value === 'number') {
    invariant(
      rule.min === undefined || value >= rule.min,
      `${label} is below its minimum`,
    );
    invariant(
      rule.max === undefined || value <= rule.max,
      `${label} exceeds its maximum`,
    );
  }
  if (configuration && typeof value === 'string')
    invariant(
      !/https?:\/\/|javascript:|<script|sk-[a-zA-Z0-9]{12}/i.test(value),
      `${label} contains disallowed content`,
    );
}
export function validateValues(
  values: Record<string, Scalar>,
  rules: Record<string, ValueRule>,
  label: string,
  requireAll = true,
  configuration = true,
): void {
  for (const [key, value] of Object.entries(values)) {
    const rule = rules[key];
    invariant(rule, `${label}: unknown property ${key}`);
    validateValue(value, rule, key, configuration);
  }
  if (requireAll)
    for (const [key, rule] of Object.entries(rules))
      invariant(!rule.required || key in values, `${label}: missing ${key}`);
}
