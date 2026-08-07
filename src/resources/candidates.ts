// Paths below are host-relative — `/api/v1` is applied by
// `BaseResource.request`, not written into each path here.
import { BaseResource } from "./base.js";
import type { CandidateResponse } from "../api-types.js";
import type { Paginated } from "../models.js";

export interface CandidateCreateParams {
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  date_of_birth?: string;
  ssn_last_four?: string;
  external_id?: string;
  address_line1?: string;
  address_city?: string;
  address_state?: string;
  address_zip?: string;
}

export class CandidatesResource extends BaseResource {
  create(params: CandidateCreateParams): Promise<CandidateResponse> {
    return this.request<CandidateResponse>({ method: "POST", path: "/candidates", body: params });
  }

  get(candidateId: string): Promise<CandidateResponse> {
    return this.request<CandidateResponse>({ method: "GET", path: `/candidates/${candidateId}` });
  }

  list(params: { page?: number; per_page?: number } = {}): Promise<Paginated<CandidateResponse>> {
    return this.request<Paginated<CandidateResponse>>({
      method: "GET",
      path: "/candidates",
      query: { page: params.page ?? 1, per_page: params.per_page ?? 25 },
    });
  }

  update(
    candidateId: string,
    fields: Partial<CandidateCreateParams> & Record<string, unknown>,
  ): Promise<CandidateResponse> {
    return this.request<CandidateResponse>({
      method: "PATCH",
      path: `/candidates/${candidateId}`,
      body: fields,
    });
  }

  /**
   * Create-or-update a candidate keyed by the partner-side ``external_id``.
   *
   * Wraps ``PUT /candidates/by-external-id/{external_id}``. Prefer this over
   * the ``create`` → ``DUPLICATE_EXTERNAL_ID`` → look-up-and-``update`` dance
   * every retry pattern needs. Returns the merged candidate whether it was
   * created (201) or updated (200); the transport status is not exposed.
   *
   * The URL identifies the row; any ``external_id`` on the body is ignored.
   */
  upsert(
    params: { external_id: string } & Partial<Omit<CandidateCreateParams, "external_id">>,
  ): Promise<CandidateResponse> {
    const { external_id, ...body } = params;
    return this.request<CandidateResponse>({
      method: "PUT",
      path: `/candidates/by-external-id/${encodeURIComponent(external_id)}`,
      body,
    });
  }

  delete(candidateId: string): Promise<void> {
    return this.request<void>({ method: "DELETE", path: `/candidates/${candidateId}` });
  }
}
