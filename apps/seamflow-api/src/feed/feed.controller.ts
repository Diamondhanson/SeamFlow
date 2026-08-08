import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthedUser } from '../auth/auth.types';
import { TailorsService } from '../tailors/tailors.service';
import { FeedService } from './feed.service';
import { WorksService } from '../works/works.service';
import {
  FeedQueryDto,
  PublishOrderPhotoDto,
  UpdateFeedPostDto,
  UpdateTailorProfileDto,
} from './feed.dto';

/**
 * Discovery feed routes (ROADMAP D.2.1 / D.2.2).
 *
 * Paths are declared in full rather than under a single prefix because they
 * span four resources (`/feed`, `/feed-posts`, `/order-photos/:id/publish`,
 * `/me/tailor-profile`) that belong together behaviourally.
 *
 * The three reads are `@Public()` — no Authorization header required. That is
 * decision D-4: browse without an account, sign in only to inquire or save.
 */
@Controller()
export class FeedController {
  constructor(
    private readonly tailors: TailorsService,
    private readonly feed: FeedService,
    private readonly works: WorksService,
  ) {}

  // ── Public ────────────────────────────────────────────────────────────────

  @Public()
  @Get('feed')
  list(@Query() query: FeedQueryDto) {
    return this.feed.listPublic(query);
  }

  @Public()
  @Get('feed/:id')
  get(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.feed.getPublic(id);
  }

  @Public()
  @Get('tailors/:id/storefront')
  storefront(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query() query: FeedQueryDto,
  ) {
    return this.feed.storefront(id, query);
  }

  // ── Tailor-authenticated ──────────────────────────────────────────────────

  /**
   * Opt a finished-order photo into the public feed.
   *
   * REROUTED (2026-08-08): this no longer writes straight to feed_posts. It
   * adopts the photo into the tailor's portfolio (`tailor_works`) first, then
   * publishes that entry. Without this, work published from an order would be
   * invisible in My Designs and the tailor's portfolio would be split across
   * two places — the exact thing the "one unified portfolio" decision rules out.
   *
   * Returns the Work (not a FeedPost), because the portfolio entry is now the
   * thing the app tracks; `isPublished` on it says whether it's live.
   */
  @Post('order-photos/:id/publish')
  async publish(
    @CurrentUser() user: AuthedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: PublishOrderPhotoDto,
  ) {
    const tailorId = await this.tailors.requireTailorId(user.id);
    const work = await this.works.adoptOrderPhoto(tailorId, id, {
      garmentType: body.garmentType,
      fabric: body.fabric,
      tags: body.tags,
      audience: body.audience,
      occasion: body.occasion,
      title: body.caption,
    });
    return this.works.publish(tailorId, work.id, {
      caption: body.caption,
      startingPrice: body.startingPrice,
      currency: body.currency,
    });
  }

  /** Everything this tailor has published, including hidden posts. */
  @Get('feed-posts/mine')
  async mine(@CurrentUser() user: AuthedUser) {
    const tailorId = await this.tailors.requireTailorId(user.id);
    const items = await this.feed.listMine(tailorId);
    return { items };
  }

  @Patch('feed-posts/:id')
  async update(
    @CurrentUser() user: AuthedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: UpdateFeedPostDto,
  ) {
    const tailorId = await this.tailors.requireTailorId(user.id);
    return this.feed.update(tailorId, id, body);
  }

  @Delete('feed-posts/:id')
  @HttpCode(204)
  async remove(
    @CurrentUser() user: AuthedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    const tailorId = await this.tailors.requireTailorId(user.id);
    await this.feed.remove(tailorId, id);
  }

  /** Storefront fields (bio, city, specialties, languages, accepts-remote). */
  @Patch('me/tailor-profile')
  async updateProfile(
    @CurrentUser() user: AuthedUser,
    @Body() body: UpdateTailorProfileDto,
  ) {
    const tailorId = await this.tailors.requireTailorId(user.id);
    return this.feed.updateProfile(tailorId, body);
  }
}
