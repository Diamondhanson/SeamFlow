import { createZodDto } from 'nestjs-zod';
import { FabricCreateSchema, FabricUpdateSchema } from '@seamflow/schemas';

export class CreateFabricDto extends createZodDto(FabricCreateSchema) {}
export class UpdateFabricDto extends createZodDto(FabricUpdateSchema) {}
