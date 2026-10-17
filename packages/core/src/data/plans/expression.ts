import {
  invariant,
  type Scalar,
  type ValueRule,
} from '../../schema/primitives';
import type { Expression } from '../../schema/expression';
import type { Row } from '../source';

type Fields = Record<string, ValueRule>;
const rule = (type: ValueRule['type'], nullable = false): ValueRule => ({
  type,
  nullable,
  required: true,
});

/** Type-check before evaluation; formulas never access properties or invoke host code. */
export function expressionType(
  expression: Expression,
  fields: Fields,
  depth = 0,
  budget = { remaining: 100 },
): ValueRule {
  invariant(
    depth < 8 && --budget.remaining >= 0,
    'Formula exceeds its operation budget',
  );
  if ('literal' in expression) {
    const value = expression.literal;
    return {
      ...rule(
        value === null ? 'string' : (typeof value as ValueRule['type']),
        value === null,
      ),
      values: [value],
    };
  }
  if ('field' in expression) {
    const field = fields[expression.field];
    invariant(field, `Unknown formula field ${expression.field}`);
    return { ...field, nullable: field.nullable || !field.required };
  }
  const types = expression.args.map((arg) =>
    expressionType(arg, fields, depth + 1, budget),
  );
  const count = expression.args.length;
  const isNull = (index: number) => {
    const arg = expression.args[index];
    return !!arg && 'literal' in arg && arg.literal === null;
  };
  const nullable = types.some((type) => type.nullable);
  const all = (type: ValueRule['type']) =>
    types.every(
      (item, index) =>
        item.type === type ||
        ('literal' in expression.args[index]! &&
          expression.args[index]!.literal === null),
    );
  switch (expression.op) {
    case 'add':
    case 'subtract':
    case 'multiply':
    case 'divide':
      invariant(
        count === 2 && all('number'),
        'Arithmetic requires two numeric inputs',
      );
      return rule('number', nullable || expression.op === 'divide');
    case 'lt':
    case 'gt':
      invariant(
        count === 2 && (all('number') || all('string')),
        'Comparison requires matching ordered inputs',
      );
      return rule('boolean');
    case 'eq':
      invariant(
        count === 2 &&
          (types[0]!.type === types[1]!.type || isNull(0) || isNull(1)),
        'Equality requires compatible inputs',
      );
      return rule('boolean');
    case 'and':
    case 'or':
    case 'not':
      invariant(
        all('boolean') && count === (expression.op === 'not' ? 1 : 2),
        'Boolean formula has invalid inputs',
      );
      return rule('boolean', nullable);
    case 'if':
      invariant(
        count === 3 &&
          types[0]!.type === 'boolean' &&
          (types[1]!.type === types[2]!.type || isNull(1) || isNull(2)),
        'Conditional requires a boolean and matching branches',
      );
      return rule(
        isNull(1) ? types[2]!.type : types[1]!.type,
        types[1]!.nullable || types[2]!.nullable,
      );
    case 'concat':
      invariant(all('string'), 'Concatenation requires text');
      return rule('string', nullable);
    case 'coalesce': {
      const concrete = types.filter(
        (_, index) =>
          !(
            'literal' in expression.args[index]! &&
            expression.args[index]!.literal === null
          ),
      );
      invariant(
        concrete.length > 0 &&
          concrete.every((type) => type.type === concrete[0]!.type),
        'Coalesce requires compatible inputs',
      );
      return rule(
        concrete[0]!.type,
        types.every((type) => type.nullable),
      );
    }
  }
}

export function evaluateExpression(
  expression: Expression,
  row: Row,
  tick: () => void = () => {},
): Scalar {
  tick();
  if ('literal' in expression) return expression.literal;
  if ('field' in expression) return row[expression.field] ?? null;
  const value = (index: number) =>
    evaluateExpression(expression.args[index]!, row, tick);
  if (expression.op === 'if') return value(0) === true ? value(1) : value(2);
  if (expression.op === 'coalesce') {
    for (const arg of expression.args) {
      const result = evaluateExpression(arg, row, tick);
      if (result !== null) return result;
    }
    return null;
  }
  const values = expression.args.map((arg) =>
    evaluateExpression(arg, row, tick),
  );
  const a = values[0]!,
    b = values[1]!;
  if (expression.op === 'eq') return a === b;
  if (expression.op === 'lt' || expression.op === 'gt')
    return a !== null && b !== null && (expression.op === 'lt' ? a < b : a > b);
  if (values.includes(null)) return null;
  switch (expression.op) {
    case 'and':
      return a === true && b === true;
    case 'or':
      return a === true || b === true;
    case 'not':
      return a !== true;
    case 'concat': {
      const result = values.join('');
      invariant(result.length <= 500, 'Formula text exceeds its budget');
      return result;
    }
    default: {
      const left = Number(a),
        right = Number(b);
      const result =
        expression.op === 'add'
          ? left + right
          : expression.op === 'subtract'
            ? left - right
            : expression.op === 'multiply'
              ? left * right
              : right === 0
                ? null
                : left / right;
      invariant(
        result === null || Number.isFinite(result),
        'Formula produced a non-finite number',
      );
      return result;
    }
  }
}
