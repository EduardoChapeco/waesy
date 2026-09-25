/**
 * session-audit.server.ts — Motor de Auditoria de Sessões, Forense e Detecção de Ameaças (Padrão BigTech/Bancário)
 *
 * Captura telemetria completa via Cloudflare Headers e Proxies Reversos, calcula score de risco,
 * registra logs imutáveis em `session_audit_logs` e gerencia o catálogo de dispositivos (`device_registry`).
 *
 * SERVIDOR APENAS.
 */

import { getServerClient } from "@/lib/supabase";
import {
  captureRequestTelemetry,
  getRealClientIP,
  resolveGeoLocation,
  parseDeviceTelemetry,
  type ClientTelemetrySnapshot,
} from "@/lib/network-telemetry.server";

export type AuditEventType =
  | "login_success"
  | "login_failed"
  | "logout"
  | "password_reset_requested"
  | "password_reset_completed"
  | "signup"
  | "session_revoked"
  | "suspicious_activity"
  | "impossible_travel"
  | "new_device_detected"
  | "portal_login";

export interface RequestSecurityContext {
  ip: string;
  userAgent: string;
  country: string;
  city: string;
  deviceType: string;
  deviceName: string;
  isDatacenter: boolean;
  threatScore: number;
  cfRay: string;
}

export interface RecordSessionAuditParams {
  profileId?: string | null;
  eventType: AuditEventType;
  request?: Request | null;
  deviceFingerprint?: string | null;
  metadata?: Record<string, any>;
  clientLocation?: {
    city?: string;
    state?: string;
    lat?: number;
    lng?: number;
  } | null;
}

/**
 * Extrai todos os cabeçalhos de segurança e geolocalização com alta precisão e resolução de Proxies.
 */
export function extractSecurityContext(
  req?: Request | null,
  clientLocation?: { city?: string; state?: string; lat?: number; lng?: number } | null,
): RequestSecurityContext {
  const tele: ClientTelemetrySnapshot = captureRequestTelemetry(req, clientLocation);
  return {
    ip: tele.ip,
    userAgent: tele.userAgent,
    country: tele.geo.country,
    city: tele.geo.state ? `${tele.geo.city}, ${tele.geo.state}` : tele.geo.city,
    deviceType: tele.deviceType,
    deviceName: tele.deviceName,
    isDatacenter: tele.isDatacenterOrVpn,
    threatScore: tele.threatScore,
    cfRay: tele.cfRay,
  };
}

/**
 * Deriva um nome amigável para o dispositivo a partir do User-Agent (ex: "Windows 11 • Google Chrome").
 */
export function parseDeviceName(userAgent: string): string {
  return parseDeviceTelemetry(userAgent).name;
}

/**
 * Registra o evento de autenticação na tabela `session_audit_logs` e gerencia `device_registry`.
 * Executado assincronamente sem bloquear a resposta do usuário caso ocorra erro transitório.
 */
export async function recordAuthAuditEvent(params: RecordSessionAuditParams): Promise<{
  auditId: string | null;
  riskScore: number;
  isNewDevice: boolean;
  riskFlags: string[];
}> {
  const { profileId, eventType, request, deviceFingerprint, metadata = {}, clientLocation } = params;
  const ctx = extractSecurityContext(request, clientLocation);
  const db = getServerClient();

  const riskFlags: string[] = [];
  let isNewDevice = false;

  // 1. Verificar se é um novo dispositivo para o perfil
  const fp = deviceFingerprint || `fp_${Buffer.from(ctx.userAgent + ctx.ip).toString("base64").slice(0, 32)}`;

  if (profileId) {
    try {
      const { data: existingDevice } = await db
        .from("device_registry")
        .select("id, is_trusted")
        .eq("profile_id", profileId)
        .eq("device_fingerprint", fp)
        .maybeSingle();

      if (!existingDevice) {
        isNewDevice = true;
        riskFlags.push("new_device");

        // Cadastra o novo dispositivo com IP e Cidade REAIS (nunca nulos)
        await db.from("device_registry").insert({
          profile_id: profileId,
          device_fingerprint: fp,
          device_name: ctx.deviceName,
          device_type: ctx.deviceType,
          country_code: ctx.country,
          city: ctx.city,
          ip_address: ctx.ip,
          is_trusted: eventType === "login_success" ? false : false,
        });
      } else {
        // Atualiza last_seen, IP real e localização enriquecida
        await db
          .from("device_registry")
          .update({
            last_seen_at: new Date().toISOString(),
            ip_address: ctx.ip,
            city: ctx.city,
            device_name: ctx.deviceName,
          })
          .eq("id", existingDevice.id);
      }
    } catch (e) {
      console.warn("[session-audit] Falha ao consultar/atualizar device_registry:", e);
    }
  }

  // 2. Flags de risco adicionais
  if (ctx.isDatacenter) {
    riskFlags.push("datacenter_or_vpn");
  }
  if (ctx.threatScore > 20) {
    riskFlags.push(`high_threat_score_${ctx.threatScore}`);
  }
  if (ctx.country !== "BR") {
    riskFlags.push(`foreign_country_${ctx.country}`);
  }
  if (eventType === "login_failed") {
    riskFlags.push("failed_credentials");
  }

  // 3. Calcula score de risco
  let riskScore = 0;
  if (ctx.isDatacenter) riskScore += 40;
  if (ctx.threatScore > 0) riskScore += Math.min(Math.round(ctx.threatScore / 2), 30);
  if (ctx.country !== "BR") riskScore += 15;
  if (isNewDevice) riskScore += 10;
  if (eventType === "login_failed") riskScore += 15;
  riskScore = Math.min(riskScore, 100);

  // 4. Insere log imutável de telemetria
  let auditId: string | null = null;
  try {
    const { data: inserted } = await db
      .from("session_audit_logs")
      .insert({
        profile_id: profileId || null,
        event_type: eventType,
        ip_address: ctx.ip, // IP real garantido, nunca nulo
        user_agent: ctx.userAgent,
        country_code: ctx.country,
        city: ctx.city, // Localização real resolvida
        device_type: ctx.deviceType,
        is_datacenter: ctx.isDatacenter,
        threat_score: ctx.threatScore,
        cf_ray: ctx.cfRay,
        device_fingerprint: fp,
        risk_score: riskScore,
        risk_flags: riskFlags,
        metadata: {
          ...metadata,
          device_name: ctx.deviceName,
        },
      })
      .select("id")
      .maybeSingle();

    auditId = inserted?.id || null;
  } catch (err) {
    console.error("[session-audit] Erro ao gravar log de auditoria:", err);
  }

  return {
    auditId,
    riskScore,
    isNewDevice,
    riskFlags,
  };
}
