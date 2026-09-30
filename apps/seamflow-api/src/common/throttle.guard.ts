import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { AuthedRequest } from '../auth/auth.types';

/**
 * Rate limiting — who counts as "one caller".
 *
 * Runs AFTER SupabaseAuthGuard (see auth.module.ts), so `req.user` is already
 * verified. A signed-in caller is counted by user id, never by IP: most of our
 * tailors are on mobile networks behind carrier NAT, where hundreds of people
 * share one address, and an IP limit would throttle a whole neighbourhood for
 * one busy tailor. Anonymous callers (public routes) can only be told apart by
 * IP, which `trust proxy` in main.ts resolves to the real client.
 */
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected override async getTracker(req: Record<string, any>): Promise<string> {
    const userId = (req as AuthedRequest).user?.id;
    return userId ? `u:${userId}` : `ip:${req.ip ?? 'unknown'}`;
  }
}
