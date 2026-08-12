import { createZodDto } from 'nestjs-zod';
import {
  AttachLibraryPhotosSchema,
  GroupOrderPhotoCreateSchema,
  GroupOrderPhotoUpdateSchema,
} from '@seamflow/schemas';

export class CreateGroupOrderPhotoDto extends createZodDto(
  GroupOrderPhotoCreateSchema,
) {}
export class UpdateGroupOrderPhotoDto extends createZodDto(
  GroupOrderPhotoUpdateSchema,
) {}
export class AttachGroupLibraryPhotosDto extends createZodDto(
  AttachLibraryPhotosSchema,
) {}
