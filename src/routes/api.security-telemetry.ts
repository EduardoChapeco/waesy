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

 const eventType = (body.eventType as string) || "unknown_event";
 const fingerprint = (body.fingerprint as string) || null;
 const details = (body.details as Record<string, unknown>) || {};

 // Fire-and-forget seguro
 try {
 const db = getServerClient();
 await db.rpc("report_security_telemetry", {
 p_event_type: eventType,
 p_ip_address: ip,
 p_user_agent: ua,
 p_device_fingerprint: fingerprint,
 p_details: { ...details, via_api_beacon: true },
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
