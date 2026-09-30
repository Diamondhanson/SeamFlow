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
 *
 * Also requires a session that passed the second factor (`aal2`). The admin
 * console enforces this too, but these endpoints are reachable directly: a
 * stolen staff password must not be enough to call them with curl.
 */
@Injectable()
export class StaffGuard implements CanActivate {
  constructor(private readonly dbService: DbService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    const userId = req.user?.id;
    if (!userId) throw new ForbiddenException('Staff only');
    if (sessionAal(req.user.jwt) !== 'aal2') {
      throw new ForbiddenException({ error: 'mfa_required', message: 'Two-step sign-in required' });
    }
    const rows = await this.dbService.db
      .select({ userId: staff.userId })
      .from(staff)
      .where(eq(staff.userId, userId))
      .limit(1);
    if (!rows[0]) throw new ForbiddenException('Staff only');
    return true;
  }
}

/**
 * The `aal` claim of a token SupabaseAuthGuard has already verified with
 * Supabase — so reading it without re-checking the signature is safe here.
 */
function sessionAal(jwt: string): string | null {
  try {
    const payload = JSON.parse(Buffer.from(jwt.split('.')[1] ?? '', 'base64url').toString('utf8'));
    return typeof payload.aal === 'string' ? payload.aal : null;
  } catch {
    return null;
  }
}
