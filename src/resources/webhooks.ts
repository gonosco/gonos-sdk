import { BaseResource } from "./base.js";
import type { WebhookEndpointResponse } from "../api-types.js";

export class WebhooksResource extends BaseResource {
  create(params: { url: string; events?: string[] }): Promise<WebhookEndpointResponse> {
    return this.request<WebhookEndpointResponse>({
      method: "POST",
      path: "/webhooks/endpoints",
      body: { url: params.url, events: params.events ?? null },
    });
  }

  async list(): Promise<WebhookEndpointResponse[]> {
    const data = await this.request<{ items?: WebhookEndpointResponse[] } | WebhookEndpointResponse[]>({
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
