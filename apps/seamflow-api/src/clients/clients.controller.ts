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
import { ClientsService } from './clients.service';
import {
  CreateClientDto,
  ListClientsQueryDto,
  UpdateClientDto,
} from './clients.dto';

@Controller('clients')
export class ClientsController {
  constructor(
    private readonly tailors: TailorsService,
    private readonly clients: ClientsService,
  ) {}

  @Get()
  async list(
    @CurrentUser() user: AuthedUser,
    @Query() query: ListClientsQueryDto,
  ) {
    const tailorId = await this.tailors.requireTailorId(user.id);
    const items = await this.clients.list(tailorId, query);
    return { items, limit: query.limit, offset: query.offset };
  }

  @Post()
  async create(@CurrentUser() user: AuthedUser, @Body() body: CreateClientDto) {
    const tailorId = await this.tailors.requireTailorId(user.id);
    return this.clients.create(tailorId, body);
  }

  @Get(':id')
  async get(
    @CurrentUser() user: AuthedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    const tailorId = await this.tailors.requireTailorId(user.id);
    return this.clients.getById(tailorId, id);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: AuthedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: UpdateClientDto,
  ) {
    const tailorId = await this.tailors.requireTailorId(user.id);
    return this.clients.update(tailorId, id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  async delete(
    @CurrentUser() user: AuthedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    const tailorId = await this.tailors.requireTailorId(user.id);
    await this.clients.delete(tailorId, id);
  }
}
