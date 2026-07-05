import { createZodDto } from 'nestjs-zod';
import {
  DesignCreateSchema,
  DesignUpdateSchema,
  DesignAttachToOrderSchema,
} from '@seamflow/schemas';

export class CreateDesignDto extends createZodDto(DesignCreateSchema) {}
export class UpdateDesignDto extends createZodDto(DesignUpdateSchema) {}
export class AttachDesignToOrderDto extends createZodDto(DesignAttachToOrderSchema) {}
