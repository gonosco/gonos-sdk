// Paths below are host-relative — `/api/v1` is applied by
// `BaseResource.request`, not written into each path here.
import { BaseResource } from "./base.js";
import { GonosError } from "../errors.js";
import type { CheckResponse } from "../api-types.js";
import type { Paginated } from "../models.js";

/**
 * #733 (0.1.1):
 *
 * - ``certification_text_hash`` added — required by orgs that have
 *   ``enforce_canonical_certification_hash`` on. 0.1.0 dropped it
 *   silently, guaranteeing a 422 on those orgs.
 * - ``disposition`` added — sandbox-only ergonomic that folds into
 *   the ``X-Gonos-Test-Disposition`` header. Fails fast client-side
 *   when set on a live key, rather than round-tripping a 403.
 */
export interface CheckCreateParams {
  candidate_id: string;
  /** Package slug. Defaults to "standard". */
  package?: string;
  /** FCRA permissible purpose. Defaults to "employment". */
  permissible_purpose?: string;
  purpose_certification?: boolean;
  /**
   * SHA-256 hash of the canonical §1681b(f) end-user certification text
   * fetched from ``GET /api/v1/certifications/{purpose}``. Required by
   * orgs that have ``enforce_canonical_certification_hash=True``
   * (which is expected for production).
   */
  certification_text_hash?: string;
  /** Set to make creation idempotent (sent as the Idempotency-Key header). */
  idempotency_key?: string;
  /**
   * Sandbox only — forces a fixture outcome instead of running the
   * real check. One of: "clear" | "hit" | "multi_hit" | "disputed" |
   * "error" | "timeout". Rejected client-side with ``GonosError`` when
   * used on a live key (a ``gn_live_*`` API key). On a sandbox key
   * (``gn_test_*``) this is sent as the ``X-Gonos-Test-Disposition``
   * header.
   */
  disposition?: "clear" | "hit" | "multi_hit" | "disputed" | "error" | "timeout";
}

export class ChecksResource extends BaseResource {
  create(params: CheckCreateParams): Promise<CheckResponse> {
    const {
      candidate_id,
      package: pkg = "standard",
      permissible_purpose = "employment",
      purpose_certification = true,
      certification_text_hash,
      idempotency_key,
      disposition,
    } = params;

    if (disposition !== undefined && !this.client.isSandboxKey) {
      // Fail fast client-side. The server would also 403 this, but a
      // synchronous throw at the call site is easier to trace than a
      // rejected promise from ``X-Gonos-Test-Disposition was sent on
      // a live API key``.
      throw new GonosError(
        `disposition="${disposition}" is sandbox-only. Use a gn_test_ API key ` +
          "to send X-Gonos-Test-Disposition; a live (gn_live_) key rejects it.",
      );
    }

    const body: Record<string, unknown> = {
      candidate_id,
      package: pkg,
      permissible_purpose,
      purpose_certification,
    };
    if (certification_text_hash !== undefined) {
      body.certification_text_hash = certification_text_hash;
    }

    const headers: Record<string, string> = {};
    if (idempotency_key) headers["Idempotency-Key"] = idempotency_key;
    if (disposition) headers["X-Gonos-Test-Disposition"] = disposition;

    return this.request<CheckResponse>({
      method: "POST",
      path: "/checks",
      body,
      headers: Object.keys(headers).length > 0 ? headers : undefined,
    });
  }

  submit(checkId: string): Promise<CheckResponse> {
    return this.request<CheckResponse>({ method: "POST", path: `/checks/${encodeURIComponent(checkId)}/submit` });
  }

  get(checkId: string): Promise<CheckResponse> {
    return this.request<CheckResponse>({ method: "GET", path: `/checks/${encodeURIComponent(checkId)}` });
  }

  list(
    params: { page?: number; per_page?: number; status?: string } = {},
  ): Promise<Paginated<CheckResponse>> {
    return this.request<Paginated<CheckResponse>>({
      method: "GET",
      path: "/checks",
      query: {
        page: params.page ?? 1,
        per_page: params.per_page ?? 25,
        status: params.status,
      },
    });
  }

  cancel(checkId: string): Promise<CheckResponse> {
    return this.request<CheckResponse>({ method: "POST", path: `/checks/${encodeURIComponent(checkId)}/cancel` });
  }
}
