import { BaseResource } from "./base.js";
import type { DisputeCreateBody, DisputeResponse } from "../api-types.js";
import type { Paginated } from "../models.js";

/**
 * Params for ``client.disputes.create()``.
 *
 * @deprecated Prefer ``DisputeCreateBody`` (re-exported from ``@gonos/sdk``).
 * The prior hand-written shape shipped the wrong field names — it sent
 * ``disputed_items`` and ``explanation`` where the spec expects
 * ``disputed_item_ids`` and ``reason`` + ``reason_detail``. Every call
 * ended in a 422; the SDK effectively made this endpoint unreachable.
 * The type alias below now resolves to the spec body so existing imports
 * still typecheck but must supply the correct field names. Kept as an
 * alias only for source compat with import statements; the shape has
 * intentionally changed. See #654 / #754 item 3.
 */
export type DisputeCreateParams = DisputeCreateBody;

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

  create(params: DisputeCreateBody): Promise<DisputeResponse> {
    return this.request<DisputeResponse>({
      method: "POST",
      path: "/disputes",
      body: params,
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
