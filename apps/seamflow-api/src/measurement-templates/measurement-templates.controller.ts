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
import { MeasurementTemplatesService } from './measurement-templates.service';
import {
  CreateMeasurementTemplateDto,
  UpdateMeasurementTemplateDto,
} from './measurement-templates.dto';

@Controller('measurement-templates')
export class MeasurementTemplatesController {
  constructor(
    private readonly tailors: TailorsService,
    private readonly templates: MeasurementTemplatesService,
  ) {}

  @Get()
  async list(@CurrentUser() user: AuthedUser) {
    const tailorId = await this.tailors.requireTailorId(user.id);
    const items = await this.templates.list(tailorId);
    return { items };
  }

  @Post()
  async create(
    @CurrentUser() user: AuthedUser,
    @Body() body: CreateMeasurementTemplateDto,
  ) {
    const tailorId = await this.tailors.requireTailorId(user.id);
    return this.templates.create(tailorId, body);
  }

  @Get(':id')
  async get(
    @CurrentUser() user: AuthedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    const tailorId = await this.tailors.requireTailorId(user.id);
    return this.templates.getById(tailorId, id);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: AuthedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: UpdateMeasurementTemplateDto,
  ) {
    const tailorId = await this.tailors.requireTailorId(user.id);
    return this.templates.update(tailorId, id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  async delete(
    @CurrentUser() user: AuthedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    const tailorId = await this.tailors.requireTailorId(user.id);
    await this.templates.delete(tailorId, id);
  }
}
