import { createFileRoute } from "@tanstack/react-router";
import crypto from "node:crypto";
import { getServerClient } from "@/lib/supabase";
import { verifyWebhookSignature } from "@/lib/webhook-signature";

function verifyMercadoPagoSignature(rawBody: string, headers: Headers, secret?: string): boolean {
  if (!secret) return false;
  const signature = headers.get("x-signature");
  const requestId = headers.get("x-request-id");
  if (!signature || !requestId) return false;
  const parts = Object.fromEntries(signature.split(",").map((part) => {
    const [key, value] = part.trim().split("=", 2);
    return [key, value];
  }));
  const ts = parts.ts;
  const v1 = parts.v1;
  const body = JSON.parse(rawBody) as Record<string, any>;
  const dataId = String(body.data?.id || body.id || "").toLowerCase();
  if (!ts || !v1 || !dataId) return false;
  if (Math.abs(Math.floor(Date.now() / 1000) - Number(ts)) > 300) return false;
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const expected = crypto.createHmac("sha256", secret).update(manifest).digest("hex");
  return expected.length === v1.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(v1));
}

export const Route = createFileRoute("/api/webhooks/payments")({
  server: { handlers: {
    POST: async ({ request }: { request: Request }) => {
      const rawBody = await request.text();
      const provider = request.headers.get("x-waesy-provider") || "mercado_pago";
      const secret = process.env.PAYMENT_WEBHOOK_SECRET || process.env.MERCADO_PAGO_WEBHOOK_SECRET;
      let verified = false;
      if (provider === "mercado_pago") {
        verified = verifyMercadoPagoSignature(rawBody, request.headers, secret);
      }
      if (!verified) {
        verified = verifyWebhookSignature(rawBody, request.headers, secret).ok;
      }
      if (!verified) return Response.json({ error: "Webhook não autenticado" }, { status: 401 });

      let body: Record<string, any>;
      try { body = JSON.parse(rawBody); } catch { return Response.json({ error: "JSON inválido" }, { status: 400 }); }
      const payment = body.data?.object || body.payment || body;
      const eventId = String(body.id || body.event_id || request.headers.get("x-request-id") || payment.id || "");
      const providerRef = String(payment.id || payment.payment_id || "");
      const status = String(payment.status || body.status || body.type || "processing");
      const orderId = payment.external_reference ? String(payment.external_reference) : null;
      const amount = Number(payment.transaction_amount ?? payment.amount ?? payment.value);
      if (!eventId || !providerRef || !Number.isInteger(Math.round(amount * 100))) {
        return Response.json({ error: "Payload de pagamento incompleto" }, { status: 400 });
      }
      const db = getServerClient();
      const { data, error } = await db.rpc("process_marketplace_payment_webhook_atomic", {
        p_provider: provider,
        p_event_id: eventId,
        p_provider_ref: providerRef,
        p_order_id: orderId,
        p_status: status,
        p_amount_cents: Math.round(amount * 100),
        p_payload: body,
      });
      if (error) {
        console.error("[payment-webhook] atomic processing failed", error);
        return Response.json({ error: "Falha ao processar webhook" }, { status: 500 });
      }
      return Response.json(data, { status: 200 });
    },
  }},
} as never);
