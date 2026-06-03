import { BaseResource } from "./base.js";
import type { Export, Paginated } from "../models.js";

export interface ExportCreateParams {
  export_type: string;
  filters?: Record<string, unknown>;
}

export class ExportsResource extends BaseResource {
  create(params: ExportCreateParams): Promise<Export> {
    return this.request<Export>({
      method: "POST",
      path: "/exports",
      body: { export_type: params.export_type, filters: params.filters ?? null },
    });
  }

  get(exportId: string): Promise<Export> {
    return this.request<Export>({ method: "GET", path: `/exports/${exportId}` });
  }

  list(params: { page?: number; per_page?: number } = {}): Promise<Paginated<Export>> {
    return this.request<Paginated<Export>>({
      method: "GET",
      path: "/exports",
      query: { page: params.page ?? 1, per_page: params.per_page ?? 25 },
    });
  }
}
