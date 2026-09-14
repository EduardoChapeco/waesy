import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getIdentity } from "./identity.functions";

export const ContractCategoryEnum = z.enum([
 "real_estate_rental",
 "real_estate_sale",
 "vehicle_sale",
 "vehicle_consignation",
 "service_agreement",
 "employment",
 "general_deal",
 "legal_retainer",
 "tourism_package",
 "medical_aesthetic_consent",
]);

export const createContract = createServerFn({ method: "POST" })
 .validator(
 z.object({
 dealId: z.string().uuid().optional(),
 storeId: z.string().uuid().optional(),
 entityType: z.string().optional(),
 entityId: z.string().optional(),
 title: z.string().min(3),
 category: ContractCategoryEnum,
 contentMarkdown: z.string().min(10),
 clauses: z.array(z.record(z.any())).optional().default([]),
 variables: z.record(z.any()).optional().default({}),
 }),
 )
 .handler(async ({ data: input }) => {
 const supabase = getServerClient();
 const identity = await getIdentity();
 if (!identity?.id) throw new Error("Não autenticado");

 const { data: contract, error: contractErr } = await supabase
 .from("contracts")
 .insert({
 deal_id: input.dealId,
 store_id: input.storeId || (identity as any).store_id || null,
 entity_type: input.entityType || null,
 entity_id: input.entityId || null,
 creator_id: identity.id,
 title: input.title,
 category: input.category,
 status: "draft",
 current_version: 1,
 })
 .select()
 .single();

 if (contractErr) {
 console.error("[contracts] Error creating contract:", contractErr);
 throw new Error("Erro ao criar contrato.");
 }

 const { data: version, error: versionErr } = await supabase
 .from("contract_versions")
 .insert({
 contract_id: contract.id,
 version_number: 1,
 title: input.title,
 content_markdown: input.contentMarkdown,
 clauses: input.clauses,
 variables: input.variables,
 is_sealed: false,
 })
 .select()
 .single();

 if (versionErr) {
 throw new Error("Erro ao criar primeira versão do contrato.");
 }

 return { contract, version };
 });

export const sealAndIssueContract = createServerFn({ method: "POST" })
 .validator(
 z.object({
 contractId: z.string().uuid(),
 versionId: z.string().uuid(),
 signers: z.array(
 z.object({
 name: z.string().min(2),
 email: z.string().email(),
 role: z.enum(["party", "witness", "guarantor"]).default("party"),
 authLevel: z.enum(["basic", "advanced", "qualified"]).default("basic"),
 profileId: z.string().uuid().optional(),
 }),
 ),
 }),
 )
 .handler(async ({ data: input }) => {
 const supabase = getServerClient();
 const identity = await getIdentity();
 if (!identity?.id) throw new Error("Não autenticado");

 // Fetch version
 const { data: version, error: vErr } = await supabase
 .from("contract_versions")
 .select("*")
 .eq("id", input.versionId)
 .eq("contract_id", input.contractId)
 .single();

 if (vErr || !version) throw new Error("Versão do contrato não encontrada.");

 // Compute simple SHA-256 digest string
 const textBuffer = new TextEncoder().encode(
 version.content_markdown + JSON.stringify(version.clauses),
 );
 const hashBuffer = await crypto.subtle.digest("SHA-256", textBuffer);
 const hashHex = Array.from(new Uint8Array(hashBuffer))
 .map((b) => b.toString(16).padStart(2, "0"))
 .join("");

 // Seal the version
 await supabase
 .from("contract_versions")
 .update({
 is_sealed: true,
 sealed_at: new Date().toISOString(),
 hash_sha256: hashHex,
 })
 .eq("id", version.id);

 // Update contract status
 await supabase
 .from("contracts")
 .update({
 status: "signing",
 updated_at: new Date().toISOString(),
 })
 .eq("id", input.contractId);

 // Create signature envelopes for each signer
 const envelopesToInsert = input.signers.map((s) => ({
 contract_version_id: version.id,
 signer_name: s.name,
 signer_email: s.email,
 signer_role: s.role,
 auth_level: s.authLevel,
 signer_profile_id: s.profileId || null,
 status: "pending",
 }));

 const { data: envelopes, error: envErr } = await supabase
 .from("signature_envelopes")
 .insert(envelopesToInsert)
 .select();

 if (envErr) throw new Error("Erro ao gerar envelopes de assinatura.");

 return {
 status: "sealed",
 hashSha256: hashHex,
 envelopes,
 };
 });

export const signContractEnvelope = createServerFn({ method: "POST" })
 .validator(
 z.object({
 signingToken: z.string(),
 consent: z.boolean(),
 signatureImageBase64: z.string().optional(),
 ipAddress: z.string().optional(),
 userAgent: z.string().optional(),
      faceImageUrl: z.string().optional(),
 }),
 )
 .handler(async ({ data: input }) => {
 if (!input.consent) throw new Error("Consentimento é obrigatório para assinar.");

 const supabase = getServerClient();

 // Fetch envelope by unique token
 const { data: envelope, error: envErr } = await supabase
 .from("signature_envelopes")
 .select("*, contract_version:contract_version_id(*)")
 .eq("signing_token", input.signingToken)
 .single();

 if (envErr || !envelope) throw new Error("Link de assinatura inválido ou expirado.");

 if (envelope.status === "signed") {
 return { success: true, message: "Este documento já foi assinado por você." };
 }

 const digest = `SIG-${envelope.id}-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;

 // Registra evidência de assinatura
 await supabase.from("signature_evidence").insert({
 envelope_id: envelope.id,
 ip_address: input.ipAddress || "127.0.0.1",
 user_agent: input.userAgent || "Browser",
 auth_method: envelope.auth_level === "advanced" ? "email_otp" : "electronic_consent",
 consent_given: true,
 signature_digest: digest,
 evidence_manifest: {
 timestamp: new Date().toISOString(),
 signer_email: envelope.signer_email,
 document_hash: (envelope.contract_version as any)?.hash_sha256,
 signature_image: input.signatureImageBase64 || null,
        face_image: input.faceImageUrl || null,
 },
 });

 // Atualiza status do envelope
 await supabase
 .from("signature_envelopes")
 .update({
 status: "signed",
 signed_at: new Date().toISOString(),
 })
 .eq("id", envelope.id);

 return {
 success: true,
 signedAt: new Date().toISOString(),
 signatureDigest: digest,
 };
 });

export const verifyDocumentPublic = createServerFn({ method: "GET" })
 .validator(z.string())
 .handler(async ({ data: codeOrHash }) => {
 const supabase = getServerClient();

 // Tenta por verification_code ou por hash_sha256
 let query = supabase.from("contracts").select(`
 id, title, category, status, verification_code, created_at,
 creator:creator_id (id, full_name),
 versions:contract_versions (
 version_number, hash_sha256, sealed_at, is_sealed,
 envelopes:signature_envelopes (
 signer_name, signer_role, status, signed_at, auth_level
 )
 )
 `);

 const isHex = /^[0-9a-fA-F]{16,64}$/.test(codeOrHash);
 if (isHex && codeOrHash.length === 64) {
 // Busca pelo hash
 const { data: v } = await supabase
 .from("contract_versions")
 .select("contract_id")
 .eq("hash_sha256", codeOrHash)
 .maybeSingle();

 if (v) {
 query = query.eq("id", v.contract_id);
 } else {
 throw new Error("Documento não reconhecido.");
 }
 } else {
 query = query.eq("verification_code", codeOrHash);
 }

 let { data: contract, error } = await query.maybeSingle();

 if (!contract) {
 // Fallback: busca contratos turísticos na tabela canônica contracts (category='tourism')
 // O public_token fica em verification_code; content_hash e certificate_serial ficam em metadata
 const { data: tourismContract } = await supabase
 .from("contracts")
 .select("*")
 .eq("category", "tourism")
 .or(`verification_code.eq.${codeOrHash}`)
 .maybeSingle();

 if (tourismContract) {
 const meta = (tourismContract.metadata as Record<string, any>) || {};
 const matchesCertificate = meta.certificate_serial === codeOrHash;
 const matchesHash = meta.content_hash === codeOrHash;
 const matchesToken = tourismContract.verification_code === codeOrHash;

 if (matchesCertificate || matchesHash || matchesToken) {
 return {
 isValid: true,
 title: tourismContract.title,
 category: "tourism",
 status: tourismContract.status === "signed" ? "sealed" : tourismContract.status,
 verificationCode: meta.certificate_serial || tourismContract.verification_code,
 createdAt: tourismContract.created_at,
 sealedVersion: {
 version_number: tourismContract.current_version || 1,
 hash_sha256: meta.content_hash || null,
 sealed_at: meta.signed_at || null,
 is_sealed: Boolean(meta.signed_at),
 envelopes: (meta.signatures as any[]) || [
 {
 signer_name: meta.client_name || "Signatário",
 signer_role: "party",
 status: meta.signed_at ? "signed" : "pending",
 signed_at: meta.signed_at || null,
 auth_level: "advanced",
 },
 ],
 },
 };
 }
 }

 throw new Error("Documento não encontrado ou sem registro de autenticidade.");
 }

 return {
 isValid: true,
 title: contract.title,
 category: contract.category,
 status: contract.status,
 verificationCode: contract.verification_code,
 createdAt: contract.created_at,
 sealedVersion: (contract.versions as any[])?.find((v) => v.is_sealed) || null,
 };
 });

export const listContracts = createServerFn({ method: "GET" }).handler(async () => {
 const supabase = getServerClient();
 const identity = await getIdentity();
 if (!identity?.id) throw new Error("Não autenticado");

 const { data, error } = await supabase
 .from("contracts")
 .select(`
 id, title, category, status, created_at, updated_at,
 creator:creator_id (id, full_name),
 deal:deal_id (id, status, proposed_price_cents)
 `)
 .eq("creator_id", identity.id)
 .order("created_at", { ascending: false });

 if (error) {
 console.error("[contracts] listContracts error:", error);
 throw new Error("Erro ao listar contratos.");
 }

 return data || [];
});

export const getContractById = createServerFn({ method: "GET" })
 .validator(z.string().uuid())
 .handler(async ({ data: contractId }) => {
 const supabase = getServerClient();
 const identity = await getIdentity();
 if (!identity?.id) throw new Error("Não autenticado");

 const { data: contract, error } = await supabase
 .from("contracts")
 .select(`
 *,
 creator:creator_id (id, full_name, avatar_url),
 deal:deal_id (*),
 versions:contract_versions (
 *,
 envelopes:signature_envelopes (*)
 )
 `)
 .eq("id", contractId)
 .eq("creator_id", identity.id)
 .single();

 if (error || !contract) throw new Error("Contrato não encontrado ou acesso negado.");

 return contract;
 });

export const getEnvelopeByToken = createServerFn({ method: "GET" })
 .validator(z.string().min(1))
 .handler(async ({ data: token }) => {
 const supabase = getServerClient();
 const { data: envelope, error } = await supabase
 .from("signature_envelopes")
 .select(
 `
 *,
 contract_version:contract_version_id (
 id, version_number, title, content_markdown, hash_sha256, sealed_at,
 contract:contract_id (id, title, category, verification_code)
 )
 `,
 )
 .eq("signing_token", token)
 .maybeSingle();

 if (error || !envelope) {
 return null;
 }

 return envelope;
 });

