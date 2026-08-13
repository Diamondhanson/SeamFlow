import { Body, Controller, Delete, Get, Post } from '@nestjs/common';
import type { AccountExport, DeletionState } from '@seamflow/schemas';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthedUser } from '../auth/auth.types';
import { AccountService } from './account.service';
import { RequestDeletionDto } from './account.dto';

/**
 * Account lifecycle — the part a user drives themselves.
 *
 * Deleting requires proof of identity minted in the last five minutes, which
 * the app obtains by making them re-enter their password. A confirmation
 * dialog proves a finger touched the screen; it does not prove whose finger.
 */
@Controller('account')
export class AccountController {
  constructor(private readonly account: AccountService) {}

  @Get('deletion')
  async state(@CurrentUser() user: AuthedUser): Promise<DeletionState> {
    return this.account.getState(user.id);
  }

  @Post('deletion')
  async request(
    @CurrentUser() user: AuthedUser,
    @Body() body: RequestDeletionDto,
  ): Promise<DeletionState> {
    this.account.assertFreshAuth(user.jwt);
    return this.account.requestDeletion(user.id, body.reason);
  }

  /**
   * Cancelling needs no re-authentication. The asymmetry is the point: making
   * it harder to stop a deletion than to start one would be backwards.
   */
  @Delete('deletion')
  async cancel(@CurrentUser() user: AuthedUser): Promise<DeletionState> {
    return this.account.cancelDeletion(user.id);
  }

  @Get('export')
  async export(@CurrentUser() user: AuthedUser): Promise<AccountExport> {
    return this.account.exportAccount(user.id);
  }
}
