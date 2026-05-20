// ============================================================================
// Order share-message template.
// Kept here (rather than in the mobile app) so it lives next to the rest of
// the user-visible string formatting and can be translated in one place
// during Phase 2.5 i18n work.
// ============================================================================

export interface OrderShareMessageInput {
  /** Required — the link the client will tap. */
  url: string;
  /** Required — used in the subject line so the client sees what's being shared. */
  orderName: string;
  /** Optional — if present we greet the client by name. */
  clientName?: string | null;
  /** Optional — tailor's business name (signature line). */
  tailorBusinessName?: string | null;
}

/**
 * Build the share message body. Plain text, WhatsApp-friendly (no markdown).
 *
 * Examples:
 *   formatOrderShareMessage({ url, orderName: 'Wedding suit' })
 *     → "Here's your order — Wedding suit\n\nView details: https://..."
 *   formatOrderShareMessage({ url, orderName: 'Wedding suit', clientName: 'Tunde' })
 *     → "Hi Tunde — here's your order: Wedding suit\n\nView details: https://..."
 *   ...with tailorBusinessName appended as a signature line.
 */
export function formatOrderShareMessage(input: OrderShareMessageInput): string {
  const { url, orderName, clientName, tailorBusinessName } = input;
  const firstName = pickFirstName(clientName);

  const greeting = firstName
    ? `Hi ${firstName} — here's your order: ${orderName}`
    : `Here's your order — ${orderName}`;

  const signature = tailorBusinessName ? `\n\n— ${tailorBusinessName}` : '';

  return `${greeting}\n\nView details: ${url}${signature}`;
}

function pickFirstName(full: string | null | undefined): string | null {
  if (!full) return null;
  const trimmed = full.trim();
  if (!trimmed) return null;
  // Use the first whitespace-separated token. Avoids "Hi Mrs Adekunle Aderibigbe — …"
  return trimmed.split(/\s+/)[0] ?? null;
}

/**
 * Strip everything except digits from an E.164 phone number, returning the
 * form expected by `https://wa.me/<digits>?text=...`. Returns null for empty
 * or all-non-digit input so callers can detect "no phone".
 */
export function phoneToWaMeDigits(phoneE164: string | null | undefined): string | null {
  if (!phoneE164) return null;
  const digits = phoneE164.replace(/\D/g, '');
  return digits.length >= 7 ? digits : null;
}
