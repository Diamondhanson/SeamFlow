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
    // Forks, not threads, and this is not a preference.
    //
    // `threads` was the original choice here and it segfaulted CI the first
    // time a spec reached @sentry/profiling-node, which ships a native .node
    // addon: loading one inside a worker thread crashes the worker, and it
    // crashes nondeterministically, so it looked like a flake locally (one
    // SIGKILL that was wrongly dismissed as memory pressure) before it became a
    // reliable segfault on a Linux runner.
    //
    // A forked process can load native addons safely, and it isolates timers
    // better than a thread anyway — which was the reason threads were picked.
    pool: 'forks',
  },
});
