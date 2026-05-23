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
 *
 * Type definitions for every endpoint are generated from the committed
 * `openapi.json` artifact via ``npm run generate``. Run that after pulling
 * a new commit to pick up any new endpoints or shape changes.
 */

export {
  GonosClient,
  type GonosClientOptions,
} from "./client.js";
export * from "./errors.js";
