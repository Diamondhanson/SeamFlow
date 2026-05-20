import { Controller, Get, Param } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { ShareLinksService } from '../share-links/share-links.service';

/**
 * Public order view backed by a signed share-link token. No Supabase JWT
 * required — anyone with the token can read.
 */
@Public()
@Controller('public/orders')
export class PublicOrdersController {
  constructor(private readonly shareLinks: ShareLinksService) {}

  @Get(':token')
  async getByToken(@Param('token') token: string) {
    return this.shareLinks.resolvePublic(token);
  }
}
