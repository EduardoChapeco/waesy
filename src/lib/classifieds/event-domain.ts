/**
 * Canonical Event Domain Engine (SSOT)
 *
 * Unifies Event Creation (Classifieds & Workspace), Normalization,
 * Ticket Types & Scheduled Lot Automation, Multi-Day Program & Speaker Linking,
 * Multiple Organizers & Sponsors, Media Separation (Hero / Gallery / Story 9:16),
 * Location & Access Points, Scheduled Polls, Calendar Export (.ics / Google / Outlook),
 * and Domain Validation.
 */

export type EventParticipationMode =
  | "FREE"
  | "TICKETS"
  | "EXTERNAL"
  | "CONTACT"
  | "INVITE_ONLY";

export type EventTicketCategory =
  | "publico_geral"
  | "associado"
  | "vip"
  | "estudante"
  | "cortesia"
  | "convidado"
  | "grupo"
  | "custom";

export type EventTicketLotLifecycleState =
  | "DRAFT"
  | "SCHEDULED"
  | "ACTIVE"
  | "PAUSED"
  | "SOLD_OUT"
  | "ENDED"
  | "ARCHIVED";

export type EventOrganizerRole =
  | "ORGANIZER"
  | "CO_ORGANIZER"
  | "REALIZER"
  | "HOST"
  | "SUPPORTER";

export type EventOrganizerEntityType = "ORGANIZATION" | "PERSON";

export interface EventOrganizerEntity {
  id: string;
  name: string;
  role: EventOrganizerRole;
  role_label: string;
  entity_type: EventOrganizerEntityType;
  avatar_url?: string;
  phone?: string;
  website_url?: string;
  instagram_url?: string;
  is_verified: boolean;
}

export interface EventTicketTierNormalized {
  id: string;
  name: string;
  category: EventTicketCategory;
  category_label: string;
  lot_name: string;
  lot_order: number;
  price_cents: number;
  price: number;
  is_free: boolean;
  price_display: string;
  eligibility_rule?: string;
  description?: string;
  capacity: number;
  sold_count: number;
  remaining_count: number;
  sales_start_at?: string;
  sales_end_at?: string;
  external_url?: string;
  max_per_order: number;
  requires_approval: boolean;
  auto_advance_next_lot: boolean;
  raw_status?: string;
  lifecycle_state: EventTicketLotLifecycleState;
  lifecycle_badge_label: string;
  is_purchasable: boolean;
  status?: "available" | "sold_out" | "coming_soon" | string;
  purchase_url?: string;
  batch?: string;
}

export interface EventSpeakerNormalized {
  id: string;
  name: string;
  role: string;
  company?: string;
  bio: string;
  photo_url?: string;
  avatar_url?: string;
  social_url?: string;
  social_link?: string;
  featured?: boolean;
}

export interface EventScheduleItemNormalized {
  id: string;
  day_date: string;
  day_label: string;
  time: string;
  end_time?: string;
  title: string;
  description?: string;
  stage_or_room?: string;
  stage?: string;
  type: "talk" | "panel" | "workshop" | "networking" | "show" | "break" | "check_in";
  type_label: string;
  speaker_id?: string;
  speaker_name?: string;
  linked_speaker?: EventSpeakerNormalized;
  is_break?: boolean;
}

export interface EventScheduleDayGroup {
  day_key: string;
  day_date?: string;
  day_label: string;
  items: EventScheduleItemNormalized[];
}

export type EventPartnerTier =
  | "realizacao"
  | "master"
  | "ouro"
  | "prata"
  | "apoio"
  | "parceiro_midia";

export interface EventPartnerNormalized {
  id: string;
  name: string;
  tier: EventPartnerTier;
  tier_label: string;
  logo_url?: string;
  website_url?: string;
}

export type EventPollLifecycleState = "SCHEDULED" | "OPEN" | "CLOSED";

export interface EventPollOptionNormalized {
  id: string;
  text: string;
  votes: number;
}

export interface EventPollNormalized {
  id: string;
  question: string;
  options: EventPollOptionNormalized[];
  is_active: boolean;
  opens_at?: string;
  closes_at?: string;
  lifecycle_state: EventPollLifecycleState;
  lifecycle_label: string;
  total_votes: number;
}

export type EventTicketTier = EventTicketTierNormalized;
export type EventScheduleItem = EventScheduleItemNormalized;
export type EventSpeaker = EventSpeakerNormalized;
export type EventSponsor = EventPartnerNormalized;
export type EventSurvey = EventPollNormalized;

export type EventAccessPointType =
  | "main_venue"
  | "accreditation"
  | "parking"
  | "vip_entrance"
  | "pcd_access"
  | "other";

export interface EventAccessPoint {
  id: string;
  label: string;
  type: EventAccessPointType;
  type_label: string;
  address?: string;
  instructions?: string;
  latitude?: number | null;
  longitude?: number | null;
  map_url: string;
}

export type EventContentSectionType =
  | "rich_text"
  | "highlight"
  | "faq"
  | "cta"
  | "cards"
  | "quote";

export interface EventContentSection {
  id: string;
  type: EventContentSectionType;
  title: string;
  subtitle?: string;
  content: string;
  cta_label?: string;
  cta_url?: string;
  items?: Array<{ title: string; description: string }>;
}

export interface EventPromoCard {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  image_url?: string;
  target_section: string;
}

export interface EventValidationIssue {
  field: string;
  severity: "error" | "warning";
  message: string;
}

export interface EventCalendarLinks {
  googleCalendarUrl: string;
  outlookCalendarUrl: string;
  icsContent: string;
  icsFilename: string;
}

export interface EventDomainViewModel {
  id: string;
  source_type: "classified" | "workspace_event";
  title: string;
  subtitle?: string;
  summary?: string;
  description: string;
  tags: string[];
  category_label: string;
  template_style: "editorial" | "standard";
  display_mode: "tabs" | "continuous_list";
  participation_mode: EventParticipationMode;
  participation_mode_label: string;
  timezone: string;
  timezone_short: string;
  event_date: string;
  end_date?: string;
  start_time: string;
  end_time?: string;
  gates_open_time?: string;
  is_multi_day: boolean;
  formatted_date_full: string;
  formatted_date_range: string;
  date_tile: {
    day: string;
    month_short: string;
    weekday_short: string;
    year: number;
  } | null;
  modality: "in_person" | "online" | "hybrid";
  modality_label: string;
  online_url?: string;
  age_rating: string;
  age_rating_label: string;
  visibility: "public" | "unlisted";
  pwa_enabled: boolean;

  // Media
  hero_image_url: string | null;
  hero_focal_point: "center" | "top" | "bottom";
  gallery_images: string[];
  story_url: string | null;
  story_auto_open: boolean;
  video_url: string | null;

  // People & Institutions
  primary_organizer: EventOrganizerEntity;
  organizers: EventOrganizerEntity[];
  speakers: EventSpeakerNormalized[];
  sponsors: EventPartnerNormalized[];

  // Program & Schedule
  schedule: EventScheduleItemNormalized[];
  schedule_days: EventScheduleDayGroup[];

  // Tickets & Lots
  ticket_tiers: EventTicketTierNormalized[];
  active_ticket_tiers: EventTicketTierNormalized[];
  lowest_active_price_cents: number | null;
  has_free_tier: boolean;
  all_tickets_sold_out: boolean;
  external_ticket_url: string | null;

  // Content & Interactivity
  sections: EventContentSection[];
  promo_cards: EventPromoCard[];
  surveys: EventPollNormalized[];

  // Location & Access
  venue_name: string;
  venue_address: string;
  city: string;
  state: string;
  latitude: number | null;
  longitude: number | null;
  primary_map_url: string;
  access_points: EventAccessPoint[];

  // Policies & Accessibility
  policies: {
    refund_policy?: string;
    half_price_policy?: string;
    accessibility_info?: string;
    parking_info?: string;
    parking_mode?: "none" | "on_site_free" | "on_site_paid" | "nearby" | "multiple";
    accessibility_features: string[];
  };
  has_policies: boolean;

  // Available Dynamic Sections for Anchor Nav / ScrollSpy
  available_sections: Array<{
    id:
      | "sobre"
      | "ingressos"
      | "programacao"
      | "palestrantes"
      | "midia"
      | "enquetes"
      | "local"
      | "parceiros"
      | "politicas";
    label: string;
    count?: number;
  }>;
}

const MONTH_SHORT_PT = [
  "JAN",
  "FEV",
  "MAR",
  "ABR",
  "MAI",
  "JUN",
  "JUL",
  "AGO",
  "SET",
  "OUT",
  "NOV",
  "DEZ",
];

const WEEKDAY_SHORT_PT = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

const TICKET_CATEGORY_LABELS: Record<EventTicketCategory, string> = {
  publico_geral: "Público Geral",
  associado: "Associado / Entidade",
  vip: "VIP / Camarote",
  estudante: "Meia-Entrada / Estudante",
  cortesia: "Cortesia",
  convidado: "Convidado",
  grupo: "Pacote / Grupo",
  custom: "Ingresso",
};

const ORGANIZER_ROLE_LABELS: Record<EventOrganizerRole, string> = {
  ORGANIZER: "Organização",
  CO_ORGANIZER: "Correalização",
  REALIZER: "Realização",
  HOST: "Anfitrião",
  SUPPORTER: "Apoio Institucional",
};

const PARTNER_TIER_LABELS: Record<EventPartnerTier, string> = {
  realizacao: "Realização & Correalização",
  master: "Patrocínio Master",
  ouro: "Patrocínio Ouro",
  prata: "Patrocínio Prata",
  apoio: "Apoio Institucional",
  parceiro_midia: "Parceiro de Mídia",
};

const SCHEDULE_TYPE_LABELS: Record<EventScheduleItemNormalized["type"], string> = {
  talk: "Palestra",
  panel: "Painel / Debate",
  workshop: "Workshop Prático",
  networking: "Networking / Coffee",
  show: "Show / Atração",
  break: "Intervalo",
  check_in: "Credenciamento",
};

const ACCESS_POINT_LABELS: Record<EventAccessPointType, string> = {
  main_venue: "Entrada Principal / Auditório",
  accreditation: "Credenciamento",
  parking: "Estacionamento",
  vip_entrance: "Acesso VIP / Palestrantes",
  pcd_access: "Acesso Acessível (PCD)",
  other: "Ponto de Acesso",
};

export function formatBrlCents(cents: number): string {
  const value = (Number(cents) || 0) / 100;
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function parseEventDateSafe(dateStr?: string | null): Date | null {
  if (!dateStr || typeof dateStr !== "string") return null;
  const trimmed = dateStr.trim();
  if (!trimmed) return null;
  const isoCandidate = /^\d{4}-\d{2}-\d{2}$/.test(trimmed)
    ? `${trimmed}T12:00:00`
    : trimmed;
  const d = new Date(isoCandidate);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function buildGoogleMapsUrl(params: {
  latitude?: number | null;
  longitude?: number | null;
  venueName?: string;
  venueAddress?: string;
  city?: string;
  state?: string;
}): string {
  const { latitude, longitude, venueName, venueAddress, city, state } = params;
  if (
    typeof latitude === "number" &&
    Number.isFinite(latitude) &&
    typeof longitude === "number" &&
    Number.isFinite(longitude) &&
    (latitude !== 0 || longitude !== 0)
  ) {
    return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
  }
  const queryParts = [venueName, venueAddress, city, state]
    .map((p) => (p || "").trim())
    .filter(Boolean);
  const query = queryParts.length > 0 ? queryParts.join(", ") : "Brasil";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/**
 * Resolves the effective lifecycle state of a ticket lot deterministically.
 */
export function resolveEffectiveTicketLotState(
  rawTier: {
    status?: string;
    capacity?: number;
    quantity?: number;
    sold_count?: number;
    sales_start_at?: string;
    sales_end_at?: string;
    starts_at?: string;
    ends_at?: string;
  },
  options?: {
    nowIso?: string;
    previousLotExhaustedOrEnded?: boolean;
    autoAdvanceNextLot?: boolean;
  }
): {
  state: EventTicketLotLifecycleState;
  badgeLabel: string;
  isPurchasable: boolean;
} {
  const nowMs = options?.nowIso ? new Date(options.nowIso).getTime() : Date.now();
  const rawStatus = String(rawTier.status || "active").toLowerCase();

  if (rawStatus === "draft") {
    return { state: "DRAFT", badgeLabel: "Rascunho", isPurchasable: false };
  }
  if (rawStatus === "archived") {
    return { state: "ARCHIVED", badgeLabel: "Arquivado", isPurchasable: false };
  }
  if (rawStatus === "paused") {
    return { state: "PAUSED", badgeLabel: "Vendas Pausadas", isPurchasable: false };
  }
  if (rawStatus === "sold_out") {
    return { state: "SOLD_OUT", badgeLabel: "Esgotado", isPurchasable: false };
  }
  if (rawStatus === "ended" || rawStatus === "expired") {
    return { state: "ENDED", badgeLabel: "Lote Encerrado", isPurchasable: false };
  }
  if (rawStatus === "coming_soon" || rawStatus === "scheduled") {
    if (options?.previousLotExhaustedOrEnded && options?.autoAdvanceNextLot !== false) {
      return {
        state: "ACTIVE",
        badgeLabel: "Lote Ativo (Virada Automática)",
        isPurchasable: true,
      };
    }
    return { state: "SCHEDULED", badgeLabel: "Em Breve", isPurchasable: false };
  }

  const capacity = Number(rawTier.capacity ?? rawTier.quantity ?? 100);
  const soldCount = Number(rawTier.sold_count ?? 0);
  if (capacity > 0 && soldCount >= capacity) {
    return { state: "SOLD_OUT", badgeLabel: "Esgotado", isPurchasable: false };
  }

  const startIso = rawTier.sales_start_at || rawTier.starts_at;
  const endIso = rawTier.sales_end_at || rawTier.ends_at;

  const startDate = parseEventDateSafe(startIso);
  const endDate = parseEventDateSafe(endIso);

  if (endDate && nowMs > endDate.getTime()) {
    return { state: "ENDED", badgeLabel: "Vendas Encerradas", isPurchasable: false };
  }

  if (startDate && nowMs < startDate.getTime()) {
    // If previous lot sold out and auto_advance_next_lot is enabled, promote immediately to ACTIVE
    if (options?.previousLotExhaustedOrEnded && options?.autoAdvanceNextLot !== false) {
      return {
        state: "ACTIVE",
        badgeLabel: "Lote Ativo (Virada Automática)",
        isPurchasable: true,
      };
    }
    const formattedStart = startDate.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    });
    return {
      state: "SCHEDULED",
      badgeLabel: `Abre em ${formattedStart}`,
      isPurchasable: false,
    };
  }

  return { state: "ACTIVE", badgeLabel: "Disponível", isPurchasable: true };
}

/**
 * Resolves poll lifecycle state (`SCHEDULED | OPEN | CLOSED`) based on `opens_at` / `closes_at`.
 */
export function resolveEffectivePollState(
  rawPoll: {
    is_active?: boolean;
    opens_at?: string;
    closes_at?: string;
  },
  nowIso?: string
): { state: EventPollLifecycleState; label: string } {
  if (rawPoll.is_active === false) {
    return { state: "CLOSED", label: "Enquete Encerrada" };
  }
  const nowMs = nowIso ? new Date(nowIso).getTime() : Date.now();
  const opensDate = parseEventDateSafe(rawPoll.opens_at);
  const closesDate = parseEventDateSafe(rawPoll.closes_at);

  if (closesDate && nowMs > closesDate.getTime()) {
    return { state: "CLOSED", label: "Votação Encerrada" };
  }
  if (opensDate && nowMs < opensDate.getTime()) {
    const formattedOpen = opensDate.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    });
    return { state: "SCHEDULED", label: `Abre em ${formattedOpen}` };
  }
  return { state: "OPEN", label: "Votação Aberta" };
}

function inferTicketCategory(name: string, rawCat?: string): EventTicketCategory {
  if (rawCat && rawCat in TICKET_CATEGORY_LABELS) {
    return rawCat as EventTicketCategory;
  }
  const lower = (name || "").toLowerCase();
  if (lower.includes("associad") || lower.includes("acic") || lower.includes("cdl") || lower.includes("membro")) {
    return "associado";
  }
  if (lower.includes("vip") || lower.includes("camarote") || lower.includes("premium") || lower.includes("backstage")) {
    return "vip";
  }
  if (lower.includes("estudante") || lower.includes("meia")) {
    return "estudante";
  }
  if (lower.includes("cortesia") || lower.includes("free") || lower.includes("gratuito")) {
    return "cortesia";
  }
  if (lower.includes("convidad")) {
    return "convidado";
  }
  if (lower.includes("grupo") || lower.includes("mesa") || lower.includes("pacote") || lower.includes("corporativo")) {
    return "grupo";
  }
  return "publico_geral";
}

function resolveTierPriceCents(rawTier: any): number {
  if (typeof rawTier?.price_cents === "number" && Number.isFinite(rawTier.price_cents)) {
    // Wait: if price_cents === 0 but rawTier.price > 0 (from the legacy editor bug where price_cents was initialized to 0 and only price was updated!), prefer Math.round(rawTier.price * 100)!
    if (rawTier.price_cents === 0 && typeof rawTier?.price === "number" && rawTier.price > 0) {
      return Math.round(rawTier.price * 100);
    }
    return Math.max(0, Math.round(rawTier.price_cents));
  }
  if (typeof rawTier?.price === "number" && Number.isFinite(rawTier.price)) {
    return Math.max(0, Math.round(rawTier.price * 100));
  }
  if (typeof rawTier?.price === "string" && rawTier.price.trim() !== "") {
    const parsed = Number(rawTier.price.replace(",", "."));
    if (Number.isFinite(parsed)) {
      return Math.max(0, Math.round(parsed * 100));
    }
  }
  return 0;
}

/**
 * Normalizes any Classified Event or Workspace Event record into a canonical `EventDomainViewModel`.
 */
export function normalizeEventDomain(
  rawInput: any,
  options?: { nowIso?: string }
): EventDomainViewModel {
  const raw = rawInput || {};
  const attrs = raw.attributes || {};
  const nowIso = options?.nowIso;

  const sourceType: "classified" | "workspace_event" =
    raw.source_type === "classified" || raw.category === "event" || attrs.niche === "evento"
      ? "classified"
      : "workspace_event";

  const title = String(raw.title || "Evento").trim();
  const subtitle = String(attrs.subtitle || raw.subtitle || "").trim() || undefined;
  const summary = String(attrs.summary || raw.summary || "").trim() || undefined;
  const description = String(raw.content || raw.description || attrs.description || "").trim();
  const tags: string[] = Array.isArray(attrs.tags)
    ? attrs.tags.map((t: any) => String(t).trim()).filter(Boolean)
    : [];

  const templateStyle: "editorial" | "standard" =
    attrs.template_style === "standard" || raw.template_style === "standard"
      ? "standard"
      : "editorial";

  const displayMode: "tabs" | "continuous_list" =
    attrs.display_mode === "continuous_list" ? "continuous_list" : "tabs";

  const timezone = String(attrs.timezone || raw.timezone || "America/Sao_Paulo").trim();
  const timezoneShort = timezone === "America/Sao_Paulo" ? "BRT (UTC-3)" : timezone;

  const eventDate = String(attrs.event_date || raw.event_date || "").trim();
  const endDate = String(attrs.end_date || raw.end_date || "").trim() || undefined;
  const startTime = String(attrs.start_time || raw.start_time || "").trim();
  const endTime = String(attrs.end_time || raw.end_time || "").trim() || undefined;
  const gatesOpenTime = String(attrs.gates_open_time || raw.gates_open_time || "").trim() || undefined;

  const parsedStart = parseEventDateSafe(eventDate);
  const parsedEnd = parseEventDateSafe(endDate);

  const isMultiDay = Boolean(
    parsedStart &&
      parsedEnd &&
      parsedEnd.toISOString().slice(0, 10) !== parsedStart.toISOString().slice(0, 10) &&
      parsedEnd.getTime() >= parsedStart.getTime()
  );

  const dateTile = parsedStart
    ? {
        day: String(parsedStart.getDate()).padStart(2, "0"),
        month_short: MONTH_SHORT_PT[parsedStart.getMonth()] || "MES",
        weekday_short: WEEKDAY_SHORT_PT[parsedStart.getDay()] || "DIA",
        year: parsedStart.getFullYear(),
      }
    : null;

  const formattedDateFull = parsedStart
    ? parsedStart.toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "Data a definir";

  const formattedDateRange =
    isMultiDay && parsedStart && parsedEnd
      ? `${parsedStart.toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "short",
        })} a ${parsedEnd.toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })}`
      : formattedDateFull;

  // Modality
  const rawModality = String(attrs.modality || raw.modality || "in_person").toLowerCase();
  const modality: "in_person" | "online" | "hybrid" =
    rawModality === "online"
      ? "online"
      : rawModality === "hybrid" || rawModality === "hibrido"
      ? "hybrid"
      : "in_person";
  const modalityLabel =
    modality === "online"
      ? "Evento Online"
      : modality === "hybrid"
      ? "Evento Híbrido"
      : "Evento Presencial";

  const ageRating = String(attrs.age_rating || raw.age_rating || "Livre").trim();
  const ageRatingLabel =
    ageRating.toLowerCase() === "livre" || ageRating === "L"
      ? "Classificação Livre"
      : `Classificação ${ageRating}`;

  // Media separation: Hero vs Exclusive Gallery vs Story 9:16
  const rawImages: string[] = Array.isArray(raw.images)
    ? raw.images.map((u: any) => String(u || "").trim()).filter(Boolean)
    : [];
  const attrGallery: string[] = Array.isArray(attrs.gallery_images)
    ? attrs.gallery_images.map((u: any) => String(u || "").trim()).filter(Boolean)
    : [];
  const feedImages: string[] = Array.isArray(raw.feed_images)
    ? raw.feed_images.map((u: any) => String(u || "").trim()).filter(Boolean)
    : [];

  const explicitBanner = String(
    attrs.banner_image_url || raw.cover_image || raw.cover_image_url || ""
  ).trim();
  const heroImageUrl = explicitBanner || rawImages[0] || null;

  const rawFocal = String(attrs.hero_focal_point || "center").toLowerCase();
  const heroFocalPoint: "center" | "top" | "bottom" =
    rawFocal === "top" ? "top" : rawFocal === "bottom" ? "bottom" : "center";

  // Combine gallery images without losing uploaded feed photos
  const allGalleryCandidates = Array.from(
    new Set([...attrGallery, ...rawImages, ...feedImages])
  );
  // If the user uploaded multiple images or a separate banner + images, expose them in gallery_images
  const galleryImages =
    explicitBanner && allGalleryCandidates.length > 0
      ? allGalleryCandidates
      : allGalleryCandidates.length > 1
      ? allGalleryCandidates
      : allGalleryCandidates;

  const storyUrl = String(attrs.story_url || raw.story_url || "").trim() || null;
  const storyAutoOpen = Boolean(attrs.story_auto_open ?? raw.story_auto_open ?? false);
  const videoUrl = String(attrs.video_url || raw.video_url || "").trim() || null;

  // Honest Verification check (Directive #58 & B.33: NEVER hardcode true!)
  const isStoreVerified = Boolean(raw.store?.is_verified || raw.stores?.is_verified);
  const isProfileVerified = Boolean(
    raw.profiles?.is_verified || raw.author_profile?.is_verified
  );
  const isHostExplicitlyVerified = Boolean(
    isStoreVerified || isProfileVerified || attrs.host_verified === true
  );

  // Organizers & Realizers (Supports multiple entities + primary fallback)
  const rawOrganizers: any[] = Array.isArray(attrs.organizers) ? attrs.organizers : [];
  const fallbackHostName = String(
    attrs.host_name ||
      raw.organizer_name ||
      raw.store?.name ||
      raw.stores?.name ||
      raw.store_name ||
      raw.profiles?.full_name ||
      raw.contact_name ||
      "Organização do Evento"
  ).trim();
  const fallbackHostAvatar =
    String(
      attrs.host_avatar_url ||
        raw.store?.logo_url ||
        raw.stores?.logo_url ||
        raw.profiles?.avatar_url ||
        ""
    ).trim() || undefined;
  const fallbackHostRoleLabel = String(
    attrs.host_role || "Organizador Oficial"
  ).trim();
  const fallbackEntityType: EventOrganizerEntityType =
    attrs.host_entity_type === "PERSON" ? "PERSON" : "ORGANIZATION";

  const primaryOrganizer: EventOrganizerEntity = {
    id: "primary-organizer",
    name: fallbackHostName,
    role: "ORGANIZER",
    role_label: fallbackHostRoleLabel,
    entity_type: fallbackEntityType,
    avatar_url: fallbackHostAvatar,
    phone:
      String(
        attrs.host_phone || raw.organizer_phone || raw.contact_whatsapp || raw.whatsapp || ""
      ).trim() || undefined,
    website_url: String(attrs.host_website_url || "").trim() || undefined,
    instagram_url: String(attrs.host_instagram_url || "").trim() || undefined,
    is_verified: isHostExplicitlyVerified,
  };

  const normalizedExtraOrganizers: EventOrganizerEntity[] = rawOrganizers
    .filter((o) => o && String(o.name || "").trim() !== "")
    .map((o, idx) => {
      const roleKey: EventOrganizerRole =
        o.role && o.role in ORGANIZER_ROLE_LABELS ? o.role : "CO_ORGANIZER";
      return {
        id: String(o.id || `org-${idx}`),
        name: String(o.name).trim(),
        role: roleKey,
        role_label: String(o.role_label || ORGANIZER_ROLE_LABELS[roleKey]),
        entity_type: o.entity_type === "PERSON" ? "PERSON" : "ORGANIZATION",
        avatar_url: String(o.avatar_url || o.logo_url || "").trim() || undefined,
        phone: String(o.phone || "").trim() || undefined,
        website_url: String(o.website_url || "").trim() || undefined,
        instagram_url: String(o.instagram_url || "").trim() || undefined,
        is_verified: Boolean(o.is_verified),
      };
    });

  const organizers: EventOrganizerEntity[] = [
    primaryOrganizer,
    ...normalizedExtraOrganizers.filter(
      (o) => o.name.toLowerCase() !== primaryOrganizer.name.toLowerCase()
    ),
  ];

  // Speakers (Bridging avatar_url <-> photo_url and social_url <-> social_link)
  const rawSpeakers: any[] = Array.isArray(attrs.speakers || raw.speakers)
    ? attrs.speakers || raw.speakers
    : [];
  const speakers: EventSpeakerNormalized[] = rawSpeakers
    .filter((sp) => sp && String(sp.name || "").trim() !== "")
    .map((sp, idx) => {
      const photo =
        String(sp.photo_url || sp.avatar_url || sp.image_url || "").trim() || undefined;
      const social =
        String(sp.social_url || sp.social_link || sp.instagram_url || sp.linkedin_url || "").trim() ||
        undefined;
      return {
        id: String(sp.id || `spk-${idx}`),
        name: String(sp.name).trim(),
        role: String(sp.role || sp.title || "").trim(),
        company: String(sp.company || sp.institution || "").trim() || undefined,
        bio: String(sp.bio || sp.description || "").trim(),
        photo_url: photo,
        avatar_url: photo,
        social_url: social,
        social_link: social,
        featured: Boolean(sp.featured ?? idx === 0),
      };
    });

  // Schedule (Bridging stage <-> stage_or_room, separating description from speaker_name, and linking speakers)
  const rawSchedule: any[] = Array.isArray(attrs.schedule || raw.schedule)
    ? attrs.schedule || raw.schedule
    : [];
  const schedule: EventScheduleItemNormalized[] = rawSchedule
    .filter((item) => item && String(item.title || item.time || "").trim() !== "")
    .map((item, idx) => {
      const stageVal =
        String(item.stage_or_room || item.stage || "").trim() || undefined;
      const rawSpeakerName = String(item.speaker_name || "").trim() || undefined;
      const rawDesc = String(item.description || "").trim() || undefined;

      // Fix legacy bug where speaker_name and description were saved with identical text
      const cleanDescription =
        rawDesc && rawSpeakerName && rawDesc === rawSpeakerName
          ? undefined
          : rawDesc;

      const linkedSpeaker = speakers.find(
        (sp) =>
          (item.speaker_id && sp.id === item.speaker_id) ||
          (rawSpeakerName &&
            (sp.name.toLowerCase() === rawSpeakerName.toLowerCase() ||
              rawSpeakerName.toLowerCase().includes(sp.name.toLowerCase())))
      );

      const rawType = String(item.type || "talk").toLowerCase();
      const validType: EventScheduleItemNormalized["type"] =
        rawType in SCHEDULE_TYPE_LABELS
          ? (rawType as EventScheduleItemNormalized["type"])
          : "talk";

      const dayDate = String(item.day_date || item.date || eventDate || "").trim();
      const parsedItemDate = parseEventDateSafe(dayDate);
      const dayLabel =
        String(item.day_label || "").trim() ||
        (parsedItemDate
          ? parsedItemDate.toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "short",
            })
          : "Programação");

      return {
        id: String(item.id || `sch-${idx}`),
        day_date: dayDate,
        day_label: dayLabel,
        time: String(item.time || "19:00").trim(),
        end_time: String(item.end_time || "").trim() || undefined,
        title: String(item.title || "Atividade").trim(),
        description: cleanDescription,
        stage_or_room: stageVal,
        stage: stageVal,
        type: validType,
        type_label: SCHEDULE_TYPE_LABELS[validType],
        speaker_id: linkedSpeaker?.id || item.speaker_id || undefined,
        speaker_name: linkedSpeaker?.name || rawSpeakerName,
        linked_speaker: linkedSpeaker,
      };
    });

  // Group schedule by day
  const scheduleDaysMap = new Map<string, EventScheduleDayGroup>();
  for (const item of schedule) {
    const key = item.day_date || item.day_label || "default";
    const existing = scheduleDaysMap.get(key);
    if (existing) {
      existing.items.push(item);
    } else {
      scheduleDaysMap.set(key, {
        day_key: key,
        day_date: item.day_date || undefined,
        day_label: item.day_label || "Dia Único",
        items: [item],
      });
    }
  }
  const scheduleDays = Array.from(scheduleDaysMap.values());

  // Sponsors & Partners
  const rawSponsors: any[] = Array.isArray(attrs.sponsors || raw.sponsors)
    ? attrs.sponsors || raw.sponsors
    : [];
  const sponsors: EventPartnerNormalized[] = rawSponsors
    .filter((sp) => sp && String(sp.name || "").trim() !== "")
    .map((sp, idx) => {
      const rawTier = String(sp.tier || "ouro").toLowerCase();
      const tier: EventPartnerTier =
        rawTier === "master" || rawTier === "patrocinio_master"
          ? "ouro"
          : rawTier in PARTNER_TIER_LABELS
          ? (rawTier as EventPartnerTier)
          : "apoio";
      return {
        id: String(sp.id || `spn-${idx}`),
        name: String(sp.name).trim(),
        tier,
        tier_label: PARTNER_TIER_LABELS[tier],
        logo_url: String(sp.logo_url || sp.image_url || "").trim() || undefined,
        website_url: String(sp.website_url || sp.url || "").trim() || undefined,
      };
    });

  // Tickets & Scheduled Lots with Automatic Lot Rollover
  const rawTiers: any[] = Array.isArray(attrs.ticket_tiers)
    ? attrs.ticket_tiers
    : Array.isArray(raw.ticket_lots)
    ? raw.ticket_lots
    : [];

  // Track exhaustion per category/type so sequential lots auto-activate
  const categoryExhaustedTracker = new Map<string, boolean>();

  const ticketTiers: EventTicketTierNormalized[] = rawTiers
    .filter((t) => t && String(t.name || "").trim() !== "")
    .map((t, idx) => {
      const name = String(t.name).trim();
      const category = inferTicketCategory(name, t.category);
      const priceCents = resolveTierPriceCents(t);
      const isFree = priceCents === 0;
      const capacity = Math.max(0, Number(t.capacity ?? t.quantity ?? 100));
      const soldCount = Math.max(0, Number(t.sold_count ?? 0));
      const remainingCount = Math.max(0, capacity - soldCount);
      const externalUrl =
        String(t.external_url || t.purchase_url || "").trim() || undefined;
      const eligibilityRule =
        String(t.eligibility_rule || t.eligibility || t.description || "").trim() ||
        undefined;
      const lotName =
        String(t.lot_name || "").trim() ||
        (name.toLowerCase().includes("lote") ? name : `${idx + 1}º Lote`);
      const lotOrder = Number(t.lot_order ?? idx + 1);
      const autoAdvanceNextLot = t.auto_advance_next_lot !== false;

      const prevExhausted = categoryExhaustedTracker.get(category) === true;
      const lifecycle = resolveEffectiveTicketLotState(
        {
          status: t.status,
          capacity,
          sold_count: soldCount,
          sales_start_at: t.sales_start_at || t.starts_at,
          sales_end_at: t.sales_end_at || t.ends_at,
        },
        {
          nowIso,
          previousLotExhaustedOrEnded: prevExhausted,
          autoAdvanceNextLot,
        }
      );

      if (lifecycle.state === "SOLD_OUT" || lifecycle.state === "ENDED") {
        categoryExhaustedTracker.set(category, true);
      } else if (lifecycle.state === "ACTIVE") {
        categoryExhaustedTracker.set(category, false);
      }

      return {
        id: String(t.id || `tier-${idx}`),
        name,
        category,
        category_label: TICKET_CATEGORY_LABELS[category],
        lot_name: lotName,
        lot_order: lotOrder,
        price_cents: priceCents,
        price: priceCents / 100,
        is_free: isFree,
        price_display: isFree ? "GRÁTIS" : formatBrlCents(priceCents),
        eligibility_rule: eligibilityRule,
        description: eligibilityRule,
        capacity,
        sold_count: soldCount,
        remaining_count: remainingCount,
        sales_start_at: t.sales_start_at || t.starts_at || undefined,
        sales_end_at: t.sales_end_at || t.ends_at || undefined,
        external_url: externalUrl,
        max_per_order: Math.max(1, Number(t.max_per_order ?? 4)),
        requires_approval: Boolean(t.requires_approval),
        auto_advance_next_lot: autoAdvanceNextLot,
        raw_status: t.status,
        lifecycle_state: lifecycle.state,
        lifecycle_badge_label: lifecycle.badgeLabel,
        is_purchasable: lifecycle.isPurchasable,
      };
    });

  const activeTicketTiers = ticketTiers.filter((t) => t.is_purchasable);
  const activePrices = activeTicketTiers.map((t) => t.price_cents);
  const allPrices = ticketTiers.map((t) => t.price_cents);
  const lowestActivePriceCents =
    activePrices.length > 0
      ? Math.min(...activePrices)
      : allPrices.length > 0
      ? Math.min(...allPrices)
      : typeof raw.price_cents === "number"
      ? raw.price_cents
      : null;

  const hasFreeTier =
    ticketTiers.some((t) => t.is_free) || raw.is_free === true || raw.price_cents === 0;
  const allTicketsSoldOut =
    ticketTiers.length > 0 && ticketTiers.every((t) => !t.is_purchasable);

  const externalTicketUrl =
    String(
      attrs.external_ticket_url ||
        raw.external_ticket_url ||
        ticketTiers.find((t) => t.external_url)?.external_url ||
        ""
    ).trim() || null;

  // Participation Mode
  const rawParticipationMode = String(attrs.event_participation_mode || "").toUpperCase();
  let participationMode: EventParticipationMode = "TICKETS";
  if (
    rawParticipationMode === "FREE" ||
    rawParticipationMode === "TICKETS" ||
    rawParticipationMode === "EXTERNAL" ||
    rawParticipationMode === "CONTACT" ||
    rawParticipationMode === "INVITE_ONLY"
  ) {
    participationMode = rawParticipationMode as EventParticipationMode;
  } else if (externalTicketUrl && ticketTiers.length === 0) {
    participationMode = "EXTERNAL";
  } else if (
    (ticketTiers.length > 0 && ticketTiers.every((t) => t.is_free)) ||
    (ticketTiers.length === 0 && (raw.is_free === true || attrs.pricing_type === "free"))
  ) {
    participationMode = "FREE";
  } else if (ticketTiers.length > 0) {
    participationMode = "TICKETS";
  } else if (attrs.pricing_type === "on_quote") {
    participationMode = "CONTACT";
  }

  const PARTICIPATION_LABELS: Record<EventParticipationMode, string> = {
    FREE: "Evento Gratuito / Inscrição Livre",
    TICKETS: "Venda de Ingressos / Lotes",
    EXTERNAL: "Inscrição em Plataforma Externa",
    CONTACT: "Inscrição sob Consulta / Contato",
    INVITE_ONLY: "Exclusivo para Convidados / Associados",
  };

  // Surveys / Polls with Schedule (Supports both string[] options and object[] options!)
  const rawSurveys: any[] = Array.isArray(attrs.surveys || raw.surveys)
    ? attrs.surveys || raw.surveys
    : [];
  const surveys: EventPollNormalized[] = rawSurveys
    .filter((sv) => sv && String(sv.question || "").trim() !== "")
    .map((sv, idx) => {
      const options: EventPollOptionNormalized[] = Array.isArray(sv.options)
        ? sv.options
            .map((o: any, oIdx: number) => {
              if (typeof o === "string") {
                return {
                  id: `opt-${idx}-${oIdx}`,
                  text: o.trim(),
                  votes: 0,
                };
              }
              if (o && typeof o === "object") {
                return {
                  id: String(o.id || `opt-${idx}-${oIdx}`),
                  text: String(o.text || o.label || "").trim(),
                  votes: Math.max(0, Number(o.votes || 0)),
                };
              }
              return null;
            })
            .filter((o: any): o is EventPollOptionNormalized => Boolean(o && o.text))
        : [];
      const totalVotes = options.reduce((acc, o) => acc + o.votes, 0);
      const pollLifecycle = resolveEffectivePollState(
        {
          is_active: sv.is_active ?? sv.active ?? true,
          opens_at: sv.opens_at,
          closes_at: sv.closes_at,
        },
        nowIso
      );
      return {
        id: String(sv.id || `poll-${idx}`),
        question: String(sv.question).trim(),
        options,
        is_active: (sv.is_active ?? sv.active) !== false,
        opens_at: sv.opens_at || undefined,
        closes_at: sv.closes_at || undefined,
        lifecycle_state: pollLifecycle.state,
        lifecycle_label: pollLifecycle.label,
        total_votes: totalVotes,
      };
    });

  // Location & Multiple Access Points
  const venueName = String(
    attrs.venue_name || raw.location || raw.location_name || "Local a definir"
  ).trim();
  const venueAddress = String(attrs.venue_address || raw.address || "").trim();
  const city = String(attrs.city || raw.city || "Chapecó").trim();
  const state = String(attrs.state || raw.state || "SC").trim();
  const latitude =
    typeof raw.location_lat === "number"
      ? raw.location_lat
      : typeof attrs.latitude === "number"
      ? attrs.latitude
      : null;
  const longitude =
    typeof raw.location_lng === "number"
      ? raw.location_lng
      : typeof attrs.longitude === "number"
      ? attrs.longitude
      : null;

  const primaryMapUrl = buildGoogleMapsUrl({
    latitude,
    longitude,
    venueName,
    venueAddress,
    city,
    state,
  });

  const rawAccessPoints: any[] = Array.isArray(attrs.access_points)
    ? attrs.access_points
    : [];
  const accessPoints: EventAccessPoint[] = rawAccessPoints
    .filter((ap) => ap && String(ap.label || ap.address || "").trim() !== "")
    .map((ap, idx) => {
      const rawType = String(ap.type || "other") as EventAccessPointType;
      const validType: EventAccessPointType =
        rawType in ACCESS_POINT_LABELS ? rawType : "other";
      const apLat = typeof ap.latitude === "number" ? ap.latitude : null;
      const apLng = typeof ap.longitude === "number" ? ap.longitude : null;
      return {
        id: String(ap.id || `ap-${idx}`),
        label: String(ap.label || ACCESS_POINT_LABELS[validType]).trim(),
        type: validType,
        type_label: ACCESS_POINT_LABELS[validType],
        address: String(ap.address || "").trim() || undefined,
        instructions: String(ap.instructions || "").trim() || undefined,
        latitude: apLat,
        longitude: apLng,
        map_url:
          String(ap.map_url || "").trim() ||
          buildGoogleMapsUrl({
            latitude: apLat,
            longitude: apLng,
            venueName: ap.label || venueName,
            venueAddress: ap.address || venueAddress,
            city,
            state,
          }),
      };
    });

  // Policies & Accessibility
  const rawPolicies = attrs.policies || raw.policies || {};
  const refundPolicy = String(rawPolicies.refund_policy || "").trim() || undefined;
  const halfPricePolicy = String(rawPolicies.half_price_policy || "").trim() || undefined;
  const accessibilityInfo =
    String(rawPolicies.accessibility_info || "").trim() || undefined;
  const parkingInfo = String(rawPolicies.parking_info || "").trim() || undefined;
  const parkingMode = rawPolicies.parking_mode || undefined;
  const accessibilityFeatures: string[] = Array.isArray(
    rawPolicies.accessibility_features
  )
    ? rawPolicies.accessibility_features.map((f: any) => String(f).trim()).filter(Boolean)
    : [];

  const hasPolicies = Boolean(
    refundPolicy ||
      halfPricePolicy ||
      accessibilityInfo ||
      parkingInfo ||
      accessibilityFeatures.length > 0
  );

  // Custom Content Sections
  const rawSections: any[] = Array.isArray(attrs.sections) ? attrs.sections : [];
  const sections: EventContentSection[] = rawSections
    .filter((s) => s && (String(s.title || "").trim() || String(s.content || "").trim()))
    .map((s, idx) => ({
      id: String(s.id || `sec-${idx}`),
      type: (s.type as EventContentSectionType) || "rich_text",
      title: String(s.title || "Destaque").trim(),
      subtitle: String(s.subtitle || "").trim() || undefined,
      content: String(s.content || "").trim(),
      cta_label: String(s.cta_label || "").trim() || undefined,
      cta_url: String(s.cta_url || "").trim() || undefined,
      items: Array.isArray(s.items) ? s.items : undefined,
    }));

  // Highlight Promo Cards (Derived + Custom)
  const promoCards: EventPromoCard[] = [];
  if (speakers.length > 0) {
    const leadSpeaker = speakers.find((s) => s.featured) || speakers[0];
    promoCards.push({
      id: "promo-speaker",
      badge: "Palestrante Confirmado",
      title: leadSpeaker.name,
      subtitle: [leadSpeaker.role, leadSpeaker.company].filter(Boolean).join(" • ") || "Atração Principal",
      image_url: leadSpeaker.photo_url,
      target_section: "palestrantes",
    });
  }
  if (schedule.length > 0) {
    promoCards.push({
      id: "promo-schedule",
      badge: isMultiDay ? `${scheduleDays.length} Dias de Imersão` : "Programação Oficial",
      title: `${schedule.length} ${schedule.length === 1 ? "atividade programada" : "atividades na agenda"}`,
      subtitle: gatesOpenTime
        ? `Abertura dos portões às ${gatesOpenTime}`
        : startTime
        ? `Início às ${startTime}`
        : "Confira os horários",
      target_section: "programacao",
    });
  }
  if (ticketTiers.length > 0) {
    const activeTier = activeTicketTiers[0] || ticketTiers[0];
    promoCards.push({
      id: "promo-ticket",
      badge: activeTier.lot_name,
      title: activeTier.is_free
        ? `Inscrição ${activeTier.price_display}`
        : `A partir de ${activeTier.price_display}`,
      subtitle: activeTier.eligibility_rule || activeTier.lifecycle_badge_label,
      target_section: "ingressos",
    });
  }

  // Dynamic Available Sections (Strict Rule B.33: omit empty optional tabs!)
  const availableSections: EventDomainViewModel["available_sections"] = [
    { id: "sobre", label: "Sobre" },
  ];
  if (ticketTiers.length > 0 || externalTicketUrl || participationMode === "FREE") {
    availableSections.push({
      id: "ingressos",
      label: "Ingressos",
      count: ticketTiers.length || undefined,
    });
  }
  if (schedule.length > 0) {
    availableSections.push({
      id: "programacao",
      label: "Programação",
      count: schedule.length,
    });
  }
  if (speakers.length > 0) {
    availableSections.push({
      id: "palestrantes",
      label: "Palestrantes",
      count: speakers.length,
    });
  }
  if (galleryImages.length > 0 || videoUrl || storyUrl) {
    availableSections.push({
      id: "midia",
      label: "Mídia & Galeria",
      count: galleryImages.length + (videoUrl ? 1 : 0) + (storyUrl ? 1 : 0),
    });
  }
  if (surveys.length > 0) {
    availableSections.push({
      id: "enquetes",
      label: "Enquetes",
      count: surveys.length,
    });
  }
  availableSections.push({
    id: "local",
    label: "Local & Acesso",
    count: accessPoints.length > 0 ? accessPoints.length : undefined,
  });
  if (sponsors.length > 0) {
    availableSections.push({
      id: "parceiros",
      label: "Parceiros",
      count: sponsors.length,
    });
  }
  if (hasPolicies) {
    availableSections.push({
      id: "politicas",
      label: "Políticas",
    });
  }

  return {
    id: String(raw.id || "event-preview"),
    source_type: sourceType,
    title,
    subtitle,
    summary,
    description,
    tags,
    category_label: String(attrs.event_category_label || raw.category || "Evento").trim(),
    template_style: templateStyle,
    display_mode: displayMode,
    participation_mode: participationMode,
    participation_mode_label: PARTICIPATION_LABELS[participationMode],
    timezone,
    timezone_short: timezoneShort,
    event_date: eventDate,
    end_date: endDate,
    start_time: startTime,
    end_time: endTime,
    gates_open_time: gatesOpenTime,
    is_multi_day: isMultiDay,
    formatted_date_full: formattedDateFull,
    formatted_date_range: formattedDateRange,
    date_tile: dateTile,
    modality,
    modality_label: modalityLabel,
    online_url: String(attrs.online_url || "").trim() || undefined,
    age_rating: ageRating,
    age_rating_label: ageRatingLabel,
    visibility: attrs.visibility === "unlisted" || raw.visibility === "unlisted" ? "unlisted" : "public",
    pwa_enabled: Boolean(attrs.pwa_enabled ?? true),
    hero_image_url: heroImageUrl,
    hero_focal_point: heroFocalPoint,
    gallery_images: galleryImages,
    story_url: storyUrl,
    story_auto_open: storyAutoOpen,
    video_url: videoUrl,
    primary_organizer: primaryOrganizer,
    organizers,
    speakers,
    sponsors,
    schedule,
    schedule_days: scheduleDays,
    ticket_tiers: ticketTiers,
    active_ticket_tiers: activeTicketTiers,
    lowest_active_price_cents: lowestActivePriceCents,
    has_free_tier: hasFreeTier,
    all_tickets_sold_out: allTicketsSoldOut,
    external_ticket_url: externalTicketUrl,
    sections,
    promo_cards: promoCards,
    surveys,
    venue_name: venueName,
    venue_address: venueAddress,
    city,
    state,
    latitude,
    longitude,
    primary_map_url: primaryMapUrl,
    access_points: accessPoints,
    policies: {
      refund_policy: refundPolicy,
      half_price_policy: halfPricePolicy,
      accessibility_info: accessibilityInfo,
      parking_info: parkingInfo,
      parking_mode: parkingMode,
      accessibility_features: accessibilityFeatures,
    },
    has_policies: hasPolicies,
    available_sections: availableSections,
  };
}

function formatDateTimeForCalendar(dateStr: string, timeStr?: string): string {
  const cleanDate = (dateStr || "").slice(0, 10).replace(/-/g, "");
  if (!/^\d{8}$/.test(cleanDate)) {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}${m}${d}T190000`;
  }
  const cleanTime = (timeStr || "19:00").replace(":", "").slice(0, 4);
  const hhmm = /^\d{4}$/.test(cleanTime) ? cleanTime : "1900";
  return `${cleanDate}T${hhmm}00`;
}

function escapeIcsText(value: string): string {
  return (value || "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/**
 * Generates Google Calendar, Outlook Calendar, and RFC-5545 `.ics` calendar exports.
 */
export function buildEventCalendarLinks(
  event: EventDomainViewModel,
  publicUrl?: string
): EventCalendarLinks {
  const dtStart = formatDateTimeForCalendar(event.event_date, event.start_time || "19:00");
  const endDay = event.end_date || event.event_date;
  const defaultEndHour = event.start_time
    ? `${String(Math.min(23, ( parseInt(event.start_time.split(":")[0] || "19", 10) + 3 ))).padStart(2, "0")}:${event.start_time.split(":")[1] || "00"}`
    : "22:00";
  const dtEnd = formatDateTimeForCalendar(endDay, event.end_time || defaultEndHour);

  const locationFull = [event.venue_name, event.venue_address, event.city, event.state]
    .filter(Boolean)
    .join(", ");

  const descriptionParts = [
    event.summary || event.description.slice(0, 400),
    event.gates_open_time ? `Abertura dos portões: ${event.gates_open_time}` : "",
    publicUrl ? `Página oficial: ${publicUrl}` : "",
  ].filter(Boolean);
  const detailsText = descriptionParts.join("\n\n");

  const googleParams = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${dtStart}/${dtEnd}`,
    details: detailsText,
    location: locationFull,
    ctz: event.timezone || "America/Sao_Paulo",
  });
  const googleCalendarUrl = `https://calendar.google.com/calendar/render?${googleParams.toString()}`;

  const isoStart = `${(event.event_date || "2026-11-17").slice(0, 10)}T${event.start_time || "19:00"}:00`;
  const isoEnd = `${(endDay || "2026-11-17").slice(0, 10)}T${event.end_time || defaultEndHour}:00`;
  const outlookParams = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: event.title,
    startdt: isoStart,
    enddt: isoEnd,
    body: detailsText,
    location: locationFull,
  });
  const outlookCalendarUrl = `https://outlook.live.com/calendar/0/deeplink/compose?${outlookParams.toString()}`;

  const icsLines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Waesy Eventos//PT-BR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.id}@waesy.app`,
    `DTSTAMP:${dtStart}Z`,
    `DTSTART;TZID=${event.timezone || "America/Sao_Paulo"}:${dtStart}`,
    `DTEND;TZID=${event.timezone || "America/Sao_Paulo"}:${dtEnd}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
    `DESCRIPTION:${escapeIcsText(detailsText)}`,
    `LOCATION:${escapeIcsText(locationFull)}`,
    ...(publicUrl ? [`URL:${publicUrl}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  const slug = event.title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return {
    googleCalendarUrl,
    outlookCalendarUrl,
    icsContent: icsLines.join("\r\n"),
    icsFilename: `${slug || "evento"}.ics`,
  };
}

/**
 * Validates an EventDomainViewModel for date/time/lot/schedule/poll consistency.
 */
export function validateEventDomain(
  event: EventDomainViewModel
): { isValid: boolean; issues: EventValidationIssue[] } {
  const issues: EventValidationIssue[] = [];

  if (!event.title || event.title.trim().length < 3) {
    issues.push({
      field: "title",
      severity: "error",
      message: "O título do evento deve ter pelo menos 3 caracteres.",
    });
  }

  if (!event.event_date) {
    issues.push({
      field: "event_date",
      severity: "error",
      message: "Informe a data de início do evento.",
    });
  }

  const startD = parseEventDateSafe(event.event_date);
  const endD = parseEventDateSafe(event.end_date);
  if (startD && endD && endD.getTime() < startD.getTime()) {
    issues.push({
      field: "end_date",
      severity: "error",
      message: "A data de término do evento não pode ser anterior à data de início.",
    });
  }

  for (const tier of event.ticket_tiers) {
    if (tier.price_cents < 0) {
      issues.push({
        field: `ticket_tiers.${tier.id}.price_cents`,
        severity: "error",
        message: `O lote "${tier.name}" possui valor negativo.`,
      });
    }
    if (tier.capacity < 0) {
      issues.push({
        field: `ticket_tiers.${tier.id}.capacity`,
        severity: "error",
        message: `O lote "${tier.name}" possui capacidade negativa.`,
      });
    }
    const lotStart = parseEventDateSafe(tier.sales_start_at);
    const lotEnd = parseEventDateSafe(tier.sales_end_at);
    if (lotStart && lotEnd && lotEnd.getTime() <= lotStart.getTime()) {
      issues.push({
        field: `ticket_tiers.${tier.id}.sales_end_at`,
        severity: "error",
        message: `O fim das vendas do lote "${tier.name}" deve ser posterior ao início das vendas.`,
      });
    }
  }

  for (const poll of event.surveys) {
    if (poll.options.length < 2) {
      issues.push({
        field: `surveys.${poll.id}.options`,
        severity: "error",
        message: `A enquete "${poll.question}" precisa de pelo menos 2 opções.`,
      });
    }
  }

  return {
    isValid: issues.every((i) => i.severity !== "error"),
    issues,
  };
}
