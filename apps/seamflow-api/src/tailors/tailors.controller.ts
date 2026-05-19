import { Body, Controller, Get, NotFoundException, Post } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthedUser } from '../auth/auth.types';
import { TailorsService } from './tailors.service';
import { UpsertTailorDto } from './tailors.dto';

@Controller('me/tailor')
export class TailorsController {
  constructor(private readonly tailors: TailorsService) {}

  @Get()
  async get(@CurrentUser() user: AuthedUser) {
    const t = await this.tailors.getForUser(user.id);
    if (!t) throw new NotFoundException('No tailor profile yet');
    return t;
  }

  @Post()
  async upsert(@CurrentUser() user: AuthedUser, @Body() body: UpsertTailorDto) {
    return this.tailors.upsertForUser(user.id, body);
  }
}
