/**
 * economic-indicators-persister.ts — Persistência e Atualização de Indicadores do Banco Central
 * 
 * Consulta as séries oficiais do SGS (BCB) via market-data-miner.engine
 * e atualiza atomicamente a tabela economic_indicators com histórico e variação.
 */

import { getServerClient } from "@/lib/supabase";
import { fetchAllMarketIndicators } from "@/lib/mining/market-data-miner.engine";
import type { EconomicIndicator } from "@/types/mining";

export interface SyncEconomicIndicatorsReport {
  success: boolean;
  totalSynced: number;
  indicators: Array<{ code: number; name: string; value: number }>;
  durationMs: number;
  error?: string;
}

export async function syncAndPersistEconomicIndicators(): Promise<SyncEconomicIndicatorsReport> {
  const startTime = Date.now();
  const supabase = getServerClient();

  try {
    const indicators = await fetchAllMarketIndicators();
    if (indicators == null || indicators.length === 0) {
      return {
        success: false,
        totalSynced: 0,
        indicators: [],
        durationMs: Date.now() - startTime,
        error: "Nenhum indicador retornado pela API SGS do Banco Central.",
      };
    }

    const syncedList: Array<{ code: number; name: string; value: number }> = [];

    for (const item of indicators) {
      const payload = {
        code: item.code,
        name: item.name,
        type: item.type,
        unit: item.unit,
        current_value: item.currentValue,
        previous_value: item.previousValue ?? null,
        variation_percent: item.variationPercent ?? null,
        reference_date: item.referenceDate,
        time_series: item.timeSeries || [],
        source: "bcb_sgs",
        updated_at: new Date().toISOString(),
      };

      const { error: upsertErr } = await supabase
        .from("economic_indicators")
        .upsert(payload, { onConflict: "code" });

      if (upsertErr == null) {
        syncedList.push({
          code: item.code,
          name: item.name,
          value: item.currentValue,
        });
      } else {
        console.warn(`[EconomicPersister] Falha ao persistir série ${item.code}:`, upsertErr.message);
      }
    }

    // Registra telemetria real em scraper_audit_log
    await supabase.from("scraper_audit_log").insert({
      scraper_name: "market-data-bcb",
      status: "success",
      items_processed: indicators.length,
      items_inserted: syncedList.length,
      duration_ms: Date.now() - startTime,
      metadata: {
        source: "api_bcb_gov_br",
        synced_codes: syncedList.map((s) => s.code),
      },
    });

    return {
      success: true,
      totalSynced: syncedList.length,
      indicators: syncedList,
      durationMs: Date.now() - startTime,
    };
  } catch (err: any) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[EconomicPersister] Erro ao sincronizar indicadores do BCB:", errorMsg);

    await supabase.from("scraper_audit_log").insert({
      scraper_name: "market-data-bcb",
      status: "failed",
      items_processed: 0,
      items_inserted: 0,
      duration_ms: Date.now() - startTime,
      metadata: { error: errorMsg },
    });

    return {
      success: false,
      totalSynced: 0,
      indicators: [],
      durationMs: Date.now() - startTime,
      error: errorMsg,
    };
  }
}
