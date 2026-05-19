import { SetMetadata } from '@nestjs/common';
import type { UserRole } from '@seamflow/types';

export const ROLES_KEY = 'auth:roles';

/** Restrict the route to the listed roles. Combined with RolesGuard. */
export const Roles = (...roles: UserRole[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_KEY, roles);
