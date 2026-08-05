/**
 * Gonos SDK — TypeScript client for the background-check API.
 *
 * Mirrors the Python SDK (`sdk/src/gonos_sdk/`) so docs and examples are
 * cross-compatible. Designed to run in Node ≥ 18 and modern browsers.
 *
 * Quick start:
 *   import { GonosClient } from "@gonos/sdk";
 *   const client = new GonosClient({ apiKey: process.env.GONOS_API_KEY! });
 *   const candidate = await client.candidates.create({
 *     first_name: "Jane",
 *     last_name: "Doe",
 *     email: "jane@example.com",
 *   });
 *   const check = await client.checks.create({
 *     candidate_id: candidate.id,
 *     package: "standard",
 *     permissible_purpose: "employment",
 *   });
 *
 * For endpoints not yet wrapped by a resource, use the low-level
 * `client.request(...)`. Optionally run `npm run generate` to emit
 * `src/api.d.ts` from the committed OpenAPI artifact for fully-typed
 * raw requests.
 */

export { GonosClient, type GonosClientOptions } from "./client.js";
export * from "./errors.js";
export * from "./models.js";
export {
  verifyWebhookSignature,
  Webhook,
  WebhookVerificationError,
  type VerifyWebhookOptions,
  type VerifyWebhookResult,
} from "./webhooks.js";

// Resource classes and their parameter types.
export {
  CandidatesResource,
  type CandidateCreateParams,
} from "./resources/candidates.js";
export { ChecksResource, type CheckCreateParams } from "./resources/checks.js";
export { ConsentResource, type ConsentCreateParams } from "./resources/consent.js";
export { ReportsResource } from "./resources/reports.js";
export {
  AdverseActionsResource,
  type AdverseActionCreateParams,
} from "./resources/adverse_actions.js";
export { DisputesResource, type DisputeCreateParams } from "./resources/disputes.js";
export { WebhooksResource } from "./resources/webhooks.js";
export { AnalyticsResource } from "./resources/analytics.js";
export { UsageResource } from "./resources/usage.js";
export { BillingResource } from "./resources/billing.js";
export { ExportsResource, type ExportCreateParams } from "./resources/exports.js";
