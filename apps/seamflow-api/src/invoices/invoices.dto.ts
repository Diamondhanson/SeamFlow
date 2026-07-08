import { createZodDto } from 'nestjs-zod';
import { InvoiceUpdateSchema } from '@seamflow/schemas';

export class UpdateInvoiceDto extends createZodDto(InvoiceUpdateSchema) {}
