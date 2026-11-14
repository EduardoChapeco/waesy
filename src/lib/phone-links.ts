/**
 * Parser deterministico e seguro para detectar numeros de telefone dentro de mensagens
 * de texto no Atendimento WhatsApp e transforma-los em acoes interativas.
 */

export type PhoneTextSegment =
  | { type: "text"; value: string }
  | {
      type: "phone";
      raw: string;
      e164: string;
      digits: string;
      telHref: string;
    };

const PHONE_CANDIDATE_REGEX =
  /(?:^|[^\d\w])((?:\+\s*55\s*)?(?:\(?\d{2}\)?\s*)?(?:9\s*)?\d{4}[-\s.]?\d{4}|\+\d{1,3}[\s.-]?\(?\d{1,4}\)?[\s.-]?\d{3,5}[\s.-]?\d{3,5})(?=$|[^\d\w])/g;

/** Normaliza numero digitado pelo usuario ou encontrado em mensagem para formato E.164 (`+55...`). */
export function normalizeWhatsAppPhoneInput(raw: string): { e164: string; digits: string } | null {
  const digitsOnly = String(raw || "").replace(/\D/g, "");
  if (digitsOnly.length < 10 || digitsOnly.length > 15) return null;

  // Numero brasileiro sem DDI (10 digitos fixo/antigo ou 11 digitos celular com DDD)
  if ((digitsOnly.length === 10 || digitsOnly.length === 11) && !digitsOnly.startsWith("0")) {
    const withBr = `55${digitsOnly}`;
    return {
      e164: `+${withBr}`,
      digits: withBr,
    };
  }

  return {
    e164: `+${digitsOnly}`,
    digits: digitsOnly,
  };
}

/** Divide texto livre em segmentos textuais e numeros de telefone validos clicaveis. */
export function extractPhoneSegments(text: string): PhoneTextSegment[] {
  const source = String(text || "");
  if (!source) return [];

  const segments: PhoneTextSegment[] = [];
  let cursor = 0;

  for (const match of source.matchAll(PHONE_CANDIDATE_REGEX)) {
    const fullMatch = match[0] || "";
    const candidate = match[1] || "";
    const matchIndex = match.index ?? -1;
    if (matchIndex < 0 || !candidate) continue;

    const candidateOffsetInFull = fullMatch.indexOf(candidate);
    const startIdx = matchIndex + Math.max(0, candidateOffsetInFull);
    const endIdx = startIdx + candidate.length;

    // Ignorar datas comuns tipo 12-11-2026 ou valores decimais/protocolos longos
    const normalized = normalizeWhatsAppPhoneInput(candidate);
    if (!normalized) continue;
    const rawDigits = candidate.replace(/\D/g, "");
    if (rawDigits.length === 8 && !/^\d{4}[-\s]\d{4}$/.test(candidate.trim())) {
      continue;
    }
    if (/^\d{4}[-/]\d{2}[-/]\d{2}$/.test(candidate.trim())) continue;

    if (startIdx > cursor) {
      segments.push({ type: "text", value: source.slice(cursor, startIdx) });
    }

    segments.push({
      type: "phone",
      raw: candidate,
      e164: normalized.e164,
      digits: normalized.digits,
      telHref: `tel:${normalized.e164}`,
    });

    cursor = endIdx;
  }

  if (cursor < source.length) {
    segments.push({ type: "text", value: source.slice(cursor) });
  }

  return segments.length > 0 ? segments : [{ type: "text", value: source }];
}
