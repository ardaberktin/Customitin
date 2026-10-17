import { z } from 'zod';
import { idSchema, scalarSchema, ruleSchema } from './primitives';
import { expressionSchema } from './expression';

export const dataPlanSchema = z
  .object({
    sourceId: idSchema,
    joins: z
      .array(
        z
          .object({
            relationId: idSchema,
            kind: z.enum(['inner', 'left']),
            alias: idSchema,
          })
          .strict(),
      )
      .max(4)
      .default([]),
    computed: z.record(idSchema, expressionSchema).default({}),
    filter: expressionSchema.optional(),
    groupBy: z.array(idSchema).max(8).default([]),
    aggregates: z
      .record(
        idSchema,
        z
          .object({
            op: z.enum(['count', 'sum', 'average', 'min', 'max']),
            field: idSchema.optional(),
          })
          .strict(),
      )
      .default({}),
    sort: z
      .array(
        z
          .object({ field: idSchema, direction: z.enum(['asc', 'desc']) })
          .strict(),
      )
      .max(3)
      .default([]),
    project: z.array(idSchema).min(1).max(50),
    execution: z.enum(['local', 'remote']).default('local'),
  })
  .strict();
export type DataPlan = z.infer<typeof dataPlanSchema>;
export const dataViewSchema = z
  .object({
    id: idSchema,
    title: z.string().min(1).max(80),
    plan: dataPlanSchema,
  })
  .strict();
export type DataView = z.infer<typeof dataViewSchema>;
export const relationSchema = z
  .object({
    id: idSchema,
    leftSourceId: idSchema,
    rightSourceId: idSchema,
    leftField: idSchema,
    rightField: idSchema,
    cardinality: z.enum(['one-to-one', 'many-to-one', 'one-to-many']),
  })
  .strict();
export type RelationDescriptor = z.infer<typeof relationSchema>;
export const dataInputSchema = z
  .object({
    fields: z.record(idSchema, ruleSchema),
    cardinality: z.enum(['one', 'many']).default('many'),
    required: z.boolean().default(true),
  })
  .strict();
export const dataBindingSchema = z
  .object({
    viewId: idSchema,
    mapping: z.record(idSchema, idSchema),
  })
  .strict();
export const eventBindingSchema = z
  .object({
    actionId: idSchema,
    arguments: z.record(idSchema, expressionSchema),
  })
  .strict();
export const actionProposalSchema = z
  .object({
    requestId: idSchema,
    registryRevision: idSchema,
    baseRevision: z.number().int().nonnegative(),
    surfaceId: idSchema,
    actionId: idSchema,
    arguments: z.record(idSchema, scalarSchema),
    summary: z.string().min(1).max(500),
  })
  .strict();
export type ActionProposal = z.infer<typeof actionProposalSchema>;
