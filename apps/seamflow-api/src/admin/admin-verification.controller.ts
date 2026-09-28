import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { StaffGuard } from '../common/staff.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthedUser } from '../auth/auth.types';
import { VerificationService } from '../verification/verification.service';
import { VerificationDecideDto } from '../verification/verification.dto';
import { AdminAuditService } from './admin-audit.service';

/**
 * The verification queue behind the ops dashboard.
 *
 * Staff-only, and every decision writes to `admin_actions` before it returns —
 * so "who verified whom, and on what evidence" always has an answer. That
 * matters more here than anywhere else in the dashboard: this is the one lever
 * that lends SeamFlow's credibility to a stranger.
 */
@Controller('admin/verification')
@UseGuards(StaffGuard)
export class AdminVerificationController {
  constructor(
    private readonly verification: VerificationService,
    private readonly audit: AdminAuditService,
  ) {}

  @Get()
  list(@Query('status') status?: string) {
    const known = ['pending', 'approved', 'rejected', 'withdrawn'] as const;
    const s = known.find((k) => k === status) ?? 'pending';
    return this.verification.queue(s);
  }

  @Get('count')
  async count() {
    return { pending: await this.verification.pendingCount() };
  }

  /** Approve, or decline with a reason the tailor is shown word for word. */
  @Post(':id/decide')
  async decide(
    @CurrentUser() user: AuthedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: VerificationDecideDto,
  ) {
    const out = await this.verification.decide(user.id, id, body.approve, body.note ?? null);
    await this.audit.record(
      user.id,
      body.approve ? 'verification.approve' : 'verification.reject',
      { type: 'tailor', id: out.tailorId },
      {
        requestId: out.id,
        note: out.decisionNote,
        // What was actually looked at, so the record survives the photos being
        // deleted 90 days from now.
        evidence: out.evidence.map((e) => e.kind),
      },
    );
    return out;
  }
}
