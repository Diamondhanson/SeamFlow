import { createZodDto } from 'nestjs-zod';
import {
  WorkAdoptSchema,
  WorkCreateSchema,
  WorkPublishSchema,
  WorkQuerySchema,
  WorkUpdateSchema,
} from '@seamflow/schemas';

export class CreateWorkDto extends createZodDto(WorkCreateSchema) {}
export class AdoptOrderPhotoDto extends createZodDto(WorkAdoptSchema) {}
export class UpdateWorkDto extends createZodDto(WorkUpdateSchema) {}
export class WorkQueryDto extends createZodDto(WorkQuerySchema) {}
export class PublishWorkDto extends createZodDto(WorkPublishSchema) {}
