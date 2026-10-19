// Run every end-to-end smoke test in sequence, stopping at the first failure.
//
// Order matters only in that the cheapest, most foundational checks go first:
// if auth is broken, the other 29 failures tell you nothing you didn't already
// know from the first one.
//
// Usage: pnpm test:e2e:all   (needs the dev server up and .env filled in)

import { spawnSync } from 'node:child_process';

const SUITES = [
  // Foundations — if these fail, stop reading.
  'auth',
  'domain',
  // Core domain.
  'orders',
  'order-library',
  'groups',
  'groups-atomic',
  'fabrics',
  'sync',
  // Sharing and client-facing surfaces.
  'share-links',
  'requests',
  'chat-measurements',
  'chat-sync',
  'voice-notes',
  'support',
  // Discovery and search.
  'search-filters',
  'shop-search',
  'discover-ranking',
  'classify',
  'saved-designs',
  // Money.
  'subscriptions',
  'fapshi',
  // Trust, safety and lifecycle.
  'verification',
  'verification-switch',
  'verification-retention',
  'trust-signals',
  'moderation',
  'suspension',
  'notifications',
  'media-retention',
  'phone',
  'deletion',
];

let passed = 0;
for (const suite of SUITES) {
  process.stdout.write(`\n──── test:${suite} ────\n`);
  const res = spawnSync('pnpm', ['run', `test:${suite}`], { stdio: 'inherit' });
  if (res.status !== 0) {
    process.stderr.write(
      `\n✗ test:${suite} failed (${passed}/${SUITES.length} passed before it)\n`,
    );
    process.exit(1);
  }
  passed++;
}
process.stdout.write(`\n✓ all ${passed} end-to-end suites passed\n`);
