import { BaseResource } from "./base.js";
import type { DisputeResponse } from "../api-types.js";
import type { Paginated } from "../models.js";

export interface DisputeCreateParams {
  check_id: string;
  report_id: string;
  disputed_items: string[];
  explanation?: string;
}

export class DisputesResource extends BaseResource {
  list(
    params: { page?: number; per_page?: number; status?: string } = {},
  ): Promise<Paginated<DisputeResponse>> {
    return this.request<Paginated<DisputeResponse>>({
      method: "GET",
      path: "/disputes",
      query: {
        page: params.page ?? 1,
        per_page: params.per_page ?? 25,
        status: params.status,
      },
    });
  }

  get(disputeId: string): Promise<DisputeResponse> {
    return this.request<DisputeResponse>({ method: "GET", path: `/disputes/${encodeURIComponent(disputeId)}` });
  }

  create(params: DisputeCreateParams): Promise<DisputeResponse> {
    return this.request<DisputeResponse>({
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
  ): Promise<DisputeResponse> {
    return this.request<DisputeResponse>({
      method: "POST",
      path: `/disputes/${encodeURIComponent(disputeId)}/evidence`,
      body: { evidence_type: params.evidence_type, content: params.content },
    });
  }
}
