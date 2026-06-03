import { BaseResource } from "./base.js";
import type { WebhookEndpoint } from "../models.js";

export class WebhooksResource extends BaseResource {
  create(params: { url: string; events?: string[] }): Promise<WebhookEndpoint> {
    return this.request<WebhookEndpoint>({
      method: "POST",
      path: "/webhooks/endpoints",
      body: { url: params.url, events: params.events ?? null },
    });
  }

  async list(): Promise<WebhookEndpoint[]> {
    const data = await this.request<{ items?: WebhookEndpoint[] } | WebhookEndpoint[]>({
      method: "GET",
      path: "/webhooks/endpoints",
    });
    if (Array.isArray(data)) return data;
    return data.items ?? [];
  }

  delete(endpointId: string): Promise<void> {
    return this.request<void>({
      method: "DELETE",
      path: `/webhooks/endpoints/${endpointId}`,
    });
  }
}
