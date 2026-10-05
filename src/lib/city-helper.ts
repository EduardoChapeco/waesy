/**
 * city-helper.ts — Utilitário Canônico de Extração e Resolução de Cidade/Localidade Ativa
 * Suporta parâmetro de URL (?city=), Cookie universal (waesy_city), header Cloudflare (cf-ipcity) e LocalStorage.
 */

import { createIsomorphicFn } from "@tanstack/react-start";
import { getCookie, getRequestHeader } from "@tanstack/react-start/server";

/**
 * DEC-165: Leitura de request isolada em createIsomorphicFn.
 * O compilador do TanStack Start remove o ramo .server() (e o import de h3)
 * do bundle do cliente. Import direto de start-server-core em módulo isomórfico
 * injeta `new AsyncLocalStorage()` no browser e aborta a hidratação inteira.
 */
interface ServerCityHints {
  ssrCookie?: string;
  rawCookie?: string;
  cfIpCity?: string;
}

const readServerCityHints = createIsomorphicFn()
  .server((): ServerCityHints => {
    const hints: ServerCityHints = {};
    try {
      hints.ssrCookie = getCookie("waesy_city") ?? undefined;
    } catch {
      // fora do contexto de request
    }
    try {
      hints.rawCookie = getRequestHeader("cookie") ?? undefined;
      hints.cfIpCity = getRequestHeader("cf-ipcity") ?? undefined;
    } catch {
      // fora do contexto de request
    }
    return hints;
  })
  .client((): ServerCityHints => ({}));

const EXCLUDED_CITIES = new Set([
  "global",
  "all",
  "todas",
  "todas as cidades",
  "todas-as-cidades",
  "todos",
  "indefinida",
  "undefined",
  "null",
]);

/**
 * Normaliza e valida o nome da cidade.
 * Retorna undefined se for vazia, "Global", "all", "Todas", "Todas as Cidades", etc.
 */
export function normalizeActiveCity(rawCity?: string | null): string | undefined {
  if (!rawCity || typeof rawCity !== "string") return undefined;
  const trimmed = rawCity.trim();
  if (!trimmed) return undefined;
  if (EXCLUDED_CITIES.has(trimmed.toLowerCase())) {
    return undefined;
  }
  return trimmed;
}

export interface CityResolutionContext {
  cookie?: string;
  cfCity?: string;
  searchCity?: string;
}

export function resolveActiveCity(
  searchParams?: Record<string, unknown>,
  context?: CityResolutionContext,
): string | undefined {
  // 1. URL search parameter (?city=...)
  if (searchParams && typeof searchParams.city === "string") {
    const normalized = normalizeActiveCity(searchParams.city);
    if (normalized) return normalized;
  }

  // 1b. Context searchCity fallback if provided
  if (context?.searchCity) {
    const normalized = normalizeActiveCity(context.searchCity);
    if (normalized) return normalized;
  }

  // 2. Client-side inspection (Browser / DOM)
  if (typeof document !== "undefined") {
    // 2a. Cookie client-side
    const match = document.cookie.match(/(?:^|;\s*)waesy_city=([^;]+)/);
    if (match) {
      try {
        const decoded = decodeURIComponent(match[1]);
        const normalized = normalizeActiveCity(decoded);
        if (normalized) return normalized;
      } catch {
        // ignore decode failure
      }
    }

    // 2b. LocalStorage fallback
    try {
      if (typeof localStorage !== "undefined") {
        const stored = localStorage.getItem("waesy_master_location");
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            const normalized = normalizeActiveCity(parsed?.city);
            if (normalized) return normalized;
          } catch {
            const normalized = normalizeActiveCity(stored);
            if (normalized) return normalized;
          }
        }
      }
    } catch {
      // ignore localStorage security/quota errors
    }
  }

  // 3. Server-side inspection (SSR / Edge)
  if (typeof document === "undefined") {
    // 3a. Explicit context cookie
    if (context?.cookie) {
      const match = context.cookie.match(/(?:^|;\s*)waesy_city=([^;]+)/);
      if (match) {
        try {
          const decoded = decodeURIComponent(match[1]);
          const normalized = normalizeActiveCity(decoded);
          if (normalized) return normalized;
        } catch {
          // ignore
        }
      }
    }

    const hints = readServerCityHints();

    // 3b. TanStack Start server getCookie
    try {
      const ssrCookie = hints.ssrCookie;
      if (ssrCookie) {
        const normalized = normalizeActiveCity(decodeURIComponent(ssrCookie));
        if (normalized) return normalized;
      }
    } catch {
      // outside server context or storage not initialized
    }

    // 3c. Request header cookie
    try {
      const rawCookie = hints.rawCookie;
      if (rawCookie) {
        const match = rawCookie.match(/(?:^|;\s*)waesy_city=([^;]+)/);
        if (match) {
          const decoded = decodeURIComponent(match[1]);
          const normalized = normalizeActiveCity(decoded);
          if (normalized) return normalized;
        }
      }
    } catch {
      // outside server context
    }

    // 3d. Context cfCity fallback
    if (context?.cfCity) {
      const normalized = normalizeActiveCity(context.cfCity);
      if (normalized) return normalized;
    }

    // 3e. Cloudflare cf-ipcity header
    try {
      const cfIpCity = hints.cfIpCity;
      if (cfIpCity) {
        const decoded = decodeURIComponent(cfIpCity);
        const normalized = normalizeActiveCity(decoded);
        if (normalized) return normalized;
      }
    } catch {
      // outside server context
    }
  }

  return undefined;
}
