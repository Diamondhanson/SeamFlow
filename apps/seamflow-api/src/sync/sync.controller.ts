import { Body, Controller, Post } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthedUser } from '../auth/auth.types';
import { TailorsService } from '../tailors/tailors.service';
import { SyncService } from './sync.service';
import { SyncPullDto } from './sync.dto';

@Controller('sync')
export class SyncController {
  constructor(
    private readonly tailors: TailorsService,
    private readonly sync: SyncService,
  ) {}

  /**
   * Returns all changes visible to the authed tailor since `lastPulledAt`.
   * Pass `lastPulledAt: null` (or omit) for a first-time full pull.
   *
   * Response includes a server-issued `timestamp`; use that as the next
   * `lastPulledAt` to avoid losing rows due to clock skew.
   */
  @Post('pull')
  async pull(@CurrentUser() user: AuthedUser, @Body() body: SyncPullDto) {
    const tailorId = await this.tailors.requireTailorId(user.id);
    return this.sync.pull(tailorId, body.lastPulledAt ?? null);
  }
}
