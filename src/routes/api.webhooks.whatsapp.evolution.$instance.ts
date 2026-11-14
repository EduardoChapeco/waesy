import { createFileRoute } from "@tanstack/react-router";
import { handleUnofficialWhatsAppWebhook } from "@/services/whatsapp-provider-webhook.server";

export const Route = createFileRoute("/api/webhooks/whatsapp/evolution/$instance")({
  server: {
    handlers: {
      GET: async ({ params }: { params: { instance: string } }) =>
        new Response(JSON.stringify({ ok: true, provider: "evolution_api", instance: params.instance }), {
          status: 200,
          headers: { "content-type": "application/json", "cache-control": "no-store" },
        }),
      POST: async ({ request, params }: { request: Request; params: { instance: string } }) => handleUnofficialWhatsAppWebhook(request, "evolution_api", params.instance),
    },
  },
} as never);
