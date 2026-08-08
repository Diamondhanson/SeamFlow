import { createZodDto } from 'nestjs-zod';
import { PhoneVerifyConfirmSchema, PhoneVerifyStartSchema } from '@seamflow/schemas';

export class PhoneVerifyStartDto extends createZodDto(PhoneVerifyStartSchema) {}
export class PhoneVerifyConfirmDto extends createZodDto(PhoneVerifyConfirmSchema) {}
