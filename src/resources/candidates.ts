import { BaseResource } from "./base.js";
import type { Candidate, Paginated } from "../models.js";

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
  create(params: CandidateCreateParams): Promise<Candidate> {
    return this.request<Candidate>({ method: "POST", path: "/candidates", body: params });
  }

  get(candidateId: string): Promise<Candidate> {
    return this.request<Candidate>({ method: "GET", path: `/candidates/${candidateId}` });
  }

  list(params: { page?: number; per_page?: number } = {}): Promise<Paginated<Candidate>> {
    return this.request<Paginated<Candidate>>({
      method: "GET",
      path: "/candidates",
      query: { page: params.page ?? 1, per_page: params.per_page ?? 25 },
    });
  }

  update(
    candidateId: string,
    fields: Partial<CandidateCreateParams> & Record<string, unknown>,
  ): Promise<Candidate> {
    return this.request<Candidate>({
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
  ): Promise<Candidate> {
    const { external_id, ...body } = params;
    return this.request<Candidate>({
      method: "PUT",
      path: `/candidates/by-external-id/${encodeURIComponent(external_id)}`,
      body,
    });
  }

  delete(candidateId: string): Promise<void> {
    return this.request<void>({ method: "DELETE", path: `/candidates/${candidateId}` });
  }
}
