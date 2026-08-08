import { Module } from '@nestjs/common';
import { PhoneVerificationController } from './phone-verification.controller';
import { PhoneVerificationService } from './phone-verification.service';

/**
 * Phone verification. Exported so other modules (e.g. a future gate on
 * order acceptance or payouts) can ask whether a user's number is proven
 * without duplicating the check.
 */
@Module({
  controllers: [PhoneVerificationController],
  providers: [PhoneVerificationService],
  exports: [PhoneVerificationService],
})
export class PhoneVerificationModule {}
