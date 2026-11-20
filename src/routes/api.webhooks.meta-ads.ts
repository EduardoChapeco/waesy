import { createFileRoute } from "@tanstack/react-router";
import { getServerClient } from "@/lib/supabase";
import { getPlatformMetaSecretsServerInternal } from "@/services/master.functions";
import { getActiveIntegrationPayload } from "@/services/integrations.functions";
import { resolveValidStoreAdToken } from "@/services/ads.functions";

import type {} from "@tanstack/react-start";

function firstField(fields: Record<string, unknown>, names: string[]): string | null {
  for (const name of names) {
    const value = fields[name];
    if (Array.isArray(value) && value[0] != null) return String(value[0]).trim() || null;
    if (value != null && String(value).trim()) return String(value).trim();
  }
  return null;
}

function normalizeLeadFields(fieldData: unknown): Record<string, string> {
  const fields: Record<string, string> = {};
  if (!Array.isArray(fieldData)) return fields;
  for (const item of fieldData) {
    if (!item || typeof item !== "object") continue;
    const row = item as { name?: unknown; values?: unknown };
    const name = String(row.name || "").trim();
    if (!name) continue;
    const values = Array.isArray(row.values) ? row.values.map((value) => String(value)) : [];
    fields[name] = values.join(", ");
  }
  return fields;
}

async function verifyMetaSignature(rawText: string, signature: string | null, appSecret: string) {
  if (!appSecret || !signature || !signature.startsWith("sha256=")) return false;
  const { createHmac, timingSafeEqual } = await import("crypto");
  const expected = Buffer.from(`sha256=${createHmac("sha256", appSecret).update(rawText).digest("hex")}`, "utf8");
  const received = Buffer.from(signature, "utf8");
  return received.length === expected.length && timingSafeEqual(received, expected);
}
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

        if (mode === "subscribe" && Boolean(verifySecret) && Boolean(challenge) && token === verifySecret) {
          return new Response(challenge, {
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

          // A rota recebe dados mutáveis e só pode processá-los com autenticação fail-closed.
          if (!(await verifyMetaSignature(rawText, signature, appSecret))) {
            return new Response("Unauthorized", { status: 401 });
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
                if (!leadgenId) continue;
                const eventId = `leadgen_${leadgenId}`;

                const { data: existingLeadEvent } = await supabase
                  .from("marketplace_webhook_events")
                  .select("id")
                  .eq("platform", "meta_ads")
                  .eq("event_id", eventId)
                  .maybeSingle();

                if (existingLeadEvent) continue;

                // Identifica a loja pelo anúncio persistido ou pelo vínculo da página Meta.
                let targetStoreId: string | null = null;
                if (adId) {
                  const safeAdId = adId.replace(/[^a-zA-Z0-9_-]/g, "");
                  if (safeAdId) {
                    const { data: matchedAd } = await supabase
                      .from("store_ad_campaigns")
                      .select("store_id")
                      .or(`external_ad_id.eq.${safeAdId},external_campaign_id.eq.${safeAdId}`)
                      .limit(1)
                      .maybeSingle();
                    targetStoreId = matchedAd?.store_id || null;
                  }
                }
                if (!targetStoreId && pageId) {
                  const { data: pageIntegration } = await supabase
                    .from("integration_credentials")
                    .select("store_id")
                    .in("provider", ["meta_ads", "meta_pixel"])
                    .eq("public_metadata->>page_id", pageId)
                    .eq("is_active", true)
                    .maybeSingle();
                  targetStoreId = pageIntegration?.store_id || null;
                }

                // Registra recebimento idempotente no Transactional Inbox
                const { data: inboxRecord, error: inboxError } = await supabase
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
                if (inboxError?.code === "23505") continue;
                if (inboxError || !inboxRecord?.id) throw new Error(`Falha ao registrar evento Meta: ${inboxError?.message || "registro ausente"}`);

                if (!targetStoreId) throw new Error(`Loja não vinculada ao anúncio/página Meta ${pageId || adId || "recebidos"}.`);
                let pageToken = "";
                try { pageToken = (await resolveValidStoreAdToken(supabase, targetStoreId, "meta_ads")).accessToken; } catch {}
                if (!pageToken) {
                  const payload = await getActiveIntegrationPayload(targetStoreId, "meta_ads") || await getActiveIntegrationPayload(targetStoreId, "meta_pixel");
                  pageToken = String(payload?.page_access_token || payload?.access_token || "");
                }
                if (!pageToken) throw new Error("Token da página Meta não está provisionado no cofre da loja.");

                const leadResponse = await fetch(`https://graph.facebook.com/v19.0/${encodeURIComponent(leadgenId)}?fields=id,created_time,field_data,form_id,ad_id,adset_id,campaign_id&access_token=${encodeURIComponent(pageToken)}`);
                const leadPayload = await leadResponse.json().catch(() => ({}));
                if (!leadResponse.ok) throw new Error(`Graph API Lead Ads (${leadResponse.status}): ${leadPayload?.error?.message || "falha ao consultar leadgen_id"}`);
                const fieldData = normalizeLeadFields(leadPayload.field_data);
                const fullName = firstField(fieldData, ["full_name", "name", "nome"]) || val.full_name || val.name || `Lead Meta #${leadgenId.slice(-4)}`;
                const email = (firstField(fieldData, ["email", "e-mail"]) || val.email || "").trim().toLowerCase() || null;
                const phone = firstField(fieldData, ["phone_number", "phone", "telefone"]) || val.phone_number || val.phone || null;
                const customFields = {
                  meta_leadgen_id: leadgenId,
                  meta_form_id: String(leadPayload.form_id || formId),
                  meta_ad_id: String(leadPayload.ad_id || adId),
                  meta_adset_id: String(leadPayload.adset_id || ""),
                  meta_campaign_id: String(leadPayload.campaign_id || ""),
                  meta_page_id: pageId,
                  meta_field_data: fieldData,
                  meta_received_at: new Date().toISOString(),
                };
                const { data: ingested, error: ingestError } = await (supabase.rpc as any)("ingest_meta_lead_atomic", {
                  p_store_id: targetStoreId,
                  p_leadgen_id: leadgenId,
                  p_full_name: fullName,
                  p_email: email,
                  p_phone: phone,
                  p_custom_fields: customFields,
                  p_form_id: String(leadPayload.form_id || formId),
                  p_ad_id: String(leadPayload.ad_id || adId),
                });
                if (ingestError || !ingested) throw new Error(`Falha ao persistir lead Meta: ${ingestError?.message || "RPC sem retorno"}`);

                // Enriquece metadados da campanha Meta + dedup CRM + dispara CAPI multi-pixel
                try {
                  const resolvedAdId = String(leadPayload.ad_id || adId || "").trim() || null;
                  const resolvedCampaignId = String(leadPayload.campaign_id || "").trim() || null;
                  const resolvedFormId = String(leadPayload.form_id || formId || "").trim() || null;
                  const { resolveAndEnrichMetaAdMetadata, formatReadableCampaignDetail } = await import(
                    "@/services/meta-ad-enrichment.server"
                  );
                  const enrichedMeta = await resolveAndEnrichMetaAdMetadata(supabase, {
                    storeId: targetStoreId,
                    adId: resolvedAdId,
                    campaignId: resolvedCampaignId,
                    adsetId: String(leadPayload.adset_id || "").trim() || null,
                  }).catch(() => null);

                  const humanAnswers = Object.fromEntries(
                    Object.entries(fieldData).filter(
                      ([k]) => !["full_name", "name", "nome", "email", "e-mail", "phone_number", "phone", "telefone"].includes(k.toLowerCase()),
                    ),
                  );
                  const readableDetail = enrichedMeta
                    ? formatReadableCampaignDetail({
                        campaignName: enrichedMeta.campaignName,
                        adsetName: enrichedMeta.adsetName,
                        adName: enrichedMeta.adName,
                        adHeadline: enrichedMeta.adHeadline,
                        adId: resolvedAdId,
                      })
                    : null;

                  const { ingestOmnichannelLead } = await import("@/services/omnichannel-lead-ingestion");
                  const mergedLead = await ingestOmnichannelLead(supabase, {
                    storeId: targetStoreId,
                    source: "meta_ads",
                    sourceDetail: readableDetail || (resolvedFormId ? `Meta Form #${resolvedFormId}` : "Meta Lead Ads"),
                    fullName,
                    phone,
                    email,
                    sourceFormId: resolvedFormId,
                    customFields: {
                      ...customFields,
                      ...humanAnswers,
                      meta_atomic_id: typeof ingested === "string" ? ingested : ingested?.id || null,
                      ...(enrichedMeta?.campaignName ? { campaign_name: enrichedMeta.campaignName, utm_campaign: enrichedMeta.campaignName } : {}),
                      ...(enrichedMeta?.adsetName ? { adset_name: enrichedMeta.adsetName } : {}),
                      ...(enrichedMeta?.adName ? { ad_name: enrichedMeta.adName } : {}),
                      ...(enrichedMeta?.adHeadline ? { ad_headline: enrichedMeta.adHeadline } : {}),
                      ...(enrichedMeta?.sourcePixelId ? { source_pixel_id: enrichedMeta.sourcePixelId } : {}),
                    },
                  }).catch(() => null);

                  const { dispatchServerSidePixelConversion } = await import(
                    "@/services/omnichannel-attribution.server"
                  );
                  await dispatchServerSidePixelConversion(supabase, {
                    storeId: targetStoreId,
                    eventName: "Lead",
                    eventId: `meta_leadgen_${leadgenId}`,
                    eventSource: "meta_leadgen_webhook",
                    leadId: mergedLead?.leadId || (typeof ingested === "string" ? ingested : ingested?.id || null),
                    phone,
                    email,
                    fullName,
                    campaignId: resolvedCampaignId,
                    adId: resolvedAdId,
                    formId: resolvedFormId,
                    sourcePixelId: enrichedMeta?.sourcePixelId || null,
                  }).catch(() => null);
                } catch {}

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
                .from("store_ad_campaigns")
                .select("id, store_id, status, metadata")
                .eq("external_campaign_id", String(externalCampaignId))
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
                  .from("store_ad_campaigns")
                  .update({ status: newStatus, updated_at: new Date().toISOString() })
                  .eq("id", campaign.id);
              }

              // 3. Registro de telemetria (impressões e cliques recebidos da API externa)
              const impressions = Number(val.impressions || 0);
              const clicks = Number(val.clicks || 0);

              if (impressions > 0 || clicks > 0) {
                const metadata = (campaign.metadata as Record<string, unknown>) || {};
                await supabase
                  .from("store_ad_campaigns")
                  .update({
                    metadata: {
                      ...metadata,
                      meta_impressions: Number(metadata.meta_impressions || 0) + impressions,
                      meta_clicks: Number(metadata.meta_clicks || 0) + clicks,
                      last_meta_event_at: new Date().toISOString(),
                    },
                    updated_at: new Date().toISOString(),
                  })
                  .eq("id", campaign.id);
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
