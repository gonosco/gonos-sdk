// Paths below are host-relative — `/api/v1` is applied by
// `BaseResource.request`, not written into each path here.
import { BaseResource } from "./base.js";
import { GonosError } from "../errors.js";
import type { CheckCreateBody, CheckResponse } from "../api-types.js";
import type { Paginated } from "../models.js";

/**
 * Params for ``client.checks.create()`` — spec body + SDK-side ergonomics.
 *
 * The three fields the spec marks as required (``package``,
 * ``permissible_purpose``, ``purpose_certification``) are made optional
 * here because the SDK applies opinionated defaults: ``"standard"`` /
 * ``"employment"`` / ``true``. Every other field flows through as-is,
 * including ones the spec added after this file was hand-written
 * (``salary_amount``, ``salary_currency``, ``insurance_subtype``) — those
 * were previously silently dropped.
 *
 * SDK-only knobs (never sent as body fields):
 *
 * - ``idempotency_key`` → ``Idempotency-Key`` header.
 * - ``disposition`` → sandbox-only ``X-Gonos-Test-Disposition`` header;
 *   throws ``GonosError`` synchronously on a live (``gn_live_*``) key
 *   so the caller sees the failure at the call site rather than as a
 *   rejected promise.
 */
export type CheckCreateParams = Omit<
  CheckCreateBody,
  "package" | "permissible_purpose" | "purpose_certification"
> &
  Partial<
    Pick<CheckCreateBody, "package" | "permissible_purpose" | "purpose_certification">
  > & {
    /** Set to make creation idempotent (sent as the ``Idempotency-Key`` header). */
    idempotency_key?: string;
    /**
     * @deprecated Set the candidate's ``last_name`` to a ``SANDBOX*`` prefix
     * instead. This header path forces a lower-level fixture outcome via a
     * separate vocabulary (``clear/hit/multi_hit/disputed/error/timeout``)
     * that doesn't match the production output vocabulary
     * (``clear/consider/review``) — Selky flagged the mismatch as a real
     * DX problem (#733). The SANDBOX*-name pattern is the industry standard
     * (Stripe test cards, Plaid ``override_username``, etc.) and produces
     * the same output vocabulary in sandbox and prod:
     *
     *     await client.candidates.create({ first_name: "Test", last_name: "SANDBOXCLEAR" });
     *     await client.checks.create({ candidate_id, permissible_purpose: "employment" });
     *     // → check.disposition = "clear" in the webhook, same as prod
     *
     * Supported ``SANDBOX*`` last-name suffixes:
     * ``SANDBOXCLEAR`` | ``SANDBOXCONSIDER`` | ``SANDBOXREVIEW`` |
     * ``SANDBOXERROR`` | ``SANDBOXTIMEOUT``.
     *
     * This param will be removed in the 1.0 release. On a sandbox
     * (``gn_test_*``) key the header still ships; on a live (``gn_live_*``)
     * key the SDK still throws ``GonosError`` as before.
     */
    disposition?: "clear" | "hit" | "multi_hit" | "disputed" | "error" | "timeout";
  };

export class ChecksResource extends BaseResource {
  create(params: CheckCreateParams): Promise<CheckResponse> {
    const {
      idempotency_key,
      disposition,
      // Extract defaulted fields with destructuring defaults so that
      // an explicit ``undefined`` from the caller (a common pattern
      // when building kwargs conditionally) still yields the SDK
      // default rather than a spread-over ``undefined`` in the body.
      package: pkg = "standard",
      permissible_purpose = "employment",
      purpose_certification = true,
      ...rest
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

    // Forward every spec field the caller supplied so ones added after
    // the hand-written type froze (``salary_amount``, ``insurance_subtype``,
    // etc.) reach the server instead of being silently dropped by a
    // whitelist. The three SDK-defaulted fields come from destructuring
    // above so undefined-safety is preserved.
    const body = {
      ...rest,
      package: pkg,
      permissible_purpose,
      purpose_certification,
    } as CheckCreateBody;

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
