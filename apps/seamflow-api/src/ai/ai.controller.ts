import { Body, Controller, Post } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthedUser } from '../auth/auth.types';
import { TailorsService } from '../tailors/tailors.service';
import { AiService } from './ai.service';
import { DescribeImageDto } from './ai.dto';

@Controller('ai')
export class AiController {
  constructor(
    private readonly tailors: TailorsService,
    private readonly ai: AiService,
  ) {}

  @Post('describe-image')
  async describeImage(
    @CurrentUser() user: AuthedUser,
    @Body() body: DescribeImageDto,
  ) {
    const tailorId = await this.tailors.requireTailorId(user.id);
    return this.ai.describeImage(tailorId, body.storagePath, body.mode);
  }
}
