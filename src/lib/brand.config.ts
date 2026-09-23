/**
 * brand.config.ts — Fonte Canônica Única de Identidade & Marca da Plataforma
 *
 * Qualquer componente, rota, serviço, metatag ou e-mail consome
 * esta configuração para garantir propagação 100% unificada.
 *
 * REGRA: Proibido usar strings "Chapecó" ou "São Miguel do Oeste" hardcoded
 * em qualquer outro arquivo. Use PLATFORM_LOCATION.defaultCity e os helpers abaixo.
 */

export interface PlatformBrandConfig {
  name: string;
  legalName: string;
  tagline: string;
  description: string;
  communityName: string;
  domain: string;
  supportEmail: string;
  appSlug: string;
  defaultTitle: string;
}

export const BRAND_CONFIG: PlatformBrandConfig = {
  name: "Waesy",
  legalName: "Waesy Plataforma & Tecnologia Ltda",
  tagline: "Super App Comunitário & Negócios Locais",
  description:
    "Explore comércio local, gastronomia, serviços, notícias, turismo, classificados e vagas na comunidade Waesy.",
  communityName: "Comunidade Waesy",
  domain: "usewaesy.pages.dev",
  supportEmail: "contato@usewaesy.com",
  appSlug: "waesy",
  defaultTitle: "Waesy — Super App Comunitário",
};

// ---------------------------------------------------------------------------
// Configuração de Localização da Plataforma (Fonte Única de Verdade)
// ---------------------------------------------------------------------------

export interface PlatformLocationConfig {
  /** Cidade padrão usada em fallbacks de busca, filtros e exibição. */
  defaultCity: string;
  /** Estado (UF) padrão. */
  defaultState: string;
  /** Sigla IATA do aeroporto de origem mais próximo. */
  defaultAirportCode: string;
  /** Cidade principal exibida no contexto da plataforma. */
  displayCity: string;
  /** Região exibida no marketing (ex: "Chapecó & São Miguel do Oeste"). */
  displayRegion: string;
}

export const PLATFORM_LOCATION: PlatformLocationConfig = {
  defaultCity: "Chapecó",
  defaultState: "SC",
  defaultAirportCode: "XAP",
  displayCity: "Chapecó",
  displayRegion: "Chapecó & São Miguel do Oeste",
};

/**
 * Retorna a cidade padrão da plataforma.
 * Use como fallback em qualquer campo de cidade não preenchido pelo usuário.
 * @param override - Cidade vinda do banco/contexto da loja. Tem prioridade.
 */
export function getDefaultCity(override?: string | null): string {
  return override?.trim() || PLATFORM_LOCATION.defaultCity;
}

/**
 * Retorna o estado padrão da plataforma.
 */
export function getDefaultState(override?: string | null): string {
  return override?.trim() || PLATFORM_LOCATION.defaultState;
}

// ---------------------------------------------------------------------------
// Helpers de marca (mantidos)
// ---------------------------------------------------------------------------

export function getBrandName(overrideName?: string | null): string {
  return overrideName?.trim() || BRAND_CONFIG.name;
}

export function formatPageTitle(
  pageTitle?: string | null,
  customBrandName?: string | null,
): string {
  const brand = getBrandName(customBrandName);
  if (!pageTitle || pageTitle.trim() === "") return brand;
  return `${pageTitle} — ${brand}`;
}

