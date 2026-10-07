import { createHash } from "node:crypto";
import { getServerClient } from "@/lib/supabase";
import { decryptSecret } from "@/lib/crypto-vault.server";
import { encryptConversationMessageForThread, redactConversationPayload } from "@/lib/conversation-crypto.server";
import { verifyWebhookSignature } from "@/lib/webhook-signature";
import { dispatchWhatsAppInboundFlows, resolveWhatsAppIdentity } from "@/services/whatsapp-automation-runtime.server";

export type UnofficialWhatsAppProvider = "evolution_api" | "wasender_api";
// Payloads de providers externos são deliberadamente dinâmicos; o boundary é validado pelos normalizadores.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsonObject = Record<string, any>;
type NormalizedMessage = { externalMessageId: string; externalUserId: string | null; phone: string | null; text: string; messageType: string; occurredAt: string; fromMe: boolean; pushName: string | null; payload: JsonObject };
type NormalizedDelivery = { externalMessageId: string; deliveryStatus: "sent" | "delivered" | "read" | "failed"; remoteJid: string | null; recipientPhone: string | null; occurredAt: string; errorCode: string | null; errorMessage: string | null; payload: JsonObject };

function hashBody(rawBody: string) { return createHash("sha256").update(rawBody).digest("hex"); }
function stableKey(parts: unknown[]) { return createHash("sha256").update(parts.map((part) => JSON.stringify(part)).join("|")).digest("hex"); }
function json(payload: Record<string, unknown>, status = 200) { return new Response(JSON.stringify(payload), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } }); }
function secretConfig(value: string | null): Record<string, unknown> { if (!value) return {}; try { return JSON.parse(decryptSecret(value)) as Record<string, unknown>; } catch { return {}; } }
function firstString(...values: unknown[]): string | null { return values.find((v): v is string => typeof v === "string" && v.trim().length > 0)?.trim() || null; }
function eventTime(value: unknown, fallback = new Date().toISOString()): string { const number = Number(value); if (!Number.isFinite(number) || number <= 0) return fallback; return new Date(number < 2_000_000_000 ? number * 1000 : number).toISOString(); }
function normalizedPhone(value: unknown): string | null { const digits = String(value || "").replace(/\D/g, ""); return digits.length >= 7 ? `+${digits}` : null; }
function remotePhone(value: unknown): string | null { const text = firstString(value); return text ? normalizedPhone(text.replace(/@.*$/, "")) : null; }
function messageKey(item: JsonObject): JsonObject { return (item.key || item.message?.key || {}) as JsonObject; }
function messageType(item: JsonObject): string {
  const message = (item.message || {}) as JsonObject;
  if (message.imageMessage) return "image";
  if (message.videoMessage) return "video";
  if (message.audioMessage) return "audio";
  if (message.documentMessage) return "document";
  if (message.locationMessage) return "location";
  if (message.contactMessage || message.contactsArrayMessage) return "contact";
  return "text";
}
function messageText(item: JsonObject): string {
  const message = (item.message || {}) as JsonObject;
  return firstString(item.messageBody, item.text, item.body, message.conversation, message.extendedTextMessage?.text, message.imageMessage?.caption, message.videoMessage?.caption, message.documentMessage?.caption) || `[Mensagem ${messageType(item)} recebida]`;
}
function eventName(body: JsonObject): string { return (firstString(body.event, body.type) || "messages.upsert").toLowerCase().replace(/_/g, "."); }
function messageItems(body: JsonObject): JsonObject[] {
  const data = body.data || {};
  const messages = data.messages;
  if (Array.isArray(messages)) return messages.filter((item): item is JsonObject => Boolean(item && typeof item === "object"));
  if (messages && typeof messages === "object") return [messages as JsonObject];
  return [data as JsonObject];
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
function normalizedMessage(provider: UnofficialWhatsAppProvider, body: JsonObject, item: JsonObject): NormalizedMessage | null {
  const key = messageKey(item);
  const externalMessageId = firstString(key.id, item.id, item.messageId);
  if (!externalMessageId) return null;
  const externalUserId = firstString(key.senderPn, key.remoteJid, key.cleanedSenderPn, item.from, item.sender, body.sender);
  const phone = remotePhone(firstString(key.senderPn, key.cleanedSenderPn, key.remoteJid, item.from, item.sender, body.sender));
  const occurredAt = eventTime(item.messageTimestamp || item.timestamp || body.timestamp);
  return { externalMessageId, externalUserId, phone, text: messageText(item), messageType: messageType(item), occurredAt, fromMe: key.fromMe === true || item.fromMe === true, pushName: firstString(item.pushName, item.senderName, body.pushName), payload: redactConversationPayload({ provider, event_type: eventName(body), external_message_id: externalMessageId, external_user_id: externalUserId, phone, message_type: messageType(item), timestamp: item.messageTimestamp || item.timestamp || body.timestamp }) };
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

async function persistDelivery(db: ReturnType<typeof getServerClient>, provider: UnofficialWhatsAppProvider, instance: JsonObject, body: JsonObject, delivery: NormalizedDelivery) {
  const storeId = String(instance.store_id);
  const phoneNumberId = String(instance.instance_key);
  const eventKey = stableKey(["delivery", provider, instance.id, delivery.externalMessageId, delivery.deliveryStatus, delivery.occurredAt, delivery.remoteJid]);
  const { data: providerEvent, error: providerEventError } = await db.from("whatsapp_provider_webhook_events").upsert({ provider, instance_id: instance.id, store_id: storeId, event_key: eventKey, event_type: "status", external_message_id: delivery.externalMessageId, payload_hash: hashBody(JSON.stringify(body)), payload: delivery.payload, signature_verified: true }, { onConflict: "provider,instance_id,event_key", ignoreDuplicates: true }).select("id, processing_status").maybeSingle();
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

async function persistInboundMessage(db: ReturnType<typeof getServerClient>, provider: UnofficialWhatsAppProvider, instance: JsonObject, body: JsonObject, message: NormalizedMessage) {
  if (message.fromMe || !message.phone) return { ignored: "outgoing_or_without_phone" };
  const storeId = String(instance.store_id);
  const eventKey = stableKey(["message", provider, instance.id, message.externalMessageId]);
  const { data: event, error: eventError } = await db.from("whatsapp_provider_webhook_events").upsert({ provider, instance_id: instance.id, store_id: storeId, event_key: eventKey, event_type: "message", external_message_id: message.externalMessageId, payload_hash: hashBody(JSON.stringify(body)), payload: message.payload, signature_verified: true }, { onConflict: "provider,instance_id,event_key", ignoreDuplicates: true }).select("id, processing_status").maybeSingle();
  if (eventError) throw eventError;
  // A ausência de data significa duplicata sob concorrência, não um novo evento.
  if (!event || event.processing_status === "processed") return { duplicate: true };
  const identity = await resolveWhatsAppIdentity({ storeId, instanceId: instance.id, provider, externalUserId: message.externalUserId, phone: message.phone, displayName: message.pushName });
  if (!identity) return { ignored: "identity_not_resolved" };
  let { data: thread } = await db.from("chat_threads").select("id").eq("store_id", storeId).eq("channel_instance_id", instance.id).eq("channel_identity_id", identity.id).eq("status", "open").maybeSingle();
  if (!thread) {
    const created = await db.from("chat_threads").insert({ store_id: storeId, channel_instance_id: instance.id, channel_identity_id: identity.id, guest_name: identity.display_name || message.phone, status: "open", subject: `WhatsApp ${message.phone}`, context_type: "whatsapp", entity_id: message.phone, department: "geral", priority: "normal", last_customer_message_at: message.occurredAt, last_message_text: "[Mensagem protegida]", last_message_at: message.occurredAt }).select("id").single();
    if (created.error) throw created.error;
    thread = created.data;
  }
  const encrypted = await encryptConversationMessageForThread(storeId, thread.id, message.text);
  const inserted = await db.from("chat_messages").upsert({ thread_id: thread.id, channel_identity_id: identity.id, channel: "whatsapp", message: encrypted, message_type: message.messageType, is_staff_reply: false, is_encrypted: true, encryption_version: 2, encrypted_at: new Date().toISOString(), provider, external_message_id: message.externalMessageId, delivery_status: "delivered", sent_at: message.occurredAt, delivered_at: message.occurredAt, payload: message.payload, created_at: message.occurredAt }, { onConflict: "thread_id,external_message_id", ignoreDuplicates: true }).select("id").maybeSingle();
  if (inserted.error) throw inserted.error;
  if (inserted.data?.id) {
    await db.from("chat_threads").update({ last_customer_message_at: message.occurredAt, last_message_text: "[Mensagem protegida]", last_message_at: message.occurredAt, updated_at: new Date().toISOString(), status: "open" }).eq("id", thread.id).eq("store_id", storeId);
    await dispatchWhatsAppInboundFlows({ storeId, instanceId: instance.id, provider, threadId: thread.id, identityId: identity.id, phone: message.phone, text: message.text, eventId: event?.id || null, payload: { ...message.payload, event_type: eventName(body) } });
  }
  if (event?.id) await db.from("whatsapp_provider_webhook_events").update({ processing_status: "processed", processed_at: new Date().toISOString(), error_message: null }).eq("id", event.id);
  return { threadId: thread.id, messageId: inserted.data?.id || null };
}

export async function handleUnofficialWhatsAppWebhook(request: Request, provider: UnofficialWhatsAppProvider, instanceKey: string) {
  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).byteLength > 1_048_576) return json({ error: "Webhook payload too large" }, 413);
  let body: JsonObject;
  try { body = JSON.parse(rawBody) as JsonObject; } catch { return json({ error: "Invalid JSON payload" }, 400); }
  const db = getServerClient();
  const { data: instance, error: instanceError } = await db.from("whatsapp_channel_instances").select("id, store_id, provider, instance_key, secret_payload_encrypted, is_active").eq("provider", provider).eq("instance_key", instanceKey).maybeSingle();
  if (instanceError || !instance || !instance.is_active) return json({ error: "Unknown or inactive WhatsApp instance" }, 404);
  const secrets = secretConfig(instance.secret_payload_encrypted);
  const secret = firstString(secrets.webhook_secret, secrets.webhookSecret, secrets.secret, secrets.api_key);
  const verification = verifyWebhookSignature(rawBody, request.headers, secret || undefined, { signatureHeader: request.headers.has("x-waesy-signature") ? "x-waesy-signature" : "x-webhook-signature", timestampHeader: request.headers.has("x-waesy-timestamp") ? "x-waesy-timestamp" : "x-webhook-timestamp" });
  if (!verification.ok) return json({ error: "Invalid webhook signature" }, 401);
  const name = eventName(body);
  const isDelivery = name.includes("update") || name.includes("receipt") || name.includes("status");
  const results: unknown[] = [];
  try {
    if (isDelivery) {
      for (const item of statusItems(body)) {
        const delivery = normalizedDelivery(provider, body, item);
        if (delivery) results.push(await persistDelivery(db, provider, instance, body, delivery));
      }
    } else {
      for (const item of messageItems(body)) {
        const message = normalizedMessage(provider, body, item);
        if (message) results.push(await persistInboundMessage(db, provider, instance, body, message));
      }
    }
    return json({ ok: true, provider, instance: instanceKey, event: name, processed: results.length, results });
  } catch (error) {
    console.error("[whatsapp-provider-webhook] processing failure", error);
    return json({ error: "Webhook processing failed" }, 500);
  }
}
