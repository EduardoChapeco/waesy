import { createHash } from "node:crypto";
import { getServerClient } from "@/lib/supabase";
import { firstNonEmptyString as firstString, noStoreJsonResponse as json } from "@/lib/utils";
import { decryptSecret, timingSafeCompare } from "@/lib/crypto-vault.server";
import { decryptConversationMessageForThread, encryptConversationMessageForThread, redactConversationPayload } from "@/lib/conversation-crypto.server";
import { verifyWebhookSignature } from "@/lib/webhook-signature";
import { dispatchWhatsAppInboundFlows, resolveWhatsAppIdentity } from "@/services/whatsapp-automation-runtime.server";
import { getEnvVar } from "@/lib/env";
import { isRawLidOrSyntheticName } from "@/lib/chat-media-attachment";
import { buildBrazilPhoneVariants } from "@/lib/phone-match";
import { resolveContactCaptureSuppression } from "@/lib/whatsapp-contact-suppression.server";
import {
  extractWhatsAppGroupContext,
  extractWhatsAppReferralAndTokens,
  extractParticipantPhone,
  normalizePhoneE164,
  correlateAndPersistInboundWhatsAppAttribution,
} from "@/services/omnichannel-attribution.server";
import { isBrokenOrMissingMediaUri } from "@/lib/whatsapp-media-utils";
import {
  hydrateMediaFromEvolution,
  resolveEvolutionCredentialsForInstance,
  type EvolutionInstanceRecord,
} from "@/services/whatsapp-media.server";
import {
  reconcileEvolutionWebhookIfNeeded,
  runEvolutionDeltaSyncForInstance,
} from "@/services/whatsapp-evolution-sync.server";
import { isUniqueViolationError } from "@/services/whatsapp-message-persistence.server";

export type UnofficialWhatsAppProvider = "evolution_api" | "wasender_api";
// Payloads de providers externos são deliberadamente dinâmicos; o boundary é validado pelos normalizadores.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsonObject = Record<string, any>;
export type ExtractedMedia = {
  type: "sticker" | "image" | "video" | "audio" | "document" | null;
  url: string | null;
  mimetype: string | null;
  fileName: string | null;
  caption: string | null;
  thumbnailUrl: string | null;
  isAnimated?: boolean;
};
type NormalizedMessage = {
  externalMessageId: string;
  externalUserId: string | null;
  phone: string | null;
  text: string;
  messageType: string;
  occurredAt: string;
  fromMe: boolean;
  pushName: string | null;
  isGroup: boolean;
  groupJid: string | null;
  groupSubject: string | null;
  senderPhone: string | null;
  senderJid: string | null;
  referral: Record<string, any> | null;
  attachments: string[];
  media: ExtractedMedia | null;
  payload: JsonObject;
};
type NormalizedDelivery = { externalMessageId: string; deliveryStatus: "sent" | "delivered" | "read" | "failed"; remoteJid: string | null; recipientPhone: string | null; occurredAt: string; errorCode: string | null; errorMessage: string | null; payload: JsonObject };

function hashBody(rawBody: string) { return createHash("sha256").update(rawBody).digest("hex"); }
function stableKey(parts: unknown[]) { return createHash("sha256").update(parts.map((part) => JSON.stringify(part)).join("|")).digest("hex"); }
function secretConfig(value: string | null): Record<string, unknown> { if (!value) return {}; try { return JSON.parse(decryptSecret(value)) as Record<string, unknown>; } catch { return {}; } }
function eventTime(value: unknown, fallback = new Date().toISOString()): string { const number = Number(value); if (!Number.isFinite(number) || number <= 0) return fallback; return new Date(number < 2_000_000_000 ? number * 1000 : number).toISOString(); }
function normalizedPhone(value: unknown): string | null { const digits = String(value || "").replace(/\D/g, ""); return digits.length >= 7 ? `+${digits}` : null; }
function remotePhone(value: unknown): string | null {
  const text = firstString(value);
  if (!text) return null;
  if (text.includes("@lid") || text.includes("@g.us") || text.includes("@newsletter")) return null;
  const digits = text.replace(/@.*$/, "").replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 13 ? `+${digits}` : null;
}
function messageKey(item: JsonObject): JsonObject { return (item.key || item.message?.key || {}) as JsonObject; }
export function unwrapBaileysMessage(raw: unknown): JsonObject {
  if (!raw || typeof raw !== "object") return {};
  const obj = raw as JsonObject;
  if (obj.ephemeralMessage?.message) return unwrapBaileysMessage(obj.ephemeralMessage.message);
  if (obj.viewOnceMessage?.message) return unwrapBaileysMessage(obj.viewOnceMessage.message);
  if (obj.viewOnceMessageV2?.message) return unwrapBaileysMessage(obj.viewOnceMessageV2.message);
  if (obj.documentWithCaptionMessage?.message) return unwrapBaileysMessage(obj.documentWithCaptionMessage.message);
  return obj;
}
function formatDataUri(raw: string | null | undefined, defaultMime: string): string | null {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (trimmed.startsWith("data:")) return trimmed;
  if (/^[A-Za-z0-9+/=]+$/.test(trimmed.slice(0, 50))) {
    return `data:${defaultMime};base64,${trimmed}`;
  }
  return null;
}
export function extractMediaPayload(item: JsonObject): ExtractedMedia {
  const type = messageType(item);
  if (type === "text" || type === "location" || type === "contact") {
    return { type: null, url: null, mimetype: null, fileName: null, caption: null, thumbnailUrl: null };
  }
  const message = unwrapBaileysMessage(item.message || item.data?.message || {});
  const msgObj = (message[`${type}Message`] as JsonObject) || {};
  const caption = firstString(msgObj.caption, item.caption);
  const fileName = firstString(msgObj.fileName, msgObj.title, item.fileName);
  let defaultMime = "application/octet-stream";
  if (type === "sticker") defaultMime = "image/webp";
  else if (type === "image") defaultMime = "image/jpeg";
  else if (type === "video") defaultMime = "video/mp4";
  else if (type === "audio") defaultMime = "audio/ogg";
  else if (type === "document") defaultMime = "application/pdf";
  const mimetype = firstString(msgObj.mimetype, item.mimetype, item.mimeType) || defaultMime;
  const rawBase64 = firstString(item.base64, item.data?.base64, message.base64, msgObj.base64, item.mediaBase64);
  const dataUri = formatDataUri(rawBase64, mimetype);
  const rawThumb = firstString(msgObj.jpegThumbnail, msgObj.pngThumbnail);
  const thumbnailUrl = formatDataUri(rawThumb, type === "sticker" ? "image/png" : "image/jpeg");
  const remoteUrl = firstString(item.mediaUrl, item.data?.mediaUrl, item.url, msgObj.url);
  const effectiveUrl = dataUri || (remoteUrl && !remoteUrl.includes("mmg.whatsapp.net") ? remoteUrl : null) || thumbnailUrl;
  return {
    type: type as any,
    url: effectiveUrl,
    mimetype,
    fileName,
    caption,
    thumbnailUrl,
    isAnimated: Boolean(msgObj.isAnimated),
  };
}
export function messageType(item: JsonObject): string {
  const message = unwrapBaileysMessage(item.message || item.data?.message || {});
  const rawType = String(item.messageType || item.type || "").toLowerCase();
  if (rawType.includes("sticker") || message.stickerMessage) return "sticker";
  if (message.imageMessage) return "image";
  if (message.videoMessage) return "video";
  if (message.audioMessage) return "audio";
  if (message.documentMessage) return "document";
  if (message.locationMessage) return "location";
  if (message.contactMessage || message.contactsArrayMessage) return "contact";
  return "text";
}
export function messageText(item: JsonObject): string {
  const message = unwrapBaileysMessage(item.message || item.data?.message || {});
  const rawType = String(item.messageType || item.type || "").toLowerCase();
  if (rawType.includes("sticker") || message.stickerMessage) return "[Figurinha]";
  const edited = (message.editedMessage as JsonObject) || {};
  const editedMsg = (edited.message as JsonObject) || {};
  const buttons = (message.buttonsResponseMessage as JsonObject) || {};
  const list = (message.listResponseMessage as JsonObject) || {};
  const template = (message.templateButtonReplyMessage as JsonObject) || {};
  const interactive = (message.interactiveResponseMessage as JsonObject) || {};
  const interactiveBody = (interactive.body as JsonObject) || {};

  const extracted = firstString(
    item.messageBody,
    item.text,
    item.body,
    item.content,
    message.conversation,
    message.extendedTextMessage?.text,
    message.imageMessage?.caption,
    message.videoMessage?.caption,
    message.documentMessage?.caption,
    edited.conversation,
    edited.extendedTextMessage?.text,
    editedMsg.conversation,
    editedMsg.extendedTextMessage?.text,
    buttons.selectedDisplayText,
    buttons.selectedButtonId,
    list.title,
    list.description,
    template.selectedDisplayText,
    interactiveBody.text,
    item.messageText,
    (item.data as JsonObject)?.message?.conversation,
    (item.data as JsonObject)?.message?.extendedTextMessage?.text
  );

  if (extracted) return extracted;

  const type = messageType(item);
  switch (type) {
    case "sticker":
      return "[Figurinha]";
    case "image":
      return "[Imagem]";
    case "video":
      return "[Vídeo]";
    case "audio":
      return "[Áudio]";
    case "document":
      return "[Documento]";
    case "location":
      return "[Localização]";
    case "contact":
      return "[Contato]";
    default:
      return "[Mensagem]";
  }
}
function eventName(body: JsonObject): string { return (firstString(body.event, body.type) || "messages.upsert").toLowerCase().replace(/_/g, "."); }
function messageItems(body: JsonObject): JsonObject[] {
  const data = (body.data || {}) as any;
  if (Array.isArray(data)) {
    return data.filter((item): item is JsonObject => Boolean(item && typeof item === "object"));
  }
  const messages = data.messages ?? body.messages;
  if (Array.isArray(messages)) {
    return messages.filter((item): item is JsonObject => Boolean(item && typeof item === "object"));
  }
  if (messages && typeof messages === "object") return [messages as JsonObject];
  if (data && typeof data === "object" && Object.keys(data).length > 0) return [data as JsonObject];
  return body.key || body.message ? [body] : [];
}
function statusItems(body: JsonObject): JsonObject[] {
  const data = body.data || {};
  if (Array.isArray(data)) return data as JsonObject[];
  if (Array.isArray(data.messages)) return data.messages as JsonObject[];
  return [data as JsonObject];
}
function statusValue(value: unknown): "sent" | "delivered" | "read" | "failed" | null {
  const normalized = String(value ?? "").toUpperCase();
  if (["0", "ERROR", "FAILED", "FAILURE"].includes(normalized)) return "failed";
  if (["2", "SENT", "SERVER_ACK", "SERVER-ACK"].includes(normalized)) return "sent";
  if (["3", "DELIVERED", "DELIVERY_ACK", "DELIVERY-ACK"].includes(normalized)) return "delivered";
  if (["4", "5", "READ", "PLAYED"].includes(normalized)) return "read";
  return null;
}
function isSyntheticSelfLabel(value: string | null | undefined): boolean {
  if (!value) return true;
  const clean = value.trim().toLowerCase();
  return clean === "você" || clean === "voce" || clean === "you" || clean === "eu";
}
function normalizedMessage(provider: UnofficialWhatsAppProvider, body: JsonObject, item: JsonObject): NormalizedMessage | null {
  const key = messageKey(item);
  const externalMessageId = firstString(key.id, item.id, item.messageId);
  if (!externalMessageId) return null;
  const fromMe = key.fromMe === true || item.fromMe === true;
  const rawRemoteJid = firstString(key.remoteJid, item.remoteJid);
  if (rawRemoteJid === "status@broadcast") return null;

  const groupCtx = extractWhatsAppGroupContext(body, item);
  const resolvedRemoteJid = rawRemoteJid && rawRemoteJid.endsWith("@lid")
    ? firstString(key.remoteJidAlt, key.senderPn, key.cleanedSenderPn, rawRemoteJid)
    : rawRemoteJid;

  const externalUserId = groupCtx.isGroup
    ? groupCtx.groupJid
    : fromMe
      ? firstString(resolvedRemoteJid, key.remoteJidAlt, item.to, item.recipient, body.recipient)
      : firstString(key.senderPn, resolvedRemoteJid, key.cleanedSenderPn, item.from, item.sender, body.sender);

  const phone = groupCtx.isGroup
    ? (fromMe ? null : groupCtx.senderPhone)
    : fromMe
      ? remotePhone(firstString(resolvedRemoteJid, key.remoteJidAlt, item.to, item.recipient, body.recipient))
      : remotePhone(firstString(key.senderPn, key.cleanedSenderPn, resolvedRemoteJid, item.from, item.sender, body.sender));

  const occurredAt = eventTime(item.messageTimestamp || item.timestamp || body.timestamp);
  const rawPushName = fromMe ? null : firstString(item.pushName, item.senderName, body.pushName);
  const pushName = rawPushName && !isSyntheticSelfLabel(rawPushName) ? rawPushName : null;
  const text = messageText(item);
  const msgType = messageType(item);
  const media = extractMediaPayload(item);
  const attachments = media.url ? [media.url] : [];
  const referralAttr = !groupCtx.isGroup && !fromMe ? extractWhatsAppReferralAndTokens(item, text) : null;

  return {
    externalMessageId,
    externalUserId,
    phone,
    text,
    messageType: msgType,
    occurredAt,
    fromMe,
    pushName,
    isGroup: groupCtx.isGroup,
    groupJid: groupCtx.groupJid,
    groupSubject: groupCtx.groupSubject,
    senderPhone: groupCtx.senderPhone,
    senderJid: groupCtx.senderJid,
    referral: referralAttr,
    attachments,
    media: media.type ? media : null,
    payload: redactConversationPayload({
      provider,
      event_type: eventName(body),
      external_message_id: externalMessageId,
      external_user_id: externalUserId,
      phone,
      is_group: groupCtx.isGroup,
      group_jid: groupCtx.groupJid,
      group_subject: groupCtx.groupSubject,
      sender_phone: groupCtx.senderPhone,
      sender_name: pushName,
      sender_jid: groupCtx.senderJid,
      referral: referralAttr,
      message_type: msgType,
      from_me: fromMe,
      timestamp: item.messageTimestamp || item.timestamp || body.timestamp,
    }),
  };
}
function normalizedDelivery(provider: UnofficialWhatsAppProvider, body: JsonObject, item: JsonObject): NormalizedDelivery | null {
  const key = messageKey(item);
  const update = (item.update || body.data?.update || {}) as JsonObject;
  const externalMessageId = firstString(key.id, item.id, update.key?.id);
  const deliveryStatus = statusValue(update.status ?? item.status ?? item.update?.status);
  if (!externalMessageId || !deliveryStatus) return null;
  const error = item.errors?.[0] || update.errors?.[0];
  return { externalMessageId, deliveryStatus, remoteJid: firstString(key.remoteJid, item.remoteJid), recipientPhone: remotePhone(firstString(key.remoteJid, item.recipient_id, item.recipient, body.recipient)), occurredAt: eventTime(item.timestamp || update.timestamp || body.timestamp), errorCode: firstString(error?.code, error?.status), errorMessage: firstString(error?.message, error?.title), payload: redactConversationPayload({ provider, event_type: eventName(body), external_message_id: externalMessageId, delivery_status: deliveryStatus, remote_jid: firstString(key.remoteJid, item.remoteJid) }) };
}
export function normalizeUnofficialIncomingMessage(provider: UnofficialWhatsAppProvider, body: Record<string, unknown>, item: Record<string, unknown>) { return normalizedMessage(provider, body as JsonObject, item as JsonObject); }
export function normalizeUnofficialDelivery(provider: UnofficialWhatsAppProvider, body: Record<string, unknown>, item: Record<string, unknown>) { return normalizedDelivery(provider, body as JsonObject, item as JsonObject); }
function deliveryRank(value: string | null): number { return ({ accepted: 1, sent: 2, delivered: 3, read: 4, failed: 5 } as Record<string, number>)[value || ""] || 0; }
function campaignDeliveryRank(value: string | null): number { return ({ eligible: 0, queued: 1, accepted: 2, sent: 3, failed: 3, delivered: 4, read: 5 } as Record<string, number>)[value || ""] ?? -1; }

export async function persistDelivery(
  db: ReturnType<typeof getServerClient>,
  provider: UnofficialWhatsAppProvider,
  instance: JsonObject,
  body: JsonObject,
  delivery: NormalizedDelivery,
  options?: { existingEventId?: string },
) {
  const storeId = String(instance.store_id);
  const phoneNumberId = String(instance.instance_key);
  const eventKey = stableKey(["delivery", provider, instance.id, delivery.externalMessageId, delivery.deliveryStatus, delivery.occurredAt, delivery.remoteJid]);
  const eventLookup = options?.existingEventId
    ? await db.from("whatsapp_provider_webhook_events").select("id, processing_status").eq("id", options.existingEventId).maybeSingle()
    : await db.from("whatsapp_provider_webhook_events").upsert({ provider, instance_id: instance.id, store_id: storeId, event_key: eventKey, event_type: "status", external_message_id: delivery.externalMessageId, payload_hash: hashBody(JSON.stringify(body)), payload: delivery.payload, signature_verified: true }, { onConflict: "provider,instance_id,event_key", ignoreDuplicates: true }).select("id, processing_status").maybeSingle();
  const { data: providerEvent, error: providerEventError } = eventLookup;
  if (providerEventError) throw providerEventError;
  // ignoreDuplicates retorna data nula quando uma entrega concorrente já criou o evento.
  if (!providerEvent || providerEvent.processing_status === "processed") return { eventKey, duplicate: true, matchedMessages: 0 };
  await db.from("whatsapp_webhook_inbox").upsert({ store_id: storeId, phone_number_id: phoneNumberId, event_key: eventKey, event_type: "status", external_message_id: delivery.externalMessageId, payload: delivery.payload, status: "processed", processed_at: new Date().toISOString() }, { onConflict: "store_id,event_key", ignoreDuplicates: true });
  const { error: deliveryError } = await db.from("whatsapp_delivery_events").upsert({ store_id: storeId, phone_number_id: phoneNumberId, external_message_id: delivery.externalMessageId, delivery_status: delivery.deliveryStatus, recipient_phone: delivery.recipientPhone, error_code: delivery.errorCode, error_message: delivery.errorMessage, payload: delivery.payload, occurred_at: delivery.occurredAt }, { onConflict: "store_id,external_message_id,delivery_status" });
  if (deliveryError) throw deliveryError;
  const { data: messages, error: messageError } = await db.from("chat_messages").select("id, thread_id, delivery_status, chat_threads!inner(store_id, channel_instance_id)").eq("channel", "whatsapp").eq("external_message_id", delivery.externalMessageId).eq("chat_threads.store_id", storeId).eq("chat_threads.channel_instance_id", instance.id);
  if (messageError) throw messageError;
  for (const message of messages || []) {
    if (delivery.deliveryStatus === "failed" && message.delivery_status === "read") continue;
    if (delivery.deliveryStatus !== "failed" && deliveryRank(delivery.deliveryStatus) < deliveryRank(message.delivery_status)) continue;
    const update: Record<string, unknown> = { delivery_status: delivery.deliveryStatus };
    if (delivery.deliveryStatus === "sent") update.sent_at = delivery.occurredAt;
    if (delivery.deliveryStatus === "delivered") update.delivered_at = delivery.occurredAt;
    if (delivery.deliveryStatus === "read") update.read_at = delivery.occurredAt;
    if (delivery.deliveryStatus === "failed") { update.failed_at = delivery.occurredAt; update.error_code = delivery.errorCode; update.error_message = delivery.errorMessage; }
    await db.from("chat_messages").update(update).eq("id", message.id).eq("thread_id", message.thread_id);
  }
  const { data: recipients } = await db.from("whatsapp_campaign_recipients").select("id, status").eq("store_id", storeId).eq("external_message_id", delivery.externalMessageId);
  for (const recipient of recipients || []) {
    if (campaignDeliveryRank(delivery.deliveryStatus) < campaignDeliveryRank(recipient.status)) continue;
    await db.from("whatsapp_campaign_recipients").update({ status: delivery.deliveryStatus, error_code: delivery.errorCode, error_message: delivery.errorMessage, updated_at: new Date().toISOString() }).eq("id", recipient.id).eq("store_id", storeId);
  }
  if (providerEvent?.id) await db.from("whatsapp_provider_webhook_events").update({ processing_status: "processed", processed_at: new Date().toISOString(), error_message: null }).eq("id", providerEvent.id);
  return { eventKey, matchedMessages: messages?.length || 0 };
}

function isGroupThreadRow(row: any, groupJid?: string | null): boolean {
  if (!row) return false;
  const tType = String(row.thread_type || "").toLowerCase();
  if (tType === "group") return true;
  const meta = (row.metadata && typeof row.metadata === "object" ? row.metadata : {}) as Record<string, any>;
  if (meta.is_group === true) return true;
  const entity = String(row.entity_id || "").trim().toLowerCase();
  if (entity.includes("@g.us")) return true;
  if (/^120363\d{10,}$/.test(entity.replace(/\D/g, ""))) return true;
  const metaJid = String(meta.whatsapp_jid || meta.remote_jid || "").trim().toLowerCase();
  if (metaJid.includes("@g.us")) return true;
  if (groupJid && (entity === groupJid.toLowerCase() || metaJid === groupJid.toLowerCase())) return true;
  return false;
}

function isChannelThreadRow(row: any): boolean {
  if (!row) return false;
  if (String(row.thread_type || "").toLowerCase() === "channel") return true;
  const meta = (row.metadata && typeof row.metadata === "object" ? row.metadata : {}) as Record<string, any>;
  if (meta.is_channel === true) return true;
  return String(row.entity_id || "").toLowerCase().includes("@newsletter");
}

function isParticipantDisplaySameAsSender(candidate: string | null | undefined, message: NormalizedMessage): boolean {
  if (!candidate) return true;
  const clean = candidate.trim().toLowerCase();
  if (!clean || clean === "grupo whatsapp" || isSyntheticSelfLabel(clean)) return true;
  if (/^\+?\d{10,}$/.test(clean.replace(/[\s()-]/g, ""))) return true;
  if (message.pushName && clean === message.pushName.trim().toLowerCase()) return true;
  if (message.senderPhone && clean === message.senderPhone.trim().toLowerCase()) return true;
  return false;
}

async function resolveGroupSubjectFromEvolution(instance: JsonObject, groupJid: string | null): Promise<string | null> {
  if (!groupJid || !groupJid.includes("@g.us")) return null;
  try {
    const creds = resolveEvolutionCredentialsForInstance(instance as any);
    if (!creds?.baseUrl || !creds?.apiKey || !creds?.externalName) return null;
    const cleanBase = creds.baseUrl.replace(/\/+$/, "");
    const res = await fetch(
      `${cleanBase}/group/findGroupInfos/${encodeURIComponent(creds.externalName)}?groupJid=${encodeURIComponent(groupJid)}`,
      {
        method: "GET",
        headers: { apikey: creds.apiKey },
        signal: AbortSignal.timeout(3000),
      },
    ).catch(() => null);
    if (!res || !res.ok) return null;
    const json = (await res.json().catch(() => null)) as any;
    const subject = firstString(json?.subject, json?.data?.subject, json?.name);
    if (!subject || isSyntheticSelfLabel(subject) || /^\+?\d{10,}$/.test(subject.trim())) return null;
    return subject;
  } catch {
    return null;
  }
}

export async function persistInboundMessage(
  db: ReturnType<typeof getServerClient>,
  provider: UnofficialWhatsAppProvider,
  instance: JsonObject,
  body: JsonObject,
  message: NormalizedMessage,
  options?: { existingEventId?: string },
) {
  const isGroupJid = Boolean(message.isGroup || (message.externalUserId && message.externalUserId.endsWith("@g.us")));
  const isLidJid = Boolean(
    !isGroupJid &&
    message.externalUserId &&
    (message.externalUserId.endsWith("@lid") || (!message.phone && message.externalUserId.replace(/\D/g, "").length >= 14)),
  );
  if (!message.phone && !isGroupJid && !isLidJid) return { ignored: "without_phone" };
  const storeId = String(instance.store_id);
  const eventKey = stableKey(["message", provider, instance.id, message.externalMessageId]);
  const eventLookup = options?.existingEventId
    ? await db.from("whatsapp_provider_webhook_events").select("id, processing_status").eq("id", options.existingEventId).maybeSingle()
    : await db.from("whatsapp_provider_webhook_events").upsert({ provider, instance_id: instance.id, store_id: storeId, event_key: eventKey, event_type: message.fromMe ? "outbound_echo" : "message", external_message_id: message.externalMessageId, payload_hash: hashBody(JSON.stringify(body)), payload: message.payload, signature_verified: true }, { onConflict: "provider,instance_id,event_key", ignoreDuplicates: true }).select("id, processing_status").maybeSingle();
  const { data: event, error: eventError } = eventLookup;
  if (eventError) throw eventError;
  // A ausência de data significa duplicata sob concorrência, não um novo evento.
  if (!event || event.processing_status === "processed") return { duplicate: true };
  const resolvedGroupJid = isGroupJid ? (message.groupJid || message.externalUserId) : null;
  const resolvedGroupSubject =
    isGroupJid
      ? ((!isParticipantDisplaySameAsSender(message.groupSubject, message) ? message.groupSubject : null) ||
         (await resolveGroupSubjectFromEvolution(instance, resolvedGroupJid)))
      : null;

  const identityPhoneSeed = isGroupJid
    ? (resolvedGroupJid || "120363000000000000@g.us")
    : (message.phone || message.externalUserId || "0000000");
  const identity = await resolveWhatsAppIdentity({
    storeId,
    instanceId: instance.id,
    provider,
    externalUserId: isGroupJid ? resolvedGroupJid : message.externalUserId,
    phone: identityPhoneSeed,
    displayName: isGroupJid
      ? (resolvedGroupSubject || null)
      : (message.fromMe ? null : message.pushName),
  });
  if (!identity) return { ignored: "identity_not_resolved" };
  const cleanDigits = isGroupJid ? "" : (message.phone || message.externalUserId || "").replace(/\D/g, "");
  const threadLookupFilters = isGroupJid
    ? [
        `channel_identity_id.eq.${identity.id}`,
        ...(resolvedGroupJid ? [`entity_id.eq.${resolvedGroupJid}`] : []),
      ]
    : [
        `channel_identity_id.eq.${identity.id}`,
        ...(message.phone ? [`entity_id.eq.${message.phone}`, `primary_phone_e164.eq.${message.phone}`] : []),
        ...(message.externalUserId ? [`entity_id.eq.${message.externalUserId}`] : []),
        ...(cleanDigits.length >= 8 ? [`entity_id.eq.${cleanDigits}`, `entity_id.eq.+${cleanDigits}`] : []),
      ];
  let threadLookupQuery = db
    .from("chat_threads")
    .select("id, thread_type, entity_id, metadata, guest_name, group_subject, primary_phone_e164, lead_id, attribution")
    .eq("store_id", storeId)
    .or(threadLookupFilters.join(","));
  if (isGroupJid) {
    threadLookupQuery = threadLookupQuery.eq("thread_type", "group");
  }
  const { data: threadCandidates } = await threadLookupQuery
    .order("updated_at", { ascending: false })
    .limit(10);
  let thread =
    ((threadCandidates as any[]) || []).find((cand) =>
      isGroupJid
        ? isGroupThreadRow(cand, resolvedGroupJid)
        : !isGroupThreadRow(cand) && !isChannelThreadRow(cand),
    ) || null;
  const groupDigitsSeed = isGroupJid && resolvedGroupJid ? resolvedGroupJid.replace(/\D/g, "") : "";
  const syntheticEmail = isGroupJid
    ? `${groupDigitsSeed || "grupo"}@grupo.whatsapp.waesy`
    : `${cleanDigits || "contato"}@whatsapp.waesy`;
  if (!thread) {
    const safeIdentityName =
      identity.display_name &&
      !isSyntheticSelfLabel(identity.display_name) &&
      !/^\+?\d{14,}$/.test(identity.display_name.trim())
        ? identity.display_name
        : null;
    const safeGroupIdentityName =
      safeIdentityName && !isParticipantDisplaySameAsSender(safeIdentityName, message) && !safeIdentityName.startsWith("+120363")
        ? safeIdentityName
        : null;
    const safeGuestName = isGroupJid
      ? (resolvedGroupSubject || safeGroupIdentityName || "Grupo WhatsApp")
      : (!message.fromMe && message.pushName && !isSyntheticSelfLabel(message.pushName) && !/^\+?\d{14,}$/.test(message.pushName.trim()))
        ? message.pushName
        : (safeIdentityName || message.phone || `Contato WhatsApp #${cleanDigits.slice(-4) || "LID"}`);
    const initialParticipants =
      isGroupJid && !message.fromMe && (message.senderPhone || message.pushName || message.senderJid)
        ? [{
            phone: message.senderPhone || null,
            name: message.pushName || message.senderPhone || "Participante",
            jid: message.senderJid || null,
            last_seen_at: message.occurredAt,
          }]
        : [];
    let autoMatchedLeadId: string | null = null;
    let autoMatchedCustomerId: string | null = null;
    const suppressionForNewThread = !isGroupJid && !isLidJid && message.phone
      ? await resolveContactCaptureSuppression(db, {
          storeId,
          identityId: identity?.id || null,
          identityRow: identity || null,
          phone: message.phone,
        }).catch(() => ({ suppressed: false }))
      : { suppressed: false };
    if (!isGroupJid && !isLidJid && message.phone && !suppressionForNewThread.suppressed) {
      try {
        const phoneVariants = buildBrazilPhoneVariants(message.phone);
        if (phoneVariants.length > 0) {
          const { data: matchedLead } = await db
            .from("leads_crm")
            .select("id, customer_id")
            .eq("store_id", storeId)
            .or(phoneVariants.map((v) => `phone.eq.${v}`).join(","))
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (matchedLead?.id) {
            autoMatchedLeadId = matchedLead.id;
            autoMatchedCustomerId = matchedLead.customer_id || null;
          }
        }
      } catch {
        // Opcional em bases ou mocks legados
      }
    }
    const created = await db.from("chat_threads").insert({
      store_id: storeId,
      channel_instance_id: instance.id,
      channel_identity_id: identity.id,
      ...(autoMatchedLeadId ? { lead_id: autoMatchedLeadId } : {}),
      ...(autoMatchedCustomerId ? { customer_id: autoMatchedCustomerId } : {}),
      guest_name: safeGuestName,
      guest_email: syntheticEmail,
      group_subject: isGroupJid ? (message.groupSubject || null) : null,
      primary_phone_e164: isGroupJid || isLidJid ? null : message.phone,
      status: "open",
      subject: isGroupJid
        ? (message.groupSubject ? `Grupo ${message.groupSubject}` : "Grupo WhatsApp")
        : `WhatsApp ${message.phone || safeGuestName}`,
      context_type: "whatsapp",
      thread_type: isGroupJid ? "group" : "store",
      entity_id: isGroupJid
        ? (message.groupJid || message.externalUserId)
        : (message.phone || message.externalUserId),
      department: "geral",
      priority: "normal",
      ...(message.fromMe ? {} : { last_customer_message_at: message.occurredAt }),
      last_message_text: message.text.slice(0, 200),
      last_message_at: message.occurredAt,
      metadata: {
        is_group: isGroupJid,
        is_lid: isLidJid,
        remote_jid: message.externalUserId,
        whatsapp_jid: message.externalUserId,
        ...(autoMatchedLeadId ? { active_lead_id: autoMatchedLeadId } : {}),
        ...(isGroupJid && message.groupSubject ? { group_subject: message.groupSubject } : {}),
        ...(initialParticipants.length > 0 ? { participants: initialParticipants } : {}),
        ...(!isGroupJid && message.pushName ? { push_name: message.pushName } : {}),
        ...(message.fromMe ? { handoff_mode: "human_active", ai_auto_reply_enabled: false, last_device_reply_at: message.occurredAt } : {}),
      },
    }).select("id, metadata, guest_name, group_subject, primary_phone_e164, lead_id, attribution").single();
    if (created.error) throw created.error;
    thread = created.data;
  }

  // Tratamento determinístico de mensagens enviadas pelo aparelho ou ecoadas pelo provedor (fromMe: true)
  if (message.fromMe) {
    const { data: existingByExternalId } = await db
      .from("chat_messages")
      .select("id, delivery_status, payload")
      .eq("thread_id", thread.id)
      .eq("external_message_id", message.externalMessageId)
      .maybeSingle();

    if (existingByExternalId) {
      const currentRank = deliveryRank(existingByExternalId.delivery_status);
      const nextStatus = currentRank < deliveryRank("sent") ? "sent" : existingByExternalId.delivery_status;
      await db.from("chat_messages").update({
        delivery_status: nextStatus,
        sent_at: message.occurredAt,
      attachments: message.attachments,
      }).eq("id", existingByExternalId.id);
      if (event?.id) await db.from("whatsapp_provider_webhook_events").update({ processing_status: "processed", processed_at: new Date().toISOString(), error_message: null }).eq("id", event.id);
      return { threadId: thread.id, messageId: existingByExternalId.id, reconciled: "existing_external_id" };
    }

    // Conciliação com whatsapp_outbox ou mensagem enviada pelo painel ainda sem external_message_id (janela de 5 min)
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: outboxMatch } = await db
      .from("whatsapp_outbox")
      .select("id, idempotency_key, status, payload, external_message_id")
      .eq("store_id", storeId)
      .eq("thread_id", thread.id)
      .gte("updated_at", fiveMinAgo)
      .order("updated_at", { ascending: false })
      .limit(10);

    const matchedOutbox = (outboxMatch || []).find((row: JsonObject) => {
      if (row.external_message_id === message.externalMessageId) return true;
      const outboxText = typeof row.payload?.text === "string" ? row.payload.text.trim() : "";
      return !row.external_message_id && outboxText.length > 0 && outboxText === message.text.trim();
    });

    let candidateChatMessageId: string | null = null;
    if (matchedOutbox) {
      const fromPayload = typeof matchedOutbox.payload?.chat_message_id === "string" ? matchedOutbox.payload.chat_message_id : null;
      const fromKey = typeof matchedOutbox.idempotency_key === "string" && matchedOutbox.idempotency_key.startsWith("chat_msg:")
        ? matchedOutbox.idempotency_key.slice("chat_msg:".length)
        : null;
      candidateChatMessageId = fromPayload || fromKey;
      await db.from("whatsapp_outbox").update({
        status: "accepted",
        external_message_id: message.externalMessageId,
        locked_by: null,
        locked_at: null,
        last_error_code: null,
        last_error_message: null,
        updated_at: new Date().toISOString(),
      }).eq("id", matchedOutbox.id);
    }

    if (!candidateChatMessageId) {
      const { data: recentUnlinked } = await db
        .from("chat_messages")
        .select("id, message, is_encrypted")
        .eq("thread_id", thread.id)
        .eq("is_staff_reply", true)
        .is("external_message_id", null)
        .gte("created_at", fiveMinAgo)
        .order("created_at", { ascending: false })
        .limit(5);

      for (const candidate of recentUnlinked || []) {
        let plainText = String(candidate.message || "");
        if (plainText.startsWith("waesy-msg:")) {
          try {
            plainText = await decryptConversationMessageForThread(storeId, thread.id, plainText);
          } catch {
            // noop
          }
        }
        if (plainText.trim() === message.text.trim()) {
          candidateChatMessageId = candidate.id;
          break;
        }
      }
    }

    if (candidateChatMessageId) {
      const { data: targetRow } = await db.from("chat_messages").select("id, payload").eq("id", candidateChatMessageId).maybeSingle();
      if (targetRow) {
        const existingPayload = (targetRow.payload && typeof targetRow.payload === "object" ? targetRow.payload : {}) as Record<string, unknown>;
        await db.from("chat_messages").update({
          external_message_id: message.externalMessageId,
          provider,
          delivery_status: "sent",
          sent_at: message.occurredAt,
      attachments: message.attachments,
          failed_at: null,
          error_code: null,
          error_message: null,
          payload: {
            ...existingPayload,
            origin: existingPayload.origin || "waesy_panel",
            from_me: true,
            reconciled_via_webhook: true,
            external_message_id: message.externalMessageId,
          },
        }).eq("id", targetRow.id);
        if (event?.id) await db.from("whatsapp_provider_webhook_events").update({ processing_status: "processed", processed_at: new Date().toISOString(), error_message: null }).eq("id", event.id);
        return { threadId: thread.id, messageId: targetRow.id, reconciled: "outbox_or_inflight_matched" };
      }
    }

    // Mensagem genuinamente enviada pelo aplicativo WhatsApp (celular ou WhatsApp Web)
    const { data: createdDeviceMsg, error: deviceInsertError } = await db.from("chat_messages").insert({
      thread_id: thread.id,
      channel_identity_id: identity.id,
      channel: "whatsapp",
      message: message.text,
      message_type: message.messageType,
      is_staff_reply: true,
      is_encrypted: false,
      encryption_version: 1,
      provider,
      external_message_id: message.externalMessageId,
      provider_message_id: message.externalMessageId,
      provider_name: provider,
      delivery_status: "sent",
      sent_at: message.occurredAt,
      attachments: message.attachments,
      payload: {
        ...message.payload,
        media: message.media,
        from_me: true,
        origin: "whatsapp_device",
        instance_id: instance.id,
      },
      created_at: message.occurredAt,
    }).select("id").single();
    if (deviceInsertError) {
      if (isUniqueViolationError(deviceInsertError)) {
        if (event?.id) await db.from("whatsapp_provider_webhook_events").update({ processing_status: "processed", processed_at: new Date().toISOString(), error_message: null }).eq("id", event.id);
        return { threadId: thread.id, messageId: null, reconciled: "duplicate_external_id_ignored" };
      }
      throw deviceInsertError;
    }

    if (
      createdDeviceMsg?.id &&
      provider === "evolution_api" &&
      message.externalMessageId &&
      message.media?.type &&
      isBrokenOrMissingMediaUri(message.media.url, message.messageType)
    ) {
      await hydrateMediaFromEvolution({
        db,
        storeId,
        instance: instance as EvolutionInstanceRecord,
        threadId: thread.id,
        messageId: createdDeviceMsg.id,
        externalMessageId: message.externalMessageId,
        remoteJid: message.externalUserId,
        fromMe: true,
        messageType: message.messageType,
        preferredMime: message.media.mimetype,
      }).catch(() => null);
    }

    const currentThreadMeta = (thread.metadata && typeof thread.metadata === "object" ? thread.metadata : {}) as Record<string, unknown>;
    const occurredMs = Date.parse(message.occurredAt) || Date.now();
    const prevCursorMs = Number(currentThreadMeta.sync_cursor_ms || 0);
    await db.from("chat_threads").update({
      last_message_text: message.text.slice(0, 200),
      last_message_at: message.occurredAt,
      updated_at: new Date().toISOString(),
      metadata: {
        ...currentThreadMeta,
        handoff_mode: "human_active",
        ai_auto_reply_enabled: false,
        last_device_reply_at: message.occurredAt,
        history_bootstrap_done: true,
        sync_cursor_ms: Math.max(prevCursorMs, occurredMs),
      },
    }).eq("id", thread.id).eq("store_id", storeId);

    if (event?.id) await db.from("whatsapp_provider_webhook_events").update({ processing_status: "processed", processed_at: new Date().toISOString(), error_message: null }).eq("id", event.id);
    return { threadId: thread.id, messageId: createdDeviceMsg?.id || null, origin: "whatsapp_device" };
  }

  let insertedMessageId: string | null = null;
  const { data: existingMsg } = await db
    .from("chat_messages")
    .select("id")
    .eq("thread_id", thread.id)
    .eq("external_message_id", message.externalMessageId)
    .maybeSingle();

  if (existingMsg) {
    insertedMessageId = existingMsg.id;
  } else {
    const { data: createdMsg, error: insertError } = await db.from("chat_messages").insert({
      thread_id: thread.id,
      channel_identity_id: identity.id,
      channel: "whatsapp",
      message: message.text,
      message_type: message.messageType,
      is_staff_reply: false,
      is_encrypted: false,
      encryption_version: 1,
      provider,
      external_message_id: message.externalMessageId,
      provider_message_id: message.externalMessageId,
      provider_name: provider,
      delivery_status: "delivered",
      sent_at: message.occurredAt,
      attachments: message.attachments,
      delivered_at: message.occurredAt,
      payload: {
        ...message.payload,
        media: message.media,
        origin: "whatsapp_customer",
        from_me: false,
        ...(isGroupJid ? {
          sender_phone: message.senderPhone,
          sender_name: message.pushName || message.senderPhone || "Participante",
          sender_jid: message.senderJid,
        } : {}),
        ...(message.referral ? { referral: message.referral } : {}),
      },
      created_at: message.occurredAt,
    }).select("id").single();
    if (insertError) {
      if (isUniqueViolationError(insertError)) {
        const { data: dupRow } = await db
          .from("chat_messages")
          .select("id")
          .eq("thread_id", thread.id)
          .eq("external_message_id", message.externalMessageId)
          .maybeSingle();
        insertedMessageId = dupRow?.id || null;
      } else {
        throw insertError;
      }
    } else {
      insertedMessageId = createdMsg?.id || null;
    }

    if (
      insertedMessageId &&
      provider === "evolution_api" &&
      message.externalMessageId &&
      (message.media?.type || ["audio", "image", "video", "document", "sticker"].includes(message.messageType)) &&
      isBrokenOrMissingMediaUri(message.media?.url, message.messageType)
    ) {
      await hydrateMediaFromEvolution({
        db,
        storeId,
        instance: instance as EvolutionInstanceRecord,
        threadId: thread.id,
        messageId: insertedMessageId,
        externalMessageId: message.externalMessageId,
        remoteJid: message.externalUserId,
        fromMe: false,
        messageType: message.messageType,
        preferredMime: message.media?.mimetype,
      }).catch(() => null);
    }

    let audioTranscriptText: string | null = null;
    if (insertedMessageId && message.messageType === "audio") {
      const { transcribeAudioMediaServer } = await import("@/services/whatsapp-media-intelligence.server");
      const transcription = await transcribeAudioMediaServer({
        db,
        storeId,
        threadId: thread.id,
        messageId: insertedMessageId,
      }).catch(() => null);
      if (transcription && typeof (transcription as any).transcript === "string" && (transcription as any).transcript.trim()) {
        audioTranscriptText = String((transcription as any).transcript).trim();
      }
    }
    if (audioTranscriptText) {
      message.text = audioTranscriptText;
      message.payload = { ...message.payload, transcribed_from_audio: true, audio_transcript: audioTranscriptText };
    }
  }
  if (insertedMessageId) {
    const existingMeta = ((thread.metadata && typeof thread.metadata === "object" ? thread.metadata : {}) as Record<string, any>);
    const hasManualOverride = Boolean(existingMeta?.customer_profile_override?.full_name);

    const shouldHealGuestName = !hasManualOverride && Boolean(
      isGroupJid
        ? (resolvedGroupSubject && (!thread.guest_name || thread.guest_name === "Grupo WhatsApp" || /^\+?\d+$/.test(String(thread.guest_name).trim()) || isParticipantDisplaySameAsSender(thread.guest_name, message)))
        : (message.pushName && !isSyntheticSelfLabel(message.pushName) && !/^\+?\d{14,}$/.test(message.pushName.trim()) && (isSyntheticSelfLabel(thread.guest_name) || thread.guest_name === message.phone || thread.guest_name === cleanDigits || /^\+?\d{10,}$/.test(String(thread.guest_name || "").trim()) || String(thread.guest_name || "").startsWith("Contato WhatsApp")))
    );

    let nextParticipants = Array.isArray(existingMeta.participants) ? [...existingMeta.participants] : [];
    if (isGroupJid && (message.senderPhone || message.pushName || message.senderJid)) {
      const pKey = message.senderPhone || message.senderJid || message.pushName;
      nextParticipants = nextParticipants.filter((p: any) => (p?.phone || p?.jid || p?.name) !== pKey);
      nextParticipants.unshift({
        phone: message.senderPhone || null,
        name: message.pushName || message.senderPhone || "Participante",
        jid: message.senderJid || null,
        last_seen_at: message.occurredAt,
      });
      nextParticipants = nextParticipants.slice(0, 40);
    }

    const occurredMs = Date.parse(message.occurredAt) || Date.now();
    const prevCursorMs = Number(existingMeta.sync_cursor_ms || 0);
    const updatedMeta = {
      ...existingMeta,
      is_group: isGroupJid,
      history_bootstrap_done: true,
      sync_cursor_ms: Math.max(prevCursorMs, occurredMs),
      ...(isGroupJid && resolvedGroupSubject ? { group_subject: resolvedGroupSubject } : {}),
      ...(nextParticipants.length > 0 ? { participants: nextParticipants } : {}),
      ...(!isGroupJid && message.pushName ? { push_name: message.pushName } : {}),
    };

    await db.from("chat_threads").update({
      ...(shouldHealGuestName ? { guest_name: isGroupJid ? resolvedGroupSubject : message.pushName } : {}),
      ...(isGroupJid && resolvedGroupSubject ? { group_subject: resolvedGroupSubject } : {}),
      ...(!isGroupJid && message.phone ? { primary_phone_e164: message.phone } : {}),
      metadata: updatedMeta,
      last_customer_message_at: message.occurredAt,
      last_message_text: message.text.slice(0, 200),
      last_message_at: message.occurredAt,
      updated_at: new Date().toISOString(),
      status: "open",
    }).eq("id", thread.id).eq("store_id", storeId);

    if (!isGroupJid && message.phone && cleanDigits.length >= 8) {
      try {
        await correlateAndPersistInboundWhatsAppAttribution(db, {
          storeId,
          threadId: thread.id,
          identityId: identity.id,
          phone: message.phone,
          pushName: message.pushName,
          text: message.text,
          payload: message.payload,
          existingThreadMeta: {
            ...updatedMeta,
            ...(identity?.contact_scope ? { contact_scope: identity.contact_scope } : {}),
            ...(identity?.suppress_lead_capture ? { suppress_lead_capture: true } : {}),
          },
          existingThreadAttribution: (thread as any).attribution || null,
        });
      } catch {
        // Fallback preservado caso correlação falhe
      }
    }

    await dispatchWhatsAppInboundFlows({
      storeId,
      instanceId: instance.id,
      provider,
      threadId: thread.id,
      identityId: identity.id,
      phone: message.phone || identityPhoneSeed,
      text: message.text,
      eventId: event?.id || null,
      payload: { ...message.payload, event_type: eventName(body) },
    });
  }
  if (event?.id) await db.from("whatsapp_provider_webhook_events").update({ processing_status: "processed", processed_at: new Date().toISOString(), error_message: null }).eq("id", event.id);
  return { threadId: thread.id, messageId: insertedMessageId };
}

export function extractRevokedMessageIds(body: JsonObject): string[] {
  const ids: string[] = [];
  const data = body.data || {};
  if (Array.isArray(data.keys)) {
    for (const k of data.keys) {
      const id = firstString(k?.id, k?.key?.id);
      if (id && !ids.includes(id)) ids.push(id);
    }
  }
  if (Array.isArray(body.keys)) {
    for (const k of body.keys) {
      const id = firstString(k?.id, k?.key?.id);
      if (id && !ids.includes(id)) ids.push(id);
    }
  }
  const directId = firstString(data.id, data.key?.id, body.id, body.key?.id);
  if (directId && !ids.includes(directId)) ids.push(directId);

  for (const item of messageItems(body)) {
    const proto = item.message?.protocolMessage || item.protocolMessage;
    if (proto && (proto.type === 0 || proto.type === "REVOKE" || String(proto.type).toUpperCase() === "REVOKE")) {
      const protoKeyId = firstString(proto.key?.id, proto.keyId);
      if (protoKeyId && !ids.includes(protoKeyId)) ids.push(protoKeyId);
    }
  }
  return ids;
}

async function persistRevokedMessage(
  db: ReturnType<typeof getServerClient>,
  provider: UnofficialWhatsAppProvider,
  instance: JsonObject,
  body: JsonObject,
  externalMessageId: string,
  occurredAt = new Date().toISOString(),
) {
  const storeId = String(instance.store_id);
  const eventKey = stableKey(["revoke", provider, instance.id, externalMessageId, occurredAt]);
  await db.from("whatsapp_provider_webhook_events").upsert(
    {
      provider,
      instance_id: instance.id,
      store_id: storeId,
      event_key: eventKey,
      event_type: "message_revoked",
      external_message_id: externalMessageId,
      payload_hash: hashBody(JSON.stringify(body)),
      payload: { external_message_id: externalMessageId, revoked_at: occurredAt, provider },
      signature_verified: true,
      processing_status: "processed",
      processed_at: new Date().toISOString(),
    },
    { onConflict: "provider,instance_id,event_key", ignoreDuplicates: true },
  );

  const { data: messages } = await db
    .from("chat_messages")
    .select("id, thread_id, payload, thread:chat_threads!inner(store_id)")
    .eq("channel", "whatsapp")
    .eq("external_message_id", externalMessageId)
    .eq("thread.store_id", storeId);

  // Invariante B.33 Anti-Fake & Auditoria SAC:
  // Mensagens excluídas por clientes no WhatsApp NÃO são excluídas no sistema Waesy.
  // Preserva o registro original intacto em chat_messages, atualizando apenas a flag de revogação.
  for (const msg of messages || []) {
    const currentPayload = (msg.payload && typeof msg.payload === "object" ? msg.payload : {}) as Record<string, unknown>;
    await db
      .from("chat_messages")
      .update({
        payload: {
          ...currentPayload,
          is_revoked_by_sender: true,
          revoked_at: occurredAt,
          revocation_event: "messages.delete",
        },
      })
      .eq("id", msg.id)
      .eq("thread_id", msg.thread_id);
  }

  return { externalMessageId, revoked: true, preservedMessagesCount: messages?.length || 0 };
}

export function verifyUnofficialWebhookAuth(params: {
  provider: UnofficialWhatsAppProvider;
  rawBody: string;
  headers: Headers;
  secret: string | null;
  masterApiKey: string | null;
  allowUnsigned?: boolean;
}): boolean {
  let bodyApiKey: string | null = null;
  try {
    const parsed = JSON.parse(params.rawBody) as Record<string, unknown>;
    bodyApiKey = firstString(
      parsed?.apikey,
      parsed?.api_key,
      parsed?.token,
      (parsed?.data as Record<string, unknown> | undefined)?.apikey,
    );
  } catch {
    bodyApiKey = null;
  }

  const receivedApiKey = firstString(
    params.headers.get("apikey"),
    params.headers.get("x-api-key"),
    params.headers.get("authorization")?.replace(/^Bearer\s+/i, ""),
    bodyApiKey,
  );

  if (
    receivedApiKey &&
    ((params.secret && timingSafeCompare(receivedApiKey, params.secret)) ||
      (params.masterApiKey && timingSafeCompare(receivedApiKey, params.masterApiKey)))
  ) {
    return true;
  }

  if (
    params.secret &&
    (params.headers.has("x-waesy-signature") || params.headers.has("x-webhook-signature"))
  ) {
    const verification = verifyWebhookSignature(params.rawBody, params.headers, params.secret, {
      signatureHeader: params.headers.has("x-waesy-signature")
        ? "x-waesy-signature"
        : "x-webhook-signature",
      timestampHeader: params.headers.has("x-waesy-timestamp")
        ? "x-waesy-timestamp"
        : "x-webhook-timestamp",
    });
    return verification.ok;
  }

  // Fail-closed whenever a secret or masterApiKey exists; only permit unsigned webhooks if explicitly configured or local dev
  if (
    params.provider === "evolution_api" &&
    !params.secret &&
    !params.masterApiKey &&
    (params.allowUnsigned === true || process.env.NODE_ENV !== "production")
  ) {
    return true;
  }

  return false;
}

async function touchInstanceWebhookHeartbeat(
  db: ReturnType<typeof getServerClient>,
  instance: JsonObject,
  eventNameValue: string,
) {
  const pub = (instance.public_config && typeof instance.public_config === "object"
    ? instance.public_config
    : {}) as Record<string, unknown>;
  const prevAtMs = typeof pub.last_webhook_at === "string" ? Date.parse(pub.last_webhook_at) || 0 : 0;
  const needsHeal = instance.status !== "connected" && instance.status !== "revoked";
  const staleHeartbeat = !prevAtMs || Date.now() - prevAtMs > 30_000;
  if (!needsHeal && !staleHeartbeat) return;

  const nowIso = new Date().toISOString();
  await db
    .from("whatsapp_channel_instances")
    .update({
      ...(needsHeal ? { status: "connected", is_active: true, last_error_code: null, last_error_message: null } : {}),
      public_config: {
        ...pub,
        last_webhook_at: nowIso,
        last_webhook_event: eventNameValue,
        ...(needsHeal ? { last_connected_at: nowIso, last_webhook_state: "open", session_revoked: false } : {}),
      },
      last_health_check_at: nowIso,
      updated_at: nowIso,
    })
    .eq("id", instance.id);
}

async function persistMetadataSyncEvents(
  db: ReturnType<typeof getServerClient>,
  instance: JsonObject,
  eventNameValue: string,
  body: JsonObject,
): Promise<number> {
  const storeId = String(instance.store_id);
  const rawList = Array.isArray(body.data)
    ? body.data
    : body.data && typeof body.data === "object"
      ? [body.data]
      : [];
  const items = rawList.filter((it): it is JsonObject => Boolean(it && typeof it === "object")).slice(0, 15);
  if (items.length === 0) return 0;

  const nowIso = new Date().toISOString();
  let updatedCount = 0;

  for (const item of items) {
    const jid = firstString(item.id, item.remoteJid, item.jid, item.groupJid);
    if (!jid || jid === "status@broadcast" || jid.endsWith("@broadcast")) continue;
    const lowerJid = jid.toLowerCase();
    const isGroup = lowerJid.endsWith("@g.us");
    const digits = jid.replace(/@.*$/, "").replace(/\D/g, "");
    const rawName = firstString(item.subject, item.name, item.pushName, item.verifiedName);
    const safeName = rawName && !isRawLidOrSyntheticName(rawName, digits) ? rawName : null;
    const avatarUrl = firstString(item.profilePicUrl, item.profilePictureUrl, item.pictureUrl, item.imgUrl);

    if (isGroup && eventNameValue.startsWith("group")) {
      const participantsRaw = Array.isArray(item.participants) ? item.participants.slice(0, 40) : null;
      const participants = participantsRaw
        ? participantsRaw.map((p: any) => ({
            jid: String(p?.id || p?.jid || ""),
            phone: extractParticipantPhone(p?.phoneNumber || p?.pn || p?.id || p?.jid),
            name: firstString(p?.pushName, p?.name),
            admin: Boolean(p?.admin),
          }))
        : null;

      await db
        .from("whatsapp_groups_directory")
        .upsert(
          {
            store_id: storeId,
            instance_id: instance.id,
            group_jid: jid,
            ...(safeName ? { subject: safeName } : {}),
            ...(avatarUrl && avatarUrl.startsWith("http") ? { avatar_url: avatarUrl } : {}),
            ...(participants ? { participants_count: participants.length } : {}),
            updated_at: nowIso,
          },
          { onConflict: "instance_id,group_jid" },
        )
        .then(() => undefined, () => undefined);

      const { data: groupThread } = await db
        .from("chat_threads")
        .select("id, metadata, guest_name")
        .eq("store_id", storeId)
        .or(`entity_id.eq.${jid},metadata->>whatsapp_jid.eq.${jid}`)
        .limit(1)
        .maybeSingle();

      if (groupThread?.id) {
        const prevMeta = (groupThread.metadata && typeof groupThread.metadata === "object"
          ? groupThread.metadata
          : {}) as JsonObject;
        await db
          .from("chat_threads")
          .update({
            ...(safeName ? { guest_name: safeName, group_subject: safeName, subject: `Grupo: ${safeName}` } : {}),
            metadata: {
              ...prevMeta,
              is_group: true,
              whatsapp_jid: jid,
              ...(safeName ? { group_subject: safeName } : {}),
              ...(avatarUrl && avatarUrl.startsWith("http") ? { avatar_url: avatarUrl } : {}),
              ...(participants ? { participants, participants_count: participants.length } : {}),
            },
            updated_at: nowIso,
          })
          .eq("id", groupThread.id);
        updatedCount += 1;
      }
      continue;
    }

    const altPhone = !isGroup ? normalizePhoneE164(item.phoneNumber || item.pn || jid) : null;
    const filters = [`metadata->>whatsapp_jid.eq.${jid}`, `entity_id.eq.${jid}`];
    if (altPhone) filters.push(`primary_phone_e164.eq.${altPhone}`);

    const { data: targetThread } = await db
      .from("chat_threads")
      .select("id, guest_name, metadata")
      .eq("store_id", storeId)
      .or(filters.join(","))
      .limit(1)
      .maybeSingle();

    if (targetThread?.id) {
      const prevMeta = (targetThread.metadata && typeof targetThread.metadata === "object"
        ? targetThread.metadata
        : {}) as JsonObject;
      const curName = String(targetThread.guest_name || "").trim();
      const shouldRename =
        Boolean(safeName) &&
        (!curName ||
          isRawLidOrSyntheticName(curName, digits) ||
          curName.startsWith("Contato Meta") ||
          curName.startsWith("WhatsApp ") ||
          curName === "Cliente");

      const patch: Record<string, any> = {
        metadata: {
          ...prevMeta,
          ...(avatarUrl && avatarUrl.startsWith("http") ? { avatar_url: avatarUrl } : {}),
          ...(safeName && !isGroup ? { push_name: safeName } : {}),
          ...(safeName && isGroup ? { group_subject: safeName } : {}),
        },
        updated_at: nowIso,
      };
      if (shouldRename && safeName) {
        patch.guest_name = safeName;
        if (isGroup) patch.group_subject = safeName;
      }
      await db.from("chat_threads").update(patch).eq("id", targetThread.id);
      updatedCount += 1;
    }
  }

  return updatedCount;
}

export async function handleUnofficialWhatsAppWebhook(request: Request, provider: UnofficialWhatsAppProvider, instanceKey: string) {
  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).byteLength > 2_097_152) return json({ error: "Webhook payload too large" }, 413);
  let body: JsonObject;
  try { body = JSON.parse(rawBody) as JsonObject; } catch { return json({ error: "Invalid JSON payload" }, 400); }
  const db = getServerClient();
  const sanitizeInstanceToken = (val: string | null | undefined) =>
    String(val || "").trim().replace(/[^a-zA-Z0-9._:@-]/g, "").slice(0, 128);
  const safeInstanceKey = sanitizeInstanceToken(instanceKey);
  if (!safeInstanceKey) return json({ error: "Invalid WhatsApp instance key" }, 400);
  const bodyInstanceName = sanitizeInstanceToken(firstString(body.instance, body.data?.instance, body.instanceName));
  const lookupClauses = [
    `instance_key.eq.${safeInstanceKey}`,
    `external_instance_id.eq.${safeInstanceKey}`,
    ...(bodyInstanceName && bodyInstanceName !== safeInstanceKey
      ? [`instance_key.eq.${bodyInstanceName}`, `external_instance_id.eq.${bodyInstanceName}`]
      : []),
  ];
  const { data: instance, error: instanceError } = await db
    .from("whatsapp_channel_instances")
    .select("id, store_id, provider, instance_key, external_instance_id, webhook_url, display_phone_number, sync_mode, secret_payload_encrypted, is_active, status, public_config")
    .eq("provider", provider)
    .or(lookupClauses.join(","))
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (instanceError || !instance) return json({ error: "Unknown WhatsApp instance" }, 404);
  const secrets = secretConfig(instance.secret_payload_encrypted);
  const secret = firstString(secrets.webhook_secret, secrets.webhookSecret, secrets.secret, secrets.api_key);
  const masterApiKey = getEnvVar("EVOLUTION_API_KEY")?.trim() || null;
  const allowUnsigned = Boolean((instance.public_config as Record<string, unknown> | null)?.allow_unsigned_webhook);

  const reqUrl = new URL(request.url, "https://waesy.com.br");
  const queryApiKey = firstString(reqUrl.searchParams.get("apikey"), reqUrl.searchParams.get("token"));
  const effectiveHeaders = new Headers(request.headers);
  if (queryApiKey && !effectiveHeaders.has("apikey")) {
    effectiveHeaders.set("apikey", queryApiKey);
  }

  const isVerified = verifyUnofficialWebhookAuth({
    provider,
    rawBody,
    headers: effectiveHeaders,
    secret,
    masterApiKey,
    allowUnsigned,
  });

  if (!isVerified) return json({ error: "Invalid webhook signature or api key" }, 401);
  const name = eventName(body);
  if (name === "connection.update" || name === "qrcode.updated") {
    const state = firstString(body.data?.state, body.state) || (name === "qrcode.updated" ? "connecting" : "connecting");
    const statusReason = Number(body.data?.statusReason ?? body.statusReason ?? 0);
    const isRevoked = state === "close" && statusReason === 401;
    const statusMap = state === "open" ? "connected" : isRevoked ? "revoked" : state === "close" ? "disconnected" : "pending";
    const ownerPhone = remotePhone(firstString(body.data?.ownerJid, body.data?.wuid, body.sender));
    const rawQr = firstString(body.data?.qrcode?.base64, body.qrcode?.base64, body.data?.base64);
    const normalizedQr = rawQr ? (rawQr.startsWith("data:") ? rawQr : `data:image/png;base64,${rawQr}`) : null;
    const pairingCode = firstString(body.data?.qrcode?.pairingCode, body.qrcode?.pairingCode, body.data?.pairingCode);
    const nowIso = new Date().toISOString();
    const currentPublicConfig = (instance.public_config && typeof instance.public_config === "object" ? instance.public_config : {}) as Record<string, unknown>;

    // Bloqueia duplicidade de número ativo na mesma loja antes de marcar como connected
    if (ownerPhone && (statusMap === "connected" || statusMap === "pending")) {
      const { data: duplicate } = await db
        .from("whatsapp_channel_instances")
        .select("id, display_name")
        .eq("store_id", instance.store_id)
        .eq("display_phone_number", ownerPhone)
        .eq("status", "connected")
        .neq("id", instance.id)
        .maybeSingle();

      if (duplicate) {
        const baseUrl = firstString(currentPublicConfig.base_url as string | undefined, secrets.base_url as string | undefined, getEnvVar("EVOLUTION_API_URL"));
        const logoutKey = firstString(secrets.api_key as string | undefined, masterApiKey);
        const extId = instance.external_instance_id || instance.instance_key;
        if (baseUrl && logoutKey && extId) {
          await fetch(`${baseUrl.replace(/\/$/, "")}/instance/logout/${encodeURIComponent(extId)}`, {
            method: "DELETE",
            headers: { apikey: logoutKey },
            signal: AbortSignal.timeout(4000),
          }).catch(() => null);
        }

        const conflictMessage = `Número já conectado em outra instância desta loja (${duplicate.display_name}). Desconecte a outra antes ou escaneie um chip diferente.`;
        await db.from("whatsapp_channel_instances").update({
          status: "error",
          is_active: false,
          is_default: false,
          display_phone_number: null,
          last_error_code: "DUPLICATE_PHONE_CONFLICT",
          last_error_message: conflictMessage,
          public_config: {
            ...currentPublicConfig,
            qr_code_url: null,
            pairing_code: null,
            last_webhook_state: state,
            last_webhook_at: nowIso,
            duplicate_conflict_instance_id: duplicate.id,
          },
          last_health_check_at: nowIso,
          updated_at: nowIso,
        }).eq("id", instance.id);

        await db.from("whatsapp_channel_audit_events").insert({
          instance_id: instance.id,
          store_id: instance.store_id,
          actor_id: null,
          action: "instance.duplicate_phone_blocked",
          severity: "warning",
          metadata: { duplicate_instance_id: duplicate.id, duplicate_display_name: duplicate.display_name, phone: ownerPhone, source: "webhook" },
        }).then(() => null, () => null);

        return json({ ok: true, blocked: true, reason: "duplicate_phone", provider, instance: instanceKey, event: name, status: "error", conflictInstanceId: duplicate.id });
      }
    }

    const nextPublicConfig: Record<string, unknown> = {
      ...currentPublicConfig,
      ...(normalizedQr ? { qr_code_url: normalizedQr, last_qr_generated_at: nowIso } : {}),
      ...(statusMap === "connected" ? { qr_code_url: null, session_revoked: false, last_connected_at: nowIso } : {}),
      ...(isRevoked ? { session_revoked: true, last_revoked_at: nowIso } : {}),
      ...(pairingCode ? { pairing_code: pairingCode } : {}),
      last_webhook_state: state,
      last_webhook_event: name,
      last_webhook_at: nowIso,
      last_status_reason: statusReason || null,
    };
    await db.from("whatsapp_channel_instances").update({
      status: statusMap,
      ...(ownerPhone ? { display_phone_number: ownerPhone } : {}),
      ...(statusMap === "connected" ? { is_active: true, last_error_code: null, last_error_message: null } : {}),
      ...(isRevoked ? { last_error_code: "SESSION_REVOKED_401", last_error_message: "Sessão desconectada ou revogada no aparelho WhatsApp." } : {}),
      public_config: nextPublicConfig,
      last_health_check_at: nowIso,
      updated_at: nowIso,
    }).eq("id", instance.id);

    if (name === "connection.update" && statusMap === "connected" && provider === "evolution_api") {
      const updatedInstanceSnapshot = {
        ...instance,
        status: statusMap,
        public_config: nextPublicConfig,
      };
      await reconcileEvolutionWebhookIfNeeded(db, updatedInstanceSnapshot as any, false).catch(() => null);
      const lastSyncMs = Date.parse(String(nextPublicConfig.last_auto_sync_at || nextPublicConfig.last_synced_at || 0)) || 0;
      if (instance.status !== "connected" || !lastSyncMs || Date.now() - lastSyncMs > 5 * 60_000) {
        await runEvolutionDeltaSyncForInstance({
          db,
          instance: updatedInstanceSnapshot as any,
          storeId: String(instance.store_id),
          mode: "auto_connect",
          maxChats: 15,
          messagesPerChat: 10,
          force: instance.status !== "connected",
        }).catch(() => null);
      }
    }

    return json({ ok: true, provider, instance: instanceKey, event: name, status: statusMap });
  }
  const isRevoke = name.includes("delete") || name.includes("revoke");
  const isGroupEvent =
    name === "groups.upsert" ||
    name === "group.update" ||
    name === "groups.update" ||
    name === "group.participants.update" ||
    name === "group-participants.update";
  const isChatMetaEvent = name === "chats.upsert" || name === "chats.update";
  const isContactMetaEvent = name === "contacts.upsert" || name === "contacts.update";
  const isPresenceOrCall = name === "presence.update" || name.startsWith("call");
  if (isPresenceOrCall) {
    return json({ ok: true, ignored: name, provider, instance: instanceKey });
  }
  const isDelivery =
    !isRevoke &&
    !isGroupEvent &&
    !isChatMetaEvent &&
    !isContactMetaEvent &&
    (name === "messages.update" ||
      name === "message.update" ||
      name.includes("receipt") ||
      name.includes("ack") ||
      name === "message_status" ||
      name.includes("status"));
  const results: unknown[] = [];
  try {
    if (isGroupEvent || isChatMetaEvent || isContactMetaEvent) {
      const updated = await persistMetadataSyncEvents(db, instance, name, body);
      results.push({ metadataUpdated: updated });
    } else if (isRevoke) {
      const revokedIds = extractRevokedMessageIds(body);
      const occurredAt = eventTime(body.timestamp || body.data?.timestamp);
      for (const externalId of revokedIds) {
        results.push(await persistRevokedMessage(db, provider, instance, body, externalId, occurredAt));
      }
    } else if (isDelivery) {
      for (const item of statusItems(body)) {
        const proto = item.message?.protocolMessage || item.protocolMessage;
        if (proto && (proto.type === 0 || proto.type === "REVOKE" || String(proto.type).toUpperCase() === "REVOKE")) {
          const protoKeyId = firstString(proto.key?.id, proto.keyId);
          if (protoKeyId) {
            results.push(await persistRevokedMessage(db, provider, instance, body, protoKeyId, eventTime(item.timestamp || body.timestamp)));
            continue;
          }
        }
        const delivery = normalizedDelivery(provider, body, item);
        if (delivery) results.push(await persistDelivery(db, provider, instance, body, delivery));
      }
    } else {
      const rawItems = messageItems(body);
      const itemsToProcess =
        name === "messages.set" && rawItems.length > 25
          ? [...rawItems]
              .sort((a, b) => Number(b.messageTimestamp || 0) - Number(a.messageTimestamp || 0))
              .slice(0, 25)
              .reverse()
          : rawItems;
      for (const item of itemsToProcess) {
        const proto = item.message?.protocolMessage || item.protocolMessage;
        if (proto && (proto.type === 0 || proto.type === "REVOKE" || String(proto.type).toUpperCase() === "REVOKE")) {
          const protoKeyId = firstString(proto.key?.id, proto.keyId);
          if (protoKeyId) {
            results.push(await persistRevokedMessage(db, provider, instance, body, protoKeyId, eventTime(item.messageTimestamp || item.timestamp || body.timestamp)));
            continue;
          }
        }
        const message = normalizedMessage(provider, body, item);
        if (message) results.push(await persistInboundMessage(db, provider, instance, body, message));
      }
    }
    await touchInstanceWebhookHeartbeat(db, instance, name).catch(() => null);
    return json({ ok: true, provider, instance: instanceKey, event: name, processed: results.length, results });
  } catch (error) {
    console.error("[whatsapp-provider-webhook] processing failure", error);
    return json({ error: "Webhook processing failed" }, 500);
  }
}

/**
 * Drena e reprocessa eventos presos em `processing_status IN ('received', 'retryable_error')`.
 * Eventos ja refletidos em `chat_messages` sao encerrados como `processed` sem duplicar mensagens;
 * eventos historicos (> 24h) com payload redigido sao encerrados como `failed` com diagnostico claro.
 */
export async function replayPendingWebhookEvents(params: {
  db: ReturnType<typeof getServerClient>;
  limit?: number;
}): Promise<{ checked: number; replayed: number; resolvedDuplicates: number; expired: number; failed: number }> {
  const { db, limit = 15 } = params;
  const minAgeIso = new Date(Date.now() - 15_000).toISOString();
  const { data: pendingRows } = await db
    .from("whatsapp_provider_webhook_events")
    .select("id, provider, instance_id, store_id, event_type, external_message_id, payload, created_at")
    .in("processing_status", ["received", "retryable_error"])
    .lt("created_at", minAgeIso)
    .order("created_at", { ascending: true })
    .limit(Math.max(1, Math.min(limit, 40)));

  const rows = pendingRows || [];
  if (rows.length === 0) {
    return { checked: 0, replayed: 0, resolvedDuplicates: 0, expired: 0, failed: 0 };
  }

  const instanceIds = Array.from(new Set(rows.map((r) => String(r.instance_id)).filter(Boolean)));
  const { data: instRows } = await db
    .from("whatsapp_channel_instances")
    .select("id, store_id, provider, instance_key, external_instance_id, status, public_config")
    .in("id", instanceIds);
  const instMap = new Map<string, JsonObject>();
  for (const i of instRows || []) instMap.set(String(i.id), i as JsonObject);

  const extIds = Array.from(new Set(rows.map((r) => r.external_message_id).filter((v): v is string => Boolean(v))));
  const existingMsgSet = new Set<string>();
  if (extIds.length > 0) {
    const { data: msgs } = await db
      .from("chat_messages")
      .select("external_message_id")
      .in("external_message_id", extIds);
    for (const m of msgs || []) {
      if (m.external_message_id) existingMsgSet.add(String(m.external_message_id));
    }
  }

  let replayed = 0;
  let resolvedDuplicates = 0;
  let expired = 0;
  let failed = 0;
  const nowMs = Date.now();

  for (const row of rows) {
    const nowIso = new Date().toISOString();
    const extId = row.external_message_id ? String(row.external_message_id) : null;
    if (extId && existingMsgSet.has(extId)) {
      await db
        .from("whatsapp_provider_webhook_events")
        .update({ processing_status: "processed", processed_at: nowIso, error_message: null })
        .eq("id", row.id);
      resolvedDuplicates += 1;
      continue;
    }

    const inst = instMap.get(String(row.instance_id));
    if (!inst) {
      await db
        .from("whatsapp_provider_webhook_events")
        .update({ processing_status: "failed", processed_at: nowIso, error_message: "Instância removida antes do replay." })
        .eq("id", row.id);
      expired += 1;
      continue;
    }

    const ageMs = nowMs - Date.parse(String(row.created_at || nowIso));
    const payload = (row.payload && typeof row.payload === "object" ? row.payload : {}) as JsonObject;
    const provider = (row.provider === "wasender_api" ? "wasender_api" : "evolution_api") as UnofficialWhatsAppProvider;

    try {
      if (row.event_type === "status") {
        const delivery = normalizedDelivery(provider, { event: "messages.update" }, payload);
        if (delivery) {
          await persistDelivery(db, provider, inst, { event: "messages.update" }, delivery, {
            existingEventId: String(row.id),
          });
          replayed += 1;
          continue;
        }
      } else {
        const msg = normalizedMessage(provider, { event: "messages.upsert" }, payload);
        const hasValidTarget = Boolean(
          msg &&
          (msg.phone || msg.isGroup || (msg.externalUserId && msg.externalUserId.endsWith("@lid"))),
        );
        const hasRealText = Boolean(
          msg?.text &&
          msg.text !== "[Mensagem WhatsApp]" &&
          !msg.text.includes("[REDACTED"),
        );
        if (msg && hasValidTarget && (hasRealText || ageMs < 60 * 60_000)) {
          const res = await persistInboundMessage(db, provider, inst, { event: "messages.upsert" }, msg, {
            existingEventId: String(row.id),
          });
          if (res && ("ignored" in res || "duplicate" in res)) {
            await db
              .from("whatsapp_provider_webhook_events")
              .update({ processing_status: "processed", processed_at: nowIso, error_message: null })
              .eq("id", row.id);
          }
          replayed += 1;
          continue;
        }
      }

      if (ageMs > 24 * 3600_000) {
        await db
          .from("whatsapp_provider_webhook_events")
          .update({
            processing_status: "failed",
            processed_at: nowIso,
            error_message: "Evento historico expirado (>24h) com payload redigido.",
          })
          .eq("id", row.id);
        expired += 1;
      } else {
        await db
          .from("whatsapp_provider_webhook_events")
          .update({
            processing_status: "retryable_error",
            error_message: "Payload insuficiente para replay imediato.",
          })
          .eq("id", row.id);
        failed += 1;
      }
    } catch (err: any) {
      await db
        .from("whatsapp_provider_webhook_events")
        .update({
          processing_status: ageMs > 24 * 3600_000 ? "failed" : "retryable_error",
          error_message: String(err?.message || "Replay error").slice(0, 240),
        })
        .eq("id", row.id);
      failed += 1;
    }
  }

  return { checked: rows.length, replayed, resolvedDuplicates, expired, failed };
}
