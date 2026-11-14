/**
 * Utilitários puros para classificação universal de arquivos, MIME types,
 * captura via Ctrl+V (clipboard), detecção de arraste externo e proteção contra `@lid`.
 */

export type ChatAttachmentKind = "image" | "gif" | "video" | "audio" | "document";

export type OutboundChatMediaType = "image" | "video" | "audio" | "document";

export interface ClassifiedChatFile {
  kind: ChatAttachmentKind;
  outboundMessageType: OutboundChatMediaType;
  mimeType: string;
  extension: string;
  label: string;
}

const MIME_TO_EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
  "image/svg+xml": "svg",
  "image/bmp": "bmp",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
  "video/x-matroska": "mkv",
  "video/x-msvideo": "avi",
  "video/3gpp": "3gp",
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/ogg": "ogg",
  "audio/opus": "opus",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/webm": "weba",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "audio/aac": "aac",
  "application/pdf": "pdf",
  "text/plain": "txt",
  "text/csv": "csv",
  "text/rtf": "rtf",
  "application/rtf": "rtf",
  "application/json": "json",
  "application/xml": "xml",
  "text/xml": "xml",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "application/zip": "zip",
  "application/x-zip-compressed": "zip",
  "application/vnd.rar": "rar",
  "application/x-rar-compressed": "rar",
  "application/x-7z-compressed": "7z",
};

const EXTENSION_TO_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
  svg: "image/svg+xml",
  bmp: "image/bmp",
  mp4: "video/mp4",
  m4v: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  mkv: "video/x-matroska",
  avi: "video/x-msvideo",
  "3gp": "video/3gpp",
  mp3: "audio/mpeg",
  ogg: "audio/ogg",
  opus: "audio/opus",
  wav: "audio/wav",
  weba: "audio/webm",
  m4a: "audio/mp4",
  aac: "audio/aac",
  pdf: "application/pdf",
  txt: "text/plain",
  log: "text/plain",
  md: "text/plain",
  csv: "text/csv",
  rtf: "application/rtf",
  json: "application/json",
  xml: "application/xml",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  zip: "application/zip",
  rar: "application/vnd.rar",
  "7z": "application/x-7z-compressed",
};

const SAFE_EXTENSION_RE = /^[a-z0-9]{1,10}$/;

/** Extrai extensão segura em minúsculas a partir do nome de arquivo. */
export function extractSafeExtension(fileName?: string | null): string | null {
  if (!fileName) return null;
  const trimmed = fileName.trim();
  const lastDot = trimmed.lastIndexOf(".");
  if (lastDot < 0 || lastDot === trimmed.length - 1) return null;
  const candidate = trimmed.slice(lastDot + 1).toLowerCase();
  return SAFE_EXTENSION_RE.test(candidate) ? candidate : null;
}

/** Resolve o MIME normalizado combinando contentType e extensão do arquivo quando necessário. */
export function resolveNormalizedMimeType(contentType?: string | null, fileName?: string | null): string {
  const cleanType = (contentType || "").toLowerCase().split(";")[0].trim();
  if (cleanType && cleanType !== "application/octet-stream") {
    return cleanType;
  }
  const ext = extractSafeExtension(fileName);
  if (ext && EXTENSION_TO_MIME[ext]) {
    return EXTENSION_TO_MIME[ext];
  }
  return cleanType || "application/octet-stream";
}

/** Resolve a extensão padrão de armazenamento para um MIME type e nome de arquivo. */
export function extensionForMime(contentType: string, fileName?: string | null): string {
  const normalized = resolveNormalizedMimeType(contentType, fileName);
  if (MIME_TO_EXTENSION[normalized]) {
    return MIME_TO_EXTENSION[normalized];
  }
  const ext = extractSafeExtension(fileName);
  if (ext && EXTENSION_TO_MIME[ext]) {
    return ext;
  }
  return "bin";
}

/** Classifica qualquer arquivo para exibição no compositor e disparo omnichannel. */
export function classifyChatFile(file: {
  name?: string | null;
  type?: string | null;
}): ClassifiedChatFile {
  const mimeType = resolveNormalizedMimeType(file.type, file.name);
  const extension = extensionForMime(mimeType, file.name);

  if (mimeType === "image/gif" || extension === "gif") {
    return {
      kind: "gif",
      outboundMessageType: "image",
      mimeType: "image/gif",
      extension: "gif",
      label: "GIF",
    };
  }
  if (mimeType.startsWith("image/")) {
    return {
      kind: "image",
      outboundMessageType: "image",
      mimeType,
      extension,
      label: "Imagem",
    };
  }
  if (mimeType.startsWith("video/")) {
    return {
      kind: "video",
      outboundMessageType: "video",
      mimeType,
      extension,
      label: "Vídeo",
    };
  }
  if (mimeType.startsWith("audio/")) {
    return {
      kind: "audio",
      outboundMessageType: "audio",
      mimeType,
      extension,
      label: "Áudio",
    };
  }
  if (mimeType === "application/pdf" || extension === "pdf") {
    return {
      kind: "document",
      outboundMessageType: "document",
      mimeType: "application/pdf",
      extension: "pdf",
      label: "PDF",
    };
  }
  if (extension === "xlsx" || extension === "xls" || extension === "csv") {
    return {
      kind: "document",
      outboundMessageType: "document",
      mimeType,
      extension,
      label: "Planilha",
    };
  }
  return {
    kind: "document",
    outboundMessageType: "document",
    mimeType,
    extension,
    label: extension !== "bin" ? extension.toUpperCase() : "Arquivo",
  };
}

/** Formata tamanho de arquivo para leitura compacta no compositor. */
export function formatAttachmentBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Extrai e normaliza arquivos reais da área de transferência (Ctrl+V). */
export function extractFilesFromClipboardData(
  clipboardData: Pick<DataTransfer, "items" | "files"> | null | undefined,
): File[] {
  if (!clipboardData) return [];
  const collected: File[] = [];
  const seenKeys = new Set<string>();
  const stamp = Date.now();

  const pushUnique = (rawFile: File | null, index: number) => {
    if (!rawFile || rawFile.size <= 0) return;
    const rawName = (rawFile.name || "").trim();
    const isGenericImage = !rawName || rawName === "image.png" || rawName === "blob";
    const ext = extensionForMime(rawFile.type || "application/octet-stream", rawName);
    const resolvedName = isGenericImage ? `colado-${stamp}-${index + 1}.${ext}` : rawName;
    const file =
      resolvedName === rawName
        ? rawFile
        : new File([rawFile], resolvedName, {
            type: rawFile.type || resolveNormalizedMimeType("", resolvedName),
            lastModified: rawFile.lastModified || stamp,
          });
    const key = `${file.name}:${file.size}:${file.type}:${file.lastModified}`;
    if (seenKeys.has(key)) return;
    seenKeys.add(key);
    collected.push(file);
  };

  if (clipboardData.items) {
    for (let i = 0; i < clipboardData.items.length; i += 1) {
      const item = clipboardData.items[i];
      if (item && item.kind === "file") {
        pushUnique(item.getAsFile(), i);
      }
    }
  }
  if (clipboardData.files) {
    for (let i = 0; i < clipboardData.files.length; i += 1) {
      pushUnique(clipboardData.files[i], i);
    }
  }
  return collected;
}

/** Verifica se o evento DragEvent carrega arquivos externos reais (evita disparar ao arrastar texto). */
export function hasExternalFilesInDragEvent(
  dataTransfer: Pick<DataTransfer, "types" | "items"> | null | undefined,
): boolean {
  if (!dataTransfer) return false;
  const types = Array.from(dataTransfer.types || []);
  if (types.includes("Files") || types.includes("application/x-moz-file")) {
    return true;
  }
  if (dataTransfer.items) {
    for (let i = 0; i < dataTransfer.items.length; i += 1) {
      if (dataTransfer.items[i]?.kind === "file") return true;
    }
  }
  return false;
}

/** Detecta se o identificador/telefone é um Meta `@lid` sintético (sem telefone E164 real). */
export function isSyntheticMetaLid(
  entityId?: string | null,
  phone?: string | null,
  metadata?: Record<string, unknown> | null,
): boolean {
  const eid = String(entityId || "").trim();
  const waJid = typeof metadata?.whatsapp_jid === "string" ? metadata.whatsapp_jid.trim() : "";
  const remoteJid = typeof metadata?.remote_jid === "string" ? metadata.remote_jid.trim() : "";
  const waAlt = typeof metadata?.whatsapp_jid_alt === "string" ? metadata.whatsapp_jid_alt.trim() : "";
  const digits = String(phone || "").replace(/\D/g, "");
  const eidDigits = eid.replace(/\D/g, "");

  if (waAlt && !waAlt.endsWith("@lid")) {
    const altDigits = waAlt.replace(/@.*$/, "").replace(/\D/g, "");
    if (altDigits && digits && digits === altDigits && altDigits.length <= 13) return false;
  }
  if (metadata?.is_lid === true) {
    if (!digits || digits.length >= 14 || digits === eidDigits) return true;
  }
  if (eid.endsWith("@lid") || waJid.endsWith("@lid") || remoteJid.endsWith("@lid")) {
    const lidSource = waJid.endsWith("@lid") ? waJid : remoteJid.endsWith("@lid") ? remoteJid : eid;
    const lidDigits = lidSource.replace(/@.*$/, "").replace(/\D/g, "");
    if (!digits || digits === lidDigits || digits === eidDigits || digits.length >= 14) return true;
  }
  if (!eid.includes("@g.us") && !eid.includes("@newsletter")) {
    if (eidDigits.length >= 14) return true;
    if (digits.length >= 14) return true;
  }
  return false;
}

/** Verifica se um nome de contato é apenas um LID numérico bruto ou email sintético. */
export function isRawLidOrSyntheticName(
  name?: string | null,
  entityId?: string | null,
  metadata?: Record<string, unknown> | null,
): boolean {
  const trimmed = String(name || "").trim();
  if (!trimmed) return true;
  if (/@(grupo\.)?whatsap/i.test(trimmed)) return true;
  const clean = trimmed.replace(/^whatsapp\s+/i, "").trim();
  const onlyDigits = clean.replace(/\D/g, "");
  if (/^\+?\d{14,}$/.test(clean)) return true;
  if (onlyDigits.length >= 14 && clean.replace(/[\d+\s()-]/g, "").length === 0) return true;
  if (isSyntheticMetaLid(entityId, clean, metadata) && /^\+?\d+$/.test(clean)) return true;
  return false;
}
