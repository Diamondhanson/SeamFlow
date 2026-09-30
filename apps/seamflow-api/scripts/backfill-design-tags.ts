/**
 * Tag the designs that were published before the design vocabulary existed.
 *
 * The publish screen classifies a photo and offers the tailor chips to correct,
 * so everything published since carries a garment key, colours and attributes.
 * Everything published before carries nothing — and an untagged design cannot
 * be filtered, cannot be searched by style, and cannot be the starting point
 * for a change request, because you cannot offer "make this knee-length
 * instead of maxi" without knowing it is maxi.
 *
 * A standalone script rather than a cron or an endpoint: it is a one-off over a
 * fixed set of old rows, it needs no running server, and it writes to real
 * designs owned by real shops — which is exactly the kind of job that should be
 * run deliberately by a person reading the output, not fired by a scheduler.
 *
 *   pnpm backfill:design-tags              dry run, writes nothing
 *   pnpm backfill:design-tags -- --apply   writes
 *
 * Always read a dry run first.
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../dist/app.module.js';
import { DesignTagBackfillService } from '../dist/feed/design-tag-backfill.service.js';

const apply = process.argv.includes('--apply');
const limitArg = process.argv.find((a) => a.startsWith('--limit='));
const limit = limitArg ? Number(limitArg.split('=')[1]) : 200;

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['warn', 'error'] });
  try {
    const svc = app.get(DesignTagBackfillService);

    // Repair before classifying: a row whose colours are in the old shape is
    // otherwise invisible to every colour filter, and it costs nothing to fix.
    const repair = await svc.repairColorShapes(apply);
    if (repair.found) {
      console.log(`\nColours in the wrong shape: ${repair.found} found, ${repair.fixed} fixed`);
    }

    const report = await svc.run({ apply, limit });

    console.log(`\n${apply ? 'APPLIED' : 'DRY RUN — nothing written'}\n`);
    for (const row of report.rows) {
      if (row.error) {
        console.log(`  ✗ ${row.title ?? '(untitled)'} — ${row.error}`);
        continue;
      }
      const bits = [
        row.garmentKey,
        row.colors.length ? row.colors.join('/') : null,
        row.attributes.length ? row.attributes.join(', ') : null,
        row.fabric,
        row.occasion,
      ].filter(Boolean);
      console.log(`  · ${row.title ?? '(untitled)'} → ${bits.join(' · ') || '(nothing)'}`);
    }

    console.log(
      `\n${report.candidates} untagged · ${report.classified} classified · ` +
        `${report.written} written · ${report.failed} failed`,
    );
    if (!apply && report.classified > 0) {
      console.log('\nRe-run with --apply to write these.');
    }
  } finally {
    await app.close();
  }
}

main().catch((err) => {
  console.error('✗ Backfill failed:', err);
  process.exit(1);
});
