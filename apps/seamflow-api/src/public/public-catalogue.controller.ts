import { Controller, Get, Param, Query } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { FeedService } from '../feed/feed.service';
import { FeedQueryDto } from '../feed/feed.dto';

/**
 * A tailor's public catalogue, addressed by slug.
 *
 * This is the endpoint behind `www.seamflowtech.com/t/<slug>` — read by the
 * web page when it renders server-side, and by the client app when it
 * intercepts the same URL as a deep link. One source of truth for both
 * surfaces is the whole point: whatever the browser shows, the app shows.
 *
 * No token, no expiry, and that is deliberate — unlike `/public/orders/:token`
 * this exposes nothing private. Every field here is already world-readable
 * through `GET /feed`; the slug only gives it a memorable address.
 */
@Public()
@Controller('public/tailors')
export class PublicCatalogueController {
  constructor(private readonly feed: FeedService) {}

  @Get(':slug/catalogue')
  async catalogue(@Param('slug') slug: string, @Query() query: FeedQueryDto) {
    return this.feed.storefrontBySlug(slug, query);
  }
}
