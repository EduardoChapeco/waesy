/**
 * Utilitário Canônico de Identificadores Humanos de Pedidos — Waesy Platform
 *
 * Gera identificadores curtos, memoráveis e elegantes no formato #WSY-9X2A.
 * Elimina o jargão técnico de UUIDs expostos ao cliente final (Design Silencioso Verbal).
 */

const AMBIGUOUS_CHARS = new Set(["0", "O", "1", "I", "L"]);
const CHARSET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"; // 31 caracteres legíveis sem confusão visual

/**
 * Gera um ID de pedido curto e memorável para comunicação humana e WhatsApp.
 * Exemplo: WSY-9X2A
 */
export function generateHumanOrderId(prefix: string = "WSY"): string {
  let suffix = "";
  for (let i = 0; i < 4; i++) {
    const idx = Math.floor(Math.random() * CHARSET.length);
    suffix += CHARSET[idx];
  }
  return `${prefix}-${suffix}`;
}

/**
 * Formata qualquer identificador (UUID, token ou shortId) no padrão amigável #WSY-XXXX.
 */
export function formatHumanOrderId(id?: string | null): string {
  if (!id) return "#WSY-0000";
  const trimmed = String(id).trim();
  if (trimmed.startsWith("#")) return trimmed;
  if (trimmed.startsWith("WSY-") || trimmed.startsWith("W-")) {
    return `#${trimmed}`;
  }
  // Se for UUID ou token longo, extrai 4 caracteres hexadecimais maiúsculos
  const clean = trimmed.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  if (clean.length >= 4) {
    return `#WSY-${clean.slice(0, 4)}`;
  }
  return `#WSY-${clean.padEnd(4, "X")}`;
}
