import { createZodDto } from 'nestjs-zod';
import {
  GroupOrderPhotoCreateSchema,
  GroupOrderPhotoUpdateSchema,
} from '@seamflow/schemas';

export class CreateGroupOrderPhotoDto extends createZodDto(
  GroupOrderPhotoCreateSchema,
) {}
export class UpdateGroupOrderPhotoDto extends createZodDto(
  GroupOrderPhotoUpdateSchema,
) {}
