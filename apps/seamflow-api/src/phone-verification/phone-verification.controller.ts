import { Body, Controller, Get, Headers, HttpCode, Post } from '@nestjs/common';
import type { CountryCode } from 'libphonenumber-js';
import type {
  PhoneVerifyStartResult,
  PhoneVerifyStatus,
} from '@seamflow/schemas';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthedUser } from '../auth/auth.types';
import { PhoneVerificationService } from './phone-verification.service';
import type { OtpDevicePlatform } from './otp-provider';
import { PhoneVerifyConfirmDto, PhoneVerifyStartDto } from './phone-verification.dto';

/**
 * Phone verification, for whoever is signed in — tailor or client alike.
 *
 * Mounted under /me because the subject is always the caller. There is
 * deliberately no "verify someone else's number" route: the only person who can
 * prove control of a line is the person holding it.
 */
@Controller('me/phone')
export class PhoneVerificationController {
  constructor(private readonly service: PhoneVerificationService) {}

  @Get()
  status(@CurrentUser() user: AuthedUser): Promise<PhoneVerifyStatus> {
    return this.service.status(user.id);
  }

  @Post('start')
  @HttpCode(200)
  async start(
    @CurrentUser() user: AuthedUser,
    @Body() dto: PhoneVerifyStartDto,
    @Headers('x-client-platform') platform?: string,
  ): Promise<PhoneVerifyStartResult> {
    const r = await this.service.start(user.id, dto.phone, {
      locale: dto.locale,
      channel: dto.channel,
      defaultCountry: dto.defaultCountry?.toUpperCase() as CountryCode | undefined,
      // The apps already send this on every request; a vendor that scores risk
      // does a better job with it. Whitelisted rather than forwarded, so a
      // spoofed header cannot put arbitrary text in an outbound payload.
      signals: { devicePlatform: devicePlatformOf(platform) },
    });
    return { ...r, expiresAt: r.expiresAt.toISOString() };
  }

  @Post('confirm')
  @HttpCode(200)
  async confirm(
    @CurrentUser() user: AuthedUser,
    @Body() dto: PhoneVerifyConfirmDto,
  ): Promise<{ phone: string; verifiedAt: string }> {
    const r = await this.service.confirm(user.id, dto.code);
    return { phone: r.phone, verifiedAt: r.verifiedAt.toISOString() };
  }
}

/**
 * Accept only the three values the apps actually send.
 *
 * A header is user input: forwarding it verbatim to a third party would let
 * anyone put arbitrary text in an outbound request. Anything unrecognised
 * becomes undefined, and the signal is simply omitted.
 */
function devicePlatformOf(raw: string | undefined): OtpDevicePlatform | undefined {
  return raw === 'ios' || raw === 'android' || raw === 'web' ? raw : undefined;
}
