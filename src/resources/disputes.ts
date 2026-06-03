import { BaseResource } from "./base.js";
import type { Dispute, Paginated } from "../models.js";

export interface DisputeCreateParams {
  check_id: string;
  report_id: string;
  disputed_items: string[];
  explanation?: string;
}

export class DisputesResource extends BaseResource {
  list(
    params: { page?: number; per_page?: number; status?: string } = {},
  ): Promise<Paginated<Dispute>> {
    return this.request<Paginated<Dispute>>({
      method: "GET",
      path: "/disputes",
      query: {
        page: params.page ?? 1,
        per_page: params.per_page ?? 25,
        status: params.status,
      },
    });
  }

  get(disputeId: string): Promise<Dispute> {
    return this.request<Dispute>({ method: "GET", path: `/disputes/${disputeId}` });
  }

  create(params: DisputeCreateParams): Promise<Dispute> {
    return this.request<Dispute>({
      method: "POST",
      path: "/disputes",
      body: {
        check_id: params.check_id,
        report_id: params.report_id,
        disputed_items: params.disputed_items,
        explanation: params.explanation ?? null,
      },
    });
  }

  add_evidence(
    disputeId: string,
    params: { evidence_type: string; content: string },
  ): Promise<Dispute> {
    return this.request<Dispute>({
      method: "POST",
      path: `/disputes/${disputeId}/evidence`,
      body: { evidence_type: params.evidence_type, content: params.content },
    });
  }
}
