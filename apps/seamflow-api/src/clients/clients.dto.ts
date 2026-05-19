import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ClientCreateSchema, ClientUpdateSchema } from '@seamflow/schemas';

export class CreateClientDto extends createZodDto(ClientCreateSchema) {}
export class UpdateClientDto extends createZodDto(ClientUpdateSchema) {}

/** Query params for GET /clients */
export const ListClientsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  q: z.string().min(1).optional(),
});
export class ListClientsQueryDto extends createZodDto(ListClientsQuerySchema) {}
