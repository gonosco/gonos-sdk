import { BaseResource } from "./base.js";
import type { ConsentSession, Paginated } from "../models.js";

export interface ConsentCreateParams {
  candidate_id: string;
  check_id?: string;
  /** Disclosure type. Defaults to "standard". */
  disclosure_type?: string;
}

export class ConsentResource extends BaseResource {
  create(params: ConsentCreateParams): Promise<ConsentSession> {
    return this.request<ConsentSession>({
      method: "POST",
      path: "/consent-sessions",
      body: {
        candidate_id: params.candidate_id,
        check_id: params.check_id ?? null,
        disclosure_type: params.disclosure_type ?? "standard",
      },
    });
  }

  get(sessionId: string): Promise<ConsentSession> {
    return this.request<ConsentSession>({
      method: "GET",
      path: `/consent-sessions/${sessionId}`,
    });
  }

  list(
    params: { page?: number; per_page?: number } = {},
  ): Promise<Paginated<ConsentSession>> {
    return this.request<Paginated<ConsentSession>>({
      method: "GET",
      path: "/consent-sessions",
      query: { page: params.page ?? 1, per_page: params.per_page ?? 25 },
    });
  }
}
