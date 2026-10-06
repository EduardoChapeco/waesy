import { createFileRoute } from "@tanstack/react-router";
import { getServerClient } from "@/lib/supabase";
import { verifyWebhookSignature } from "@/lib/webhook-signature";

export const Route = createFileRoute("/api/webhooks/pix")({
 server: {
 handlers: {
 POST: async ({ request }) => {
 try {
 const rawBody = await request.text();
 const verification = verifyWebhookSignature(rawBody, request.headers, process.env.PIX_WEBHOOK_SECRET);
 if (!verification.ok) {
 return new Response(JSON.stringify({ error: verification.reason }), {
 status: 401,
 headers: { "Content-Type": "application/json" },
 });
 }
 const body = JSON.parse(rawBody) as Record<string, any>;
 
 // Compatibilidade com gateways PIX comuns (Pagar.me, Asaas, MercadoPago)
 const transactionId = body.transaction_id || body.id || body.payment_id;
 const storeId = body.store_id || body.metadata?.store_id;
 const tokensToCredit = body.tokens_to_credit || body.metadata?.tokens_to_credit;
 const amountCents = body.amount_cents || body.amount || body.value;
 const packageId = body.package_id || body.metadata?.package_id || "CUSTOM_PIX";
 const status = body.status || body.event;
 
 const gatewayName = body.gateway_name || "pix_gateway";

 if (!transactionId || !storeId || !tokensToCredit || !amountCents) {
 return new Response(JSON.stringify({ error: "Missing required fields for idempotency or processing" }), {
 status: 400,
 headers: { "Content-Type": "application/json" },
 });
 }

 // Somente recarrega em status finais de sucesso.
 // Eventos de falha ou processamento inicial são ignorados com 200 (idempotência amigável).
 const successStatuses = ["approved", "paid", "PAYMENT_RECEIVED", "CONFIRMED"];
 if (!successStatuses.includes(status)) {
 return new Response(JSON.stringify({ success: true, message: "Ignored status", status }), {
 status: 200,
 headers: { "Content-Type": "application/json" },
 });
 }

 const supabase = getServerClient();

 // Utiliza a procedure ACID para garantir Inbox Transacional e Imunidade a Race Conditions/Replays
 // A RPC insere o evento no token_recharge_webhooks_inbox, e apenas continua se não houver conflito de idempotency_key.
 const { data, error } = await supabase.rpc("process_token_payment_webhook_atomic", {
 p_gateway_name: gatewayName,
 p_idempotency_key: transactionId, 
 p_store_id: storeId,
 p_package_id: packageId,
 p_tokens_to_credit: Number(tokensToCredit),
 p_amount_cents: Number(amountCents),
 p_gateway_payment_id: transactionId,
 p_payload: body
 });

 if (error) {
 console.error("[pix-webhook] Atomic RPC Error:", error);
 return new Response(JSON.stringify({ error: "Failed to process webhook securely" }), {
 status: 500,
 headers: { "Content-Type": "application/json" },
 });
 }

 return new Response(JSON.stringify(data), {
 status: 200,
 headers: { "Content-Type": "application/json" },
 });
 } catch (e: unknown) {
 console.error("[pix-webhook] Critical Exception:", e);
 return new Response(JSON.stringify({ error: "Internal Server Error" }), {
 status: 500,
 headers: { "Content-Type": "application/json" },
 });
 }
 },
 },
 },
});
