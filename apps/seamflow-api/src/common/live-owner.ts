// ============================================================================
// "Is the owner of this row still a real, present user?"
//
// An account waiting out its 30-day deletion grace period must vanish from
// every public surface immediately — that is most of what people mean when
// they say they want to be deleted, and making them wait a month to stop being
// visible would be a poor reading of the request.
//
// The tempting implementation is to flip each of their posts to `hidden` on
// request and flip them back on cancel. Don't: it destroys the distinction
// between "hidden because they are leaving" and "hidden because the tailor
// chose to hide it", so cancelling would republish work they had deliberately
// taken down. Filtering on the OWNER instead touches none of their content, so
// cancelling restores everything by simply being true again — there is no
// restore step to get wrong.
// ============================================================================

import { sql, type SQL } from 'drizzle-orm';
import { tailors, users } from '../db/schema';

/**
 * Add to any public query that already joins `tailors`. Excludes shops whose
 * owner has asked to be deleted or has already been purged.
 */
export function ownerIsLive(): SQL {
  return sql`exists (
    select 1 from ${users}
    where ${users.id} = ${tailors.userId}
      and ${users.deletionRequestedAt} is null
      and ${users.deletedAt} is null
  )`;
}

/** The same test for a row that carries a user id directly. */
export function userIsLive(userIdColumn: SQL | unknown): SQL {
  return sql`exists (
    select 1 from ${users}
    where ${users.id} = ${userIdColumn}
      and ${users.deletionRequestedAt} is null
      and ${users.deletedAt} is null
  )`;
}
