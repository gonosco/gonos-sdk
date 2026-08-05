import { describe, expect, it } from "vitest";

import { ApiError, ErrorCode, ERROR_CODES_BY_STATUS } from "../src/index.js";
import type { GonosErrorCode } from "../src/index.js";

describe("generated error catalogue", () => {
  it("exposes the codes an integrator would key branching logic off", () => {
    // Sentinel codes chosen because each was called out in Selky's
    // 2026-08-04 report as a case they had to handle: DUPLICATE_EXTERNAL_ID
    // is the retry-with-upsert path, SANDBOX_KEY_REQUIRES_FIXTURE_LAST_NAME
    // is the sandbox-mode guard, API_KEY_REMINT_REQUIRED is the auth-flow
    // migration signal.
    expect(ErrorCode.DUPLICATE_EXTERNAL_ID).toBe("DUPLICATE_EXTERNAL_ID");
    expect(ErrorCode.SANDBOX_KEY_REQUIRES_FIXTURE_LAST_NAME).toBe(
      "SANDBOX_KEY_REQUIRES_FIXTURE_LAST_NAME",
    );
    expect(ErrorCode.API_KEY_REMINT_REQUIRED).toBe("API_KEY_REMINT_REQUIRED");
  });

  it("groups codes by HTTP status for status-tier fallback", () => {
    expect(ERROR_CODES_BY_STATUS[409]).toContain("DUPLICATE_EXTERNAL_ID");
    expect(ERROR_CODES_BY_STATUS[401]).toContain("API_KEY_REMINT_REQUIRED");
    expect(ERROR_CODES_BY_STATUS[403]).toContain("AI_RESTRICTED_FORBIDDEN");
    expect(ERROR_CODES_BY_STATUS[403]).toContain(
      "SANDBOX_KEY_REQUIRES_FIXTURE_LAST_NAME",
    );
  });

  it("supports narrowing an ApiError catch by error_code", () => {
    const raised = new ApiError({
      status_code: 409,
      error: "conflict",
      detail: "already exists",
      error_code: ErrorCode.DUPLICATE_EXTERNAL_ID,
      correlation_id: "abc",
    });

    // Compile-time narrowing: this pattern is the ergonomic win.
    const handle = (e: ApiError): string => {
      if (e.error_code === ErrorCode.DUPLICATE_EXTERNAL_ID) {
        return "upsert";
      }
      return "generic";
    };

    expect(handle(raised)).toBe("upsert");
  });

  it("type-only: GonosErrorCode is exhaustive over ErrorCode values", () => {
    // If a code disappears from the openapi and gets regenerated away, this
    // stops compiling — the tsc pass in CI catches the drift before the
    // Vitest run even starts.
    const codes: readonly GonosErrorCode[] = Object.values(ErrorCode);
    expect(codes.length).toBeGreaterThan(0);
  });
});
