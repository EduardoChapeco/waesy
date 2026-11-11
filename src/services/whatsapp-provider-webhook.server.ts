import { createHash } from "node:crypto";
import { getServerClient } from "@/lib/supabase";
import { decryptSecret } from "@/lib/crypto-vault.server";
import { decryptConversationMessageForThread, encryptConversationMessageForThread, redactConversationPayload } from "@/lib/conversation-crypto.server";
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
  const resolvedRemoteJid = rawRemoteJid && rawRemoteJid.endsWith("@lid")
    ? firstString(key.remoteJidAlt, key.senderPn, key.cleanedSenderPn, rawRemoteJid)
    : rawRemoteJid;
  const externalUserId = fromMe
    ? firstString(resolvedRemoteJid, key.remoteJidAlt, item.to, item.recipient, body.recipient)
    : firstString(key.senderPn, resolvedRemoteJid, key.cleanedSenderPn, item.from, item.sender, body.sender);
  const phone = fromMe
    ? remotePhone(firstString(resolvedRemoteJid, key.remoteJidAlt, item.to, item.recipient, body.recipient))
    : remotePhone(firstString(key.senderPn, key.cleanedSenderPn, resolvedRemoteJid, item.from, item.sender, body.sender));
  const occurredAt = eventTime(item.messageTimestamp || item.timestamp || body.timestamp);
  const rawPushName = fromMe ? null : firstString(item.pushName, item.senderName, body.pushName);
  const pushName = rawPushName && !isSyntheticSelfLabel(rawPushName) ? rawPushName : null;
  return { externalMessageId, externalUserId, phone, text: messageText(item), messageType: messageType(item), occurredAt, fromMe, pushName, payload: redactConversationPayload({ provider, event_type: eventName(body), external_message_id: externalMessageId, external_user_id: externalUserId, phone, message_type: messageType(item), from_me: fromMe, timestamp: item.messageTimestamp || item.timestamp || body.timestamp }) };
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

export async function persistDelivery(db: ReturnType<typeof getServerClient>, provider: UnofficialWhatsAppProvider, instance: JsonObject, body: JsonObject, delivery: NormalizedDelivery) {
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

export async function persistInboundMessage(db: ReturnType<typeof getServerClient>, provider: UnofficialWhatsAppProvider, instance: JsonObject, body: JsonObject, message: NormalizedMessage) {
  if (!message.phone) return { ignored: "without_phone" };
  const storeId = String(instance.store_id);
  const eventKey = stableKey(["message", provider, instance.id, message.externalMessageId]);
  const { data: event, error: eventError } = await db.from("whatsapp_provider_webhook_events").upsert({ provider, instance_id: instance.id, store_id: storeId, event_key: eventKey, event_type: message.fromMe ? "outbound_echo" : "message", external_message_id: message.externalMessageId, payload_hash: hashBody(JSON.stringify(body)), payload: message.payload, signature_verified: true }, { onConflict: "provider,instance_id,event_key", ignoreDuplicates: true }).select("id, processing_status").maybeSingle();
  if (eventError) throw eventError;
  // A ausência de data significa duplicata sob concorrência, não um novo evento.
  if (!event || event.processing_status === "processed") return { duplicate: true };
  const identity = await resolveWhatsAppIdentity({
    storeId,
    instanceId: instance.id,
    provider,
    externalUserId: message.externalUserId,
    phone: message.phone,
    displayName: message.fromMe ? null : message.pushName,
  });
  if (!identity) return { ignored: "identity_not_resolved" };
  const cleanDigits = message.phone.replace(/\D/g, "");
  let { data: thread } = await db
    .from("chat_threads")
    .select("id, metadata, guest_name")
    .eq("store_id", storeId)
    .or(`channel_identity_id.eq.${identity.id},entity_id.eq.${message.phone},entity_id.eq.${cleanDigits}`)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const syntheticEmail = `${cleanDigits}@whatsapp.waesy`;
  const isGroupJid = Boolean(message.externalUserId && message.externalUserId.endsWith("@g.us"));
  if (!thread) {
    const safeGuestName = (!message.fromMe && message.pushName && !isSyntheticSelfLabel(message.pushName))
      ? message.pushName
      : (identity.display_name && !isSyntheticSelfLabel(identity.display_name) ? identity.display_name : message.phone);
    const created = await db.from("chat_threads").insert({
      store_id: storeId,
      channel_instance_id: instance.id,
      channel_identity_id: identity.id,
      guest_name: safeGuestName,
      guest_phone: message.phone,
      guest_email: syntheticEmail,
      status: "open",
      subject: `WhatsApp ${message.phone}`,
      context_type: "whatsapp",
      thread_type: isGroupJid ? "group" : "direct",
      entity_id: message.phone,
      department: "geral",
      priority: "normal",
      ...(message.fromMe ? {} : { last_customer_message_at: message.occurredAt }),
      last_message_text: message.text.slice(0, 200),
      last_message_at: message.occurredAt,
      metadata: {
        is_group: isGroupJid,
        remote_jid: message.externalUserId,
        ...(message.fromMe ? { handoff_mode: "human_active", ai_auto_reply_enabled: false, last_device_reply_at: message.occurredAt } : {}),
      },
    }).select("id, metadata, guest_name").single();
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
    const encryptedOutbound = await encryptConversationMessageForThread(storeId, thread.id, message.text);
    const { data: createdDeviceMsg, error: deviceInsertError } = await db.from("chat_messages").insert({
      thread_id: thread.id,
      channel_identity_id: identity.id,
      channel: "whatsapp",
      message: encryptedOutbound,
      message_type: message.messageType,
      is_staff_reply: true,
      is_encrypted: true,
      encryption_version: 2,
      encrypted_at: new Date().toISOString(),
      provider,
      external_message_id: message.externalMessageId,
      delivery_status: "sent",
      sent_at: message.occurredAt,
      payload: {
        ...message.payload,
        from_me: true,
        origin: "whatsapp_device",
        instance_id: instance.id,
      },
      created_at: message.occurredAt,
    }).select("id").single();
    if (deviceInsertError) throw deviceInsertError;

    const currentThreadMeta = (thread.metadata && typeof thread.metadata === "object" ? thread.metadata : {}) as Record<string, unknown>;
    await db.from("chat_threads").update({
      last_message_text: message.text.slice(0, 200),
      last_message_at: message.occurredAt,
      updated_at: new Date().toISOString(),
      metadata: {
        ...currentThreadMeta,
        handoff_mode: "human_active",
        ai_auto_reply_enabled: false,
        last_device_reply_at: message.occurredAt,
      },
    }).eq("id", thread.id).eq("store_id", storeId);

    if (event?.id) await db.from("whatsapp_provider_webhook_events").update({ processing_status: "processed", processed_at: new Date().toISOString(), error_message: null }).eq("id", event.id);
    return { threadId: thread.id, messageId: createdDeviceMsg?.id || null, origin: "whatsapp_device" };
  }

  const encrypted = await encryptConversationMessageForThread(storeId, thread.id, message.text);
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
      message: encrypted,
      message_type: message.messageType,
      is_staff_reply: false,
      is_encrypted: true,
      encryption_version: 2,
      encrypted_at: new Date().toISOString(),
      provider,
      external_message_id: message.externalMessageId,
      delivery_status: "delivered",
      sent_at: message.occurredAt,
      delivered_at: message.occurredAt,
      payload: { ...message.payload, origin: "whatsapp_customer", from_me: false },
      created_at: message.occurredAt,
    }).select("id").single();
    if (insertError) throw insertError;
    insertedMessageId = createdMsg?.id || null;
  }
  if (insertedMessageId) {
    const shouldHealGuestName = Boolean(
      message.pushName &&
      !isSyntheticSelfLabel(message.pushName) &&
      (isSyntheticSelfLabel(thread.guest_name) || thread.guest_name === message.phone || thread.guest_name === cleanDigits)
    );
    await db.from("chat_threads").update({
      ...(shouldHealGuestName ? { guest_name: message.pushName } : {}),
      last_customer_message_at: message.occurredAt,
      last_message_text: message.text.slice(0, 200),
      last_message_at: message.occurredAt,
      updated_at: new Date().toISOString(),
      status: "open",
    }).eq("id", thread.id).eq("store_id", storeId);
    try { if (cleanDigits.length >= 10) await db.from("profiles").update({ phone_verified_at: new Date().toISOString() }).or(`phone.eq.${message.phone},phone.eq.${cleanDigits}`).is("phone_verified_at", null); } catch { /* noop */ }
    if (!isGroupJid && cleanDigits.length >= 8) {
      try {
        const suffix = cleanDigits.slice(-8);
        const { data: existingCrm } = await db
          .from("customers_crm")
          .select("id, full_name")
          .eq("store_id", storeId)
          .ilike("phone", `%${suffix}%`)
          .limit(1)
          .maybeSingle();
        const contactName =
          message.pushName && !isSyntheticSelfLabel(message.pushName)
            ? message.pushName
            : existingCrm?.full_name || message.phone;
        if (existingCrm?.id) {
          await db
            .from("customers_crm")
            .update({
              ...(message.pushName && !isSyntheticSelfLabel(message.pushName) && (!existingCrm.full_name || isSyntheticSelfLabel(existingCrm.full_name))
                ? { full_name: message.pushName }
                : {}),
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingCrm.id)
            .eq("store_id", storeId);
        } else {
          await db.from("customers_crm").insert({
            store_id: storeId,
            full_name: contactName,
            phone: message.phone,
            source: "whatsapp",
            updated_at: new Date().toISOString(),
          });
        }
      } catch {
        /* noop */
      }
    }
    await dispatchWhatsAppInboundFlows({ storeId, instanceId: instance.id, provider, threadId: thread.id, identityId: identity.id, phone: message.phone, text: message.text, eventId: event?.id || null, payload: { ...message.payload, event_type: eventName(body) } });
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
    .select("id, thread_id, payload")
    .eq("channel", "whatsapp")
    .eq("external_message_id", externalMessageId);

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

export async function handleUnofficialWhatsAppWebhook(request: Request, provider: UnofficialWhatsAppProvider, instanceKey: string) {
  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).byteLength > 1_048_576) return json({ error: "Webhook payload too large" }, 413);
  let body: JsonObject;
  try { body = JSON.parse(rawBody) as JsonObject; } catch { return json({ error: "Invalid JSON payload" }, 400); }
  const db = getServerClient();
  const { data: instance, error: instanceError } = await db
    .from("whatsapp_channel_instances")
    .select("id, store_id, provider, instance_key, external_instance_id, secret_payload_encrypted, is_active, public_config")
    .eq("provider", provider)
    .or(`instance_key.eq.${instanceKey},external_instance_id.eq.${instanceKey}`)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (instanceError || !instance || !instance.is_active) return json({ error: "Unknown or inactive WhatsApp instance" }, 404);
  const secrets = secretConfig(instance.secret_payload_encrypted);
  const secret = firstString(secrets.webhook_secret, secrets.webhookSecret, secrets.secret, secrets.api_key);
  const masterApiKey = process.env.EVOLUTION_API_KEY?.trim() || null;
  const receivedApiKey = firstString(
    request.headers.get("apikey"),
    request.headers.get("x-api-key"),
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, ""),
  );

  let isVerified = false;
  if (receivedApiKey && ((secret && receivedApiKey === secret) || (masterApiKey && receivedApiKey === masterApiKey))) {
    isVerified = true;
  } else if (secret && (request.headers.has("x-waesy-signature") || request.headers.has("x-webhook-signature"))) {
    const verification = verifyWebhookSignature(rawBody, request.headers, secret, {
      signatureHeader: request.headers.has("x-waesy-signature") ? "x-waesy-signature" : "x-webhook-signature",
      timestampHeader: request.headers.has("x-waesy-timestamp") ? "x-waesy-timestamp" : "x-webhook-timestamp",
    });
    isVerified = verification.ok;
  } else if (provider === "evolution_api" && !secret && !masterApiKey) {
    // Webhook direto da Evolution API interna quando nenhum segredo explícito foi provisionado
    isVerified = true;
  } else if (provider === "evolution_api" && !receivedApiKey && !request.headers.has("x-waesy-signature")) {
    // Compatibilidade com Evolution API v2 que envia webhook sem header apikey customizado
    isVerified = true;
  }

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
    const nextPublicConfig: Record<string, unknown> = {
      ...currentPublicConfig,
      ...(normalizedQr ? { qr_code_url: normalizedQr, last_qr_generated_at: nowIso } : {}),
      ...(statusMap === "connected" ? { qr_code_url: null, session_revoked: false, last_connected_at: nowIso } : {}),
      ...(isRevoked ? { session_revoked: true, last_revoked_at: nowIso } : {}),
      ...(pairingCode ? { pairing_code: pairingCode } : {}),
      last_webhook_state: state,
      last_webhook_at: nowIso,
      last_status_reason: statusReason || null,
    };
    await db.from("whatsapp_channel_instances").update({
      status: statusMap,
      ...(ownerPhone ? { display_phone_number: ownerPhone } : {}),
      ...(statusMap === "connected" ? { last_error_code: null, last_error_message: null } : {}),
      ...(isRevoked ? { last_error_code: "SESSION_REVOKED_401", last_error_message: "Sessão desconectada ou revogada no aparelho WhatsApp." } : {}),
      public_config: nextPublicConfig,
      last_health_check_at: nowIso,
      updated_at: nowIso,
    }).eq("id", instance.id);
    return json({ ok: true, provider, instance: instanceKey, event: name, status: statusMap });
  }
  const isRevoke = name.includes("delete") || name.includes("revoke");
  const isDelivery = !isRevoke && (name.includes("update") || name.includes("receipt") || name.includes("status"));
  const results: unknown[] = [];
  try {
    if (isRevoke) {
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
      for (const item of messageItems(body)) {
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
    return json({ ok: true, provider, instance: instanceKey, event: name, processed: results.length, results });
  } catch (error) {
    console.error("[whatsapp-provider-webhook] processing failure", error);
    return json({ error: "Webhook processing failed" }, 500);
  }
}
