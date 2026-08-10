// Paths below are host-relative — `/api/v1` is applied by
// `BaseResource.request`, not written into each path here.
import { BaseResource } from "./base.js";
import type {
  CandidateCreateBody,
  CandidateResponse,
  CandidateUpdateBody,
} from "../api-types.js";
import type { Paginated } from "../models.js";

/**
 * Params for ``client.candidates.create()``.
 *
 * @deprecated Prefer ``CandidateCreateBody`` (re-exported from ``@gonos/sdk``)
 * — the generated spec type covers every field the server accepts. This
 * hand-written interface pinned an 11-field subset and silently dropped
 * ``middle_name``, ``name_prefix``, ``name_suffix``, ``alternate_email``,
 * ``address_line2``, ``address_country``, ``preferred_language``,
 * ``preferred_notification_channel``, and ``accommodation_requested``.
 * Kept as a type alias for source compat; new call sites should use the
 * generated body type directly. Removal is a semver-major bump (#654).
 */
export type CandidateCreateParams = CandidateCreateBody;

export class CandidatesResource extends BaseResource {
  create(
    params: CandidateCreateBody & { idempotency_key?: string },
  ): Promise<CandidateResponse> {
    const { idempotency_key, ...body } = params;
    return this.request<CandidateResponse>({
      method: "POST",
      path: "/candidates",
      body,
      headers: idempotency_key ? { "Idempotency-Key": idempotency_key } : undefined,
    });
  }

  get(candidateId: string): Promise<CandidateResponse> {
    return this.request<CandidateResponse>({ method: "GET", path: `/candidates/${encodeURIComponent(candidateId)}` });
  }

  list(params: { page?: number; per_page?: number } = {}): Promise<Paginated<CandidateResponse>> {
    return this.request<Paginated<CandidateResponse>>({
      method: "GET",
      path: "/candidates",
      query: { page: params.page ?? 1, per_page: params.per_page ?? 25 },
    });
  }

  update(candidateId: string, fields: CandidateUpdateBody): Promise<CandidateResponse> {
    return this.request<CandidateResponse>({
      method: "PATCH",
      path: `/candidates/${encodeURIComponent(candidateId)}`,
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
    params: { external_id: string; idempotency_key?: string } & Omit<
      CandidateCreateBody,
      "external_id"
    >,
  ): Promise<CandidateResponse> {
    const { external_id, idempotency_key, ...body } = params;
    return this.request<CandidateResponse>({
      method: "PUT",
      path: `/candidates/by-external-id/${encodeURIComponent(external_id)}`,
      body,
      headers: idempotency_key ? { "Idempotency-Key": idempotency_key } : undefined,
    });
  }

  delete(candidateId: string): Promise<void> {
    return this.request<void>({ method: "DELETE", path: `/candidates/${encodeURIComponent(candidateId)}` });
  }
}
