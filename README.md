# @gonos/sdk

Node.js / TypeScript client for the [Gonos](https://gonos.co) background-check
API. Mirrors the Python SDK shape so docs and examples translate 1:1.

## Status

This SDK is a scaffold — error handling, auth, the request lifecycle, and the
type-generation pipeline are wired up; resource-specific helper classes (the
``client.candidates.create(...)`` style sugar) are not yet present. Use the
generic ``client.request(...)`` plus generated types from ``api.d.ts`` in the
interim.

## Install

```bash
npm install @gonos/sdk
```

## Generate types

The SDK's types are generated from the committed ``openapi.json`` artifact in
this repo. After updating the SDK to a new server version:

```bash
npm run generate
```

This writes ``src/api.d.ts``.

## Quick start

```typescript
import { GonosClient, ApiError, RateLimitError } from "@gonos/sdk";

const client = new GonosClient({
  apiKey: process.env.GONOS_API_KEY!,
  // baseUrl: "https://api.gonos.co",  // default
});

try {
  const result = await client.request({
    method: "POST",
    path: "/api/v1/candidates",
    body: {
      first_name: "Jane",
      last_name: "Doe",
      email: "jane@example.com",
    },
  });
  console.log("created:", result);
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
