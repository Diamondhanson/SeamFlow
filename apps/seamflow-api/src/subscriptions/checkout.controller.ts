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
import { SkipThrottle, Throttle } from '@nestjs/throttler';

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
  // Starting a payment asks a provider to contact a phone. Ten a minute is
  // far above any real use and far below a way to pester someone.
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
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
   * Answers 200 for anything it has reached a DECISION about, including a
   * refusal: an unverified signature, a mismatched reference, an underpayment,
   * a payment it has never heard of. None of those is something a retry fixes,
   * and a provider that receives an error retries for hours.
   *
   * An unexpected failure is different and deliberately NOT caught here. Since
   * settle() now claims the payment and grants the days in one transaction,
   * such a failure rolls both back and leaves the row 'pending' — exactly the
   * state the provider's retry, and the reconcile cron, know how to finish. A
   * 500 here is the request asking to be sent again, which is the right answer.
   *
   * (The docstring used to say "always answers 200". It never did, and once the
   * transaction went in, it should not: swallowing the error would have turned
   * a recoverable payment into a silent one.)
   */
  // The provider sends from a handful of IPs and does not retry a 429 well:
  // throttling it would drop real payments. The secret check is the gate.
  @SkipThrottle()
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
