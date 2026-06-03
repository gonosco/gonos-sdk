import { BaseResource } from "./base.js";
import type { Invoice, Paginated } from "../models.js";

export class BillingResource extends BaseResource {
  list_invoices(
    params: { page?: number; per_page?: number } = {},
  ): Promise<Paginated<Invoice>> {
    return this.request<Paginated<Invoice>>({
      method: "GET",
      path: "/billing/invoices",
      query: { page: params.page ?? 1, per_page: params.per_page ?? 25 },
    });
  }

  get_invoice(invoiceId: string): Promise<Invoice> {
    return this.request<Invoice>({
      method: "GET",
      path: `/billing/invoices/${invoiceId}`,
    });
  }

  get_subscription(): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>({
      method: "GET",
      path: "/billing/subscription",
    });
  }
}
