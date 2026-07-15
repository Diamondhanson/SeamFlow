import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthedUser } from '../auth/auth.types';
import { ConsumerService } from './consumer.service';
import { ClaimOrderDto } from './consumer.dto';

// Consumer (seamflow-client) surface — scoped to the current auth user, never
// to a tailor. Any signed-in account can use these.
@Controller('consumer')
export class ConsumerController {
  constructor(private readonly consumer: ConsumerService) {}

  @Post('claims')
  async claim(@CurrentUser() user: AuthedUser, @Body() body: ClaimOrderDto) {
    return this.consumer.claim(user.id, body.token);
  }

  @Get('orders')
  async listOrders(@CurrentUser() user: AuthedUser) {
    const items = await this.consumer.listOrders(user.id);
    return { items };
  }

  @Get('orders/:id')
  async getOrder(
    @CurrentUser() user: AuthedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.consumer.getOrder(user.id, id);
  }

  @Get('measurements')
  async listMeasurements(@CurrentUser() user: AuthedUser) {
    const items = await this.consumer.listMeasurements(user.id);
    return { items };
  }
}
