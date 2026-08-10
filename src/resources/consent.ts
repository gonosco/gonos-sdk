// Paths below are host-relative — `/api/v1` is applied by
// `BaseResource.request`, not written into each path here.
import { BaseResource } from "./base.js";
import type {
  ConsentSessionCreateBody,
  ConsentSessionResponse,
} from "../api-types.js";
import type { Paginated } from "../models.js";

/**
 * Params for ``client.consent.create()`` — the spec-defined body plus the
 * SDK-side ``idempotency_key`` header knob.
 *
 * @deprecated Prefer ``ConsentSessionCreateBody`` (re-exported from
 * ``@gonos/sdk``). Kept as a type alias so existing imports resolve.
 * Removal is a semver-major bump (#654).
 */
export type ConsentCreateParams = ConsentSessionCreateBody & {
  /** Set to make creation idempotent (sent as the ``Idempotency-Key`` header). */
  idempotency_key?: string;
};

export class ConsentResource extends BaseResource {
  create(
    params: ConsentSessionCreateBody & { idempotency_key?: string },
  ): Promise<ConsentSessionResponse> {
    const { idempotency_key, ...body } = params;
    return this.request<ConsentSessionResponse>({
      method: "POST",
      path: "/consent-sessions",
      body,
      headers: idempotency_key ? { "Idempotency-Key": idempotency_key } : undefined,
    });
  }

  get(sessionId: string): Promise<ConsentSessionResponse> {
    return this.request<ConsentSessionResponse>({
      method: "GET",
      path: `/consent-sessions/${encodeURIComponent(sessionId)}`,
    });
  }

  list(
    params: { page?: number; per_page?: number } = {},
  ): Promise<Paginated<ConsentSessionResponse>> {
    return this.request<Paginated<ConsentSessionResponse>>({
      method: "GET",
      path: "/consent-sessions",
      query: { page: params.page ?? 1, per_page: params.per_page ?? 25 },
    });
  }
}
