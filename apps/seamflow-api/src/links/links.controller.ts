import { Body, Controller, Post } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthedUser } from '../auth/auth.types';
import { LinksService } from './links.service';
import { UnfurlDto } from './links.dto';

/** Link preview (unfurl) for chat. Auth-gated: only signed-in users can call it. */
@Controller('links')
export class LinksController {
  constructor(private readonly links: LinksService) {}

  @Post('unfurl')
  async unfurl(@CurrentUser() _user: AuthedUser, @Body() body: UnfurlDto) {
    return this.links.unfurl(body.url);
  }
}
