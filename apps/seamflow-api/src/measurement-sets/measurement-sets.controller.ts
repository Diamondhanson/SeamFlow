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
import { MeasurementSetsService } from './measurement-sets.service';
import {
  CreateMeasurementSetDto,
  UpdateMeasurementSetDto,
} from './measurement-sets.dto';

@Controller()
export class MeasurementSetsController {
  constructor(
    private readonly tailors: TailorsService,
    private readonly sets: MeasurementSetsService,
  ) {}

  @Get('clients/:clientId/measurement-sets')
  async listForClient(
    @CurrentUser() user: AuthedUser,
    @Param('clientId', new ParseUUIDPipe()) clientId: string,
  ) {
    const tailorId = await this.tailors.requireTailorId(user.id);
    const items = await this.sets.listForClient(tailorId, clientId);
    return { items };
  }

  @Post('clients/:clientId/measurement-sets')
  async createForClient(
    @CurrentUser() user: AuthedUser,
    @Param('clientId', new ParseUUIDPipe()) clientId: string,
    @Body() body: CreateMeasurementSetDto,
  ) {
    const tailorId = await this.tailors.requireTailorId(user.id);
    return this.sets.createForClient(tailorId, clientId, body);
  }

  @Get('measurement-sets/:id')
  async get(
    @CurrentUser() user: AuthedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    const tailorId = await this.tailors.requireTailorId(user.id);
    return this.sets.getById(tailorId, id);
  }

  @Patch('measurement-sets/:id')
  async update(
    @CurrentUser() user: AuthedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: UpdateMeasurementSetDto,
  ) {
    const tailorId = await this.tailors.requireTailorId(user.id);
    return this.sets.update(tailorId, id, body);
  }

  @Delete('measurement-sets/:id')
  @HttpCode(204)
  async delete(
    @CurrentUser() user: AuthedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    const tailorId = await this.tailors.requireTailorId(user.id);
    await this.sets.delete(tailorId, id);
  }
}
