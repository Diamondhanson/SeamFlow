'use server';

// ============================================================================
// The only three things this dashboard can change.
//
// Each one exists because a health check finds real broken rows and somebody
// has to fix them. This is a cleanup tool, not an admin console — see
// ./guard.ts for the allowlist that enforces that, and for why the boundary is
// drawn where it is.
//
// Three properties hold for every action here:
//
//   NARROW      each one names its own rows in SQL. None takes an id from the
//               client and deletes it, so a crafted request cannot widen the
//               blast radius beyond what the health check already found.
//   ATOMIC      multi-statement work runs in a transaction. A merge that
//               repoints orders and then fails before deleting the duplicate
//               would leave the data worse than it found it.
//   LOGGED      every run appends to .ops-audit.log with what it touched.
//               Without a login there is no "who", so "what and when" is the
//               least the tool owes you.
// ============================================================================

import { revalidatePath } from 'next/cache';
import { appendFile } from 'node:fs/promises';
import path from 'node:path';
import { sql } from './db';
import { assertSafeMutation, SAFE_MUTATIONS, type SafeMutation } from './guard';

export interface ActionResult {
  ok: boolean;
  message: string;
  details?: string[];
}

async function audit(op: SafeMutation, result: ActionResult) {
  const line = JSON.stringify({
    at: new Date().toISOString(),
    op,
    ok: result.ok,
    message: result.message,
    details: result.details ?? [],
  });
  try {
    await appendFile(path.join(process.cwd(), '.ops-audit.log'), `${line}\n`, 'utf8');
  } catch {
    // A failed audit write must not roll back work that already committed —
    // but it must not pass silently either.
    console.error('[ops] could not write .ops-audit.log:', line);
  }
}

async function run(op: SafeMutation, fn: () => Promise<ActionResult>): Promise<ActionResult> {
  assertSafeMutation(op);
  let result: ActionResult;
  try {
    result = await fn();
  } catch (err) {
    result = { ok: false, message: err instanceof Error ? err.message : String(err) };
  }
  await audit(op, result);
  revalidatePath('/health');
  revalidatePath('/clients');
  revalidatePath('/invoices');
  revalidatePath('/', 'layout');
  return result;
}

// ---------------------------------------------------------------------------

/**
 * Merge clients that share a phone number under the same tailor.
 *
 * Keeps the OLDEST row — it is the one with the longest history and the most
 * likely to be referenced elsewhere — fills any blank field on it from its
 * duplicates, repoints every child record, and deletes what is left.
 *
 * The repointing list is exhaustive on purpose. `clients.id` is referenced
 * from four places, and missing one would either orphan rows or trip a foreign
 * key at the delete and roll the whole thing back.
 */
export async function mergeDuplicateClients(): Promise<ActionResult> {
  return run('clients.merge-duplicates', async () => {
    const details: string[] = [];

    await sql.begin(async (tx) => {
      const groups = await tx`
        select tailor_id, phone, array_agg(id order by created_at) as ids,
               count(*)::int as copies
        from clients
        where phone is not null and phone <> '' and phone <> '—'
        group by tailor_id, phone having count(*) > 1
      `;

      for (const g of groups) {
        const ids = g.ids as string[];
        const [keep, ...drop] = ids;

        // Fill blanks on the keeper from its duplicates before they go.
        await tx`
          update clients k set
            full_name = coalesce(nullif(k.full_name,''), d.full_name),
            email     = coalesce(nullif(k.email,''),     d.email),
            address   = coalesce(nullif(nullif(k.address,''),'—'), nullif(d.address,'—')),
            notes     = coalesce(nullif(k.notes,''),     d.notes),
            updated_at = now()
          from (
            select
              max(full_name) filter (where full_name <> '') as full_name,
              max(email)     filter (where email     <> '') as email,
              max(address)   filter (where address not in ('', '—')) as address,
              max(notes)     filter (where notes     <> '') as notes
            from clients where id = any(${drop})
          ) d
          where k.id = ${keep}
        `;

        await tx`update orders             set client_id = ${keep} where client_id = any(${drop})`;
        await tx`update measurement_sets   set client_id = ${keep} where client_id = any(${drop})`;
        await tx`update group_order_members set client_id = ${keep} where client_id = any(${drop})`;
        await tx`update group_orders       set owner_client_id = ${keep} where owner_client_id = any(${drop})`;
        await tx`delete from clients where id = any(${drop})`;

        details.push(`${g.phone}: merged ${drop.length} duplicate(s) into the oldest record`);
      }
    });

    return details.length === 0
      ? { ok: true, message: 'No duplicates to merge.' }
      : { ok: true, message: `Merged ${details.length} duplicate group(s).`, details };
  });
}

/**
 * Replace the literal '—' placeholder with NULL.
 *
 * The app writes that character when a phone or address is unknown at enquiry
 * time. Stored as data it is indistinguishable from a real value: it renders
 * in the contact field, it is searchable, and it makes every duplicate check
 * think a hundred clients share a phone number. NULL means unknown; '—' is a
 * dash pretending to.
 */
export async function clearPlaceholderContacts(): Promise<ActionResult> {
  return run('clients.clear-placeholders', async () => {
    const rows = await sql`
      update clients
      set phone   = nullif(phone, '—'),
          address = nullif(address, '—'),
          updated_at = now()
      where phone = '—' or address = '—'
      returning id
    `;
    return rows.length === 0
      ? { ok: true, message: 'No placeholder values found.' }
      : { ok: true, message: `Cleared placeholders on ${rows.length} client record(s).` };
  });
}

/**
 * Delete draft invoices that total zero.
 *
 * Guarded three ways: draft only (a sent invoice is a document someone may
 * have already shown a client), zero total only, and no payment recorded
 * against the order. The payment check is belt-and-braces — a zero-total
 * invoice should never have one — but "should never" is exactly the assumption
 * worth spending one EXISTS on before a DELETE.
 */
export async function deleteEmptyDraftInvoices(): Promise<ActionResult> {
  return run('invoices.delete-empty-drafts', async () => {
    const rows = await sql`
      delete from invoices i
      where i.status = 'draft'
        and i.total = 0
        and not exists (select 1 from payments p where p.order_id = i.order_id)
      returning i.number
    `;
    return rows.length === 0
      ? { ok: true, message: 'No empty drafts to delete.' }
      : {
          ok: true,
          message: `Deleted ${rows.length} empty draft invoice(s).`,
          details: rows.map((r) => r.number as string),
        };
  });
}

/** Dispatch by name, so the UI never holds a direct reference to a mutation. */
export async function runCleanup(op: string): Promise<ActionResult> {
  assertSafeMutation(op);
  switch (op) {
    case 'clients.merge-duplicates':
      return mergeDuplicateClients();
    case 'clients.clear-placeholders':
      return clearPlaceholderContacts();
    case 'invoices.delete-empty-drafts':
      return deleteEmptyDraftInvoices();
  }
}

export async function describeCleanup(op: SafeMutation): Promise<string> {
  return SAFE_MUTATIONS[op];
}
