import { defineConfig } from 'vitest/config';

/**
 * Unit/integration tests for the API.
 *
 * Deliberately plain vitest with no decorator transform: guards, services and
 * controllers here all take their dependencies through the constructor, so a
 * test builds them with `new` and hand-written fakes. That keeps the harness
 * free of @swc/unplugin-swc and makes every test's dependency graph explicit.
 *
 * The one thing this shape cannot do is boot the real Nest container
 * (`Test.createTestingModule`), which needs `emitDecoratorMetadata`. When we
 * reach the full-HTTP authorization matrix and want supertest against a real
 * app with the real guard chain, add `unplugin-swc` then — see
 * docs/qa-audit-plan.md 0.2.
 */
export default defineConfig({
  test: {
    include: ['src/**/*.spec.ts'],
    environment: 'node',
    // Jobs, retention and purge tests touch timers; keep them isolated.
    pool: 'threads',
  },
});
