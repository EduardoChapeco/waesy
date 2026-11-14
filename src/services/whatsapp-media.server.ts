import { decryptSecret } from "@/lib/crypto-vault.server";
import {
  normalizeMediaDataUri,
  resolveDefaultMimeByMessageType,
} from "@/lib/whatsapp-media-utils";

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

  const configuredUrl = String(
    instance.public_config?.base_url || secret.base_url || process.env.EVOLUTION_API_URL || "",
  )
    .trim()
    .replace(/\/$/, "");
  const baseUrl =
    configuredUrl && !configuredUrl.includes("147.15.61.45")
      ? configuredUrl
      : String(process.env.EVOLUTION_API_URL || "").trim().replace(/\/$/, "");

  const apiKey = String(
    secret.api_key || secret.access_token || secret.token || process.env.EVOLUTION_API_KEY || "",
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

  if (persistToMessage && messageId) {
    const { data: existingRow } = await db
      .from("chat_messages")
      .select("id, payload")
      .eq("id", messageId)
      .maybeSingle();

    const curPayload = (
      existingRow?.payload && typeof existingRow.payload === "object" ? existingRow.payload : {}
    ) as Record<string, unknown>;
    const curMedia = (
      curPayload.media && typeof curPayload.media === "object" ? curPayload.media : {}
    ) as Record<string, unknown>;

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
      .eq("id", messageId);
  } else if (persistToMessage && threadId && externalMessageId) {
    const { data: existingRow } = await db
      .from("chat_messages")
      .select("id, payload")
      .eq("thread_id", threadId)
      .eq("external_message_id", externalMessageId)
      .maybeSingle();

    if (existingRow?.id) {
      const curPayload = (
        existingRow.payload && typeof existingRow.payload === "object" ? existingRow.payload : {}
      ) as Record<string, unknown>;
      const curMedia = (
        curPayload.media && typeof curPayload.media === "object" ? curPayload.media : {}
      ) as Record<string, unknown>;

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
        .eq("id", existingRow.id);
    }
  }

  return {
    dataUri,
    mimetype,
    instanceId: resolvedInstance.id,
  };
}
