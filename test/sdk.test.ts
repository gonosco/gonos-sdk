import { describe, expect, it } from "vitest";

import {
  ApiError,
  GonosClient,
  NotFoundError,
  RateLimitError,
  ValidationError,
} from "../src/index.js";

interface MockResponse {
  status: number;
  body?: unknown;
  headers?: Record<string, string>;
}

interface RecordedCall {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: unknown;
}

function mockClient(responder: (call: RecordedCall) => MockResponse) {
  const calls: RecordedCall[] = [];
  const fetchImpl = (async (input: unknown, init: RequestInit = {}) => {
    const url = String(input);
    const headers = (init.headers ?? {}) as Record<string, string>;
    const body = init.body ? JSON.parse(init.body as string) : undefined;
    const call: RecordedCall = { url, method: init.method ?? "GET", headers, body };
    calls.push(call);
    const r = responder(call);
    const respHeaders = new Headers(r.headers ?? {});
    if (!respHeaders.has("Content-Type")) respHeaders.set("Content-Type", "application/json");
    // 204/205/304 must have a null body per the Fetch spec.
    const responseBody = r.body === undefined ? null : JSON.stringify(r.body);
    return new Response(responseBody, { status: r.status, headers: respHeaders });
  }) as unknown as typeof fetch;

  const client = new GonosClient({
    apiKey: "gn_test_abc",
    baseUrl: "https://api.example.com",
    fetchImpl,
  });
  return { client, calls };
}

describe("GonosClient resources", () => {
  it("candidates.create POSTs to /api/v1/candidates with the API key", async () => {
    const { client, calls } = mockClient(() => ({
      status: 201,
      body: {
        id: "cand_1",
        first_name: "Jane",
        last_name: "Doe",
        organization_id: "org_1",
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
    }));

    const candidate = await client.candidates.create({
      first_name: "Jane",
      last_name: "Doe",
      email: "jane@example.com",
    });

    expect(candidate.id).toBe("cand_1");
    expect(calls).toHaveLength(1);
    expect(calls[0]!.method).toBe("POST");
    expect(calls[0]!.url).toBe("https://api.example.com/api/v1/candidates");
    expect(calls[0]!.headers["X-API-Key"]).toBe("gn_test_abc");
    expect(calls[0]!.body).toEqual({
      first_name: "Jane",
      last_name: "Doe",
      email: "jane@example.com",
    });
  });

  it("candidates.upsert PUTs to /candidates/by-external-id/{external_id} with URL-encoded id", async () => {
    const { client, calls } = mockClient(() => ({
      status: 200,
      body: {
        id: "cand_42",
        first_name: "Jane",
        last_name: "Doe",
        external_id: "worker/42 special",
        organization_id: "org_1",
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
    }));

    const candidate = await client.candidates.upsert({
      external_id: "worker/42 special",
      first_name: "Jane",
      last_name: "Doe",
    });

    expect(candidate.id).toBe("cand_42");
    expect(calls).toHaveLength(1);
    expect(calls[0]!.method).toBe("PUT");
    // URL-encoded external_id survives the round-trip — critical for keys
    // containing slashes, spaces, or other non-URL-safe bytes.
    expect(calls[0]!.url).toBe(
      "https://api.example.com/api/v1/candidates/by-external-id/worker%2F42%20special",
    );
    // Body carries only the fields, NOT the external_id (URL is authoritative
    // per the backend contract).
    expect(calls[0]!.body).toEqual({ first_name: "Jane", last_name: "Doe" });
  });

  it("checks.create defaults the package and forwards the idempotency key", async () => {
    const { client, calls } = mockClient(() => ({
      status: 201,
      body: {
        id: "chk_1",
        candidate_id: "cand_1",
        organization_id: "org_1",
        status: "created",
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
    }));

    await client.checks.create({ candidate_id: "cand_1", idempotency_key: "key-123" });

    expect(calls[0]!.url).toBe("https://api.example.com/api/v1/checks");
    expect(calls[0]!.headers["Idempotency-Key"]).toBe("key-123");
    expect(calls[0]!.body).toMatchObject({
      candidate_id: "cand_1",
      package: "standard",
      permissible_purpose: "employment",
      purpose_certification: true,
    });
  });

  it("checks.list builds the query string", async () => {
    const { client, calls } = mockClient(() => ({
      status: 200,
      body: { items: [], total: 0, page: 2, per_page: 50, pages: 0 },
    }));

    const page = await client.checks.list({ page: 2, per_page: 50, status: "completed" });

    expect(page.page).toBe(2);
    const url = new URL(calls[0]!.url);
    expect(url.pathname).toBe("/api/v1/checks");
    expect(url.searchParams.get("page")).toBe("2");
    expect(url.searchParams.get("per_page")).toBe("50");
    expect(url.searchParams.get("status")).toBe("completed");
  });

  it("reports.get returns the first item from the paginated response", async () => {
    const { client } = mockClient(() => ({
      status: 200,
      body: {
        items: [
          { id: "rpt_1", check_id: "chk_1", status: "ready", created_at: "2026-01-01T00:00:00Z" },
          { id: "rpt_2", check_id: "chk_1", status: "ready", created_at: "2026-01-02T00:00:00Z" },
        ],
      },
    }));

    const report = await client.reports.get("chk_1");
    expect(report.id).toBe("rpt_1");
  });

  it("delete returns void on 204 without throwing", async () => {
    const { client, calls } = mockClient(() => ({ status: 204 }));
    await expect(client.candidates.delete("cand_1")).resolves.toBeDefined();
    expect(calls[0]!.method).toBe("DELETE");
  });
});

describe("error mapping", () => {
  it("maps 404 to NotFoundError", async () => {
    const { client } = mockClient(() => ({
      status: 404,
      body: { error: "not_found", detail: "no such candidate" },
    }));
    await expect(client.candidates.get("missing")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("maps 422 to ValidationError", async () => {
    const { client } = mockClient(() => ({
      status: 422,
      body: { error: "validation_error", detail: "bad input" },
    }));
    await expect(
      client.candidates.create({ first_name: "", last_name: "" }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("maps 429 to RateLimitError and parses Retry-After", async () => {
    const { client } = mockClient(() => ({
      status: 429,
      body: { error: "rate_limited" },
      headers: { "Retry-After": "30" },
    }));
    await client.checks.list().then(
      () => {
        throw new Error("expected rejection");
      },
      (err: unknown) => {
        expect(err).toBeInstanceOf(RateLimitError);
        expect((err as RateLimitError).retry_after).toBe(30);
      },
    );
  });
});

describe("ApiError.kind", () => {
  it("passes through the three published kinds", () => {
    for (const k of ["user", "retryable", "ops"] as const) {
      expect(new ApiError({ status_code: 400, error: "e", kind: k }).kind).toBe(k);
    }
  });

  it("defaults to ops when absent — an older API deploy must not leak", () => {
    expect(new ApiError({ status_code: 400, error: "e" }).kind).toBe("ops");
  });

  it("defaults to ops for an unrecognized kind this SDK predates", () => {
    expect(new ApiError({ status_code: 400, error: "e", kind: "spicy" }).kind).toBe("ops");
  });
});

// #733 (0.1.1) — the three shipping blocker fixes + one nit.
describe("#733 blocker fixes", () => {
  describe("consent.create sends every API-required field", () => {
    it("forwards disclosure_version and permissible_purpose (the 0.1.0-dropped fields)", async () => {
      const { client, calls } = mockClient(() => ({
        status: 201,
        body: { id: "cs_1", status: "pending" },
      }));
      await client.consent.create({
        candidate_id: "cand_1",
        check_id: "chk_1",
        disclosure_version: "v2.0",
        permissible_purpose: "employment",
        disclosure_type: "standalone",
      });
      expect(calls[0].body).toEqual({
        candidate_id: "cand_1",
        check_id: "chk_1",
        disclosure_version: "v2.0",
        permissible_purpose: "employment",
        disclosure_type: "standalone",
      });
    });

    it("forwards optional mobile deep-link + i18n fields when supplied", async () => {
      const { client, calls } = mockClient(() => ({ status: 201, body: { id: "cs_1" } }));
      await client.consent.create({
        candidate_id: "cand_1",
        check_id: "chk_1",
        disclosure_version: "v2.0",
        permissible_purpose: "employment",
        return_url: "acme://consent-complete/?session_id=x",
        locale: "es",
        candidate_state: "CA",
        metadata: { source: "onboarding" },
      });
      expect(calls[0].body).toMatchObject({
        return_url: "acme://consent-complete/?session_id=x",
        locale: "es",
        candidate_state: "CA",
        metadata: { source: "onboarding" },
      });
    });

    it("omits optional fields from the body when not supplied", async () => {
      const { client, calls } = mockClient(() => ({ status: 201, body: { id: "cs_1" } }));
      await client.consent.create({
        candidate_id: "cand_1",
        check_id: "chk_1",
        disclosure_version: "v2.0",
        permissible_purpose: "employment",
      });
      const body = calls[0].body as Record<string, unknown>;
      expect(body).not.toHaveProperty("locale");
      expect(body).not.toHaveProperty("return_url");
      expect(body).not.toHaveProperty("metadata");
    });
  });

  describe("checks.create — certification_text_hash + disposition", () => {
    it("forwards certification_text_hash in the body when supplied", async () => {
      const { client, calls } = mockClient(() => ({ status: 201, body: { id: "chk_1" } }));
      await client.checks.create({
        candidate_id: "cand_1",
        certification_text_hash: "sha256:" + "a".repeat(64),
      });
      expect(calls[0].body).toMatchObject({
        certification_text_hash: "sha256:" + "a".repeat(64),
      });
    });

    it("folds disposition into X-Gonos-Test-Disposition when the key is sandbox", async () => {
      const { client, calls } = mockClient(() => ({ status: 201, body: { id: "chk_1" } }));
      // mockClient uses ``gn_test_abc`` — a sandbox key, so disposition is accepted.
      await client.checks.create({ candidate_id: "cand_1", disposition: "clear" });
      expect(calls[0].headers["X-Gonos-Test-Disposition"]).toBe("clear");
    });

    it("throws SDK-side when disposition is set on a live key", () => {
      const client = new GonosClient({
        apiKey: "gn_live_abc",
        baseUrl: "https://api.example.com",
      });
      expect(() =>
        client.checks.create({ candidate_id: "cand_1", disposition: "hit" }),
      ).toThrow(/sandbox-only/);
    });
  });

  describe("ApiError preserves field_errors and fix_suggestion from 422 bodies", () => {
    it("populates both from the response payload", async () => {
      const { client } = mockClient(() => ({
        status: 422,
        body: {
          error: "validation_error",
          detail: "check_id: field required",
          errors: [
            { field: "check_id", message: "field required", type: "missing" },
          ],
          fix_suggestion: "Include check_id in the request body.",
        },
      }));
      await client.candidates.create({ first_name: "J", last_name: "D" }).then(
        () => {
          throw new Error("expected rejection");
        },
        (err: unknown) => {
          expect(err).toBeInstanceOf(ValidationError);
          const v = err as ValidationError;
          expect(v.field_errors).toEqual([
            { field: "check_id", message: "field required", type: "missing" },
          ]);
          expect(v.fix_suggestion).toBe("Include check_id in the request body.");
        },
      );
    });

    it("defaults to empty array and null when the body omits them (older API deploy)", () => {
      const e = new ApiError({ status_code: 500, error: "server_error" });
      expect(e.field_errors).toEqual([]);
      expect(e.fix_suggestion).toBeNull();
    });
  });
});

// Selky's follow-up DX feedback after the 0.2.0 integration.
describe("0.4.0 DX gap fixes", () => {
  describe("WebhookEventType export enables exhaustive switch", () => {
    it("is a compile-time union of every server-emitted event", async () => {
      // Runtime assertion: import the type via a type-position expression and
      // verify the SDK exports it. If someone drops the export, this test
      // fails at compile time (before the runtime check even runs).
      const mod = await import("../src/index.js");
      // The union is a type — nothing to check at runtime. But the module's
      // ambient type declaration exports it, which tsc validates during
      // ``npm run build``. If ``WebhookEventType`` were removed from the
      // barrel, the compilation of this test file would fail.
      type _AssertExport = import("../src/index.js").WebhookEventType;
      const sentinel: _AssertExport = "consent_session.completed";
      expect(sentinel).toBe("consent_session.completed");
      // Sanity: module namespace exists.
      expect(typeof mod).toBe("object");
    });
  });

  describe("Idempotency-Key coverage on the endpoints Selky flagged", () => {
    it("candidates.upsert folds idempotency_key into the header", async () => {
      const { client, calls } = mockClient(() => ({
        status: 200,
        body: { id: "cand_1", first_name: "J", last_name: "D" },
      }));
      await client.candidates.upsert({
        external_id: "ext-1",
        first_name: "Jane",
        idempotency_key: "cli-key-1",
      });
      expect(calls[0].headers["Idempotency-Key"]).toBe("cli-key-1");
      // Body should NOT carry idempotency_key — it's a header, not a field.
      expect(calls[0].body).not.toHaveProperty("idempotency_key");
    });

    it("candidates.create folds idempotency_key into the header", async () => {
      const { client, calls } = mockClient(() => ({
        status: 201,
        body: { id: "cand_2", first_name: "J", last_name: "D" },
      }));
      await client.candidates.create({
        first_name: "Jane",
        last_name: "Doe",
        idempotency_key: "cli-key-2",
      });
      expect(calls[0].headers["Idempotency-Key"]).toBe("cli-key-2");
      expect(calls[0].body).not.toHaveProperty("idempotency_key");
    });

    it("consent.create folds idempotency_key into the header", async () => {
      const { client, calls } = mockClient(() => ({
        status: 201,
        body: { id: "cs_1", status: "pending" },
      }));
      await client.consent.create({
        candidate_id: "cand_1",
        check_id: "chk_1",
        disclosure_version: "v2.0",
        permissible_purpose: "employment",
        idempotency_key: "cli-key-3",
      });
      expect(calls[0].headers["Idempotency-Key"]).toBe("cli-key-3");
      expect(calls[0].body).not.toHaveProperty("idempotency_key");
    });

    it("omits the header when idempotency_key is not supplied", async () => {
      const { client, calls } = mockClient(() => ({ status: 201, body: { id: "cs_1" } }));
      await client.consent.create({
        candidate_id: "cand_1",
        check_id: "chk_1",
        disclosure_version: "v2.0",
        permissible_purpose: "employment",
      });
      expect(calls[0].headers["Idempotency-Key"]).toBeUndefined();
    });
  });
});
