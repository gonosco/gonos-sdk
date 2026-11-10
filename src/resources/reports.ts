import { BaseResource } from "./base.js";
import type { CheckItemResponse, ReportResponse } from "../api-types.js";

export class ReportsResource extends BaseResource {
  /** Fetch the current report for a check. */
  async get(checkId: string): Promise<ReportResponse> {
    return this.request<ReportResponse>({
      method: "GET",
      path: `/checks/${encodeURIComponent(checkId)}/report`,
    });
  }

  /** List the individual check items (one per data source). */
  async items(checkId: string): Promise<CheckItemResponse[]> {
    const data = await this.request<{ items?: CheckItemResponse[] } | CheckItemResponse[]>({
      method: "GET",
      path: `/checks/${encodeURIComponent(checkId)}/items`,
    });
    if (Array.isArray(data)) return data;
    return data.items ?? [];
  }
}
