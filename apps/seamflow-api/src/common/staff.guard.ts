import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { AuthedRequest } from '../auth/auth.types';
import { DbService } from '../db/db.service';
import { staff } from '../db/schema';

/**
 * Staff-only routes — shared by every admin surface (support inbox,
 * subscriptions). Runs AFTER the global Supabase auth guard, so the token
 * is already verified; this adds "and you are on the staff table".
 *
 * Checked against the database on every call rather than a claim baked into
 * the token, so removing someone from `staff` takes effect immediately.
 */
@Injectable()
export class StaffGuard implements CanActivate {
  constructor(private readonly dbService: DbService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    const userId = req.user?.id;
    if (!userId) throw new ForbiddenException('Staff only');
    const rows = await this.dbService.db
      .select({ userId: staff.userId })
      .from(staff)
      .where(eq(staff.userId, userId))
      .limit(1);
    if (!rows[0]) throw new ForbiddenException('Staff only');
    return true;
  }
}
