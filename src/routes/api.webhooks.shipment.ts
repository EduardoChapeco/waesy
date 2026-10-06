import { createFileRoute } from "@tanstack/react-router";
import { getServerClient } from "@/lib/supabase";
import { verifyWebhookSignature } from "@/lib/webhook-signature";

export const Route = createFileRoute("/api/webhooks/shipment")({
 server: {
 handlers: {
 POST: async ({ request }) => {
 try {
 const rawBody = await request.text();
 const verification = verifyWebhookSignature(rawBody, request.headers, process.env.SHIPMENT_WEBHOOK_SECRET);
 if (!verification.ok) {
 return new Response(JSON.stringify({ error: verification.reason }), {
 status: 401,
 headers: { "Content-Type": "application/json" },
 });
 }
 const body = JSON.parse(rawBody) as Record<string, any>;
 const {
 order_id,
 tracking_code,
 carrier_name,
 status,
 tracking_url,
 provider = "webhook",
 } = body;

 if (!order_id && !tracking_code) {
 return new Response(JSON.stringify({ error: "Missing order_id or tracking_code" }), {
 status: 400,
 headers: { "Content-Type": "application/json" },
 });
 }

 const supabase = getServerClient();

 // Generate a predictable idempotency key for this event
 const idempotencyKey = body.idempotency_key || body.id || `${order_id || tracking_code}-${status}-${new Date().getTime()}`;

 // Utilize the ACID stored procedure for Transactional Inbox and robust idempotency
 const { data, error } = await supabase.rpc("process_shipment_webhook_atomic", {
 p_provider: provider,
 p_idempotency_key: idempotencyKey,
 p_order_id: order_id || null,
 p_tracking_code: tracking_code || null,
 p_carrier_name: carrier_name || null,
 p_tracking_url: tracking_url || null,
 p_status: status || 'update',
 p_payload: body
 });

 if (error) {
 console.error("[shipment-webhook] Atomic RPC Error:", error);
 return new Response(JSON.stringify({ error: "Failed to process shipment webhook securely" }), {
 status: 500,
 headers: { "Content-Type": "application/json" },
 });
 }

 return new Response(JSON.stringify(data), {
 status: 200,
 headers: { "Content-Type": "application/json" },
 });
 } catch (e: unknown) {
 console.error("[shipment-webhook] Exception:", e);
 return new Response(JSON.stringify({ error: "Internal Server Error" }), {
 status: 500,
 headers: { "Content-Type": "application/json" },
 });
 }
 },
 },
 },
});
