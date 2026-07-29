// ============================================================================
// Tailor copilot — app-side plumbing (docs/tailor-copilot-plan.md).
//
// Three responsibilities:
//   1. On-device conversation history: AsyncStorage per tailor, capped — the
//      server stores NOTHING. When the thread overflows the cap the oldest
//      messages are trimmed; "clear conversation" wipes it.
//   2. The confirm-card mapping: ActionPreview.tool → the SAME typed
//      api-client call the screens use, plus which react-query caches to
//      invalidate — so a confirmed action updates the app exactly like a
//      manual one.
//   3. Localized card composition helpers (title per tool, field labels) —
//      the card renders from structured `display`/`args`, never model prose.
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { QueryClient } from '@tanstack/react-query';
import type {
  ActionPreview,
  MeasurementSetCreateInput,
  MeasurementUnit,
  OrderCreateInput,
  OrderStatus,
  OrderUpdateInput,
  ClientCreateInput,
  ClientUpdateInput,
} from '@seamflow/schemas';
import { api } from './api';

// ----------------------------------------------------------------------------
// Local thread
// ----------------------------------------------------------------------------

export interface LocalChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  /** 'done' = local action-result bubble; 'error' = local failure bubble.
   *  Both still count as history for the model (they're plain text). */
  kind?: 'text' | 'done' | 'error';
  /** Optional URL rendered tappable (share-link results). */
  link?: string;
  /** Read tools the server used for this reply — renders the tiny caption. */
  toolsUsed?: string[];
}

/** Cap per the plan: keep the tail, trim the oldest past this. */
const MAX_STORED = 60;
/** How much recent history each turn sends to the server. */
export const SENT_HISTORY = 16;

const keyFor = (tailorId: string) => `seamflow.assistant.thread.${tailorId}`;

export async function loadThread(tailorId: string): Promise<LocalChatMessage[]> {
  try {
    const raw = await AsyncStorage.getItem(keyFor(tailorId));
    const parsed = raw ? (JSON.parse(raw) as LocalChatMessage[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveThread(
  tailorId: string,
  messages: LocalChatMessage[],
): Promise<void> {
  try {
    await AsyncStorage.setItem(
      keyFor(tailorId),
      JSON.stringify(messages.slice(-MAX_STORED)),
    );
  } catch {
    // Best-effort — the chat still works for the session.
  }
}

export async function clearThread(tailorId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(keyFor(tailorId));
  } catch {
    // ignore
  }
}

export function newMessageId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** What a turn sends to the server: role + content of the recent tail.
 *  Error bubbles are skipped — they're device-local noise, not conversation. */
export function toWireHistory(messages: LocalChatMessage[]) {
  return messages
    .filter((m) => m.kind !== 'error' && m.content.trim().length > 0)
    .slice(-SENT_HISTORY)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));
}

// ----------------------------------------------------------------------------
// Confirm-card execution — tool name → typed api-client call
// ----------------------------------------------------------------------------

export interface ExecutedAction {
  /** URL for share-link tools, else null. */
  link: string | null;
}

/**
 * Execute a confirmed ActionPreview through the normal typed api-client and
 * invalidate the right caches. Throws whatever the api-client throws (the
 * screen shows it) — the server has already validated ids in preview, and the
 * API re-validates everything on write exactly as if a form submitted it.
 */
export async function executeAssistantAction(
  action: ActionPreview,
  qc: QueryClient,
): Promise<ExecutedAction> {
  const a = action.args as Record<string, unknown>;

  switch (action.tool) {
    case 'create_client': {
      await api.clients.create(a as unknown as ClientCreateInput);
      await qc.invalidateQueries({ queryKey: ['clients'] });
      return { link: null };
    }
    case 'update_client': {
      const { clientId, ...patch } = a;
      await api.clients.update(clientId as string, patch as ClientUpdateInput);
      await qc.invalidateQueries({ queryKey: ['clients'] });
      return { link: null };
    }
    case 'create_order': {
      await api.orders.create(a as unknown as OrderCreateInput);
      await qc.invalidateQueries({ queryKey: ['orders'] });
      return { link: null };
    }
    case 'update_order': {
      const { orderId, ...patch } = a;
      await api.orders.update(orderId as string, patch as OrderUpdateInput);
      await qc.invalidateQueries({ queryKey: ['orders'] });
      return { link: null };
    }
    case 'set_order_status': {
      await api.orders.transition(a.orderId as string, { to: a.to as OrderStatus });
      await qc.invalidateQueries({ queryKey: ['orders'] });
      return { link: null };
    }
    case 'add_measurements': {
      const clientId = a.clientId as string;
      await api.measurementSets.createForClient(clientId, {
        label: a.label as string,
        values: a.values as Record<string, number>,
        unitPreference: a.unitPreference as MeasurementUnit,
      } satisfies MeasurementSetCreateInput);
      await qc.invalidateQueries({ queryKey: ['clients', clientId, 'measurement-sets'] });
      return { link: null };
    }
    case 'create_invoice': {
      await api.invoices.createForOrder(a.orderId as string);
      await qc.invalidateQueries({ queryKey: ['invoices'] });
      return { link: null };
    }
    case 'mark_invoice_sent': {
      await api.invoices.update(a.invoiceId as string, { status: 'sent' });
      await qc.invalidateQueries({ queryKey: ['invoices'] });
      return { link: null };
    }
    case 'share_order_link': {
      const issued = await api.shareLinks.issueForOrder(a.orderId as string);
      return { link: issued.url };
    }
    case 'share_invoice_link': {
      const issued = await api.invoices.issueLink(a.invoiceId as string);
      await qc.invalidateQueries({ queryKey: ['invoices'] });
      return { link: issued.url };
    }
    default:
      throw new Error(`Unsupported assistant action: ${action.tool}`);
  }
}

// ----------------------------------------------------------------------------
// Localized card composition (key maps — resolved with t() at render)
// ----------------------------------------------------------------------------

/** assistant.* i18n key for each write tool's card title. */
export const ACTION_TITLE_KEY: Record<string, string> = {
  create_client: 'assistant.actionCreateClient',
  update_client: 'assistant.actionUpdateClient',
  create_order: 'assistant.actionCreateOrder',
  update_order: 'assistant.actionUpdateOrder',
  set_order_status: 'assistant.actionSetOrderStatus',
  add_measurements: 'assistant.actionAddMeasurements',
  create_invoice: 'assistant.actionCreateInvoice',
  mark_invoice_sent: 'assistant.actionMarkInvoiceSent',
  share_order_link: 'assistant.actionShareOrderLink',
  share_invoice_link: 'assistant.actionShareInvoiceLink',
};

/** assistant.* i18n key for each ActionPreview.display field label. */
export const DISPLAY_FIELD_KEY: Record<string, string> = {
  clientName: 'assistant.fieldClientName',
  orderName: 'assistant.fieldOrderName',
  phone: 'assistant.fieldPhone',
  due: 'assistant.fieldDue',
  fromStatus: 'assistant.fieldFromStatus',
  toStatus: 'assistant.fieldToStatus',
  label: 'assistant.fieldLabel',
  count: 'assistant.fieldCount',
  invoiceNumber: 'assistant.fieldInvoiceNumber',
};

/** assistant.* i18n key for each read tool, for the "Checked: …" caption. */
export const TOOL_LABEL_KEY: Record<string, string> = {
  search_clients: 'assistant.toolSearchClients',
  get_client: 'assistant.toolGetClient',
  search_orders: 'assistant.toolSearchOrders',
  get_order: 'assistant.toolGetOrder',
  get_client_measurements: 'assistant.toolGetClientMeasurements',
  list_invoices: 'assistant.toolListInvoices',
  list_fabrics: 'assistant.toolListFabrics',
  list_group_orders: 'assistant.toolListGroupOrders',
  get_group_order: 'assistant.toolGetGroupOrder',
  business_summary: 'assistant.toolBusinessSummary',
};
