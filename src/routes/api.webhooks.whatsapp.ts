import { createFileRoute } from "@tanstack/react-router";
import { getServerClient } from "@/lib/supabase";
import { verifyMetaWebhookSignature } from "@/lib/webhook-signature";
import { decryptSecret } from "@/lib/crypto-vault.server";
import { encryptConversationMessageForThread, redactWhatsAppWebhookPayload } from "@/lib/conversation-crypto.server";
import { dispatchWhatsAppInboundFlows, resolveWhatsAppIdentity } from "@/services/whatsapp-automation-runtime.server";
import { WHATSAPP_CREDENTIAL_PROVIDER, WHATSAPP_META_CHANNEL_PROVIDER } from "@/services/whatsapp-provider-contract";
import { createHash } from "node:crypto";

const MAX_WEBHOOK_BODY_BYTES = 1_048_576;

type IntegrationCredential = {
  store_id: string;
  token_payload: Record<string, unknown> | null;
  public_metadata: Record<string, unknown> | null;
  secret_payload_encrypted: string | null;
};

function jsonResponse(payload: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

function envValue(...names: string[]): string | undefined {
  if (typeof process === "undefined" || !process.env) return undefined;
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return undefined;
}

function payloadValue(payload: Record<string, unknown> | null | undefined, ...keys: string[]): string | undefined {
  if (!payload) return undefined;
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function connectionSecrets(connection: IntegrationCredential): Record<string, unknown> {
  if (!connection.secret_payload_encrypted) return connection.token_payload || {};
  try {
    return JSON.parse(decryptSecret(connection.secret_payload_encrypted)) as Record<string, unknown>;
  } catch (error) {
    console.error("[whatsapp-webhook] Falha ao descriptografar credencial da conexão:", error);
    return {};
  }
}

function normalizedPhone(value: unknown): string {
  return String(value ?? "").replace(/\D/g, "");
}

function messageContent(message: Record<string, any>): { text: string; type: string } {
  if (typeof message.text?.body === "string") return { text: message.text.body, type: "text" };
  if (typeof message.interactive?.button_reply?.title === "string") {
    return { text: message.interactive.button_reply.title, type: "interactive" };
  }
  if (typeof message.interactive?.list_reply?.title === "string") {
    return { text: message.interactive.list_reply.title, type: "interactive" };
  }
  if (typeof message.button?.text === "string") return { text: message.button.text, type: "interactive" };

  const type = typeof message.type === "string" ? message.type : "unknown";
  const caption = message[type]?.caption;
  if (typeof caption === "string" && caption.trim()) return { text: caption, type };

  const labels: Record<string, string> = {
    image: "[Imagem recebida]",
    video: "[Vídeo recebido]",
    audio: "[Áudio recebido]",
    document: "[Documento recebido]",
    sticker: "[Sticker recebido]",
    location: "[Localização recebida]",
    contacts: "[Contato recebido]",
    reaction: "[Reação recebida]",
  };

  return { text: labels[type] ?? "[Mensagem recebida]", type };
}

function eventTime(timestamp: unknown): string {
  const seconds = Number(timestamp);
  return Number.isFinite(seconds) && seconds > 0 ? new Date(seconds * 1000).toISOString() : new Date().toISOString();
}

function stableEventKey(parts: Array<unknown>): string {
  return createHash("sha256").update(parts.map((part) => String(part ?? "")).join("|")).digest("hex");
}

function deliveryStatusValue(value: unknown): "accepted" | "sent" | "delivered" | "read" | "failed" | null {
  return value === "accepted" || value === "sent" || value === "delivered" || value === "read" || value === "failed"
    ? value
    : null;
}

export const Route = createFileRoute("/api/webhooks/whatsapp")({
  server: {
    handlers: {
      /**
       * GET Handler: handshake de validação do Webhook da Meta / WhatsApp Cloud API.
       * A Meta envia: hub.mode, hub.verify_token e hub.challenge.
       */
      GET: async ({ request }: { request: Request }) => {
        try {
          const url = new URL(request.url);
          const mode = url.searchParams.get("hub.mode");
          const token = url.searchParams.get("hub.verify_token")?.trim();
          const challenge = url.searchParams.get("hub.challenge");

          if (!mode || !token || !challenge) {
            return new Response("Parâmetros de handshake incompletos", { status: 400 });
          }
          if (mode !== "subscribe") {
            return new Response("Modo de subscrição inválido", { status: 403 });
          }

          const globalVerifyToken = envValue("WHATSAPP_WEBHOOK_VERIFY_TOKEN");
          if (globalVerifyToken && token === globalVerifyToken) {
            return new Response(challenge, {
              status: 200,
              headers: { "Content-Type": "text/plain", "Cache-Control": "no-store" },
            });
          }

          const supabase = getServerClient();
          const { data: storeCreds, error } = await supabase
            .from("integration_credentials")
            .select("store_id, token_payload, public_metadata, secret_payload_encrypted")
            .eq("provider", WHATSAPP_CREDENTIAL_PROVIDER)
            .eq("is_active", true);

          if (error) {
            console.error("[whatsapp-webhook:GET] Falha ao consultar credenciais:", error.message);
            return new Response("Erro interno", { status: 500 });
          }

          const matchesStore = (storeCreds as IntegrationCredential[] | null)?.some((credential) => {
            const configuredToken = payloadValue(connectionSecrets(credential), "webhook_verify_token");
            return configuredToken === token;
          });

          if (matchesStore) {
            return new Response(challenge, {
              status: 200,
              headers: { "Content-Type": "text/plain", "Cache-Control": "no-store" },
            });
          }

          return new Response("Token de verificação inválido", { status: 403 });
        } catch (err) {
          console.error("[whatsapp-webhook:GET] Erro no handshake:", err);
          return new Response("Erro interno", { status: 500 });
        }
      },

      /**
       * POST Handler: ingestão autenticada de mensagens e recibos da Meta.
       * A assinatura deve ser calculada sobre o corpo bruto antes do JSON ser usado.
       */
      POST: async ({ request }: { request: Request }) => {
        try {
          const contentLength = Number(request.headers.get("content-length") || 0);
          if (Number.isFinite(contentLength) && contentLength > MAX_WEBHOOK_BODY_BYTES) {
            return jsonResponse({ error: "Webhook payload too large" }, 413);
          }

          const rawBody = await request.text();
          if (new TextEncoder().encode(rawBody).byteLength > MAX_WEBHOOK_BODY_BYTES) {
            return jsonResponse({ error: "Webhook payload too large" }, 413);
          }

          let body: Record<string, any>;
          try {
            body = JSON.parse(rawBody) as Record<string, any>;
          } catch {
            return jsonResponse({ error: "Invalid JSON payload" }, 400);
          }

          const entries = Array.isArray(body.entry) ? body.entry : [];
          const changes = entries.flatMap((entry: any) => (Array.isArray(entry?.changes) ? entry.changes : []));
          const phoneNumberIds = new Set(
            changes
              .map((change: any) => change?.value?.metadata?.phone_number_id)
              .filter((value: unknown): value is string => typeof value === "string" && value.trim().length > 0),
          );

          const supabase = getServerClient();
          const { data: credentials, error: credentialsError } = await supabase
            .from("integration_credentials")
            .select("store_id, token_payload, public_metadata, secret_payload_encrypted")
            .eq("provider", WHATSAPP_CREDENTIAL_PROVIDER)
            .eq("is_active", true);

          if (credentialsError) {
            console.error("[whatsapp-webhook:POST] Falha ao consultar conexão:", credentialsError.message);
            return jsonResponse({ error: "Unable to resolve WhatsApp connection" }, 500);
          }

          const matchingCredentials = ((credentials || []) as IntegrationCredential[]).filter((credential) => {
            const phoneNumberId = payloadValue(credential.public_metadata || credential.token_payload, "phone_number_id");
            return Boolean(phoneNumberId && phoneNumberIds.has(phoneNumberId));
          });

          const appSecret =
            matchingCredentials
              .map((credential) => payloadValue(connectionSecrets(credential), "app_secret", "meta_app_secret"))
              .find(Boolean) || envValue("WHATSAPP_META_APP_SECRET", "META_APP_SECRET");

          const verification = verifyMetaWebhookSignature(rawBody, request.headers, appSecret);
          if (!verification.ok) {
            console.warn("[whatsapp-webhook:POST] Evento rejeitado:", verification.reason);
            return jsonResponse({ error: "Invalid webhook signature" }, 401);
          }

          if (phoneNumberIds.size === 0 || matchingCredentials.length === 0) {
            return jsonResponse({ error: "Unknown WhatsApp connection" }, 404);
          }

          const storeByPhoneNumberId = new Map<string, string>();
          for (const credential of matchingCredentials) {
            const phoneNumberId = payloadValue(credential.public_metadata || credential.token_payload, "phone_number_id");
            if (phoneNumberId && !storeByPhoneNumberId.has(phoneNumberId)) {
              storeByPhoneNumberId.set(phoneNumberId, credential.store_id);
            }
          }

          let receivedMessages = 0;
          let receivedStatuses = 0;
          let processingErrors = 0;

          for (const change of changes) {
            const value = change?.value;
            if (!value) continue;

            const phoneNumberId = String(value.metadata?.phone_number_id || "");
            const targetStoreId = storeByPhoneNumberId.get(phoneNumberId);
            if (!targetStoreId) continue;

            const messages = Array.isArray(value.messages) ? value.messages : [];
            const statuses = Array.isArray(value.statuses) ? value.statuses : [];
            receivedMessages += messages.length;
            receivedStatuses += statuses.length;

            for (const message of messages) {
              try {
                const senderPhone = normalizedPhone(message.from);
                if (!senderPhone || !message.id) continue;

                const messageEventKey = stableEventKey(["message", phoneNumberId, message.id]);
                const { data: inboxMessage, error: inboxMessageError } = await supabase
                  .from("whatsapp_webhook_inbox")
                  .upsert({
                    store_id: targetStoreId,
                    phone_number_id: phoneNumberId,
                    event_key: messageEventKey,
                    event_type: "message",
                    external_message_id: String(message.id),
                    payload: redactWhatsAppWebhookPayload(message),
                    status: "received",
                  }, { onConflict: "store_id,event_key", ignoreDuplicates: true })
                  .select("id, status")
                  .maybeSingle();

                if (inboxMessageError) throw new Error(`Falha ao persistir inbox WhatsApp: ${inboxMessageError.message}`);
                // Com ignoreDuplicates, o Supabase retorna data nula quando outro
                // request já inseriu a mesma chave. Nunca reexecute lead/thread/flows.
                if (!inboxMessage || inboxMessage.status === "processed" || inboxMessage.status === "ignored") continue;

                const { text: messageText, type: messageType } = messageContent(message);
                const occurredAt = eventTime(message.timestamp);
                const customerName =
                  value.contacts?.find((contact: any) => String(contact?.wa_id || "") === String(message.from))?.profile?.name ||
                  value.contacts?.[0]?.profile?.name ||
                  `WhatsApp ${senderPhone.slice(-4)}`;

                const { data: officialInstance } = await supabase
                  .from("whatsapp_channel_instances")
                  .select("id")
                  .eq("store_id", targetStoreId)
                  .eq("provider", WHATSAPP_META_CHANNEL_PROVIDER)
                  .eq("phone_number_id", phoneNumberId)
                  .maybeSingle();
                const channelIdentity = await resolveWhatsAppIdentity({
                  storeId: targetStoreId,
                  instanceId: officialInstance?.id || null,
                  provider: WHATSAPP_META_CHANNEL_PROVIDER,
                  externalUserId: String(message.from),
                  phone: senderPhone,
                  displayName: customerName,
                });
                if (!channelIdentity) continue;

                const { data: existingLead } = await supabase
                  .from("whatsapp_lead_conversions")
                  .select("id, notes")
                  .eq("store_id", targetStoreId)
                  .eq("phone_target", senderPhone)
                  .limit(1)
                  .maybeSingle();

                if (existingLead) {
                  const updatedNotes = `${existingLead.notes || ""}\n[Cliente ${occurredAt}]: ${messageText}`.trim();
                  await supabase
                    .from("whatsapp_lead_conversions")
                    .update({ status: "responded", notes: updatedNotes.slice(-1500) })
                    .eq("id", existingLead.id);
                } else {
                  await supabase.rpc("record_whatsapp_lead", {
                    p_store_id: targetStoreId,
                    p_entity_type: "store",
                    p_entity_id: null,
                    p_entity_title: customerName,
                    p_phone_target: senderPhone,
                    p_origin_url: "whatsapp://cloud-api/inbound",
                    p_utm_source: "whatsapp",
                    p_utm_medium: "inbound",
                    p_utm_campaign: null,
                    p_visitor_id: null,
                    p_user_id: null,
                    p_device_type: "mobile",
                    p_metadata: {
                      channel: WHATSAPP_META_CHANNEL_PROVIDER,
                      phone_number_id: phoneNumberId,
                      message_id: String(message.id),
                      message_type: messageType,
                    },
                  });
                }

                const entityId = `${phoneNumberId}:${senderPhone}`;
                const { data: existingThread } = await supabase
                  .from("chat_threads")
                  .select("id")
                  .eq("store_id", targetStoreId)
                  .eq("channel_identity_id", channelIdentity.id)
                  .eq("context_type", "whatsapp")
                  .eq("entity_id", entityId)
                  .maybeSingle();

                let threadId: string | null = existingThread?.id || null;
                if (threadId) {
                  await supabase
                    .from("chat_threads")
                    .update({
                      last_message_text: "[Mensagem protegida]",
                      last_message_at: occurredAt,
                      status: "open",
                      updated_at: new Date().toISOString(),
                    })
                    .eq("id", threadId);
                } else {
                  const { data: createdThread } = await supabase
                    .from("chat_threads")
                    .insert({
                      store_id: targetStoreId,
                      channel_instance_id: officialInstance?.id || null,
                      channel_identity_id: channelIdentity.id,
                      guest_name: customerName,
                      status: "open",
                      subject: `Atendimento WhatsApp (${senderPhone})`,
                      department: "geral",
                      priority: "normal",
                      context_type: "whatsapp",
                      entity_id: entityId,
                      last_message_text: "[Mensagem protegida]",
                      last_message_at: occurredAt,
                      internal_notes: `Canal: WhatsApp Cloud API | Phone Number ID: ${phoneNumberId}`,
                      created_at: occurredAt,
                      updated_at: new Date().toISOString(),
                    })
                    .select("id")
                    .single();

                  threadId = createdThread?.id || null;
                }

                if (!threadId) continue;

                const { data: duplicateMessage } = await supabase
                  .from("chat_messages")
                  .select("id")
                  .eq("thread_id", threadId)
                  .filter("payload->>message_id", "eq", String(message.id))
                  .maybeSingle();

                if (!duplicateMessage) {
                  const encryptedInboundMessage = await encryptConversationMessageForThread(targetStoreId, threadId, messageText);
                  const { error: chatMessageError } = await supabase.from("chat_messages").insert({
                    thread_id: threadId,
                    channel_identity_id: channelIdentity.id,
                    message: encryptedInboundMessage,
                    message_type: messageType,
                    is_staff_reply: false,
                    is_encrypted: true,
                    encryption_version: 2,
                    encrypted_at: new Date().toISOString(),
                    channel: "whatsapp",
                    external_message_id: String(message.id),
                    delivery_status: "delivered",
                    sent_at: occurredAt,
                    delivered_at: occurredAt,
                    payload: {
                      channel: "whatsapp",
                      provider: WHATSAPP_META_CHANNEL_PROVIDER,
                      phone_number_id: phoneNumberId,
                      from: senderPhone,
                      message_id: String(message.id),
                      timestamp: message.timestamp,
                    },
                    created_at: occurredAt,
                  });
                  if (chatMessageError && !/duplicate|unique/i.test(chatMessageError.message)) throw chatMessageError;
                }

                await dispatchWhatsAppInboundFlows({
                  storeId: targetStoreId,
                  instanceId: officialInstance?.id || null,
                  provider: WHATSAPP_META_CHANNEL_PROVIDER,
                  threadId,
                  identityId: channelIdentity.id,
                  phone: senderPhone,
                  text: messageText,
                  eventId: inboxMessage?.id || null,
                  payload: { channel: "whatsapp", phone_number_id: phoneNumberId, message_id: String(message.id), message_type: messageType },
                });

                await supabase
                  .from("whatsapp_webhook_inbox")
                  .update({ status: "processed", processed_at: new Date().toISOString(), error_message: null })
                  .eq("store_id", targetStoreId)
                  .eq("event_key", messageEventKey);
              } catch (messageError) {
                processingErrors += 1;
                console.warn("[whatsapp-webhook] Falha ao sincronizar mensagem:", messageError);
              }
            }

            for (const statusEvent of statuses) {
              try {
                const externalMessageId = String(statusEvent?.id || "");
                const deliveryStatus = deliveryStatusValue(statusEvent?.status);
                if (!externalMessageId || !deliveryStatus) continue;

                const statusEventKey = stableEventKey([
                  "status",
                  phoneNumberId,
                  externalMessageId,
                  deliveryStatus,
                  statusEvent?.timestamp,
                  statusEvent?.recipient_id,
                ]);
                const { error: inboxStatusError } = await supabase
                  .from("whatsapp_webhook_inbox")
                  .upsert({
                    store_id: targetStoreId,
                    phone_number_id: phoneNumberId,
                    event_key: statusEventKey,
                    event_type: "status",
                    external_message_id: externalMessageId,
                    payload: redactWhatsAppWebhookPayload(statusEvent),
                    status: "processed",
                    processed_at: new Date().toISOString(),
                  }, { onConflict: "store_id,event_key", ignoreDuplicates: true });
                if (inboxStatusError) throw inboxStatusError;

                const errorData = statusEvent?.errors?.[0];
                await supabase.from("whatsapp_delivery_events").upsert({
                  store_id: targetStoreId,
                  phone_number_id: phoneNumberId,
                  external_message_id: externalMessageId,
                  delivery_status: deliveryStatus,
                  recipient_phone: normalizedPhone(statusEvent?.recipient_id) || null,
                  conversation_id: statusEvent?.conversation?.id || null,
                  error_code: errorData?.code ? String(errorData.code) : null,
                  error_message: errorData?.title || errorData?.message || null,
                  payload: redactWhatsAppWebhookPayload(statusEvent),
                  occurred_at: eventTime(statusEvent?.timestamp),
                }, { onConflict: "store_id,external_message_id,delivery_status" });

                const updatePayload: Record<string, unknown> = { delivery_status: deliveryStatus };
                if (deliveryStatus === "sent") updatePayload.sent_at = eventTime(statusEvent?.timestamp);
                if (deliveryStatus === "delivered") updatePayload.delivered_at = eventTime(statusEvent?.timestamp);
                if (deliveryStatus === "read") updatePayload.read_at = eventTime(statusEvent?.timestamp);
                if (deliveryStatus === "failed") {
                  updatePayload.failed_at = eventTime(statusEvent?.timestamp);
                  updatePayload.error_code = errorData?.code ? String(errorData.code) : null;
                  updatePayload.error_message = errorData?.title || errorData?.message || null;
                }

                const { data: matchingMessages } = await supabase
                  .from("chat_messages")
                  .select("id, thread_id, chat_threads!inner(store_id)")
                  .eq("channel", "whatsapp")
                  .eq("external_message_id", externalMessageId)
                  .eq("chat_threads.store_id", targetStoreId);
                for (const matchingMessage of matchingMessages || []) {
                  await supabase
                    .from("chat_messages")
                    .update(updatePayload)
                    .eq("id", matchingMessage.id)
                    .eq("thread_id", matchingMessage.thread_id);
                }
                await supabase
                  .from("whatsapp_campaign_recipients")
                  .update({
                    status: deliveryStatus,
                    error_code: errorData?.code ? String(errorData.code) : null,
                    error_message: errorData?.title || errorData?.message || null,
                    updated_at: new Date().toISOString(),
                  })
                  .eq("store_id", targetStoreId)
                  .eq("external_message_id", externalMessageId);
              } catch (statusError) {
                processingErrors += 1;
                console.warn("[whatsapp-webhook] Falha ao persistir recibo WhatsApp:", statusError);
              }
            }
          }

          return jsonResponse({
            success: true,
            receivedMessages,
            receivedStatuses,
            processingErrors,
          });
        } catch (error) {
          console.error("[whatsapp-webhook:POST] Erro ao processar evento:", error);
          return jsonResponse({ error: "Internal Server Error" }, 500);
        }
      },
    },
  },
} as never);
