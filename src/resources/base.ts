import type { GonosClient } from "../client.js";

/** Query parameters accepted by resource requests. */
export type Query = Record<string, string | number | boolean | undefined>;

/**
 * Shared base for resource namespaces. Holds the client and prefixes every
 * request path with the API version, mirroring the Python SDK which bakes
 * `/api/v1` into the HTTP base URL.
 */
export class BaseResource {
  constructor(protected readonly client: GonosClient) {}

  protected request<T>(opts: {
    method?: string;
    path: string;
    query?: Query;
    body?: unknown;
    headers?: Record<string, string>;
  }): Promise<T> {
    return this.client.request<T>({ ...opts, path: `/api/v1${opts.path}` });
  }
}
