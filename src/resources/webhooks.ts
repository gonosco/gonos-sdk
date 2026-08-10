import { BaseResource } from "./base.js";
import type {
  WebhookEndpointCreateBody,
  WebhookEndpointResponse,
} from "../api-types.js";

export class WebhooksResource extends BaseResource {
  create(params: WebhookEndpointCreateBody): Promise<WebhookEndpointResponse> {
    return this.request<WebhookEndpointResponse>({
      method: "POST",
      path: "/webhooks/endpoints",
      body: params,
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
      path: `/webhooks/endpoints/${encodeURIComponent(endpointId)}`,
    });
  }
}
