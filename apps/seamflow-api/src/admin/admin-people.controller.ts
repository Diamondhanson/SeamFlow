import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { StaffGuard } from '../common/staff.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthedUser } from '../auth/auth.types';
import { AdminPeopleService } from './admin-people.service';
import { AdminAuditService, type AuditTargetType } from './admin-audit.service';

class VerifyDto extends createZodDto(z.object({ verified: z.boolean() })) {}
class TakedownDto extends createZodDto(
  z.object({ reason: z.string().min(1).max(300), restore: z.boolean().optional() }),
) {}

/**
 * The people levers behind the ops dashboard.
 *
 * Staff-only, and every one of them writes to `admin_actions` before it
 * returns. Nothing here deletes work, and nothing here starts a deletion that
 * the account's owner did not ask for.
 */
@Controller('admin')
@UseGuards(StaffGuard)
export class AdminPeopleController {
  constructor(
    private readonly people: AdminPeopleService,
    private readonly audit: AdminAuditService,
  ) {}

  /** Give or take back the verified badge. */
  @Post('tailors/:tailorId/verified')
  async setVerified(
    @CurrentUser() user: AuthedUser,
    @Param('tailorId', new ParseUUIDPipe()) tailorId: string,
    @Body() body: VerifyDto,
  ) {
    return this.people.setVerified(user.id, tailorId, body.verified);
  }

  /** End every session this person has. They can sign in again immediately. */
  @Post('users/:userId/sign-out')
  async signOut(
    @CurrentUser() user: AuthedUser,
    @Param('userId', new ParseUUIDPipe()) userId: string,
  ) {
    return this.people.signOutEverywhere(user.id, userId);
  }

  /** Stop a deletion that is counting down. */
  @Post('users/:userId/deletion/cancel')
  async cancelDeletion(
    @CurrentUser() user: AuthedUser,
    @Param('userId', new ParseUUIDPipe()) userId: string,
  ) {
    return this.people.cancelDeletion(user.id, userId);
  }

  /** Carry out a deletion the person already asked for, now. */
  @Post('users/:userId/deletion/purge')
  async purge(
    @CurrentUser() user: AuthedUser,
    @Param('userId', new ParseUUIDPipe()) userId: string,
  ) {
    return this.people.purgeNow(user.id, userId);
  }

  /** Take a post out of the feed (or put it back), and tell the tailor. */
  @Post('feed-posts/:postId/takedown')
  async takedown(
    @CurrentUser() user: AuthedUser,
    @Param('postId', new ParseUUIDPipe()) postId: string,
    @Body() body: TakedownDto,
  ) {
    return this.people.takedownPost(user.id, postId, body.reason, body.restore ?? false);
  }

  /** What staff have done to one person or post. */
  @Get('audit/:targetType/:targetId')
  async history(
    @Param('targetType') targetType: string,
    @Param('targetId', new ParseUUIDPipe()) targetId: string,
  ) {
    const allowed: AuditTargetType[] = ['tailor', 'user', 'feed_post', 'platform'];
    const type = (allowed as string[]).includes(targetType)
      ? (targetType as AuditTargetType)
      : 'user';
    return { items: await this.audit.forTarget(type, targetId) };
  }

  /** Everything staff have done lately, across the platform. */
  @Get('audit')
  async recent(@Query('limit') limit?: string) {
    return { items: await this.audit.recent(limit ? Number(limit) : 100) };
  }
}
