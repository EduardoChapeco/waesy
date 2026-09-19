import { createFileRoute } from "@tanstack/react-router";
import { getServerClient } from "@/lib/supabase";

export const Route = createFileRoute("/api/webhooks/whatsapp")({
  server: {
    handlers: {
      /**
       * GET Handler: Handshake de validação do Webhook da Meta / WhatsApp Cloud API.
       * A Meta envia: hub.mode, hub.verify_token e hub.challenge.
       */
      GET: async ({ request }) => {
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
      POST: async ({ request }) => {
        try {
          const body = await request.json().catch(() => ({}));
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
});
