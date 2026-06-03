import { BaseResource } from "./base.js";

export class UsageResource extends BaseResource {
  async get_summary(): Promise<Array<Record<string, unknown>>> {
    const data = await this.request<
      Array<Record<string, unknown>> | { items?: Array<Record<string, unknown>> }
    >({ method: "GET", path: "/usage" });
    if (Array.isArray(data)) return data;
    return data.items ?? [];
  }

  get_quota(): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>({ method: "GET", path: "/usage/quota" });
  }
}
