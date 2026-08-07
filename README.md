# @gonos/sdk

Node.js / TypeScript client for the [Gonos](https://gonos.co) background-check
API. Mirrors the Python SDK shape so docs and examples translate 1:1.

## Status

Typed resource namespaces (`client.candidates`, `client.checks`,
`client.consent`, `client.reports`, `client.adverse_actions`,
`client.disputes`, `client.webhooks`, `client.billing`, `client.analytics`,
`client.exports`, `client.usage`) mirror the Python SDK 1:1, alongside the
typed error hierarchy and request lifecycle. For endpoints not yet wrapped by
a resource, the low-level `client.request(...)` remains available (optionally
typed via `api.d.ts`, see below).

## Install

```bash
npm install @gonos/sdk
```

The package is **ESM-only** (`"type": "module"`) and requires Node ≥ 18.
There is no CommonJS build — `require("@gonos/sdk")` is not supported. Use
`import`, or a dynamic `await import("@gonos/sdk")` from a CJS file.

### Deno and edge runtimes

The client makes requests through `globalThis.fetch` and imports nothing
from `node:*`, so it runs unmodified on Deno, Supabase Edge Functions,
Cloudflare Workers, and Vercel Edge — no separate build, no hand-ported
copy:

```typescript
// Deno / Supabase Edge Functions
import { GonosClient, verifyWebhookSignature } from "npm:@gonos/sdk";

const client = new GonosClient({ apiKey: Deno.env.get("GONOS_API_KEY")! });
```

Pass `fetchImpl` if a runtime needs a wrapped or instrumented fetch:

```typescript
const client = new GonosClient({ apiKey, fetchImpl: myTracedFetch });
```

Webhook verification works the same everywhere, because it has no Node
dependency either — the Standard Webhooks library it wraps uses pure-JS
SHA-256 and base64 and its own constant-time compare:

```typescript
const result = verifyWebhookSignature({
  payload: rawBody, // the raw bytes, not parsed JSON
  headers: req.headers,
  secret: Deno.env.get("GONOS_WEBHOOK_SECRET")!,
});
if (!result.verified) return new Response(null, { status: 401 });
```

Prefer this over a hand-rolled HMAC check. It enforces **timestamp
freshness**, which a signature check alone does not: without it, a captured
request body replays against your endpoint indefinitely with a permanently
valid signature.

## Quick start

```typescript
import { GonosClient, ApiError, RateLimitError } from "@gonos/sdk";

const client = new GonosClient({
  apiKey: process.env.GONOS_API_KEY!,
  // baseUrl: "https://api.gonos.co",  // default
});

try {
  const candidate = await client.candidates.create({
    first_name: "Jane",
    last_name: "Doe",
    email: "jane@example.com",
  });

  const check = await client.checks.create({
    candidate_id: candidate.id,
    package: "standard",
    permissible_purpose: "employment",
  });
  await client.checks.submit(check.id);

  console.log("submitted check:", check.id);
} catch (err) {
  if (err instanceof RateLimitError) {
    console.log("rate limited; retry after", err.retry_after, "seconds");
  } else if (err instanceof ApiError) {
    console.log("api error", err.status_code, err.error_code, err.detail);
  } else {
    throw err;
  }
}
```

## Typed request/response shapes

Spec-accurate types for every operation, generated from the committed
`openapi.json` and exported at the package root:

```typescript
import type {
  CandidateCreateBody,
  CandidateResponse,
  CheckCreateBody,
  WebhookEndpointResponse,
  ErrorEnvelope,
} from "@gonos/sdk";

// Full spec surface — dive in when you need something not aliased above.
import type { paths, components } from "@gonos/sdk";
type BulkImportBody =
  paths["/api/v1/candidates/bulk"]["post"]["requestBody"]["content"]["application/json"];

// Generic helpers for one-off operations without naming a schema:
import type { RequestBody, ResponseBody } from "@gonos/sdk";
type CreateBody = RequestBody<"/api/v1/candidates", "post">;
type GetOk = ResponseBody<"/api/v1/candidates/{candidate_id}", "get">;
```

The generated types are the source of truth. The older hand-written
interfaces in `models.ts` (`Candidate`, `Check`, etc.) are kept for
backward compatibility but marked `@deprecated` — prefer the generated
aliases for new code.

## Raw requests

For endpoints without a resource wrapper, call `client.request(...)` directly
(note the full `/api/v1` path):

```typescript
const result = await client.request<CandidateResponse>({
  method: "POST",
  path: "/api/v1/candidates",
  body: { first_name: "Jane", last_name: "Doe" } satisfies CandidateCreateBody,
});
```

Regenerate the type file manually if needed (auto-runs before every build/test):

```bash
npm run generate   # writes src/api.ts (gitignored)
```

## Error handling

Every non-2xx response raises a typed error. See ``src/errors.ts`` for the
full hierarchy — mirrors the Python SDK.

| Status | Class | Notes |
|---|---|---|
| 401 | AuthenticationError | Invalid / missing API key |
| 403 | ForbiddenError | Valid key, insufficient scope |
| 404 | NotFoundError | |
| 400 / 422 | ValidationError | |
| 409 | ConflictError | State-machine conflict |
| 412 | PreconditionFailedError | If-Match version conflict |
| 413 | PayloadTooLargeError | |
| 415 | UnsupportedMediaTypeError | |
| 423 | LockedError | Consent revoked, freeze active, etc. |
| 429 | RateLimitError | Honor ``retry_after`` |
| 500 | ServerError | Retry with backoff |
| 502 | BadGatewayError | Upstream provider — retry |
| 503 | ServiceUnavailableError | Honor Retry-After |
| 504 | GatewayTimeoutError | Upstream provider timeout |

## Building

```bash
npm install
npm run build
```

## License

MIT
