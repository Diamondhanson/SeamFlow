// ============================================================================
// Requests & offers — HTTP surface.
//
// Two audiences on one board, and the routes are split accordingly:
//
//   CLIENT  posts a request, reads the offers on it, picks one
//   TAILOR  browses eligible requests, answers one, tracks their answers
//
// The split matters beyond tidiness. A client is a `users` row; a tailor is a
// `tailors` row resolved through `requireTailorId`. Mixing them on one route
// is how an authorisation hole gets written, so no route here serves both.
// ============================================================================

import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthedUser } from '../auth/auth.types';
import { TailorsService } from '../tailors/tailors.service';
import { RequestsService } from './requests.service';
import { OffersService } from './offers.service';
import {
  CreateOfferDto,
  CreateRequestDto,
  RequestQueryDto,
  UpdateRequestDto,
} from './requests.dto';

@Controller()
export class RequestsController {
  constructor(
    private readonly tailors: TailorsService,
    private readonly requests: RequestsService,
    private readonly offers: OffersService,
  ) {}

  // ---- Client ------------------------------------------------------------

  @Post('requests')
  async create(@CurrentUser() user: AuthedUser, @Body() body: CreateRequestDto) {
    const row = await this.requests.create(user.id, body);
    return this.requests.withPhotoUrls(row);
  }

  @Get('requests/mine')
  async listMine(@CurrentUser() user: AuthedUser) {
    const rows = await this.requests.listMine(user.id);
    return { items: await Promise.all(rows.map((r) => this.requests.withPhotoUrls(r))) };
  }

  @Get('requests/:id')
  async getMine(
    @CurrentUser() user: AuthedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    const row = await this.requests.getForClient(user.id, id);
    return this.requests.withPhotoUrls(row);
  }

  @Patch('requests/:id')
  async update(
    @CurrentUser() user: AuthedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: UpdateRequestDto,
  ) {
    return this.requests.update(user.id, id, body);
  }

  @Post('requests/:id/close')
  async close(
    @CurrentUser() user: AuthedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.requests.close(user.id, id);
  }

  /** The offers on my request, for comparing. */
  @Get('requests/:id/offers')
  async offersForRequest(
    @CurrentUser() user: AuthedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return { items: await this.offers.listForRequest(user.id, id) };
  }

  @Post('offers/:id/shortlist')
  async shortlist(
    @CurrentUser() user: AuthedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.offers.shortlist(user.id, id);
  }

  /** Pick a tailor. Opens (or reuses) the conversation they continue in. */
  @Post('offers/:id/accept')
  async accept(
    @CurrentUser() user: AuthedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.offers.accept(user.id, id);
  }

  // ---- Tailor ------------------------------------------------------------

  /**
   * The board. Everything this tailor is eligible for — invited requests plus
   * every open request in their area — with matches ranked first, never
   * filtered to matches only.
   */
  @Get('tailor/requests')
  async openForTailor(@CurrentUser() user: AuthedUser, @Query() query: RequestQueryDto) {
    const tailorId = await this.tailors.requireTailorId(user.id);
    const rows = await this.requests.listOpenForTailor(tailorId, query);
    return {
      items: await Promise.all(
        rows.map(async (r) => this.requests.toSummary(await this.requests.withPhotoUrls(r))),
      ),
    };
  }

  @Get('tailor/requests/:id')
  async getForTailor(
    @CurrentUser() user: AuthedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    const tailorId = await this.tailors.requireTailorId(user.id);
    const row = await this.requests.getForTailor(tailorId, id);
    return this.requests.toSummary(await this.requests.withPhotoUrls(row));
  }

  @Post('tailor/requests/:id/offers')
  async makeOffer(
    @CurrentUser() user: AuthedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: CreateOfferDto,
  ) {
    const tailorId = await this.tailors.requireTailorId(user.id);
    return this.offers.create(tailorId, id, body);
  }

  @Get('tailor/offers')
  async myOffers(@CurrentUser() user: AuthedUser) {
    const tailorId = await this.tailors.requireTailorId(user.id);
    return { items: await this.offers.listMine(tailorId) };
  }

  @Post('tailor/offers/:id/withdraw')
  async withdraw(
    @CurrentUser() user: AuthedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    const tailorId = await this.tailors.requireTailorId(user.id);
    return this.offers.withdraw(tailorId, id);
  }
}
