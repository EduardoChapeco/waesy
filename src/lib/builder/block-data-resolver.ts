/**
 * block-data-resolver.ts — Motor Puro e Determinístico de Resolução de Data Bindings,
 * Agendamento Temporal (B.29) e Visibilidade Responsiva/Geográfica para Builder Omni & Vitrines.
 *
 * Consumido de forma 100% simétrica por `OmniEditor` (preview) e `OmniPageRenderer` (produção).
 */

import type { OmniBlockInstance, OmniPageDocument } from "@/types/omni-builder";

export interface BuilderRuntimeDatasets {
  products?: any[];
  categories?: any[];
  collections?: any[];
  classifieds?: any[];
  posts?: any[];
  flyers?: any[];
  events?: any[];
  jobs?: any[];
  stores?: any[];
  banners?: any[];
  hotpages?: any[];
  newsArticles?: any[];
  sponsors?: any[];
}

function normalizeToken(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function parseTimestampMs(raw: unknown): number | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Avalia se um bloco está dentro da janela temporal configurada (`startsAt`, `endsAt`, `autoArchiveAt`).
 * No editor (`isEditing = true`), blocos agendados permanecem visíveis para configuração.
 */
export function isBlockWithinSchedule(
  block: Pick<OmniBlockInstance, "config">,
  nowMs: number = Date.now(),
): boolean {
  const cfg = (block?.config || {}) as Record<string, any>;
  const startsAtMs = parseTimestampMs(cfg.startsAt ?? cfg.starts_at);
  const endsAtMs = parseTimestampMs(cfg.endsAt ?? cfg.ends_at);
  const autoArchiveMs = parseTimestampMs(cfg.autoArchiveAt ?? cfg.auto_archive_at);

  if (startsAtMs !== null && nowMs < startsAtMs) return false;
  if (endsAtMs !== null && nowMs > endsAtMs) return false;
  if (autoArchiveMs !== null && nowMs > autoArchiveMs) return false;
  return true;
}

/**
 * Avalia se o bloco é compatível com o filtro de cidade ativo.
 */
export function isBlockVisibleForCity(
  block: Pick<OmniBlockInstance, "config" | "dataBinding">,
  activeCity?: string | null,
): boolean {
  const rawFilter =
    block?.dataBinding?.cityFilter ??
    block?.config?.cityFilter ??
    block?.config?.city_filter ??
    "";
  const filterNorm = normalizeToken(rawFilter);
  if (
    !filterNorm ||
    filterNorm === "all" ||
    filterNorm === "todas" ||
    filterNorm === "todas as cidades"
  ) {
    return true;
  }
  const cityNorm = normalizeToken(activeCity);
  if (!cityNorm || cityNorm === "all" || cityNorm === "todas" || cityNorm === "todas as cidades") {
    return true;
  }
  return cityNorm.includes(filterNorm) || filterNorm.includes(cityNorm);
}

/**
 * Retorna classes Tailwind canônicas de visibilidade responsiva sem quebrar SSR.
 */
export function getBlockDeviceVisibilityClass(
  block: Pick<OmniBlockInstance, "config" | "styling">,
): string {
  const deviceVisibility = block?.styling?.deviceVisibility;
  const hideOnMobile = Boolean(block?.config?.hideOnMobile) || deviceVisibility === "desktop_only";
  const hideOnDesktop = Boolean(block?.config?.hideOnDesktop) || deviceVisibility === "mobile_only";

  if (hideOnMobile && hideOnDesktop) return "hidden";
  if (hideOnMobile) return "hidden md:block";
  if (hideOnDesktop) return "md:hidden";
  return "";
}

/**
 * Determina se o tema do documento está nos valores padrão de fábrica.
 * Quando verdadeiro (e `customThemeEnabled` não está ativo), NÃO injeta cores inline,
 * preservando integralmente os tokens CSS nativos do Light/Dark Mode.
 */
export function shouldApplyCustomDocumentTheme(
  theme?: (OmniPageDocument["theme"] & { customThemeEnabled?: boolean }) | null,
): boolean {
  if (!theme) return false;
  if (typeof theme.customThemeEnabled === "boolean") {
    return theme.customThemeEnabled;
  }
  const bg = (theme.backgroundColor || "").trim().toLowerCase();
  const fg = (theme.textColor || "").trim().toLowerCase();
  // design-lint-ignore DL-01 reason:"Comparação de tokens para detecção de tema padrão" expiry:"2027-12-31"
  const isDefaultBg = !bg || bg === "#ffffff" || bg === "#fff";
  // design-lint-ignore DL-01 reason:"Comparação de tokens para detecção de tema padrão" expiry:"2027-12-31"
  const isDefaultFg = !fg || fg === "#09090b" || fg === "#000000";
  return !isDefaultBg || !isDefaultFg;
}

function extractNumericPrice(item: Record<string, any>): number {
  if (typeof item.priceCents === "number") return item.priceCents;
  if (typeof item.price_cents === "number") return item.price_cents;
  if (typeof item.price === "number") return Math.round(item.price * 100);
  if (typeof item.price === "string") {
    const cleaned = Number(item.price.replace(/[^\d.,-]/g, "").replace(",", "."));
    if (Number.isFinite(cleaned)) return Math.round(cleaned * 100);
  }
  return 0;
}

function extractCreatedAtMs(item: Record<string, any>): number {
  const raw = item.created_at || item.createdAt || item.published_at || item.event_date || "";
  const parsed = Date.parse(String(raw));
  return Number.isFinite(parsed) ? parsed : 0;
}

function extractPopularityScore(item: Record<string, any>): number {
  return (
    Number(item.sales_count || item.orders_count || item.likes_count || item.views_count || 0) +
    (item.is_featured || item.is_highlighted ? 1000 : 0) +
    Number(item.rating || item.google_rating || 0) * 10
  );
}

function filterAndSortItems(
  items: any[] | undefined,
  options: {
    categoryFilter?: string;
    nicheFilter?: string;
    cityFilter?: string;
    onlyVerified?: boolean;
    tenantScope?: string;
    storeId?: string | null;
    sort?: string;
    limit?: number;
  },
): any[] {
  if (!Array.isArray(items) || items.length === 0) return [];

  const catNorm = normalizeToken(options.categoryFilter);
  const nicheNorm = normalizeToken(options.nicheFilter);
  const cityNorm = normalizeToken(options.cityFilter);

  let result = items.filter((item) => {
    if (!item || typeof item !== "object") return false;

    // Respeita agendamento temporal em itens individuais quando presente
    const itemStarts = parseTimestampMs(item.starts_at ?? item.startsAt);
    const itemEnds = parseTimestampMs(item.ends_at ?? item.endsAt ?? item.auto_archive_at);
    const now = Date.now();
    if (itemStarts !== null && now < itemStarts) return false;
    if (itemEnds !== null && now > itemEnds) return false;

    if (
      options.tenantScope === "current_store" &&
      options.storeId &&
      item.store_id &&
      item.store_id !== options.storeId
    ) {
      return false;
    }

    if (options.onlyVerified) {
      const isVer = Boolean(
        item.is_verified ||
          item.verified ||
          item.verified_badge_url ||
          item.settings?.is_verified ||
          item.stores?.verified_badge_url,
      );
      if (!isVer) return false;
    }

    if (catNorm && catNorm !== "all" && catNorm !== "todas") {
      const itemCat = normalizeToken(
        item.category ||
          item.category_slug ||
          item.categoryName ||
          item.subcategory ||
          item.module ||
          item.settings?.category ||
          "",
      );
      if (itemCat && !itemCat.includes(catNorm) && !catNorm.includes(itemCat)) {
        return false;
      }
    }

    if (nicheNorm && nicheNorm !== "all" && nicheNorm !== "todos") {
      const itemNiche = normalizeToken(
        item.niche ||
          item.segment ||
          item.type ||
          item.module ||
          item.settings?.niche ||
          item.settings?.segment ||
          item.settings?.type ||
          "",
      );
      if (itemNiche && !itemNiche.includes(nicheNorm) && !nicheNorm.includes(itemNiche)) {
        return false;
      }
    }

    if (
      cityNorm &&
      cityNorm !== "all" &&
      cityNorm !== "todas" &&
      cityNorm !== "todas as cidades"
    ) {
      const itemCity = normalizeToken(
        item.city || item.city_filter || item.location_city || item.stores?.city || "",
      );
      if (itemCity && itemCity !== "all" && !itemCity.includes(cityNorm) && !cityNorm.includes(itemCity)) {
        return false;
      }
    }

    return true;
  });

  const sortMode = options.sort || "";
  if (sortMode && result.length > 1) {
    result = [...result];
    switch (sortMode) {
      case "price_asc":
        result.sort((a, b) => extractNumericPrice(a) - extractNumericPrice(b));
        break;
      case "price_desc":
        result.sort((a, b) => extractNumericPrice(b) - extractNumericPrice(a));
        break;
      case "popular":
      case "highlight":
        result.sort((a, b) => extractPopularityScore(b) - extractPopularityScore(a));
        break;
      case "alpha":
        result.sort((a, b) =>
          String(a.title || a.name || "").localeCompare(String(b.title || b.name || ""), "pt-BR"),
        );
        break;
      case "recent":
      case "newest":
        result.sort((a, b) => extractCreatedAtMs(b) - extractCreatedAtMs(a));
        break;
      default:
        break;
    }
  }

  if (typeof options.limit === "number" && options.limit > 0) {
    result = result.slice(0, options.limit);
  }

  return result;
}

/**
 * Resolve coleções dinâmicas vinculadas a um bloco específico (`block.dataBinding` + `block.config`).
 */
export function resolveBlockBoundData(
  block: Pick<OmniBlockInstance, "type" | "config" | "dataBinding">,
  datasets: BuilderRuntimeDatasets,
  context?: { activeCity?: string | null; storeId?: string | null },
): BuilderRuntimeDatasets {
  const binding = block?.dataBinding;
  const cfg = (block?.config || {}) as Record<string, any>;

  const hasExplicitFilter = Boolean(
    binding?.entity ||
      binding?.categoryFilter ||
      binding?.nicheFilter ||
      binding?.cityFilter ||
      binding?.onlyVerified ||
      binding?.sort ||
      binding?.limit ||
      binding?.tenantScope ||
      cfg.categoryFilter ||
      cfg.nicheFilter ||
      cfg.cityFilter ||
      cfg.sort ||
      cfg.maxItems ||
      context?.activeCity,
  );

  if (!hasExplicitFilter) {
    return datasets;
  }

  const filterOpts = {
    categoryFilter: binding?.categoryFilter || cfg.categoryFilter || undefined,
    nicheFilter: binding?.nicheFilter || cfg.nicheFilter || undefined,
    cityFilter: binding?.cityFilter || cfg.cityFilter || context?.activeCity || undefined,
    onlyVerified: Boolean(binding?.onlyVerified ?? cfg.onlyVerified),
    tenantScope: binding?.tenantScope || undefined,
    storeId: context?.storeId || null,
    sort: binding?.sort || cfg.sort || undefined,
    limit:
      typeof binding?.limit === "number"
        ? binding.limit
        : typeof cfg.maxItems === "number"
          ? cfg.maxItems
          : undefined,
  };

  const targetEntity = binding?.entity;
  const next: BuilderRuntimeDatasets = { ...datasets };

  const applyTo = (key: keyof BuilderRuntimeDatasets) => {
    if (Array.isArray(datasets[key])) {
      next[key] = filterAndSortItems(datasets[key], filterOpts);
    }
  };

  if (targetEntity === "products") {
    applyTo("products");
  } else if (targetEntity === "stores") {
    applyTo("stores");
  } else if (targetEntity === "classifieds") {
    applyTo("classifieds");
  } else if (targetEntity === "posts") {
    applyTo("posts");
  } else if (targetEntity === "events") {
    applyTo("events");
  } else if (targetEntity === "jobs") {
    applyTo("jobs");
  } else if (targetEntity === "banners") {
    applyTo("banners");
  } else if (targetEntity === "hotpages") {
    applyTo("hotpages");
  } else if (targetEntity === "news") {
    applyTo("newsArticles");
  } else {
    // Quando entity não foi fixado, aplica ao dataset correspondente ao tipo do bloco
    if (block.type.includes("product") || block.type.includes("catalog") || block.type.includes("hits")) {
      applyTo("products");
    } else if (block.type.includes("store") || block.type.includes("spotlight")) {
      applyTo("stores");
    } else if (block.type.includes("classified")) {
      applyTo("classifieds");
    } else if (block.type.includes("social") || block.type.includes("community")) {
      applyTo("posts");
    } else if (block.type.includes("banner")) {
      applyTo("banners");
    } else if (block.type.includes("news")) {
      applyTo("newsArticles");
    } else if (block.type === "vitrine_ecosystem_rail") {
      const entityType = cfg.entityType || "events";
      if (entityType === "events" || entityType === "jobs" || entityType === "stores" || entityType === "hotpages") {
        applyTo(entityType);
      }
    }
  }

  return next;
}
