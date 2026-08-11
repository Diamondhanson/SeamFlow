// ============================================================================
// Refuse to run anywhere but a developer's machine.
//
// This dashboard has NO AUTHENTICATION and reads every tailor's clients, phone
// numbers, addresses and revenue straight from the production database. On a
// public URL that is not a dashboard, it is a data breach with a nice font.
//
// So the guard is structural rather than advisory: the process throws on boot
// in production. It cannot be deployed by forgetting a flag, and the failure is
// loud at build time rather than silent at request time.
//
// When this eventually ships for real, the fix is admin auth (ROADMAP 3.9 —
// role-gated, 2FA, every action logged), not deleting this file.
// ============================================================================

/** Escape hatch for a deliberately-hosted internal deploy behind a VPN. */
const OVERRIDE = 'SEAMFLOW_ADMIN_ALLOW_UNSAFE_HOSTING';

export function assertLocalOnly(): void {
  if (process.env.NODE_ENV !== 'production') return;
  if (process.env[OVERRIDE] === 'i-understand-this-exposes-everything') return;

  throw new Error(
    [
      'seamflow-admin refuses to run in production.',
      '',
      'It has no authentication and exposes every tailor\'s client list,',
      'phone numbers and revenue. Run it locally (npm run dev) instead.',
      '',
      `To host it anyway, set ${OVERRIDE}=i-understand-this-exposes-everything`,
      'AND put it behind a VPN or an authenticating proxy first.',
    ].join('\n'),
  );
}
