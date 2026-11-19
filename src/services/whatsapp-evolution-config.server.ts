/**
 * whatsapp-evolution-config.server.ts — Helpers canonicos de configuracao Evolution API v2,
 * URL de webhook em runtime, extracao Baileys e deteccao de deriva.
 *
 * Modulo folha SERVER-ONLY: proibido importar modulos irmaos que causem ciclos.
 */
import { getEnvVar } from "@/lib/env";
import { resolveDefaultMimeByMessageType } from "@/lib/whatsapp-media-utils";
import {
  resolveEvolutionCredentialsForInstance,
  type EvolutionInstanceRecord,
} from "@/services/whatsapp-media.server";

export type JsonObject = Record<string, any>;

export const EVOLUTION_WEBHOOK_EVENTS = [
  "QRCODE_UPDATED",
  "CONNECTION_UPDATE",
  "MESSAGES_SET",
  "MESSAGES_UPSERT",
  "MESSAGES_UPDATE",
  "MESSAGES_DELETE",
  "SEND_MESSAGE",
  "CHATS_UPSERT",
  "CHATS_UPDATE",
  "CONTACTS_UPSERT",
  "CONTACTS_UPDATE",
  "GROUPS_UPSERT",
  "GROUP_UPDATE",
  "GROUP_PARTICIPANTS_UPDATE",
] as const;

export type ExtractedEvolutionMedia = {
  mediaUrl: string | null;
  mimetype: string | null;
  fileName: string | null;
  caption: string | null;
  mediaKey: string | null;
  seconds: number | null;
  ptt: boolean;
  gifPlayback: boolean;
};

/** Resolve a origem HTTP publica dinamicamente em runtime (Cloudflare Workers / Vite). */
export function resolveWebhookOrigin(): string {
  const candidates = [
    getEnvVar("WHATSAPP_WEBHOOK_ORIGIN"),
    getEnvVar("VITE_SITE_URL"),
    getEnvVar("VITE_APP_URL"),
    typeof process !== "undefined" ? process.env?.WHATSAPP_WEBHOOK_ORIGIN : undefined,
    typeof process !== "undefined" ? process.env?.VITE_SITE_URL : undefined,
    typeof process !== "undefined" ? process.env?.VITE_APP_URL : undefined,
  ];
  for (const raw of candidates) {
    const clean = String(raw || "").trim().replace(/\/+$/, "");
    if (clean && /^https?:\/\//i.test(clean)) {
      return clean;
    }
  }
  return "https://waesy.com.br";
}

/** Constrói a URL canonica do webhook Evolution compartilhada entre DB e VPS. */
export function buildEvolutionWebhookUrl(instanceKey: string, origin?: string): string {
  const base = (origin || resolveWebhookOrigin()).replace(/\/+$/, "");
  return `${base}/api/webhooks/whatsapp/evolution/${encodeURIComponent(instanceKey)}`;
}

/**
 * Monta o payload de webhook Evolution com `base64: false` para impedir
 * descarte silencioso de webhooks de video/arquivos grandes e manter
 * hidratacao via `/chat/getBase64FromMediaMessage`.
 */
export function buildEvolutionWebhookConfig(webhookUrl: string, apiKey: string): JsonObject {
  const cleanKey = apiKey.trim();
  const headers = cleanKey ? { apikey: cleanKey, "x-api-key": cleanKey } : {};
  return {
    enabled: true,
    url: webhookUrl,
    byEvents: false,
    webhookByEvents: false,
    base64: false,
    webhookBase64: false,
    headers,
    events: [...EVOLUTION_WEBHOOK_EVENTS],
  };
}

/** Resolve credenciais Evolution para uma instancia combinando Vault e variaveis runtime. */
export function resolveEvolutionGatewayAccess(
  instance: EvolutionInstanceRecord | null | undefined,
): { baseUrl: string; apiKey: string; externalName: string } {
  const resolved = resolveEvolutionCredentialsForInstance(instance);
  const envUrl = String(getEnvVar("EVOLUTION_API_URL") || "").trim().replace(/\/+$/, "");
  const envKey = String(getEnvVar("EVOLUTION_API_KEY") || "").trim();
  const externalName = String(
    instance?.external_instance_id || instance?.instance_key || "",
  ).trim();

  const rawBase = (resolved?.baseUrl || envUrl || "").replace(/\/+$/, "");
  const safeBase =
    rawBase && (!rawBase.includes("147.15.61.45") || !envUrl) ? rawBase : envUrl || rawBase;
  const apiKey = resolved?.apiKey || envKey;

  return { baseUrl: safeBase, apiKey, externalName };
}

/** Inspeciona o webhook atualmente configurado na Evolution API para uma instancia. */
export async function fetchEvolutionWebhookState(
  baseUrl: string,
  apiKey: string,
  externalName: string,
): Promise<{
  ok: boolean;
  status: number | null;
  enabled: boolean;
  url: string | null;
  webhookBase64: boolean | null;
  events: string[];
  error: string | null;
}> {
  const cleanBase = baseUrl.replace(/\/+$/, "");
  try {
    const res = await fetch(
      `${cleanBase}/webhook/find/${encodeURIComponent(externalName)}`,
      {
        method: "GET",
        headers: { apikey: apiKey },
        signal: AbortSignal.timeout(5000),
      },
    );
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        enabled: false,
        url: null,
        webhookBase64: null,
        events: [],
        error: `HTTP ${res.status}`,
      };
    }
    const json = (await res.json().catch(() => ({}))) as JsonObject;
    const node = (json?.webhook && typeof json.webhook === "object" ? json.webhook : json) as JsonObject;
    const events = Array.isArray(node.events) ? node.events.map((e: unknown) => String(e)) : [];
    const base64Flag =
      typeof node.webhookBase64 === "boolean"
        ? node.webhookBase64
        : typeof node.base64 === "boolean"
          ? node.base64
          : null;
    return {
      ok: true,
      status: res.status,
      enabled: Boolean(node.enabled),
      url: typeof node.url === "string" ? node.url : null,
      webhookBase64: base64Flag,
      events,
      error: null,
    };
  } catch (err: any) {
    return {
      ok: false,
      status: null,
      enabled: false,
      url: null,
      webhookBase64: null,
      events: [],
      error: err?.message || "network_error",
    };
  }
}

/** Verifica se ha deriva entre a configuracao remota do webhook e o contrato canonico. */
export function hasEvolutionWebhookDrift(
  remote: {
    enabled: boolean;
    url: string | null;
    webhookBase64: boolean | null;
    events: string[];
  },
  expectedUrl: string,
): boolean {
  if (!remote.enabled) return true;
  if (!remote.url || remote.url.replace(/\/+$/, "") !== expectedUrl.replace(/\/+$/, "")) return true;
  if (remote.webhookBase64 === true) return true;
  const currentSet = new Set(remote.events.map((e) => e.toUpperCase()));
  return EVOLUTION_WEBHOOK_EVENTS.some((ev) => !currentSet.has(ev));
}

/** Registra webhook Evolution de forma idempotente com diagnostico detalhado. */
export async function ensureEvolutionWebhookRegisteredDetailed(
  baseUrl: string,
  apiKey: string,
  externalName: string,
  webhookUrl: string,
): Promise<{ ok: boolean; status: number | null; error: string | null; webhookUrl: string }> {
  const cleanBase = baseUrl.replace(/\/+$/, "");
  const config = buildEvolutionWebhookConfig(webhookUrl, apiKey);

  try {
    let res = await fetch(`${cleanBase}/webhook/set/${encodeURIComponent(externalName)}`, {
      method: "POST",
      headers: {
        apikey: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(config),
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok && (res.status === 400 || res.status === 422)) {
      res = await fetch(`${cleanBase}/webhook/set/${encodeURIComponent(externalName)}`, {
        method: "POST",
        headers: {
          apikey: apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ webhook: config }),
        signal: AbortSignal.timeout(5000),
      });
    }

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      return {
        ok: false,
        status: res.status,
        error: txt.slice(0, 200) || `HTTP ${res.status}`,
        webhookUrl,
      };
    }

    return { ok: true, status: res.status, error: null, webhookUrl };
  } catch (err: any) {
    return {
      ok: false,
      status: null,
      error: err?.message || "webhook_set_timeout",
      webhookUrl,
    };
  }
}

export function pickFirstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return null;
}

/** Desembrulha envelopes Baileys (ephemeral, viewOnce, documentWithCaption, edited). */
export function unwrapBaileysMessageContent(raw: unknown): JsonObject {
  let msg = (raw && typeof raw === "object" ? raw : {}) as JsonObject;
  for (let depth = 0; depth < 6; depth += 1) {
    const inner =
      msg.ephemeralMessage?.message ||
      msg.viewOnceMessage?.message ||
      msg.viewOnceMessageV2?.message ||
      msg.viewOnceMessageV2Extension?.message ||
      msg.documentWithCaptionMessage?.message ||
      msg.editedMessage?.message?.protocolMessage?.editedMessage ||
      msg.editedMessage?.message;
    if (inner && typeof inner === "object") {
      msg = inner as JsonObject;
    } else {
      break;
    }
  }
  return msg;
}

/** Extrai metadados de midia de uma mensagem Baileys / Evolution / WaSender. */
export function extractEvolutionMediaPayload(item: JsonObject): ExtractedEvolutionMedia {
  const rawMsg = (item.message || {}) as JsonObject;
  const msg = unwrapBaileysMessageContent(rawMsg);
  const mediaNode =
    msg.imageMessage ||
    msg.videoMessage ||
    msg.audioMessage ||
    msg.documentMessage ||
    msg.stickerMessage ||
    item.media ||
    null;

  const rootBase64 = pickFirstString(
    item.base64,
    item.data?.base64,
    rawMsg.base64,
    msg.base64,
    mediaNode?.base64,
  );
  const detectedMime = pickFirstString(
    mediaNode?.mimetype,
    item.mimetype,
    item.media?.mimetype,
    msg.audioMessage
      ? "audio/ogg"
      : msg.imageMessage
        ? "image/jpeg"
        : msg.videoMessage
          ? "video/mp4"
          : msg.stickerMessage
            ? "image/webp"
            : msg.documentMessage
              ? "application/pdf"
              : null,
  );

  let mediaUrl = pickFirstString(
    mediaNode?.url,
    item.mediaUrl,
    item.media?.url,
    item.fileUrl,
    item.url,
  );
  if (rootBase64) {
    mediaUrl = rootBase64.startsWith("data:")
      ? rootBase64
      : `data:${detectedMime || resolveDefaultMimeByMessageType(extractEvolutionMessageType(item))};base64,${rootBase64}`;
  }

  return {
    mediaUrl,
    mimetype: detectedMime,
    fileName: pickFirstString(
      mediaNode?.fileName,
      msg.documentMessage?.title,
      item.fileName,
      item.media?.fileName,
    ),
    caption: pickFirstString(mediaNode?.caption, item.caption),
    mediaKey: pickFirstString(mediaNode?.mediaKey, item.mediaKey),
    seconds: Number.isFinite(Number(mediaNode?.seconds)) ? Number(mediaNode.seconds) : null,
    ptt: Boolean(mediaNode?.ptt),
    gifPlayback: Boolean(mediaNode?.gifPlayback),
  };
}

/** Classifica o tipo canonico Waesy da mensagem WhatsApp recebida. */
export function extractEvolutionMessageType(item: JsonObject): string {
  const msg = unwrapBaileysMessageContent(item.message || {});
  if (msg.imageMessage || item.messageType === "imageMessage" || item.type === "image") return "image";
  if (msg.audioMessage || item.messageType === "audioMessage" || item.type === "audio" || item.type === "ptt") return "audio";
  if (msg.videoMessage || item.messageType === "videoMessage" || item.type === "video") return "video";
  if (msg.documentMessage || item.messageType === "documentMessage" || item.type === "document") return "document";
  if (msg.stickerMessage || item.messageType === "stickerMessage" || item.type === "sticker") return "sticker";
  if (msg.locationMessage || msg.liveLocationMessage || item.type === "location") return "location";
  if (msg.contactMessage || msg.contactsArrayMessage || item.type === "contact") return "contact";
  if (msg.reactionMessage) return "reaction";
  return pickFirstString(item.type, "text") || "text";
}

/** Extrai o texto legivel e placeholders honestos para a bolha do chat. */
export function extractEvolutionMessageText(item: JsonObject): string {
  const msg = unwrapBaileysMessageContent(item.message || {});
  const text = pickFirstString(
    item.text,
    item.body,
    item.messageBody,
    item.caption,
    msg.conversation,
    msg.extendedTextMessage?.text,
    msg.imageMessage?.caption,
    msg.videoMessage?.caption,
    msg.documentMessage?.caption,
    msg.buttonsResponseMessage?.selectedDisplayText,
    msg.listResponseMessage?.title,
    msg.templateButtonReplyMessage?.selectedDisplayText,
    msg.interactiveResponseMessage?.body?.text,
    msg.locationMessage?.name || msg.locationMessage?.address
      ? `Localização: ${[msg.locationMessage?.name, msg.locationMessage?.address].filter(Boolean).join(" — ")}`
      : null,
    msg.contactMessage?.displayName
      ? `Contato compartilhado: ${msg.contactMessage.displayName}`
      : Array.isArray(msg.contactsArrayMessage?.contacts) && msg.contactsArrayMessage.contacts[0]?.displayName
        ? `Contatos compartilhados: ${msg.contactsArrayMessage.contacts.map((c: any) => c?.displayName).filter(Boolean).slice(0, 3).join(", ")}`
        : null,
    msg.reactionMessage?.text ? `Reação: ${msg.reactionMessage.text}` : null,
  );
  if (text) return text;
  const mType = extractEvolutionMessageType(item);
  if (mType === "image") return "[Imagem]";
  if (mType === "audio") return "[Áudio]";
  if (mType === "video") return "[Vídeo]";
  if (mType === "document") return "[Documento]";
  if (mType === "sticker") return "[Figurinha]";
  if (mType === "location") return "[Localização]";
  if (mType === "contact") return "[Contato]";
  return "[Mensagem WhatsApp]";
}

/** Converte timestamps Evolution (segundos Unix, ms Unix ou ISO string) em ISO seguro. */
export function normalizeEvolutionTimestampIso(raw: unknown): string {
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) {
    const ms = raw > 1e12 ? raw : raw * 1000;
    const d = new Date(ms);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  if (typeof raw === "string" && raw.trim()) {
    const num = Number(raw.trim());
    if (Number.isFinite(num) && num > 0) {
      const ms = num > 1e12 ? num : num * 1000;
      const d = new Date(ms);
      if (!Number.isNaN(d.getTime())) return d.toISOString();
    }
    const parsed = new Date(raw.trim());
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  return new Date().toISOString();
}
