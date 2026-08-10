/**
 * Error hierarchy mirroring the Python SDK's `gonos_sdk.exceptions`.
 *
 * Catch by status-specific subclass when you want to differentiate
 * recoverable errors (RateLimitError → back off, BadGatewayError → retry)
 * from terminal ones (ValidationError, ConflictError).
 */

/**
 * Where to report SDK issues. Appended to every SDK-thrown error's message
 * so integrators (and AI agents) see the pointer at friction moments, not
 * only if they think to read the README months earlier.
 */
export const SDK_FEEDBACK_URL =
  "https://github.com/gonosco/gonos-sdk/issues/new?labels=sdk-integration-feedback";

export class GonosError extends Error {
  constructor(message: string) {
    super(
      `${message}\n\nIf this behavior is unexpected or this message is unclear, please tell us: ${SDK_FEEDBACK_URL}`,
    );
    this.name = "GonosError";
  }
}

/**
 * How to route an error, without maintaining your own code table.
 *
 * - `user` — safe to display to an end user; describes something they can
 *   fix. Surface `detail` (and any field `errors`) in your UI.
 * - `retryable` — transient. Retry with backoff.
 * - `ops` — your team must act (credentials, scopes, plan limits, bugs).
 *   Alert on it; never show `detail` to an end user.
 *
 * ## Why this exists alongside the subclass hierarchy
 *
 * The two axes answer different questions and do not derive from each
 * other:
 *
 * - **Subclass** (`ForbiddenError`, `ConflictError`, ...) reflects the
 *   HTTP status. Use it for retry policy (`instanceof RateLimitError` →
 *   back off, `instanceof BadGatewayError` → retry, `instanceof
 *   ValidationError` → don't) and for control flow.
 * - **`kind`** reflects the audience the error is aimed at. The API's
 *   `kind` classifier looks at the underlying condition, not the status
 *   code, so the same subclass can carry different kinds:
 *
 *   | Subclass          | Example `kind = "user"`         | Example `kind = "ops"`             |
 *   |-------------------|----------------------------------|-------------------------------------|
 *   | `ForbiddenError`  | wrong scope for this route       | plan limit reached / feature off    |
 *   | `ConflictError`   | duplicate `external_id`          | idempotency-key replay collision    |
 *   | `ValidationError` | end user typed a bad SSN         | integrator sent an unknown field    |
 *
 *   Deriving one from the other would leak "safe to show" decisions
 *   into status-code checks and vice versa. Keep them separate.
 *
 * If you only need one dimension, prefer `instanceof` for retry
 * decisions and `kind` for display decisions. (Selky flagged the two
 * as redundant in #754 — the mapping above is the answer.)
 */
export type ErrorKind = "user" | "retryable" | "ops";

/**
 * #733 (0.1.1): the shape the API sends in a 422 response body.
 * Populated from ``errors: [{field, message, type}]`` server-side.
 * Preserved on ``ApiError.field_errors`` so callers can route per-field
 * UX (highlight the failing input, show its message inline) without
 * regexing ``detail``.
 */
export interface FieldError {
  field: string;
  message: string;
  type?: string;
}

export class ApiError extends GonosError {
  status_code: number;
  error: string;
  detail: string | null;
  error_code: string | null;
  correlation_id: string | null;
  /**
   * Per-field validation errors from a 422 response. Empty array when
   * the API didn't send an ``errors[]`` field (any status other than
   * 422, or an older Gonos deploy). Callers should treat empty as
   * "no per-field information available," not as "no errors."
   */
  field_errors: FieldError[];
  /**
   * One-line human-actionable copy from the API's ``fix_suggestion``
   * field (added in Gonos PR #618). ``null`` when the API didn't
   * include one, which is the vast majority of responses — populated
   * mostly on 422 and specific 409 responses where the fix is
   * mechanical (e.g. "call ``PUT /candidates/by-external-id/…``
   * instead"). Safe to surface to end users when non-null.
   */
  fix_suggestion: string | null;
  /**
   * Audience classification — branch on this instead of on `status_code`.
   *
   * Defaults to `"ops"` when absent or unrecognized, which is the safe
   * direction: an error you cannot classify is never shown to an end user.
   * That also means a Gonos deploy older than this field, or a future kind
   * this SDK predates, degrades to "alert the team" rather than to a leak.
   *
   *     if (e instanceof ApiError && e.kind === "user") showToUser(e.detail);
   *     else if (e.kind === "retryable") await retry();
   *     else alertOncall(e.correlation_id);
   */
  kind: ErrorKind;

  constructor(opts: {
    status_code: number;
    error: string;
    detail?: string | null;
    error_code?: string | null;
    correlation_id?: string | null;
    kind?: string | null;
    field_errors?: FieldError[] | null;
    fix_suggestion?: string | null;
  }) {
    super(`[${opts.status_code}] ${opts.detail ?? opts.error}`);
    this.name = this.constructor.name;
    this.status_code = opts.status_code;
    this.error = opts.error;
    this.detail = opts.detail ?? null;
    this.error_code = opts.error_code ?? null;
    this.correlation_id = opts.correlation_id ?? null;
    this.field_errors = Array.isArray(opts.field_errors) ? opts.field_errors : [];
    this.fix_suggestion = opts.fix_suggestion ?? null;
    this.kind =
      opts.kind === "user" || opts.kind === "retryable" ? opts.kind : "ops";
  }
}

export class AuthenticationError extends ApiError {}
export class ForbiddenError extends ApiError {}
export class NotFoundError extends ApiError {}
export class ValidationError extends ApiError {}
export class ConflictError extends ApiError {}
export class PreconditionFailedError extends ApiError {}
export class PayloadTooLargeError extends ApiError {}
export class UnsupportedMediaTypeError extends ApiError {}
export class LockedError extends ApiError {}

export class RateLimitError extends ApiError {
  retry_after: number | null;
  constructor(opts: ConstructorParameters<typeof ApiError>[0] & { retry_after?: number | null }) {
    super(opts);
    this.retry_after = opts.retry_after ?? null;
  }
}

export class ServerError extends ApiError {}
export class BadGatewayError extends ApiError {}
export class ServiceUnavailableError extends ApiError {}
export class GatewayTimeoutError extends ApiError {}

// Generated catalogue of every `error_code` the API can return. Kept in a
// separate file so a docs-only diff doesn't touch this hand-written module.
// Regenerated by `make sdk-errors` from openapi.json.
export {
  type GonosErrorCode,
  ErrorCode,
  ERROR_CODES_BY_STATUS,
} from "./errors.generated.js";

export const STATUS_TO_ERROR: Record<number, typeof ApiError> = {
  // Both 400 and 422 map to ValidationError. FastAPI emits 422 for
  // Pydantic-level parse failures (bad JSON body, missing required
  // field, wrong type); the app layer raises 400 for domain validation
  // (business-rule failures). Both are "consumer sent something we
  // could not accept" — same subclass.
  400: ValidationError,
  401: AuthenticationError,
  403: ForbiddenError,
  404: NotFoundError,
  409: ConflictError,
  412: PreconditionFailedError,
  413: PayloadTooLargeError,
  415: UnsupportedMediaTypeError,
  422: ValidationError,
  423: LockedError,
  429: RateLimitError,
  500: ServerError,
  502: BadGatewayError,
  503: ServiceUnavailableError,
  504: GatewayTimeoutError,
};
