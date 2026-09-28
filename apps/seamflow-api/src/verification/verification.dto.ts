import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { VerificationSubmitSchema } from '@seamflow/schemas';

export class VerificationSubmitDto extends createZodDto(VerificationSubmitSchema) {}

export class VerificationDecideDto extends createZodDto(
  z.object({
    approve: z.boolean(),
    /**
     * Set when a staff member actually opened the social profile and found our
     * code in the bio.
     *
     * Separate from `approve` on purpose: the two questions are independent.
     * Staff may believe the work photo and not find the code (a private
     * account, a bio edited back), or find the code on a shop whose photo is
     * not convincing. Folding them together would publish a handle nobody
     * checked, which is the badge problem in miniature.
     */
    confirmSocial: z.boolean().optional(),
    /**
     * Required when declining — the service refuses an empty one. Capped
     * because it is shown to the tailor verbatim and has to read as a sentence
     * written to a person, not as a case file.
     */
    note: z.string().min(1).max(500).nullable().optional(),
  }),
) {}
