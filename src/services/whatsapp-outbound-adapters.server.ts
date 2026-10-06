import { decryptSecret } from "@/lib/crypto-vault.server";

export type OutboundProvider = "meta_cloud_api" | "evolution_api" | "wasender_api" | "render_bridge" | "custom_webhook";
export type OutboundInstance = {
  id: string;
  store_id: string;
  provider: OutboundProvider;
  instance_key: string;
  external_instance_id: string | null;
  phone_number_id: string | null;
  public_config: Record<string, unknown> | null;
  secret_payload_encrypted: string | null;
};
export type OutboundMessage = {
  recipientPhone: string;
  messageType: string;
  payload: Record<string, unknown>;
};
export type AdapterResult = { externalMessageId: string; httpStatus: number; response: Record<string, unknown> };

const MEDIA_TYPES = new Set(["image", "video", "audio", "document"]);

export class OutboundAdapterError extends Error {
  constructor(public readonly code: string, message: string, public readonly retryable: boolean, public readonly httpStatus?: number) { super(message); }
}

function secrets(instance: OutboundInstance): Record<string, unknown> {
  if (!instance.secret_payload_encrypted) return {};
  try { return JSON.parse(decryptSecret(instance.secret_payload_encrypted)) as Record<string, unknown>; } catch { throw new OutboundAdapterError("INVALID_SECRET", "Credencial da instância não pôde ser descriptografada", false); }
}
function stringValue(...values: unknown[]): string | null { return values.find((value): value is string => typeof value === "string" && value.trim().length > 0)?.trim() || null; }
function identifierValue(...values: unknown[]): string | null {
  const value = values.find((candidate) => (typeof candidate === "string" && candidate.trim().length > 0) || typeof candidate === "number");
  return value === undefined ? null : String(value);
}
function baseUrl(instance: OutboundInstance, secret: Record<string, unknown>, fallback: string | null): string {
  const value = stringValue(instance.public_config?.base_url, secret.base_url, fallback);
  if (!value) throw new OutboundAdapterError("MISSING_BASE_URL", "Base URL do provider não configurada", false);
  try { const parsed = new URL(value); if (!/^https?:$/.test(parsed.protocol)) throw new Error(); return value.replace(/\/$/, ""); } catch { throw new OutboundAdapterError("INVALID_BASE_URL", "Base URL do provider inválida", false); }
}
function retryableStatus(status: number) { return status === 408 || status === 409 || status === 425 || status === 429 || status >= 500; }
async function readJson(response: Response): Promise<Record<string, unknown>> { const value = await response.json().catch(() => ({})); return value && typeof value === "object" ? value as Record<string, unknown> : {}; }
function providerError(provider: string, response: Response, body: Record<string, unknown>): OutboundAdapterError {
  const nestedError = body.error && typeof body.error === "object" ? (body.error as Record<string, unknown>).message : null;
  const message = stringValue(body.message, body.error, nestedError) || `${provider} HTTP ${response.status}`;
  return new OutboundAdapterError(`HTTP_${response.status}`, message, retryableStatus(response.status), response.status);
}
function mediaSource(payload: Record<string, unknown>): string {
  const source = stringValue(payload.media_url, payload.media, payload.url);
  if (!source) throw new OutboundAdapterError("MISSING_MEDIA_SOURCE", "Mídia exige media_url, media ou url", false);
  if (source.startsWith("data:")) return source;
  try { const parsed = new URL(source); if (!/^https?:$/.test(parsed.protocol)) throw new Error(); return source; } catch { throw new OutboundAdapterError("INVALID_MEDIA_SOURCE", "A mídia deve ser uma URL HTTP(S) pública ou data URI", false); }
}
function mediaType(message: OutboundMessage): "image" | "video" | "audio" | "document" {
  if (!MEDIA_TYPES.has(message.messageType)) throw new OutboundAdapterError("UNSUPPORTED_MESSAGE", `Tipo de mídia não suportado: ${message.messageType}`, false);
  return message.messageType as "image" | "video" | "audio" | "document";
}
function caption(payload: Record<string, unknown>): string | undefined { return stringValue(payload.caption, payload.text) || undefined; }
function mimeType(payload: Record<string, unknown>): string | undefined { return stringValue(payload.mime_type, payload.mimeType) || undefined; }
function fileName(payload: Record<string, unknown>): string | undefined { return stringValue(payload.file_name, payload.fileName, payload.filename) || undefined; }
function quoted(payload: Record<string, unknown>): unknown { return payload.quoted && typeof payload.quoted === "object" ? payload.quoted : undefined; }

async function sendMeta(instance: OutboundInstance, message: OutboundMessage): Promise<AdapterResult> {
  const secret = secrets(instance);
  const phoneNumberId = stringValue(instance.phone_number_id, secret.phone_number_id);
  const accessToken = stringValue(secret.access_token, secret.api_key, secret.token);
  if (!phoneNumberId || !accessToken) throw new OutboundAdapterError("MISSING_CREDENTIALS", "Meta exige phone_number_id e access_token", false);
  const text = typeof message.payload.text === "string" ? message.payload.text.trim() : null;
  const template = message.payload.template && typeof message.payload.template === "object" ? message.payload.template : null;
  if ((!text && !template) || (template && typeof (template as Record<string, unknown>).name !== "string")) throw new OutboundAdapterError("UNSUPPORTED_MESSAGE", "Payload Meta exige texto ou template válido", false);
  const body = text ? { messaging_product: "whatsapp", to: message.recipientPhone, type: "text", text: { body: text } } : { messaging_product: "whatsapp", to: message.recipientPhone, type: "template", template };
  const response = await fetch(`https://graph.facebook.com/v20.0/${encodeURIComponent(phoneNumberId)}/messages`, { method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(15000) });
  const json = await readJson(response);
  if (!response.ok) throw providerError("Meta Cloud API", response, json);
  const externalMessageId = stringValue((json.messages as Array<Record<string, unknown>> | undefined)?.[0]?.id);
  if (!externalMessageId) throw new OutboundAdapterError("MISSING_EXTERNAL_ID", "Meta aceitou a mensagem sem retornar identificador", true, response.status);
  return { externalMessageId, httpStatus: response.status, response: json };
}

async function sendEvolution(instance: OutboundInstance, message: OutboundMessage): Promise<AdapterResult> {
  const secret = secrets(instance);
  const apiKey = stringValue(secret.api_key, secret.access_token, secret.token);
  if (!apiKey) throw new OutboundAdapterError("MISSING_CREDENTIALS", "Evolution API exige api_key", false);
  const instanceName = stringValue(instance.external_instance_id, instance.instance_key);
  const root = baseUrl(instance, secret, null);
  const number = message.recipientPhone.replace(/\D/g, "");
  if (!number) throw new OutboundAdapterError("INVALID_RECIPIENT", "Destinatário WhatsApp inválido", false);

  let url: string;
  let body: Record<string, unknown>;
  const type = message.messageType;
  if (type === "text") {
    const text = typeof message.payload.text === "string" ? message.payload.text.trim() : null;
    if (!text) throw new OutboundAdapterError("UNSUPPORTED_MESSAGE", "Mensagem de texto vazia", false);
    url = `${root}/message/sendText/${encodeURIComponent(instanceName || "")}`;
    body = { number, text };
  } else if (type === "audio" && message.payload.voice_note === true) {
    url = `${root}/message/sendWhatsAppAudio/${encodeURIComponent(instanceName || "")}`;
    body = { number, audio: mediaSource(message.payload), ...(message.payload.encoding === true ? { encoding: true } : {}) };
    const q = quoted(message.payload); if (q) body.quoted = q;
  } else {
    const kind = mediaType(message);
    url = `${root}/message/sendMedia/${encodeURIComponent(instanceName || "")}`;
    body = { number, mediatype: kind, media: mediaSource(message.payload), ...(caption(message.payload) ? { caption: caption(message.payload) } : {}), ...(mimeType(message.payload) ? { mimetype: mimeType(message.payload) } : {}), ...(fileName(message.payload) ? { fileName: fileName(message.payload) } : {}) };
    const q = quoted(message.payload); if (q) body.quoted = q;
  }
  const response = await fetch(url, { method: "POST", headers: { apikey: apiKey, "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(15000) });
  const json = await readJson(response);
  if (!response.ok) throw providerError("Evolution API", response, json);
  const externalMessageId = stringValue((json.key as Record<string, unknown> | undefined)?.id);
  if (!externalMessageId) throw new OutboundAdapterError("MISSING_EXTERNAL_ID", "Evolution aceitou a mensagem sem retornar key.id", true, response.status);
  return { externalMessageId, httpStatus: response.status, response: json };
}

async function sendWaSender(instance: OutboundInstance, message: OutboundMessage): Promise<AdapterResult> {
  const secret = secrets(instance);
  const token = stringValue(secret.api_key, secret.access_token, secret.token);
  if (!token) throw new OutboundAdapterError("MISSING_CREDENTIALS", "WaSenderAPI exige API key de sessão", false);
  const url = `${baseUrl(instance, secret, "https://www.wasenderapi.com")}/api/send-message`;
  const to = message.recipientPhone.startsWith("+") ? message.recipientPhone : `+${message.recipientPhone.replace(/\D/g, "")}`;
  const type = message.messageType;
  const body: Record<string, unknown> = { to };
  if (type === "text") {
    const text = typeof message.payload.text === "string" ? message.payload.text.trim() : null;
    if (!text) throw new OutboundAdapterError("UNSUPPORTED_MESSAGE", "Mensagem de texto vazia", false);
    body.text = text;
  } else {
    const source = mediaSource(message.payload);
    const field = { image: "imageUrl", video: "videoUrl", audio: "audioUrl", document: "documentUrl" }[mediaType(message)];
    body[field] = source;
    const text = caption(message.payload); if (text) body.text = text;
    const name = fileName(message.payload); if (name && type === "document") body.fileName = name;
  }
  const response = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(15000) });
  const json = await readJson(response);
  if (!response.ok || json.success === false) throw providerError("WaSenderAPI", response, json);
  const data = json.data as Record<string, unknown> | undefined;
  const externalMessageId = identifierValue(data?.msgId, data?.id);
  if (!externalMessageId) throw new OutboundAdapterError("MISSING_EXTERNAL_ID", "WaSenderAPI aceitou a mensagem sem retornar data.msgId", true, response.status);
  return { externalMessageId, httpStatus: response.status, response: json };
}

export async function sendWithWhatsAppAdapter(instance: OutboundInstance, message: OutboundMessage): Promise<AdapterResult> {
  if (instance.provider === "meta_cloud_api") return sendMeta(instance, message);
  if (instance.provider === "evolution_api") return sendEvolution(instance, message);
  if (instance.provider === "wasender_api") return sendWaSender(instance, message);
  throw new OutboundAdapterError("UNSUPPORTED_PROVIDER", `Nenhum adapter outbound real foi registrado para ${instance.provider}`, false);
}
