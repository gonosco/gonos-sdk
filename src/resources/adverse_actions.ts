import { BaseResource } from "./base.js";
import type { AdverseActionResponse } from "../api-types.js";
import type { Paginated } from "../models.js";

export interface AdverseActionCreateParams {
  check_id: string;
  report_id: string;
  adverse_reasons: string[];
}

export class AdverseActionsResource extends BaseResource {
  create(params: AdverseActionCreateParams): Promise<AdverseActionResponse> {
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
