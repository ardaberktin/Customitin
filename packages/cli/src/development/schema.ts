import { z } from 'zod';

export const scriptNameSchema = z
  .string()
  .regex(/^[a-zA-Z0-9][a-zA-Z0-9:_-]*$/)
  .max(80);
export const devScriptSchema = z
  .object({
    name: scriptNameSchema,
    host: z
      .string()
      .regex(/^customitin:host:[a-zA-Z0-9][a-zA-Z0-9:_-]*$/)
      .max(100),
  })
  .strict();
export type DevScript = z.infer<typeof devScriptSchema>;
