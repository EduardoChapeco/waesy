/**
 * kyc.functions.ts — BFF Server Functions para Verificação de Identidade & Selos Oficiais
 * Submissão de Documentos (OAB, CRC, CRM, CNH, CNPJ) e Auditoria no Master Admin.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";

// ============================================================
// Schemas
// ============================================================

export const submitKycVerificationSchema = z.object({
 entity_type: z.enum(["individual", "lawyer", "accountant", "doctor", "driver", "company"]),
 registration_number: z.string().optional(),
 registration_state: z.string().optional(),
 document_front_url: z.string().url().optional(),
 document_back_url: z.string().url().optional(),
 selfie_url: z.string().url().optional(),
 proof_of_address_url: z.string().url().optional(),
 company_contract_url: z.string().url().optional(),
});

export const auditKycVerificationSchema = z.object({
 verification_id: z.string().uuid(),
 decision: z.enum(["verified", "rejected"]),
 rejection_reason: z.string().optional(),
 badge_granted: z.string().optional(),
});

// ============================================================
// Server Functions
// ============================================================

/**
 * 1. Obtém status da verificação do usuário atual
 */
export const getMyKycStatus = createServerFn({ method: "GET" }).handler(async () => {
 const identity = await getServerIdentity();
 if (!identity) throw new Error("Não autenticado");

 const supabase = getServerClient();
 const { data: kyc, error } = await supabase
 .from("kyc_verifications")
 .select("*")
 .eq("profile_id", identity.id)
 .order("created_at", { ascending: false })
 .maybeSingle();

 if (error) throw new Error(`Falha ao obter status KYC: ${error.message}`);
 return kyc || { status: "pending_submission" };
});

/**
 * 2. Submete documentos para verificação
 */
export const submitKycVerification = createServerFn({ method: "POST" })
 .validator(submitKycVerificationSchema)
 .handler(async ({ data }) => {
 const identity = await getServerIdentity();
 if (!identity) throw new Error("Não autenticado");

 const supabase = getServerClient();
 const { data: kyc, error } = await supabase
 .from("kyc_verifications")
 .upsert(
 {
 profile_id: identity.id,
 entity_type: data.entity_type,
 registration_number: data.registration_number || null,
 registration_state: data.registration_state || null,
 document_front_url: data.document_front_url || null,
 document_back_url: data.document_back_url || null,
 selfie_url: data.selfie_url || null,
 proof_of_address_url: data.proof_of_address_url || null,
 company_contract_url: data.company_contract_url || null,
 status: "under_review",
 updated_at: new Date().toISOString(),
 },
 { onConflict: "profile_id" },
 )
 .select()
 .single();

 if (error) throw new Error(`Falha ao enviar KYC: ${error.message}`);
 return kyc;
 });

/**
 * 3. Master Admin lista verificações pendentes
 */
export const listKycVerificationsForAdmin = createServerFn({ method: "GET" })
 .validator(z.object({ status: z.string().optional() }).optional())
 .handler(async ({ data }) => {
 const identity = await getServerIdentity();
 if (!identity || !["admin", "master", "platform_admin"].includes(identity.role)) {
 throw new Error("Acesso restrito à governança master");
 }

 const supabase = getServerClient();
 let query = supabase
 .from("kyc_verifications")
 .select("*, profile:profiles(full_name, email, phone, cpf)")
 .order("created_at", { ascending: false });

 if (data?.status && data.status !== "all") {
 query = query.eq("status", data.status);
 }

 const { data: verifications, error } = await query;
 if (error) throw new Error(`Falha ao listar KYC: ${error.message}`);
 return verifications || [];
 });

/**
 * 4. Master Admin aprova ou rejeita verificação
 */
export const auditKycVerification = createServerFn({ method: "POST" })
 .validator(auditKycVerificationSchema)
 .handler(async ({ data }) => {
 const identity = await getServerIdentity();
 if (!identity || !["admin", "master", "platform_admin"].includes(identity.role)) {
 throw new Error("Acesso restrito à governança master");
 }

 const supabase = getServerClient();

 const { data: kyc, error } = await supabase
 .from("kyc_verifications")
 .update({
 status: data.decision,
 rejection_reason: data.decision === "rejected" ? data.rejection_reason : null,
 badge_granted: data.decision === "verified" ? data.badge_granted || "Verificado Oficial" : null,
 verified_at: data.decision === "verified" ? new Date().toISOString() : null,
 verified_by: identity.id,
 updated_at: new Date().toISOString(),
 })
 .eq("id", data.verification_id)
 .select()
 .single();

 if (error) throw new Error(`Falha ao auditar KYC: ${error.message}`);
 return kyc;
 });

/**
 * 5. Garante que o usuário possui verificação KYC aprovada antes de transações financeiras ou contratos
 */
export async function assertUserKycVerified(userId: string): Promise<boolean> {
  const supabase = getServerClient();
  const { data: kyc, error } = await supabase
    .from("kyc_verifications")
    .select("status")
    .eq("profile_id", userId)
    .maybeSingle();

  if (error || !kyc || kyc.status !== "verified") {
    return false;
  }
  return true;
}
