/**
 * city-helper.ts — Utilitário Canônico de Extração e Resolução de Cidade/Localidade Ativa
 * Suporta parâmetro de URL (?city=), Cookie universal (waesy_city) e LocalStorage
 */

export function resolveActiveCity(searchParams?: Record<string, unknown>): string | undefined {
  if (searchParams && typeof searchParams.city === "string" && searchParams.city.trim()) {
    const searchCity = searchParams.city.trim();
    if (
      searchCity !== "Global" &&
      searchCity !== "all" &&
      searchCity !== "Todas" &&
      searchCity !== "Todas as Cidades"
    ) {
      return searchCity;
    }
  }

  if (typeof document !== "undefined") {
    const match = document.cookie.match(/waesy_city=([^;]+)/);
    if (match) {
      try {
        const cookieCity = decodeURIComponent(match[1]).trim();
        if (
          cookieCity &&
          cookieCity !== "Global" &&
          cookieCity !== "all" &&
          cookieCity !== "Todas" &&
          cookieCity !== "Todas as Cidades"
        ) {
          return cookieCity;
        }
      } catch {
        // ignore
      }
    }
  }

  return undefined;
}
