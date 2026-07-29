import { Body, Controller, Post } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthedUser } from '../auth/auth.types';
import { TailorsService } from '../tailors/tailors.service';
import { AssistantService } from './assistant.service';
import { AssistantChatDto } from './assistant.dto';

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
