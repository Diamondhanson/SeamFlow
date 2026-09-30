import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { SupabaseAuthGuard } from './supabase-auth.guard';
import { RolesGuard } from './roles.guard';
import { AppThrottlerGuard } from '../common/throttle.guard';

/**
 * Registers the global guards. Order matters:
 *   1. SupabaseAuthGuard — verifies the token, populates req.user
 *   2. RolesGuard        — role-based access
 *   3. AppThrottlerGuard — rate limit, keyed by the VERIFIED user id (or IP
 *                          for public routes), so a forged token can't be used
 *                          to pick someone else's bucket
 *
 * The default limit is generous on purpose: it exists to stop scripts and
 * scrapers, not to be felt by a tailor syncing a busy day. Expensive or
 * sensitive routes tighten it with @Throttle (AI, phone verification).
 * In-memory storage is correct while the API runs as one instance; move it to
 * Redis the day it scales out, or each instance gets its own budget.
 */
@Module({
  imports: [ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 300 }])],
  providers: [
    { provide: APP_GUARD, useClass: SupabaseAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: AppThrottlerGuard },
  ],
})
export class AuthModule {}
