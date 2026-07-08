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
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthedUser } from '../auth/auth.types';
import { TailorsService } from '../tailors/tailors.service';
import { FabricsService } from './fabrics.service';
import { CreateFabricDto, UpdateFabricDto } from './fabrics.dto';

@Controller('fabrics')
export class FabricsController {
  constructor(
    private readonly tailors: TailorsService,
    private readonly fabrics: FabricsService,
  ) {}

  @Get()
  async list(@CurrentUser() user: AuthedUser) {
    const tailorId = await this.tailors.requireTailorId(user.id);
    const items = await this.fabrics.list(tailorId);
    return { items };
  }

  @Post()
  async create(
    @CurrentUser() user: AuthedUser,
    @Body() body: CreateFabricDto,
  ) {
    const tailorId = await this.tailors.requireTailorId(user.id);
    return this.fabrics.create(tailorId, body);
  }

  @Get(':id')
  async get(
    @CurrentUser() user: AuthedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    const tailorId = await this.tailors.requireTailorId(user.id);
    return this.fabrics.getById(tailorId, id);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: AuthedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: UpdateFabricDto,
  ) {
    const tailorId = await this.tailors.requireTailorId(user.id);
    return this.fabrics.update(tailorId, id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  async delete(
    @CurrentUser() user: AuthedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    const tailorId = await this.tailors.requireTailorId(user.id);
    await this.fabrics.delete(tailorId, id);
  }
}
