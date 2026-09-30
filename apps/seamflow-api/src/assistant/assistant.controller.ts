import { Body, Controller, Post } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthedUser } from '../auth/auth.types';
import { TailorsService } from '../tailors/tailors.service';
import { AssistantService } from './assistant.service';
import { AssistantChatDto } from './assistant.dto';
import { Throttle } from '@nestjs/throttler';

// Every message is a paid model call. See ai.controller.ts.
@Throttle({ default: { limit: 20, ttl: 60_000 } })
@Controller('assistant')
export class AssistantController {
  constructor(
    private readonly tailors: TailorsService,
    private readonly assistant: AssistantService,
  ) {}

  @Post('chat')
  async chat(@CurrentUser() user: AuthedUser, @Body() body: AssistantChatDto) {
    const tailorId = await this.tailors.requireTailorId(user.id);
    return this.assistant.chat(tailorId, body.messages);
  }
}
