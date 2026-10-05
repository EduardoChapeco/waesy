/**
 * pncp-harvester.ts — Extrator e Persistidor de Licitações Oficiais (PNCP / Compras Públicas)
 * 
 * Consulta a API oficial do Portal Nacional de Contratações Públicas (PNCP)
 * e persiste editais em public.mined_tenders de forma transacional e idempotente.
 */

import { getServerClient } from "@/lib/supabase";
import { fetchPncpContracts, fetchPncpContractItems, type PncpSearchOptions } from "./pncp-extractor";
import { resolveCityAndState, normalizeStateUf } from "@/lib/mining/geo-resolver";
import { getDefaultCity, getDefaultState } from "@/lib/brand.config";

export interface PncpHarvestResult {
  success: boolean;
  insertedCount: number;
  totalFound: number;
  error?: string;
  items?: Array<{ id: string; pncpId: string; title: string }>;
}

export async function harvestAndPersistPncpTenders(
  options: PncpSearchOptions = {}
): Promise<PncpHarvestResult> {
  const supabase = getServerClient();
  const startTime = Date.now();
  const resolvedGeo = resolveCityAndState(options.municipio || options.query, options.uf);
  const targetCity = resolvedGeo.city || options.municipio || options.query || getDefaultCity();
  const targetUf = resolvedGeo.state || normalizeStateUf(options.uf) || getDefaultState();

  try {
    const contracts = await fetchPncpContracts(options);
    if (contracts == null || contracts.length === 0) {
      return {
        success: true,
        insertedCount: 0,
        totalFound: 0,
        items: [],
      };
    }

    // Busca detalhamento de itens para os primeiros contratos da lista
    const enrichedContracts = await Promise.all(
      contracts.map(async (c, idx) => {
        let itemsList: any[] = [];
        // Limita a busca profunda aos primeiros 3 contratos para não sobrecarregar
        if (idx < 3 && c.id) {
          const idMatch = c.id.match(/^(\d+)-(\d+)-(\d+)\/(\d+)$/);
          if (idMatch) {
            const cnpj = idMatch[1];
            const sequencial = parseInt(idMatch[3], 10);
            const ano = parseInt(idMatch[4], 10);
            itemsList = await fetchPncpContractItems(cnpj, ano, sequencial);
          }
        }
        return { ...c, itemsList };
      })
    );

    const rowsToUpsert = enrichedContracts.map((c) => ({
      pncp_id: c.id,
      title: `Edital ${c.numeroEdital}: ${c.objeto.slice(0, 150)}`,
      description: c.objeto,
      agency_name: c.orgaoNome,
      agency_cnpj: c.orgaoCnpj || null,
      modality: c.modalidade,
      estimated_amount_cents: c.valorEstimado ? Math.round(c.valorEstimado * 100) : null,
      publication_date: c.dataPublicacao || new Date().toISOString(),
      closing_date: c.dataEncerramento || null,
      city: targetCity,
      uf: targetUf,
      portal_url: c.urlPortal,
      edital_url: c.urlEdital || null,
      ai_curated_digest: {
        numeroEdital: c.numeroEdital,
        numeroProcesso: c.numeroProcesso,
        orgao: c.orgaoNome,
        modalidade: c.modalidade,
        items: c.itemsList || [],
        totalItens: c.itemsList?.length || 0,
        valorFormatado: c.valorEstimado
          ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(c.valorEstimado)
          : "Não informado",
        extractedAt: new Date().toISOString(),
      },
      updated_at: new Date().toISOString(),
    }));

    const { data: upserted, error: upsertErr } = await supabase
      .from("mined_tenders")
      .upsert(rowsToUpsert, { onConflict: "pncp_id" })
      .select("id, pncp_id, title");

    if (upsertErr) {
      throw new Error(`Falha ao persistir licitações em mined_tenders: ${upsertErr.message}`);
    }

    const insertedCount = upserted?.length || 0;
    const durationMs = Date.now() - startTime;

    // Log de auditoria
    await supabase.from("scraper_audit_log").insert({
      scraper_name: "pncp-tenders-harvester",
      action: "harvest_and_persist",
      target_table: "mined_tenders",
      records_affected: insertedCount,
      duration_ms: durationMs,
      result_summary: {
        query: targetCity,
        uf: targetUf,
        found: contracts.length,
        persisted: insertedCount,
      },
    });

    return {
      success: true,
      insertedCount,
      totalFound: contracts.length,
      items: (upserted || []).map((u) => ({ id: u.id, pncpId: u.pncp_id, title: u.title })),
    };
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    console.error("[pncp-harvester] Erro na mineração do PNCP:", errMsg);

    await supabase.from("scraper_audit_log").insert({
      scraper_name: "pncp-tenders-harvester",
      action: "harvest_error",
      target_table: "mined_tenders",
      records_affected: 0,
      duration_ms: Date.now() - startTime,
      error_message: errMsg,
    });

    return {
      success: false,
      insertedCount: 0,
      totalFound: 0,
      error: errMsg,
    };
  }
}
