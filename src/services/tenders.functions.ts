/**
 * tenders.functions.ts — Motor B2B de Licitações Públicas (Gov Harvester & PNCP)
 * 
 * Centraliza a descoberta de compras governamentais, filtros de alerta por palavra-chave,
 * desbloqueio de editais mastigados por IA e tarifação transparente via Token Tollbooth.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient, getAnonServerClient } from "@/lib/supabase";
import { getServerIdentity } from "@/lib/server-access";
import { requireTokensOrTollbooth } from "@/lib/token-tollbooth.server";
import { fetchPncpContracts } from "./mining/pncp-extractor";
import { executeUnifiedAiCall } from "./api-orchestrator.functions";
import { getDefaultCity } from "@/lib/brand.config";

export interface MinedTenderItem {
  id: string;
  pncp_id: string;
  title: string;
  description: string;
  agency_name: string;
  agency_cnpj: string | null;
  modality: string;
  estimated_amount_cents: number;
  publication_date: string | null;
  closing_date: string | null;
  city: string;
  uf: string;
  portal_url: string | null;
  edital_url: string | null;
  ai_curated_digest: {
    executive_summary?: string;
    qualification_requirements?: string[];
    critical_milestones?: string[];
    risk_assessment?: string;
    proposal_checklist?: string[];
    competitiveness_score?: number;
  } | null;
  ai_risk_score: number;
  is_unlocked: boolean;
  created_at: string;
}

export const ListTendersFilterSchema = z.object({
  query: z.string().optional(),
  city: z.string().optional(),
  uf: z.string().default("SC"),
  modality: z.string().optional(),
  minAmountCents: z.number().int().optional(),
  maxAmountCents: z.number().int().optional(),
  onlyUnlocked: z.boolean().default(false),
  limit: z.number().int().min(1).max(50).default(20),
  offset: z.number().int().min(0).default(0),
});

/**
 * 1. Listar Licitações Públicas com Detecção de Acesso da Loja
 */
export const listPublicTenders = createServerFn({ method: "GET" })
  .validator(ListTendersFilterSchema)
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();
    let currentStoreId: string | null = null;

    try {
      const identity = await getServerIdentity();
      currentStoreId = identity?.store_id || null;
    } catch {
      // Visitante ou sem loja selecionada
    }

    let query = supabase
      .from("mined_tenders")
      .select("*", { count: "exact" })
      .order("closing_date", { ascending: true, nullsFirst: false });

    if (input.city) {
      query = query.ilike("city", `%${input.city}%`);
    }

    if (input.uf) {
      query = query.eq("uf", input.uf);
    }

    if (input.modality) {
      query = query.ilike("modality", `%${input.modality}%`);
    }

    if (input.minAmountCents !== undefined) {
      query = query.gte("estimated_amount_cents", input.minAmountCents);
    }

    if (input.maxAmountCents !== undefined) {
      query = query.lte("estimated_amount_cents", input.maxAmountCents);
    }

    if (input.query) {
      query = query.or(`title.ilike.%${input.query}%,description.ilike.%${input.query}%,agency_name.ilike.%${input.query}%`);
    }

    if (input.onlyUnlocked && currentStoreId) {
      query = query.contains("unlocked_by_stores", [currentStoreId]);
    }

    query = query.range(input.offset, input.offset + input.limit - 1);

    const { data: rows, count, error } = await query;

    if (error) {
      console.error("[tenders] Erro ao listar licitações:", error);
      throw new Error(`Falha ao carregar licitações: ${error.message}`);
    }

    // Se a tabela estiver vazia, sincroniza dados do PNCP em tempo real
    if ((!rows || rows.length === 0) && input.offset === 0) {
      try {
        await syncPncpTendersCore(input.city || getDefaultCity(), input.uf);
        // Re-executa consulta
        const { data: freshRows, count: freshCount } = await query;
        return formatTenderResults(freshRows || [], freshCount || 0, currentStoreId);
      } catch (syncErr) {
        console.warn("[tenders] Fallback silencioso de sincronização PNCP:", syncErr);
      }
    }

    return formatTenderResults(rows || [], count || 0, currentStoreId);
  });

function formatTenderResults(rows: any[], totalCount: number, storeId: string | null) {
  const items: MinedTenderItem[] = rows.map((r: any) => {
    const isUnlocked = storeId ? Array.isArray(r.unlocked_by_stores) && r.unlocked_by_stores.includes(storeId) : false;
    return {
      id: r.id,
      pncp_id: r.pncp_id,
      title: r.title,
      description: r.description,
      agency_name: r.agency_name,
      agency_cnpj: r.agency_cnpj,
      modality: r.modality,
      estimated_amount_cents: Number(r.estimated_amount_cents || 0),
      publication_date: r.publication_date,
      closing_date: r.closing_date,
      city: r.city,
      uf: r.uf,
      portal_url: r.portal_url,
      edital_url: r.edital_url,
      // Se não desbloqueado, oculta o dossiê detalhado
      ai_curated_digest: isUnlocked ? r.ai_curated_digest : null,
      ai_risk_score: r.ai_risk_score || 0,
      is_unlocked: isUnlocked,
      created_at: r.created_at,
    };
  });

  return {
    items,
    total: totalCount,
    hasMore: totalCount > items.length,
  };
}

/**
 * 2. Desbloquear Edital e Gerar Dossiê com IA (Cobrança Tollbooth - 100 Tokens)
 */
export const unlockTenderWithAiDigest = createServerFn({ method: "POST" })
  .validator(
    z.object({
      tender_id: z.string().uuid(),
      store_id: z.string().uuid().optional(),
    })
  )
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    const storeId = input.store_id || identity.store_id;

    if (!storeId) {
      throw new Error("Nenhuma loja ativa selecionada para desbloquear esta licitação.");
    }

    // 1. Obter licitação
    const { data: tender, error: tenderErr } = await supabase
      .from("mined_tenders")
      .select("*")
      .eq("id", input.tender_id)
      .single();

    if (tenderErr || !tender) {
      throw new Error("Edital de licitação não encontrado.");
    }

    // 2. Se a loja já desbloqueou, retorna imediatamente com custo zero (Idempotente)
    const alreadyUnlocked = Array.isArray(tender.unlocked_by_stores) && tender.unlocked_by_stores.includes(storeId);
    if (alreadyUnlocked && tender.ai_curated_digest) {
      return {
        success: true,
        already_unlocked: true,
        tender: {
          ...tender,
          is_unlocked: true,
        },
        message: "Licitação já desbloqueada para sua empresa.",
      };
    }

    // 3. Função que executa a análise de IA do edital
    const analyzeTender = async () => {
      const prompt = `Você é um Consultor Especialista em Compras Públicas, Licitações e Lei 14.133/2021.
Analise os dados do edital abaixo e elabore um Dossiê Executivo de Alta Precisão para o empresário decidir se deve disputar.

Órgão: ${tender.agency_name} (CNPJ: ${tender.agency_cnpj || "Não informado"})
Modalidade: ${tender.modality}
Município/UF: ${tender.city}/${tender.uf}
Valor Estimado: R$ ${((tender.estimated_amount_cents || 0) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
Data de Abertura/Encerramento: ${tender.closing_date || "A definir"}
Objeto: ${tender.title} - ${tender.description}

Retorne ESTRITAMENTE um JSON no seguinte formato:
{
  "executive_summary": "Resumo executivo de 2 parágrafos objetivos sobre o que o órgão quer contratar e as principais condições.",
  "qualification_requirements": [
    "Habilitação Jurídica essencial",
    "Qualificação Econômico-Financeira exigida",
    "Atestado de Capacidade Técnica necessário"
  ],
  "critical_milestones": [
    "Prazo final para impugnação e esclarecimentos",
    "Data e hora limite de envio de propostas"
  ],
  "risk_assessment": "Análise crítica de riscos (ex: histórico de pagamento, exigências complexas ou edital simplificado).",
  "proposal_checklist": [
    "Item 1 para separar na documentação",
    "Item 2 da planilha de custos",
    "Item 3 de amostra ou certidão"
  ],
  "competitiveness_score": 85
}`;

      const aiRes = await executeUnifiedAiCall({
        systemPrompt: "Você é um assistente de inteligência de mercado especializado em licitações públicas brasileiras. Retorne apenas JSON.",
        userPrompt: prompt,
        responseFormat: "json_object",
        temperature: 0.2,
      });

      const parsed = aiRes.parsedJson || (aiRes.content ? JSON.parse(aiRes.content) : {});
      return parsed;
    };

    // 4. Execução Interceptada pelo Tollbooth (Tarifa 100 Tokens pré-voo com Rollback)
    const { result: aiDigest, tollboothReceipt } = await requireTokensOrTollbooth({
      storeId,
      tokens: 100,
      actionType: "burn_tender_unlock",
      serviceCategory: "tender_ai_digest",
      description: `Desbloqueio de Edital: ${tender.agency_name.slice(0, 35)} (${tender.pncp_id})`,
      timeSavedMinutes: 180, // Economiza ~3h de leitura burocrática de edital
      metadata: {
        tender_id: tender.id,
        pncp_id: tender.pncp_id,
        agency_name: tender.agency_name,
        estimated_amount_cents: tender.estimated_amount_cents,
      },
      executeAction: analyzeTender,
    });

    // 5. Persistir o dossiê e marcar a loja como desbloqueadora
    const updatedUnlockedStores = Array.from(new Set([...(tender.unlocked_by_stores || []), storeId]));

    const { data: updatedTender, error: updateErr } = await supabase
      .from("mined_tenders")
      .update({
        ai_curated_digest: aiDigest,
        ai_risk_score: aiDigest.competitiveness_score || 80,
        unlocked_by_stores: updatedUnlockedStores,
        updated_at: new Date().toISOString(),
      })
      .eq("id", tender.id)
      .select()
      .single();

    if (updateErr) {
      console.error("[tenders] Erro ao persistir desbloqueio:", updateErr);
    }

    return {
      success: true,
      tender: {
        ...(updatedTender || tender),
        ai_curated_digest: aiDigest,
        is_unlocked: true,
      },
      tollboothReceipt,
      message: "Dossiê executivo desbloqueado com sucesso (-100 Tokens).",
    };
  });

/**
 * 3. Gerenciar Filtros de Alerta de Licitações (Radar de Oportunidades)
 */
export const getStoreTenderAlerts = createServerFn({ method: "GET" }).handler(async () => {
  const identity = await getServerIdentity();
  if (!identity.store_id) throw new Error("Loja não selecionada.");

  const supabase = getServerClient();

  const { data: filters } = await supabase
    .from("tender_alert_filters")
    .select("*")
    .eq("store_id", identity.store_id)
    .order("created_at", { ascending: false });

  return {
    alerts: filters || [],
  };
});

export const saveStoreTenderAlert = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().uuid().optional(),
      title: z.string().min(2).default("Alerta de Oportunidades"),
      keywords: z.array(z.string()).min(1),
      cities: z.array(z.string()).default(["Chapecó"]),
      min_amount_cents: z.number().int().min(0).default(0),
      notify_whatsapp: z.boolean().default(false),
      notify_email: z.boolean().default(true),
      is_active: z.boolean().default(true),
    })
  )
  .handler(async ({ data: input }) => {
    const identity = await getServerIdentity();
    if (!identity.store_id) throw new Error("Loja não selecionada.");

    const supabase = getServerClient();

    const payload = {
      store_id: identity.store_id,
      title: input.title,
      keywords: input.keywords,
      cities: input.cities,
      min_amount_cents: input.min_amount_cents,
      notify_whatsapp: input.notify_whatsapp,
      notify_email: input.notify_email,
      is_active: input.is_active,
      updated_at: new Date().toISOString(),
    };

    if (input.id) {
      const { data, error } = await supabase
        .from("tender_alert_filters")
        .update(payload)
        .eq("id", input.id)
        .eq("store_id", identity.store_id)
        .select()
        .single();

      if (error) throw new Error(`Falha ao atualizar alerta: ${error.message}`);
      return { success: true, alert: data, message: "Filtro de alerta atualizado." };
    } else {
      const { data, error } = await supabase
        .from("tender_alert_filters")
        .insert(payload)
        .select()
        .single();

      if (error) throw new Error(`Falha ao criar alerta: ${error.message}`);
      return { success: true, alert: data, message: "Novo radar de licitações configurado!" };
    }
  });

/**
 * 4. Sincronizador Core de Licitações (Gov Harvester do PNCP)
 */
export async function syncPncpTendersCore(city: string, uf = "SC") {
  const supabase = getServerClient();

  const contracts = await fetchPncpContracts({
    query: city,
    uf,
    limit: 25,
  });

  if (!contracts || contracts.length === 0) return 0;

  let insertedCount = 0;

  for (const c of contracts) {
    const amountCents = c.valorEstimado ? Math.round(c.valorEstimado * 100) : 0;

    const { error } = await supabase
      .from("mined_tenders")
      .upsert(
        {
          pncp_id: c.id,
          title: `Edital ${c.numeroEdital}: ${c.objeto.slice(0, 180)}`,
          description: c.objeto,
          agency_name: c.orgaoNome,
          agency_cnpj: c.orgaoCnpj || null,
          modality: c.modalidade,
          estimated_amount_cents: amountCents,
          publication_date: c.dataPublicacao || null,
          closing_date: c.dataEncerramento || null,
          city: city,
          uf: uf,
          portal_url: c.urlPortal,
          edital_url: c.urlEdital || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "pncp_id" }
      );

    if (!error) insertedCount++;
  }

  return insertedCount;
}

export const syncPncpTendersAction = createServerFn({ method: "POST" })
  .validator(
    z.object({
      city: z.string().default("Chapecó"),
      uf: z.string().default("SC"),
    })
  )
  .handler(async ({ data }) => {
    const count = await syncPncpTendersCore(data.city, data.uf);
    return {
      success: true,
      synced_count: count,
      message: `${count} licitações mineradas do PNCP para ${data.city}/${data.uf}.`,
    };
  });
