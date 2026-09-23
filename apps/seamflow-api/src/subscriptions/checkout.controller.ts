import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
} from '@nestjs/common';
import { createZodDto } from 'nestjs-zod';
import type { Request } from 'express';
import { CheckoutSchema } from '@seamflow/schemas';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import type { AuthedUser } from '../auth/auth.types';
import { TailorsService } from '../tailors/tailors.service';
import { CheckoutService } from './checkout.service';

class CheckoutDto extends createZodDto(CheckoutSchema) {}

@Controller('subscriptions')
export class CheckoutController {
  constructor(
    private readonly checkout: CheckoutService,
    private readonly tailors: TailorsService,
  ) {}

  /**
   * Start a payment for a plan. Answers 503 while no provider is connected.
   *
   * Refused outright for the iOS and Android builds: subscriptions are sold on
   * the web and in email only, because both stores require their own billing
   * for features unlocked inside an app. The app already hides the flow there;
   * this is the backstop if a future change forgets to.
   */
  @Post('checkout')
  async start(
    @CurrentUser() user: AuthedUser,
    @Body() body: CheckoutDto,
    @Headers('x-client-platform') platform?: string,
  ) {
    if (platform === 'ios' || platform === 'android') {
      throw new ForbiddenException({
        error: 'not_sold_in_app',
        message: 'Subscriptions are managed outside the app on this platform.',
      });
    }
    const tailorId = await this.tailors.requireTailorId(user.id);
    return this.checkout.start(tailorId, body);
  }

  /** Poll while a mobile-money prompt is outstanding. */
  @Get('payments/:id')
  async attempt(@CurrentUser() user: AuthedUser, @Param('id', new ParseUUIDPipe()) id: string) {
    const tailorId = await this.tailors.requireTailorId(user.id);
    return this.checkout.attempt(tailorId, id);
  }

  /** What this tailor has paid, ever. */
  @Get('payments')
  async history(@CurrentUser() user: AuthedUser) {
    const tailorId = await this.tailors.requireTailorId(user.id);
    return this.checkout.history(tailorId);
  }

  /**
   * The provider calls this. Public because a provider has no session — the
   * signature IS the authentication, checked inside the provider adapter
   * against the RAW body (see main.ts `rawBody: true`).
   *
   * Always answers 200: a provider that receives an error retries for hours,
   * and a body we could not verify is not something a retry will fix.
   */
  @Public()
  @Post('webhook/:provider')
  async webhook(
    @Param('provider') _provider: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Req() req: Request & { rawBody?: Buffer },
  ) {
    const raw = req.rawBody?.toString('utf8') ?? JSON.stringify(req.body ?? {});
    const { handled } = await this.checkout.handleWebhook(headers, raw);
    return { received: true, handled };
  }
}
