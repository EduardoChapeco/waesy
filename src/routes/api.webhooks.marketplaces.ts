import { createFileRoute } from "@tanstack/react-router";
import { handleInboundWebhook, type InboundWebhookPayload } from "@/services/marketplace-webhooks.functions";
import crypto from "crypto";

function verifyHmacSignature(platform: string, rawText: string, headers: Headers, secret?: string): boolean {
  if (!secret) return true; // Homologação sem secret configurado
  const sigHeader = headers.get("x-hub-signature-256") || headers.get("x-ifood-signature") || headers.get("x-shopee-signature");
  if (!sigHeader) return true;

  try {
    const computed = crypto.createHmac("sha256", secret).update(rawText).digest("hex");
    const expected = sigHeader.replace(/^sha256=/, "");
    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(expected));
  } catch {
    return false;
  }
}

export const Route = createFileRoute("/api/webhooks/marketplaces")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const platformParam = url.searchParams.get("platform") || "mercadolivre";
          const storeIdParam = url.searchParams.get("store_id") || undefined;
          const secretParam = url.searchParams.get("secret") || process.env.MARKETPLACE_WEBHOOK_SECRET;

          const rawText = await request.text();
          let rawBody: any = {};
          try {
            rawBody = JSON.parse(rawText);
          } catch {
            rawBody = {};
          }

          // Valida HMAC se secret estiver presente
          if (secretParam && !verifyHmacSignature(platformParam, rawText, request.headers, secretParam)) {
            console.warn(`[marketplaces-webhook] Assinatura HMAC inválida para plataforma ${platformParam}`);
            return new Response(JSON.stringify({ status: "unauthorized", error: "HMAC signature mismatch" }), {
              status: 401,
              headers: { "Content-Type": "application/json" },
            });
          }

          // Normaliza metadados por provedor
          let eventId: string | undefined = undefined;
          let topic: string | undefined = undefined;
          let resourceId: string | undefined = undefined;

          if (platformParam === "mercadolivre") {
            // Mercado Livre envia: { _id, topic: 'orders_v2', resource: '/orders/12345', user_id, application_id }
            eventId = rawBody._id || rawBody.id || request.headers.get("x-event-id") || undefined;
            topic = rawBody.topic || undefined;
            resourceId = rawBody.resource || undefined;
          } else if (platformParam === "ifood") {
            // iFood OpenDelivery envia: { id: "evt_123", code: "PLACED", orderId: "ord_456" }
            eventId = rawBody.id || request.headers.get("x-ifood-event-id") || undefined;
            topic = rawBody.code || undefined;
            resourceId = rawBody.orderId || undefined;
          } else if (platformParam === "focus_nfe" || platformParam === "nuvem_fiscal") {
            // Focus NFe envia: { ref: "123", status: "autorizado", chave_nfe: "3526..." }
            eventId = rawBody.ref || rawBody.id || rawBody.chave_nfe || undefined;
            topic = rawBody.status || rawBody.situacao || undefined;
            resourceId = rawBody.ref || rawBody.chave_nfe || undefined;
          } else {
            eventId = rawBody.id || rawBody.eventId || undefined;
            topic = rawBody.topic || rawBody.event_type || undefined;
            resourceId = rawBody.resourceId || rawBody.orderId || undefined;
          }

          const webhookData: InboundWebhookPayload = {
            platform: platformParam as any,
            eventId,
            topic,
            resourceId,
            storeId: storeIdParam,
            payload: rawBody,
          };

          const result = await handleInboundWebhook(webhookData);

          return new Response(JSON.stringify(result), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (e: any) {
          console.error("[marketplaces-webhook] Erro no processamento:", e);
          return new Response(
            JSON.stringify({ status: "failed", error: e?.message || "Internal Server Error" }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }
          );
        }
      },
      GET: async () => {
        return new Response(
          JSON.stringify({
            service: "Waesy Marketplace Webhook Receiver",
            status: "active",
            supportedPlatforms: ["mercadolivre", "ifood", "focus_nfe", "nuvem_fiscal", "shopee", "melhorenvio", "correios"],
            hmacValidation: "enabled",
            timestamp: new Date().toISOString(),
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        );
      },
    },
  },
});

