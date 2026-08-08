import { BaseResource } from "./base.js";
import type { ExportResponse } from "../api-types.js";
import type { Paginated } from "../models.js";

export interface ExportCreateParams {
  export_type: string;
  filters?: Record<string, unknown>;
}

export class ExportsResource extends BaseResource {
  create(params: ExportCreateParams): Promise<ExportResponse> {
    return this.request<ExportResponse>({
      method: "POST",
      path: "/exports",
      body: { export_type: params.export_type, filters: params.filters ?? null },
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
