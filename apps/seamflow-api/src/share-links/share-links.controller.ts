import { Controller, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthedUser } from '../auth/auth.types';
import { TailorsService } from '../tailors/tailors.service';
import { ShareLinksService } from './share-links.service';

@Controller()
export class ShareLinksController {
  constructor(
    private readonly tailors: TailorsService,
    private readonly shareLinks: ShareLinksService,
  ) {}

  /**
   * Mint a fresh share link for one of the caller's orders. We regenerate on
   * every call rather than caching — keeps the surface small and means a
   * tailor reshare always issues a token bound to a current timestamp.
   */
  @Post('orders/:orderId/share-link')
  async issue(
    @CurrentUser() user: AuthedUser,
    @Param('orderId', new ParseUUIDPipe()) orderId: string,
  ) {
    const tailorId = await this.tailors.requireTailorId(user.id);
    return this.shareLinks.issue(tailorId, orderId);
  }
}
