/**
 * @fileoverview Utilitarios puros de higienizacao de contatos, e-mails sinteticos e JIDs WhatsApp.
 * Unica fonte de verdade para BFF, webhook, sync e UI (zero vazamento de placeholders).
 */

const SYNTHETIC_EMAIL_SUFFIXES = [
  "@sem-email.waesy.local",
  "@whatsapp.waesy",
  "@grupo.whatsapp.waesy",
  "@waesy.local",
] as const;

/**
 * Retorna true quando o valor corresponde a um e-mail tecnico/placeholder
 * gerado internamente para contatos sem e-mail real informado.
 */
export function isSyntheticPlaceholderEmail(email?: string | null): boolean {
  const clean = String(email || "").trim().toLowerCase();
  if (!clean) return true;
  if (SYNTHETIC_EMAIL_SUFFIXES.some((suffix) => clean.endsWith(suffix))) {
    return true;
  }
  return /@(grupo\.)?whatsap/i.test(clean);
}

/**
 * Retorna o e-mail limpo ou `null` caso seja vazio, invalido ou sintetico.
 */
export function sanitizeCustomerEmail(email?: string | null): string | null {
  const clean = String(email || "").trim();
  if (!clean || !clean.includes("@")) return null;
  if (isSyntheticPlaceholderEmail(clean)) return null;
  return clean;
}

/**
 * Identifica se o JID, entity_id ou conjunto de metadados representa estritamente um Grupo WhatsApp.
 */
export function isWhatsAppGroupIdentifier(
  jidOrEntity?: string | null,
  metadata?: Record<string, unknown> | null,
  threadType?: string | null,
): boolean {
  if (threadType === "group") return true;
  if (metadata && Boolean((metadata as Record<string, unknown>).is_group)) return true;
  const raw = String(jidOrEntity || "").trim().toLowerCase();
  if (!raw) return false;
  if (raw.includes("@g.us")) return true;
  const digits = raw.replace(/\D/g, "");
  return /^120363\d{10,}$/.test(digits);
}

/**
 * Identifica se o JID ou thread representa estritamente um Canal/Newsletter WhatsApp.
 */
export function isWhatsAppChannelIdentifier(
  jidOrEntity?: string | null,
  metadata?: Record<string, unknown> | null,
  threadType?: string | null,
): boolean {
  if (threadType === "channel") return true;
  if (metadata && Boolean((metadata as Record<string, unknown>).is_channel)) return true;
  const raw = String(jidOrEntity || "").trim().toLowerCase();
  return raw.includes("@newsletter");
}

/**
 * Evita rotulos autorreferenciais ("Você", "Eu", "You") e IDs numericos de grupo como nome exibido.
 */
export function isWeakOrSelfDisplayLabel(name?: string | null): boolean {
  const clean = String(name || "").trim().toLowerCase();
  if (!clean) return true;
  if (["você", "voce", "you", "eu", "grupo whatsapp", "cliente"].includes(clean)) {
    return true;
  }
  const digits = clean.replace(/\D/g, "");
  return /^120363\d{10,}$/.test(digits);
}
