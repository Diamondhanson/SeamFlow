import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthedUser } from '../auth/auth.types';
import { TailorsService, type TailorRow } from '../tailors/tailors.service';

@Controller('me')
export class MeController {
  constructor(private readonly tailors: TailorsService) {}

  @Get()
  async me(@CurrentUser() user: AuthedUser): Promise<{
    id: string;
    email: string | null;
    phone: string | null;
    role: string;
    profile: AuthedUser['profile'];
    tailor: TailorRow | null;
  }> {
    const tailor = await this.tailors.getForUser(user.id);
    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
      profile: user.profile,
      tailor,
    };
  }
}
