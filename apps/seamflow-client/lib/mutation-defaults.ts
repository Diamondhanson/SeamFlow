// ============================================================================
// mutation-defaults — offline mutation queue registry (client app).
//
// The tailor app registers a canonical mutationFn for every persistable
// mutation here so the offline persistor can replay paused (offline) mutations
// after an app restart. The client app has no write mutations yet, so this is
// an intentional no-op — but the hook stays wired so that when consumer
// mutations land (e.g. approve a fitting, update measurements), they get the
// same crash-safe offline queue for free by registering here.
// ============================================================================

import type { QueryClient } from '@tanstack/react-query';

export function registerMutationDefaults(_qc: QueryClient): void {
  // No persistable mutations yet. Register client mutation defaults here as
  // they are added (see seamflow-app/lib/mutation-defaults.ts for the pattern).
}
