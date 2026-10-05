/**
 * Market Data Miner Engine - Brazilian Economic Indicators
 * Sources: Banco Central do Brasil Olinda OData API (Free, Public, Live) & SGS
 */

import { fetchWithRetry } from './scraper-utils';
import type { EconomicIndicator } from '@/types/mining';

export const BCB_SERIES = {
  DOLAR_PTAX: { code: 1, name: 'Dólar Comercial PTAX', unit: 'R$', type: 'financial' as const },
  EURO_PTAX: { code: 21619, name: 'Euro Comercial PTAX', unit: 'R$', type: 'financial' as const },
  SELIC_META: { code: 432, name: 'Taxa SELIC (Meta Mercado)', unit: '% a.a.', type: 'financial' as const },
  IPCA: { code: 433, name: 'IPCA (Inflação Oficial)', unit: '%', type: 'economic' as const },
  IGP_M: { code: 189, name: 'IGP-M (Inflação Aluguel)', unit: '%', type: 'economic' as const },
};

async function fetchPtaxCurrency(currency: string): Promise<Array<{ date: string; value: number }>> {
  const today = new Date();
  const past = new Date();
  past.setDate(today.getDate() - 15);

  const formatBcbDate = (d: Date) => {
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${mm}-${dd}-${yyyy}`;
  };

  const dStart = formatBcbDate(past);
  const dEnd = formatBcbDate(today);

  const url = currency === 'USD'
    ? `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarPeriodo(dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)?@dataInicial='${dStart}'&@dataFinalCotacao='${dEnd}'&$orderby=dataHoraCotacao%20desc&$format=json`
    : `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoMoedaPeriodo(moeda=@moeda,dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)?@moeda='${currency}'&@dataInicial='${dStart}'&@dataFinalCotacao='${dEnd}'&$orderby=dataHoraCotacao%20desc&$format=json`;

  const res = await fetchWithRetry(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`Olinda PTAX HTTP ${res.status}`);
  const json = await res.json();
  const rawList = (json as any)?.value || [];

  const byDate = new Map<string, number>();
  for (const item of rawList) {
    const isoDate = String(item.dataHoraCotacao || '').slice(0, 10);
    const venda = Number(item.cotacaoVenda);
    if (!byDate.has(isoDate) && venda > 0) {
      byDate.set(isoDate, venda);
    }
  }

  return Array.from(byDate.entries())
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

async function fetchFocusExpectations(indicador: string): Promise<Array<{ date: string; value: number }>> {
  const url = `https://olinda.bcb.gov.br/olinda/servico/Expectativas/versao/v1/odata/ExpectativaMercadoMensais?$filter=Indicador%20eq%20'${encodeURIComponent(indicador)}'%20and%20baseCalculo%20eq%200&$orderby=Data%20desc&$top=20&$format=json`;
  const res = await fetchWithRetry(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`Olinda Expectativas HTTP ${res.status}`);
  const json = await res.json();
  const rawList = (json as any)?.value || [];

  return rawList
    .slice(0, 12)
    .map((item: any) => ({
      date: String(item.Data),
      value: Number(item.Mediana || item.Media || 0),
    }))
    .reverse();
}

async function fetchFocusSelic(): Promise<Array<{ date: string; value: number }>> {
  const url = `https://olinda.bcb.gov.br/olinda/servico/Expectativas/versao/v1/odata/ExpectativasMercadoSelic?$filter=baseCalculo%20eq%200&$orderby=Data%20desc&$top=20&$format=json`;
  const res = await fetchWithRetry(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`Olinda Selic HTTP ${res.status}`);
  const json = await res.json();
  const rawList = (json as any)?.value || [];

  return rawList
    .slice(0, 12)
    .map((item: any) => ({
      date: String(item.Data),
      value: Number(item.Mediana || item.Media || 0),
    }))
    .reverse();
}

export async function fetchAllMarketIndicators(): Promise<EconomicIndicator[]> {
  const targets = [
    { code: 1, name: 'Dólar Comercial PTAX', unit: 'R$', type: 'financial' as const, fetcher: () => fetchPtaxCurrency('USD') },
    { code: 21619, name: 'Euro Comercial PTAX', unit: 'R$', type: 'financial' as const, fetcher: () => fetchPtaxCurrency('EUR') },
    { code: 432, name: 'Taxa SELIC (Meta Mercado)', unit: '% a.a.', type: 'financial' as const, fetcher: () => fetchFocusSelic() },
    { code: 433, name: 'IPCA (Inflação Oficial)', unit: '%', type: 'economic' as const, fetcher: () => fetchFocusExpectations('IPCA') },
    { code: 189, name: 'IGP-M (Inflação Aluguel)', unit: '%', type: 'economic' as const, fetcher: () => fetchFocusExpectations('IGP-M') },
  ];

  const results: EconomicIndicator[] = [];

  for (const t of targets) {
    try {
      const timeSeries = await t.fetcher();
      if (!timeSeries || timeSeries.length === 0) continue;

      const latest = timeSeries[timeSeries.length - 1];
      const previous = timeSeries.length > 1 ? timeSeries[timeSeries.length - 2] : undefined;

      let variationPercent: number | undefined;
      if (previous && previous.value !== 0) {
        variationPercent = parseFloat((((latest.value - previous.value) / Math.abs(previous.value)) * 100).toFixed(2));
      }

      results.push({
        code: t.code,
        name: t.name,
        type: t.type,
        unit: t.unit,
        currentValue: latest.value,
        previousValue: previous?.value,
        variationPercent,
        referenceDate: latest.date,
        timeSeries,
      });
    } catch (err) {
      console.warn(`[MarketDataMiner] Falha ao consultar indicador ${t.name}:`, err);
    }
  }

  return results;
}
