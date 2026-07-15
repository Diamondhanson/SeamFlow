import { Body, Controller, Post } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthedUser } from '../auth/auth.types';
import { TailorsService } from '../tailors/tailors.service';
import { AiService } from './ai.service';
import { DescribeImageDto, SummarizeNotesDto } from './ai.dto';

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

  @Post('summarize-notes')
  async summarizeNotes(
    @CurrentUser() user: AuthedUser,
    @Body() body: SummarizeNotesDto,
  ) {
    // requireTailorId gates the endpoint to a real tailor account (same as
    // describe-image); the summary itself only needs the notes text.
    await this.tailors.requireTailorId(user.id);
    return this.ai.summarizeNotes(body.notes);
  }
}
