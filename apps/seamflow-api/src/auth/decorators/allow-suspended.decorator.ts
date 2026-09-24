import { SetMetadata } from '@nestjs/common';

export const ALLOW_SUSPENDED_KEY = 'auth:allowSuspended';

/**
 * Let a suspended account still use this route, even though it writes.
 *
 * For the two things a suspension must never take away: the ability to argue
 * with it (support), and the ability to leave with your data (account export
 * and deletion). A suspension nobody can appeal is a ban with extra steps.
 */
export const AllowSuspended = (): MethodDecorator & ClassDecorator =>
  SetMetadata(ALLOW_SUSPENDED_KEY, true);
