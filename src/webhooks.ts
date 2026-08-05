import { Webhook, WebhookVerificationError } from "standardwebhooks";

/**
 * Re-exports from the ``standardwebhooks`` npm library, which implements the
 * `Standard Webhooks spec <https://www.standardwebhooks.com/>`_. Gonos emits
 * spec-conformant ``webhook-id`` / ``webhook-timestamp`` / ``webhook-signature``
 * headers, so any Standard Webhooks library in any language verifies our
 * events without hand-rolled crypto.
 *
 * Prefer the ``verifyWebhookSignature`` wrapper below unless you want the
 * library's raw ``Webhook`` class (which throws on failure and returns the
 * parsed payload on success).
 */
export { Webhook, WebhookVerificationError };

export interface VerifyWebhookOptions {
  /**
   * Raw request body — usually ``req.rawBody`` (Express with
   * ``express.raw``), or the string you read straight off the request
   * stream. Parsed JSON is NOT the same and will not verify.
   */
  payload: string | Buffer;
  /**
   * Request headers — must include ``webhook-id``, ``webhook-timestamp``,
   * and ``webhook-signature`` (lowercase per the Standard Webhooks spec).
   * Pass ``req.headers`` directly; header names are case-insensitive.
   */
  headers: Record<string, string | string[] | undefined>;
  /** The webhook endpoint's signing secret. */
  secret: string;
}

/** Discriminated result — the ``reason`` field lets receivers distinguish a
 * hostile forgery (log + alert) from a legitimate late retry (log + drop). */
export type VerifyWebhookResult =
  | { verified: true }
  | { verified: false; reason: string };

/**
 * Verify a Gonos webhook using the Standard Webhooks reference library.
 *
 * Returns ``{ verified: true }`` on match, ``{ verified: false, reason }``
 * otherwise. Wraps ``standardwebhooks`` so callers don't have to catch a
 * thrown ``WebhookVerificationError`` and can branch on ``reason``.
 *
 * ```ts
 * app.post("/gonos", express.raw({ type: "application/json" }), (req, res) => {
 *   const result = verifyWebhookSignature({
 *     payload: req.body,
 *     headers: req.headers as Record<string, string>,
 *     secret: process.env.GONOS_WEBHOOK_SECRET!,
 *   });
 *   if (!result.verified) {
 *     console.warn("webhook rejected:", result.reason);
 *     return res.status(401).end();
 *   }
 *   // ... handle the parsed event
 * });
 * ```
 *
 * Header names accepted by the underlying library are lowercase
 * (``webhook-id``, ``webhook-timestamp``, ``webhook-signature``).
 * Node and most frameworks normalize header keys to lowercase — if you
 * hand-build the headers dict, use lowercase keys.
 */
export function verifyWebhookSignature(opts: VerifyWebhookOptions): VerifyWebhookResult {
  const flatHeaders: Record<string, string> = {};
  for (const [k, v] of Object.entries(opts.headers)) {
    if (v === undefined) continue;
    flatHeaders[k.toLowerCase()] = Array.isArray(v) ? (v[0] ?? "") : v;
  }
  try {
    // Pass secret as raw bytes with format:"raw" so the library uses the
    // HMAC key material as-is. Without format:"raw" a string secret is
    // base64-decoded (Standard Webhooks' whsec_ convention), but Gonos
    // endpoints store the secret plain and the sender-side signer HMACs
    // with `secret.encode()`. Both sides must agree on the key material.
    new Webhook(new TextEncoder().encode(opts.secret), { format: "raw" }).verify(
      opts.payload,
      flatHeaders,
    );
    return { verified: true };
  } catch (e) {
    if (e instanceof WebhookVerificationError) {
      return { verified: false, reason: e.message };
    }
    throw e;
  }
}
