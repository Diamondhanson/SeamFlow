import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import type { CountryCode } from 'libphonenumber-js';
import type {
  PhoneVerifyStartResult,
  PhoneVerifyStatus,
} from '@seamflow/schemas';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthedUser } from '../auth/auth.types';
import { PhoneVerificationService } from './phone-verification.service';
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
  ): Promise<PhoneVerifyStartResult> {
    const r = await this.service.start(user.id, dto.phone, {
      locale: dto.locale,
      channel: dto.channel,
      defaultCountry: dto.defaultCountry?.toUpperCase() as CountryCode | undefined,
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
