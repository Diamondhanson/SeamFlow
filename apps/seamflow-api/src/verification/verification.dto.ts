import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { VerificationSubmitSchema } from '@seamflow/schemas';

export class VerificationSubmitDto extends createZodDto(VerificationSubmitSchema) {}

export class VerificationDecideDto extends createZodDto(
  z.object({
    approve: z.boolean(),
    /**
     * Required when declining — the service refuses an empty one. Capped
     * because it is shown to the tailor verbatim and has to read as a sentence
     * written to a person, not as a case file.
     */
    note: z.string().min(1).max(500).nullable().optional(),
  }),
) {}
