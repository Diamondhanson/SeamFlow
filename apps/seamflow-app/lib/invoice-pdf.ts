// ============================================================================
// Invoice PDF — build a self-contained HTML document from an invoice and hand
// it to `expo-print` (HTML → PDF on-device), then share the file via the OS
// sheet (`expo-sharing`). No server, works offline; the PDF mirrors the public
// web invoice page.
//
// Labels are passed in (localized by the caller via t()) so the document is
// EN/FR just like the rest of the app.
// ============================================================================

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { formatCurrency } from '@seamflow/utils';
import type { InvoiceLineItem } from '@seamflow/schemas';

export interface InvoicePdfLabels {
  invoice: string;
  billedTo: string;
  subtotal: string;
  deposit: string;
  balanceDue: string;
  notes: string;
  sentBy: string;
  category: Record<InvoiceLineItem['category'], string>;
}

export interface InvoicePdfData {
  number: string;
  dateIso: string;
  clientName: string | null;
  tailorName: string;
  tailorLocation?: string | null;
  currency: string | null;
  lines: InvoiceLineItem[];
  deposit: number;
  notes?: string | null;
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function buildInvoiceHtml(data: InvoicePdfData, labels: InvoicePdfLabels): string {
  const money = (n: number) => (data.currency ? formatCurrency(n, data.currency) : String(n));
  const subtotal = data.lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
  const balance = subtotal - data.deposit;
  const date = new Date(data.dateIso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const rows = data.lines
    .map((l) => {
      const desc = esc(l.description || labels.category[l.category] || '');
      const sub =
        l.quantity > 1 ? `${l.quantity} × ${esc(money(l.unitPrice))}` : '';
      return `
        <tr>
          <td>
            <div class="desc">${desc}</div>
            <div class="cat">${esc(labels.category[l.category] ?? l.category)}${
              sub ? ` · ${sub}` : ''
            }</div>
          </td>
          <td class="amt">${esc(money(l.quantity * l.unitPrice))}</td>
        </tr>`;
    })
    .join('');

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 44px 40px;
    background: #F5F1EA;
    color: #1A1714;
    font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    font-size: 22px;
    line-height: 1.5;
  }
  .head { text-align: center; margin-bottom: 30px; }
  .rule { width: 48px; height: 3px; background: #C06A3E; margin: 0 auto 16px; }
  .biz { font-family: Georgia, "Times New Roman", serif; font-size: 34px; font-weight: 700; letter-spacing: -0.2px; }
  .loc { color: #5B554F; font-size: 20px; margin-top: 4px; }
  .card { border: 1px solid #E1D9CB; border-radius: 18px; background: #FBF8F2; padding: 28px; }
  .toprow { display: flex; justify-content: space-between; align-items: flex-start; }
  .eyebrow { font-size: 15px; letter-spacing: 2px; text-transform: uppercase; color: #8A8178; margin-bottom: 6px; }
  .num { font-family: Georgia, "Times New Roman", serif; font-size: 46px; font-weight: 700; }
  .date { color: #5B554F; font-size: 20px; }
  .meta { display: flex; gap: 24px; margin: 20px 0 8px; }
  .meta div { flex: 1; }
  table { width: 100%; border-collapse: collapse; margin-top: 18px; }
  th { text-align: left; font-size: 15px; letter-spacing: 1.5px; text-transform: uppercase; color: #8A8178; padding: 8px 0; border-bottom: 1px solid #E1D9CB; }
  th.r, td.amt { text-align: right; }
  td { padding: 13px 0; border-bottom: 1px solid #EFE9DE; vertical-align: top; }
  .desc { font-size: 24px; }
  .cat { color: #8A8178; font-size: 17px; margin-top: 3px; }
  .amt { font-variant-numeric: tabular-nums; white-space: nowrap; }
  .totals { margin-top: 20px; }
  .totrow { display: flex; justify-content: space-between; padding: 6px 0; }
  .totrow .lbl { color: #5B554F; }
  .totrow .val { font-variant-numeric: tabular-nums; }
  .balance { display: flex; justify-content: space-between; align-items: baseline; margin-top: 12px; padding-top: 14px; border-top: 1px solid #D8CFBE; }
  .balance .lbl { font-family: Georgia, serif; font-size: 28px; font-weight: 700; }
  .balance .val { font-size: 28px; font-weight: 700; font-variant-numeric: tabular-nums; }
  .notes { margin-top: 20px; border: 1px solid #EFE9DE; border-radius: 12px; padding: 16px; background: #F5F1EA; }
  .notes .eyebrow { margin-bottom: 8px; }
  .foot { text-align: center; color: #8A8178; font-size: 17px; margin-top: 30px; }
</style>
</head>
<body>
  <div class="head">
    <div class="rule"></div>
    <div class="biz">${esc(data.tailorName)}</div>
    ${data.tailorLocation ? `<div class="loc">${esc(data.tailorLocation)}</div>` : ''}
  </div>

  <div class="card">
    <div class="toprow">
      <div>
        <div class="eyebrow">${esc(labels.invoice)}</div>
        <div class="num">${esc(data.number)}</div>
      </div>
      <div class="date">${esc(date)}</div>
    </div>

    <div class="meta">
      <div>
        <div class="eyebrow">${esc(labels.billedTo)}</div>
        <div>${esc(data.clientName ?? '—')}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr><th>&nbsp;</th><th class="r">&nbsp;</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <div class="totals">
      <div class="totrow"><span class="lbl">${esc(labels.subtotal)}</span><span class="val">${esc(money(subtotal))}</span></div>
      ${
        data.deposit > 0
          ? `<div class="totrow"><span class="lbl">${esc(labels.deposit)}</span><span class="val">− ${esc(money(data.deposit))}</span></div>`
          : ''
      }
      <div class="balance"><span class="lbl">${esc(labels.balanceDue)}</span><span class="val">${esc(money(balance))}</span></div>
    </div>

    ${
      data.notes && data.notes.trim()
        ? `<div class="notes"><div class="eyebrow">${esc(labels.notes)}</div><div>${esc(data.notes).replace(/\n/g, '<br/>')}</div></div>`
        : ''
    }
  </div>

  <div class="foot">${esc(labels.sentBy)} ${esc(data.tailorName)} · SeamFlow</div>
</body>
</html>`;
}

/** Render `html` to a PDF on-device and open the OS share sheet. */
export async function shareInvoicePdf(html: string, dialogTitle: string): Promise<void> {
  const { uri } = await Print.printToFileAsync({ html });
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing is not available on this device');
  }
  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
    dialogTitle,
  });
}
