/**
 * proposal-security.ts — Shared visibility, sanitization, salted SHA-256 PIN verification,
 * and client/server safe metadata helpers for Travel Proposals.
 */

export type ProposalVisibilityMode = "public" | "link_only" | "password" | "private";
export type ProposalLockReason = "private" | "hidden" | "pin_required";

const LEGACY_PIN_REGEX = /\[SENHA:([^\]]+)\]/i;
const LEGACY_PIN_STRIP_REGEX = /\[SENHA:[^\]]+\]\s*/gi;

/** Removes legacy `[SENHA:...]` marker from notes text. */
export function stripLegacyPinTag(notes?: string | null): string | null {
  if (!notes) return null;
  const cleaned = notes.replace(LEGACY_PIN_STRIP_REGEX, "").trim();
  return cleaned.length > 0 ? cleaned : null;
}

/** Extracts legacy PIN from `[SENHA:...]` marker if present. */
export function extractLegacyPinFromNotes(notes?: string | null): string | null {
  if (!notes) return null;
  const match = notes.match(LEGACY_PIN_REGEX);
  const extracted = match?.[1]?.trim();
  return extracted && extracted.length > 0 ? extracted : null;
}

/** Normalizes PIN input cleanly without mangling digits or uppercase letters unintentionally. */
export function normalizeProposalPin(pin?: string | null): string {
  return typeof pin === "string" ? pin.trim() : "";
}

/** Computes `sha256:<hex>` using per-proposal ID salt matching SQL migration `20270411000000`. */
export async function computeProposalPinHash(proposalId: string, pin: string): Promise<string> {
  const normalizedPin = normalizeProposalPin(pin);
  if (!proposalId || !normalizedPin) return "";
  const input = `${proposalId}:${normalizedPin}`;
  const encoded = new TextEncoder().encode(input);
  const digestBuffer = await globalThis.crypto.subtle.digest("SHA-256", encoded);
  const hex = Array.from(new Uint8Array(digestBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `sha256:${hex}`;
}

/** Constant-time string comparison resistant to basic timing leaks. */
export function timingSafeEqualStrings(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/** Resolves effective visibility mode considering both canonical column and legacy PIN marker. */
export function resolveProposalVisibilityMode(row: {
  visibility_mode?: string | null;
  access_pin_hash?: string | null;
  special_notes?: string | null;
}): ProposalVisibilityMode {
  if (
    row.visibility_mode === "public" ||
    row.visibility_mode === "link_only" ||
    row.visibility_mode === "password" ||
    row.visibility_mode === "private"
  ) {
    if (
      (row.access_pin_hash || extractLegacyPinFromNotes(row.special_notes)) &&
      row.visibility_mode !== "private"
    ) {
      return row.visibility_mode === "link_only" ? "password" : row.visibility_mode;
    }
    return row.visibility_mode;
  }

  if (row.access_pin_hash || extractLegacyPinFromNotes(row.special_notes)) {
    return "password";
  }

  return "public";
}

/** Verifies candidate PIN against salted `access_pin_hash` or legacy `[SENHA:...]` marker. */
export async function verifyProposalPinMatch(params: {
  proposalId: string;
  candidatePin: string;
  accessPinHash?: string | null;
  legacySpecialNotes?: string | null;
}): Promise<boolean> {
  const candidate = normalizeProposalPin(params.candidatePin);
  if (!candidate || !params.proposalId) return false;

  if (params.accessPinHash && params.accessPinHash.startsWith("sha256:")) {
    const candidateHash = await computeProposalPinHash(params.proposalId, candidate);
    if (timingSafeEqualStrings(candidateHash, params.accessPinHash)) {
      return true;
    }
  }

  const legacyPin = extractLegacyPinFromNotes(params.legacySpecialNotes);
  if (legacyPin && timingSafeEqualStrings(candidate, legacyPin)) {
    return true;
  }

  return false;
}

export interface RedactableProposalLike {
  id: string;
  store_id?: string | null;
  agency_name: string;
  agency_logo_url?: string | null;
  agency_whatsapp?: string | null;
  agency_phone?: string | null;
  agency_email?: string | null;
  agent_name?: string | null;
  agent_whatsapp?: string | null;
  quote_id: string;
  lead_id?: string | null;
  customer_id?: string | null;
  public_token: string;
  title: string;
  subtitle?: string | null;
  cover_image_url?: string | null;
  client_name: string;
  client_whatsapp: string;
  client_email?: string | null;
  client_document?: string | null;
  custom_fields?: Record<string, any>;
  source_listing_id?: string | null;
  source_listing_origin?: string | null;
  adults_count: number;
  children_count: number;
  canvas_format: string;
  template_theme: string;
  destination_city: string;
  travel_start_date?: string | null;
  travel_end_date?: string | null;
  flights: any[];
  hotels: any[];
  itinerary: any[];
  transfers: any[];
  tours: any[];
  rooms: any[];
  includes: string[];
  excludes: string[];
  pricing: Record<string, any>;
  options?: any[];
  ai_sales_advisor_enabled?: boolean;
  ai_sales_advisor_prompt?: string | null;
  special_notes?: string | null;
  access_pin?: string | null;
  visibility_mode?: ProposalVisibilityMode;
  is_hidden?: boolean;
  has_access_pin?: boolean;
  access_locked?: boolean;
  lock_reason?: ProposalLockReason | null;
  snapshot_hash?: string | null;
  acceptance_status?: string | null;
  canonical_status?: string | null;
  accepted_option_id?: string | null;
  valid_until?: string | null;
  status: string;
}

/**
 * Strips all sensitive commercial details, flights, hotels, prices, PII and snapshot hash
 * before sending a locked or private proposal response to an unauthorized client.
 */
export function sanitizePublicProposalWhenLocked<T extends RedactableProposalLike>(
  dto: T,
  lockReason: ProposalLockReason,
): T {
  return {
    ...dto,
    id: dto.public_token,
    store_id: null,
    quote_id: dto.public_token,
    lead_id: null,
    customer_id: null,
    client_name: lockReason === "pin_required" ? dto.client_name : "",
    client_whatsapp: "",
    client_email: null,
    client_document: null,
    subtitle: null,
    cover_image_url: lockReason === "pin_required" ? dto.cover_image_url || null : null,
    travel_start_date: null,
    travel_end_date: null,
    flights: [],
    hotels: [],
    itinerary: [],
    transfers: [],
    tours: [],
    rooms: [],
    includes: [],
    excludes: [],
    pricing: {
      currency: "BRL",
      base_price_cents: 0,
      boarding_tax_cents: 0,
      other_taxes_cents: 0,
      discount_cents: 0,
      total_price_cents: 0,
      total_cents: 0,
      installments_options: [],
    },
    custom_fields: {},
    options: [],
    ai_sales_advisor_enabled: false,
    ai_sales_advisor_prompt: null,
    special_notes: null,
    access_pin: null,
    snapshot_hash: null,
    acceptance_status: null,
    canonical_status: null,
    accepted_option_id: null,
    access_locked: true,
    lock_reason: lockReason,
  };
}

/**
 * Normaliza qualquer string de validade informada no Studio (ISO, YYYY-MM-DD, DD/MM/YYYY ou vazia)
 * para ISO 8601 UTC aceito com segurança pelo Postgres TIMESTAMPTZ, evitando falhas SQL 22007.
 */
export function normalizeProposalValidUntilIso(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const trimmed = String(raw).trim();
  if (!trimmed) return null;

  const brMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?$/);
  if (brMatch) {
    const day = Number(brMatch[1]);
    const month = Number(brMatch[2]);
    const year = Number(brMatch[3]);
    const hours = brMatch[4] ? Number(brMatch[4]) : 23;
    const mins = brMatch[5] ? Number(brMatch[5]) : 59;
    const d = new Date(Date.UTC(year, month - 1, day, hours, mins, 59, 0));
    if (
      d.getUTCFullYear() === year &&
      d.getUTCMonth() === month - 1 &&
      d.getUTCDate() === day
    ) {
      return d.toISOString();
    }
    return null;
  }

  const isoDateOnly = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoDateOnly) {
    const year = Number(isoDateOnly[1]);
    const month = Number(isoDateOnly[2]);
    const day = Number(isoDateOnly[3]);
    const d = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 0));
    if (
      d.getUTCFullYear() === year &&
      d.getUTCMonth() === month - 1 &&
      d.getUTCDate() === day
    ) {
      return d.toISOString();
    }
    return null;
  }

  const relativeHours = trimmed.match(/^at[eé]\s+(\d+)\s*h/i);
  if (relativeHours) {
    const h = Number(relativeHours[1]);
    if (Number.isFinite(h) && h > 0 && h <= 720) {
      return new Date(Date.now() + h * 3600_000).toISOString();
    }
  }

  const parsedMs = Date.parse(trimmed);
  return Number.isFinite(parsedMs) ? new Date(parsedMs).toISOString() : null;
}
