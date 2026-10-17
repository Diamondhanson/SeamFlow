import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

/**
 * The two platform-wide switches staff can flip. Both were bare inline types,
 * so neither was validated at runtime — and both decide behaviour for every
 * tailor at once, which is the worst place for `undefined` to read as `false`.
 */
export const SetEnforcementSchema = z.object({ enforced: z.boolean() }).strict();
export class SetEnforcementDto extends createZodDto(SetEnforcementSchema) {}

export const SetVisibilitySchema = z.object({ visible: z.boolean() }).strict();
export class SetVisibilityDto extends createZodDto(SetVisibilitySchema) {}
