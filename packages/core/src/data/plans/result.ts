import type { Row } from '../source';
import { invariant, type ValueRule } from '../../schema/primitives';
import { validateValues } from '../../validation/values';

export interface DataResult {
  rows: Row[];
  keys: string[];
  complete: boolean;
  nextCursor: string | null;
}
export function validateDataResult(
  result: DataResult,
  fields: Record<string, ValueRule>,
  maxRows = 10000,
  cursor?: string,
): DataResult {
  invariant(
    Array.isArray(result.rows) &&
      Array.isArray(result.keys) &&
      result.rows.length <= maxRows &&
      result.keys.length === result.rows.length &&
      new Set(result.keys).size === result.keys.length,
    'Invalid data result identities or size',
  );
  invariant(
    result.keys.every(
      (key) => typeof key === 'string' && key.length > 0 && key.length <= 2000,
    ),
    'Invalid data result identity',
  );
  invariant(
    typeof result.complete === 'boolean' &&
      (result.nextCursor === null ||
        (typeof result.nextCursor === 'string' &&
          result.nextCursor.length > 0 &&
          result.nextCursor.length <= 500)) &&
      (!result.complete || result.nextCursor === null),
    'Invalid data completeness',
  );
  if (cursor)
    invariant(
      result.nextCursor !== cursor,
      'Remote adapter repeated its cursor',
    );
  for (const row of result.rows)
    validateValues(row, fields, 'Data result', true, false);
  return result;
}
