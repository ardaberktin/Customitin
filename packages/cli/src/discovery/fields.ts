import { idSchema, type ValueRule } from '@customitin/core';
import type { Node, Type } from 'ts-morph';

export function valueRule(type: Type, optional = false): ValueRule | undefined {
  const base = type.getNonNullableType();
  const members = base.isUnion() ? base.getUnionTypes() : [base];
  const kind = members.every((t) => t.isString() || t.isStringLiteral())
    ? 'string'
    : members.every((t) => t.isNumber() || t.isNumberLiteral())
      ? 'number'
      : members.every((t) => t.isBoolean() || t.isBooleanLiteral())
        ? 'boolean'
        : undefined;
  if (!kind || !members.length) return undefined;
  const literals = members.map((t) => t.getLiteralValue());
  const values =
    kind !== 'boolean' &&
    literals.every((v) => v !== undefined) &&
    literals.length <= 50
      ? (literals as (string | number)[])
      : undefined;
  return {
    type: kind,
    required: !optional,
    nullable: type.isNullable() || optional,
    ...(values ? { values } : {}),
  };
}
export function scalarFields(type: Type, location: Node) {
  const fields: Record<string, ValueRule> = {};
  for (const prop of type.getProperties()) {
    if (!idSchema.safeParse(prop.getName()).success) continue;
    const rule = valueRule(prop.getTypeAtLocation(location), prop.isOptional());
    if (rule) fields[prop.getName()] = rule;
  }
  return fields;
}
