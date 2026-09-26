/**
 * Utilitário de Humanização de Mensagens de Erro — Waesy Platform
 *
 * Garante que o cliente final NUNCA visualize jargões técnicos de código
 * como "fetch_error", "null", "undefined", "PGRST116", "Internal Server Error", etc.
 * (Regra The Humanizer — UX Silenciosa e Respeitosa).
 */

const TECHNICAL_PATTERNS = [
  /fetch/i,
  /pgrst/i,
  /postgrest/i,
  /syntaxerror/i,
  /networkerror/i,
  /internal server/i,
  /500/i,
  /null/i,
  /undefined/i,
  /violates/i,
  /constraint/i,
  /foreign key/i,
  /column/i,
  /relation/i,
  /database/i,
  /supabase/i,
  /stack/i,
  /exception/i,
  /failed to fetch/i,
  /load failed/i,
];

/**
 * Sanitiza e humaniza mensagens de erro vindas de APIs ou rotinas assíncronas.
 */
export function humanizeErrorMessage(
  err: unknown,
  fallbackMessage: string = "Não foi possível carregar esta informação no momento. Tente novamente em instantes."
): string {
  if (!err) return fallbackMessage;

  const rawMessage = err instanceof Error ? err.message : typeof err === "string" ? err : String(err);
  const trimmed = rawMessage.trim();

  if (!trimmed) return fallbackMessage;

  // Verifica se contém qualquer jargão técnico proibido
  const hasTechnicalJargon = TECHNICAL_PATTERNS.some((pattern) => pattern.test(trimmed));

  if (hasTechnicalJargon) {
    return fallbackMessage;
  }

  // Se a mensagem for limpa e humana (ex: "Selecione um tamanho", "Cupom expirado"), preserva
  return trimmed;
}
