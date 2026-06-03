import { BaseResource } from "./base.js";

export class AnalyticsResource extends BaseResource {
  get_overview(
    params: { start_date?: string; end_date?: string } = {},
  ): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>({
      method: "GET",
      path: "/analytics/overview",
      query: { start_date: params.start_date, end_date: params.end_date },
    });
  }

  get_check_volume(
    params: { start_date?: string; end_date?: string } = {},
  ): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>({
      method: "GET",
      path: "/analytics/check-volume",
      query: { start_date: params.start_date, end_date: params.end_date },
    });
  }
}
