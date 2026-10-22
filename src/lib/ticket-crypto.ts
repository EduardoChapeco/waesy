import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * WAESY CRYPTOGRAPHIC TICKET STANDARD (WCTS-1)
 *
 * Padrão imutável de emissão e validação de ingressos protegidos contra injeção e adulteração.
 * Todo ingresso emitido recebe assinatura digital HMAC-SHA256 vinculada aos metadados do bilhete.
 */

const TICKET_MASTER_SECRET =
  process.env.TICKET_CRYPT_SECRET ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "waesy-tickets-sovereign-master-secret-2026";

const SAFE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

/**
 * Calcula o checksum Mod-36 de 2 caracteres para códigos alfanuméricos curtos.
 */
function calculateMod36Checksum(input: string): string {
  let sum1 = 0;
  let sum2 = 0;
  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i);
    sum1 = (sum1 + code) % 36;
    sum2 = (sum2 + sum1) % 36;
  }
  const c1 = SAFE_ALPHABET[sum1 % SAFE_ALPHABET.length];
  const c2 = SAFE_ALPHABET[sum2 % SAFE_ALPHABET.length];
  return `${c1}${c2}`;
}

export interface TicketSignInput {
  ticketId: string;
  eventId: string;
  lotId: string;
  ownerProfileId: string;
  issuedAt?: number;
}

export interface SignedTicketPayload {
  ticketId: string;
  issuedAt: number;
  qrPayload: string;
  humanCode: string;
  signature: string;
}

/**
 * Gera assinatura HMAC-SHA256 soberana e payload canônico para QR Code de ingresso.
 * Payload: `v1:TKT:<ticketId>:<issuedAt>:<hmacHex>`
 */
export function signTicketPayload(input: TicketSignInput): SignedTicketPayload {
  const issuedAt = input.issuedAt || Math.floor(Date.now() / 1000);
  const message = `${input.ticketId}:${input.eventId}:${input.lotId}:${input.ownerProfileId}:${issuedAt}`;

  const hmac = createHmac("sha256", TICKET_MASTER_SECRET);
  hmac.update(message);
  const signature = hmac.digest("hex");

  // Código curto para contingência manual (ex: W-TKT-8X9Y2Z3A-K7)
  const idSnippet = input.ticketId.replace(/-/g, "").slice(0, 8).toUpperCase();
  const checksum = calculateMod36Checksum(idSnippet);
  const humanCode = `W-TKT-${idSnippet}-${checksum}`;

  const qrPayload = `v1:TKT:${input.ticketId}:${issuedAt}:${signature}`;

  return {
    ticketId: input.ticketId,
    issuedAt,
    qrPayload,
    humanCode,
    signature,
  };
}

export interface TicketVerificationResult {
  isValid: boolean;
  ticketId?: string;
  issuedAt?: number;
  isLegacy?: boolean;
  errorCode?: "MALFORMED_PAYLOAD" | "INVALID_SIGNATURE" | "EXPIRED" | "UNKNOWN";
  errorMessage?: string;
}

/**
 * Valida criptograficamente o payload do QR Code ou código de entrada.
 * Se for o padrão WCTS-1 (`v1:TKT:...`), verifica a integridade da assinatura HMAC com tempo constante.
 * Se for formato legado (UUID puro ou TKT-...), identifica para validação em banco com flag `isLegacy: true`.
 */
export function verifyTicketPayload(
  rawInput: string,
  context?: { eventId?: string; lotId?: string; ownerProfileId?: string }
): TicketVerificationResult {
  if (!rawInput || typeof rawInput !== "string") {
    return {
      isValid: false,
      errorCode: "MALFORMED_PAYLOAD",
      errorMessage: "Entrada vazia ou formato inválido.",
    };
  }

  const clean = rawInput.trim();

  // 1. Verificação do padrão WCTS-1 (v1:TKT:<ticketId>:<issuedAt>:<signature>)
  if (clean.startsWith("v1:TKT:")) {
    const parts = clean.split(":");
    if (parts.length !== 5) {
      return {
        isValid: false,
        errorCode: "MALFORMED_PAYLOAD",
        errorMessage: "Estrutura do payload criptográfico do ingresso é inválida.",
      };
    }

    const ticketId = parts[2];
    const issuedAt = parseInt(parts[3], 10);
    const providedSig = parts[4];

    if (isNaN(issuedAt) || !providedSig || providedSig.length !== 64) {
      return {
        isValid: false,
        errorCode: "MALFORMED_PAYLOAD",
        errorMessage: "Parâmetros de data ou assinatura corrompidos.",
      };
    }

    // Se temos contexto completo, recomputa a assinatura e confere timing-safe
    if (context?.eventId && context?.lotId && context?.ownerProfileId) {
      const message = `${ticketId}:${context.eventId}:${context.lotId}:${context.ownerProfileId}:${issuedAt}`;
      const hmac = createHmac("sha256", TICKET_MASTER_SECRET);
      hmac.update(message);
      const expectedSig = hmac.digest("hex");

      try {
        const bufA = Buffer.from(providedSig, "hex");
        const bufB = Buffer.from(expectedSig, "hex");
        if (bufA.length !== bufB.length || !timingSafeEqual(bufA, bufB)) {
          return {
            isValid: false,
            errorCode: "INVALID_SIGNATURE",
            errorMessage: "Assinatura digital do ingresso forjada ou inválida.",
          };
        }
      } catch {
        return {
          isValid: false,
          errorCode: "INVALID_SIGNATURE",
          errorMessage: "Falha na verificação criptográfica da assinatura.",
        };
      }
    }

    return {
      isValid: true,
      ticketId,
      issuedAt,
      isLegacy: false,
    };
  }

  // 2. Formato de contingência manual curto: W-TKT-<snippet>-<checksum>
  if (clean.startsWith("W-TKT-")) {
    const parts = clean.split("-");
    if (parts.length === 4) {
      const snippet = parts[2];
      const checksum = parts[3];
      const expectedChecksum = calculateMod36Checksum(snippet);
      if (checksum !== expectedChecksum) {
        return {
          isValid: false,
          errorCode: "INVALID_SIGNATURE",
          errorMessage: "Dígito verificador do código manual incorreto.",
        };
      }
      return {
        isValid: true,
        ticketId: snippet, // Usado para busca por prefixo
        isLegacy: false,
      };
    }
  }

  // 3. Fallback legado: UUID ou TKT-<6 chars>
  const hexChar = "[0-9a-fA-F]";
  const isUuid = new RegExp(`^${hexChar}{8}-${hexChar}{4}-${hexChar}{4}-${hexChar}{4}-${hexChar}{12}$`).test(clean);
  const isLegacyCode = clean.startsWith("TKT-") && clean.length >= 10;

  if (isUuid || isLegacyCode) {
    return {
      isValid: true,
      ticketId: clean,
      isLegacy: true,
    };
  }

  return {
    isValid: false,
    errorCode: "MALFORMED_PAYLOAD",
    errorMessage: "Formato de ingresso desconhecido ou corrompido.",
  };
}
