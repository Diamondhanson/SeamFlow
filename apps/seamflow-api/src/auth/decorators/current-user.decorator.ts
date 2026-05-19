import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthedUser, AuthedRequest } from '../auth.types';

/** Injects the authed user into a controller method param. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthedUser => {
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    return req.user;
  },
);
