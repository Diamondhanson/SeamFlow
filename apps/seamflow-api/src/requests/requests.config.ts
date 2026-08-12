// ============================================================================
// The dials that keep the request board from becoming a spam board.
//
// All in one file, all named, all tunable — because these are product
// decisions that will be wrong on the first guess and need to be changed
// without a code review (ROADMAP H.9).
//
// Every value here is a REAL limit, not a placeholder: the point of building
// this before there is traffic is that the limits exist from the first request
// rather than being retrofitted after the first flood.
// ============================================================================

export const REQUEST_LIMITS = {
  /**
   * Offers a single request accepts before it stops inviting more.
   *
   * Protects the client from a wall of near-identical offers, and protects
   * tailors from spending their time on a request that already has plenty.
   * Eight is enough to choose from and few enough to actually read.
   */
  MAX_OFFERS_PER_REQUEST: 8,

  /**
   * Open requests one client may have at a time.
   *
   * Not a spam limit so much as a seriousness limit: someone with fifteen open
   * requests is not going to answer the tailors who reply to them, and
   * ghosting is what kills a board like this for the people answering.
   */
  MAX_OPEN_REQUESTS_PER_CLIENT: 5,

  /** Gap between one client's posts. Blocks the burst, allows the second thought. */
  REQUEST_POST_COOLDOWN_MINUTES: 10,

  /**
   * Offers one tailor may send in a day.
   *
   * Generous for anyone answering genuinely — twelve considered offers is a
   * lot of writing — and low enough that copy-pasting the same message across
   * the whole board stops being viable.
   */
  MAX_OFFERS_PER_TAILOR_PER_DAY: 12,

  /**
   * How long a request stays open.
   *
   * Expiry is what keeps the board honest: a tailor should never spend effort
   * on a brief the client stopped caring about three weeks ago, and a client
   * should not get an offer on something they already had made elsewhere.
   */
  DEFAULT_REQUEST_TTL_DAYS: 10,

  /**
   * Tailors notified about one location request.
   *
   * Not currently used to CUT anything — every eligible tailor is notified,
   * because ranking written against no traffic would be tuned against nothing.
   * The cap is here so the day it starts binding is a config change and a
   * scoring function, not a schema migration. See H.3.
   */
  MAX_REQUEST_FANOUT: 20,
} as const;
