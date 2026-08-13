import { Controller, Get } from '@nestjs/common';
import type { DeletionState } from '@seamflow/schemas';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthedUser } from '../auth/auth.types';
import { TailorsService, type TailorRow } from '../tailors/tailors.service';
import { AccountService } from '../account/account.service';

@Controller('me')
export class MeController {
  constructor(
    private readonly tailors: TailorsService,
    private readonly account: AccountService,
  ) {}

  @Get()
  async me(@CurrentUser() user: AuthedUser): Promise<{
    id: string;
    email: string | null;
    phone: string | null;
    role: string;
    profile: AuthedUser['profile'];
    tailor: TailorRow | null;
    deletion: DeletionState;
  }> {
    const [tailor, deletion] = await Promise.all([
      this.tailors.getForUser(user.id),
      // Rides along with the call every screen already makes on open, so a
      // pending deletion surfaces the moment they sign back in — which is the
      // only way someone who changed their mind ever finds the cancel button.
      this.account.getState(user.id),
    ]);
    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
      profile: user.profile,
      tailor,
      deletion,
    };
  }
}
