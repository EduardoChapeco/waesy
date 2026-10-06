import { createFileRoute } from "@tanstack/react-router";
import { getServerClient } from "@/lib/supabase";
import crypto from "node:crypto";

import type {} from "@tanstack/react-start";
export const Route = createFileRoute("/api/webhooks/whatsapp")({
  server: {
    handlers: {
      /**
       * GET Handler: Handshake de validação do Webhook da Meta / WhatsApp Cloud API.
       * A Meta envia: hub.mode, hub.verify_token e hub.challenge.
       */
      GET: async ({ request }: { request: Request }) => {
        try {
          const url = new URL(request.url);
          const mode = url.searchParams.get("hub.mode");
          const token = url.searchParams.get("hub.verify_token");
          const challenge = url.searchParams.get("hub.challenge");

          if (!mode || !token || !challenge) {
            return new Response("Parâmetros de handshake incompletos", { status: 400 });
          }

          if (mode !== "subscribe") {
            return new Response("Modo de subscrição inválido", { status: 403 });
          }

          // 1. Validar contra token global do ambiente (se configurado)
          const globalVerifyToken =
            (typeof process !== "undefined" && process.env
              ? process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || process.env.WEBHOOK_SECRET
              : undefined)?.trim();

          if (globalVerifyToken && token === globalVerifyToken) {
            return new Response(challenge, {
              status: 200,
              headers: { "Content-Type": "text/plain" },
            });
          }

          // 2. Validar contra tokens configurados nas lojas ativas
          const supabase = getServerClient();
          const { data: storeCreds } = await supabase
            .from("integration_credentials")
            .select("store_id, token_payload")
            .eq("provider", "whatsapp_cloud_api")
            .eq("is_active", true);

          const matchesStore = (storeCreds || []).some((c: any) => {
            const configuredToken = c.token_payload?.webhook_verify_token;
            return configuredToken && String(configuredToken).trim() === token;
          });

          if (matchesStore) {
            return new Response(challenge, {
              status: 200,
              headers: { "Content-Type": "text/plain" },
            });
          }

          return new Response("Token de verificação inválido", { status: 403 });
        } catch (err: any) {
          console.error("[whatsapp-webhook:GET] Erro no handshake:", err);
          return new Response("Erro interno", { status: 500 });
        }
      },

      /**
       * POST Handler: Ingestão de mensagens recebidas e recibos de entrega da Meta.
       */
      POST: async ({ request }: { request: Request }) => {
        try {
          const rawBody = await request.text();
          const secret = process.env.WHATSAPP_APP_SECRET?.trim();
          const provided = request.headers.get("x-hub-signature-256")?.replace(/^sha256=/, "");
          if (!secret || !provided) return new Response(JSON.stringify({ error: "Webhook não configurado" }), { status: 503 });
          const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
          if (expected.length !== provided.length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(provided))) {
            return new Response(JSON.stringify({ error: "Assinatura inválida" }), { status: 401 });
          }
          const body = JSON.parse(rawBody) as Record<string, any>;
          const entry = body?.entry?.[0];
          const change = entry?.changes?.[0];
          const value = change?.value;

          if (!value) {
            return new Response(JSON.stringify({ success: true, ignored: true }), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            });
          }

          const phoneNumberId = value.metadata?.phone_number_id;
          const messages = value.messages;
          const statuses = value.statuses;

          const supabase = getServerClient();

          // 1. Identificar loja associada ao phone_number_id
          let targetStoreId: string | null = null;
          if (phoneNumberId) {
            const { data: matched } = await supabase
              .from("integration_credentials")
              .select("store_id, token_payload")
              .eq("provider", "whatsapp_cloud_api")
              .eq("is_active", true);

            const store = (matched || []).find((m: any) => m.token_payload?.phone_number_id === phoneNumberId);
            if (store) {
              targetStoreId = store.store_id;
            }
          }

          // 2. Processar mensagens recebidas de clientes (inbound)
          if (Array.isArray(messages) && messages.length > 0 && targetStoreId) {
            for (const msg of messages) {
              if (!msg?.id) continue;
              const { data: duplicateMessage } = await supabase
                .from("chat_messages")
                .select("id")
                .eq("provider_name", "whatsapp_cloud")
                .eq("provider_message_id", String(msg.id))
                .maybeSingle();
              if (duplicateMessage) continue;
              const senderPhone = String(msg.from || "").replace(/\D/g, "");
              const messageText = msg.text?.body || msg.interactive?.button_reply?.title || "[Mídia/Outro]";

              // Upsert ou registro na tabela whatsapp_leads se existir
              try {
                const { data: existingLead } = await supabase
                  .from("whatsapp_leads")
                  .select("id, notes")
                  .eq("store_id", targetStoreId)
                  .eq("phone", senderPhone)
                  .limit(1)
                  .maybeSingle();

                if (existingLead) {
                  const updatedNotes = `${existingLead.notes || ""}\n[Cliente ${new Date().toLocaleTimeString()}]: ${messageText}`.trim();
                  await supabase
                    .from("whatsapp_leads")
                    .update({
                      notes: updatedNotes.slice(-1500),
                      updated_at: new Date().toISOString(),
                    })
                    .eq("id", existingLead.id);
                } else {
                  await supabase.from("whatsapp_leads").insert({
                    store_id: targetStoreId,
                    name: value.contacts?.[0]?.profile?.name || `Lead WhatsApp ${senderPhone.slice(-4)}`,
                    phone: senderPhone,
                    channel: "whatsapp_cloud",
                    status: "new",
                    notes: `[Mensagem Inicial]: ${messageText}`,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  });
                }
              } catch (leadErr) {
                console.warn("[whatsapp-webhook] Falha ao registrar lead:", leadErr);
              }

              // 3. Ingestão no Chat Centralizado (Cross-Module: chat_threads & chat_messages)
              try {
                const customerName = value.contacts?.[0]?.profile?.name || `WhatsApp ${senderPhone.slice(-4)}`;

                const { data: existingThread } = await supabase
                  .from("chat_threads")
                  .select("id")
                  .eq("store_id", targetStoreId)
                  .eq("context_type", "whatsapp")
                  .eq("entity_id", senderPhone)
                  .maybeSingle();

                let threadId: string;
                if (existingThread) {
                  threadId = existingThread.id;
                  await supabase
                    .from("chat_threads")
                    .update({
                      last_message_text: messageText,
                      last_message_at: new Date().toISOString(),
                      status: "open",
                      updated_at: new Date().toISOString(),
                    })
                    .eq("id", threadId);
                } else {
                  const { data: createdThread } = await supabase
                    .from("chat_threads")
                    .insert({
                      store_id: targetStoreId,
                      guest_name: customerName,
                      status: "open",
                      subject: `Atendimento WhatsApp (${senderPhone})`,
                      department: "geral",
                      priority: "normal",
                      context_type: "whatsapp",
                      entity_id: senderPhone,
                      last_message_text: messageText,
                      last_message_at: new Date().toISOString(),
                      internal_notes: `Canal: WhatsApp Cloud API | Número: ${senderPhone}`,
                      created_at: new Date().toISOString(),
                      updated_at: new Date().toISOString(),
                    })
                    .select("id")
                    .single();

                  threadId = createdThread?.id || "";
                }

                if (threadId) {
                  await supabase.from("chat_messages").insert({
                    thread_id: threadId,
                    provider_name: "whatsapp_cloud",
                    provider_message_id: String(msg.id),
                    message: messageText,
                    message_type: "text",
                    is_staff_reply: false,
                    payload: {
                      channel: "whatsapp",
                      from: senderPhone,
                      message_id: msg.id,
                      timestamp: msg.timestamp,
                    },
                    created_at: new Date().toISOString(),
                  });
                }
              } catch (chatErr) {
                console.warn("[whatsapp-webhook] Falha ao sincronizar com chat central:", chatErr);
              }
            }
          }

          return new Response(
            JSON.stringify({
              success: true,
              receivedMessages: messages?.length || 0,
              receivedStatuses: statuses?.length || 0,
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }
          );
        } catch (e: any) {
          console.error("[whatsapp-webhook:POST] Erro ao processar evento:", e);
          return new Response(JSON.stringify({ error: "Internal Server Error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
} as never)
