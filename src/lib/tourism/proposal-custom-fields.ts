import {
  formatDynamicFieldLabel,
  normalizeCustomFieldMap,
  normalizeSlugKey,
} from "@/lib/niches/unified-field-bridge";
import { PROPOSAL_NICHE_CATALOG } from "@/lib/tourism/proposal-theme-palettes";

export const ALL_PROPOSAL_NICHE_SPEC_KEYS = Object.values(PROPOSAL_NICHE_CATALOG).flatMap((n) =>
  n.specFields.map((f) => f.key),
);

export const PROPOSAL_STUDIO_CONTROL_KEYS = new Set<string>([
  "canvas_bg_color",
  "canvas_brand_color",
  "canvas_font_preset",
  "hidden_sections",
  "section_visibility",
  "pricing_breakdown",
  "boarding_requirements",
  "cancellation_policy",
  "gateway_logistics",
  "destination_gallery_urls",
  "proposal_niche",
  "niche",
  "template",
  "theme",
  "palette",
  "accent_color",
  "agent_name",
  "agent_whatsapp",
  "agency_name",
  "agency_logo_url",
  "logo_shape",
  "logo_size",
  "logo_position",
  "logo_object_position",
  "logo_scale",
  "cover_object_position",
  "cover_scale",
  "cover_aspect_mode",
  "show_price_per_person",
  "show_price_per_adult",
  "show_price_per_room",
  "custom_price_per_person_cents",
  "transport_mode",
  "package_type",
  "remaining_spots",
  ...ALL_PROPOSAL_NICHE_SPEC_KEYS,
]);

/**
 * Campos estruturados de cotação/roteamento usados internamente ou já renderizados
 * em seções dedicadas da proposta — não devem poluir "Condições Comerciais".
 */
const PROPOSAL_DISPLAY_HIDDEN_ROUTING_KEYS = new Set<string>([
  "departure_city",
  "origin_city",
  "origin_iata",
  "destination_iata",
  "trip_type",
  "budget_tier",
  "flexible_dates",
  "rooms_count",
  "room_distribution",
  "interest_type",
  "canal_origem",
  "canal_de_origem",
  "origem_lead",
  "lead_origin",
]);

/**
 * Chaves estritamente internas de CRM/Kanban, atribuição, telemetria, saúde/LGPD e PII.
 * Nunca devem ser copiadas de leads para propostas nem exibidas ao cliente final.
 */
const INTERNAL_CRM_ONLY_CUSTOM_KEY_SLUGS = new Set<string>([
  // CRM workflow, dossiê, anexos e auditoria
  "checklist_groups",
  "checklist",
  "checklists",
  "comments",
  "internal_comments",
  "internal_notes",
  "attachments",
  "crm_attachments",
  "files",
  "history",
  "timeline",
  "activity_log",
  "consent_records",
  "last_consent_at",
  "lgpd_consent",
  "lgpd_accepted",
  "telemetry",
  "raw_payload",
  "internal_debug",
  "audit_logs",
  "device_fingerprint",
  "ip_address",
  "cf_ray",
  "threat_score",
  "deal_id",
  "quote_id",
  "quote_session_id",
  "lead_id",
  "customer_id",
  "trip_id",
  "source_deal_id",
  "source_quote_id",
  "source_submission_id",
  "source_form_id",
  "source_listing_id",
  "source_listing_origin",
  "stage_id",
  "pipeline_id",
  "stage_key",
  "kanban_column",
  "assignee_id",
  "owner_id",
  "assigned_to",
  "email_provided",
  "magic_token",
  "lost_reason",
  "payment_plan",
  "paymentplan",

  // Origem/atribuição e tracking de anúncios
  "source",
  "lead_source",
  "lead_source_detail",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "fbclid",
  "gclid",
  "gbraid",
  "wbraid",
  "ttclid",
  "fbp",
  "fbc",
  "referrer",
  "landing_page",
  "origin_url",

  // Dados sensíveis de saúde/acessibilidade e triagem interna de passageiros (LGPD)
  "pcd",
  "reduced_mobility",
  "mobilidade_reduzida",
  "autism_spectrum",
  "autism",
  "tea",
  "espectro_autista",
  "special_needs",
  "special_care",
  "cuidados_especiais",
  "health_notes",
  "medical_notes",
  "alergias",
  "allergies",
  "dietary_restrictions",
  "emergency_contact",
  "emergency_contact_name",
  "emergency_contact_phone",
  "emergency_contact_relationship",
  "acessibilidade",
  "bebes",
  "pax_infants",
  "infants",
  "adults",
  "children",
  "seniors",
  "pax_adults",
  "pax_children",
  "pax_seniors",
  "pax_count",
  "pax_list",
  "companions",
  "acompanhantes",
  "travelers",
  "traveler_dossiers",
  "interest_period",
  "desired_period",
  "periodo_desejado",

  // PII / Documentos quando indevidamente presentes em custom_fields
  "cpf",
  "cnpj",
  "rg",
  "document",
  "cpf_cnpj",
  "passport",
  "passport_number",
  "passport_expires_at",
  "birth_date",
  "data_nascimento",
  "cep",
  "zip_code",
  "address",
  "street",
  "neighborhood",
  "email",
  "phone",
  "whatsapp",
  "phone_e164",
]);

const INTERNAL_SENSITIVE_KEY_PATTERN =
  /(secret|password|pin|token|private|cost|margin|net_cents|supplier|internal|api_key|checklist|attachment|comment|telemetry|consent|tracking|reduced_mobility|autism_spectrum|health_notes|magic_token|lead_source|quote_session|payment_plan)/i;

const STAFF_DOCUMENT_KEY_PATTERN = /(document|cpf)/i;

export function isStudioControlCustomKey(rawKey: string): boolean {
  const trimmed = String(rawKey || "").trim();
  const slug = normalizeSlugKey(trimmed);
  return PROPOSAL_STUDIO_CONTROL_KEYS.has(trimmed) || PROPOSAL_STUDIO_CONTROL_KEYS.has(slug);
}

export function isInternalCrmOrOperationalCustomKey(
  rawKey: string,
  options?: { allowDocumentForStaffStorage?: boolean },
): boolean {
  const slug = normalizeSlugKey(rawKey);
  if (!slug) return true;

  if (options?.allowDocumentForStaffStorage && (slug === "document" || slug === "cpf")) {
    return false;
  }

  if (isStudioControlCustomKey(rawKey)) {
    return false;
  }

  if (INTERNAL_CRM_ONLY_CUSTOM_KEY_SLUGS.has(slug)) {
    return true;
  }

  if (
    slug.startsWith("internal_") ||
    slug.startsWith("crm_") ||
    slug.startsWith("utm_") ||
    slug.startsWith("kanban_") ||
    slug.startsWith("pixel_") ||
    slug.startsWith("meta_") ||
    slug.startsWith("debug_") ||
    slug.startsWith("emergency_") ||
    slug.startsWith("passport_")
  ) {
    return true;
  }

  if (INTERNAL_SENSITIVE_KEY_PATTERN.test(slug)) {
    return true;
  }

  if (!options?.allowDocumentForStaffStorage && STAFF_DOCUMENT_KEY_PATTERN.test(slug)) {
    return true;
  }

  return false;
}

export function isSerializedInternalCrmBlob(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "object") return true;
  if (typeof value !== "string") return false;

  const trimmed = value.trim();
  if (!trimmed) return false;

  if (
    /\bId:\s*(?:comm-|default-checklist|item-)/i.test(trimmed) ||
    /\|\s*Done:\s*(?:Sim|N[aã]o)\b/i.test(trimmed) ||
    /\|\s*Author:\s*Sistema\b/i.test(trimmed) ||
    (/\bDate:\s*\d{2}\/\d{2}\/\d{4},\s*\d{2}:\d{2}/i.test(trimmed) && /\|\s*Text:/i.test(trimmed))
  ) {
    return true;
  }

  return false;
}

export function sanitizeProposalCustomFields(
  raw?: Record<string, unknown> | null,
  options?: {
    allowDocumentForStaffStorage?: boolean;
    extraBlockedKeys?: Iterable<string>;
  },
): Record<string, unknown> {
  const normalized = normalizeCustomFieldMap(raw);
  const extraBlocked = new Set(
    Array.from(options?.extraBlockedKeys ?? [], (k) => normalizeSlugKey(k)),
  );
  const out: Record<string, unknown> = {};

  for (const [rawKey, rawVal] of Object.entries(normalized)) {
    const safeKey = rawKey.trim().slice(0, 80);
    if (!safeKey) continue;
    const slug = normalizeSlugKey(safeKey);
    if (!slug || extraBlocked.has(slug)) continue;

    const studioKey = isStudioControlCustomKey(safeKey);

    if (
      !studioKey &&
      isInternalCrmOrOperationalCustomKey(safeKey, {
        allowDocumentForStaffStorage: options?.allowDocumentForStaffStorage,
      })
    ) {
      continue;
    }

    if (!studioKey) {
      if (
        typeof rawVal !== "string" &&
        typeof rawVal !== "number" &&
        typeof rawVal !== "boolean"
      ) {
        continue;
      }
      if (isSerializedInternalCrmBlob(rawVal)) {
        continue;
      }
    }

    out[safeKey] = rawVal;
  }

  return out;
}

export function sanitizeLeadCustomFieldsForProposal(
  raw?: Record<string, unknown> | null,
): Record<string, unknown> {
  return sanitizeProposalCustomFields(raw, {
    allowDocumentForStaffStorage: false,
  });
}

export function isEditableCustomFieldInProposalStudio(
  rawKey: string,
  value: unknown,
  studioReservedKeys?: ReadonlySet<string>,
): boolean {
  const slug = normalizeSlugKey(rawKey);
  if (!slug) return false;
  if (studioReservedKeys?.has(rawKey) || studioReservedKeys?.has(slug)) return false;
  if (isStudioControlCustomKey(rawKey)) return false;
  if (PROPOSAL_DISPLAY_HIDDEN_ROUTING_KEYS.has(slug)) return false;
  if (isInternalCrmOrOperationalCustomKey(rawKey, { allowDocumentForStaffStorage: false })) {
    return false;
  }
  if (isSerializedInternalCrmBlob(value)) return false;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed || trimmed.startsWith("{") || trimmed.startsWith("[")) return false;
  }
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean";
}

export interface ProposalCustomFieldEntry {
  key: string;
  label: string;
  value: string;
}

export function buildVisibleProposalCustomFieldEntries(
  raw?: Record<string, unknown> | null,
  extraHiddenKeys?: Iterable<string>,
): ProposalCustomFieldEntry[] {
  const sanitized = sanitizeProposalCustomFields(raw, {
    allowDocumentForStaffStorage: false,
  });
  const extraHidden = new Set(
    Array.from(extraHiddenKeys ?? [], (k) => normalizeSlugKey(k)),
  );

  const entries: ProposalCustomFieldEntry[] = [];
  for (const [key, value] of Object.entries(sanitized)) {
    const slug = normalizeSlugKey(key);
    if (!slug) continue;
    if (isStudioControlCustomKey(key)) continue;
    if (PROPOSAL_DISPLAY_HIDDEN_ROUTING_KEYS.has(slug)) continue;
    if (extraHidden.has(slug) || extraHidden.has(key)) continue;
    if (isSerializedInternalCrmBlob(value)) continue;

    if (typeof value === "boolean") {
      entries.push({
        key,
        label: formatDynamicFieldLabel(key),
        value: value ? "Sim" : "Não",
      });
      continue;
    }

    if (typeof value === "number") {
      if (!Number.isFinite(value)) continue;
      entries.push({
        key,
        label: formatDynamicFieldLabel(key),
        value: String(value),
      });
      continue;
    }

    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed || trimmed.startsWith("{") || trimmed.startsWith("[")) continue;
      entries.push({
        key,
        label: formatDynamicFieldLabel(key),
        value: trimmed,
      });
    }
  }

  return entries;
}

export function formatProposalPaymentTermsForDisplay(rawTerms?: string | null): string {
  const trimmed = String(rawTerms || "").trim();
  if (!trimmed) return "";

  const segments = trimmed
    .split(/\s*\|\s*/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (segments.length >= 2) {
    const hasHeading = /^condi[çc][õo]es de pagamento:/i.test(segments[0]);
    const formattedBullets = segments.map((seg) => `• ${seg}`).join("\n");
    return hasHeading ? formattedBullets : `Condições de Pagamento:\n${formattedBullets}`;
  }

  return trimmed;
}
