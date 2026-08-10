import { BaseResource } from "./base.js";
import type {
  AdverseActionCreateBody,
  AdverseActionResponse,
} from "../api-types.js";
import type { Paginated } from "../models.js";

/**
 * Params for ``client.adverse_actions.create()``.
 *
 * @deprecated Prefer ``AdverseActionCreateBody`` (re-exported from
 * ``@gonos/sdk``). The generated spec type covers ``credit_score_disclosure``
 * and ``waiting_period_days`` — both silently dropped by this hand-written
 * interface. Kept as a type alias so existing imports resolve. Removal is
 * a semver-major bump (#654).
 */
export type AdverseActionCreateParams = AdverseActionCreateBody;

export class AdverseActionsResource extends BaseResource {
  create(params: AdverseActionCreateBody): Promise<AdverseActionResponse> {
    return this.request<AdverseActionResponse>({
      method: "POST",
      path: "/adverse-actions",
      body: params,
    });
  }

  get(actionId: string): Promise<AdverseActionResponse> {
    return this.request<AdverseActionResponse>({
      method: "GET",
      path: `/adverse-actions/${encodeURIComponent(actionId)}`,
    });
  }

  list(
    params: { page?: number; per_page?: number } = {},
  ): Promise<Paginated<AdverseActionResponse>> {
    return this.request<Paginated<AdverseActionResponse>>({
      method: "GET",
      path: "/adverse-actions",
      query: { page: params.page ?? 1, per_page: params.per_page ?? 25 },
    });
  }

  finalize(actionId: string, params: { platform_decision: string }): Promise<AdverseActionResponse> {
    return this.request<AdverseActionResponse>({
      method: "POST",
      path: `/adverse-actions/${encodeURIComponent(actionId)}/finalize`,
      body: { platform_decision: params.platform_decision },
    });
  }
}
