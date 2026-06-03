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

  delete(candidateId: string): Promise<void> {
    return this.request<void>({ method: "DELETE", path: `/candidates/${candidateId}` });
  }
}
