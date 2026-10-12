import { z } from 'zod';

export const idSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/)
  .refine((id) => !['__proto__', 'constructor', 'prototype'].includes(id));
export const scalarSchema = z.union([
  z.string().max(500),
  z.number().finite(),
  z.boolean(),
  z.null(),
]);
export type Scalar = z.infer<typeof scalarSchema>;
export const valuesSchema = z.record(idSchema, scalarSchema);
export const ruleSchema = z
  .object({
    type: z.enum(['string', 'number', 'boolean']),
    required: z.boolean().default(false),
    nullable: z.boolean().default(false),
    values: z.array(scalarSchema).max(50).optional(),
    min: z.number().optional(),
    max: z.number().optional(),
  })
  .strict();
export type ValueRule = z.infer<typeof ruleSchema>;
export const evidenceSchema = z
  .object({
    version: z.number().int().positive(),
    evidence: z.string().min(1).max(300),
    status: z.enum([
      'discovered',
      'proposed',
      'developer-reviewed',
      'verified',
    ]),
    check: z.string().max(150).optional(),
  })
  .strict()
  .refine(
    (v) => v.status !== 'verified' || !!v.check,
    'Verified capabilities require a named check',
  );

export class ConfigurationError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ConfigurationError';
  }
}
export function invariant(
  condition: unknown,
  message: string,
  code = 'INVALID_CONFIGURATION',
): asserts condition {
  if (!condition) throw new ConfigurationError(code, message);
}
export function boundedJson(value: unknown, maxBytes = 64_000): void {
  invariant(
    JSON.stringify(value).length <= maxBytes / 3,
    'Configuration is too large',
    'SIZE_LIMIT',
  );
}

/** React Native's AbortSignal does not implement the browser throwIfAborted method. */
export function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) throw new Error('Request cancelled');
}
