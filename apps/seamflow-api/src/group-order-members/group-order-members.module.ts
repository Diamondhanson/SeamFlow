import { Module } from '@nestjs/common';
import { TailorsModule } from '../tailors/tailors.module';
import { GroupOrderMembersController } from './group-order-members.controller';
import { GroupOrderMembersService } from './group-order-members.service';

@Module({
  imports: [TailorsModule],
  controllers: [GroupOrderMembersController],
  providers: [GroupOrderMembersService],
  exports: [GroupOrderMembersService],
})
export class GroupOrderMembersModule {}
