import { Module } from '@nestjs/common';
import { AdminModule } from '../admin/admin.module';
import { AdminReportsController, ModerationController } from './moderation.controller';
import { ModerationService } from './moderation.service';
import { StaffGuard } from '../common/staff.guard';

/**
 * Exported because two hot paths ask it questions: chat, before letting a
 * message through, and the feed, before showing a shop. One place decides what
 * "blocked" means, so the two cannot drift.
 */
@Module({
  imports: [AdminModule],
  controllers: [ModerationController, AdminReportsController],
  providers: [ModerationService, StaffGuard],
  exports: [ModerationService],
})
export class ModerationModule {}
