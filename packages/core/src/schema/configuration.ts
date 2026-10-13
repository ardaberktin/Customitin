import { z } from 'zod';
import { idSchema, scalarSchema, valuesSchema } from './primitives';

export const querySchema = z
  .object({
    filters: z
      .array(
        z
          .object({
            field: idSchema,
            op: z.enum([
              'eq',
              'neq',
              'lt',
              'lte',
              'gt',
              'gte',
              'contains',
              'in',
            ]),
            value: z.union([scalarSchema, z.array(scalarSchema).max(20)]),
          })
          .strict(),
      )
      .max(12),
    sort: z
      .array(
        z
          .object({ field: idSchema, direction: z.enum(['asc', 'desc']) })
          .strict(),
      )
      .max(3),
    groupBy: idSchema.optional(),
  })
  .strict();
export type ValidatedQuery = z.infer<typeof querySchema>;
export const viewSchema = z
  .object({
    id: idSchema,
    title: z.string().min(1).max(80),
    sourceId: idSchema,
    query: querySchema,
    presentation: z
      .object({
        mode: z.enum(['list', 'grid']),
        itemRendererId: idSchema,
        density: z.enum(['comfortable', 'compact']),
      })
      .strict(),
  })
  .strict();
export type SavedView = z.infer<typeof viewSchema>;
export type LayoutNode = {
  id: string;
  componentId: string;
  props: Record<string, z.infer<typeof scalarSchema>>;
  children: LayoutNode[];
  viewId?: string;
  destinationId?: string;
  params?: Record<string, z.infer<typeof scalarSchema>>;
};
export const nodeSchema: z.ZodType<LayoutNode> = z.lazy(() =>
  z
    .object({
      id: idSchema,
      componentId: idSchema,
      props: valuesSchema,
      children: z.array(nodeSchema).max(40),
      viewId: idSchema.optional(),
      destinationId: idSchema.optional(),
      params: valuesSchema.optional(),
    })
    .strict(),
);
export const placementSchema = z
  .object({
    target: z.enum(['destination', 'view']),
    id: idSchema,
    label: z.string().min(1).max(40),
    placement: z.enum(['tab', 'overflow']),
    params: valuesSchema.optional(),
  })
  .strict();
export type Placement = z.infer<typeof placementSchema>;
export const configurationSchema = z
  .object({
    theme: valuesSchema,
    surfaces: z.record(idSchema, z.array(nodeSchema).max(40)),
    views: z.array(viewSchema).max(24),
    navigation: z.array(placementSchema).max(28),
  })
  .strict();
export const profileSchema = configurationSchema
  .extend({
    schemaVersion: z.literal(1),
    registryRevision: idSchema,
    scope: z.string().min(1).max(200),
    revision: z.number().int().nonnegative(),
    name: z.string().min(1).max(80),
  })
  .strict();
export type Configuration = z.infer<typeof configurationSchema>;
export type Profile = z.infer<typeof profileSchema>;

export const operationSchema = z.discriminatedUnion('op', [
  z.object({ op: z.literal('setThemeTokens'), tokens: valuesSchema }).strict(),
  z
    .object({
      op: z.literal('setSurfaceLayout'),
      surfaceId: idSchema,
      nodes: z.array(nodeSchema).max(40),
    })
    .strict(),
  z.object({ op: z.literal('createView'), view: viewSchema }).strict(),
  z.object({ op: z.literal('updateView'), view: viewSchema }).strict(),
  z.object({ op: z.literal('removeView'), viewId: idSchema }).strict(),
  z
    .object({
      op: z.literal('setNavigationPlacements'),
      placements: z.array(placementSchema).max(28),
    })
    .strict(),
]);
export type Operation = z.infer<typeof operationSchema>;
export const proposalSchema = z
  .object({
    requestId: idSchema,
    baseRevision: z.number().int().nonnegative(),
    registryRevision: idSchema,
    summary: z.string().min(1).max(500),
    operations: z.array(operationSchema).min(1).max(24),
  })
  .strict();
export type Proposal = z.infer<typeof proposalSchema>;
export const plannerRequestSchema = z
  .object({
    appId: idSchema,
    requestId: idSchema,
    registryRevision: idSchema,
    baseRevision: z.number().int().nonnegative(),
    instruction: z.string().trim().min(1).max(2000),
    surfaceId: idSchema.optional(),
    configuration: configurationSchema,
  })
  .strict();
export type PlannerRequest = z.infer<typeof plannerRequestSchema>;
export const plannerResponseSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('proposal'), proposal: proposalSchema }).strict(),
  z
    .object({ kind: z.literal('clarification'), message: z.string().max(500) })
    .strict(),
  z
    .object({ kind: z.literal('unsupported'), message: z.string().max(500) })
    .strict(),
  z
    .object({
      kind: z.literal('retryable-error'),
      message: z.string().max(500),
    })
    .strict(),
  z
    .object({ kind: z.literal('rejected'), message: z.string().max(500) })
    .strict(),
]);
export type PlannerResponse = z.infer<typeof plannerResponseSchema>;
