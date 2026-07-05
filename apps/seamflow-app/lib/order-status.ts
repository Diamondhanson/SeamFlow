// ============================================================================
// Shared order-status + due-date presentation helpers.
//
// The label + semantic-tone maps used to live inline (and duplicated) in the
// orders list, calendar, and order detail. Centralized here so every surface
// renders a status the same way, and the new home dashboard can reuse them.
// ============================================================================

import type { OrderStatus } from '@seamflow/schemas';
import type { ChipTone } from '@seamflow/ui';

export const STATUS_LABEL: Record<OrderStatus, string> = {
  registered: 'Registered',
  in_progress: 'In progress',
  testing: 'Fitting',
  on_pause: 'On hold',
  delivered: 'Delivered',
};

/** Each status → its semantic color token. The Chip / accent bar resolves the
 *  actual color from the active theme, so this stays hex-free and re-skins. */
export const STATUS_TONE: Record<OrderStatus, ChipTone> = {
  registered: 'statusRegistered',
  in_progress: 'statusInProgress',
  testing: 'statusTesting',
  on_pause: 'statusOnPause',
  delivered: 'statusDelivered',
};

export const STATUS_ORDER: OrderStatus[] = [
  'registered',
  'in_progress',
  'testing',
  'on_pause',
  'delivered',
];

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Whole days from today (local) to the delivery date. Negative = past. */
export function daysUntil(dateDelivery: string): number {
  const now = startOfDay(new Date()).getTime();
  const due = startOfDay(new Date(dateDelivery)).getTime();
  return Math.round((due - now) / 86_400_000);
}

export type DueTone = 'danger' | 'warning' | 'textMuted' | 'success';

export interface DueInfo {
  text: string;
  tone: DueTone;
}

/**
 * Human due-date label + tone for an order. Delivered orders read "Delivered";
 * everything else counts down (or up, when overdue). `null` when there's no
 * delivery date on the order.
 */
export function dueInfo(
  dateDelivery: string | null,
  status: OrderStatus,
): DueInfo | null {
  if (!dateDelivery) return null;
  if (status === 'delivered') return { text: 'Delivered', tone: 'success' };
  const days = daysUntil(dateDelivery);
  if (days < 0) return { text: `${Math.abs(days)}d overdue`, tone: 'danger' };
  if (days === 0) return { text: 'Due today', tone: 'warning' };
  if (days <= 7) return { text: `Due in ${days}d`, tone: 'warning' };
  return { text: `Due in ${days}d`, tone: 'textMuted' };
}
