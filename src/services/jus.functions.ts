/**
 * jus.functions.ts — BFF Server Functions para o Módulo JUS & Advocacia
 * Gestão de Processos Judiciais, Demandas de Cidadãos, Propostas de Honorários e Contratos.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient, getAnonServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";
import { harvestAndPersistDataJudProcess, parseCnjNumber } from "./mining/datajud-harvester";

// ============================================================
// Schemas
// ============================================================

export const createJusDemandSchema = z.object({
 title: z.string().min(3, "Título muito curto"),
 legal_area: z.string().min(2, "Área jurídica obrigatória"),
 description: z.string().min(10, "Descreva detalhadamente o caso"),
 estimated_value_cents: z.number().int().nonnegative().optional(),
 urgency: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
 city: z.string().default("Regional"),
 state: z.string().default("SC"),
 documents: z.array(z.string().url()).default([]),
 is_anonymous: z.boolean().default(false),
});

export const sendJusProposalSchema = z.object({
 demand_id: z.string().uuid(),
 store_id: z.string().uuid().optional(),
 fee_type: z.enum(["fixed", "success_percentage", "hybrid"]).default("fixed"),
 fixed_value_cents: z.number().int().nonnegative().default(0),
 success_percentage: z.number().min(0).max(100).default(0),
 proposal_details: z.string().min(10, "Detalhe sua proposta"),
 estimated_deadline_days: z.number().int().positive().default(30),
});

// ============================================================
// Server Functions
// ============================================================

/**
 * 1. Lista processos do cidadão (por CPF ou vinculação direta)
 */
export const listMyLawsuits = createServerFn({ method: "GET" })
 .validator(z.object({ cpf: z.string().optional() }).optional())
 .handler(async ({ data }) => {
 const identity = await getServerIdentity();
 if (!identity) throw new Error("Não autenticado");

 const supabase = getServerClient();
 let query = supabase
 .from("mined_lawsuits")
 .select("*, movements:lawsuit_movements(*)")
 .order("last_movement_date", { ascending: false, nullsFirst: false });

 if (data?.cpf) {
 const cleanCpf = data.cpf.replace(/\D/g, "");
 query = query.or(`linked_cpf.eq.${cleanCpf},linked_profile_id.eq.${identity.id}`);
 } else {
 query = query.eq("linked_profile_id", identity.id);
 }

 const { data: lawsuits, error } = await query;
 if (error) throw new Error(`Falha ao buscar processos: ${error.message}`);
 return lawsuits || [];
 });

/**
 * 2. Cidadão cria nova demanda jurídica
 */
export const createJusDemand = createServerFn({ method: "POST" })
 .validator(createJusDemandSchema)
 .handler(async ({ data }) => {
 const identity = await getServerIdentity();
 if (!identity) throw new Error("Não autenticado");

 const supabase = getServerClient();
 const { data: demand, error } = await supabase
 .from("jus_demands")
 .insert({
 profile_id: identity.id,
 title: data.title,
 legal_area: data.legal_area,
 description: data.description,
 estimated_value_cents: data.estimated_value_cents || 0,
 urgency: data.urgency,
 city: data.city,
 state: data.state,
 documents: data.documents,
 is_anonymous: data.is_anonymous,
 status: "open",
 })
 .select()
 .single();

 if (error) throw new Error(`Falha ao criar demanda: ${error.message}`);
 return demand;
 });

/**
 * 3. Lista demandas disponíveis no mural para advogados verificados
 */
export const listMarketplaceDemands = createServerFn({ method: "GET" })
 .validator(
 z
 .object({
 legal_area: z.string().optional(),
 city: z.string().optional(),
 })
 .optional(),
 )
 .handler(async ({ data }) => {
 const supabase = getAnonServerClient();
 let query = supabase
 .from("jus_demands")
 .select("id, title, legal_area, description, urgency, city, state, created_at, status")
 .in("status", ["open", "proposals_received"])
 .order("created_at", { ascending: false });

 if (data?.legal_area && data.legal_area !== "all") {
 query = query.eq("legal_area", data.legal_area);
 }
 if (data?.city) {
 query = query.ilike("city", `%${data.city}%`);
 }

 const { data: demands, error } = await query;
 if (error) throw new Error(`Falha ao listar demandas: ${error.message}`);
 return demands || [];
 });

/**
 * 4. Advogado envia proposta de honorários
 */
export const sendJusProposal = createServerFn({ method: "POST" })
 .validator(sendJusProposalSchema)
 .handler(async ({ data }) => {
 const identity = await getServerIdentity();
 if (!identity) throw new Error("Não autenticado");

 const supabase = getServerClient();
 const { data: proposal, error } = await supabase
 .from("jus_proposals")
 .insert({
 demand_id: data.demand_id,
 lawyer_profile_id: identity.id,
 store_id: identity.store_id || null,
 fee_type: data.fee_type,
 fixed_value_cents: data.fixed_value_cents,
 success_percentage: data.success_percentage,
 proposal_details: data.proposal_details,
 estimated_deadline_days: data.estimated_deadline_days,
 status: "pending",
 })
 .select()
 .single();

 if (error) throw new Error(`Falha ao enviar proposta: ${error.message}`);

 // Atualiza status da demanda para proposals_received
 await supabase
 .from("jus_demands")
 .update({ status: "proposals_received", updated_at: new Date().toISOString() })
 .eq("id", data.demand_id);

 return proposal;
 });

/**
 * 5. Cidadão aceita proposta de honorários e gera contrato
 */
export const acceptJusProposal = createServerFn({ method: "POST" })
 .validator(z.object({ proposal_id: z.string().uuid() }))
 .handler(async ({ data }) => {
 const identity = await getServerIdentity();
 if (!identity) throw new Error("Não autenticado");

 const supabase = getServerClient();

 // Carrega proposta
 const { data: proposal, error: propErr } = await supabase
 .from("jus_proposals")
 .select("*, demand:jus_demands(*)")
 .eq("id", data.proposal_id)
 .single();

 if (propErr || !proposal) throw new Error("Proposta não encontrada");
 if (proposal.demand.profile_id !== identity.id) {
 throw new Error("Você não é o autor desta demanda");
 }

 // Marca proposta como aceita
 await supabase
 .from("jus_proposals")
 .update({ status: "accepted", updated_at: new Date().toISOString() })
 .eq("id", data.proposal_id);

 // Cria contrato formal
 const contractNumber = `JUS-${Date.now().toString().slice(-6)}`;
 const { data: contract, error: contractErr } = await supabase
 .from("jus_contracts")
 .insert({
 demand_id: proposal.demand_id,
 proposal_id: proposal.id,
 client_profile_id: identity.id,
 lawyer_profile_id: proposal.lawyer_profile_id,
 store_id: proposal.store_id,
 contract_number: contractNumber,
 terms_content: `Contrato de prestação de serviços advocatícios referente à demanda "${proposal.demand.title}". Honorários: ${proposal.fixed_value_cents ? `R$ ${(proposal.fixed_value_cents / 100).toFixed(2)}` : ""} + ${proposal.success_percentage}% de êxito.`,
 total_value_cents: proposal.fixed_value_cents || 0,
 status: "active",
 })
 .select()
 .single();

 if (contractErr) throw new Error(`Falha ao gerar contrato: ${contractErr.message}`);

 // Atualiza demanda
 await supabase
 .from("jus_demands")
 .update({ status: "in_progress", updated_at: new Date().toISOString() })
 .eq("id", proposal.demand_id);

 return contract;
 });

/**
 * 6. Lista demandas abertas pelo próprio cidadão logado
 */
export const getMyDemands = createServerFn({ method: "GET" }).handler(async () => {
 const identity = await getServerIdentity();
 if (!identity) return [];

 const supabase = getServerClient();
 const { data: demands, error } = await supabase
 .from("jus_demands")
 .select("*, proposals:jus_proposals(*)")
 .eq("profile_id", identity.id)
 .order("created_at", { ascending: false });

 if (error) {
 console.error("[JUS] Erro ao buscar minhas demandas:", error);
 return [];
 }
 return demands || [];
});

// ============================================================
// JUDIT LegalTech Engine: Monitoramento, Consulta CNJ & Compliance
// ============================================================

export const saveLawsuitMonitorSchema = z.object({
 id: z.string().uuid().optional(),
 title: z.string().min(3, "Nome do monitoramento deve ter pelo menos 3 caracteres"),
 document_keys: z.array(z.string().min(3)).min(1, "Insira pelo menos um documento (CPF, CNPJ ou OAB)"),
 tags: z.array(z.string()).default([]),
 courts: z.array(z.string()).default([]),
 parties_filter: z.string().optional(),
 party_side: z.enum(["all", "active", "passive", "third_party"]).default("all"),
 date_from: z.string().optional(),
 date_to: z.string().optional(),
});

/**
 * 7. Consulta Processual Unificada por CNJ com Flags de Compliance
 */
export const searchProcessByCNJ = createServerFn({ method: "POST" })
 .validator(
 z.object({
 cnj: z.string().min(5, "Informe o número do processo (CNJ)"),
 compliance_flags: z
 .object({
 has_arrest_warrants: z.boolean().default(false),
 has_criminal_executions: z.boolean().default(false),
 has_sanctions_restrictions: z.boolean().default(false),
 })
 .optional(),
 }),
 )
 .handler(async ({ data }) => {
 const identity = await getServerIdentity().catch(() => null);
 const supabase = getServerClient();

 const cleanCnj = data.cnj.replace(/\D/g, "");

 // Busca processo no banco
 const { data: lawsuit, error } = await supabase
 .from("mined_lawsuits")
 .select("*, movements:lawsuit_movements(*)")
 .or(`process_number.ilike.%${data.cnj}%,process_number_clean.ilike.%${cleanCnj}%`)
 .order("movement_date", { referencedTable: "lawsuit_movements", ascending: false })
 .maybeSingle();

 if (error) {
 console.error("[JUS] Erro na busca por CNJ:", error);
 throw new Error(`Erro na consulta processual: ${error.message}`);
 }

 if (lawsuit) {
 return { found: true, lawsuit };
 }

 // Se não encontrado no acervo local, simula registro da consulta histórica
 return {
 found: false,
 message: "Processo não localizado no acervo indexado. Verifique os dígitos ou solicite busca histórica estendida.",
 searched_cnj: data.cnj,
 };
 });

/**
 * 8. Cria ou Atualiza Monitoramento Histórico em Lote
 */
export const saveLawsuitMonitor = createServerFn({ method: "POST" })
 .validator(saveLawsuitMonitorSchema)
 .handler(async ({ data }) => {
 const identity = await getServerIdentity();
 if (!identity) throw new Error("Não autenticado");

 const supabase = getServerClient();

 const payload = {
 store_id: identity.store_id || null,
 profile_id: identity.id,
 title: data.title,
 document_keys: data.document_keys.map((d) => d.trim()),
 tags: data.tags,
 courts: data.courts,
 parties_filter: data.parties_filter || null,
 party_side: data.party_side,
 date_from: data.date_from ? data.date_from : null,
 date_to: data.date_to ? data.date_to : null,
 is_active: true,
 last_sync_at: new Date().toISOString(),
 updated_at: new Date().toISOString(),
 };

 if (data.id) {
 const { data: updated, error } = await supabase
 .from("lawsuit_monitors")
 .update(payload)
 .eq("id", data.id)
 .select()
 .single();

 if (error) throw new Error(`Falha ao atualizar monitoramento: ${error.message}`);
 return updated;
 } else {
 const { data: created, error } = await supabase
 .from("lawsuit_monitors")
 .insert(payload)
 .select()
 .single();

 if (error) throw new Error(`Falha ao criar monitoramento: ${error.message}`);
 return created;
 }
 });

/**
 * 9. Lista Monitoramentos do Escritório / Advogado
 */
export const listLawsuitMonitors = createServerFn({ method: "GET" }).handler(async () => {
 const identity = await getServerIdentity();
 if (!identity) return [];

 const supabase = getServerClient();
 let query = supabase
 .from("lawsuit_monitors")
 .select("*")
 .order("created_at", { ascending: false });

 if (identity.store_id) {
 query = query.or(`profile_id.eq.${identity.id},store_id.eq.${identity.store_id}`);
 } else {
 query = query.eq("profile_id", identity.id);
 }

 const { data: monitors, error } = await query;
 if (error) {
 console.error("[JUS] Erro ao listar monitoramentos:", error);
 return [];
 }
 return monitors || [];
});

/**
 * 10. Exclui Monitoramento
 */
export const deleteLawsuitMonitor = createServerFn({ method: "POST" })
 .validator(z.object({ id: z.string().uuid() }))
 .handler(async ({ data }) => {
 const identity = await getServerIdentity();
 if (!identity) throw new Error("Não autenticado");

 const supabase = getServerClient();
 const { error } = await supabase
 .from("lawsuit_monitors")
 .delete()
 .eq("id", data.id);

 if (error) throw new Error(`Falha ao excluir monitoramento: ${error.message}`);
 return { success: true };
 });

/**
 * 11. Carrega Ficha 360° Detalhada do Processo
 */
export const getLawsuitDetails360 = createServerFn({ method: "POST" })
 .validator(z.object({ lawsuitId: z.string().uuid() }))
 .handler(async ({ data }) => {
 const supabase = getServerClient();

 const { data: lawsuit, error } = await supabase
 .from("mined_lawsuits")
 .select("*, movements:lawsuit_movements(*)")
 .eq("id", data.lawsuitId)
 .order("movement_date", { referencedTable: "lawsuit_movements", ascending: false })
 .single();

 if (error || !lawsuit) {
 throw new Error("Processo judicial não encontrado");
 }

 return lawsuit;
 });

/**
 * 12. Alterna Monitoramento Ativo de um Processo Individual
 */
export const toggleLawsuitMonitoring = createServerFn({ method: "POST" })
 .validator(z.object({ lawsuitId: z.string().uuid(), is_monitored: z.boolean() }))
 .handler(async ({ data }) => {
 const identity = await getServerIdentity();
 if (!identity) throw new Error("Não autenticado");

 const supabase = getServerClient();
 const { data: updated, error } = await supabase
 .from("mined_lawsuits")
 .update({ is_monitored: data.is_monitored, updated_at: new Date().toISOString() })
 .eq("id", data.lawsuitId)
 .select()
 .single();

 if (error) throw new Error(`Falha ao alterar monitoramento: ${error.message}`);
 return updated;
 });

/**
 * 13. Alterna Favorito / Destaque de Processo
 */
export const toggleLawsuitFavorite = createServerFn({ method: "POST" })
 .validator(z.object({ lawsuitId: z.string().uuid(), is_favorite: z.boolean() }))
 .handler(async ({ data }) => {
 const identity = await getServerIdentity();
 if (!identity) throw new Error("Não autenticado");

 const supabase = getServerClient();
 const { data: updated, error } = await supabase
 .from("mined_lawsuits")
 .update({ is_favorite: data.is_favorite, updated_at: new Date().toISOString() })
 .eq("id", data.lawsuitId)
 .select()
 .single();

 if (error) throw new Error(`Falha ao favoritar processo: ${error.message}`);
 return updated;
 });

/**
 * 14. Analytics do Acervo Jurídico (Distribuição por Tribunal & Estados)
 */
export const getLawsuitAnalytics = createServerFn({ method: "GET" }).handler(async () => {
 const supabase = getServerClient();

 const { data: lawsuits, error } = await supabase
 .from("mined_lawsuits")
 .select("id, court_code, origin_state, status, is_monitored, value, compliance_flags")
 .limit(500);

 if (error || !lawsuits) {
 return {
 courtDistribution: [],
 stateDistribution: [],
 totalMonitored: 0,
 totalActive: 0,
 complianceAlerts: 0,
 };
 }

 const courtsMap: Record<string, number> = {};
 const statesMap: Record<string, number> = {};
 let totalMonitored = 0;
 let complianceAlerts = 0;

 lawsuits.forEach((l) => {
 if (l.court_code) {
 courtsMap[l.court_code] = (courtsMap[l.court_code] || 0) + 1;
 }
 const state = l.origin_state || (l.court_code ? l.court_code.slice(2, 4) : "Outros");
 if (state) {
 statesMap[state] = (statesMap[state] || 0) + 1;
 }
 if (l.is_monitored) totalMonitored++;
 const flags = (l.compliance_flags as any) || {};
 if (flags.has_arrest_warrants || flags.has_criminal_executions || flags.has_sanctions_restrictions) {
 complianceAlerts++;
 }
 });

 const courtDistribution = Object.entries(courtsMap).map(([name, count]) => ({ name, count }));
 const stateDistribution = Object.entries(statesMap).map(([uf, count]) => ({ uf, count }));

 return {
 courtDistribution,
 stateDistribution,
 totalMonitored,
 totalActive: lawsuits.filter((l) => l.status === "active").length,
 complianceAlerts,
 };
});

// ============================================================
// Prazos Processuais Fatais, Agenda & Preclusão (Módulo JUS)
// ============================================================

export const saveLawsuitDeadlineSchema = z.object({
 id: z.string().uuid().optional(),
 lawsuit_id: z.string().uuid().optional().nullable(),
 title: z.string().min(2, "Título do prazo ou audiência é obrigatório"),
 deadline_type: z
 .enum(["contestacao", "recurso", "audiencia", "pericia", "manifestacao", "cumprimento", "pagamento", "outro"])
 .default("manifestacao"),
 due_date: z.string().min(5, "Data fatal do prazo é obrigatória"),
 priority: z.enum(["normal", "high", "urgent", "fatal"]).default("normal"),
 court_name: z.string().optional().nullable(),
 process_number: z.string().optional().nullable(),
 client_name: z.string().optional().nullable(),
 notes: z.string().optional().nullable(),
});

/**
 * 15. Lista Prazos Processuais do Escritório / Advogado
 */
export const listLawsuitDeadlines = createServerFn({ method: "GET" })
 .validator(
 z
 .object({
 status: z.string().optional(),
 lawsuit_id: z.string().uuid().optional(),
 })
 .optional(),
 )
 .handler(async ({ data }) => {
 const identity = await getServerIdentity();
 if (!identity) return [];

 const supabase = getServerClient();
 let query = supabase
 .from("lawsuit_deadlines")
 .select("*")
 .order("due_date", { ascending: true });

 if (identity.store_id) {
 query = query.or(`profile_id.eq.${identity.id},store_id.eq.${identity.store_id}`);
 } else {
 query = query.eq("profile_id", identity.id);
 }

 if (data?.status && data.status !== "all") {
 query = query.eq("status", data.status);
 }

 if (data?.lawsuit_id) {
 query = query.eq("lawsuit_id", data.lawsuit_id);
 }

 const { data: deadlines, error } = await query;
 if (error) {
 console.error("[JUS] Erro ao listar prazos:", error);
 return [];
 }
 return deadlines || [];
 });

/**
 * 16. Cria ou Atualiza Prazo Processual Fatal
 */
export const saveLawsuitDeadline = createServerFn({ method: "POST" })
 .validator(saveLawsuitDeadlineSchema)
 .handler(async ({ data }) => {
 const identity = await getServerIdentity();
 if (!identity) throw new Error("Não autenticado");

 const supabase = getServerClient();

 const payload = {
 store_id: identity.store_id || null,
 profile_id: identity.id,
 lawsuit_id: data.lawsuit_id || null,
 title: data.title,
 deadline_type: data.deadline_type,
 due_date: new Date(data.due_date).toISOString(),
 priority: data.priority,
 court_name: data.court_name || null,
 process_number: data.process_number || null,
 client_name: data.client_name || null,
 notes: data.notes || null,
 updated_at: new Date().toISOString(),
 };

 if (data.id) {
 const { data: updated, error } = await supabase
 .from("lawsuit_deadlines")
 .update(payload)
 .eq("id", data.id)
 .select()
 .single();

 if (error) throw new Error(`Falha ao atualizar prazo: ${error.message}`);
 return updated;
 } else {
 const { data: created, error } = await supabase
 .from("lawsuit_deadlines")
 .insert({
 ...payload,
 status: "pending",
 })
 .select()
 .single();

 if (error) throw new Error(`Falha ao cadastrar prazo: ${error.message}`);
 return created;
 }
 });

/**
 * 17. Cumpre Prazo Processual (Com Protocolo Judicial)
 */
export const completeLawsuitDeadline = createServerFn({ method: "POST" })
 .validator(
 z.object({
 id: z.string().uuid(),
 protocol_receipt: z.string().optional().nullable(),
 }),
 )
 .handler(async ({ data }) => {
 const identity = await getServerIdentity();
 if (!identity) throw new Error("Não autenticado");

 const supabase = getServerClient();
 const { data: updated, error } = await supabase
 .from("lawsuit_deadlines")
 .update({
 status: "completed",
 completed_at: new Date().toISOString(),
 completed_by: identity.id,
 protocol_receipt: data.protocol_receipt || null,
 updated_at: new Date().toISOString(),
 })
 .eq("id", data.id)
 .select()
 .single();

 if (error) throw new Error(`Falha ao cumprir prazo: ${error.message}`);
 return updated;
 });

/**
 * 18. Exclui Prazo Processual
 */
export const deleteLawsuitDeadline = createServerFn({ method: "POST" })
 .validator(z.object({ id: z.string().uuid() }))
 .handler(async ({ data }) => {
 const identity = await getServerIdentity();
 if (!identity) throw new Error("Não autenticado");

 const supabase = getServerClient();
 const { error } = await supabase
 .from("lawsuit_deadlines")
 .delete()
 .eq("id", data.id);

 if (error) throw new Error(`Falha ao remover prazo: ${error.message}`);
 return { success: true };
 });

/**
 * 19. Digest de Prazos do Escritório (Alertas de Preclusão & Urgência)
 */
export const getLawsuitDeadlinesDigest = createServerFn({ method: "GET" }).handler(async () => {
 const identity = await getServerIdentity();
 if (!identity) return { pendingCount: 0, urgentCount: 0, attentionCount: 0, completedCount: 0 };

 const supabase = getServerClient();
 let query = supabase.from("lawsuit_deadlines").select("id, due_date, priority, status");

 if (identity.store_id) {
 query = query.or(`profile_id.eq.${identity.id},store_id.eq.${identity.store_id}`);
 } else {
 query = query.eq("profile_id", identity.id);
 }

 const { data: deadlines, error } = await query;
 if (error || !deadlines) {
 return { pendingCount: 0, urgentCount: 0, attentionCount: 0, completedCount: 0 };
 }

 const now = new Date().getTime();
 let pendingCount = 0;
 let urgentCount = 0;
 let attentionCount = 0;
 let completedCount = 0;

 deadlines.forEach((d) => {
 if (d.status === "completed") {
 completedCount++;
 } else if (d.status === "pending" || d.status === "in_progress") {
 pendingCount++;
 const dueTime = new Date(d.due_date).getTime();
 const diffHours = (dueTime - now) / (1000 * 60 * 60);

 if (diffHours <= 48 || d.priority === "fatal" || d.priority === "urgent") {
 urgentCount++;
 } else if (diffHours <= 120) {
 // até 5 dias
 attentionCount++;
 }
 }
 });

 return {
 pendingCount,
 urgentCount,
 attentionCount,
 completedCount,
 };
});

/**
 * 22. Harvester DataJud CNJ: Mineração e sincronização de processo por número unificado CNJ
 */
export const harvestDataJudProcessFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      process_number: z.string().min(14, "Número de processo CNJ obrigatório"),
      store_id: z.string().uuid().optional(),
    })
  )
  .handler(async ({ data }) => {
    const identity = await getServerIdentity().catch(() => null);

    const result = await harvestAndPersistDataJudProcess({
      processNumber: data.process_number,
      storeId: data.store_id,
      profileId: identity?.id || undefined,
    });

    if (!result.success) {
      throw new Error(result.error || "Falha ao minerar processo no DataJud");
    }

    return result;
  });

