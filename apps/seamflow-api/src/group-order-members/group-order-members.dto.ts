import { createZodDto } from 'nestjs-zod';
import {
  CopyMemberMeasurementsSchema,
  GroupOrderMemberCreateSchema,
  GroupOrderMemberUpdateSchema,
  PromoteMemberToClientSchema,
  SaveMemberMeasurementsSchema,
} from '@seamflow/schemas';

export class CreateGroupOrderMemberDto extends createZodDto(GroupOrderMemberCreateSchema) {}
export class UpdateGroupOrderMemberDto extends createZodDto(GroupOrderMemberUpdateSchema) {}
export class PromoteMemberToClientDto extends createZodDto(PromoteMemberToClientSchema) {}
export class CopyMemberMeasurementsDto extends createZodDto(CopyMemberMeasurementsSchema) {}
export class SaveMemberMeasurementsDto extends createZodDto(SaveMemberMeasurementsSchema) {}
