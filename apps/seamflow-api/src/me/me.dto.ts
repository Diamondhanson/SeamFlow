import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

/**
 * Consent for subscription emails.
 *
 * Was `@Body() body: { subscriptionEmails: boolean }` — a bare TypeScript type,
 * which the global ZodValidationPipe cannot see, so nothing was validated at
 * runtime. The handler happened to be safe (`=== true` coerces nothing), but
 * the annotation claimed a guarantee that was not there.
 *
 * `.strict()` so a typo in the field name is a 400 rather than a silent "you
 * are now opted out" — this is a consent flag Apple requires be revocable, and
 * the quietest possible failure is the worst one.
 */
export const EmailConsentSchema = z
  .object({ subscriptionEmails: z.boolean() })
  .strict();

export class EmailConsentDto extends createZodDto(EmailConsentSchema) {}
