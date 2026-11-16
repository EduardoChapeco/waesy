/**
 * block-data-resolver.ts — Motor Puro e Determinístico de Resolução de Data Bindings,
 * Agendamento Temporal (B.29) e Visibilidade Responsiva/Geográfica para Builder Omni & Vitrines.
 *
 * Consumido de forma 100% simétrica por `OmniEditor` (preview) e `OmniPageRenderer` (produção).
 */

import type React from "react";
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
  cmsCollections?: any[];
  navigationMenus?: any[];
  cmsItems?: any[];
  activeCmsCollection?: any;
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
  forcedViewport?: "desktop" | "tablet" | "mobile" | "native_app" | null,
): string {
  const deviceVisibility = block?.styling?.deviceVisibility;
  const hideOnMobile = Boolean(block?.config?.hideOnMobile) || deviceVisibility === "desktop_only";
  const hideOnDesktop = Boolean(block?.config?.hideOnDesktop) || deviceVisibility === "mobile_only";

  if (hideOnMobile && hideOnDesktop) return "hidden";
  if (forcedViewport === "mobile" || forcedViewport === "native_app") {
    if (hideOnMobile) return "hidden";
    if (hideOnDesktop) return "block";
  }
  if (forcedViewport === "desktop" || forcedViewport === "tablet") {
    if (hideOnDesktop) return "hidden";
    if (hideOnMobile) return "block";
  }
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
  theme?: (Partial<OmniPageDocument["theme"]> & {
    customThemeEnabled?: boolean;
    headingFont?: string;
    bodyFont?: string;
    surfaceStyle?: string;
  }) | null,
): boolean {
  if (!theme) return false;
  if (typeof theme.customThemeEnabled === "boolean") {
    return theme.customThemeEnabled;
  }
  const bg = (theme.backgroundColor || "").trim().toLowerCase();
  const fg = (theme.textColor || "").trim().toLowerCase();
  const primary = (theme.primaryColor || "").trim().toLowerCase();
  // design-lint-ignore DL-01 reason:"Comparação de tokens para detecção de tema padrão" expiry:"2027-12-31"
  const isDefaultBg = !bg || bg === "#ffffff" || bg === "#fff" || bg === "var(--background)";
  // design-lint-ignore DL-01 reason:"Comparação de tokens para detecção de tema padrão" expiry:"2027-12-31"
  const isDefaultFg = !fg || fg === "#09090b" || fg === "#000000" || fg === "var(--foreground)";
  // design-lint-ignore DL-01 reason:"Comparação de tokens para detecção de tema padrão" expiry:"2027-12-31"
  const isDefaultPrimary = !primary || primary === "#09090b" || primary === "#000000" || primary === "var(--primary)";
  return !isDefaultBg || !isDefaultFg || !isDefaultPrimary;
}

/**
 * Determina se uma cor hexadecimal possui luminância relativa escura (W3C WCAG 2.2).
 */
export function isHexColorDark(color?: string | null): boolean {
  if (!color || !color.trim().startsWith("#")) return true;
  let hex = color.trim().slice(1);
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((c) => `${c}${c}`)
      .join("");
  }
  if (hex.length !== 6) return true;
  const r = Number.parseInt(hex.slice(0, 2), 16) / 255;
  const g = Number.parseInt(hex.slice(2, 4), 16) / 255;
  const b = Number.parseInt(hex.slice(4, 6), 16) / 255;
  if ([r, g, b].some((n) => Number.isNaN(n))) return true;
  const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const lum = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  return lum <= 0.42;
}

/**
 * Calcula se uma cor hexadecimal requer texto claro ou escuro (luminância relativa W3C).
 * Permite personalização irrestrita de cores de marca sem perda de legibilidade WCAG AA.
 */
export function pickContrastForeground(color?: string | null): string {
  // design-lint-ignore DL-01 reason:"Fallback padrão de alto contraste WCAG" expiry:"2027-12-31"
  const fallbackDark = "#09090b";
  // design-lint-ignore DL-01 reason:"Fallback padrão de alto contraste WCAG" expiry:"2027-12-31"
  const fallbackLight = "#ffffff";
  return !isHexColorDark(color) ? fallbackDark : fallbackLight;
}

export type CanvasIsolationScheme = "light" | "dark";

export function getDocumentThemeIsolationScheme(
  theme?: (Partial<OmniPageDocument["theme"]> & {
    customThemeEnabled?: boolean;
    headingFont?: string;
    bodyFont?: string;
    surfaceStyle?: string;
  }) | null,
  options?: { forceIsolate?: boolean },
): CanvasIsolationScheme | undefined {
  const applyCustom = Boolean(options?.forceIsolate) || shouldApplyCustomDocumentTheme(theme);
  if (!applyCustom) return undefined;
  // design-lint-ignore DL-01 reason:"Detecção de luminância do fundo isolado" expiry:"2027-12-31"
  const bg = theme?.backgroundColor && theme.backgroundColor !== "var(--background)" ? theme.backgroundColor : "#ffffff";
  return isHexColorDark(bg) ? "dark" : "light";
}

/**
 * Gera os estilos inline e as variáveis CSS escopadas (`--background`, `--color-background`,
 * `--foreground`, `--color-foreground`, `--primary`, `--color-primary`, `--card`, `--muted-foreground`, etc.)
 * para isolar completamente o canvas do editor e o site publicado do tema do sistema operacional/Waesy.
 */
export function getDocumentThemeCanvasStyle(
  theme?: (Partial<OmniPageDocument["theme"]> & {
    customThemeEnabled?: boolean;
    headingFont?: string;
    bodyFont?: string;
    surfaceStyle?: string;
  }) | null,
  options?: { forceIsolate?: boolean; settings?: Record<string, any> | null },
): React.CSSProperties {
  const applyCustom = Boolean(options?.forceIsolate) || shouldApplyCustomDocumentTheme(theme);
  const fontFamily = theme?.bodyFont || theme?.fontFamily;
  const buttonStyler = options?.settings?.buttonStyler as
    | { shape?: string; uppercase?: boolean; borderWidthPx?: number }
    | undefined;
  const btnRadiusToken =
    buttonStyler?.shape === "pill"
      ? "9999px"
      : buttonStyler?.shape === "sharp"
        ? "0px"
        : buttonStyler?.shape === "rounded" || theme?.borderRadius === "2xl"
          ? "16px"
          : "12px";
  const radiusTokenMap: Record<string, string> = {
    none: "0px",
    sm: "0.375rem",
    md: "0.5rem",
    lg: "0.75rem",
    xl: "1rem",
    "2xl": "1.5rem",
    full: "9999px",
  };
  const stylerVars: Record<string, string> = {};
  if (buttonStyler) {
    stylerVars["--builder-btn-radius"] = btnRadiusToken;
    stylerVars["--builder-btn-transform"] = buttonStyler.uppercase ? "uppercase" : "none";
  }
  if (theme?.headingFont) {
    stylerVars["--builder-heading-font"] = theme.headingFont;
  }
  if (theme?.borderRadius && radiusTokenMap[theme.borderRadius]) {
    stylerVars["--radius"] = radiusTokenMap[theme.borderRadius];
  }

  if (!applyCustom) {
    if ((fontFamily && fontFamily !== "Inter, sans-serif") || Object.keys(stylerVars).length > 0) {
      return {
        ...(fontFamily ? { fontFamily, "--font-sans": fontFamily } : {}),
        ...stylerVars,
      } as React.CSSProperties;
    }
    return {};
  }

  // design-lint-ignore DL-01 reason:"Isolamento de canvas do site editado contra o tema do sistema" expiry:"2027-12-31"
  const bg = theme?.backgroundColor && theme.backgroundColor !== "var(--background)" ? theme.backgroundColor : "#ffffff";
  // design-lint-ignore DL-01 reason:"Isolamento de canvas do site editado contra o tema do sistema" expiry:"2027-12-31"
  const fg = theme?.textColor && theme.textColor !== "var(--foreground)" ? theme.textColor : "#09090b";
  // design-lint-ignore DL-01 reason:"Isolamento de canvas do site editado contra o tema do sistema" expiry:"2027-12-31"
  const primary = theme?.primaryColor && theme.primaryColor !== "var(--primary)" ? theme.primaryColor : "#09090b";
  const primaryFg = pickContrastForeground(primary);
  const isBgDark = isHexColorDark(bg);
  const headingFont = theme?.headingFont;

  const cardSurface = `color-mix(in srgb, ${bg} 94%, ${fg} 6%)`;
  const popoverSurface = `color-mix(in srgb, ${bg} 96%, ${fg} 4%)`;
  const mutedSurface = `color-mix(in srgb, ${bg} 88%, ${fg} 12%)`;
  const hoverSurface = `color-mix(in srgb, ${bg} 84%, ${fg} 16%)`;
  const activeSurface = `color-mix(in srgb, ${bg} 78%, ${fg} 22%)`;
  const secondarySurface = `color-mix(in srgb, ${bg} 90%, ${primary} 10%)`;
  const accentSurface = `color-mix(in srgb, ${primary} 14%, ${bg} 86%)`;
  const mutedFg = `color-mix(in srgb, ${fg} 68%, ${bg} 32%)`;
  const tertiaryFg = `color-mix(in srgb, ${fg} 52%, ${bg} 48%)`;
  const borderToken = `color-mix(in srgb, ${fg} 16%, ${bg} 84%)`;
  const borderStrongToken = `color-mix(in srgb, ${fg} 32%, ${bg} 68%)`;

  return {
    backgroundColor: bg,
    color: fg,
    colorScheme: isBgDark ? "dark" : "light",
    ...(fontFamily ? { fontFamily, "--font-sans": fontFamily, "--font-master": fontFamily, "--p-body-font": fontFamily } : {}),
    ...(headingFont ? { "--font-display": headingFont, "--font-editorial": headingFont, "--p-heading-font": headingFont } : {}),
    ...stylerVars,
    "--background": bg,
    "--color-background": bg,
    "--canvas": bg,
    "--color-canvas": bg,
    "--surface-canvas": bg,
    "--foreground": fg,
    "--color-foreground": fg,
    "--text-primary": fg,
    "--color-text-primary": fg,
    "--text-secondary": mutedFg,
    "--color-text-secondary": mutedFg,
    "--text-tertiary": tertiaryFg,
    "--color-text-tertiary": tertiaryFg,
    "--text-muted": mutedFg,
    "--color-text-muted": mutedFg,
    "--text-inverse": primaryFg,
    "--color-text-inverse": primaryFg,
    "--card": cardSurface,
    "--color-card": cardSurface,
    "--card-bg": cardSurface,
    "--surface": cardSurface,
    "--color-surface": cardSurface,
    "--surface-card": cardSurface,
    "--color-surface-card": cardSurface,
    "--surface-raised": bg,
    "--color-surface-raised": bg,
    "--surface-subtle": mutedSurface,
    "--color-surface-subtle": mutedSurface,
    "--surface-muted": mutedSurface,
    "--color-surface-muted": mutedSurface,
    "--surface-hover": hoverSurface,
    "--color-surface-hover": hoverSurface,
    "--surface-active": activeSurface,
    "--color-surface-active": activeSurface,
    "--card-foreground": fg,
    "--color-card-foreground": fg,
    "--popover": popoverSurface,
    "--color-popover": popoverSurface,
    "--popover-foreground": fg,
    "--color-popover-foreground": fg,
    "--primary": primary,
    "--color-primary": primary,
    "--primary-foreground": primaryFg,
    "--color-primary-foreground": primaryFg,
    "--secondary": secondarySurface,
    "--color-secondary": secondarySurface,
    "--secondary-foreground": fg,
    "--color-secondary-foreground": fg,
    "--accent": accentSurface,
    "--color-accent": accentSurface,
    "--accent-foreground": fg,
    "--color-accent-foreground": fg,
    "--accent-soft": accentSurface,
    "--color-accent-soft": accentSurface,
    "--muted": mutedSurface,
    "--color-muted": mutedSurface,
    "--muted-foreground": mutedFg,
    "--color-muted-foreground": mutedFg,
    "--border": borderToken,
    "--color-border": borderToken,
    "--border-subtle": borderToken,
    "--color-border-subtle": borderToken,
    "--border-default": borderToken,
    "--color-border-default": borderToken,
    "--border-control": borderToken,
    "--color-border-control": borderToken,
    "--border-strong": borderStrongToken,
    "--color-border-strong": borderStrongToken,
    "--border-focus": primary,
    "--color-border-focus": primary,
    "--input": borderToken,
    "--color-input": borderToken,
    "--input-bg": bg,
    "--input-border": borderToken,
    "--ring": primary,
    "--color-ring": primary,
    "--button-primary-bg": primary,
    "--button-primary-text": primaryFg,
    "--button-secondary-bg": cardSurface,
    "--button-secondary-border": borderToken,
    "--button-secondary-text": fg,
    "--p-bg": bg,
    "--p-surface": cardSurface,
    "--p-subtle": mutedSurface,
    "--p-ink": fg,
    "--p-muted": mutedFg,
    "--p-border": borderToken,
    "--p-brand": primary,
    "--p-brand-fg": primaryFg,
    "--p-brand-soft": accentSurface,
  } as React.CSSProperties;
}

export function getDocumentThemeContainerProps(
  theme?: (Partial<OmniPageDocument["theme"]> & {
    customThemeEnabled?: boolean;
    headingFont?: string;
    bodyFont?: string;
    surfaceStyle?: string;
  }) | null,
  options?: { forceIsolate?: boolean; settings?: Record<string, any> | null },
): {
  style: React.CSSProperties;
  isolationScheme?: CanvasIsolationScheme;
} {
  return {
    style: getDocumentThemeCanvasStyle(theme, options),
    isolationScheme: getDocumentThemeIsolationScheme(theme, options),
  };
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
      binding?.cmsCollectionSlug ||
      block.type === "cms_collection_grid" ||
      binding?.categoryFilter ||
      binding?.nicheFilter ||
      binding?.cityFilter ||
      binding?.onlyVerified ||
      binding?.sort ||
      binding?.limit ||
      binding?.tenantScope ||
      cfg.collectionSlug ||
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

  if (targetEntity === "cms_collection" || block.type === "cms_collection_grid") {
    const requestedSlug = binding?.cmsCollectionSlug || cfg.collectionSlug || cfg.cmsCollectionSlug || "";
    const allCols = Array.isArray(datasets.cmsCollections) ? datasets.cmsCollections : [];
    const matchedCol = requestedSlug
      ? allCols.find((c: any) => c.slug === requestedSlug || c.id === requestedSlug)
      : allCols[0];
    if (matchedCol) {
      next.activeCmsCollection = matchedCol;
      const flatItems = (Array.isArray(matchedCol.items) ? matchedCol.items : [])
        .filter((it: any) => !it?.status || it.status === "published")
        .map((it: any) => ({
          ...it,
          ...(it.data && typeof it.data === "object" ? it.data : {}),
          id: it.id,
          title: it.title || it.data?.title || it.data?.titulo || "Item",
          city: it.city_filter || it.data?.city || "",
        }));
      next.cmsItems = filterAndSortItems(flatItems, filterOpts);
    } else {
      next.cmsItems = [];
    }
  } else if (targetEntity === "products") {
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
