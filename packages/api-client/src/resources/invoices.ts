import type { HttpClient } from '../http';
import type {
  InvoiceWithContext,
  InvoiceUpdateInput,
  InvoiceLinkResponse,
  PublicInvoiceResponse,
} from '@seamflow/schemas';

export interface ListInvoicesResponse {
  items: InvoiceWithContext[];
}

export function makeInvoicesResource(http: HttpClient) {
  return {
    /** Create (or open the existing) invoice for an order. */
    createForOrder(orderId: string): Promise<InvoiceWithContext> {
      return http.post<InvoiceWithContext>(`/orders/${orderId}/invoice`);
    },
    list(): Promise<ListInvoicesResponse> {
      return http.get<ListInvoicesResponse>('/invoices');
    },
    get(id: string): Promise<InvoiceWithContext> {
      return http.get<InvoiceWithContext>(`/invoices/${id}`);
    },
    update(id: string, input: InvoiceUpdateInput): Promise<InvoiceWithContext> {
      return http.patch<InvoiceWithContext>(`/invoices/${id}`, input);
    },
    delete(id: string): Promise<void> {
      return http.delete<void>(`/invoices/${id}`);
    },
    /** Mint a fresh public link (marks the invoice sent on first issue). */
    issueLink(id: string): Promise<InvoiceLinkResponse> {
      return http.post<InvoiceLinkResponse>(`/invoices/${id}/link`);
    },
    /** Resolve a public invoice token (no auth). Used server-side by the web app. */
    resolvePublic(token: string): Promise<PublicInvoiceResponse> {
      return http.get<PublicInvoiceResponse>(
        `/public/invoices/${encodeURIComponent(token)}`,
      );
    },
  };
}

export type InvoicesResource = ReturnType<typeof makeInvoicesResource>;
