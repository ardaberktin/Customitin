import { z } from 'zod';
import { idSchema, ruleSchema } from './primitives';

export const actionDescriptorSchema = z
  .object({
    id: idSchema,
    title: z.string().min(1).max(120),
    description: z.string().max(500).optional(),
    arguments: z.record(idSchema, ruleSchema),
    result: z.record(idSchema, ruleSchema),
    effect: z.enum(['read', 'write']),
    confirmation: z.enum(['required', 'host-managed']).default('required'),
    invalidates: z.array(idSchema).max(30).default([]),
  })
  .strict();
export type ActionDescriptor = z.infer<typeof actionDescriptorSchema>;
export const surfacePolicySchema = z
  .object({
    sourceFields: z.record(idSchema, z.array(idSchema).max(100)).default({}),
    actionIds: z.array(idSchema).max(100).default([]),
    destinationIds: z.array(idSchema).max(100).default([]),
    themeTokenIds: z.array(idSchema).max(100).default([]),
    editableProps: z.array(idSchema).max(100).default([]),
    operations: z
      .array(
        z.enum([
          'layout',
          'data',
          'properties',
          'theme',
          'navigation',
          'actions',
        ]),
      )
      .default([]),
    maxNodes: z.number().int().min(1).max(100).default(40),
  })
  .strict();
