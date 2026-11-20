import type {} from "@tanstack/react-start";
/**
 * API Route: POST /api/security-telemetry
 * Recebe beacons do client-side security sentinel.
 * Processamento assíncrono — resposta imediata para não afetar performance do cliente.
 */

import { createFileRoute } from "@tanstack/react-router";
import { getServerClient } from "@/lib/supabase";
import { extractClientIp } from "@/lib/rate-limiter";

export const Route = createFileRoute("/api/security-telemetry")({
 server: {
 handlers: {
 POST: async ({ request }: { request: Request }) => {
 try {
 const ip = extractClientIp(request);
 const ua = request.headers.get("user-agent") || null;

 let body: Record<string, unknown> = {};
 try {
 body = await request.json();
 } catch {
 return new Response(JSON.stringify({ received: false }), {
 status: 400,
 headers: { "Content-Type": "application/json" },
 });
 }

 const eventType = String((body.eventType as string) || "unknown_event").slice(0, 64);
 const fingerprint = body.fingerprint ? String(body.fingerprint).slice(0, 128) : null;
 const rawDetails = (body.details as Record<string, unknown>) || {};
 let cappedDetails: Record<string, unknown> = { via_api_beacon: true };
 try {
   const serialized = JSON.stringify(rawDetails);
   cappedDetails =
     serialized.length > 1024
       ? { _truncated: true, _length: serialized.length, via_api_beacon: true }
       : { ...rawDetails, via_api_beacon: true };
 } catch {
   cappedDetails = { via_api_beacon: true };
 }

 // Fire-and-forget seguro
 try {
 const db = getServerClient();
 await db.rpc("report_security_telemetry", {
 p_event_type: eventType,
 p_ip_address: ip,
 p_user_agent: ua ? ua.slice(0, 256) : null,
 p_device_fingerprint: fingerprint,
 p_details: cappedDetails,
 });
 } catch (e: unknown) {
 console.warn("[api/security-telemetry] DB error:", e instanceof Error ? e.message : String(e));
 }

 // Responder imediatamente (204 No Content — beacon não precisa de resposta)
 return new Response(null, { status: 204 });
 } catch (e) {
 console.warn("[api/security-telemetry] Error:", e);
 return new Response(null, { status: 204 }); // Sempre 204 — não revela estado interno
 }
 },
 },
 },
} as never)
