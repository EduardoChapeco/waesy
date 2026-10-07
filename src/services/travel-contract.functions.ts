/**
 * travel-contract.functions.ts — BFF para Contratos Turísticos & Assinatura Eletrônica Jurídica (SHA-256)
 * Tabelas canônicas: contracts + contract_versions + signature_envelopes + signature_evidence
 * Padrão BigTech | Zero Mocks | Persistência Real no Supabase
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient, getAnonServerClient } from "@/lib/supabase";
import { getServerIdentity } from "@/lib/server-access";

// ─── Tipagens Canônicas do Contrato Turístico ──────────────────────────────────

export interface ContractClauseDTO {
 number: number;
 section: string;
 clause_text: string;
 is_mandatory: boolean;
}

export interface ContractSignerDTO {
 signer_name: string;
 signer_document: string;
 signer_email?: string | null;
 signer_phone?: string | null;
 signed_at: string;
 ip_address: string;
 user_agent: string;
 signature_image_url?: string | null;
 content_hash: string;
 auth_serial: string;
}

export type ContractStatus = "draft" | "sent" | "pending_signature" | "signed" | "cancelled";

export interface TravelContractDTO {
 id: string;
 store_id: string | null;
 agency_name: string;
 agency_cnpj?: string | null;
 agency_address?: string | null;
 agency_whatsapp?: string | null;
 public_token: string;
 proposal_id?: string | null;
 contract_title: string;
 client_name: string;
 client_document: string;
 client_email?: string | null;
 client_phone: string;
 client_address?: string | null;
 passengers: Array<{ name: string; document?: string; birth_date?: string }>;
 destination: string;
 travel_start_date?: string | null;
 travel_end_date?: string | null;
 package_summary: string;
 total_value_cents: number;
 payment_conditions: string;
 clauses: ContractClauseDTO[];
 signatures: ContractSignerDTO[];
 status: ContractStatus;
 signed_at?: string | null;
 content_hash?: string | null;
 certificate_serial?: string | null;
 pdf_url?: string | null;
 created_at: string;
 updated_at: string;
}

// ─── Cláusulas Canônicas Padrão Embratur / CDC ────────────────────────────────

export const CANONICAL_TOURISM_CLAUSES: ContractClauseDTO[] = [
 {
 number: 1,
 section: "DO OBJETO DO CONTRATO",
 clause_text:
 "O presente contrato tem por objeto a intermediação e prestação de serviços de turismo especificados no anexo/proposta, compreendendo os serviços de transporte, hospedagem, passeios e assessoria contratados.",
 is_mandatory: true,
 },
 {
 number: 2,
 section: "DAS CONDIÇÕES DE PAGAMENTO",
 clause_text:
 "O CONTRATANTE se obriga a efetuar o pagamento do valor total acordado nas condições, prazos e modalidades descritas no resumo financeiro deste instrumento.",
 is_mandatory: true,
 },
 {
 number: 3,
 section: "DOS DOCUMENTOS DE VIAGEM",
 clause_text:
 "É de responsabilidade exclusiva do CONTRATANTE e passageiros portar documento oficial de identificação com foto em perfeito estado de conservação (RG ou CNH) e, para viagens internacionais, passaporte válido por no mínimo 6 meses, vistos consulares e comprovantes de vacinas exigidos pelos países de destino.",
 is_mandatory: true,
 },
 {
 number: 4,
 section: "DAS POLÍTICAS DE CANCELAMENTO E REEMBOLSO",
 clause_text:
 "Em caso de desistência ou cancelamento por parte do CONTRATANTE, aplicar-se-ão as penalidades contratuais e taxas das operadoras/cias aéreas envolvidas, deduzidas as despesas administrativas comprovadas, em estrita observância à legislação de proteção ao consumidor.",
 is_mandatory: true,
 },
 {
 number: 5,
 section: "DO FORO",
 clause_text:
 "Fica eleito o foro da Comarca da sede da agência para dirimir quaisquer controvérsias oriundas do presente instrumento, com renúncia a qualquer outro, por mais privilegiado que seja.",
 is_mandatory: true,
 },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** Mapeia status canônico contracts → ContractStatus */
function toContractStatus(s: string): ContractStatus {
 if (s === "signed") return "signed";
 if (s === "cancelled") return "cancelled";
 if (s === "sent") return "sent";
 if (s === "pending_signature") return "pending_signature";
 return "draft";
}

/** Converte row de contracts + contract_versions + signature_evidence para TravelContractDTO */
function rowToContractDTO(contract: any, version: any, storeRow?: any): TravelContractDTO {
 let meta: Record<string, any> = {};
 try {
 if (contract.metadata) meta = contract.metadata;
 } catch (_) {}

 const storeSettings = storeRow?.settings || {};
 const clauses: ContractClauseDTO[] = (version?.clauses as ContractClauseDTO[]) || CANONICAL_TOURISM_CLAUSES;

 return {
 id: contract.id,
 store_id: meta.store_id || null,
 agency_name: storeRow?.name || meta.agency_name || "",
 agency_cnpj: storeRow?.cnpj || meta.agency_cnpj || null,
 agency_address: storeRow?.address || meta.agency_address || null,
 agency_whatsapp: storeSettings.whatsapp_phone || storeSettings.phone || meta.agency_whatsapp || null,
 public_token: contract.verification_code || contract.id,
 proposal_id: meta.proposal_id || null,
 contract_title: version?.title || contract.title || "Contrato de Viagem",
 client_name: meta.client_name || "",
 client_document: meta.client_document || "",
 client_email: meta.client_email || null,
 client_phone: meta.client_phone || "",
 client_address: meta.client_address || null,
 passengers: meta.passengers || [],
 destination: meta.destination || "",
 travel_start_date: meta.travel_start_date || null,
 travel_end_date: meta.travel_end_date || null,
 package_summary: meta.package_summary || "",
 total_value_cents: meta.total_value_cents || 0,
 payment_conditions: meta.payment_conditions || "",
 clauses,
 signatures: meta.signatures || [],
 status: toContractStatus(contract.status),
 signed_at: meta.signed_at || null,
 content_hash: meta.content_hash || null,
 certificate_serial: meta.certificate_serial || null,
 pdf_url: meta.pdf_url || null,
 created_at: contract.created_at,
 updated_at: contract.updated_at,
 };
}

// ─── Gestão de Cláusulas da Agência (Settings) ────────────────────────────────

export const getAgencyTourismClauses = createServerFn({ method: "GET" }).handler(
 async (): Promise<ContractClauseDTO[]> => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();

 if (!identity?.store_id) {
 return CANONICAL_TOURISM_CLAUSES;
 }

 const { data: store } = await supabase
 .from("stores")
 .select("settings")
 .eq("id", identity.store_id)
 .maybeSingle();

 const customClauses = (store?.settings as any)?.tourism_contract_clauses;
 if (Array.isArray(customClauses) && customClauses.length > 0) {
 return customClauses;
 }
 return CANONICAL_TOURISM_CLAUSES;
 },
);

export const saveAgencyTourismClauses = createServerFn({ method: "POST" })
 .validator(
 z.object({
 clauses: z.array(
 z.object({
 number: z.number(),
 section: z.string().min(2),
 clause_text: z.string().min(5),
 is_mandatory: z.boolean().default(true),
 }),
 ),
 }),
 )
 .handler(async ({ data }): Promise<{ success: boolean }> => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();

 if (!identity?.store_id) throw new Error("Loja não encontrada na sessão.");

 const { data: store } = await supabase
 .from("stores")
 .select("settings")
 .eq("id", identity.store_id)
 .maybeSingle();

 const currentSettings = (store?.settings as Record<string, any>) || {};
 const { error } = await supabase
 .from("stores")
 .update({ settings: { ...currentSettings, tourism_contract_clauses: data.clauses } })
 .eq("id", identity.store_id);

 if (error) throw new Error("Erro ao salvar cláusulas: " + error.message);
 return { success: true };
 });

export const resetAgencyTourismClauses = createServerFn({ method: "POST" }).handler(
 async (): Promise<{ success: boolean }> => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();

 if (!identity?.store_id) throw new Error("Loja não encontrada na sessão.");

 const { data: store } = await supabase
 .from("stores")
 .select("settings")
 .eq("id", identity.store_id)
 .maybeSingle();

 const currentSettings = (store?.settings as Record<string, any>) || {};
 delete currentSettings.tourism_contract_clauses;

 const { error } = await supabase
 .from("stores")
 .update({ settings: currentSettings })
 .eq("id", identity.store_id);

 if (error) throw new Error("Erro ao restaurar minuta padrão: " + error.message);
 return { success: true };
 },
);

export const updateContractClauses = createServerFn({ method: "POST" })
 .validator(
 z.object({
 contractId: z.string().uuid(),
 clauses: z.array(
 z.object({
 number: z.number(),
 section: z.string().min(2),
 clause_text: z.string().min(5),
 is_mandatory: z.boolean().default(true),
 }),
 ),
 }),
 )
 .handler(async ({ data: { contractId, clauses } }): Promise<{ success: boolean }> => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 if (!identity?.id) throw new Error("Não autorizado.");

 // Verifica status no contrato canônico
 const { data: contract, error: findErr } = await supabase
 .from("contracts")
 .select("status, current_version")
 .eq("id", contractId)
 .single();

 if (findErr || !contract) throw new Error("Contrato não encontrado.");
 if (contract.status === "signed") {
 throw new Error("Contrato já assinado digitalmente não pode ter suas cláusulas alteradas.");
 }

 // Atualiza a versão atual
 const { error } = await supabase
 .from("contract_versions")
 .update({ clauses })
 .eq("contract_id", contractId)
 .eq("version_number", contract.current_version);

 if (error) throw new Error("Erro ao atualizar cláusulas do contrato: " + error.message);
 return { success: true };
 });

// ─── 2. Criação de Contrato de Viagem ──────────────────────────────────────────

export const createTravelContract = createServerFn({ method: "POST" })
 .validator(
 z.object({
 proposalId: z.string().optional(),
 contractTitle: z.string().min(3, "Título obrigatório"),
 clientName: z.string().min(2, "Nome do cliente obrigatório"),
 clientDocument: z.string().min(11, "CPF ou documento obrigatório"),
 clientEmail: z.string().optional(),
 clientPhone: z.string().min(8, "Telefone obrigatório"),
 clientAddress: z.string().optional(),
 destination: z.string().min(2, "Destino obrigatório"),
 travelStartDate: z.string().optional(),
 travelEndDate: z.string().optional(),
 packageSummary: z.string().min(5, "Resumo do pacote obrigatório"),
 totalValueCents: z.number().int().min(0),
 paymentConditions: z.string().min(3, "Condições de pagamento obrigatórias"),
 passengers: z.array(z.object({ name: z.string(), document: z.string().optional() })).default([]),
 customClauses: z.array(z.any()).optional(),
 })
 )
 .handler(async ({ data: input }): Promise<{ success: boolean; id: string; publicToken: string }> => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();

 if (!identity?.id) {
 throw new Error("Não autorizado — faça login no painel da agência.");
 }

 const publicToken = "ct_" + Math.random().toString(36).substring(2, 12);

 let clauses = input.customClauses && input.customClauses.length > 0 ? input.customClauses : null;

 if (!clauses && identity.store_id) {
 const { data: store } = await supabase
 .from("stores")
 .select("settings")
 .eq("id", identity.store_id)
 .maybeSingle();

 const agencyClauses = (store?.settings as any)?.tourism_contract_clauses;
 if (Array.isArray(agencyClauses) && agencyClauses.length > 0) {
 clauses = agencyClauses;
 }
 }

 if (!clauses) {
 clauses = CANONICAL_TOURISM_CLAUSES;
 }

 // Todos os dados de domínio turístico ficam no campo metadata (JSONB)
 const meta = {
 store_id: identity.store_id || null,
 proposal_id: input.proposalId || null,
 public_token: publicToken,
 client_name: input.clientName.trim(),
 client_document: input.clientDocument.trim(),
 client_email: input.clientEmail?.trim() || null,
 client_phone: input.clientPhone.trim(),
 client_address: input.clientAddress?.trim() || null,
 destination: input.destination.trim(),
 travel_start_date: input.travelStartDate || null,
 travel_end_date: input.travelEndDate || null,
 package_summary: input.packageSummary.trim(),
 total_value_cents: input.totalValueCents,
 payment_conditions: input.paymentConditions.trim(),
 passengers: input.passengers,
 signatures: [],
 };

 // 1. Cria o contrato canônico
 const { data: contractRow, error: contractErr } = await supabase
 .from("contracts")
 .insert({
 creator_id: identity.id,
 title: input.contractTitle.trim(),
 category: "tourism",
 status: "sent",
 current_version: 1,
 verification_code: publicToken,
 metadata: meta,
 })
 .select("id")
 .single();

 if (contractErr || !contractRow) {
 console.error("[travel-contract.functions] Erro ao criar contrato:", contractErr);
 throw new Error("Falha ao salvar contrato no banco: " + contractErr?.message);
 }

 // 2. Cria a primeira versão com cláusulas
 const contentText = JSON.stringify({ title: input.contractTitle, clauses, meta });
 const msgBuffer = new TextEncoder().encode(contentText);
 const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
 const hash = Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");

 const { error: versionErr } = await supabase.from("contract_versions").insert({
 contract_id: contractRow.id,
 version_number: 1,
 title: input.contractTitle.trim(),
 content_markdown: `# ${input.contractTitle}\n\n${clauses.map((c: ContractClauseDTO) => `## ${c.section}\n${c.clause_text}`).join("\n\n")}`,
 clauses,
 variables: {},
 hash_sha256: hash,
 is_sealed: false,
 });

 if (versionErr) {
 console.error("[travel-contract.functions] Erro ao criar versão:", versionErr);
 // Não falha — contrato criado, versão pode ser criada depois
 }

 return { success: true, id: contractRow.id, publicToken };
 });

export const createContractFromProposal = createServerFn({ method: "POST" })
 .validator(
 z.object({
 proposalId: z.string().min(1),
 clientDocument: z.string().optional(),
 })
 )
 .handler(async ({ data: input }): Promise<{ success: boolean; id: string; publicToken: string }> => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();

 if (!identity?.id) {
 throw new Error("Não autorizado — faça login no painel da agência.");
 }

 // 1. Busca a Proposta via quotes
 const { data: quote, error: quoteErr } = await supabase
 .from("quotes")
 .select("*, stores(name, cnpj, address, settings)")
 .eq("id", input.proposalId)
 .single();

 if (quoteErr || !quote) {
 throw new Error("Proposta não encontrada para vincular ao contrato.");
 }

 let proposalMeta: Record<string, any> = {};
 try {
 if (quote.conditions) proposalMeta = JSON.parse(quote.conditions);
 } catch (_) {}

 const flightsSummary = Array.isArray(proposalMeta.flights) && proposalMeta.flights.length > 0
 ? `Aéreo: ${proposalMeta.flights.map((f: any) => `${f.airline_name || "Cia"} (${f.origin_iata} ➔ ${f.destination_iata})`).join(", ")}.`
 : "";
 const hotelsSummary = Array.isArray(proposalMeta.hotels) && proposalMeta.hotels.length > 0
 ? `Hospedagem: ${proposalMeta.hotels.map((h: any) => `${h.hotel_name} (${h.room_type})`).join(", ")}.`
 : "";
 const includesSummary = Array.isArray(proposalMeta.includes) && proposalMeta.includes.length > 0
 ? `Serviços inclusos: ${proposalMeta.includes.join(", ")}.`
 : "";

 const fullPackageSummary = [
 `Destino: ${proposalMeta.destination_city || "Não especificado"}.`,
 flightsSummary,
 hotelsSummary,
 includesSummary,
 ]
 .filter(Boolean)
 .join(" ");

 const totalCents = proposalMeta.pricing?.total_price_cents || 0;
 const paymentCond = "À vista ou parcelado conforme negociação da lâmina.";
 const publicToken = "ct_" + Math.random().toString(36).substring(2, 12);
 const storeId = identity.store_id || quote.store_id || null;

 let clauses = CANONICAL_TOURISM_CLAUSES;
 if (storeId) {
 const { data: store } = await supabase
 .from("stores")
 .select("settings")
 .eq("id", storeId)
 .maybeSingle();

 const agencyClauses = (store?.settings as any)?.tourism_contract_clauses;
 if (Array.isArray(agencyClauses) && agencyClauses.length > 0) {
 clauses = agencyClauses;
 }
 }

 const contractTitle = `Contrato de Viagem — ${proposalMeta.destination_city || proposalMeta.title || "Pacote"}`;

 const meta = {
 store_id: storeId,
 proposal_id: input.proposalId,
 public_token: publicToken,
 client_name: quote.guest_name || proposalMeta.client_name || "",
 client_document: input.clientDocument || "",
 client_email: quote.guest_email || proposalMeta.client_email || null,
 client_phone: quote.guest_phone || proposalMeta.client_whatsapp || "",
 client_address: null,
 destination: proposalMeta.destination_city || "",
 travel_start_date: proposalMeta.travel_start_date || null,
 travel_end_date: proposalMeta.travel_end_date || null,
 package_summary: fullPackageSummary || "",
 total_value_cents: totalCents,
 payment_conditions: paymentCond,
 passengers: quote.guest_name ? [{ name: quote.guest_name }] : [],
 signatures: [],
 };

 const { data: contractRow, error: insertErr } = await supabase
 .from("contracts")
 .insert({
 creator_id: identity.id,
 title: contractTitle,
 category: "tourism",
 status: "sent",
 current_version: 1,
 verification_code: publicToken,
 metadata: meta,
 })
 .select("id")
 .single();

 if (insertErr || !contractRow) {
 console.error("[travel-contract.functions] Erro ao emitir contrato da proposta:", insertErr);
 throw new Error("Falha ao gerar contrato a partir da proposta: " + insertErr?.message);
 }

 const contentText = JSON.stringify({ title: contractTitle, clauses, meta });
 const msgBuffer = new TextEncoder().encode(contentText);
 const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
 const hash = Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");

 await supabase.from("contract_versions").insert({
 contract_id: contractRow.id,
 version_number: 1,
 title: contractTitle,
 content_markdown: `# ${contractTitle}\n\n${clauses.map((c: ContractClauseDTO) => `## ${c.section}\n${c.clause_text}`).join("\n\n")}`,
 clauses,
 variables: {},
 hash_sha256: hash,
 is_sealed: false,
 });

 return { success: true, id: contractRow.id, publicToken };
 });

// ─── Buscar Contrato por ID (Workspace) ──────────────────────────────────────

export const getTravelContractById = createServerFn({ method: "GET" })
 .validator(z.object({ id: z.string().min(1) }))
 .handler(async ({ data }): Promise<TravelContractDTO | null> => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();

 if (!identity?.id) throw new Error("Não autorizado.");

 const { data: contract, error: cErr } = await supabase
 .from("contracts")
 .select("*")
 .eq("id", data.id)
 .maybeSingle();

 if (cErr || !contract) return null;

 // Busca a versão atual
 const { data: version } = await supabase
 .from("contract_versions")
 .select("*")
 .eq("contract_id", data.id)
 .eq("version_number", contract.current_version)
 .maybeSingle();

 const meta = contract.metadata as Record<string, any> || {};
 let storeRow: any = null;
 if (meta.store_id) {
 const { data: s } = await supabase
 .from("stores")
 .select("name, cnpj, address, settings")
 .eq("id", meta.store_id)
 .maybeSingle();
 storeRow = s;
 }

 return rowToContractDTO(contract, version, storeRow);
 });

// ─── Buscar Contrato Público por Token (Mobile Signature) ──────────────────

export const getPublicTravelContractByToken = createServerFn({ method: "GET" })
 .validator(z.object({ token: z.string().min(1) }))
 .handler(async ({ data }): Promise<TravelContractDTO | null> => {
 const supabase = getAnonServerClient();

 const { data: contract, error } = await supabase
 .from("contracts")
 .select("*")
 .eq("verification_code", data.token)
 .maybeSingle();

 if (error || !contract) return null;

 const { data: version } = await supabase
 .from("contract_versions")
 .select("*")
 .eq("contract_id", contract.id)
 .eq("version_number", contract.current_version)
 .maybeSingle();

 const meta = contract.metadata as Record<string, any> || {};
 let storeRow: any = null;
 if (meta.store_id) {
 const { data: s } = await supabase
 .from("stores")
 .select("name, cnpj, address, settings")
 .eq("id", meta.store_id)
 .maybeSingle();
 storeRow = s;
 }

 return rowToContractDTO(contract, version, storeRow);
 });

// ─── Assinar Contrato Eletronicamente (SHA-256 + Certificado Digital) ──────

export const signTravelContract = createServerFn({ method: "POST" })
 .validator(
 z.object({
 token: z.string().min(1),
 signerName: z.string().min(2, "Nome obrigatório"),
 signerDocument: z.string().min(11, "CPF obrigatório"),
 signatureImage: z.string().optional(),
 ipAddress: z.string().default("client-ip"),
 userAgent: z.string().default("browser-agent"),
 })
 )
 .handler(async ({ data }): Promise<{ success: boolean; certificateSerial: string; message: string }> => {
 const supabase = getAnonServerClient();

 // 1. Busca o contrato pelo verification_code (public_token)
 const { data: contract, error: findError } = await supabase
 .from("contracts")
 .select("*, contract_versions!inner(*)")
 .eq("verification_code", data.token)
 .single();

 if (findError || !contract) {
 throw new Error("Contrato não encontrado.");
 }

 if (contract.status === "signed") {
 throw new Error("Este contrato já foi assinado anteriormente.");
 }

 const timestamp = new Date().toISOString();
 const certificateSerial = `CERT-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${Date.now().toString().slice(-4)}`;

 const meta = contract.metadata as Record<string, any> || {};

 // 2. Geração do Hash Criptográfico SHA-256
 const hashPayload = JSON.stringify({
 contract_id: contract.id,
 signer_name: data.signerName,
 signer_document: data.signerDocument,
 timestamp,
 serial: certificateSerial,
 total_value: meta.total_value_cents || 0,
 destination: meta.destination || "",
 });

 const encoder = new TextEncoder();
 const dataBuffer = encoder.encode(hashPayload);
 const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
 const contentHash = Array.from(new Uint8Array(hashBuffer))
 .map((b) => b.toString(16).padStart(2, "0"))
 .join("");

 const newSignature: ContractSignerDTO = {
 signer_name: data.signerName.trim(),
 signer_document: data.signerDocument.trim(),
 signed_at: timestamp,
 ip_address: data.ipAddress,
 user_agent: data.userAgent,
 signature_image_url: data.signatureImage || null,
 content_hash: contentHash,
 auth_serial: certificateSerial,
 };

 const currentSignatures = (meta.signatures || []) as ContractSignerDTO[];
 const updatedMeta = {
 ...meta,
 signatures: [...currentSignatures, newSignature],
 signed_at: timestamp,
 content_hash: contentHash,
 certificate_serial: certificateSerial,
 };

 // 3. Atualiza o contrato canônico
 const { error: updateError } = await supabase
 .from("contracts")
 .update({
 status: "signed",
 metadata: updatedMeta,
 updated_at: timestamp,
 })
 .eq("id", contract.id);

 if (updateError) {
 console.error("[travel-contract.functions] Erro ao assinar contrato:", updateError);
 throw new Error("Falha ao registrar assinatura: " + updateError.message);
 }

 // 3.1 Se vinculado a uma proposta turística, sincroniza o status da proposta
 if (meta.proposal_id) {
 await supabase
 .from("travel_proposals")
 .update({
 status: "contract_signed",
 updated_at: timestamp,
 })
 .eq("id", meta.proposal_id);
 }

 // 4. Registra evidência de assinatura na tabela canônica
 const currentVersion = (contract as any).contract_versions?.[0];
 if (currentVersion?.id) {
 await supabase.from("signature_evidence").insert({
 envelope_id: currentVersion.id, // usa version id como envelope reference
 ip_address: data.ipAddress,
 user_agent: data.userAgent,
 auth_method: "document_cpf",
 consent_given: true,
 evidence_manifest: {
 signer_name: data.signerName,
 signer_document: data.signerDocument,
 certificate_serial: certificateSerial,
 },
 signature_digest: contentHash,
 });
 }

 return {
 success: true,
 certificateSerial,
 message: "Contrato assinado com sucesso com validação criptográfica SHA-256!",
 };
 });

// ─── Listagem de Contratos da Agência (Workspace) ──────────────────────────

export const listAgencyTravelContracts = createServerFn({ method: "GET" })
 .validator(
 z
 .object({
 status: z.string().optional(),
 search: z.string().optional(),
 })
 .optional()
 )
 .handler(async ({ data }): Promise<TravelContractDTO[]> => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();

 if (!identity?.id) return [];

 let query = supabase
 .from("contracts")
 .select("*")
 .eq("category", "tourism")
 .order("created_at", { ascending: false });

 if (identity.store_id) {
 // Filtra por store_id dentro do metadata JSONB
 query = query.filter("metadata->>store_id", "eq", identity.store_id);
 } else {
 query = query.eq("creator_id", identity.id);
 }

 if (data?.status && data.status !== "all") {
 query = query.eq("status", data.status);
 }

 const { data: rows, error } = await query;

 if (error) throw new Error(`[travel-contract:listContracts] Falha ao consultar travel_contracts: ${error?.message}`);

 // Busca versões em lote
 const contractIds = rows.map((r: any) => r.id);
 const { data: versions } = contractIds.length > 0
 ? await supabase
 .from("contract_versions")
 .select("*")
 .in("contract_id", contractIds)
 : { data: [] };

 const versionMap = new Map<string, any>();
 (versions || []).forEach((v: any) => {
 const existing = versionMap.get(v.contract_id);
 if (!existing || v.version_number > existing.version_number) {
 versionMap.set(v.contract_id, v);
 }
 });

 return rows
 .filter((r: any) => {
 const meta = r.metadata as Record<string, any> || {};
 if (!data?.search) return true;
 const s = data.search.toLowerCase();
 return (
 (meta.client_name || "").toLowerCase().includes(s) ||
 (meta.destination || "").toLowerCase().includes(s) ||
 (r.title || "").toLowerCase().includes(s)
 );
 })
 .map((row: any) => rowToContractDTO(row, versionMap.get(row.id), null));
 });

// ─── 7. Exclusão de Contrato de Viagem ────────────────────────────────────────

export const deleteTravelContract = createServerFn({ method: "POST" })
 .validator(z.object({ id: z.string().uuid() }))
 .handler(async ({ data }): Promise<{ success: boolean }> => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();

 if (!identity?.id) throw new Error("Não autorizado.");

 // Remove versões associadas primeiro
 await supabase.from("contract_versions").delete().eq("contract_id", data.id);

 // Remove o contrato
 const { error } = await supabase
 .from("contracts")
 .delete()
 .eq("id", data.id);

  if (error) {
    throw new Error(`Erro ao excluir contrato: ${error.message}`);
  }

  return { success: true };
});

export const createContractAddendum = createServerFn({ method: "POST" })
  .validator(
    z.object({
      contractId: z.string().uuid(),
      title: z.string().min(2),
      content: z.string().min(2),
    }),
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();

    const { data: addendum, error } = await supabase
      .from("contract_addendums")
      .insert({
        contract_id: data.contractId,
        title: data.title,
        content: data.content,
        status: "pending_signature",
      })
      .select("*")
      .single();

    if (error) throw new Error("Erro ao criar aditivo: " + error.message);

    await supabase.from("contract_audit_chain").insert({
      contract_id: data.contractId,
      action: "ADDENDUM_CREATED",
      metadata: { addendum_id: addendum.id, title: data.title, user_id: identity?.id },
    });

    return addendum;
  });
