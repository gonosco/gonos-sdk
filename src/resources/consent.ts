// Paths below are host-relative — `/api/v1` is applied by
// `BaseResource.request`, not written into each path here.
import { BaseResource } from "./base.js";
import type { ConsentSessionResponse } from "../api-types.js";
import type { Paginated } from "../models.js";

/**
 * #733 (0.1.1): every field the server actually requires or accepts on
 * ``POST /api/v1/consent-sessions``. 0.1.0's shape silently dropped
 * ``disclosure_version``, ``permissible_purpose``, ``return_url``,
 * ``locale``, ``candidate_state``, and ``metadata`` — every call
 * 422'd. Required fields are marked as such in the type; there is no
 * default for ``disclosure_type`` because the server's rule depends on
 * ``permissible_purpose`` (employment requires ``"standalone"``).
 * Making the caller name the value keeps this from silently
 * regressing.
 */
export interface ConsentCreateParams {
  /** Candidate the consent binds to. */
  candidate_id: string;
  /** Check the consent authorizes. Required — a session with no check has no purpose. */
  check_id: string;
  /** Version of the FCRA disclosure document (e.g. "v1.0", "2024-01"). Must contain a digit. */
  disclosure_version: string;
  /** FCRA permissible purpose. Must match the check's ``permissible_purpose``. */
  permissible_purpose: string;
  /**
   * Disclosure type. **"standalone" is required for employment purpose** per
   * §1681b(b)(2)(A)(i). Other purposes accept "standard" or "investigative".
   */
  disclosure_type?: "standard" | "standalone" | "investigative";
  /**
   * URL the completed-consent page redirects to. Accepts http/https or a
   * custom app-scheme (e.g. ``myapp://consent-complete/``) for native
   * mobile deep-link handoff. See ``docs/MOBILE_INTEGRATION.md`` for the
   * SFSafariViewController / Custom Tabs recipe.
   */
  return_url?: string;
  /** Locale for the consent page. Defaults to "en" server-side. */
  locale?: "en" | "es" | "fr" | "ar" | "he";
  /** 2-letter US state code for state-specific disclosures. */
  candidate_state?: string;
  /** Arbitrary metadata to attach to the session (max 50 keys, 10 KB serialized). */
  metadata?: Record<string, unknown>;
  /** Set to make creation idempotent (sent as the Idempotency-Key header). */
  idempotency_key?: string;
}

export class ConsentResource extends BaseResource {
  create(params: ConsentCreateParams): Promise<ConsentSessionResponse> {
    // Forward every field the server accepts. Do not synthesize defaults
    // here — server-side defaults and per-purpose rules are the source of
    // truth; the SDK's job is to send what the caller passed.
    const body: Record<string, unknown> = {
      candidate_id: params.candidate_id,
      check_id: params.check_id,
      disclosure_version: params.disclosure_version,
      permissible_purpose: params.permissible_purpose,
    };
    if (params.disclosure_type !== undefined) body.disclosure_type = params.disclosure_type;
    if (params.return_url !== undefined) body.return_url = params.return_url;
    if (params.locale !== undefined) body.locale = params.locale;
    if (params.candidate_state !== undefined) body.candidate_state = params.candidate_state;
    if (params.metadata !== undefined) body.metadata = params.metadata;
    return this.request<ConsentSessionResponse>({
      method: "POST",
      path: "/consent-sessions",
      body,
      headers: params.idempotency_key
        ? { "Idempotency-Key": params.idempotency_key }
        : undefined,
    });
  }

  get(sessionId: string): Promise<ConsentSessionResponse> {
    return this.request<ConsentSessionResponse>({
      method: "GET",
      path: `/consent-sessions/${sessionId}`,
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
