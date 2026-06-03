/**
 * Gonos API client.
 *
 * Fetch-based client exposing typed resource namespaces (`client.candidates`,
 * `client.checks`, …) that mirror the Python SDK. The low-level `request()`
 * method remains available for endpoints not yet covered by a resource.
 */

import {
  ApiError,
  RateLimitError,
  STATUS_TO_ERROR,
  ValidationError,
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

export class GonosClient {
  private readonly apiKey: string;
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
        headers: {
          "X-API-Key": this.apiKey,
          "Content-Type": "application/json",
          Accept: "application/json",
          ...opts.headers,
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

    let ErrorCls = STATUS_TO_ERROR[resp.status] ?? ApiError;
    if (resp.status === 400 || resp.status === 422) {
      ErrorCls = ValidationError;
    }
    const errOpts = {
      status_code: resp.status,
      error: (data.error as string | undefined) ?? "unknown",
      detail: (data.detail as string | undefined) ?? null,
      error_code: (data.error_code as string | undefined) ?? null,
      correlation_id: (data.correlation_id as string | undefined) ?? null,
    };
    if (ErrorCls === RateLimitError) {
      const retryAfter = resp.headers.get("Retry-After");
      throw new RateLimitError({
        ...errOpts,
        retry_after: retryAfter ? parseInt(retryAfter, 10) : 60,
      });
    }
    throw new ErrorCls(errOpts);
  }
}
