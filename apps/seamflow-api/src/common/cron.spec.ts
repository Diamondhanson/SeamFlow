// Every scheduled job pins its timezone.
//
// A cron expression with no timeZone means the HOST's clock. That is UTC on
// Render today, but nothing said so, and a region move or a change of base
// image would have shifted all ten jobs silently — including the 09:00 renewal
// reminder, which is the one a tailor notices.
//
// Checked over the source rather than by running a scheduler, because the
// property being asserted is about how the jobs are DECLARED.

import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { CRON_TZ } from './cron';

function sources(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) sources(p, out);
    else if (p.endsWith('.ts') && !p.endsWith('.spec.ts')) out.push(p);
  }
  return out;
}

/** Every `@Cron(...)` in the API, with the file it came from. */
function cronSites(): { file: string; decorator: string }[] {
  const sites: { file: string; decorator: string }[] = [];
  for (const file of sources('src')) {
    const src = readFileSync(file, 'utf8');
    for (const m of src.matchAll(/@Cron\(([^)]*)\)/g)) {
      sites.push({ file, decorator: m[0] });
    }
  }
  return sites;
}

describe('scheduled jobs', () => {
  it('finds the jobs at all, so a passing suite means something', () => {
    // Guards against the regex quietly matching nothing after a refactor.
    expect(cronSites().length).toBeGreaterThanOrEqual(10);
  });

  it('pins a timezone on every single one', () => {
    const unpinned = cronSites()
      .filter((s) => !s.decorator.includes('timeZone'))
      .map((s) => `${s.file}: ${s.decorator}`);
    expect(unpinned, `these would run on the host's clock:\n${unpinned.join('\n')}`).toEqual([]);
  });

  it('pins them all to the same one', () => {
    // Two jobs on different clocks is how a nightly sequence ends up running
    // out of order after a DST change somewhere.
    const other = cronSites()
      .filter((s) => s.decorator.includes('timeZone') && !s.decorator.includes('CRON_TZ'))
      .map((s) => `${s.file}: ${s.decorator}`);
    expect(other, 'use CRON_TZ so there is one place to change it').toEqual([]);
  });

  it('is UTC', () => {
    expect(CRON_TZ).toBe('UTC');
  });
});
