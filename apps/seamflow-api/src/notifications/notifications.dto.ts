import { createZodDto } from 'nestjs-zod';
import { DeviceTokenRegisterSchema, PushTestSchema } from '@seamflow/schemas';

export class DeviceTokenRegisterDto extends createZodDto(DeviceTokenRegisterSchema) {}
export class PushTestDto extends createZodDto(PushTestSchema) {}
