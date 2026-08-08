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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthedUser } from '../auth/auth.types';
import { TailorsService } from '../tailors/tailors.service';
import { WorksService } from './works.service';
import {
  AdoptOrderPhotoDto,
  CreateWorkDto,
  PublishWorkDto,
  UpdateWorkDto,
  WorkQueryDto,
} from './works.dto';

/**
 * "My Designs" — the tailor's own finished work. Entirely tailor-authenticated:
 * nothing here is public. The public view of a published piece is served by the
 * feed endpoints instead.
 */
@Controller()
export class WorksController {
  constructor(
    private readonly tailors: TailorsService,
    private readonly works: WorksService,
  ) {}

  @Get('works')
  async list(@CurrentUser() user: AuthedUser, @Query() query: WorkQueryDto) {
    const tailorId = await this.tailors.requireTailorId(user.id);
    return this.works.list(tailorId, query);
  }

  /** Distinct attribute values present in this portfolio — drives the filter bar. */
  @Get('works/facets')
  async facets(@CurrentUser() user: AuthedUser) {
    const tailorId = await this.tailors.requireTailorId(user.id);
    return this.works.facets(tailorId);
  }

  @Get('works/:id')
  async get(
    @CurrentUser() user: AuthedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    const tailorId = await this.tailors.requireTailorId(user.id);
    return this.works.getById(tailorId, id);
  }

  @Post('works')
  async create(@CurrentUser() user: AuthedUser, @Body() body: CreateWorkDto) {
    const tailorId = await this.tailors.requireTailorId(user.id);
    return this.works.create(tailorId, body);
  }

  /** Pull a finished order's photo into the portfolio. */
  @Post('order-photos/:id/adopt')
  async adopt(
    @CurrentUser() user: AuthedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: AdoptOrderPhotoDto,
  ) {
    const tailorId = await this.tailors.requireTailorId(user.id);
    return this.works.adoptOrderPhoto(tailorId, id, body);
  }

  @Patch('works/:id')
  async update(
    @CurrentUser() user: AuthedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: UpdateWorkDto,
  ) {
    const tailorId = await this.tailors.requireTailorId(user.id);
    return this.works.update(tailorId, id, body);
  }

  @Delete('works/:id')
  @HttpCode(204)
  async remove(
    @CurrentUser() user: AuthedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    const tailorId = await this.tailors.requireTailorId(user.id);
    await this.works.remove(tailorId, id);
  }

  @Post('works/:id/publish')
  async publish(
    @CurrentUser() user: AuthedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: PublishWorkDto,
  ) {
    const tailorId = await this.tailors.requireTailorId(user.id);
    return this.works.publish(tailorId, id, body);
  }

  @Post('works/:id/unpublish')
  async unpublish(
    @CurrentUser() user: AuthedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    const tailorId = await this.tailors.requireTailorId(user.id);
    return this.works.unpublish(tailorId, id);
  }
}
