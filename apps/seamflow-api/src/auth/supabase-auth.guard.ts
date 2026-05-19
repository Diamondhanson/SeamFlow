import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { eq } from 'drizzle-orm';
import { SupabaseService } from '../supabase/supabase.service';
import { DbService } from '../db/db.service';
import { users } from '../db/schema';
import { IS_PUBLIC_KEY } from './decorators/public.decorator';
import type { AuthedRequest, ProfileRow } from './auth.types';
import type { UserRole } from '@seamflow/types';

/**
 * Validates the `Authorization: Bearer <jwt>` header against Supabase Auth
 * and enriches the request with the matching public.users profile.
 *
 * Routes marked @Public() bypass this guard entirely.
 *
 * Trade-off: every authed request makes one HTTP call to supabase.auth.getUser.
 * Phase 1+ can swap to local JWT verification using the project JWT secret.
 */
@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  private readonly logger = new Logger(SupabaseAuthGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly supabase: SupabaseService,
    private readonly db: DbService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }
    const jwt = header.slice(7).trim();
    if (!jwt) {
      throw new UnauthorizedException('Empty bearer token');
    }

    const { data, error } = await this.supabase.admin().auth.getUser(jwt);
    if (error || !data.user) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    let profile: ProfileRow | null = null;
    if (this.db.isConfigured()) {
      try {
        const rows = await this.db.db
          .select()
          .from(users)
          .where(eq(users.id, data.user.id))
          .limit(1);
        const row = rows[0];
        if (row) {
          profile = {
            id: row.id,
            phone: row.phone,
            email: row.email,
            role: row.role as UserRole,
            fullName: row.fullName,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
          };
        }
      } catch (err) {
        this.logger.error('Profile lookup failed', err as Error);
      }
    }

    req.user = {
      id: data.user.id,
      email: data.user.email ?? null,
      phone: data.user.phone ?? null,
      role: profile?.role ?? 'tailor',
      profile,
      jwt,
    };
    return true;
  }
}
