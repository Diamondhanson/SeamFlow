// ============================================================================
// Trust signals (appendix J phase 2).
//
// What a shop has actually DONE, as opposed to the badge, which says only that
// it is real. Kept apart from verification on purpose (J.2): merged, they would
// either lock out every newcomer or dilute the badge into noise.
//
// Nothing here has any tailor-facing UI, by design. There is no screen, no
// prompt, no "improve your response time" nag. It simply appears, which is the
// only honest way to present a number the subject cannot influence except by
// doing the work.
//
// WHY NIGHTLY, AND NOT ON READ
//
// Both figures are aggregates over the two biggest tables in the product.
// Computing them per storefront view would put a scan of every message a tailor
// ever received on the hottest read path in the app. They change slowly — an
// hour of staleness is invisible, a slow feed is not.
// ============================================================================

import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { sql } from 'drizzle-orm';
import { DbService } from '../db/db.service';

/**
 * How many answered messages before we will state a reply time.
 *
 * A median over one conversation is not a median, it is an anecdote — and the
 * one thing worse than no trust signal is a confident wrong one. Three is low
 * enough that a working tailor reaches it in their first week.
 */
const MIN_REPLIES = 3;

/**
 * How far back to look.
 *
 * "Usually replies within a day" is a claim about the shop NOW. A tailor who
 * answered in minutes last year and takes a week today should read as a week,
 * so the window rolls rather than counting everything forever.
 */
const WINDOW_DAYS = 180;

@Injectable()
export class TrustSignalsService {
  private readonly logger = new Logger(TrustSignalsService.name);

  constructor(private readonly dbService: DbService) {}

  // 03:10, before the retention sweeps, so a night's work is: recompute, then
  // tidy up. Nothing here depends on that order; it just reads better in logs.
  @Cron('10 3 * * *')
  async nightly(): Promise<void> {
    if (!this.dbService.isConfigured()) return;
    try {
      const { orders, replies } = await this.run();
      this.logger.log(
        `Trust signals recomputed: ${orders} shop(s) with delivered orders, ` +
          `${replies} with a reply time`,
      );
    } catch (err) {
      this.logger.error(`Trust signals failed: ${(err as Error).message}`);
    }
  }

  /** Recompute both signals for every shop. Exposed for the test hook. */
  async run(): Promise<{ orders: number; replies: number }> {
    return {
      orders: await this.recomputeCompletedOrders(),
      replies: await this.recomputeResponseTime(),
    };
  }

  /**
   * Orders delivered, per shop.
   *
   * Every tailor is written, including back to zero: a shop whose only
   * delivered order was later reopened should stop claiming it. A partial
   * update would leave yesterday's number sitting there looking current.
   */
  private async recomputeCompletedOrders(): Promise<number> {
    const result = await this.dbService.db.execute(sql`
      update tailors t
         set completed_orders = coalesce(o.n, 0)
        from (select id from tailors) all_t
        left join (
               select tailor_id, count(*)::int as n
                 from orders
                where status = 'delivered'
             group by tailor_id
             ) o on o.tailor_id = all_t.id
       where t.id = all_t.id
         and t.completed_orders is distinct from coalesce(o.n, 0)
       returning t.id
    `);
    // RETURNING rather than a driver row count: postgres-js exposes `count`
    // while other drivers use `rowCount`, and a number that silently reads 0 on
    // a working update is how a broken job looks healthy in the logs.
    return (result as unknown as unknown[]).length;
  }

  /**
   * Median hours from a client's question to the tailor's reply.
   *
   * WHAT COUNTS AS ONE REPLY, which is the whole subtlety here:
   *
   * A client rarely sends one message. They send "hello", then "are you free?",
   * then a photo — three messages, one question. Measuring each of them against
   * the tailor's answer would count a single reply three times and flatter
   * anyone whose clients type in bursts.
   *
   * So a latency is measured only from the FIRST message of a client's turn —
   * one whose preceding message was not also from the client — to the tailor's
   * next message. One turn, one number.
   *
   * The median, not the mean: one client who asked at midnight and was answered
   * at nine would drag a mean into nonsense, and this figure is shown to a
   * stranger deciding whether to trust someone.
   *
   * Null when there are fewer than MIN_REPLIES, and null is meaningful — the
   * apps render nothing rather than a zero.
   */
  private async recomputeResponseTime(): Promise<number> {
    const result = await this.dbService.db.execute(sql`
      with turns as (
        select
          c.tailor_id,
          m.created_at,
          m.sender_type,
          lag(m.sender_type) over (
            partition by m.conversation_id order by m.created_at
          ) as prev_type,
          -- The earliest tailor message at or after this row, within the same
          -- conversation. A window frame does this in one pass; a correlated
          -- subquery per message would not survive a real message table.
          min(case when m.sender_type = 'tailor' then m.created_at end) over (
            partition by m.conversation_id order by m.created_at
            rows between current row and unbounded following
          ) as answered_at
        from messages m
        join conversations c on c.id = m.conversation_id
        where m.created_at > now() - make_interval(days => ${WINDOW_DAYS})
      ),
      gaps as (
        select
          tailor_id,
          extract(epoch from (answered_at - created_at)) / 3600.0 as hours
        from turns
        where sender_type = 'client'
          -- Start of a client's turn only. "is distinct from" rather than <>
          -- so the very first message in a thread (prev_type null) counts.
          and prev_type is distinct from 'client'
          and answered_at is not null
      ),
      medians as (
        select
          tailor_id,
          greatest(
            1,
            round(percentile_cont(0.5) within group (order by hours))
          )::int as median_hours
        from gaps
        group by tailor_id
        having count(*) >= ${MIN_REPLIES}
      )
      update tailors t
         set response_time_hours = med.median_hours
        from (select id from tailors) all_t
        left join medians med on med.tailor_id = all_t.id
       where t.id = all_t.id
         and t.response_time_hours is distinct from med.median_hours
       returning t.id
    `);
    return (result as unknown as unknown[]).length;
  }
}
