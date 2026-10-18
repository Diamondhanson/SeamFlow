import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  FeedPostCreateSchema,
  FeedPostUpdateSchema,
  FeedQuerySchema,
  TailorProfileUpdateSchema,
} from '@seamflow/schemas';

export class PublishOrderPhotoDto extends createZodDto(FeedPostCreateSchema) {}
export class UpdateFeedPostDto extends createZodDto(FeedPostUpdateSchema) {}
export class FeedQueryDto extends createZodDto(FeedQuerySchema) {}
export class UpdateTailorProfileDto extends createZodDto(TailorProfileUpdateSchema) {}

/**
 * "Which of these designs have I saved?" — the app sends the ids currently on
 * screen and gets back the subset that are saved.
 *
 * Bounded at 200: the body used to be a bare `{ ids?: string[] }`, which the
 * global ZodValidationPipe cannot see, so a caller could post an unbounded
 * array and have every element land in one `in (…)` clause. The feed itself
 * pages at 48, so 200 is already generous. `uuid()` because these go straight
 * into a query as ids.
 */
export const SavedAmongSchema = z
  .object({ ids: z.array(z.string().uuid()).max(200).optional() })
  .strict();
export class SavedAmongDto extends createZodDto(SavedAmongSchema) {}
