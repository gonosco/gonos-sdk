/**
 * Error hierarchy mirroring the Python SDK's `gonos_sdk.exceptions`.
 *
 * Catch by status-specific subclass when you want to differentiate
 * recoverable errors (RateLimitError → back off, BadGatewayError → retry)
 * from terminal ones (ValidationError, ConflictError).
 */

export class GonosError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GonosError";
  }
}

export class ApiError extends GonosError {
  status_code: number;
  error: string;
  detail: string | null;
  error_code: string | null;
  correlation_id: string | null;

  constructor(opts: {
    status_code: number;
    error: string;
    detail?: string | null;
    error_code?: string | null;
    correlation_id?: string | null;
  }) {
    super(`[${opts.status_code}] ${opts.detail ?? opts.error}`);
    this.name = this.constructor.name;
    this.status_code = opts.status_code;
    this.error = opts.error;
    this.detail = opts.detail ?? null;
    this.error_code = opts.error_code ?? null;
    this.correlation_id = opts.correlation_id ?? null;
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

export const STATUS_TO_ERROR: Record<number, typeof ApiError> = {
  401: AuthenticationError,
  403: ForbiddenError,
  404: NotFoundError,
  409: ConflictError,
  412: PreconditionFailedError,
  413: PayloadTooLargeError,
  415: UnsupportedMediaTypeError,
  423: LockedError,
  429: RateLimitError,
  500: ServerError,
  502: BadGatewayError,
  503: ServiceUnavailableError,
  504: GatewayTimeoutError,
};
