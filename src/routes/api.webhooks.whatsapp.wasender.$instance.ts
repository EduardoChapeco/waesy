import { createFileRoute } from "@tanstack/react-router";
import { handleUnofficialWhatsAppWebhook } from "@/services/whatsapp-provider-webhook.server";

export const Route = createFileRoute("/api/webhooks/whatsapp/wasender/$instance")({
  server: {
    handlers: {
      POST: async ({ request, params }) => handleUnofficialWhatsAppWebhook(request, "wasender_api", params.instance),
    },
  },
});
