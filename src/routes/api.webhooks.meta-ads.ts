import { createFileRoute } from "@tanstack/react-router";
import { getServerClient } from "@/lib/supabase";
import { getPlatformMetaSecretsServerInternal } from "@/services/master.functions";

import type {} from "@tanstack/react-start";
export const Route = createFileRoute("/api/webhooks/meta-ads")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const url = new URL(request.url);
        const mode = url.searchParams.get("hub.mode");
        const token = url.searchParams.get("hub.verify_token");
        const challenge = url.searchParams.get("hub.challenge");

        const metaSecrets = await getPlatformMetaSecretsServerInternal();
        const verifySecret = metaSecrets.verifyToken;

        if (mode === "subscribe" && token === verifySecret) {
          return new Response(challenge || "ok", {
            status: 200,
            headers: { "Content-Type": "text/plain" },
          });
        }

        return new Response("Forbidden", { status: 403 });
      },

      POST: async ({ request }: { request: Request }) => {
        try {
          const rawText = await request.text().catch(() => "");
          const metaSecrets = await getPlatformMetaSecretsServerInternal();
          const appSecret = metaSecrets.appSecret;
          const signature = request.headers.get("x-hub-signature-256");

          // Validação HMAC-SHA256 Zero-Trust se APP_SECRET estiver configurado
          if (appSecret && signature) {
            const { createHmac, timingSafeEqual } = await import("crypto");
            const expectedSig = "sha256=" + createHmac("sha256", appSecret).update(rawText).digest("hex");
            try {
              const sigBuffer = Buffer.from(signature);
              const expBuffer = Buffer.from(expectedSig);
              if (sigBuffer.length !== expBuffer.length || !timingSafeEqual(sigBuffer, expBuffer)) {
                return new Response("Invalid Signature", { status: 401 });
              }
            } catch {
              return new Response("Unauthorized", { status: 401 });
            }
          }

          let body: any = {};
          try {
            body = JSON.parse(rawText);
          } catch {
            body = {};
          }
          const supabase = getServerClient();

          const entries = Array.isArray(body.entry) ? body.entry : [];
          let processedCount = 0;

          for (const entry of entries) {
            const changes = Array.isArray(entry.changes) ? entry.changes : [];
            for (const change of changes) {
              const val = change.value || {};

              // ── Branch Especial: Ingestão de Formulários Instantâneos Nativos (Lead Ads) ──
              if (change.field === "leadgen" || val.leadgen_id) {
                const leadgenId = String(val.leadgen_id || val.id || "");
                const formId = String(val.form_id || "");
                const adId = String(val.ad_id || "");
                const pageId = String(val.page_id || entry.id || "");
                const eventId = `leadgen_${leadgenId || Date.now()}`;

                const { data: existingLeadEvent } = await supabase
                  .from("marketplace_webhook_events")
                  .select("id")
                  .eq("platform", "meta_ads")
                  .eq("event_id", eventId)
                  .maybeSingle();

                if (existingLeadEvent) continue;

                // Identifica a loja pelo ad_id ou campanha vinculada
                let targetStoreId: string | null = null;
                if (adId) {
                  const { data: matchedAd } = await supabase
                    .from("ad_campaigns")
                    .select("store_id")
                    .or(`external_campaign_id.eq.${adId},id.eq.${adId}`)
                    .maybeSingle();
                  targetStoreId = matchedAd?.store_id || null;
                }

                // Registra recebimento idempotente no Transactional Inbox
                const { data: inboxRecord } = await supabase
                  .from("marketplace_webhook_events")
                  .insert({
                    platform: "meta_ads",
                    event_id: eventId,
                    topic: "leadgen",
                    resource_id: leadgenId || formId,
                    payload: change,
                    store_id: targetStoreId,
                    status: "received",
                  })
                  .select("id")
                  .maybeSingle();

                // Deduplicação e Ingestão no CRM
                if (targetStoreId) {
                  const rawPhone = val.phone_number || val.phone;
                  const rawEmail = val.email;
                  const cleanPhone = rawPhone ? String(rawPhone).replace(/\D/g, "") : null;
                  const cleanEmail = rawEmail ? String(rawEmail).trim().toLowerCase() : null;

                  let existingLeadQuery = supabase
                    .from("leads_crm")
                    .select("id, notes, tags")
                    .eq("store_id", targetStoreId);

                  if (cleanPhone && cleanEmail) {
                    existingLeadQuery = existingLeadQuery.or(`phone.ilike.%${cleanPhone.slice(-8)}%,email.ilike.${cleanEmail}`);
                  } else if (cleanPhone) {
                    existingLeadQuery = existingLeadQuery.ilike("phone", `%${cleanPhone.slice(-8)}%`);
                  } else if (cleanEmail) {
                    existingLeadQuery = existingLeadQuery.ilike("email", cleanEmail);
                  }

                  const { data: existingLead } = (cleanPhone || cleanEmail)
                    ? await existingLeadQuery.order("created_at", { ascending: false }).limit(1).maybeSingle()
                    : { data: null };

                  if (existingLead) {
                    await supabase
                      .from("leads_crm")
                      .update({
                        notes: `${existingLead.notes || ""}\n[Reconversão via Meta Lead Ad Form #${formId} em ${new Date().toLocaleDateString('pt-BR')}]`.trim(),
                        last_contacted_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                      })
                      .eq("id", existingLead.id);
                  } else {
                    const { data: newLead } = await supabase.from("leads_crm").insert({
                      store_id: targetStoreId,
                      full_name: val.full_name || val.name || `Lead Meta #${leadgenId.slice(-4) || "Novo"}`,
                      email: cleanEmail,
                      phone: rawPhone ? String(rawPhone).trim() : null,
                      title: `Lead Form Meta #${formId ? formId.slice(-4) : "Instantâneo"}`,
                      source: "meta_lead_ad",
                      lead_source_detail: `Ad: ${adId || "Meta"} | Form: ${formId || "Nativo"}`,
                      status: "new",
                      custom_fields: {
                        meta_leadgen_id: leadgenId,
                        meta_form_id: formId,
                        meta_ad_id: adId,
                        meta_page_id: pageId,
                      },
                      last_contacted_at: new Date().toISOString(),
                    }).select("id").maybeSingle();

                    if (newLead?.id) {
                      await (supabase.rpc as any)("deduplicate_and_link_lead_to_customer", {
                        p_lead_id: newLead.id,
                        p_store_id: targetStoreId,
                      }).catch(() => {});

                      // Speed-to-Lead: registra atividade imediata na timeline para atendimento rápido
                      await supabase.from("lead_activities").insert({
                        lead_id: newLead.id,
                        store_id: targetStoreId,
                        type: "lead_ad_received",
                        content: `Lead recebido via Meta Lead Ads (Form #${formId || "Nativo"} / Ad #${adId || "Meta"}). Prioridade: Speed-to-Lead em até 5 min.`,
                        metadata: {
                          form_id: formId,
                          ad_id: adId,
                          leadgen_id: leadgenId,
                          suggested_greeting: `Olá, ${val.full_name || val.name || "tudo bem"}! Sou da equipe de atendimento. Recebemos seu contato através do nosso anúncio no Instagram. Como posso te ajudar hoje?`,
                        },
                      }).then(() => null, () => null);
                    }
                  }
                }

                if (inboxRecord?.id) {
                  await supabase
                    .from("marketplace_webhook_events")
                    .update({ status: "processed", processed_at: new Date().toISOString() })
                    .eq("id", inboxRecord.id);
                }

                processedCount++;
                continue;
              }

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
} as never)
