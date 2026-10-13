import { z } from 'zod';
import { idSchema, scalarSchema } from '@customitin/core';
import { readOptional, safePath } from '../commands/files';

const operators = z.enum([
  'eq',
  'neq',
  'lt',
  'lte',
  'gt',
  'gte',
  'contains',
  'in',
]);
const selection = {
  enabled: z.boolean().optional(),
  symbol: z.string().optional(),
  title: z.string().min(1).max(120).optional(),
};
export const overridesSchema = z
  .object({
    version: z.literal(1),
    sources: z
      .record(
        z.string(),
        z
          .object({
            ...selection,
            completeness: z.enum(['complete', 'paginated']).optional(),
            fields: z.array(idSchema).min(1).optional(),
            idField: idSchema.optional(),
            titleField: idSchema.optional(),
            subtitleField: idSchema.optional(),
            maxRows: z.number().int().min(1).max(10000).optional(),
            pageSize: z.number().int().min(1).max(100).optional(),
            filters: z.record(idSchema, z.array(operators)).optional(),
            sortable: z.array(idSchema).optional(),
            groupable: z.array(idSchema).optional(),
            supportsCount: z.boolean().optional(),
            detailDestination: z.string().optional(),
            detailParam: idSchema.optional(),
          })
          .strict(),
      )
      .default({}),
    components: z
      .record(
        z.string(),
        z
          .object({
            ...selection,
            defaults: z.record(idSchema, scalarSchema).default({}),
            source: z.string().optional(),
          })
          .strict(),
      )
      .default({}),
    routes: z.record(z.string(), z.object(selection).strict()).default({}),
    screens: z
      .record(
        z.string(),
        z
          .object({
            ...selection,
            requiredSections: z.array(z.string()).max(40).default([]),
          })
          .strict(),
      )
      .default({}),
    queryClient: z.string().optional(),
    navigationRef: z.string().optional(),
  })
  .strict();
export type IntegrationOverrides = z.infer<typeof overridesSchema>;
export type SourceOverride = IntegrationOverrides['sources'][string];
export const emptyOverrides = () => overridesSchema.parse({ version: 1 });
export const overridesPath = 'personalize/overrides.json';
export async function readOverrides(root: string) {
  const text = await readOptional(await safePath(root, overridesPath));
  return text ? overridesSchema.parse(JSON.parse(text)) : emptyOverrides();
}
