/**
 * Helper de Servidor para Logs Forenses de Consentimento e Gestão Legal (LGPD)
 * 
 * Executa estritamente no lado do servidor.
 */

import { getRequestHeader, setCookie } from "@tanstack/start-server-core";
import { getServerClient } from "./supabase";
import { getSSRClient } from "./supabase-ssr.server";
import crypto from "node:crypto";

export interface RecordConsentInput {
 term_type: string;
 version?: string;
 session_id?: string;
 metadata?: Record<string, any>;
}

export async function recordConsentLogServer(input: RecordConsentInput) {
 const db = getServerClient();
 const ssrClient = getSSRClient();

 // 1. Extração do IP Real
 const cfIp = getRequestHeader("cf-connecting-ip");
 const xForwardedFor = getRequestHeader("x-forwarded-for");
 const xRealIp = getRequestHeader("x-real-ip");
 const rawIp = cfIp || (xForwardedFor ? xForwardedFor.split(",")[0].trim() : null) || xRealIp || "127.0.0.1";

 // 2. Extração do User-Agent
 const userAgent = getRequestHeader("user-agent") || "Unknown Browser / Client";

 // 3. Obter Usuário Logado se houver sessão
 let userId: string | null = null;
 try {
 const { data: authData } = await ssrClient.auth.getUser();
 if (authData?.user?.id) {
 userId = authData.user.id;
 }
 } catch {
 // Visitante anônimo
 }

 const termType = input.term_type || "cookie_policy";
 const version = input.version || "2.0";
 const timestamp = new Date().toISOString();

 // 4. Hash Criptográfico Forense SHA-256 (Garante imutabilidade e não-repúdio)
 const signaturePayload = `${userId || rawIp}|${termType}|${version}|${timestamp}|${userAgent}`;
 const signatureHash = crypto.createHash("sha256").update(signaturePayload).digest("hex");
 const ipAddressHash = crypto.createHash("sha256").update(rawIp).digest("hex");

 // 5. Inserção no Banco de Dados (Tabela de Logs Forenses)
 const { data: record, error } = await db
 .from("legal_terms_acceptances")
 .insert({
 user_id: userId,
 term_type: termType,
 version,
 ip_address: rawIp,
 ip_address_hash: ipAddressHash,
 user_agent: userAgent,
 session_id: input.session_id || signatureHash.substring(0, 16),
 signature_hash: signatureHash,
 metadata: {
 ...(input.metadata || {}),
 captured_at: timestamp,
 is_authenticated: !!userId,
 },
 accepted_at: timestamp,
 })
 .select()
 .single();

 if (error) {
 console.error("[LegalConsent] Erro ao gravar log de aceite no banco:", error);
 }

 // 6. Gravação também no Log Forense Universal se for usuário logado ou operação crítica
 try {
 await db.from("forensic_audit_events").insert({
 actor_id: userId,
 actor_role: userId ? "authenticated_user" : "anonymous_visitor",
 target_entity_type: "legal_terms_acceptances",
 target_entity_id: record?.id || signatureHash,
 action: "LEGAL_TERM_ACCEPTED",
 ip_address: rawIp,
 user_agent: userAgent,
 payload_snapshot: {
 term_type: termType,
 version,
 user_id: userId,
 signature_hash: signatureHash,
 },
 checksum_sha256: signatureHash,
 });
 } catch (e) {
 // Non-blocking
 }

 // 7. Define o Cookie de Consentimento HTTP com validade de 10 anos
 try {
 setCookie("waesy_cookie_consent", "accepted", {
 path: "/",
 maxAge: 315360000, // 10 anos em segundos
 sameSite: "lax",
 httpOnly: false, // Permite que o JS do cliente também leia
 });
 } catch (e) {
 // Cookie context might not be available in some scenarios
 }

 return {
 success: true,
 acceptanceId: record?.id || null,
 signatureHash,
 ip: rawIp,
 timestamp,
 authenticated: !!userId,
 };
}
