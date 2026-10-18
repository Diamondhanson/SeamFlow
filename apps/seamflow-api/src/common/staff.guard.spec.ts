// The staff guard is the only thing standing between a signed-in tailor and
// the support inbox, every subscription, and the people-admin actions. Each
// case below is a way in that must stay shut.

import { describe, expect, it } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { StaffGuard } from './staff.guard';
import { fakeContext, fakeDb, jwtWithClaims } from '../../test/fakes';

const aal2 = jwtWithClaims({ aal: 'aal2', sub: 'user-1' });
const aal1 = jwtWithClaims({ aal: 'aal1', sub: 'user-1' });

function guard(rows: unknown[]) {
  return new StaffGuard(fakeDb(rows) as never);
}

function req(user: unknown) {
  return fakeContext({ user });
}

describe('StaffGuard', () => {
  it('lets through a staff member with a second factor', async () => {
    const g = guard([{ userId: 'user-1' }]);
    await expect(g.canActivate(req({ id: 'user-1', jwt: aal2 }))).resolves.toBe(true);
  });

  it('refuses a signed-in user who is not on the staff table', async () => {
    const g = guard([]); // staff lookup finds nothing
    await expect(g.canActivate(req({ id: 'user-1', jwt: aal2 }))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('refuses staff whose session never passed the second factor', async () => {
    // The whole point: a stolen staff password must not be enough to curl
    // these endpoints. Note the staff row EXISTS here — only aal is wrong.
    const g = guard([{ userId: 'user-1' }]);
    await expect(g.canActivate(req({ id: 'user-1', jwt: aal1 }))).rejects.toThrow(
      /mfa_required|Two-step/,
    );
  });

  it('refuses when there is no authed user at all', async () => {
    const g = guard([{ userId: 'user-1' }]);
    await expect(g.canActivate(req(undefined))).rejects.toThrow(ForbiddenException);
  });

  it('refuses a token with no aal claim rather than defaulting to allowed', async () => {
    const g = guard([{ userId: 'user-1' }]);
    const noAal = jwtWithClaims({ sub: 'user-1' });
    await expect(g.canActivate(req({ id: 'user-1', jwt: noAal }))).rejects.toThrow(
      /mfa_required|Two-step/,
    );
  });

  it('refuses a malformed token instead of throwing past the guard', async () => {
    // A garbage token must read as "no aal", not crash into a 500 that some
    // outer handler might treat as a different kind of failure.
    const g = guard([{ userId: 'user-1' }]);
    await expect(g.canActivate(req({ id: 'user-1', jwt: 'not-a-jwt' }))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('checks staff membership on every call, not from a token claim', async () => {
    // Removing someone from `staff` has to take effect immediately. A token
    // that claims staff-ness gets nowhere if the table says otherwise.
    const g = guard([]);
    const claimsStaff = jwtWithClaims({ aal: 'aal2', sub: 'user-1', role: 'staff', is_staff: true });
    await expect(g.canActivate(req({ id: 'user-1', jwt: claimsStaff }))).rejects.toThrow(
      ForbiddenException,
    );
  });
});
