/**
 * Helpers isomorficos puros para normalizacao de MIME, data URIs e extensoes de midia WhatsApp.
 * Seguro para importacao em rotas client, Server Functions e adaptadores .server.ts.
 */

export interface ParsedDataUri {
  mimeType: string;
  base64Data: string;
  rawUri: string;
}

/**
 * Faz o parse seguro de uma data URI, inclusive com parametros extras como:
 * `data:audio/ogg; codecs=opus;base64,...`
 */
export function parseMediaDataUri(uri: string, fallbackMime = "audio/ogg"): ParsedDataUri | null {
  const trimmed = String(uri || "").trim();
  if (!trimmed.startsWith("data:")) return null;

  const commaIdx = trimmed.indexOf(",");
  if (commaIdx === -1) return null;

  const header = trimmed.slice(5, commaIdx);
  const base64Data = trimmed.slice(commaIdx + 1).replace(/\s+/g, "");
  if (!base64Data) return null;

  const mainType = header.split(";")[0]?.trim().toLowerCase() || fallbackMime;
  return {
    mimeType: mainType,
    base64Data,
    rawUri: trimmed,
  };
}

/** Remove o prefixo `data:...;base64,` quando o gateway externo (Evolution API) exige string base64 pura. */
export function stripDataUriPrefixForGateway(source: string): string {
  const trimmed = String(source || "").trim();
  if (!trimmed.startsWith("data:")) return trimmed;
  const commaIdx = trimmed.indexOf(",");
  if (commaIdx === -1) return trimmed;
  return trimmed.slice(commaIdx + 1).replace(/\s+/g, "");
}

/** Garante data URI bem-formada com o MIME real da midia (nunca rotula audio como image/webp). */
export function normalizeMediaDataUri(rawBase64OrUri: string, preferredMime?: string | null, messageType?: string | null): string | null {
  const raw = String(rawBase64OrUri || "").trim();
  if (!raw) return null;

  const defaultMime = resolveDefaultMimeByMessageType(messageType);
  if (raw.startsWith("data:")) {
    const parsed = parseMediaDataUri(raw, preferredMime || defaultMime);
    if (!parsed) return null;
    if (messageType === "audio" && parsed.mimeType.startsWith("image/")) {
      return `data:${defaultMime};base64,${parsed.base64Data}`;
    }
    return `data:${preferredMime?.trim() || parsed.mimeType};base64,${parsed.base64Data}`;
  }

  const mime = (preferredMime && preferredMime.trim()) || defaultMime;
  if (messageType === "audio" && mime.startsWith("image/")) {
    return `data:${defaultMime};base64,${raw.replace(/\s+/g, "")}`;
  }
  return `data:${mime};base64,${raw.replace(/\s+/g, "")}`;
}

export function resolveDefaultMimeByMessageType(messageType?: string | null): string {
  switch ((messageType || "").toLowerCase()) {
    case "audio":
      return "audio/ogg";
    case "video":
      return "video/mp4";
    case "image":
    case "image_attachment":
      return "image/jpeg";
    case "document":
      return "application/pdf";
    case "sticker":
      return "image/webp";
    default:
      return "application/octet-stream";
  }
}

export function resolveWhisperExtensionAndMime(rawMime: string): { ext: string; normalizedMime: string } {
  const mime = String(rawMime || "").split(";")[0]?.trim().toLowerCase() || "audio/ogg";
  if (mime.includes("webm")) return { ext: "webm", normalizedMime: "audio/webm" };
  if (mime.includes("mp4") || mime.includes("m4a") || mime.includes("aac")) {
    return { ext: "m4a", normalizedMime: "audio/mp4" };
  }
  if (mime.includes("mpeg") || mime.includes("mp3")) return { ext: "mp3", normalizedMime: "audio/mpeg" };
  if (mime.includes("wav")) return { ext: "wav", normalizedMime: "audio/wav" };
  if (mime.includes("flac")) return { ext: "flac", normalizedMime: "audio/flac" };
  return { ext: "ogg", normalizedMime: "audio/ogg" };
}

/** Verifica se a URI de midia esta ausente, expirada (`mmg.whatsapp.net`) ou corrompida por tipo trocado. */
export function isBrokenOrMissingMediaUri(uri: string | null | undefined, messageType?: string | null): boolean {
  const trimmed = String(uri || "").trim();
  if (!trimmed) return true;
  if (trimmed.includes("mmg.whatsapp.net")) return true;
  if (messageType === "audio" && trimmed.startsWith("data:image/")) return true;
  return false;
}
