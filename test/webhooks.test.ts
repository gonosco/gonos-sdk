import { describe, expect, it } from "vitest";
import { Webhook } from "standardwebhooks";

import { verifyWebhookSignature } from "../src/webhooks.js";

/**
 * Sign with the same library the SDK verifier uses, but with the same raw-
 * bytes key material the SDK forces. This mirrors the backend's
 * ``sign_body`` (which HMACs with ``secret.encode()``) and pins the round-
 * trip contract: plain-string secret → identical HMAC on both sides,
 * regardless of the library's default ``whsec_``-prefix convention.
 */
function signStandard(msgId: string, timestamp: Date, payload: string, secret: string): string {
  return new Webhook(new TextEncoder().encode(secret), { format: "raw" }).sign(
    msgId,
    timestamp,
    payload,
  );
}

function headers(msgId: string, timestamp: Date, signature: string): Record<string, string> {
  return {
    "webhook-id": msgId,
    "webhook-timestamp": String(Math.floor(timestamp.getTime() / 1000)),
    "webhook-signature": signature,
  };
}

describe("verifyWebhookSignature", () => {
  const secret = "plain-test-webhook-secret";
  const payload = '{"event":"check.completed","id":"abc"}';
  const now = new Date();

  it("accepts a correctly-signed request", () => {
    const sig = signStandard("msg_1", now, payload, secret);
    const result = verifyWebhookSignature({
      payload,
      headers: headers("msg_1", now, sig),
      secret,
    });
    expect(result).toEqual({ verified: true });
  });

  it("rejects a tampered payload with a discoverable reason", () => {
    const sig = signStandard("msg_1", now, payload, secret);
    const result = verifyWebhookSignature({
      payload: payload + " ",
      headers: headers("msg_1", now, sig),
      secret,
    });
    expect(result.verified).toBe(false);
    expect((result as { reason: string }).reason).toMatch(/signature/i);
  });

  it("rejects a wrong secret", () => {
    const sig = signStandard("msg_1", now, payload, secret);
    const result = verifyWebhookSignature({
      payload,
      headers: headers("msg_1", now, sig),
      secret: "different-secret",
    });
    expect(result.verified).toBe(false);
  });

  it("rejects a stale timestamp (replay attack)", () => {
    const stale = new Date(Date.now() - 3600_000);
    const sig = signStandard("msg_1", stale, payload, secret);
    const result = verifyWebhookSignature({
      payload,
      headers: headers("msg_1", stale, sig),
      secret,
    });
    expect(result.verified).toBe(false);
    expect((result as { reason: string }).reason).toMatch(/timestamp|old|expired/i);
  });

  it("rejects a future-dated timestamp (fixed C2 from #646 review)", () => {
    const future = new Date(Date.now() + 3600_000);
    const sig = signStandard("msg_1", future, payload, secret);
    const result = verifyWebhookSignature({
      payload,
      headers: headers("msg_1", future, sig),
      secret,
    });
    expect(result.verified).toBe(false);
  });

  it("accepts a Buffer payload (raw bytes off the request stream)", () => {
    const sig = signStandard("msg_1", now, payload, secret);
    const result = verifyWebhookSignature({
      payload: Buffer.from(payload, "utf-8"),
      headers: headers("msg_1", now, sig),
      secret,
    });
    expect(result).toEqual({ verified: true });
  });

  it("normalizes upper-case header keys (Node / Express hand-built cases)", () => {
    const sig = signStandard("msg_1", now, payload, secret);
    const result = verifyWebhookSignature({
      payload,
      headers: {
        "Webhook-Id": "msg_1",
        "Webhook-Timestamp": String(Math.floor(now.getTime() / 1000)),
        "Webhook-Signature": sig,
      },
      secret,
    });
    expect(result).toEqual({ verified: true });
  });

  it("rejects a request missing headers with a reason", () => {
    const result = verifyWebhookSignature({ payload, headers: {}, secret });
    expect(result.verified).toBe(false);
  });

  it("re-exports the raw Webhook class for callers who prefer throw semantics", async () => {
    const mod = await import("../src/webhooks.js");
    expect(mod.Webhook).toBeDefined();
    expect(mod.WebhookVerificationError).toBeDefined();
  });
});
