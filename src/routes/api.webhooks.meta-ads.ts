import { createFileRoute } from "@tanstack/react-router";
import { getServerClient } from "@/lib/supabase";

export const Route = createFileRoute("/api/webhooks/meta-ads")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const mode = url.searchParams.get("hub.mode");
        const token = url.searchParams.get("hub.verify_token");
        const challenge = url.searchParams.get("hub.challenge");

        const verifySecret = process.env.META_WEBHOOK_VERIFY_TOKEN || "waesy_meta_ads_verify";

        if (mode === "subscribe" && token === verifySecret) {
          return new Response(challenge || "ok", {
            status: 200,
            headers: { "Content-Type": "text/plain" },
          });
        }

        return new Response("Forbidden", { status: 403 });
      },

      POST: async ({ request }) => {
        try {
          const body = await request.json().catch(() => ({}));
          const supabase = getServerClient();

          const entries = Array.isArray(body.entry) ? body.entry : [];
          let processedCount = 0;

          for (const entry of entries) {
            const changes = Array.isArray(entry.changes) ? entry.changes : [];
            for (const change of changes) {
              const val = change.value || {};
              const externalCampaignId = val.campaign_id || val.ad_id || val.id;
              if (!externalCampaignId) continue;

              // Identificador único para idempotência contra replay de webhooks
              const eventId = String(val.event_id || `${entry.id || "entry"}_${entry.time || ""}_${externalCampaignId}`);

              // 1. Verificação de Idempotência no Transactional Inbox
              const { data: existingEvent } = await supabase
                .from("marketplace_webhook_events")
                .select("id, status")
                .eq("platform", "meta_ads")
                .eq("event_id", eventId)
                .maybeSingle();

              if (existingEvent) {
                // Evento já registrado e processado — pula para evitar contagem duplicada
                continue;
              }

              // Localiza a campanha correspondente na rede Waesy (Isolamento Multi-Tenant estrito)
              const { data: campaign } = await supabase
                .from("ad_campaigns")
                .select("id, store_id, classified_id, status")
                .or(`external_campaign_id.eq.${externalCampaignId},id.eq.${externalCampaignId}`)
                .maybeSingle();

              if (!campaign) continue;

              // Registra recebimento no Transactional Inbox
              const { data: inboxRecord } = await supabase
                .from("marketplace_webhook_events")
                .insert({
                  platform: "meta_ads",
                  event_id: eventId,
                  topic: "campaign_telemetry",
                  resource_id: externalCampaignId,
                  payload: change,
                  store_id: campaign.store_id || null,
                  status: "received",
                })
                .select("id")
                .maybeSingle();

              // 2. Atualização de status da campanha se Meta reportar mudança
              if (val.status) {
                const statusMap: Record<string, string> = {
                  ACTIVE: "active",
                  PAUSED: "paused",
                  ARCHIVED: "completed",
                  DELETED: "completed",
                  DISAPPROVED: "rejected",
                };
                const newStatus = statusMap[val.status.toUpperCase()] || "active";
                await supabase
                  .from("ad_campaigns")
                  .update({ status: newStatus, updated_at: new Date().toISOString() })
                  .eq("id", campaign.id);
              }

              // 3. Registro de telemetria (impressões e cliques recebidos da API externa)
              const impressions = Number(val.impressions || 0);
              const clicks = Number(val.clicks || 0);

              if (impressions > 0 || clicks > 0) {
                // Insere evento no ad_events
                if (impressions > 0) {
                  await supabase.from("ad_events").insert({
                    campaign_id: campaign.id,
                    event_type: "view",
                  });
                }
                if (clicks > 0) {
                  await supabase.from("ad_events").insert({
                    campaign_id: campaign.id,
                    event_type: "click",
                  });
                }

                // Se vinculado a um classificado, incrementa os contadores e atualiza daily_views
                if (campaign.classified_id) {
                  const { data: cls } = await supabase
                    .from("classifieds")
                    .select("views_count, clicks_count, attributes")
                    .eq("id", campaign.classified_id)
                    .single();

                  if (cls) {
                    const today = new Date().toISOString().slice(0, 10);
                    const currentAttrs = (cls.attributes as Record<string, any>) || {};
                    const dailyViews = { ...(currentAttrs.daily_views || {}) };
                    dailyViews[today] = (Number(dailyViews[today]) || 0) + impressions;

                    await supabase
                      .from("classifieds")
                      .update({
                        views_count: (cls.views_count || 0) + impressions,
                        clicks_count: (cls.clicks_count || 0) + clicks,
                        attributes: {
                          ...currentAttrs,
                          daily_views: dailyViews,
                        },
                        updated_at: new Date().toISOString(),
                      })
                      .eq("id", campaign.classified_id);
                  }
                }
              }

              // Marca como processado com sucesso
              if (inboxRecord?.id) {
                await supabase
                  .from("marketplace_webhook_events")
                  .update({ status: "processed", processed_at: new Date().toISOString() })
                  .eq("id", inboxRecord.id);
              }

              processedCount++;
            }
          }

          return new Response(JSON.stringify({ success: true, processed: processedCount }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (err: any) {
          console.error("[meta-ads-webhook] Erro no processamento:", err);
          return new Response(JSON.stringify({ error: err.message || "Internal error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
