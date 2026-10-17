import { registrySchema, sourceDescriptorSchema } from './schema/registry';
import { relationSchema } from './schema/data-plan';
import { actionDescriptorSchema } from './schema/action';
import { z } from 'zod';
import { createProfile } from './validation/profile';

export const defineComponent = (
  input: z.input<typeof registrySchema>['components'][number],
) => registrySchema.shape.components.element.parse(input);
export const defineSource = (input: z.input<typeof sourceDescriptorSchema>) =>
  sourceDescriptorSchema.parse(input);
export const defineSurface = (
  input: z.input<typeof registrySchema>['surfaces'][number],
) => registrySchema.shape.surfaces.element.parse(input);
export const defineRelation = (input: z.input<typeof relationSchema>) =>
  relationSchema.parse(input);
export const defineAction = (input: z.input<typeof actionDescriptorSchema>) =>
  actionDescriptorSchema.parse(input);
export function defineCapabilities(input: z.input<typeof registrySchema>) {
  const registry = registrySchema.parse(input);
  createProfile(registry, 'registration');
  return registry;
}
