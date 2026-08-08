/**
 * Gonos API client.
 *
 * Fetch-based client exposing typed resource namespaces (`client.candidates`,
 * `client.checks`, …) that mirror the Python SDK. The low-level `request()`
 * method remains available for endpoints not yet covered by a resource.
 */

import {
  ApiError,
  type FieldError,
  RateLimitError,
  STATUS_TO_ERROR,
} from "./errors.js";
import { AdverseActionsResource } from "./resources/adverse_actions.js";
import { AnalyticsResource } from "./resources/analytics.js";
import { BillingResource } from "./resources/billing.js";
import { CandidatesResource } from "./resources/candidates.js";
import { ChecksResource } from "./resources/checks.js";
import { ConsentResource } from "./resources/consent.js";
import { DisputesResource } from "./resources/disputes.js";
import { ExportsResource } from "./resources/exports.js";
import { ReportsResource } from "./resources/reports.js";
import { UsageResource } from "./resources/usage.js";
import { WebhooksResource } from "./resources/webhooks.js";

export interface GonosClientOptions {
  apiKey: string;
  baseUrl?: string;
  /** Per-request timeout in milliseconds. Default 30s. */
  timeoutMs?: number;
  /** Custom fetch implementation. Default: globalThis.fetch. */
  fetchImpl?: typeof fetch;
}

interface RequestOptions {
  method?: string;
  path: string;
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  headers?: Record<string, string>;
}

/**
 * Parse the ``Retry-After`` header per RFC 7231. Two accepted formats:
 *
 * - ``<delta-seconds>`` — an integer. Return it directly.
 * - ``<HTTP-date>`` — e.g. ``Wed, 21 Oct 2025 07:28:00 GMT``. Return the
 *   difference from now, clamped to non-negative.
 *
 * Returns 60 (a conservative default) when the header is absent OR when
 * parsing fails. ``parseInt("Wed, 21 Oct...", 10)`` on the HTTP-date path
 * previously returned ``NaN``, which callers checking
 * ``if (err.retry_after > 0)`` would coerce to ``false`` — meaning no
 * back-off, meaning API bans. This helper is the fix.
 */
function parseRetryAfter(header: string | null): number {
  if (!header) return 60;
  const asSeconds = parseInt(header, 10);
  if (!isNaN(asSeconds) && String(asSeconds) === header.trim()) {
    return asSeconds;
  }
  const asDate = Date.parse(header);
  if (!isNaN(asDate)) {
    return Math.max(0, Math.ceil((asDate - Date.now()) / 1000));
  }
  return 60;
}

export class GonosClient {
  private readonly apiKey: string;
  /**
   * Whether the configured API key is a sandbox (``gn_test_``) key.
   * Read by resources that offer sandbox-only ergonomics (e.g.
   * ``checks.create({disposition})``) so they can fail-fast when a live
   * key is used with a sandbox-only feature. Public getter surface for
   * consumer code that wants the same signal without inspecting the raw key.
   */
  readonly isSandboxKey: boolean;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  // Resource namespaces (mirror the Python SDK).
  readonly candidates: CandidatesResource;
  readonly checks: ChecksResource;
  readonly consent: ConsentResource;
  readonly reports: ReportsResource;
  readonly adverse_actions: AdverseActionsResource;
  readonly webhooks: WebhooksResource;
  readonly disputes: DisputesResource;
  readonly billing: BillingResource;
  readonly analytics: AnalyticsResource;
  readonly exports: ExportsResource;
  readonly usage: UsageResource;

  constructor(opts: GonosClientOptions) {
    if (!opts.apiKey) {
      throw new Error("GonosClient requires an apiKey");
    }
    this.apiKey = opts.apiKey;
    // #733 (0.1.1): the ``gn_test_`` prefix identifies a sandbox key.
    // Exposed to resources so ``checks.create({disposition})`` can
    // fail-fast SDK-side rather than round-trip a 403 from the server.
    this.isSandboxKey = opts.apiKey.startsWith("gn_test_");
    this.baseUrl = (opts.baseUrl ?? "https://api.gonos.co").replace(/\/$/, "");
    this.timeoutMs = opts.timeoutMs ?? 30_000;
    this.fetchImpl = opts.fetchImpl ?? globalThis.fetch.bind(globalThis);

    this.candidates = new CandidatesResource(this);
    this.checks = new ChecksResource(this);
    this.consent = new ConsentResource(this);
    this.reports = new ReportsResource(this);
    this.adverse_actions = new AdverseActionsResource(this);
    this.webhooks = new WebhooksResource(this);
    this.disputes = new DisputesResource(this);
    this.billing = new BillingResource(this);
    this.analytics = new AnalyticsResource(this);
    this.exports = new ExportsResource(this);
    this.usage = new UsageResource(this);
  }

  async request<T = unknown>(opts: RequestOptions): Promise<T> {
    const url = new URL(this.baseUrl + opts.path);
    if (opts.query) {
      for (const [k, v] of Object.entries(opts.query)) {
        if (v !== undefined) url.searchParams.set(k, String(v));
      }
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    let resp: Response;
    try {
      resp = await this.fetchImpl(url.toString(), {
        method: opts.method ?? "GET",
        // #NNN (2026-08-08 security review): caller-supplied ``opts.headers``
        // spread FIRST, SDK-managed headers spread LAST so ours always win.
        // Reverse order (which shipped through 0.4.0) let a caller override
        // ``X-API-Key`` — high-severity in the ``client.request()``
        // escape-hatch pattern where integrators sometimes forward HTTP
        // request headers from untrusted upstream sources.
        headers: {
          ...opts.headers,
          "X-API-Key": this.apiKey,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    if (resp.status === 204) {
      return {} as T;
    }

    let data: Record<string, unknown> = {};
    try {
      data = (await resp.json()) as Record<string, unknown>;
    } catch {
      // body wasn't JSON; surface status only
    }

    if (resp.ok) {
      return data as T;
    }

    const ErrorCls = STATUS_TO_ERROR[resp.status] ?? ApiError;
    const errOpts = {
      status_code: resp.status,
      error: (data.error as string | undefined) ?? "unknown",
      detail: (data.detail as string | undefined) ?? null,
      error_code: (data.error_code as string | undefined) ?? null,
      correlation_id: (data.correlation_id as string | undefined) ?? null,
      // Passed through raw; ApiError narrows it, defaulting anything it does
      // not recognize to "ops" so an unknown kind can never become displayable.
      kind: (data.kind as string | undefined) ?? null,
      // #733 (0.1.1): preserve per-field validation errors and the
      // one-line fix suggestion the API surfaces on 422s. 0.1.0 dropped
      // both; callers that wanted "which field failed" had to regex
      // ``detail`` or fall back to the low-level ``client.request``.
      field_errors: Array.isArray(data.errors) ? (data.errors as FieldError[]) : null,
      fix_suggestion: (data.fix_suggestion as string | undefined) ?? null,
    };
    if (ErrorCls === RateLimitError) {
      throw new RateLimitError({
        ...errOpts,
        retry_after: parseRetryAfter(resp.headers.get("Retry-After")),
      });
    }
    throw new ErrorCls(errOpts);
  }
}
