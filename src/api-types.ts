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

// Exports
export type ExportCreateBody = Schemas["ExportJobCreate"];
export type ExportResponse = Schemas["ExportJobResponse"];

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
