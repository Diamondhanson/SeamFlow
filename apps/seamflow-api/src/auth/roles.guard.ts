import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { UserRole } from '@seamflow/types';
import type { AuthedRequest } from './auth.types';
import { ROLES_KEY } from './decorators/roles.decorator';

/**
 * Runs after SupabaseAuthGuard. Routes without @Roles() pass through.
 * Routes with @Roles('admin', 'tailor') require the authed user to have one
 * of those roles.
 *
 * ⚠ NOTHING USES THIS TODAY. `@Roles()` appears on 0 of the API's ~218 routes,
 * so this guard lets every request through. Do not read its presence in
 * auth.module.ts as evidence that a route is role-checked.
 *
 * What actually separates a tailor from a client is narrower and stricter: a
 * tailor-scoped route calls `TailorsService.requireTailorId(user.id)`, which
 * throws 404 unless that account owns a `tailors` row, and every query below
 * it is filtered by the id it returns. Chat and support resolve an actor the
 * same way. That is a per-row boundary rather than a per-route one, which is
 * why it has held while this guard sat unused.
 *
 * Keep it only if a route is going to use it. A guard that looks like it
 * enforces something and does not is worse than no guard, because the next
 * person adding an endpoint will assume it covers them.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[] | undefined>(
      ROLES_KEY,
      [ctx.getHandler(), ctx.getClass()],
    );
    if (!required || required.length === 0) return true;

    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    const role = req.user?.role;
    if (!role || !required.includes(role)) {
      throw new ForbiddenException('Insufficient role');
    }
    return true;
  }
}
