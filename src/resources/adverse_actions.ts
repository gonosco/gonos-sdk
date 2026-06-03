import { BaseResource } from "./base.js";
import type { AdverseAction, Paginated } from "../models.js";

export interface AdverseActionCreateParams {
  check_id: string;
  report_id: string;
  adverse_reasons: string[];
}

export class AdverseActionsResource extends BaseResource {
  create(params: AdverseActionCreateParams): Promise<AdverseAction> {
    return this.request<AdverseAction>({
      method: "POST",
      path: "/adverse-actions",
      body: params,
    });
  }

  get(actionId: string): Promise<AdverseAction> {
    return this.request<AdverseAction>({
      method: "GET",
      path: `/adverse-actions/${actionId}`,
    });
  }

  list(
    params: { page?: number; per_page?: number } = {},
  ): Promise<Paginated<AdverseAction>> {
    return this.request<Paginated<AdverseAction>>({
      method: "GET",
      path: "/adverse-actions",
      query: { page: params.page ?? 1, per_page: params.per_page ?? 25 },
    });
  }

  finalize(actionId: string, params: { platform_decision: string }): Promise<AdverseAction> {
    return this.request<AdverseAction>({
      method: "POST",
      path: `/adverse-actions/${actionId}/finalize`,
      body: { platform_decision: params.platform_decision },
    });
  }
}
