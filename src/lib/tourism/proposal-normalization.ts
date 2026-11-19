/**
 * proposal-normalization.ts — Camada Canônica de Normalização de Propostas,
 * Mídia Rica (Imagens/Vídeos + Crop por Item), Transfers Nomeados, Tours e Páginas Web.
 *
 * Centraliza a eliminação de conflitos entre hotéis de um mesmo pacote e opções comparativas (D1/D2),
 * preserva múltiplos transfers com nomes reais (D3), estrutura passeios (D4),
 * normaliza galerias multi-mídia sem fallbacks sintéticos (B.33 / D5) e hidrata páginas web editáveis (R5).
 */

export type ProposalMediaAspectPreset =
  | "auto"
  | "16:9"
  | "4:3"
  | "1:1"
  | "4:5"
  | "9:16"
  | "21:9"
  | "free";

export interface ProposalMediaItem {
  id: string;
  url: string;
  type: "image" | "video";
  caption?: string;
  aspectPreset?: ProposalMediaAspectPreset;
  objectPosition?: string;
  scale?: number;
  image_scale?: number;
  crop_x?: number;
  crop_y?: number;
  crop_width?: number;
  crop_height?: number;
  fit?: "cover" | "contain";
  posterUrl?: string;
  video_poster_url?: string;
  slot_role?: "hero_primary" | "hero_secondary" | "hero_tertiary" | "gallery";
  order?: number;
}

export type ProposalTransferKind =
  | "arrival"
  | "departure"
  | "round_trip"
  | "intercity"
  | "service"
  | "bus";

export type ProposalWebPageHeroLayout =
  | "split"
  | "immersive"
  | "minimal"
  | "gallery"
  | "gallery_mosaic_3"
  | "gallery_bento_4";

export type ProposalWebPageBlockType =
  | "hero"
  | "gallery"
  | "summary"
  | "flights"
  | "flight_route_map"
  | "hotels"
  | "itinerary"
  | "transfers"
  | "cruises"
  | "tours"
  | "includes"
  | "conditions"
  | "pricing"
  | "video"
  | "custom_text"
  | "faq"
  | "urgency_banner"
  | "promo_banner"
  | "related_packages"
  | "simulation_disclaimer"
  | "cta";

export interface ProposalWebPageFaqItem {
  id?: string;
  question: string;
  answer: string;
}

export interface ProposalWebCountdownConfig {
  enabled: boolean;
  mode?: "proposal_valid_until" | "custom";
  custom_ends_at?: string | null;
  label?: string | null;
}

export interface ProposalWebAvailabilityConfig {
  enabled: boolean;
  spots_remaining?: number | null;
  label?: string | null;
}

export interface ProposalWebPaymentDisplayConfig {
  show_pix?: boolean;
  pix_discount_percent?: number | null;
  show_card?: boolean;
  max_installments?: number | null;
  interest_free?: boolean;
  show_boleto?: boolean;
  boleto_due_days?: number | null;
  show_financing?: boolean;
  financing_notes?: string | null;
  show_installment_simulator?: boolean;
}

export interface ProposalWebTrustBadgesConfig {
  agency_verified?: boolean;
  free_rebooking?: boolean;
  support_24h?: boolean;
  secure_payment?: boolean;
  cadastur_badge?: boolean;
  custom_items?: string[];
}

export interface ProposalWebPageBlock {
  id: string;
  type: ProposalWebPageBlockType;
  title?: string;
  subtitle?: string;
  body?: string;
  visible: boolean;
  order: number;
  media?: ProposalMediaItem[];
  layout?: "default" | "grid" | "carousel" | "split" | "minimal";
  ctaLabel?: string;
  faqItems?: ProposalWebPageFaqItem[];
}

export interface ProposalWebPageDTO {
  id?: string;
  proposal_id?: string;
  store_id?: string | null;
  slug?: string | null;
  headline?: string | null;
  subheadline?: string | null;
  theme_preset?: "editorial" | "modern" | "dark" | "boutique";
  accent_color?: string | null;
  hero_layout?: ProposalWebPageHeroLayout;
  hero_media: ProposalMediaItem[];
  blocks: ProposalWebPageBlock[];
  show_option_tabs?: boolean;
  cta_label?: string | null;
  is_published: boolean;
  seo_title?: string | null;
  seo_description?: string | null;
  countdown_config?: ProposalWebCountdownConfig;
  availability_config?: ProposalWebAvailabilityConfig;
  payment_display_config?: ProposalWebPaymentDisplayConfig;
  trust_badges_config?: ProposalWebTrustBadgesConfig;
  show_flight_route_map?: boolean;
  sticky_card_enabled?: boolean;
  ai_advisor_enabled?: boolean;
  ai_advisor_prompt?: string | null;
  whatsapp_button_enabled?: boolean;
  whatsapp_phone?: string | null;
  allow_online_gateway_payment?: boolean;
  payment_gateway_url?: string | null;
  show_simulation_disclaimer?: boolean;
  simulation_disclaimer_text?: string | null;
  show_related_packages?: boolean;
  related_packages_title?: string | null;
  promo_banner_url?: string | null;
  promo_banner_link?: string | null;
  updated_at?: string | null;
}

const VIDEO_URL_RE = /\.(mp4|webm|mov|m4v|ogv)(?:[?#].*)?$/i;
const YOUTUBE_URL_RE = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/i;
const VIMEO_URL_RE = /vimeo\.com\/(?:video\/)?(\d{5,})/i;

export function isValidProposalMediaUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith("blob:") || trimmed.startsWith("data:")) return false;
  return trimmed.startsWith("https://") || trimmed.startsWith("http://") || trimmed.startsWith("/");
}

export function isVideoMediaUrl(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  return (
    VIDEO_URL_RE.test(trimmed) ||
    YOUTUBE_URL_RE.test(trimmed) ||
    VIMEO_URL_RE.test(trimmed) ||
    trimmed.includes("/video/") ||
    trimmed.includes("mime=video")
  );
}

export function isExternalVideoEmbedUrl(value: unknown): boolean {
  if (typeof value !== "string") return false;
  return YOUTUBE_URL_RE.test(value) || VIMEO_URL_RE.test(value);
}

export function resolveExternalVideoEmbedSrc(url: string): string | null {
  const ytMatch = url.match(YOUTUBE_URL_RE);
  if (ytMatch?.[1]) {
    return `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?rel=0`;
  }
  const vimeoMatch = url.match(VIMEO_URL_RE);
  if (vimeoMatch?.[1]) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }
  return null;
}

export function normalizeAspectPreset(raw: unknown): ProposalMediaAspectPreset {
  const clean = String(raw || "").trim();
  const allowed: ProposalMediaAspectPreset[] = ["auto", "16:9", "4:3", "1:1", "4:5", "9:16", "21:9", "free"];
  return allowed.includes(clean as ProposalMediaAspectPreset)
    ? (clean as ProposalMediaAspectPreset)
    : "auto";
}

export function resolveHeroSlotAspectPreset(
  heroLayout: ProposalWebPageHeroLayout | string | undefined,
  slotIndex: number,
): { preset: ProposalMediaAspectPreset; slotRole: NonNullable<ProposalMediaItem["slot_role"]>; label: string } {
  switch (heroLayout) {
    case "immersive":
      return {
        preset: slotIndex === 0 ? "21:9" : "16:9",
        slotRole: slotIndex === 0 ? "hero_primary" : "gallery",
        label: slotIndex === 0 ? "Banner Imersivo (21:9)" : "Galeria (16:9)",
      };
    case "gallery_mosaic_3":
      if (slotIndex === 0) return { preset: "16:9", slotRole: "hero_primary", label: "Capa Principal (16:9)" };
      if (slotIndex === 1) return { preset: "4:3", slotRole: "hero_secondary", label: "Mosaico Superior (4:3)" };
      return { preset: "4:3", slotRole: "hero_tertiary", label: "Mosaico Inferior (4:3)" };
    case "gallery_bento_4":
      if (slotIndex === 0) return { preset: "4:3", slotRole: "hero_primary", label: "Bento Principal (4:3)" };
      if (slotIndex <= 3) return { preset: "1:1", slotRole: "hero_secondary", label: "Card Bento (1:1)" };
      return { preset: "1:1", slotRole: "gallery", label: "Galeria Bento (1:1)" };
    case "gallery":
      return {
        preset: slotIndex === 0 ? "16:9" : "4:3",
        slotRole: slotIndex === 0 ? "hero_primary" : "gallery",
        label: slotIndex === 0 ? "Destaque Galeria (16:9)" : "Item Galeria (4:3)",
      };
    case "minimal":
      return { preset: "4:3", slotRole: slotIndex === 0 ? "hero_primary" : "gallery", label: "Minimal (4:3)" };
    case "split":
    default:
      return {
        preset: slotIndex === 0 ? "16:9" : "4:3",
        slotRole: slotIndex === 0 ? "hero_primary" : "gallery",
        label: slotIndex === 0 ? "Capa Dividida (16:9)" : "Slide Secundário (4:3)",
      };
  }
}

export function aspectPresetToTailwindClass(preset?: ProposalMediaAspectPreset): string {
  switch (preset) {
    case "1:1":
      return "aspect-square";
    case "16:9":
      return "aspect-video";
    default:
      return "";
  }
}

export function aspectPresetToCssValue(preset?: ProposalMediaAspectPreset): string | undefined {
  switch (preset) {
    case "16:9":
      return "16 / 9";
    case "4:3":
      return "4 / 3";
    case "1:1":
      return "1 / 1";
    case "4:5":
      return "4 / 5";
    case "9:16":
      return "9 / 16";
    case "21:9":
      return "21 / 9";
    case "free":
    case "auto":
    default:
      return undefined;
  }
}

export function normalizeEntityMediaList(raw: {
  media?: unknown;
  featured_image_url?: string | null;
  image_url?: string | null;
  images?: unknown;
  video_url?: string | null;
  object_position?: string | null;
  image_scale?: number | null;
}): ProposalMediaItem[] {
  const result: ProposalMediaItem[] = [];
  const seenUrls = new Set<string>();
  const defaultObjPos =
    typeof raw.object_position === "string" && raw.object_position.trim()
      ? raw.object_position.trim()
      : "50% 50%";
  const defaultScale =
    typeof raw.image_scale === "number" && Number.isFinite(raw.image_scale)
      ? Math.max(1, Math.min(2.5, raw.image_scale))
      : 1;

  const pushItem = (item: Partial<ProposalMediaItem> & { url?: unknown }) => {
    if (!isValidProposalMediaUrl(item.url)) return;
    const cleanUrl = item.url.trim();
    if (seenUrls.has(cleanUrl)) return;
    seenUrls.add(cleanUrl);

    const detectedType: "image" | "video" =
      item.type === "video" || isVideoMediaUrl(cleanUrl) ? "video" : "image";

    const resolvedScale =
      typeof item.image_scale === "number" && Number.isFinite(item.image_scale)
        ? Math.max(0.8, Math.min(3, item.image_scale))
        : typeof item.scale === "number" && Number.isFinite(item.scale)
          ? Math.max(0.8, Math.min(3, item.scale))
          : defaultScale;
    const resolvedPoster = isValidProposalMediaUrl(item.video_poster_url)
      ? item.video_poster_url.trim()
      : isValidProposalMediaUrl(item.posterUrl)
        ? item.posterUrl.trim()
        : undefined;

    result.push({
      id: typeof item.id === "string" && item.id.trim() ? item.id.trim() : `med-${result.length + 1}`,
      url: cleanUrl,
      type: detectedType,
      caption: typeof item.caption === "string" && item.caption.trim() ? item.caption.trim() : undefined,
      aspectPreset: normalizeAspectPreset(item.aspectPreset),
      objectPosition:
        typeof item.objectPosition === "string" && item.objectPosition.trim()
          ? item.objectPosition.trim()
          : defaultObjPos,
      scale: resolvedScale,
      image_scale: resolvedScale,
      ...(typeof item.crop_x === "number" && Number.isFinite(item.crop_x) ? { crop_x: Math.round(item.crop_x) } : {}),
      ...(typeof item.crop_y === "number" && Number.isFinite(item.crop_y) ? { crop_y: Math.round(item.crop_y) } : {}),
      ...(typeof item.crop_width === "number" && Number.isFinite(item.crop_width) && item.crop_width > 0
        ? { crop_width: Math.round(item.crop_width) }
        : {}),
      ...(typeof item.crop_height === "number" && Number.isFinite(item.crop_height) && item.crop_height > 0
        ? { crop_height: Math.round(item.crop_height) }
        : {}),
      fit: item.fit === "contain" ? "contain" : "cover",
      posterUrl: resolvedPoster,
      ...(resolvedPoster ? { video_poster_url: resolvedPoster } : {}),
      ...(item.slot_role ? { slot_role: item.slot_role } : {}),
      order: typeof item.order === "number" && Number.isFinite(item.order) ? item.order : result.length,
    });
  };

  if (Array.isArray(raw.media)) {
    for (const entry of raw.media) {
      if (typeof entry === "string") {
        pushItem({ url: entry });
      } else if (entry && typeof entry === "object") {
        pushItem(entry as Partial<ProposalMediaItem>);
      }
    }
  }

  pushItem({ url: raw.featured_image_url || undefined });
  pushItem({ url: raw.image_url || undefined });

  if (Array.isArray(raw.images)) {
    for (const img of raw.images) {
      if (typeof img === "string") pushItem({ url: img });
      else if (img && typeof img === "object") pushItem(img as Partial<ProposalMediaItem>);
    }
  }

  if (isValidProposalMediaUrl(raw.video_url)) {
    pushItem({ url: raw.video_url, type: "video" });
  }

  return result;
}

export function extractImageUrlsFromMedia(items: ProposalMediaItem[]): string[] {
  return items.filter((item) => item.type === "image").map((item) => item.url);
}

// ─── Normalização de Transfers (D3) ────────────────────────────────────────────

const GENERIC_TRANSFER_TOKENS = new Set([
  "in_out",
  "in/out",
  "transfer",
  "private",
  "shared",
  "regular",
  "privativo",
  "compartilhado",
]);

export function resolveTransferKind(rawType?: unknown, rawTitle?: unknown): ProposalTransferKind {
  const titleText = String(rawTitle || "").toLowerCase();
  const typeText = String(rawType || "").toLowerCase();
  const combined = `${typeText} ${titleText}`;
  if (/rodovi[aá]rio|[oô]nibus|leito\s*dd|semi-leito|\bbus\b/.test(combined)) return "bus";
  if (/cadeirinha|beb[eê]\s*conforto|servi[cç]o\s*adicional|assento|bagagem\s*extra|taxa|service/.test(combined)) {
    return "service";
  }
  if (/fortaleza.*jericoacoara|jericoacoara.*fortaleza|intermunicipal|intercity|\bx\b.*entre/.test(combined)) {
    return "intercity";
  }
  const hasIdaEVolta = /ida\s*e\s*volta|round[_\s-]*trip|aeroporto.*hotel.*aeroporto/.test(titleText);
  if (!hasIdaEVolta && (/\(ida\)|\bchegada\b|\barrival\b|aeroporto\s*[->→]+\s*hotel/.test(titleText))) {
    return "arrival";
  }
  if (!hasIdaEVolta && (/\(volta\)|\bpartid|\bsa[ií]da\b|\bdeparture\b|\bretorno\b|hotel\s*[->→]+\s*aeroporto/.test(titleText))) {
    return "departure";
  }
  if (/in[_\s/+]*out|ida\s*e\s*volta|round[_\s-]*trip|aeroporto.*hotel.*aeroporto/.test(combined)) {
    return "round_trip";
  }
  if (/chegada|arrival|\bin\b|aeroporto\s*[->→]+\s*hotel/.test(combined)) return "arrival";
  if (/partid|sa[ií]da|departure|\bout\b|hotel\s*[->→]+\s*aeroporto/.test(combined)) return "departure";
  return "round_trip";
}

export function resolveTransferKindBadge(kind?: ProposalTransferKind | string): string {
  switch (kind) {
    case "arrival":
      return "Chegada (In)";
    case "departure":
      return "Retorno (Out)";
    case "round_trip":
      return "Ida e Volta";
    case "intercity":
      return "Intermunicipal";
    case "service":
      return "Serviço Adicional";
    case "bus":
      return "Rodoviário";
    default:
      return "Ida e Volta";
  }
}

export function resolveTransferDisplayTitle(t: Record<string, any> | null | undefined, index = 0): string {
  if (!t || typeof t !== "object") return `Transfer ${index + 1}`;
  const candidates = [t.name, t.title, t.route_name, t.route, t.description];
  for (const cand of candidates) {
    if (typeof cand !== "string") continue;
    const clean = cand.trim();
    if (!clean) continue;
    if (GENERIC_TRANSFER_TOKENS.has(clean.toLowerCase())) continue;
    return clean;
  }
  const typeStr = typeof t.type === "string" ? t.type.trim() : "";
  if (typeStr && !GENERIC_TRANSFER_TOKENS.has(typeStr.toLowerCase())) {
    return typeStr;
  }
  const vehicleStr = typeof t.vehicle_type === "string" && !GENERIC_TRANSFER_TOKENS.has(t.vehicle_type.trim().toLowerCase())
    ? t.vehicle_type.trim()
    : typeof t.vehicle === "string" && !GENERIC_TRANSFER_TOKENS.has(t.vehicle.trim().toLowerCase())
      ? t.vehicle.trim()
      : "";
  if (vehicleStr) return `Transfer (${vehicleStr})`;
  return "Transfer Aeroporto ↔ Hotel";
}

export function normalizeTransferItem<T extends Record<string, any>>(
  raw: T | string,
  index = 0,
): Record<string, any> {
  const obj: Record<string, any> =
    typeof raw === "string" ? { route_name: raw, name: raw } : { ...(raw || {}) };
  const title = resolveTransferDisplayTitle(obj, index);
  const kind = obj.kind
    ? (obj.kind as ProposalTransferKind)
    : resolveTransferKind(obj.type, `${title} ${obj.notes || ""}`);
  const vehicle =
    (typeof obj.vehicle_type === "string" && obj.vehicle_type.trim()) ||
    (typeof obj.vehicle === "string" && obj.vehicle.trim()) ||
    (kind === "bus" ? "Ônibus Executivo" : /4x4/i.test(title) ? "Veículo 4x4" : "Transfer Regular");
  const isPrivate =
    typeof obj.is_private === "boolean"
      ? obj.is_private
      : /privativ|exclusiv|vip|executivo/i.test(`${title} ${vehicle} ${obj.type || ""}`);
  const rawType = typeof obj.type === "string" ? obj.type.trim() : "";
  const canonicalType =
    !rawType || rawType.toLowerCase() === "in_out"
      ? resolveTransferKindBadge(kind)
      : rawType;
  const priceCents =
    typeof obj.price_cents === "number" && Number.isFinite(obj.price_cents)
      ? Math.max(0, Math.round(obj.price_cents))
      : undefined;

  return {
    ...obj,
    id: typeof obj.id === "string" && obj.id.trim() ? obj.id.trim() : `tr-${index + 1}`,
    name: title,
    title,
    kind,
    type: canonicalType,
    route: (typeof obj.route === "string" && obj.route.trim()) || title,
    route_name: (typeof obj.route_name === "string" && obj.route_name.trim()) || title,
    description: (typeof obj.description === "string" && obj.description.trim()) || title,
    vehicle,
    vehicle_type: vehicle,
    is_private: isPrivate,
    included: typeof obj.included === "boolean" ? obj.included : typeof obj.is_included === "boolean" ? obj.is_included : true,
    is_included: typeof obj.is_included === "boolean" ? obj.is_included : typeof obj.included === "boolean" ? obj.included : true,
    quantity:
      typeof obj.quantity === "number" && Number.isFinite(obj.quantity) && obj.quantity > 1
        ? Math.round(obj.quantity)
        : 1,
    ...(typeof obj.notes === "string" && obj.notes.trim() ? { notes: obj.notes.trim() } : {}),
    image_url: typeof obj.image_url === "string" && obj.image_url.trim() ? obj.image_url.trim() : null,
    meeting_point: typeof obj.meeting_point === "string" && obj.meeting_point.trim() ? obj.meeting_point.trim() : null,
    luggage_notes: typeof obj.luggage_notes === "string" && obj.luggage_notes.trim() ? obj.luggage_notes.trim() : null,
    ...(priceCents !== undefined ? { price_cents: priceCents } : {}),
  };
}

const TRANSFER_STAGE_RANK: Record<ProposalTransferKind, number> = {
  arrival: 10,
  intercity: 20,
  bus: 25,
  round_trip: 30,
  service: 35,
  departure: 40,
};

function normalizeTransferDateSortKey(raw?: unknown): string {
  if (typeof raw !== "string") return "9999-99-99";
  const trimmed = raw.trim();
  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const br = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  return "9999-99-99";
}

function normalizeTransferTimeSortKey(raw?: unknown): string {
  if (typeof raw !== "string") return "99:99";
  const m = raw.trim().match(/(\d{1,2})[:h](\d{2})/i);
  if (!m) return "99:99";
  return `${m[1].padStart(2, "0")}:${m[2]}`;
}

export function sortTransfersChronologically<T extends Record<string, any>>(items: T[]): T[] {
  return items
    .map((item, idx) => ({ item, idx }))
    .sort((a, b) => {
      const aOrderRaw = a.item.sort_order ?? a.item.order;
      const bOrderRaw = b.item.sort_order ?? b.item.order;
      const aHasOrder = typeof aOrderRaw === "number" && Number.isFinite(aOrderRaw);
      const bHasOrder = typeof bOrderRaw === "number" && Number.isFinite(bOrderRaw);
      if (aHasOrder && bHasOrder && aOrderRaw !== bOrderRaw) {
        return aOrderRaw - bOrderRaw;
      }
      if (aHasOrder !== bHasOrder) {
        return aHasOrder ? -1 : 1;
      }

      const aDate = normalizeTransferDateSortKey(a.item.date);
      const bDate = normalizeTransferDateSortKey(b.item.date);
      if (aDate !== bDate) {
        return aDate < bDate ? -1 : 1;
      }

      const aTime = normalizeTransferTimeSortKey(a.item.pickup_time);
      const bTime = normalizeTransferTimeSortKey(b.item.pickup_time);
      if (aTime !== bTime) {
        return aTime < bTime ? -1 : 1;
      }

      const aRank = TRANSFER_STAGE_RANK[(a.item.kind as ProposalTransferKind) || "round_trip"] ?? 30;
      const bRank = TRANSFER_STAGE_RANK[(b.item.kind as ProposalTransferKind) || "round_trip"] ?? 30;
      if (aRank !== bRank) {
        return aRank - bRank;
      }

      return a.idx - b.idx;
    })
    .map((entry, seqIdx) => ({
      ...entry.item,
      sequence_number: seqIdx + 1,
    }));
}

export function normalizeTransfersList(rawTransfers: unknown): Array<Record<string, any>> {
  if (!Array.isArray(rawTransfers)) return [];
  const normalized = rawTransfers
    .filter((item) => Boolean(item))
    .map((item, idx) => normalizeTransferItem(item as Record<string, any> | string, idx));
  return sortTransfersChronologically(normalized);
}

// ─── Normalização de Passeios / Tours (D4) ────────────────────────────────────

export function normalizeToursList(rawTours: unknown): Array<Record<string, any>> {
  if (!Array.isArray(rawTours)) return [];
  return rawTours
    .filter((item) => Boolean(item))
    .map((item, idx) => {
      if (typeof item === "string") {
        const title = item.trim() || `Passeio ${idx + 1}`;
        return {
          id: `tour-${idx + 1}`,
          title,
          description: "",
          included: true,
          is_included: true,
          images: [],
          media: [],
        };
      }
      const obj = { ...(item as Record<string, any>) };
      const title =
        (typeof obj.title === "string" && obj.title.trim()) ||
        (typeof obj.name === "string" && obj.name.trim()) ||
        (typeof obj.description === "string" && obj.description.trim()) ||
        `Passeio ${idx + 1}`;
      const media = normalizeEntityMediaList({
        media: obj.media,
        image_url: obj.image_url,
        images: obj.images,
        video_url: obj.video_url,
        object_position: obj.object_position,
        image_scale: obj.image_scale,
      });
      const imageUrls = extractImageUrlsFromMedia(media);
      return {
        ...obj,
        id: typeof obj.id === "string" && obj.id.trim() ? obj.id.trim() : `tour-${idx + 1}`,
        title,
        description: typeof obj.description === "string" ? obj.description : "",
        included: typeof obj.included === "boolean" ? obj.included : typeof obj.is_included === "boolean" ? obj.is_included : true,
        is_included: typeof obj.is_included === "boolean" ? obj.is_included : typeof obj.included === "boolean" ? obj.included : true,
        media,
        images: imageUrls,
        image_url: imageUrls[0] || obj.image_url || undefined,
      };
    });
}

// ─── Normalização de Cruzeiros Marítimos & Itinerário Náutico (MSC / Costa) ──

export function normalizeCruiseItem(item: Record<string, any> | string, index = 0): Record<string, any> {
  if (typeof item === "string") {
    const shipName = item.trim() || `Cruzeiro ${index + 1}`;
    return {
      id: `cruise-${index + 1}`,
      ship_name: shipName,
      company: "MSC Cruzeiros",
      departure_port: "Santos (São Paulo)",
      itinerary: [],
      included: true,
      is_included: true,
    };
  }
  const obj = { ...item };
  const shipName =
    (typeof obj.ship_name === "string" && obj.ship_name.trim()) ||
    (typeof obj.name === "string" && obj.name.trim()) ||
    `Cruzeiro ${index + 1}`;
  const rawItinerary = Array.isArray(obj.itinerary) ? obj.itinerary : [];
  const normalizedItinerary = rawItinerary.map((it: any, iIdx: number) => ({
    day: Number(it.day || iIdx + 1),
    date: typeof it.date === "string" ? it.date.trim() : undefined,
    port:
      (typeof it.port === "string" && it.port.trim()) ||
      (it.is_sea_day ? "Em navegação" : `Escala ${iIdx + 1}`),
    is_sea_day: Boolean(it.is_sea_day || /navega|mar|sea/i.test(String(it.port || ""))),
    arrival_time: typeof it.arrival_time === "string" ? it.arrival_time.trim() : "-",
    departure_time: typeof it.departure_time === "string" ? it.departure_time.trim() : "-",
    activity_type:
      it.activity_type ||
      (it.is_sea_day
        ? "sea"
        : iIdx === 0
          ? "boarding"
          : iIdx === rawItinerary.length - 1
            ? "disembark"
            : "dock"),
    notes: typeof it.notes === "string" ? it.notes.trim() : undefined,
  }));

  return {
    ...obj,
    id: typeof obj.id === "string" && obj.id.trim() ? obj.id.trim() : `cruise-${index + 1}`,
    ship_name: shipName,
    company: (typeof obj.company === "string" && obj.company.trim()) || "MSC Cruzeiros",
    cabin_category:
      (typeof obj.cabin_category === "string" && obj.cabin_category.trim()) ||
      "Cabine Externa com Varanda",
    departure_port:
      (typeof obj.departure_port === "string" && obj.departure_port.trim()) ||
      (normalizedItinerary[0]?.port || "Santos (São Paulo)"),
    arrival_port:
      (typeof obj.arrival_port === "string" && obj.arrival_port.trim()) ||
      (normalizedItinerary[normalizedItinerary.length - 1]?.port ||
        obj.departure_port ||
        "Santos (São Paulo)"),
    duration_nights:
      typeof obj.duration_nights === "number"
        ? obj.duration_nights
        : Math.max(1, (normalizedItinerary.length || 4) - 1),
    board_basis: (typeof obj.board_basis === "string" && obj.board_basis.trim()) || "Pensão Completa",
    image_url: typeof obj.image_url === "string" && obj.image_url.trim() ? obj.image_url.trim() : null,
    itinerary: normalizedItinerary,
    included:
      typeof obj.included === "boolean"
        ? obj.included
        : typeof obj.is_included === "boolean"
          ? obj.is_included
          : true,
    is_included:
      typeof obj.is_included === "boolean"
        ? obj.is_included
        : typeof obj.included === "boolean"
          ? obj.included
          : true,
    price_cents:
      typeof obj.price_cents === "number" ? Math.max(0, Math.round(obj.price_cents)) : undefined,
    port_fees_cents:
      typeof obj.port_fees_cents === "number"
        ? Math.max(0, Math.round(obj.port_fees_cents))
        : undefined,
  };
}

export function normalizeCruisesList(rawCruises: unknown): Array<Record<string, any>> {
  if (!Array.isArray(rawCruises)) return [];
  return rawCruises.filter(Boolean).map((item, idx) => normalizeCruiseItem(item, idx));
}

// ─── Normalização de Hotéis & Separação de Opções (D1 / D2) ───────────────────

function normalizeHotelKey(h: Record<string, any>): string {
  const name = String(h.hotel_name || h.name || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
  const ci = String(h.checkin_date || h.check_in || h.checkin || "").slice(0, 10);
  const co = String(h.checkout_date || h.check_out || h.checkout || "").slice(0, 10);
  return `${name}::${ci}::${co}`;
}

export function normalizeHotelsList(rawHotels: unknown): Array<Record<string, any>> {
  if (!Array.isArray(rawHotels)) return [];
  const deduped = new Map<string, Record<string, any>>();

  for (let i = 0; i < rawHotels.length; i++) {
    const raw = rawHotels[i];
    if (!raw || typeof raw !== "object") continue;
    const h = { ...(raw as Record<string, any>) };
    const hotelName = String(h.hotel_name || h.name || "").trim();
    if (!hotelName) continue;

    const media = normalizeEntityMediaList({
      media: h.media,
      featured_image_url: h.featured_image_url,
      image_url: h.image_url,
      images: h.images,
      video_url: h.video_url,
      object_position: h.object_position,
      image_scale: h.image_scale,
    });
    const imageUrls = extractImageUrlsFromMedia(media);

    const normalized: Record<string, any> = {
      ...h,
      id: typeof h.id === "string" && h.id.trim() ? h.id.trim() : `hotel-${i + 1}`,
      hotel_name: hotelName,
      name: hotelName,
      checkin_date: h.checkin_date || h.check_in || h.checkin || undefined,
      checkout_date: h.checkout_date || h.check_out || h.checkout || undefined,
      check_in: h.check_in || h.checkin_date || h.checkin || undefined,
      check_out: h.check_out || h.checkout_date || h.checkout || undefined,
      media,
      images: imageUrls,
      image_url: imageUrls[0] || undefined,
      featured_image_url: imageUrls[0] || undefined,
    };

    const key = normalizeHotelKey(normalized);
    const ci = String(normalized.checkin_date || "");
    const co = String(normalized.checkout_date || "");
    const cleanNameKey = normalized.hotel_name.toLowerCase().replace(/\s+/g, " ").trim();

    let matchKey = key;
    if (!deduped.has(matchKey)) {
      if (!ci && !co) {
        // Se o registro duplicado veio sem datas (comum em options[].hotels legadas), mescla no hotel existente com mesmo nome
        for (const [existingKey] of deduped.entries()) {
          if (existingKey.startsWith(`${cleanNameKey}::`)) {
            matchKey = existingKey;
            break;
          }
        }
      } else {
        // Se havia uma entrada sem datas antes, promove para a entrada datada
        const datelessKey = `${cleanNameKey}::::`;
        if (deduped.has(datelessKey)) {
          const prevDateless = deduped.get(datelessKey)!;
          deduped.delete(datelessKey);
          deduped.set(matchKey, prevDateless);
        }
      }
    }

    const existing = deduped.get(matchKey);
    if (!existing) {
      deduped.set(matchKey, normalized);
    } else {
      // Mescla mídias e campos ausentes de duplicatas exatas (mesmo hotel + mesmas datas)
      const mergedMedia = normalizeEntityMediaList({
        media: [...(existing.media || []), ...media],
        images: [...(existing.images || []), ...imageUrls],
      });
      const mergedUrls = extractImageUrlsFromMedia(mergedMedia);
      deduped.set(matchKey, {
        ...normalized,
        ...existing,
        checkin_date: existing.checkin_date || normalized.checkin_date,
        checkout_date: existing.checkout_date || normalized.checkout_date,
        check_in: existing.check_in || normalized.check_in,
        check_out: existing.check_out || normalized.check_out,
        stars: existing.stars ?? normalized.stars,
        room_type: existing.room_type || normalized.room_type,
        board_basis: existing.board_basis || normalized.board_basis,
        address: existing.address || normalized.address,
        amenities:
          Array.isArray(existing.amenities) && existing.amenities.length > 0
            ? existing.amenities
            : normalized.amenities,
        media: mergedMedia,
        images: mergedUrls,
        image_url: mergedUrls[0] || existing.image_url || normalized.image_url,
        featured_image_url: mergedUrls[0] || existing.featured_image_url || normalized.featured_image_url,
      });
    }
  }

  return Array.from(deduped.values());
}

function getOptionTotalCents(opt: Record<string, any>): number {
  const p = opt?.pricing || {};
  return Number(p.total_price_cents ?? p.total_cents ?? p.base_price_cents ?? 0) || 0;
}

/**
 * Detecta quando `options[]` foi criado por erro mapeando hotéis do MESMO pacote
 * (todos com o mesmo preço total, sem `source_proposal_id` e espelhando os hotéis sequenciais).
 */
export function hasAccidentalHotelAsOptionDuplication(
  rawOptions: unknown,
  rawHotels: unknown,
): boolean {
  if (!Array.isArray(rawOptions) || rawOptions.length <= 1) return false;
  const options = rawOptions.filter((o): o is Record<string, any> => Boolean(o && typeof o === "object"));
  if (options.length <= 1) return false;

  // Se alguma opção veio de vinculação real (`source_proposal_id` / quote bundled), preservar sempre
  const hasExplicitBundledSource = options.some(
    (o) => typeof (o as any).source_proposal_id === "string" && (o as any).source_proposal_id.trim(),
  );
  if (hasExplicitBundledSource) return false;

  const prices = options.map(getOptionTotalCents);
  const firstPrice = prices[0] || 0;
  const allSamePrice =
    firstPrice > 0 && prices.every((p) => Math.abs(p - firstPrice) <= 100);

  if (!allSamePrice) {
    return false;
  }

  // Checa se nomes são padrão automático "Opção X — Nome do Hotel" ou se repetem o mesmo hotel
  const allAutoPrefixed = options.every((o) =>
    /^op[cç][aã]o\s*\d+\s*[—–-]/i.test(String(o.name || "")),
  );
  const optionHotelNames = options
    .map((o) =>
      String(o.hotel_name || o.hotels?.[0]?.hotel_name || "")
        .toLowerCase()
        .trim(),
    )
    .filter(Boolean);
  const topHotelNames = Array.isArray(rawHotels)
    ? rawHotels
        .map((h: any) => String(h?.hotel_name || h?.name || "").toLowerCase().trim())
        .filter(Boolean)
    : [];

  const duplicatesSameHotelInOptions =
    optionHotelNames.length >= 2 && new Set(optionHotelNames).size < optionHotelNames.length;
  const mirrorsSameMultiHotelPackage =
    topHotelNames.length >= 2 &&
    optionHotelNames.length === topHotelNames.length &&
    optionHotelNames.every((name, idx) => name === topHotelNames[idx]);

  return Boolean(allAutoPrefixed && (duplicatesSameHotelInOptions || mirrorsSameMultiHotelPackage || optionHotelNames.length >= 2));
}

export function normalizeProposalOptionsAndHotels<
  H extends Record<string, any>,
  O extends Record<string, any>,
>(rawHotels: H[], rawOptions?: O[]): {
  hotels: Record<string, any>[];
  options: Record<string, any>[];
  collapsedAccidentalHotelOptions: boolean;
} {
  const safeHotels = Array.isArray(rawHotels) ? rawHotels : [];
  const safeOptions = Array.isArray(rawOptions) ? rawOptions : [];

  if (safeOptions.length === 0) {
    return {
      hotels: normalizeHotelsList(safeHotels),
      options: [],
      collapsedAccidentalHotelOptions: false,
    };
  }

  if (safeOptions.length === 1) {
    const normalizedSingle = safeOptions.map((opt) => ({
      ...opt,
      hotels: Array.isArray(opt.hotels) ? normalizeHotelsList(opt.hotels) : undefined,
      transfers: Array.isArray(opt.transfers) ? normalizeTransfersList(opt.transfers) : undefined,
      tours: Array.isArray(opt.tours) ? normalizeToursList(opt.tours) : undefined,
    }));
    return {
      hotels: normalizeHotelsList(safeHotels),
      options: normalizedSingle,
      collapsedAccidentalHotelOptions: false,
    };
  }

  if (hasAccidentalHotelAsOptionDuplication(safeOptions, safeHotels)) {
    const optionInnerHotels = safeOptions.flatMap((opt) =>
      Array.isArray(opt.hotels) ? opt.hotels : [],
    );
    const mergedHotels = normalizeHotelsList([...safeHotels, ...optionInnerHotels]);
    return {
      hotels: mergedHotels,
      options: [],
      collapsedAccidentalHotelOptions: true,
    };
  }

  // Opções legítimas: normaliza hotéis, transfers e tours internos de cada opção também
  const normalizedOptions = safeOptions.map((opt) => ({
    ...opt,
    hotels: Array.isArray(opt.hotels) ? normalizeHotelsList(opt.hotels) : [],
    transfers: Array.isArray(opt.transfers) ? normalizeTransfersList(opt.transfers) : [],
    tours: Array.isArray(opt.tours) ? normalizeToursList(opt.tours) : [],
  }));

  return {
    hotels: normalizeHotelsList(safeHotels),
    options: normalizedOptions,
    collapsedAccidentalHotelOptions: false,
  };
}

// ─── Construtor Padrão de Página Web Editável (R5) ────────────────────────────

export function buildDefaultWebPageConfig(proposal: {
  id?: string;
  public_token?: string;
  title?: string;
  subtitle?: string | null;
  destination_city?: string;
  cover_image_url?: string | null;
  flights?: any[];
  hotels?: any[];
  itinerary?: any[];
  transfers?: any[];
  tours?: any[];
  includes?: string[];
  excludes?: string[];
  custom_fields?: Record<string, any>;
  options?: any[];
}): ProposalWebPageDTO {
  const rawHeroMedia = normalizeEntityMediaList({
    featured_image_url: proposal.cover_image_url,
    images: typeof proposal.custom_fields?.destination_gallery_urls === "string"
      ? String(proposal.custom_fields.destination_gallery_urls).split(/[\n,|]+/)
      : [],
  });

  const blocks: ProposalWebPageBlock[] = [
    {
      id: "blk-hero",
      type: "hero",
      title: proposal.title || `Roteiro ${proposal.destination_city || ""}`.trim(),
      subtitle: proposal.subtitle || undefined,
      visible: true,
      order: 0,
      layout: "split",
      media: rawHeroMedia,
    },
    {
      id: "blk-summary",
      type: "summary",
      title: "Resumo da Viagem",
      visible: true,
      order: 1,
    },
    {
      id: "blk-hotels",
      type: "hotels",
      title: "Hospedagens",
      visible: true,
      order: 2,
      layout: "grid",
    },
    {
      id: "blk-flights",
      type: "flights",
      title: "Voos Previstos",
      visible: true,
      order: 3,
    },
    {
      id: "blk-transfers",
      type: "transfers",
      title: "Traslados e Receptivo",
      visible: true,
      order: 4,
    },
    {
      id: "blk-cruises",
      type: "cruises",
      title: "Cruzeiro Marítimo & Itinerário Náutico",
      visible: true,
      order: 4.5,
    },
    {
      id: "blk-tours",
      type: "tours",
      title: "Passeios e Experiências",
      visible: true,
      order: 5,
      layout: "grid",
    },
    {
      id: "blk-itinerary",
      type: "itinerary",
      title: "Roteiro Dia a Dia",
      visible: true,
      order: 6,
    },
    {
      id: "blk-includes",
      type: "includes",
      title: "O que Inclui",
      visible: true,
      order: 7,
    },
    {
      id: "blk-pricing",
      type: "pricing",
      title: "Investimento e Pagamento",
      visible: true,
      order: 8,
    },
    {
      id: "blk-conditions",
      type: "conditions",
      title: "Condições Gerais",
      visible: true,
      order: 9,
    },
    {
      id: "blk-simulation-disclaimer",
      type: "simulation_disclaimer",
      title: "Aviso Legal & Simulação",
      visible: true,
      order: 10,
    },
    {
      id: "blk-related-packages",
      type: "related_packages",
      title: "Outras Experiências Recomendadas",
      visible: true,
      order: 11,
    },
  ];

  return {
    proposal_id: proposal.id,
    headline: proposal.title || null,
    subheadline: proposal.subtitle || null,
    theme_preset: "editorial",
    hero_layout: "split",
    hero_media: rawHeroMedia,
    blocks,
    show_option_tabs: Array.isArray(proposal.options) && proposal.options.length > 1,
    cta_label: "Aprovar Proposta",
    is_published: true,
    seo_title: proposal.title || null,
    seo_description: proposal.subtitle || null,
    countdown_config: { enabled: false, mode: "proposal_valid_until" },
    availability_config: { enabled: false, spots_remaining: null },
    payment_display_config: {
      show_pix: true,
      show_card: true,
      show_boleto: false,
      show_financing: false,
      show_installment_simulator: true,
    },
    trust_badges_config: {
      agency_verified: true,
      support_24h: false,
      secure_payment: false,
      free_rebooking: false,
      cadastur_badge: false,
      custom_items: [],
    },
    show_flight_route_map: true,
    sticky_card_enabled: true,
    ai_advisor_enabled: true,
    whatsapp_button_enabled: true,
    allow_online_gateway_payment: false,
    show_simulation_disclaimer: true,
    simulation_disclaimer_text: "Esta proposta é uma simulação orçamentária. Valores, tarifas aéreas e disponibilidade hoteleira estão sujeitos a alteração e confirmação formal pela agência e operadoras até o momento do pagamento e emissão dos bilhetes.",
    show_related_packages: true,
    related_packages_title: "Outros Roteiros e Pacotes Recomendados",
  };
}

/**
 * Soma itens terrestres/serviços com `add_to_quote: true` em centavos inteiros.
 */
export function computeExtraServicesChargeCents(
  transfers?: Array<{ price_cents?: number | null; add_to_quote?: boolean | null }> | null,
  tours?: Array<{ price_cents?: number | null; add_to_quote?: boolean | null }> | null,
): number {
  const trSum = Array.isArray(transfers)
    ? transfers.reduce((acc, item) => acc + (item?.add_to_quote ? Math.max(0, Number(item.price_cents || 0)) : 0), 0)
    : 0;
  const tourSum = Array.isArray(tours)
    ? tours.reduce((acc, item) => acc + (item?.add_to_quote ? Math.max(0, Number(item.price_cents || 0)) : 0), 0)
    : 0;
  return trSum + tourSum;
}

/**
 * Converte um agrupador comparativo (`travel_quote_bundles`) em um `TravelProposalDTO`
 * canônico para renderização unificada no `ProposalWebShowcase`.
 */
export function mapQuoteBundleToTravelProposal(bundle: any): any {
  const rawItems = Array.isArray(bundle?.items) ? bundle.items : [];
  const comp = bundle?.passenger_composition || {};
  const adultsCount = Math.max(1, Number(comp.adults || 2));
  const childrenCount = Math.max(0, Number(comp.children || 0));

  const mappedOptions = rawItems.map((item: any, idx: number) => {
    const listing = item?.listing || {};
    const attrs = listing?.attributes || {};
    const totalPriceCents =
      item?.custom_price_cents != null && Number(item.custom_price_cents) > 0
        ? Number(item.custom_price_cents)
        : Number(listing?.price_cents || 0);

    const hotels = normalizeHotelsList(
      Array.isArray(attrs.lodgings) && attrs.lodgings.length > 0
        ? attrs.lodgings.map((l: any, lIdx: number) => ({
            id: l.id || `bundle-hotel-${idx}-${lIdx}`,
            hotel_name: l.name || l.hotel_name || attrs.hotel_name || listing?.title || "Hospedagem",
            destination: l.city || attrs.destination_city || "",
            board_basis: l.board_basis || attrs.meal_plan || "",
            checkin_date: l.checkin_date || attrs.departure_date || undefined,
            checkout_date: l.checkout_date || attrs.return_date || undefined,
            images: Array.isArray(l.images) ? l.images : Array.isArray(listing?.images) ? listing.images : [],
          }))
        : attrs.hotel_name
          ? [{
              id: `bundle-hotel-${idx}-0`,
              hotel_name: String(attrs.hotel_name),
              destination: attrs.destination_city || "",
              board_basis: attrs.meal_plan || "",
              images: Array.isArray(listing?.images) ? listing.images : [],
            }]
          : [],
    );

    const transfers = normalizeTransfersList(Array.isArray(attrs.transfers) ? attrs.transfers : []);
    const tours = normalizeToursList(Array.isArray(attrs.tours) ? attrs.tours : []);
    const flights = Array.isArray(attrs.flights) ? attrs.flights : [];
    const itinerary = Array.isArray(attrs.itinerary) ? attrs.itinerary : [];
    const includes = Array.isArray(attrs.inclusions)
      ? attrs.inclusions.map(String)
      : Array.isArray(attrs.includes)
        ? attrs.includes.map(String)
        : [];
    const excludes = Array.isArray(attrs.excludes) ? attrs.excludes.map(String) : [];

    return {
      id: String(item?.id || `bundle-opt-${idx + 1}`),
      name: String(item?.option_label || `Opção ${idx + 1}`),
      badge: item?.badge_text || undefined,
      hotel_name: hotels[0]?.hotel_name || attrs.hotel_name || undefined,
      meal_plan: hotels[0]?.board_basis || attrs.meal_plan || undefined,
      airline: flights[0]?.airline_name || flights[0]?.airline || undefined,
      hotels,
      flights,
      transfers,
      tours,
      itinerary,
      includes,
      excludes,
      cover_image_url: listing?.cover_image_url || listing?.images?.[0] || null,
      notes: item?.advisor_notes || bundle?.intro_notes || undefined,
      is_recommended: idx === 0 || String(item?.badge_text || "").toLowerCase().includes("recomend"),
      pricing: {
        currency: "BRL",
        total_price_cents: totalPriceCents,
        total_cents: totalPriceCents,
        per_adult_cents: Math.round(totalPriceCents / adultsCount),
        installments: Number(attrs.max_installments || 10),
      },
    };
  });

  const primaryOpt = mappedOptions[0] || {};
  const primaryAttrs = rawItems[0]?.listing?.attributes || {};

  return {
    id: String(bundle?.id || "bundle"),
    store_id: String(bundle?.store_id || bundle?.store?.id || ""),
    agency_name: bundle?.store?.name || "Agência de Viagens",
    agency_logo_url: bundle?.store?.logo_url || null,
    agency_whatsapp: bundle?.store?.whatsapp || bundle?.store?.phone || null,
    quote_id: String(bundle?.id || "bundle"),
    public_token: String(bundle?.slug || bundle?.id || ""),
    title: String(bundle?.title || "Proposta Comparativa"),
    subtitle: bundle?.intro_notes || null,
    cover_image_url:
      primaryOpt.cover_image_url ||
      rawItems[0]?.listing?.cover_image_url ||
      rawItems[0]?.listing?.images?.[0] ||
      null,
    client_name: String(bundle?.client_name || "Viajante"),
    client_whatsapp: String(bundle?.client_phone || ""),
    client_email: bundle?.client_email || null,
    adults_count: adultsCount,
    children_count: childrenCount,
    children_ages: Array.isArray(comp.children_ages) ? comp.children_ages : [],
    canvas_format: "editorial-flat",
    template_theme: "editorial-flat",
    destination_city: String(
      primaryAttrs.destination_city ||
        primaryOpt.hotels?.[0]?.destination ||
        bundle?.title ||
        "Destino",
    ),
    travel_start_date: primaryAttrs.departure_date || null,
    travel_end_date: primaryAttrs.return_date || null,
    flights: primaryOpt.flights || [],
    hotels: primaryOpt.hotels || [],
    itinerary: primaryOpt.itinerary || [],
    transfers: primaryOpt.transfers || [],
    tours: primaryOpt.tours || [],
    rooms: [],
    includes: primaryOpt.includes || [],
    excludes: primaryOpt.excludes || [],
    pricing: primaryOpt.pricing || { currency: "BRL", total_price_cents: 0 },
    options: mappedOptions,
    status: "sent",
    created_at: bundle?.created_at || new Date().toISOString(),
    updated_at: bundle?.updated_at || new Date().toISOString(),
  };
}
