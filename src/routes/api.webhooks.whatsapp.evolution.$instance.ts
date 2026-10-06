import { createFileRoute } from "@tanstack/react-router";
import { handleUnofficialWhatsAppWebhook } from "@/services/whatsapp-provider-webhook.server";

export const Route = createFileRoute("/api/webhooks/whatsapp/evolution/$instance")({
  server: {
    handlers: {
      POST: async ({ request, params }) => handleUnofficialWhatsAppWebhook(request, "evolution_api", params.instance),
    },
  },
});
