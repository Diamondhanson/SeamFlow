import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import type {
  VerificationBadge,
  VerificationRequest,
  VerificationState,
} from '@seamflow/schemas';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthedUser } from '../auth/auth.types';
import { VerificationService } from './verification.service';
import { VerificationSubmitDto } from './verification.dto';

/**
 * A tailor's own verification, under /me because the subject is always the
 * caller. There is no route for asking on someone else's behalf.
 *
 * Nothing here is required to use SeamFlow (appendix J's one rule). A tailor
 * who never calls any of it keeps every feature they have, Discover included.
 */
@Controller('me/verification')
export class VerificationController {
  constructor(private readonly verification: VerificationService) {}

  /** Where they stand, plus the preconditions, in one call. */
  @Get()
  state(@CurrentUser() user: AuthedUser): Promise<VerificationState> {
    return this.verification.state(user.id);
  }

  /** Ask to be verified. */
  @Post()
  @HttpCode(201)
  submit(
    @CurrentUser() user: AuthedUser,
    @Body() dto: VerificationSubmitDto,
  ): Promise<VerificationRequest> {
    return this.verification.submit(user.id, dto.evidence);
  }

  /** Change of mind, before anyone has looked. */
  @Delete()
  withdraw(@CurrentUser() user: AuthedUser): Promise<VerificationRequest> {
    return this.verification.withdraw(user.id);
  }
}

/**
 * The badge, for anyone who can see the shop (J.5).
 *
 * Signed-in but not staff-only: a client browsing Discover taps the tick and
 * gets the sentence behind it. "A tick nobody can interrogate is decoration."
 *
 * Carries nothing private — no phone number, no coordinate, no evidence. Whether
 * someone is REACHABLE is a trust signal; the number itself is theirs.
 */
@Controller('tailors')
export class VerificationBadgeController {
  constructor(private readonly verification: VerificationService) {}

  @Get(':tailorId/badge')
  badge(@Param('tailorId', new ParseUUIDPipe()) tailorId: string): Promise<VerificationBadge> {
    return this.verification.badge(tailorId);
  }
}
