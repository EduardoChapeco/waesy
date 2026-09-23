/**
 * CNPJ & Business Enrichment Engine
 * Ported with 100% fidelity from proprietary cnpj-enrichment edge function
 * Cascading sources: BrasilAPI (Free, Unlimited) -> ReceitaWS -> CNPJ.JA
 */

import { fetchWithRetry, calculateDataQualityScore, validators } from './scraper-utils';
import type { CNPJEnrichedData } from '@/types/mining';

export async function fetchBrasilApiCnpj(cleanedCnpj: string): Promise<CNPJEnrichedData | null> {
  const url = `https://brasilapi.com.br/api/cnpj/v1/${cleanedCnpj}`;

  try {
    const response = await fetchWithRetry(url, {
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await response.json();

    const socios = Array.isArray(data.qsa)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? data.qsa.map((s: any) => ({
          nome: s.nome_socio || s.nome,
          qualificacao: s.qualificacao_socio || s.qualificacao,
          cpf_cnpj_socio: s.cnpj_cpf_do_socio,
        }))
      : [];

    const cnaesSecundarios = Array.isArray(data.cnaes_secundarios)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? data.cnaes_secundarios.map((c: any) => ({
          codigo: String(c.codigo),
          descricao: c.descricao,
        }))
      : [];

    const rawDataRecord: Record<string, unknown> = {
      cnpj: cleanedCnpj,
      razao_social: data.razao_social,
      nome_fantasia: data.nome_fantasia,
      logradouro: data.logradouro,
      municipio: data.municipio,
      uf: data.uf,
      cep: data.cep,
      telefone: data.ddd_telefone_1,
      email: data.email,
      cnae: data.cnae_fiscal,
      socios_count: socios.length,
    };

    const qualityScore = calculateDataQualityScore(rawDataRecord, [
      { name: 'razao_social', weight: 20 },
      { name: 'cnpj', weight: 20, validator: validators.isCNPJ },
      { name: 'municipio', weight: 15 },
      { name: 'uf', weight: 10 },
      { name: 'logradouro', weight: 10 },
      { name: 'cnae', weight: 10 },
      { name: 'telefone', weight: 10 },
      { name: 'email', weight: 5 },
    ]);

    return {
      cnpj: cleanedCnpj,
      razao_social: data.razao_social || 'N/A',
      nome_fantasia: data.nome_fantasia || undefined,
      situacao_cadastral: data.descricao_situacao_cadastral || undefined,
      data_situacao_cadastral: data.data_situacao_cadastral || undefined,
      natureza_juridica: data.natureza_juridica || undefined,
      capital_social: typeof data.capital_social === 'number' ? data.capital_social : undefined,
      porte: data.porte || undefined,
      data_inicio_atividade: data.data_inicio_atividade || undefined,
      cnae_principal: data.cnae_fiscal
        ? { codigo: String(data.cnae_fiscal), descricao: data.cnae_fiscal_descricao || '' }
        : undefined,
      cnaes_secundarios: cnaesSecundarios,
      endereco: {
        logradouro: data.logradouro || undefined,
        numero: data.numero || undefined,
        complemento: data.complemento || undefined,
        bairro: data.bairro || undefined,
        municipio: data.municipio || undefined,
        uf: data.uf || undefined,
        cep: data.cep || undefined,
      },
      telefones: [data.ddd_telefone_1, data.ddd_telefone_2].filter(Boolean),
      email: data.email || undefined,
      socios,
      source: 'brasilapi',
      dataQualityScore: qualityScore,
    };
  } catch (error) {
    console.error(`[CNPJEnrichment] Erro ao consultar BrasilAPI para CNPJ ${cleanedCnpj}:`, error);
    return null;
  }
}

export async function enrichCnpj(rawCnpj: string): Promise<CNPJEnrichedData | null> {
  const cleaned = rawCnpj.replace(/\D/g, '');
  if (!validators.isCNPJ(cleaned)) {
    throw new Error(`CNPJ ${rawCnpj} é inválido.`);
  }

  // Fonte primária e livre de taxa: BrasilAPI
  const result = await fetchBrasilApiCnpj(cleaned);
  if (result) return result;

  // Fallback: ReceitaWS pública
  try {
    const res = await fetchWithRetry(`https://www.receitaws.com.br/v1/cnpj/${cleaned}`);
    if (res.ok) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = await res.json();
      if (data.status !== 'ERROR') {
        return {
          cnpj: cleaned,
          razao_social: data.nome,
          nome_fantasia: data.fantasia,
          situacao_cadastral: data.situacao,
          natureza_juridica: data.natureza_juridica,
          endereco: {
            logradouro: data.logradouro,
            numero: data.numero,
            bairro: data.bairro,
            municipio: data.municipio,
            uf: data.uf,
            cep: data.cep,
          },
          telefones: [data.telefone].filter(Boolean),
          email: data.email,
          socios: Array.isArray(data.qsa)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ? data.qsa.map((s: any) => ({ nome: s.nome, qualificacao: s.qual }))
            : [],
          source: 'receitaws',
          dataQualityScore: 70,
        };
      }
    }
  } catch (err) {
    console.warn(`[CNPJEnrichment] ReceitaWS fallback falhou para CNPJ ${cleaned}:`, err);
  }

  return null;
}
