/**
 * geo-resolver.ts — Resolvedor Canônico de Cidade, Estado (UF) e Código IBGE
 * Utiliza o catálogo unificado GLOBAL_BRAZIL_CITIES_CATALOG e BRAZILIAN_STATES.
 * Invariante M01/M04: Zero adivinhação de UF (sem blind 'SC' para cidades de outros estados).
 */

import { GLOBAL_BRAZIL_CITIES_CATALOG } from "@/lib/data/cities-brazil-catalog";
import { BRAZILIAN_STATES } from "@/lib/constants/brazilian-states";
import { normalizeActiveCity } from "@/lib/city-helper";
import { getDefaultCity, getDefaultState } from "@/lib/brand.config";

export interface ResolvedGeoLocation {
  city?: string;
  state?: string;
  ibgeCode?: string;
}

/**
 * Remove diacríticos e normaliza strings para comparação case-insensitive.
 */
function cleanComparisonText(text?: string | null): string {
  if (text == null) return "";
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

/**
 * Normaliza nomes de estados por extenso ou siglas para a sigla oficial de 2 letras.
 * Exemplo: "Paraná" -> "PR", "Santa Catarina" -> "SC", "Rio Grande do Sul" -> "RS", "sp" -> "SP".
 */
export function normalizeStateUf(stateNameOrUf?: string | null): string | undefined {
  if (stateNameOrUf == null) return undefined;
  const trimmed = stateNameOrUf.trim();
  if (trimmed.length === 0) return undefined;

  // 1. Verificação direta por sigla de 2 caracteres
  if (trimmed.length === 2) {
    const candidateUf = trimmed.toUpperCase();
    const matchedState = BRAZILIAN_STATES.find((s) => s.uf === candidateUf);
    if (matchedState) {
      return matchedState.uf;
    }
  }

  // 2. Verificação por nome do estado por extenso
  const cleanedInput = cleanComparisonText(trimmed);
  const matchedByName = BRAZILIAN_STATES.find(
    (s) => cleanComparisonText(s.name) === cleanedInput
  );
  if (matchedByName) {
    return matchedByName.uf;
  }

  return undefined;
}

/**
 * Resolve cidade, estado (UF) e código IBGE com precisão geográfica em todo o Brasil.
 * Invariante: Nunca retornar "SC" quando a cidade pertencer a outro estado!
 */
export function resolveCityAndState(
  cityName?: string | null,
  stateHint?: string | null
): ResolvedGeoLocation {
  const normalizedHintUf = normalizeStateUf(stateHint);
  const normalizedCityName = normalizeActiveCity(cityName);

  // Fallback canônico apenas quando cidade e estado são completamente indefinidos
  if (!normalizedCityName && !normalizedHintUf) {
    const defaultCity = getDefaultCity();
    const defaultState = getDefaultState();
    const defaultMatch = GLOBAL_BRAZIL_CITIES_CATALOG.find(
      (c) =>
        cleanComparisonText(c.name) === cleanComparisonText(defaultCity) &&
        c.state === defaultState
    );
    return {
      city: defaultCity,
      state: defaultState,
      ibgeCode: defaultMatch?.ibge_code || "4204202",
    };
  }

  // Se apenas o estado foi informado
  if (!normalizedCityName && normalizedHintUf) {
    return {
      city: undefined,
      state: normalizedHintUf,
      ibgeCode: undefined,
    };
  }

  if (!normalizedCityName) {
    return {
      city: undefined,
      state: undefined,
      ibgeCode: undefined,
    };
  }

  // Extrair possível sigla de estado embutida no nome (ex: "Curitiba - PR", "Curitiba/PR", "Passo Fundo, RS")
  let effectiveCityQuery = normalizedCityName;
  let effectiveStateUf = normalizedHintUf;

  const suffixMatch = normalizedCityName.match(
    /^(.+?)\s*[-/,\s]\s*([a-zA-Z]{2})$/
  );
  if (suffixMatch) {
    const parsedUf = normalizeStateUf(suffixMatch[2]);
    if (parsedUf) {
      effectiveCityQuery = suffixMatch[1].trim();
      if (!effectiveStateUf) {
        effectiveStateUf = parsedUf;
      }
    }
  }

  const cleanedQuery = cleanComparisonText(effectiveCityQuery);

  // Busca no catálogo nacional de municípios
  if (effectiveStateUf) {
    const exactStateMatch = GLOBAL_BRAZIL_CITIES_CATALOG.find(
      (c) =>
        cleanComparisonText(c.name) === cleanedQuery &&
        c.state === effectiveStateUf
    );
    if (exactStateMatch) {
      return {
        city: exactStateMatch.name,
        state: exactStateMatch.state,
        ibgeCode: exactStateMatch.ibge_code,
      };
    }
  }

  // Busca geral no catálogo nacional
  const matches = GLOBAL_BRAZIL_CITIES_CATALOG.filter(
    (c) => cleanComparisonText(c.name) === cleanedQuery
  );

  if (matches.length > 0) {
    // Se houver mais de um município com o mesmo nome, priorizar capitais ou polos turísticos
    const bestMatch =
      matches.find((m) => m.is_state_capital) ||
      matches.find((m) => m.is_tourism_hub) ||
      matches[0];

    return {
      city: bestMatch.name,
      state: effectiveStateUf || bestMatch.state,
      ibgeCode: bestMatch.ibge_code,
    };
  }

  // Município não catalogado: preserva nome original e estado fornecido se houver
  return {
    city: effectiveCityQuery,
    state: effectiveStateUf,
    ibgeCode: undefined,
  };
}
