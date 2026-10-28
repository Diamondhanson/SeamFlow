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

/**
 * The name other people see this account under — a designer's conversation list
 * shows it for every customer who writes to them. Accounts made before sign-up
 * asked for a name have none, and the app asks for it the first time it matters.
 */
export const NameSchema = z.object({ fullName: z.string().trim().min(1).max(80) }).strict();
export class NameDto extends createZodDto(NameSchema) {}
