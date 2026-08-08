/**
 * Typed convenience aliases over the auto-generated ``api.ts``.
 *
 * ``api.ts`` is emitted by ``openapi-typescript`` from the committed
 * ``openapi.json`` (run ``make sdk-api-types`` from the repo root). It's the
 * full path × method × schema graph — 100% accurate but verbose to consume:
 *
 *     paths["/api/v1/candidates"]["post"]["requestBody"]["content"]["application/json"]
 *
 * The aliases below wrap that in short names an integrator can import
 * directly:
 *
 *     import type { CandidateCreateBody, CandidateResponse } from "@gonos/sdk";
 *
 * If a shape you need isn't aliased yet, reach into ``paths`` / ``components``
 * yourself — the raw types are also re-exported from the package root.
 */

import type { components, paths } from "./api.js";

/** Full path × method × schema graph from openapi.json. */
export type { paths, components } from "./api.js";

// ---------------------------------------------------------------------------
// Reusable schema aliases — pull the most common request/response shapes.
// Prefer these over reaching into ``components["schemas"][…]`` yourself:
// the aliases stay stable even if openapi-typescript changes its output
// shape, and IDE autocomplete on ``@gonos/sdk`` surfaces them directly.
// ---------------------------------------------------------------------------

type Schemas = components["schemas"];

// Candidates
export type CandidateCreateBody = Schemas["CandidateCreate"];
export type CandidateUpdateBody = Schemas["CandidateUpdate"];
export type CandidateResponse = Schemas["CandidateResponse"];
export type CandidateDetailResponse = Schemas["CandidateDetailResponse"];
export type CandidateListItem = Schemas["CandidateListItem"];

// Checks
export type CheckCreateBody = Schemas["CheckCreate"];
export type CheckResponse = Schemas["CheckResponse"];

// Consent
export type ConsentSessionCreateBody = Schemas["ConsentSessionCreate"];
export type ConsentSessionResponse = Schemas["ConsentSessionResponse"];

// Reports
export type ReportResponse = Schemas["ReportResponse"];

// Adverse actions
export type AdverseActionCreateBody = Schemas["AdverseActionCreate"];
export type AdverseActionResponse = Schemas["AdverseActionResponse"];

// Disputes
export type DisputeCreateBody = Schemas["DisputeCreate"];
export type DisputeResponse = Schemas["DisputeResponse"];

// Webhooks
export type WebhookEndpointCreateBody = Schemas["WebhookEndpointCreate"];
export type WebhookEndpointResponse = Schemas["WebhookEndpointResponse"];
export type WebhookEndpointCreateResponse = Schemas["WebhookEndpointCreateResponse"];

/**
 * Every ``event_type`` value the API can emit on a webhook. Import into a
 * ``switch (event.event_type)`` and TypeScript enforces exhaustiveness —
 * a new event type added server-side becomes a compile error at every
 * consumer, instead of silently falling through to ``default``.
 *
 *     import type { WebhookEventType } from "@gonos/sdk";
 *
 *     function handle(event: { event_type: WebhookEventType }) {
 *       switch (event.event_type) {
 *         case "check.completed": ...
 *         case "consent_session.completed": ...
 *         // ...every other case...
 *         default: {
 *           const _exhaustive: never = event.event_type;
 *           throw new Error(`unhandled event: ${_exhaustive}`);
 *         }
 *       }
 *     }
 */
export type WebhookEventType = Schemas["WebhookEventType"];

// Typed payload shapes for the subset of events the API emits with a
// specific schema. Events not listed here carry a payload of the generic
// ``WebhookPayloadCatalog`` shape — inspect ``event_type`` and cast if
// you need typed access to fields specific to a payload we haven't
// carved out yet.
export type CheckCompletedPayload = Schemas["CheckCompletedPayload"];
export type CheckPartialPayload = Schemas["CheckPartialPayload"];
export type ConsentSignedPayload = Schemas["ConsentSignedPayload"];
export type ReportReadyPayload = Schemas["ReportReadyPayload"];
export type AdverseActionCreatedPayload = Schemas["AdverseActionCreatedPayload"];
export type AdverseActionPreNoticeSentPayload = Schemas["AdverseActionPreNoticeSentPayload"];
export type AdverseActionFinalNoticeSentPayload = Schemas["AdverseActionFinalNoticeSentPayload"];
export type DisputeSubmittedPayload = Schemas["DisputeSubmittedPayload"];
export type DisputeResolvedPayload = Schemas["DisputeResolvedPayload"];
export type WebhookPayloadCatalog = Schemas["WebhookPayloadCatalog"];

// Exports
export type ExportCreateBody = Schemas["ExportJobCreate"];
export type ExportResponse = Schemas["ExportJobResponse"];

// Reports / check items
export type CheckItemResponse = Schemas["CheckItemResponse"];

// Billing
export type InvoiceResponse = Schemas["InvoiceResponse"];

// Common error envelope — every 4xx/5xx returns this shape.
export type ErrorEnvelope = Schemas["ErrorResponse"];

// ---------------------------------------------------------------------------
// Path-level helpers. These are tiny generics for the common case where you
// want the request body or a specific response of a single operation without
// naming the schema separately (useful when the schema doesn't have a stable
// name in ``components``).
// ---------------------------------------------------------------------------

/** Type of the ``application/json`` request body of a specific operation, e.g.
 *
 *     type Body = RequestBody<"/api/v1/candidates", "post">;
 */
export type RequestBody<
  Path extends keyof paths,
  Method extends keyof paths[Path],
> = paths[Path][Method] extends {
  requestBody: { content: { "application/json": infer B } };
}
  ? B
  : never;

/** Type of the JSON response body of a specific operation at a given status
 * (default ``200``), e.g.
 *
 *     type Ok = ResponseBody<"/api/v1/candidates/{candidate_id}", "get">;
 *     type Created = ResponseBody<"/api/v1/candidates", "post", 201>;
 */
export type ResponseBody<
  Path extends keyof paths,
  Method extends keyof paths[Path],
  Status extends number = 200,
> = paths[Path][Method] extends {
  responses: infer R;
}
  ? Status extends keyof R
    ? R[Status] extends { content: { "application/json": infer B } }
      ? B
      : never
    : never
  : never;
