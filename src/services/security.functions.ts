/**
 * security.functions.ts — BFF Server Functions para Certificação Transacional
 *
 * Todas as funções são SECURITY DEFINER no banco — o servidor gera os hashes,
 * nunca o cliente. O fingerprint do cliente é aceito apenas como metadado
 * de telemetria, NUNCA como prova de identidade.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getRequest } from "@tanstack/start-server-core";
import { extractClientIp } from "@/lib/rate-limiter";


// ─── Helper: extrair cabeçalhos Cloudflare ────────────────────────────────────

function extractGeoHeaders(req?: Request | null): { country: string | null; city: string | null } {
 if (!req) return { country: null, city: null };
 return {
 country: req.headers.get("cf-ipcountry"),
 city: req.headers.get("cf-ipcity"),
 };
}

// ─── Schema base de telemetria do cliente ─────────────────────────────────────

const ClientTelemetrySchema = z.object({
 deviceFingerprint: z.string().max(128).optional().default("unknown"),
 clientTimestamp: z.string().datetime({ offset: true }).optional(),
});

// ============================================================================
// 1. generateTransactionCertificate — Cria certificado antes da transação
// ============================================================================

const GenerateCertSchema = ClientTelemetrySchema.extend({
 entityType: z.enum([
 "order", "pos_sale", "booking", "appointment",
 "contract_signature", "group_tour_boarding",
 "delivery_pin_generation", "delivery_confirmation",
 "credit_redemption", "coupon_application",
 "gift_card_redemption", "token_transfer", "kyc_verification",
 ]),
 entityId: z.string().uuid().optional().nullable(),
 storeId: z.string().uuid().optional().nullable(),
 payloadSnapshot: z.record(z.any()).default({}),
});

export const generateTransactionCertificate = createServerFn({ method: "POST" })
 .validator(GenerateCertSchema)
 .handler(async ({ data }) => {
 const req = getRequest();
 const db = getServerClient();

 const ip = extractClientIp(req);
 const ua = req?.headers.get("user-agent") || null;
 const { country, city } = extractGeoHeaders(req);

 const clientTs = data.clientTimestamp
 ? new Date(data.clientTimestamp).toISOString()
 : new Date().toISOString();

 const { data: result, error } = await db.rpc("generate_transaction_certificate", {
 p_entity_type: data.entityType,
 p_entity_id: data.entityId || null,
 p_store_id: data.storeId || null,
 p_payload_snapshot: data.payloadSnapshot,
 p_ip_address: ip,
 p_user_agent: ua,
 p_device_fingerprint: data.deviceFingerprint,
 p_geo_country: country,
 p_geo_city: city,
 p_client_timestamp: clientTs,
 });

 if (error) {
 throw new Error("[security] Falha ao gerar certificado: " + error.message);
 }

 const res = result as {
 success: boolean;
 certificate_id: string;
 certificate_hash: string;
 server_timestamp: string;
 risk_score: number;
 auto_flagged: boolean;
 };

 return {
 certificateId: res.certificate_id,
 certificateHash: res.certificate_hash,
 serverTimestamp: res.server_timestamp,
 riskScore: res.risk_score,
 autoFlagged: res.auto_flagged,
 };
 });

// ============================================================================
// 2. updateCertificateEntityId — Vincula o entity_id após criação do pedido
// ============================================================================

export const updateCertificateEntityId = createServerFn({ method: "POST" })
 .validator(z.object({
 certificateId: z.string().uuid(),
 entityId: z.string().uuid(),
 }))
 .handler(async ({ data }) => {
 const db = getServerClient();

 const { error } = await db.rpc("update_certificate_entity_id", {
 p_certificate_id: data.certificateId,
 p_entity_id: data.entityId,
 });

 if (error) {
 console.warn("[security] updateCertificateEntityId:", error.message);
 }

 return { success: !error };
 });

// ============================================================================
// 3. reportSecurityTelemetry — Beacon do client-side sentinel
// ============================================================================

const TelemetryReportSchema = z.object({
 eventType: z.enum([
 "devtools_opened", "devtools_closed", "burp_suite_detected",
 "suspicious_headers", "automation_detected", "rapid_requests",
 "uuid_enumeration", "replay_attempt",
 ]),
 fingerprint: z.string().max(128).optional(),
 details: z.record(z.any()).default({}),
});

export const reportSecurityTelemetry = createServerFn({ method: "POST" })
 .validator(TelemetryReportSchema)
 .handler(async ({ data }) => {
 const req = getRequest();
 const db = getServerClient();

 const ip = extractClientIp(req);
 const ua = req?.headers.get("user-agent") || null;

 // Fire and forget — não esperar resposta
 Promise.resolve(
 db.rpc("report_security_telemetry", {
 p_event_type: data.eventType,
 p_ip_address: ip,
 p_user_agent: ua,
 p_device_fingerprint: data.fingerprint || null,
 p_details: { ...data.details, reported_by_sentinel: true },
 })
 ).catch((e: unknown) => {
 console.warn("[security-telemetry] beacon failed:", e instanceof Error ? e.message : String(e));
 });

 return { received: true };
 });

// ============================================================================
// 4. generateDeliveryPin — Gera PIN HMAC para confirmação de entrega
// ============================================================================

export const generateDeliveryPin = createServerFn({ method: "POST" })
 .validator(z.object({
 orderId: z.string().uuid(),
 storeId: z.string().uuid(),
 }))
 .handler(async ({ data }) => {
 const db = getServerClient();

 const { data: result, error } = await db.rpc("generate_delivery_pin", {
 p_order_id: data.orderId,
 p_store_id: data.storeId,
 });

 if (error) throw new Error("Falha ao gerar PIN de entrega: " + error.message);

 const res = result as {
 success: boolean;
 pin_code: string;
 expires_at: string;
 certificate_id: string;
 };

 return {
 pinCode: res.pin_code,
 expiresAt: res.expires_at,
 certificateId: res.certificate_id,
 };
 });

// ============================================================================
// 5. validateDeliveryPin — Valida PIN e marca pedido como entregue
// ============================================================================

export const validateDeliveryPin = createServerFn({ method: "POST" })
 .validator(z.object({
 orderId: z.string().uuid(),
 pinCode: z.string().length(6).regex(/^\d{6}$/),
 }))
 .handler(async ({ data }) => {
 const req = getRequest();
 const db = getServerClient();
 const ip = extractClientIp(req);

 const { data: result, error } = await db.rpc("validate_delivery_pin", {
 p_order_id: data.orderId,
 p_pin_code: data.pinCode,
 p_ip_address: ip,
 });

 if (error) return { success: false, message: "Erro ao validar PIN: " + error.message };

 const res = result as { success: boolean; error?: string; order_id?: string; certificate_id?: string; delivered_at?: string };
 return {
 success: res.success,
 message: res.error || "Entrega confirmada com sucesso.",
 orderId: res.order_id,
 certificateId: res.certificate_id,
 deliveredAt: res.delivered_at,
 };
 });

// ============================================================================
// 6. listTransactionCertificates — Admin Master: lista de certificados
// ============================================================================

export const listTransactionCertificates = createServerFn({ method: "GET" })
 .validator(z.object({
 storeId: z.string().uuid().optional(),
 userId: z.string().uuid().optional(),
 entityType: z.string().optional(),
 autoFlaggedOnly: z.boolean().optional().default(false),
 page: z.number().int().min(0).optional().default(0),
 limit: z.number().int().min(1).max(100).optional().default(50),
 }))
 .handler(async ({ data }) => {
 const db = getServerClient();

 const { data: rows, error } = await db.rpc("list_transaction_certificates", {
 p_store_id: data.storeId || null,
 p_user_id: data.userId || null,
 p_entity_type: data.entityType || null,
 p_auto_flagged_only: data.autoFlaggedOnly,
 p_limit: data.limit,
 p_offset: data.page * data.limit,
 });

 if (error) throw new Error("Erro ao listar certificados: " + error.message);
 return (rows as any[]) || [];
 });

// ============================================================================
// 7. getCertificateDetail — Admin Master: detalhe de um certificado
// ============================================================================

export const getCertificateDetail = createServerFn({ method: "GET" })
 .validator(z.object({ id: z.string().uuid() }))
 .handler(async ({ data }) => {
 const db = getServerClient();

 const { data: result, error } = await db.rpc("get_certificate_detail", {
 p_certificate_id: data.id,
 });

 if (error) throw new Error("Erro ao buscar certificado: " + error.message);
 return result as any;
 });

// ============================================================================
// 8. getSecurityTelemetryOverview — Admin Master: KPIs de segurança
// ============================================================================

export const getSecurityTelemetryOverview = createServerFn({ method: "GET" })
 .validator(z.object({}).optional())
 .handler(async () => {
 const db = getServerClient();

 const { data: result, error } = await db.rpc("get_security_telemetry_overview");
 if (error) throw new Error("Erro ao buscar visão de segurança: " + error.message);
 return result as any;
 });

// ============================================================================
// 9. listSecurityEvents — Admin Master: feed de eventos de telemetria
// ============================================================================

export const listSecurityEvents = createServerFn({ method: "GET" })
 .validator(z.object({
 severity: z.enum(["all", "info", "warning", "critical", "emergency"]).optional().default("all"),
 limit: z.number().int().min(1).max(200).optional().default(100),
 offset: z.number().int().min(0).optional().default(0),
 }))
 .handler(async ({ data }) => {
 const db = getServerClient();

 let query = db
 .from("security_audit_events")
 .select("id, severity, event_type, entity_type, entity_id, ip_address, user_agent, device_fingerprint, session_jti, risk_score, is_auto_blocked, details, created_at")
 .order("created_at", { ascending: false })
 .range(data.offset, data.offset + data.limit - 1);

 if (data.severity !== "all") {
 query = query.eq("severity", data.severity);
 }

 const { data: rows, error } = await query;
 if (error) throw new Error("Erro ao listar eventos de segurança: " + error.message);
 return rows || [];
 });

// ============================================================================
// 10. recordSecurityAttackIncident — Motor Server-Side de Registro de Ataques
// ============================================================================

const RecordAttackSchema = z.object({
  attackType: z.string().min(2),
  severity: z.enum(["low", "medium", "high", "critical", "emergency"]),
  targetRoute: z.string().optional().nullable(),
  payloadSnapshot: z.record(z.any()).optional().default({}),
  headersSnapshot: z.record(z.any()).optional().default({}),
  deviceFingerprint: z.string().max(128).optional().nullable(),
  blocked: z.boolean().optional().default(false),
});

export const recordSecurityAttackIncident = createServerFn({ method: "POST" })
  .validator(RecordAttackSchema)
  .handler(async ({ data }) => {
    const req = getRequest();
    const db = getServerClient();
    const ip = extractClientIp(req);
    const ua = req?.headers.get("user-agent") || null;

    let userId: string | null = null;
    try {
      const { getServerIdentity } = await import("@/lib/server-access");
      const identity = await getServerIdentity().catch(() => null);
      userId = identity?.id || null;
    } catch {
      userId = null;
    }

    const { data: incidentId, error } = await db.rpc("log_security_attack_incident", {
      p_attack_type: data.attackType,
      p_severity: data.severity,
      p_target_route: data.targetRoute || (req?.url ? new URL(req.url).pathname : null),
      p_attacker_ip: ip,
      p_user_agent: ua,
      p_user_id: userId,
      p_device_fingerprint: data.deviceFingerprint || null,
      p_payload_snapshot: data.payloadSnapshot,
      p_headers_snapshot: {
        ...data.headersSnapshot,
        referer: req?.headers.get("referer") || null,
        origin: req?.headers.get("origin") || null,
        sec_ch_ua: req?.headers.get("sec-ch-ua") || null,
      },
      p_blocked: data.blocked,
    });

    if (error) {
      console.error("[security] Falha ao registrar incidente de ataque:", error.message);
      return { success: false, incidentId: null };
    }

    return { success: true, incidentId: incidentId as string };
  });

// ============================================================================
// 11. listSecurityAttackIncidents — Admin Master: Lista de Tentativas de Invasão
// ============================================================================

export const listSecurityAttackIncidents = createServerFn({ method: "GET" })
  .validator(
    z.object({
      severity: z.enum(["all", "low", "medium", "high", "critical", "emergency"]).optional().default("all"),
      status: z.enum(["all", "pending", "investigating", "mitigated", "blocked_ip", "false_positive"]).optional().default("all"),
      search: z.string().optional().default(""),
      limit: z.number().int().min(1).max(100).optional().default(50),
      offset: z.number().int().min(0).optional().default(0),
    }).optional(),
  )
  .handler(async ({ data }) => {
    const db = getServerClient();

    const limit = data?.limit || 50;
    const offset = data?.offset || 0;

    let query = db
      .from("security_attack_incidents")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (data?.severity && data.severity !== "all") {
      query = query.eq("severity", data.severity);
    }
    if (data?.status && data.status !== "all") {
      query = query.eq("resolution_status", data.status);
    }
    if (data?.search && data.search.trim()) {
      const q = `%${data.search.trim()}%`;
      query = query.or(`attacker_ip.ilike.${q},attack_type.ilike.${q},target_route.ilike.${q}`);
    }

    const { data: rows, count, error } = await query;
    if (error) throw new Error("Erro ao listar incidentes de ataque: " + error.message);

    // Consulta de estatísticas rápidas
    const { data: countsData } = await db
      .from("security_attack_incidents")
      .select("severity, blocked");

    const stats = {
      total: countsData?.length || 0,
      critical: countsData?.filter(r => r.severity === "critical" || r.severity === "emergency").length || 0,
      high: countsData?.filter(r => r.severity === "high").length || 0,
      medium: countsData?.filter(r => r.severity === "medium").length || 0,
      low: countsData?.filter(r => r.severity === "low").length || 0,
      blocked: countsData?.filter(r => r.blocked).length || 0,
    };

    return {
      incidents: rows || [],
      totalCount: count || 0,
      stats,
    };
  });

// ============================================================================
// 12. blockAttackerIp — Admin Master: Bloqueio manual de IP atacante
// ============================================================================

export const blockAttackerIp = createServerFn({ method: "POST" })
  .validator(
    z.object({
      ipAddress: z.string().min(3),
      reason: z.string().min(3),
      severity: z.enum(["low", "medium", "high", "critical", "emergency"]).optional().default("critical"),
    })
  )
  .handler(async ({ data }) => {
    const { requirePlatformAdmin } = await import("@/lib/server-access");
    await requirePlatformAdmin();

    const db = getServerClient();
    const { error } = await db.from("blocked_attacker_ips").upsert({
      ip_address: data.ipAddress.trim(),
      reason: data.reason,
      severity: data.severity,
      created_at: new Date().toISOString(),
    }, { onConflict: "ip_address" });

    if (error) throw new Error("Erro ao bloquear IP: " + error.message);
    return { success: true };
  });

// ============================================================================
// 13. unblockAttackerIp — Admin Master: Desbloqueio de IP
// ============================================================================

export const unblockAttackerIp = createServerFn({ method: "POST" })
  .validator(z.object({ ipAddress: z.string() }))
  .handler(async ({ data }) => {
    const { requirePlatformAdmin } = await import("@/lib/server-access");
    await requirePlatformAdmin();

    const db = getServerClient();
    const { error } = await db.from("blocked_attacker_ips").delete().eq("ip_address", data.ipAddress.trim());
    if (error) throw new Error("Erro ao desbloquear IP: " + error.message);
    return { success: true };
  });

// ============================================================================
// 14. resolveSecurityAttackIncident — Admin Master: Atualiza status do incidente
// ============================================================================

export const resolveSecurityAttackIncident = createServerFn({ method: "POST" })
  .validator(
    z.object({
      incidentId: z.string().uuid(),
      status: z.enum(["pending", "investigating", "mitigated", "blocked_ip", "false_positive"]),
      notes: z.string().optional().default(""),
    })
  )
  .handler(async ({ data }) => {
    const { requirePlatformAdmin } = await import("@/lib/server-access");
    await requirePlatformAdmin();

    const db = getServerClient();
    const { error } = await db
      .from("security_attack_incidents")
      .update({
        resolution_status: data.status,
        resolution_notes: data.notes,
      })
      .eq("id", data.incidentId);

    if (error) throw new Error("Erro ao atualizar incidente: " + error.message);
    return { success: true };
  });
