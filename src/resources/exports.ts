import { BaseResource } from "./base.js";
import type { ExportCreateBody, ExportResponse } from "../api-types.js";
import type { Paginated } from "../models.js";

/**
 * Params for ``client.exports.create()``.
 *
 * @deprecated Prefer ``ExportCreateBody`` (re-exported from ``@gonos/sdk``).
 * The prior hand-written shape accepted a ``filters`` field that the
 * server has never defined — it was silently ignored, so callers
 * expecting scoped exports actually got full exports and no signal.
 * The spec body accepts ``export_type`` + ``format``. Kept as an alias
 * for source compat; the shape has intentionally changed. See #654.
 */
export type ExportCreateParams = ExportCreateBody;

export class ExportsResource extends BaseResource {
  create(params: ExportCreateBody): Promise<ExportResponse> {
    return this.request<ExportResponse>({
      method: "POST",
      path: "/exports",
      body: params,
    });
  }

  get(exportId: string): Promise<ExportResponse> {
    return this.request<ExportResponse>({ method: "GET", path: `/exports/${encodeURIComponent(exportId)}` });
  }

  list(params: { page?: number; per_page?: number } = {}): Promise<Paginated<ExportResponse>> {
    return this.request<Paginated<ExportResponse>>({
      method: "GET",
      path: "/exports",
      query: { page: params.page ?? 1, per_page: params.per_page ?? 25 },
    });
  }
}
