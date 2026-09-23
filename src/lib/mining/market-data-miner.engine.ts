/**
 * Market Data Miner Engine - Brazilian Economic Indicators
 * Ported with 100% fidelity from proprietary market-data-miner v1.0
 * Sources: Banco Central do Brasil SGS API (Free, Public, Live)
 */

import { fetchWithRetry } from './scraper-utils';
import type { EconomicIndicator } from '@/types/mining';

export const BCB_SERIES = {
  IPCA: { code: 433, name: 'IPCA - Variação Mensal', unit: '%', type: 'economic' as const },
  IPCA_12M: { code: 13522, name: 'IPCA Acumulado 12 Meses', unit: '%', type: 'economic' as const },
  IGP_M: { code: 189, name: 'IGP-M - Variação Mensal', unit: '%', type: 'economic' as const },
  SELIC_META: { code: 432, name: 'Taxa SELIC Meta', unit: '% a.a.', type: 'financial' as const },
  SELIC_OVER: { code: 11, name: 'Taxa SELIC Efetiva', unit: '% a.a.', type: 'financial' as const },
  CDI: { code: 12, name: 'Taxa CDI', unit: '% a.a.', type: 'financial' as const },
  DOLAR_PTAX: { code: 1, name: 'Dólar Comercial PTAX Venda', unit: 'R$', type: 'financial' as const },
  EURO_PTAX: { code: 21619, name: 'Euro PTAX Venda', unit: 'R$', type: 'financial' as const },
  DESEMPREGO: { code: 24369, name: 'Taxa de Desemprego (PNAD Contínua)', unit: '%', type: 'social' as const },
  PIB_IBC_BR: { code: 4380, name: 'Índice de Atividade Econômica (IBC-Br)', unit: 'pts', type: 'economic' as const },
};

export async function fetchBcbSeries(
  seriesCode: number,
  limit = 12
): Promise<Array<{ date: string; value: number }>> {
  const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${seriesCode}/dados/ultimos/${limit}?formato=json`;

  try {
    const response = await fetchWithRetry(url, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`BCB SGS API retornou status HTTP ${response.status}`);
    }

    const data = await response.json();
    if (!Array.isArray(data)) {
      return [];
    }

    return data.map((item: { data: string; valor: string }) => {
      // Normalização do formato brasileiro "DD/MM/AAAA" para ISO
      const [day, month, year] = item.data.split('/');
      const isoDate = `${year}-${month}-${day}`;
      const numValue = parseFloat(item.valor.replace(',', '.'));

      return {
        date: isoDate,
        value: isNaN(numValue) ? 0 : numValue,
      };
    });
  } catch (error) {
    console.error(`[MarketDataMiner] Erro ao consultar série ${seriesCode} do BCB:`, error);
    return [];
  }
}

export async function fetchAllMarketIndicators(): Promise<EconomicIndicator[]> {
  const entries = Object.entries(BCB_SERIES);

  const results = await Promise.allSettled(
    entries.map(async ([, config]) => {
      const timeSeries = await fetchBcbSeries(config.code, 12);
      if (timeSeries.length === 0) return null;

      const latest = timeSeries[timeSeries.length - 1];
      const previous = timeSeries.length > 1 ? timeSeries[timeSeries.length - 2] : undefined;

      let variationPercent: number | undefined;
      if (previous && previous.value !== 0) {
        variationPercent = parseFloat((((latest.value - previous.value) / Math.abs(previous.value)) * 100).toFixed(2));
      }

      const indicator: EconomicIndicator = {
        code: config.code,
        name: config.name,
        type: config.type,
        unit: config.unit,
        currentValue: latest.value,
        previousValue: previous?.value,
        variationPercent,
        referenceDate: latest.date,
        timeSeries,
      };

      return indicator;
    })
  );

  return results
    .filter((r): r is PromiseFulfilledResult<EconomicIndicator | null> => r.status === 'fulfilled')
    .map((r) => r.value)
    .filter((v): v is EconomicIndicator => v !== null);
}
