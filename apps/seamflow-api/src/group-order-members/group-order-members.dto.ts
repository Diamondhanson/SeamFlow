import { createZodDto } from 'nestjs-zod';
import {
  GroupOrderMemberCreateSchema,
  GroupOrderMemberUpdateSchema,
  PromoteMemberToClientSchema,
} from '@seamflow/schemas';

export class CreateGroupOrderMemberDto extends createZodDto(GroupOrderMemberCreateSchema) {}
export class UpdateGroupOrderMemberDto extends createZodDto(GroupOrderMemberUpdateSchema) {}
export class PromoteMemberToClientDto extends createZodDto(PromoteMemberToClientSchema) {}
