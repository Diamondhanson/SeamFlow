import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { PhoneVerificationModule } from '../phone-verification/phone-verification.module';
import { VerificationBadgeController, VerificationController } from './verification.controller';
import { VerificationService } from './verification.service';
import { VerificationRetentionService } from './verification-retention.service';
import { TrustSignalsService } from './trust-signals.service';

/**
 * Verification (appendix J). Exported so the admin module can run the staff
 * queue through the same service the tailors use — one place decides what
 * "approved" means to the badge, and it cannot drift between the two callers.
 */
@Module({
  imports: [NotificationsModule, PhoneVerificationModule],
  controllers: [VerificationController, VerificationBadgeController],
  providers: [VerificationService, VerificationRetentionService, TrustSignalsService],
  exports: [VerificationService, VerificationRetentionService, TrustSignalsService],
})
export class VerificationModule {}
