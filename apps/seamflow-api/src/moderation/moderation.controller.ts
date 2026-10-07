// ============================================================================
// Moderation routes.
//
// Two audiences, two controllers. Everyone can report and block — a customer
// browsing Discover needs this as much as a tailor does — so the user-facing
// routes sit on the ordinary authenticated guard. The queue is staff only.
// ============================================================================

import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  CreateReportSchema,
  DecideReportSchema,
  type CreateReportInput,
  type DecideReportInput,
} from '@seamflow/schemas';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthedUser } from '../auth/auth.types';
import { StaffGuard } from '../common/staff.guard';
import { AdminAuditService } from '../admin/admin-audit.service';
import { ModerationService } from './moderation.service';

@Controller()
export class ModerationController {
  constructor(private readonly moderation: ModerationService) {}

  /**
   * Report something.
   *
   * Rate-limited, not because reporting should be hard, but because an
   * unthrottled write endpoint open to every signed-in user is how a queue
   * gets buried. Ten a minute is far above anyone reporting in earnest.
   */
  @Post('reports')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async report(@CurrentUser() user: AuthedUser, @Body() body: unknown) {
    const input: CreateReportInput = CreateReportSchema.parse(body);
    return this.moderation.report(user.id, input);
  }

  @Get('me/blocks')
  async blocks(@CurrentUser() user: AuthedUser) {
    return this.moderation.blocked(user.id);
  }

  @Post('me/blocks/:userId')
  async block(@CurrentUser() user: AuthedUser, @Param('userId', ParseUUIDPipe) target: string) {
    await this.moderation.block(user.id, target);
    return { blocked: true };
  }

  @Delete('me/blocks/:userId')
  async unblock(@CurrentUser() user: AuthedUser, @Param('userId', ParseUUIDPipe) target: string) {
    await this.moderation.unblock(user.id, target);
    return { blocked: false };
  }
}

@Controller('admin/reports')
@UseGuards(StaffGuard)
export class AdminReportsController {
  constructor(
    private readonly moderation: ModerationService,
    private readonly audit: AdminAuditService,
  ) {}

  @Get()
  async queue(@Query('status') status?: string) {
    const s = status === 'actioned' || status === 'dismissed' ? status : 'open';
    return this.moderation.queue(s);
  }

  /** The badge on the dashboard nav: how many are waiting. */
  @Get('count')
  async count() {
    return { open: await this.moderation.openCount() };
  }

  @Post(':reportId/decide')
  async decide(
    @CurrentUser() user: AuthedUser,
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Body() body: unknown,
  ) {
    const input: DecideReportInput = DecideReportSchema.parse(body);
    const out = await this.moderation.decide(user.id, reportId, input);
    await this.audit.record(user.id, 'report.decide', { type: 'report', id: reportId }, input);
    return out;
  }
}
