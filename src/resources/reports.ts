import { BaseResource } from "./base.js";
import { NotFoundError } from "../errors.js";
import type { CheckItem, Report } from "../models.js";

export class ReportsResource extends BaseResource {
  /** Fetch the report for a check. The endpoint is paginated; returns the
   * first (most recent) report, or throws NotFoundError if none exists. */
  async get(checkId: string): Promise<Report> {
    const data = await this.request<{ items?: Report[] } & Report>({
      method: "GET",
      path: "/reports",
      query: { check_id: checkId },
    });
    const items = data.items ?? [data];
    const first = items[0];
    if (first) return first;
    throw new NotFoundError({
      status_code: 404,
      error: "not_found",
      detail: "No report found",
    });
  }

  /** List the individual check items (one per data source). */
  async items(checkId: string): Promise<CheckItem[]> {
    const data = await this.request<{ items?: CheckItem[] } | CheckItem[]>({
      method: "GET",
      path: `/checks/${checkId}/items`,
    });
    if (Array.isArray(data)) return data;
    return data.items ?? [];
  }
}
