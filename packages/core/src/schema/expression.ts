import { z } from 'zod';
import { idSchema, scalarSchema, type Scalar } from './primitives';

export type Expression =
  | { literal: Scalar }
  | { field: string }
  | {
      op:
        | 'add'
        | 'subtract'
        | 'multiply'
        | 'divide'
        | 'eq'
        | 'lt'
        | 'gt'
        | 'and'
        | 'or'
        | 'not'
        | 'if'
        | 'concat'
        | 'coalesce';
      args: Expression[];
    };

export const expressionSchema: z.ZodType<Expression> = z.lazy(() =>
  z.union([
    z.object({ literal: scalarSchema }).strict(),
    z.object({ field: idSchema }).strict(),
    z
      .object({
        op: z.enum([
          'add',
          'subtract',
          'multiply',
          'divide',
          'eq',
          'lt',
          'gt',
          'and',
          'or',
          'not',
          'if',
          'concat',
          'coalesce',
        ]),
        args: z.array(expressionSchema).min(1).max(8),
      })
      .strict(),
  ]),
);
