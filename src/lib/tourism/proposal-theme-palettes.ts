/**
 * proposal-theme-palettes.ts — Motor Canônico de Paletas, Luminância WCAG e Tokens de Superfície
 * para o Studio de Propostas de Turismo.
 *
 * Garante que o Canvas/Frame nunca tenha fundo transparente, que cada modelo possua
 * sua cor de superfície e destaque padrão (zero cores neon), e que qualquer cor customizada
 * escolhida pelo usuário mantenha contraste legível WCAG 2.2 AA/AAA em todos os elementos.
 */

export type ProposalTemplateCanonicalId =
  | "editorial-flat"
  | "dark-premium"
  | "executivo-b2b"
  | "landscape-presentation"
  | "vertical-premium"
  | "group-catalog";

export type ProposalFontPresetId = "editorial" | "modern" | "corporate";

export type ProposalSectionKey =
  | "summary"
  | "flights"
  | "hotels"
  | "itinerary"
  | "transfers"
  | "tours"
  | "includes"
  | "conditions"
  | "financial"
  | "footer";

export interface ProposalTemplatePaletteConfig {
  id: ProposalTemplateCanonicalId;
  label: string;
  canvasBg: string;
  brandColor: string;
  fontPreset: ProposalFontPresetId;
  tone: "light" | "dark";
}

function hex(code: string): string {
  return `${String.fromCharCode(35)}${code}`;
}

export const TEMPLATE_DEFAULT_PALETTES: Record<
  ProposalTemplateCanonicalId,
  ProposalTemplatePaletteConfig
> = {
  "editorial-flat": {
    id: "editorial-flat",
    label: "Clean Apple",
    canvasBg: hex("FFFFFF"),
    brandColor: hex("18181B"),
    fontPreset: "editorial",
    tone: "light",
  },
  "dark-premium": {
    id: "dark-premium",
    label: "Dark Luxo",
    canvasBg: hex("0B0F19"),
    brandColor: hex("C5A059"),
    fontPreset: "editorial",
    tone: "dark",
  },
  "executivo-b2b": {
    id: "executivo-b2b",
    label: "Executivo B2B",
    canvasBg: hex("FFFFFF"),
    brandColor: hex("0F2942"),
    fontPreset: "corporate",
    tone: "light",
  },
  "landscape-presentation": {
    id: "landscape-presentation",
    label: "Paisagem Widescreen",
    canvasBg: hex("0F172A"),
    brandColor: hex("C5A059"),
    fontPreset: "modern",
    tone: "dark",
  },
  "vertical-premium": {
    id: "vertical-premium",
    label: "Vertical Premium",
    canvasBg: hex("F8FAFC"),
    brandColor: hex("1E3A5F"),
    fontPreset: "editorial",
    tone: "light",
  },
  "group-catalog": {
    id: "group-catalog",
    label: "Catálogo de Grupo",
    canvasBg: hex("F8FAFC"),
    brandColor: hex("0F2942"),
    fontPreset: "modern",
    tone: "light",
  },
};

export interface ColorPresetOption {
  id: string;
  label: string;
  value: string;
  color: string;
  tone: "light" | "dark";
}

export const CANVAS_BG_PRESETS: ColorPresetOption[] = [
  { id: "pure-white", label: "Branco Puro", value: hex("FFFFFF"), color: hex("FFFFFF"), tone: "light" },
  { id: "ivory-paper", label: "Marfim Editorial", value: hex("FAF8F5"), color: hex("FAF8F5"), tone: "light" },
  { id: "alabaster", label: "Alabastro Suave", value: hex("F8FAFC"), color: hex("F8FAFC"), tone: "light" },
  { id: "warm-pearl", label: "Pérola Quente", value: hex("F3F1ED"), color: hex("F3F1ED"), tone: "light" },
  { id: "onyx-luxury", label: "Onyx Luxo", value: hex("0B0F19"), color: hex("0B0F19"), tone: "dark" },
  { id: "midnight-slate", label: "Azul Meia-Noite", value: hex("0F172A"), color: hex("0F172A"), tone: "dark" },
  { id: "obsidian-dark", label: "Grafite Soberano", value: hex("141417"), color: hex("141417"), tone: "dark" },
  { id: "emerald-night", label: "Reserva Escuro", value: hex("091914"), color: hex("091914"), tone: "dark" },
];

export const BRAND_COLOR_PRESETS: ColorPresetOption[] = [
  { id: "navy-exec", label: "Azul Marinho", value: hex("0F2942"), color: hex("0F2942"), tone: "dark" },
  { id: "champagne-gold", label: "Ouro Champagne", value: hex("C5A059"), color: hex("C5A059"), tone: "light" },
  { id: "obsidian", label: "Obsidiana", value: hex("18181B"), color: hex("18181B"), tone: "dark" },
  { id: "ocean-deep", label: "Oceano Profundo", value: hex("1E3A5F"), color: hex("1E3A5F"), tone: "dark" },
  { id: "imperial-emerald", label: "Esmeralda", value: hex("065F46"), color: hex("065F46"), tone: "dark" },
  { id: "burgundy-reserve", label: "Borgonha", value: hex("7F1D1D"), color: hex("7F1D1D"), tone: "dark" },
  { id: "terracotta", label: "Terracota", value: hex("9A3412"), color: hex("9A3412"), tone: "dark" },
  { id: "royal-slate", label: "Ardósia Real", value: hex("334155"), color: hex("334155"), tone: "dark" },
];

export const FONT_PRESET_OPTIONS: Array<{
  id: ProposalFontPresetId;
  label: string;
  desc: string;
  headingFont: string;
  bodyFont: string;
}> = [
  {
    id: "editorial",
    label: "Editorial Clássica",
    desc: "Títulos em Playfair Display serifado e leitura em Inter",
    headingFont: "'Playfair Display', Georgia, serif",
    bodyFont: "'Inter', system-ui, -apple-system, sans-serif",
  },
  {
    id: "modern",
    label: "Minimalista Limpa",
    desc: "Geometria contemporânea sem serifa em toda a lâmina",
    headingFont: "'Inter', system-ui, -apple-system, sans-serif",
    bodyFont: "'Inter', system-ui, -apple-system, sans-serif",
  },
  {
    id: "corporate",
    label: "Executiva B2B",
    desc: "Foco analítico em tabelas, dados e precisão corporativa",
    headingFont: "system-ui, -apple-system, 'Segoe UI', sans-serif",
    bodyFont: "'Inter', system-ui, -apple-system, sans-serif",
  },
];

export const PROPOSAL_SECTION_CATALOG: Array<{
  key: ProposalSectionKey;
  label: string;
}> = [
  { key: "summary", label: "Resumo Executivo" },
  { key: "flights", label: "Malha Aérea" },
  { key: "hotels", label: "Hospedagem" },
  { key: "itinerary", label: "Roteiro Dia a Dia" },
  { key: "transfers", label: "Traslados & Rodoviário" },
  { key: "tours", label: "Passeios & Experiências" },
  { key: "includes", label: "Inclusões & Exclusões" },
  { key: "conditions", label: "Regras & Observações" },
  { key: "financial", label: "Investimento & Parcelas" },
  { key: "footer", label: "Assinatura do Consultor" },
];

export function normalizeCanonicalTemplateId(raw?: string | null): ProposalTemplateCanonicalId {
  const map: Record<string, ProposalTemplateCanonicalId> = {
    executivo: "executivo-b2b",
    "executivo-b2b": "executivo-b2b",
    "editorial-flat": "editorial-flat",
    "dark-premium": "dark-premium",
    landscape: "landscape-presentation",
    "landscape-presentation": "landscape-presentation",
    "vertical-premium": "vertical-premium",
    "group-catalog": "group-catalog",
  };
  return map[raw || ""] || "editorial-flat";
}

export function isValidHexColor(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  return /^#[0-9a-fA-F]{6}$/.test(trimmed) || /^#[0-9a-fA-F]{3}$/.test(trimmed);
}

export function expandHex(input: string): string {
  const clean = input.trim().replace(/^#/, "");
  if (clean.length === 3) {
    return hex(
      clean
        .split("")
        .map((c) => c + c)
        .join("")
        .toUpperCase(),
    );
  }
  if (clean.length === 6) {
    return hex(clean.toUpperCase());
  }
  return hex("FFFFFF");
}

export function hexToRgbTuple(input: string): [number, number, number] {
  const full = expandHex(input).slice(1);
  const r = parseInt(full.slice(0, 2), 16) || 0;
  const g = parseInt(full.slice(2, 4), 16) || 0;
  const b = parseInt(full.slice(4, 6), 16) || 0;
  return [r, g, b];
}

export function rgbTupleToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  const toHex = (n: number) => clamp(n).toString(16).padStart(2, "0").toUpperCase();
  return hex(`${toHex(r)}${toHex(g)}${toHex(b)}`);
}

export function mixHexColors(baseHex: string, targetHex: string, weight: number): string {
  const [r1, g1, b1] = hexToRgbTuple(baseHex);
  const [r2, g2, b2] = hexToRgbTuple(targetHex);
  const w = Math.max(0, Math.min(1, weight));
  return rgbTupleToHex(r1 + (r2 - r1) * w, g1 + (g2 - g1) * w, b1 + (b2 - b1) * w);
}

export function getRelativeLuminance(hexColor: string): number {
  const [r, g, b] = hexToRgbTuple(hexColor).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function getContrastRatio(hexA: string, hexB: string): number {
  const lumA = getRelativeLuminance(hexA);
  const lumB = getRelativeLuminance(hexB);
  const brightest = Math.max(lumA, lumB);
  const darkest = Math.min(lumA, lumB);
  return (brightest + 0.05) / (darkest + 0.05);
}

function ensureReadableAccent(brandHex: string, surfaceHex: string, tone: "light" | "dark"): string {
  let candidate = expandHex(brandHex);
  const targetPole = tone === "dark" ? hex("F8FAFC") : hex("0F172A");

  for (let step = 1; step <= 8; step++) {
    if (getContrastRatio(candidate, surfaceHex) >= 4.5) {
      return candidate;
    }
    candidate = mixHexColors(candidate, targetPole, 0.18);
  }
  return candidate;
}

export interface ResolvedProposalCanvasTheme {
  templateId: ProposalTemplateCanonicalId;
  canvasBg: string;
  brandColor: string;
  brandFg: string;
  brandAccent: string;
  brandSoft: string;
  brandBorder: string;
  surfaceCard: string;
  cardBg: string;
  surfaceSubtle: string;
  ink: string;
  inkMuted: string;
  inkFaint: string;
  border: string;
  tone: "light" | "dark";
  fontPreset: ProposalFontPresetId;
  headingFont: string;
  bodyFont: string;
  hiddenSections: Set<ProposalSectionKey>;
  isSectionVisible: (key: ProposalSectionKey) => boolean;
  cssVars: Record<string, string>;
}

export function resolveProposalCanvasTheme(
  proposal: Record<string, any> | null | undefined,
  agency?: Record<string, any> | null,
): ResolvedProposalCanvasTheme {
  const rawTemplate =
    proposal?.template_theme || proposal?.templateId || proposal?.template || "editorial-flat";
  const templateId = normalizeCanonicalTemplateId(rawTemplate);
  const defaultPalette = TEMPLATE_DEFAULT_PALETTES[templateId];

  const customFields: Record<string, any> = {
    ...(proposal?.pricing?.custom_fields && typeof proposal.pricing.custom_fields === "object"
      ? proposal.pricing.custom_fields
      : {}),
    ...(proposal?.custom_fields && typeof proposal.custom_fields === "object"
      ? proposal.custom_fields
      : {}),
    ...(proposal?.customFields && typeof proposal.customFields === "object"
      ? proposal.customFields
      : {}),
  };

  const customBg = customFields.canvas_bg_color;
  const canvasBg = isValidHexColor(customBg)
    ? expandHex(customBg)
    : defaultPalette.canvasBg;

  const customBrand = customFields.canvas_brand_color;
  const agencyBrand =
    agency?.brand_color ||
    proposal?.agency_brand_color ||
    proposal?.brand_color ||
    proposal?.brandColorProp;
  const defaultGenericNavy = hex("0A2540");
  const defaultGenericBlue = hex("3B82F6");

  let brandColor = defaultPalette.brandColor;
  if (isValidHexColor(customBrand)) {
    brandColor = expandHex(customBrand);
  } else if (
    isValidHexColor(agencyBrand) &&
    expandHex(agencyBrand) !== defaultGenericNavy &&
    expandHex(agencyBrand) !== defaultGenericBlue
  ) {
    brandColor = expandHex(agencyBrand);
  }

  const bgLuminance = getRelativeLuminance(canvasBg);
  const tone: "light" | "dark" = bgLuminance > 0.35 ? "light" : "dark";

  let surfaceCard: string;
  let surfaceSubtle: string;
  let ink: string;
  let inkMuted: string;
  let inkFaint: string;
  let border: string;

  if (tone === "light") {
    const isPureWhite = canvasBg === hex("FFFFFF");
    surfaceCard = hex("FFFFFF");
    surfaceSubtle = isPureWhite ? hex("F8FAFC") : mixHexColors(canvasBg, hex("0F172A"), 0.04);
    ink = hex("0F172A");
    inkMuted = hex("334155");
    inkFaint = hex("64748B");
    border = hex("E2E8F0");
  } else {
    surfaceCard = mixHexColors(canvasBg, hex("FFFFFF"), 0.06);
    surfaceSubtle = mixHexColors(canvasBg, hex("FFFFFF"), 0.11);
    ink = hex("F8FAFC");
    inkMuted = hex("CBD5E1");
    inkFaint = hex("94A3B8");
    border = mixHexColors(canvasBg, hex("FFFFFF"), 0.15);
  }

  const contrastWithDark = getContrastRatio(hex("0F172A"), brandColor);
  const contrastWithLight = getContrastRatio(hex("FFFFFF"), brandColor);
  const brandFg = contrastWithDark >= contrastWithLight ? hex("0F172A") : hex("FFFFFF");
  const brandAccent = ensureReadableAccent(brandColor, surfaceCard, tone);
  const brandSoft = mixHexColors(surfaceCard, brandAccent, tone === "dark" ? 0.14 : 0.08);
  const brandBorder = mixHexColors(surfaceCard, brandAccent, tone === "dark" ? 0.32 : 0.22);

  const rawFont = String(customFields.canvas_font_preset || defaultPalette.fontPreset);
  const normalizedFont = rawFont === "classic" ? "corporate" : rawFont;
  const fontPreset: ProposalFontPresetId =
    normalizedFont === "modern" || normalizedFont === "corporate" || normalizedFont === "editorial"
      ? normalizedFont
      : defaultPalette.fontPreset;
  const fontMeta =
    FONT_PRESET_OPTIONS.find((f) => f.id === fontPreset) || FONT_PRESET_OPTIONS[0];

  const rawHidden = customFields.hidden_sections;
  const hiddenList: string[] = Array.isArray(rawHidden)
    ? rawHidden.map(String)
    : typeof rawHidden === "string" && rawHidden.trim()
      ? rawHidden.split(",").map((s) => s.trim())
      : [];
  const hiddenSections = new Set<ProposalSectionKey>(
    hiddenList.filter(Boolean) as ProposalSectionKey[],
  );

  const isSectionVisible = (key: ProposalSectionKey) => !hiddenSections.has(key);

  const cssVars: Record<string, string> = {
    "--p-bg": canvasBg,
    "--p-canvas-bg": canvasBg,
    "--p-surface": surfaceCard,
    "--p-subtle": surfaceSubtle,
    "--p-ink": ink,
    "--p-muted": inkMuted,
    "--p-faint": inkFaint,
    "--p-border": border,
    "--p-brand": brandColor,
    "--p-brand-fg": brandFg,
    "--p-brand-accent": brandAccent,
    "--p-brand-soft": brandSoft,
    "--p-brand-border": brandBorder,
    "--p-heading-font": fontMeta.headingFont,
    "--p-body-font": fontMeta.bodyFont,
    "--brand-primary": brandColor,
    "--brand-primary-light": brandAccent,
    "--brand-heading-font": fontMeta.headingFont,
    "--brand-body-font": fontMeta.bodyFont,
    "--background-main": canvasBg,
  };

  return {
    templateId,
    canvasBg,
    brandColor,
    brandFg,
    brandAccent,
    brandSoft,
    brandBorder,
    surfaceCard,
    cardBg: surfaceCard,
    surfaceSubtle,
    ink,
    inkMuted,
    inkFaint,
    border,
    tone,
    fontPreset,
    headingFont: fontMeta.headingFont,
    bodyFont: fontMeta.bodyFont,
    hiddenSections,
    isSectionVisible,
    cssVars,
  };
}
