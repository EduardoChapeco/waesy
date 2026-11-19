/**
 * @fileoverview Utilitarios puros de normalizacao e variacoes de telefone (BR / E.164).
 * Reutilizado por CRM, Chat e Webhooks WhatsApp para auto-vinculacao deterministica
 * de Leads <-> Conversas mesmo quando ha diferenca de DDI (+55) ou 9o digito movel.
 */

export function sanitizePhoneDigits(raw?: string | null): string {
  return String(raw || "")
    .replace(/@.*$/, "")
    .replace(/\D/g, "");
}

/**
 * Gera todas as variacoes plausiveis para matching no Postgres (`eq` / `in`)
 * sem cruzar com identificadores sinteticos `@lid` nem strings curtas (< 8 digitos).
 */
export function buildBrazilPhoneVariants(raw?: string | null): string[] {
  const input = String(raw || "").trim();
  if (!input || input.toLowerCase().endsWith("@lid") || input.toLowerCase().endsWith("@g.us")) {
    return [];
  }
  const digits = sanitizePhoneDigits(input);
  if (digits.length < 8 || digits.length > 15) return [];

  const set = new Set<string>();
  const add = (val: string) => {
    const clean = val.trim();
    if (clean.length >= 8) set.add(clean);
  };

  add(input);
  add(digits);
  add(`+${digits}`);

  // Variacoes BR com e sem 55 / com e sem 9o digito movel
  const without55 = digits.startsWith("55") && digits.length >= 12 ? digits.slice(2) : digits;
  add(without55);
  add(`55${without55}`);
  add(`+55${without55}`);

  if (without55.length === 11 && without55[2] === "9") {
    const ddd = without55.slice(0, 2);
    const body = without55.slice(3);
    add(`${ddd}${body}`);
    add(`55${ddd}${body}`);
    add(`+55${ddd}${body}`);
  } else if (without55.length === 10 && /^[6-9]/.test(without55[2] || "")) {
    const ddd = without55.slice(0, 2);
    const body = without55.slice(2);
    add(`${ddd}9${body}`);
    add(`55${ddd}9${body}`);
    add(`+55${ddd}9${body}`);
  }

  return Array.from(set);
}
