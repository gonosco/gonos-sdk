import { BaseResource } from "./base.js";
import type { Check, Paginated } from "../models.js";

export interface CheckCreateParams {
  candidate_id: string;
  /** Package slug. Defaults to "standard". */
  package?: string;
  /** FCRA permissible purpose. Defaults to "employment". */
  permissible_purpose?: string;
  purpose_certification?: boolean;
  /** Set to make creation idempotent (sent as the Idempotency-Key header). */
  idempotency_key?: string;
}

export class ChecksResource extends BaseResource {
  create(params: CheckCreateParams): Promise<Check> {
    const {
      candidate_id,
      package: pkg = "standard",
      permissible_purpose = "employment",
      purpose_certification = true,
      idempotency_key,
    } = params;
    return this.request<Check>({
      method: "POST",
      path: "/checks",
      body: {
        candidate_id,
        package: pkg,
        permissible_purpose,
        purpose_certification,
      },
      headers: idempotency_key ? { "Idempotency-Key": idempotency_key } : undefined,
    });
  }

  submit(checkId: string): Promise<Check> {
    return this.request<Check>({ method: "POST", path: `/checks/${checkId}/submit` });
  }

  get(checkId: string): Promise<Check> {
    return this.request<Check>({ method: "GET", path: `/checks/${checkId}` });
  }

  list(
    params: { page?: number; per_page?: number; status?: string } = {},
  ): Promise<Paginated<Check>> {
    return this.request<Paginated<Check>>({
      method: "GET",
      path: "/checks",
      query: {
        page: params.page ?? 1,
        per_page: params.per_page ?? 25,
        status: params.status,
      },
    });
  }

  cancel(checkId: string): Promise<Check> {
    return this.request<Check>({ method: "POST", path: `/checks/${checkId}/cancel` });
  }
}
