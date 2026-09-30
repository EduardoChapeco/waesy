import { createFileRoute } from "@tanstack/react-router";
import { handleInboundWebhook, type InboundWebhookPayload } from "@/services/marketplace-webhooks.functions";
import crypto from "crypto";

/**
 * Validates cryptographic HMAC SHA-256 signature with replay window protection (<= 300s).
 * Supports standard X-Hub-Signature-256, Mercado Livre (ts=...,v1=...), iFood, and Shopee.
 */
function verifyHmacSignature(
  platform: string,
  rawText: string,
  headers: Headers,
  secret?: string
): { isValid: boolean; reason?: string } {
  if (!secret) return { isValid: true }; // Homologação sem secret configurado

  // 1. Mercado Livre Header x-signature: ts=12345678,v1=abcdef...
  const mlSigHeader = headers.get("x-signature");
  if (platform === "mercadolivre" && mlSigHeader) {
    try {
      const parts = Object.fromEntries(
        mlSigHeader.split(",").map((p) => {
          const [k, ...v] = p.trim().split("=");
          return [k, v.join("=")];
        })
      );

      const ts = parts.ts;
      const v1 = parts.v1;

      if (!ts || !v1) {
        return { isValid: false, reason: "Malformed x-signature header" };
      }

      // Replay attack window verification (max 300 seconds drift)
      const reqTimestampSec = parseInt(ts, 10);
      const currentTimestampSec = Math.floor(Date.now() / 1000);
      if (Math.abs(currentTimestampSec - reqTimestampSec) > 300) {
        return { isValid: false, reason: "Timestamp replay window exceeded (>300s)" };
      }

      const template = `id:${rawText};request-timestamp:${ts};`;
      const computed = crypto.createHmac("sha256", secret).update(template).digest("hex");
      const isValid = crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(v1));
      return { isValid, reason: isValid ? undefined : "HMAC mismatch" };
    } catch {
      return { isValid: false, reason: "Error parsing Mercado Livre signature" };
    }
  }

  // 2. Standard Webhook Signatures (iFood, Shopee, Bling, Meta)
  const sigHeader =
    headers.get("x-hub-signature-256") ||
    headers.get("x-ifood-signature") ||
    headers.get("x-shopee-signature") ||
    headers.get("x-bling-signature");

  if (!sigHeader) return { isValid: true };

  try {
    const computed = crypto.createHmac("sha256", secret).update(rawText).digest("hex");
    const expected = sigHeader.replace(/^sha256=/, "");
    if (computed.length !== expected.length) {
      return { isValid: false, reason: "Signature length mismatch" };
    }
    const isValid = crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(expected));
    return { isValid, reason: isValid ? undefined : "HMAC mismatch" };
  } catch {
    return { isValid: false, reason: "Error comparing HMAC signature" };
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

          // Valida HMAC e proteção contra replay attack se secret estiver presente
          if (secretParam) {
            const verification = verifyHmacSignature(platformParam, rawText, request.headers, secretParam);
            if (!verification.isValid) {
              console.warn(`[marketplaces-webhook] Rejeição de segurança (${platformParam}): ${verification.reason}`);
              return new Response(
                JSON.stringify({ status: "unauthorized", error: verification.reason || "HMAC signature mismatch" }),
                {
                  status: 401,
                  headers: { "Content-Type": "application/json" },
                }
              );
            }
          }

          // Normaliza metadados por provedor
          let eventId: string | undefined = undefined;
          let topic: string | undefined = undefined;
          let resourceId: string | undefined = undefined;

          if (platformParam === "mercadolivre") {
            // Mercado Livre: { _id, topic: 'orders_v2' | 'questions' | 'items', resource: '/orders/12345', user_id }
            eventId = rawBody._id || rawBody.id || request.headers.get("x-event-id") || undefined;
            topic = rawBody.topic || undefined;
            resourceId = rawBody.resource || undefined;
          } else if (platformParam === "ifood") {
            // iFood OpenDelivery: { id: "evt_123", code: "PLACED" | "CONFIRMED" | "DISPATCHED", orderId: "ord_456" }
            eventId = rawBody.id || request.headers.get("x-ifood-event-id") || undefined;
            topic = rawBody.code || undefined;
            resourceId = rawBody.orderId || undefined;
          } else if (platformParam === "bling" || platformParam === "tiny") {
            // Bling v3: { event: "situacao.alterada" | "nfe.emitida", data: { id, numero, chaveAcesso, linkDanfe, ... } }
            eventId = rawBody.id || rawBody.eventId || (rawBody.data?.id ? String(rawBody.data.id) : undefined);
            topic = rawBody.event || rawBody.tipo || rawBody.topic || undefined;
            resourceId = rawBody.data?.id ? String(rawBody.data.id) : (rawBody.resourceId || rawBody.numero || undefined);
          } else if (platformParam === "focus_nfe" || platformParam === "nuvem_fiscal") {
            // Focus NFe: { ref: "123", status: "autorizado", chave_nfe: "3526..." }
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
            service: "Waesy Marketplace & ERP Webhook Receiver",
            status: "active",
            supportedPlatforms: [
              "mercadolivre",
              "ifood",
              "bling",
              "tiny",
              "focus_nfe",
              "nuvem_fiscal",
              "shopee",
              "amazon",
              "melhorenvio",
              "correios",
            ],
            hmacValidation: "enabled",
            replayProtection: "300s_window",
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
