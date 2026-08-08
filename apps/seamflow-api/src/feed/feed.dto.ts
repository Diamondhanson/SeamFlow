import { createZodDto } from 'nestjs-zod';
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
