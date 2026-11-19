import { decryptSecret } from "@/lib/crypto-vault.server";
import { getEnvVar } from "@/lib/env";
import {
  normalizeMediaDataUri,
  parseMediaDataUri,
  resolveDefaultMimeByMessageType,
} from "@/lib/whatsapp-media-utils";

export const CHAT_MEDIA_PRIVATE_BUCKET = "chat-media-private";
const MAX_CHAT_MEDIA_UPLOAD_BYTES = 50 * 1024 * 1024;
const MAX_INLINE_DB_BASE64_CHARS = 5_500_000;

function sanitizeStorageSegment(raw: string, fallback = "media"): string {
  const clean = String(raw || "")
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 96);
  return clean || fallback;
}

export function resolveStorageExtensionForMime(mimetype?: string | null, messageType?: string | null): string {
  const mime = String(mimetype || "").split(";")[0]?.trim().toLowerCase() || "";
  if (mime.includes("ogg") || mime.includes("opus")) return "ogg";
  if (mime.includes("webm")) return "webm";
  if (mime.includes("mpeg") || mime.includes("mp3")) return "mp3";
  if (mime.includes("mp4") && mime.startsWith("audio/")) return "m4a";
  if (mime.includes("m4a") || mime.includes("aac")) return "m4a";
  if (mime.includes("wav")) return "wav";
  if (mime.includes("flac")) return "flac";
  if (mime.includes("mp4")) return "mp4";
  if (mime.includes("quicktime")) return "mov";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("png")) return "png";
  if (mime.includes("gif")) return "gif";
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
  if (mime.includes("pdf")) return "pdf";
  if (mime.includes("wordprocessingml")) return "docx";
  if (mime.includes("spreadsheetml")) return "xlsx";
  if (mime.includes("msword")) return "doc";
  if (mime.includes("plain")) return "txt";

  switch ((messageType || "").toLowerCase()) {
    case "audio":
      return "ogg";
    case "video":
      return "mp4";
    case "sticker":
      return "webp";
    case "document":
      return "pdf";
    case "image":
    case "image_attachment":
      return "jpg";
    default:
      return "bin";
  }
}

export interface UploadedChatMediaStorageResult {
  storageBucket: string;
  storagePath: string;
  signedUrl: string | null;
  byteSize: number;
}

/**
 * Persiste mídia de atendimento (áudio, vídeo, PDF, print) no bucket privado `chat-media-private`
 * isolado por pasta `{store_id}/{thread_id}/{file}` (RLS via workspace_members) e retorna Signed URL.
 */
export async function uploadChatMediaToPrivateStorage(params: {
  db: any;
  storeId: string;
  threadId?: string | null;
  messageId?: string | null;
  externalMessageId?: string | null;
  messageType?: string | null;
  mimetype?: string | null;
  rawBase64?: string | null;
  dataUri?: string | null;
  buffer?: Uint8Array | Buffer | null;
  fileName?: string | null;
}): Promise<UploadedChatMediaStorageResult | null> {
  const {
    db,
    storeId,
    threadId,
    messageId,
    externalMessageId,
    messageType,
    mimetype,
    rawBase64,
    dataUri,
    buffer,
    fileName,
  } = params;

  if (!storeId || !db?.storage || typeof db.storage.from !== "function") {
    return null;
  }

  let binaryBytes: Uint8Array | null = null;
  let resolvedMime = String(mimetype || "").split(";")[0]?.trim() || resolveDefaultMimeByMessageType(messageType);

  if (buffer && buffer.byteLength > 0) {
    binaryBytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  } else if (dataUri && dataUri.startsWith("data:")) {
    const parsed = parseMediaDataUri(dataUri, resolvedMime);
    if (parsed) {
      resolvedMime = parsed.mimeType || resolvedMime;
      binaryBytes = new Uint8Array(Buffer.from(parsed.base64Data, "base64"));
    }
  } else if (rawBase64) {
    const cleanB64 = rawBase64.startsWith("data:")
      ? (parseMediaDataUri(rawBase64, resolvedMime)?.base64Data || "")
      : rawBase64.replace(/\s+/g, "");
    if (cleanB64) {
      binaryBytes = new Uint8Array(Buffer.from(cleanB64, "base64"));
    }
  }

  if (!binaryBytes || binaryBytes.byteLength === 0 || binaryBytes.byteLength > MAX_CHAT_MEDIA_UPLOAD_BYTES) {
    return null;
  }

  const ext = resolveStorageExtensionForMime(resolvedMime, messageType);
  const rawBaseName = fileName
    ? sanitizeStorageSegment(fileName.replace(/\.[^.]+$/, ""), "arquivo")
    : sanitizeStorageSegment(externalMessageId || messageId || `msg_${Date.now()}`, "media");
  const storagePath = `${sanitizeStorageSegment(storeId, "store")}/${sanitizeStorageSegment(threadId || "general", "general")}/${rawBaseName}_${Date.now()}.${ext}`;

  try {
    const storageApi = db.storage.from(CHAT_MEDIA_PRIVATE_BUCKET);
    if (!storageApi || typeof storageApi.upload !== "function") return null;

    const { error: uploadError } = await storageApi.upload(storagePath, binaryBytes, {
      contentType: resolvedMime,
      upsert: true,
    });
    if (uploadError) {
      console.warn("[whatsapp-media] Falha ao subir mídia para chat-media-private:", uploadError.message);
      return null;
    }

    const signedUrl = await refreshSignedChatMediaUrl(db, CHAT_MEDIA_PRIVATE_BUCKET, storagePath, 3600);
    return {
      storageBucket: CHAT_MEDIA_PRIVATE_BUCKET,
      storagePath,
      signedUrl,
      byteSize: binaryBytes.byteLength,
    };
  } catch (err: any) {
    console.warn("[whatsapp-media] Exceção ao subir mídia privada:", err?.message);
    return null;
  }
}

/**
 * Gera uma Signed URL temporária (padrão 1h) para arquivos salvos em `chat-media-private`.
 */
export async function refreshSignedChatMediaUrl(
  db: any,
  storageBucket: string | null | undefined,
  storagePath: string | null | undefined,
  expiresInSeconds = 3600,
): Promise<string | null> {
  if (!db?.storage || typeof db.storage.from !== "function" || !storageBucket || !storagePath) {
    return null;
  }
  try {
    const bucket = db.storage.from(storageBucket);
    if (!bucket || typeof bucket.createSignedUrl !== "function") return null;
    const { data, error } = await bucket.createSignedUrl(storagePath, expiresInSeconds);
    if (error || !data?.signedUrl) return null;
    return String(data.signedUrl);
  } catch {
    return null;
  }
}

export async function downloadChatMediaBytesFromStorage(
  db: any,
  storageBucket: string | null | undefined,
  storagePath: string | null | undefined,
): Promise<{ buffer: Buffer; mimeType?: string } | null> {
  if (!db?.storage || typeof db.storage.from !== "function" || !storageBucket || !storagePath) {
    return null;
  }
  try {
    const bucket = db.storage.from(storageBucket);
    if (!bucket || typeof bucket.download !== "function") return null;
    const { data, error } = await bucket.download(storagePath);
    if (error || !data) return null;
    const arrayBuffer = typeof data.arrayBuffer === "function" ? await data.arrayBuffer() : null;
    if (!arrayBuffer) return null;
    return {
      buffer: Buffer.from(arrayBuffer),
      mimeType: typeof data.type === "string" && data.type ? data.type : undefined,
    };
  } catch {
    return null;
  }
}

export interface EvolutionInstanceRecord {
  id: string;
  store_id: string;
  provider?: string | null;
  instance_key: string;
  external_instance_id?: string | null;
  public_config?: Record<string, unknown> | null;
  secret_payload_encrypted?: string | null;
}

export function resolveEvolutionCredentialsForInstance(instance: EvolutionInstanceRecord | null | undefined): {
  baseUrl: string;
  apiKey: string;
  externalName: string;
} | null {
  if (!instance) return null;
  let secret: Record<string, unknown> = {};
  if (instance.secret_payload_encrypted) {
    try {
      secret = JSON.parse(decryptSecret(instance.secret_payload_encrypted)) as Record<string, unknown>;
    } catch {
      secret = {};
    }
  }

  const envUrl = String(getEnvVar("EVOLUTION_API_URL") || "").trim().replace(/\/$/, "");
  const envKey = String(getEnvVar("EVOLUTION_API_KEY") || "").trim();
  const configuredUrl = String(
    instance.public_config?.base_url || secret.base_url || envUrl || "",
  )
    .trim()
    .replace(/\/$/, "");
  const baseUrl =
    configuredUrl && !configuredUrl.includes("147.15.61.45")
      ? configuredUrl
      : envUrl;

  const apiKey = String(
    secret.api_key || secret.access_token || secret.token || envKey || "",
  ).trim();
  const externalName = String(instance.external_instance_id || instance.instance_key || "").trim();

  if (!baseUrl || !apiKey || !externalName) return null;
  return { baseUrl, apiKey, externalName };
}

export interface HydrateEvolutionMediaParams {
  db: any;
  storeId: string;
  instance?: EvolutionInstanceRecord | null;
  channelInstanceId?: string | null;
  threadId?: string | null;
  messageId?: string | null;
  externalMessageId: string;
  remoteJid?: string | null;
  fromMe?: boolean;
  messageType?: string | null;
  preferredMime?: string | null;
  persistToMessage?: boolean;
}

/**
 * Hidrata uma midia/audio real a partir da Evolution API usando preferencialmente
 * a instancia vinculada a thread (`channelInstanceId`) e envia a chave completa `{ id, remoteJid, fromMe }`.
 */
export async function hydrateMediaFromEvolution(params: HydrateEvolutionMediaParams): Promise<{
  dataUri: string;
  signedUrl?: string | null;
  storageBucket?: string | null;
  storagePath?: string | null;
  mimetype: string;
  instanceId: string;
} | null> {
  const {
    db,
    storeId,
    channelInstanceId,
    threadId,
    messageId,
    externalMessageId,
    remoteJid,
    fromMe,
    messageType,
    preferredMime,
    persistToMessage = true,
  } = params;

  if (!externalMessageId) return null;

  let resolvedInstance = params.instance || null;
  if (!resolvedInstance && channelInstanceId) {
    const { data: exactInst } = await db
      .from("whatsapp_channel_instances")
      .select("id, store_id, provider, instance_key, external_instance_id, public_config, secret_payload_encrypted")
      .eq("id", channelInstanceId)
      .eq("store_id", storeId)
      .eq("provider", "evolution_api")
      .maybeSingle();
    if (exactInst) resolvedInstance = exactInst as EvolutionInstanceRecord;
  }

  if (!resolvedInstance) {
    const { data: fallbackInst } = await db
      .from("whatsapp_channel_instances")
      .select("id, store_id, provider, instance_key, external_instance_id, public_config, secret_payload_encrypted")
      .eq("store_id", storeId)
      .eq("provider", "evolution_api")
      .eq("is_active", true)
      .order("is_default", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (fallbackInst) resolvedInstance = fallbackInst as EvolutionInstanceRecord;
  }

  const creds = resolveEvolutionCredentialsForInstance(resolvedInstance);
  if (!creds || !resolvedInstance) return null;

  const keyPayload: Record<string, unknown> = { id: externalMessageId };
  if (remoteJid && String(remoteJid).trim()) keyPayload.remoteJid = String(remoteJid).trim();
  if (typeof fromMe === "boolean") keyPayload.fromMe = fromMe;

  const response = await fetch(
    `${creds.baseUrl}/chat/getBase64FromMediaMessage/${encodeURIComponent(creds.externalName)}`,
    {
      method: "POST",
      headers: { apikey: creds.apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: { key: keyPayload },
        convertToMp4: false,
      }),
      signal: AbortSignal.timeout(12000),
    },
  ).catch(() => null);

  if (!response || !response.ok) return null;
  const json = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  const rawBase64 = String(json.base64 || json.data || "").trim();
  if (!rawBase64) return null;

  const fallbackMime = preferredMime || resolveDefaultMimeByMessageType(messageType);
  const evoMime = String(json.mimetype || json.mimeType || fallbackMime).trim() || fallbackMime;
  const mimetype = messageType === "audio" && evoMime.startsWith("image/") ? fallbackMime : evoMime;
  const dataUri = normalizeMediaDataUri(rawBase64, mimetype, messageType);
  if (!dataUri) return null;

  const canPersistInline = rawBase64.length <= MAX_INLINE_DB_BASE64_CHARS;
  const uploadedStorage = await uploadChatMediaToPrivateStorage({
    db,
    storeId,
    threadId,
    messageId,
    externalMessageId,
    messageType,
    mimetype,
    rawBase64,
  });
  const effectivePlayableUri = uploadedStorage?.signedUrl || (canPersistInline ? dataUri : null);

  if (persistToMessage) {
    let targetRow: { id: string; payload: unknown } | null = null;
    if (messageId) {
      const { data } = await db
        .from("chat_messages")
        .select("id, payload")
        .eq("id", messageId)
        .maybeSingle();
      targetRow = data;
    } else if (threadId && externalMessageId) {
      const { data } = await db
        .from("chat_messages")
        .select("id, payload")
        .eq("thread_id", threadId)
        .eq("external_message_id", externalMessageId)
        .maybeSingle();
      targetRow = data;
    }

    if (targetRow?.id) {
      const curPayload = (
        targetRow.payload && typeof targetRow.payload === "object" ? targetRow.payload : {}
      ) as Record<string, unknown>;
      const curMedia = (
        curPayload.media && typeof curPayload.media === "object" ? curPayload.media : {}
      ) as Record<string, unknown>;

      if (uploadedStorage) {
        await db
          .from("chat_messages")
          .update({
            attachments: [uploadedStorage.signedUrl || dataUri],
            payload: {
              ...curPayload,
              media: {
                ...curMedia,
                type: curMedia.type || messageType || "audio",
                url: uploadedStorage.signedUrl || dataUri,
                mimetype,
                storage_bucket: uploadedStorage.storageBucket,
                storage_path: uploadedStorage.storagePath,
                byte_size: uploadedStorage.byteSize,
                hydrated_at: new Date().toISOString(),
                media_size_guard: false,
              },
            },
          })
          .eq("id", targetRow.id);
      } else if (canPersistInline) {
        await db
          .from("chat_messages")
          .update({
            attachments: [dataUri],
            payload: {
              ...curPayload,
              media: {
                ...curMedia,
                type: curMedia.type || messageType || "audio",
                url: dataUri,
                mimetype,
              },
            },
          })
          .eq("id", targetRow.id);
      } else {
        await db
          .from("chat_messages")
          .update({
            payload: {
              ...curPayload,
              media: {
                ...curMedia,
                type: curMedia.type || messageType || "document",
                mimetype,
                media_size_guard: true,
              },
            },
          })
          .eq("id", targetRow.id);
      }
    }
  }

  return {
    dataUri: effectivePlayableUri || dataUri,
    signedUrl: uploadedStorage?.signedUrl || null,
    storageBucket: uploadedStorage?.storageBucket || null,
    storagePath: uploadedStorage?.storagePath || null,
    mimetype,
    instanceId: resolvedInstance.id,
  };
}

/**
 * Hidrata mídia da WhatsApp Cloud API (Meta Graph v21.0) via `mediaId` + `accessToken`,
 * gravando o binário no bucket privado `chat-media-private` e atualizando `chat_messages`.
 */
export async function hydrateMetaCloudMediaToStorage(params: {
  db: any;
  storeId: string;
  accessToken: string;
  mediaId: string;
  threadId: string;
  messageId: string;
  externalMessageId?: string | null;
  messageType?: string | null;
  preferredMime?: string | null;
  fileName?: string | null;
}): Promise<{
  playableUrl: string;
  signedUrl: string | null;
  storageBucket: string | null;
  storagePath: string | null;
  mimetype: string;
} | null> {
  const {
    db,
    storeId,
    accessToken,
    mediaId,
    threadId,
    messageId,
    externalMessageId,
    messageType,
    preferredMime,
    fileName,
  } = params;

  if (!accessToken || !mediaId || !messageId) return null;

  const metaInfoRes = await fetch(
    `https://graph.facebook.com/v21.0/${encodeURIComponent(mediaId)}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(10000),
    },
  ).catch(() => null);
  if (!metaInfoRes || !metaInfoRes.ok) return null;

  const metaJson = (await metaInfoRes.json().catch(() => ({}))) as { url?: string; mime_type?: string };
  const downloadUrl = typeof metaJson.url === "string" ? metaJson.url.trim() : "";
  if (!downloadUrl) return null;

  const binRes = await fetch(downloadUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(15000),
  }).catch(() => null);
  if (!binRes || !binRes.ok) return null;

  const arrayBuffer = await binRes.arrayBuffer();
  if (!arrayBuffer || arrayBuffer.byteLength === 0) return null;

  const buffer = new Uint8Array(arrayBuffer);
  const mimetype =
    String(metaJson.mime_type || binRes.headers.get("content-type") || preferredMime || resolveDefaultMimeByMessageType(messageType))
      .split(";")[0]
      .trim();

  const uploaded = await uploadChatMediaToPrivateStorage({
    db,
    storeId,
    threadId,
    messageId,
    externalMessageId: externalMessageId || mediaId,
    messageType,
    mimetype,
    buffer,
    fileName,
  });

  const dataUriFallback =
    !uploaded && buffer.byteLength <= 3_500_000
      ? `data:${mimetype};base64,${Buffer.from(buffer).toString("base64")}`
      : null;

  const playableUrl = uploaded?.signedUrl || dataUriFallback;
  if (!playableUrl) return null;

  const { data: msgRow } = await db
    .from("chat_messages")
    .select("id, payload")
    .eq("id", messageId)
    .maybeSingle();

  if (msgRow?.id) {
    const curPayload = (msgRow.payload && typeof msgRow.payload === "object" ? msgRow.payload : {}) as Record<string, unknown>;
    const curMedia = (curPayload.media && typeof curPayload.media === "object" ? curPayload.media : {}) as Record<string, unknown>;
    await db
      .from("chat_messages")
      .update({
        attachments: [playableUrl],
        payload: {
          ...curPayload,
          media: {
            ...curMedia,
            type: curMedia.type || messageType || "document",
            url: playableUrl,
            mimetype,
            external_media_id: mediaId,
            ...(fileName ? { fileName } : {}),
            ...(uploaded
              ? {
                  storage_bucket: uploaded.storageBucket,
                  storage_path: uploaded.storagePath,
                  byte_size: uploaded.byteSize,
                  hydrated_at: new Date().toISOString(),
                }
              : {}),
          },
        },
      })
      .eq("id", msgRow.id);
  }

  return {
    playableUrl,
    signedUrl: uploaded?.signedUrl || null,
    storageBucket: uploaded?.storageBucket || null,
    storagePath: uploaded?.storagePath || null,
    mimetype,
  };
}
