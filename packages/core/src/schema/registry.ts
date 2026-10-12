import { z } from 'zod';
import { evidenceSchema, idSchema, ruleSchema } from './primitives';
import { nodeSchema, placementSchema } from './configuration';

const capability = {
  id: idSchema,
  title: z.string().min(1).max(120),
  provenance: evidenceSchema,
};
export const sourceDescriptorSchema = z
  .object({
    ...capability,
    completeness: z.enum(['complete', 'paginated', 'partial']),
    fields: z.record(
      idSchema,
      ruleSchema.extend({
        filterOps: z
          .array(
            z.enum(['eq', 'neq', 'lt', 'lte', 'gt', 'gte', 'contains', 'in']),
          )
          .max(8),
        sortable: z.boolean(),
        groupable: z.boolean(),
      }),
    ),
    idField: idSchema,
    titleField: idSchema,
    subtitleField: idSchema.optional(),
    maxRows: z.number().int().min(1).max(10000),
    pageSize: z.number().int().min(1).max(100),
    supportsCount: z.boolean(),
    supportsGrouping: z.boolean(),
    detailDestinationId: idSchema.optional(),
    detailParam: idSchema.optional(),
  })
  .strict();
export type SourceDescriptor = z.infer<typeof sourceDescriptorSchema>;
export const registrySchema = z
  .object({
    appId: idSchema,
    revision: idSchema,
    components: z
      .array(
        z
          .object({
            ...capability,
            kind: z.enum([
              'stack',
              'text',
              'collection',
              'summary',
              'shortcut',
              'host',
              'item',
            ]),
            props: z.record(idSchema, ruleSchema),
            acceptsChildren: z.boolean(),
          })
          .strict(),
      )
      .max(100),
    surfaces: z
      .array(
        z
          .object({
            ...capability,
            defaultLayout: z.array(nodeSchema).max(40),
            requiredNodeIds: z.array(idSchema).max(10),
            allowedComponentIds: z.array(idSchema).max(100),
          })
          .strict(),
      )
      .max(20),
    sources: z.array(sourceDescriptorSchema).max(30),
    destinations: z
      .array(
        z
          .object({
            ...capability,
            params: z.record(idSchema, ruleSchema),
            placements: z.array(z.enum(['tab', 'overflow', 'shortcut'])),
            protected: z.boolean(),
          })
          .strict(),
      )
      .max(30),
    themeTokens: z.record(
      idSchema,
      ruleSchema.extend({
        default: z.union([z.string(), z.number(), z.boolean()]),
        consumers: z.array(z.string()).min(1),
      }),
    ),
    defaultNavigation: z.array(placementSchema).max(28),
    limits: z
      .object({
        depth: z.number().int().min(1).max(8),
        nodes: z.number().int().min(1).max(100),
        tabs: z.number().int().min(1).max(6),
        sources: z.number().int().min(1).max(8),
      })
      .strict(),
  })
  .strict();
export type CapabilityRegistry = z.infer<typeof registrySchema>;
