/**
 * Regras puras e transições de domínio para o Cofre de Contratos,
 * Rastreamento de Envelopes, Cancelamento e Pastas Multi-Tenant.
 */

const LEGAL_BUCKET_SEGMENT_RE =
  /\/storage\/v1\/object\/(?:sign|public|authenticated)\/legal-documents\/([^?#]+)/i;

/**
 * Extrai a chave canônica do objeto dentro do bucket privado `legal-documents`
 * a partir de uma URL assinada antiga, caminho com prefixo ou path relativo.
 */
export function normalizeLegalDocumentStoragePath(
  rawUrlOrPath: string | null | undefined,
): string | null {
  const value = (rawUrlOrPath || "").trim();
  if (!value) return null;

  const bucketMatch = value.match(LEGAL_BUCKET_SEGMENT_RE);
  if (bucketMatch?.[1]) {
    try {
      return decodeURIComponent(bucketMatch[1]).replace(/^\/+/, "");
    } catch {
      return bucketMatch[1].replace(/^\/+/, "");
    }
  }

  if (value.startsWith("legal-documents/")) {
    return value.slice("legal-documents/".length).replace(/^\/+/, "");
  }

  if (/^https?:\/\//i.test(value)) {
    return null;
  }

  return value.replace(/^\/+/, "");
}

/**
 * Indica se o endereço de origem aponta para uma URL HTTP externa (não gerenciada pelo bucket privado).
 */
export function isExternalHttpUrl(rawUrlOrPath: string | null | undefined): boolean {
  const value = (rawUrlOrPath || "").trim();
  if (!value || !/^https?:\/\//i.test(value)) return false;
  return !LEGAL_BUCKET_SEGMENT_RE.test(value);
}

/**
 * Resolve a transição idempotente ao abrir um envelope público (`/assinar/$token`).
 * Preserva permanentemente status terminais (`signed`, `declined`, `cancelled`).
 */
export function resolveViewedStatusTransition(
  currentStatus: string | null | undefined,
  alreadyViewedAt: string | null | undefined,
): { shouldMarkViewed: boolean; nextStatus: string } {
  const normalized = (currentStatus || "pending").trim().toLowerCase();
  const isTerminal =
    normalized === "signed" || normalized === "declined" || normalized === "cancelled";

  if (isTerminal) {
    return { shouldMarkViewed: false, nextStatus: normalized };
  }

  const nextStatus = normalized === "pending" ? "viewed" : normalized;
  const shouldMarkViewed = !alreadyViewedAt || normalized === "pending";
  return { shouldMarkViewed, nextStatus };
}

/**
 * Garante que apenas minutas abertas ou em coleta possam ser canceladas.
 */
export function assertContractCancellable(currentStatus: string | null | undefined): void {
  const normalized = (currentStatus || "").trim().toLowerCase();
  if (normalized === "signed" || normalized === "completed") {
    throw new Error("Contratos já assinados e concluídos não podem ser cancelados.");
  }
  if (normalized === "cancelled") {
    throw new Error("Este contrato já encontra-se cancelado.");
  }
}

/**
 * Converte o telefone informado para formato numérico WhatsApp/E.164 consistente.
 */
export function normalizeBrazilPhoneE164(phone: string | null | undefined): string | null {
  const digits = (phone || "").replace(/\D/g, "");
  if (digits.length < 10) return null;
  if (digits.startsWith("55") && digits.length >= 12) return `+${digits}`;
  if (digits.length <= 11) return `+55${digits}`;
  return `+${digits}`;
}

/**
 * Monta links canônicos de assinatura pública e mensagem de WhatsApp para envio ou lembrete.
 */
export function buildContractSigningUrls(params: {
  signingToken: string;
  documentTitle: string;
  signerName: string;
  signerPhone?: string | null;
  origin?: string;
  isReminder?: boolean;
}) {
  const signingUrl = `/assinar/${params.signingToken}`;
  const baseOrigin = (params.origin || "https://waesy.com.br").replace(/\/+$/, "");
  const fullUrl = `${baseOrigin}${signingUrl}`;
  const firstName = (params.signerName || "Signatário").trim().split(/\s+/)[0] || "Signatário";
  const actionLine = params.isReminder
    ? `Lembrete: o documento "${params.documentTitle}" aguarda sua assinatura eletrônica:`
    : `Olá ${firstName}, seu documento "${params.documentTitle}" está pronto para assinatura eletrônica jurídica:`;
  const waMessage = `${actionLine}\n\n${fullUrl}\n\nAbra o link para revisar e assinar em poucos toques.`;
  const normalizedPhone = normalizeBrazilPhoneE164(params.signerPhone);
  const waDigits = normalizedPhone ? normalizedPhone.replace(/\D/g, "") : "";
  const manualWhatsappUrl = waDigits
    ? `https://wa.me/${waDigits}?text=${encodeURIComponent(waMessage)}`
    : null;

  return {
    signingUrl,
    fullUrl,
    normalizedPhone,
    waMessage,
    manualWhatsappUrl,
  };
}

/**
 * Rótulo unificado para status de contratos (`signed` e `completed` representam Assinado).
 */
export function formatContractStatusLabel(status: string | null | undefined): string {
  switch ((status || "").toLowerCase()) {
    case "signed":
    case "completed":
      return "Assinado";
    case "signing":
    case "awaiting_signatures":
      return "Aguardando Assinaturas";
    case "draft":
      return "Rascunho";
    case "cancelled":
      return "Cancelado";
    case "expired":
      return "Expirado";
    default:
      return status || "Desconhecido";
  }
}

export function isContractSignedOrCompleted(status: string | null | undefined): boolean {
  const s = (status || "").toLowerCase();
  return s === "signed" || s === "completed";
}
