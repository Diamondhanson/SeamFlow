// ============================================================================
// Backfilling the design vocabulary onto designs published before it existed.
//
// The publish screen classifies a photo and offers the tailor chips to correct
// (see publish.tsx → classifyDesign). Every design published since then carries
// a garment key, colours and attributes. Everything published BEFORE carries
// nothing — and "nothing" is not a small problem: an untagged design cannot be
// filtered, cannot be searched by style, and cannot be the starting point for a
// change request, because you cannot offer "make this knee-length instead of
// maxi" when you do not know it is maxi.
//
// WHERE THE LINE IS DRAWN
//
// This fills the TAXONOMY and never the PROSE. `title` and `caption` are the
// tailor's own voice — the words they chose for their own work — and a model
// rewriting those without being asked would be taking something away. Keys are
// different: they are filing, not writing, and the tailor can retag in the app.
//
// It also only ever fills a field that is EMPTY. A tailor who typed "ankara"
// into `fabric` keeps "ankara", even if the model is confident it is lace. What
// the human said wins; this only speaks where the human said nothing.
//
// So the worst case of a wrong guess is a wrong chip on a design that had no
// chips at all, which the owner can change in two taps. The best case is that
// a feed of untagged photos becomes searchable.
// ============================================================================

import { Injectable, Logger } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { DbService } from '../db/db.service';
import { feedPosts } from '../db/schema';
import { AiService } from '../ai/ai.service';

const FEED_BUCKET = 'feed';

/**
 * A batch job over a flaky link will always lose some calls, and giving up on
 * the first blip means re-running the whole thing and paying twice. Three
 * attempts with a widening pause clears the transient failures that make up
 * almost all of them.
 */
const ATTEMPTS = 3;
const BACKOFF_MS = [0, 1500, 4000];

/** A missing file will still be missing on the third try. Only retry the rest. */
function worthRetrying(err: unknown): boolean {
  return !/Object not found|not configured/i.test((err as Error)?.message ?? '');
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** One design's before/after, so a dry run is readable and a real run is auditable. */
export interface BackfillRow {
  id: string;
  title: string | null;
  garmentKey: string | null;
  colors: string[];
  attributes: string[];
  fabric: string | null;
  audience: string | null;
  occasion: string | null;
  /** Set when the classifier could not read the photo at all. */
  error?: string;
}

export interface BackfillReport {
  /** How many designs were missing tags when we started. */
  candidates: number;
  /** How many the model could describe. */
  classified: number;
  /** How many rows were actually written. Zero unless `apply` was true. */
  written: number;
  failed: number;
  rows: BackfillRow[];
}

@Injectable()
export class DesignTagBackfillService {
  private readonly logger = new Logger(DesignTagBackfillService.name);

  constructor(
    private readonly dbService: DbService,
    private readonly ai: AiService,
  ) {}

  /**
   * @param apply false (the default) classifies and reports, writing nothing.
   *   Always look at a dry run first: this touches real designs belonging to
   *   real shops, and the model's proposals are worth reading before they land.
   */
  async run(opts: { apply?: boolean; limit?: number } = {}): Promise<BackfillReport> {
    const { apply = false, limit = 100 } = opts;
    const db = this.dbService.db;

    // Untagged means BOTH empty. A design with attributes but no garment key
    // was tagged by a human who skipped a field, and is none of our business.
    const due = await db
      .select({
        id: feedPosts.id,
        publicPath: feedPosts.publicPath,
        publicThumbPath: feedPosts.publicThumbPath,
        title: feedPosts.title,
        caption: feedPosts.caption,
        garmentType: feedPosts.garmentType,
        garmentKey: feedPosts.garmentKey,
        colors: feedPosts.colors,
        attributes: feedPosts.attributes,
        fabric: feedPosts.fabric,
        audience: feedPosts.audience,
        occasion: feedPosts.occasion,
      })
      .from(feedPosts)
      .where(
        and(
          eq(feedPosts.status, 'published'),
          sql`jsonb_array_length(${feedPosts.attributes}) = 0`,
          sql`${feedPosts.garmentKey} is null`,
        ),
      )
      .limit(limit);

    const report: BackfillReport = {
      candidates: due.length,
      classified: 0,
      written: 0,
      failed: 0,
      rows: [],
    };

    for (const post of due) {
      try {
        // The THUMBNAIL, not the full image. A ~100 kB thumb answers "V-neck,
        // short sleeve, maxi" exactly as well as a 1 MB original, and sending
        // a tenth of the bytes is faster, cheaper, and far less likely to lose
        // the request on a bad connection. Falls back when no thumb exists.
        const path = post.publicThumbPath || post.publicPath;

        // The tailor's own words are the single biggest accuracy lever — see
        // the note on classifyDesign. A caption saying "ankle-length striped
        // kaftan" beats anything the pixels alone will suggest.
        let out: Awaited<ReturnType<AiService['classifyDesign']>> | null = null;
        let lastErr: unknown;
        for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
          if (attempt) await sleep(BACKOFF_MS[attempt]!);
          try {
            out = await this.ai.classifyDesign(path, FEED_BUCKET, {
              caption: post.caption,
              garmentType: post.garmentType,
            });
            break;
          } catch (err) {
            lastErr = err;
            if (!worthRetrying(err)) break;
          }
        }
        if (!out) throw lastErr;
        report.classified += 1;

        const row: BackfillRow = {
          id: post.id,
          title: post.title,
          garmentKey: out.garmentKey,
          colors: out.colors,
          attributes: out.attributes,
          fabric: out.fabric,
          audience: out.audience,
          occasion: out.occasion,
        };
        report.rows.push(row);

        if (!apply) continue;

        // Fill the empty, keep the spoken-for. Note what is absent from this
        // object: title and caption. Those are the tailor's voice.
        const patch: Record<string, unknown> = {};
        if (!post.garmentKey && out.garmentKey) patch.garmentKey = out.garmentKey;
        if ((post.colors as string[]).length === 0 && out.colors.length) {
          patch.colors = out.colors;
        }
        if ((post.attributes as string[]).length === 0 && out.attributes.length) {
          patch.attributes = out.attributes;
        }
        if (!post.fabric && out.fabric) patch.fabric = out.fabric;
        if (!post.audience && out.audience) patch.audience = out.audience;
        if (!post.occasion && out.occasion) patch.occasion = out.occasion;

        if (Object.keys(patch).length === 0) continue;
        patch.updatedAt = new Date();

        await db.update(feedPosts).set(patch).where(eq(feedPosts.id, post.id));
        report.written += 1;
      } catch (err) {
        report.failed += 1;
        report.rows.push({
          id: post.id,
          title: post.title,
          garmentKey: null,
          colors: [],
          attributes: [],
          fabric: null,
          audience: null,
          occasion: null,
          error: (err as Error).message,
        });
        this.logger.warn(`Could not classify ${post.id}: ${(err as Error).message}`);
      }
    }

    this.logger.log(
      `Design tag backfill: ${report.candidates} untagged, ${report.classified} classified, ` +
        `${report.written} written, ${report.failed} failed${apply ? '' : ' (dry run)'}`,
    );
    return report;
  }
}
