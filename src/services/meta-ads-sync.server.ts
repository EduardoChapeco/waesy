/**
 * meta-ads-sync.server.ts — Motor de Sincronização 360 Meta Ads (2x/dia + On-Demand)
 *
 * - Puxa hierarquia completa: Campanhas, Conjuntos de Anúncios (AdSets), Anúncios (Ads),
 *   status real (`effective_status`) e métricas (`spend`, `impressions`, `clicks`, `leads`).
 * - Faz upsert em `store_ad_campaigns` preservando `adsets_json`, `ads_json`, `external_ad_id`,
 *   `external_adset_id` e `effective_status`.
 * - Marca automaticamente no perfil de cada Lead (`leads_crm.ad_effective_status` / `ad_deactivated_at`)
 *   e em `ad_attribution_touchpoints` quando o anúncio ou campanha de origem foi desativado.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getServerClient } from "@/lib/supabase";
import { decryptSecret } from "@/lib/crypto-vault.server";

export interface MetaAdSyncSummary {
  storeId: string;
  campaignsSynced: number;
  adsetsSynced: number;
  adsSynced: number;
  deactivatedAdsCount: number;
  leadsUpdatedCount: number;
  syncedAt: string;
}

const DEACTIVATED_META_STATUSES = new Set([
  "PAUSED",
  "ARCHIVED",
  "DELETED",
  "DISAPPROVED",
  "WITH_ISSUES",
  "CAMPAIGN_PAUSED",
  "ADSET_PAUSED",
  "IN_PROCESS",
]);

export function isMetaAdStatusDeactivated(effectiveStatus: string | null | undefined): boolean {
  const norm = String(effectiveStatus || "").trim().toUpperCase();
  if (!norm) return false;
  return DEACTIVATED_META_STATUSES.has(norm);
}

export async function propagateAdEffectiveStatusToLeads(params: {
  db: SupabaseClient;
  storeId: string;
  adStatusByExternalId: Map<string, string>;
  campaignStatusByExternalId: Map<string, string>;
}): Promise<{ deactivatedAdsCount: number; leadsUpdatedCount: number }> {
  const { db, storeId, adStatusByExternalId, campaignStatusByExternalId } = params;
  const nowIso = new Date().toISOString();
  let deactivatedAdsCount = 0;
  for (const st of adStatusByExternalId.values()) {
    if (isMetaAdStatusDeactivated(st)) deactivatedAdsCount++;
  }

  const { data: leads } = await db
    .from("leads_crm")
    .select("id, custom_fields, ad_effective_status, ad_deactivated_at")
    .eq("store_id", storeId)
    .not("custom_fields", "is", null)
    .limit(500);

  let leadsUpdatedCount = 0;
  for (const lead of leads || []) {
    const cf = ((lead as any).custom_fields && typeof (lead as any).custom_fields === "object"
      ? (lead as any).custom_fields
      : {}) as Record<string, any>;
    const attr = (cf.attribution && typeof cf.attribution === "object" ? cf.attribution : {}) as Record<string, any>;
    const adId = String(cf.ad_id || attr.ad_id || "").trim();
    const campaignId = String(cf.campaign_id || attr.campaign_id || "").trim();
    if (!adId && !campaignId) continue;

    const effectiveStatus =
      (adId && adStatusByExternalId.get(adId)) ||
      (campaignId && campaignStatusByExternalId.get(campaignId)) ||
      null;
    if (!effectiveStatus) continue;

    const isDeactivated = isMetaAdStatusDeactivated(effectiveStatus);
    const prevStatus = (lead as any).ad_effective_status || null;
    if (prevStatus === effectiveStatus) continue;

    const nextDeactivatedAt = isDeactivated
      ? ((lead as any).ad_deactivated_at || nowIso)
      : null;

    const { error } = await db
      .from("leads_crm")
      .update({
        ad_effective_status: effectiveStatus,
        ad_deactivated_at: nextDeactivatedAt,
        custom_fields: {
          ...cf,
          ad_effective_status: effectiveStatus,
          ad_is_deactivated: isDeactivated,
          ...(nextDeactivatedAt ? { ad_deactivated_at: nextDeactivatedAt } : {}),
        },
        updated_at: nowIso,
      })
      .eq("id", lead.id)
      .eq("store_id", storeId);

    if (!error) leadsUpdatedCount++;
  }

  // Atualiza também touchpoints vinculados a esses ad_ids
  for (const [extAdId, status] of adStatusByExternalId.entries()) {
    await db
      .from("ad_attribution_touchpoints")
      .update({ ad_effective_status: status })
      .eq("store_id", storeId)
      .eq("ad_id", extAdId)
      .then(() => null, () => null);
  }

  return { deactivatedAdsCount, leadsUpdatedCount };
}

export async function syncStoreMetaAdsHierarchy(params: {
  db?: SupabaseClient;
  storeId: string;
}): Promise<MetaAdSyncSummary> {
  const db = params.db || getServerClient();
  const { storeId } = params;
  const nowIso = new Date().toISOString();

  // Localiza contas Meta Ads ativas da loja
  const { data: accounts } = await db
    .from("store_ad_accounts")
    .select("*")
    .eq("store_id", storeId)
    .eq("platform", "meta_ads")
    .eq("status", "connected");

  const adStatusByExternalId = new Map<string, string>();
  const campaignStatusByExternalId = new Map<string, string>();
  let campaignsSynced = 0;
  let adsetsSynced = 0;
  let adsSynced = 0;

  for (const acc of accounts || []) {
    const rawToken = (acc as any).access_token_encrypted || (acc as any).access_token || "";
    if (!rawToken) continue;
    let accessToken = String(rawToken);
    if (accessToken.includes(":")) {
      try {
        accessToken = decryptSecret(accessToken);
      } catch {
        continue;
      }
    }
    const rawAccountId = String((acc as any).external_account_id || (acc as any).account_id || "").trim();
    if (!rawAccountId) continue;
    const actId = rawAccountId.startsWith("act_") ? rawAccountId : `act_${rawAccountId}`;

    try {
      const fields = [
        "id",
        "name",
        "status",
        "effective_status",
        "objective",
        "daily_budget",
        "lifetime_budget",
        "adsets.limit(50){id,name,status,effective_status,daily_budget}",
        "ads.limit(100){id,name,status,effective_status,adset_id,creative{id,title,body,thumbnail_url}}",
        "insights.date_preset(last_30d){spend,impressions,clicks,actions}",
      ].join(",");

      const url = `https://graph.facebook.com/v20.0/${encodeURIComponent(actId)}/campaigns?fields=${encodeURIComponent(fields)}&limit=50&access_token=${encodeURIComponent(accessToken)}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
      if (!res.ok) continue;
      const json = (await res.json().catch(() => ({}))) as { data?: Array<Record<string, any>> };
      const campaigns = Array.isArray(json.data) ? json.data : [];

      for (const camp of campaigns) {
        const extCampId = String(camp.id || "").trim();
        if (!extCampId) continue;
        const campEffective = String(camp.effective_status || camp.status || "ACTIVE").toUpperCase();
        campaignStatusByExternalId.set(extCampId, campEffective);

        const adsetsList = Array.isArray(camp.adsets?.data) ? camp.adsets.data : [];
        const adsList = Array.isArray(camp.ads?.data) ? camp.ads.data : [];
        adsetsSynced += adsetsList.length;
        adsSynced += adsList.length;

        for (const adItem of adsList) {
          const extAdId = String(adItem?.id || "").trim();
          const adEff = String(adItem?.effective_status || adItem?.status || campEffective).toUpperCase();
          if (extAdId) {
            adStatusByExternalId.set(extAdId, adEff);
          }
        }

        const insight = Array.isArray(camp.insights?.data) ? camp.insights.data[0] : null;
        const spendCents = insight?.spend ? Math.round(Number(insight.spend) * 100) : 0;
        const impressions = insight?.impressions ? Number(insight.impressions) : 0;
        const clicks = insight?.clicks ? Number(insight.clicks) : 0;
        const actions = Array.isArray(insight?.actions) ? insight.actions : [];
        const leadAction = actions.find((a: any) =>
          ["lead", "onsite_conversion.lead_grouped", "onsite_conversion.messaging_conversation_started_7d"].includes(String(a?.action_type)),
        );
        const leadsCount = leadAction?.value ? Number(leadAction.value) : 0;

        const primaryAd = adsList[0] || null;
        const primaryAdset = adsetsList[0] || null;

        await db.from("store_ad_campaigns").upsert(
          {
            store_id: storeId,
            name: String(camp.name || `Campanha ${extCampId}`),
            title: String(camp.name || `Campanha ${extCampId}`),
            channel: "meta_ads",
            platform: "meta_ads",
            external_campaign_id: extCampId,
            external_adset_id: primaryAdset?.id ? String(primaryAdset.id) : null,
            external_ad_id: primaryAd?.id ? String(primaryAd.id) : null,
            status: isMetaAdStatusDeactivated(campEffective) ? "paused" : "active",
            effective_status: campEffective,
            objective: camp.objective ? String(camp.objective) : null,
            daily_budget_cents: camp.daily_budget ? Number(camp.daily_budget) : 0,
            total_budget_cents: camp.lifetime_budget ? Number(camp.lifetime_budget) : 0,
            spend_cents: spendCents,
            impressions,
            clicks,
            leads_count: leadsCount,
            adsets_json: adsetsList,
            ads_json: adsList,
            last_synced_at: nowIso,
            updated_at: nowIso,
          },
          { onConflict: "store_id,channel,external_campaign_id" },
        );
        campaignsSynced++;
      }
    } catch (err) {
      console.warn("[meta-ads-sync] Erro ao sincronizar conta Meta Ads:", err);
    }
  }

  // Fallback local: inclui campanhas já registradas em `store_ad_campaigns` para propagar status aos leads
  const { data: localCampaigns } = await db
    .from("store_ad_campaigns")
    .select("external_campaign_id, external_ad_id, status, effective_status, ads_json")
    .eq("store_id", storeId)
    .eq("channel", "meta_ads");

  for (const lc of localCampaigns || []) {
    const eff = String((lc as any).effective_status || ((lc as any).status === "paused" ? "PAUSED" : "ACTIVE")).toUpperCase();
    if (lc.external_campaign_id && !campaignStatusByExternalId.has(lc.external_campaign_id)) {
      campaignStatusByExternalId.set(lc.external_campaign_id, eff);
    }
    if ((lc as any).external_ad_id && !adStatusByExternalId.has((lc as any).external_ad_id)) {
      adStatusByExternalId.set(String((lc as any).external_ad_id), eff);
    }
    const adsArr = Array.isArray((lc as any).ads_json) ? (lc as any).ads_json : [];
    for (const a of adsArr) {
      if (a?.id && !adStatusByExternalId.has(String(a.id))) {
        adStatusByExternalId.set(String(a.id), String(a.effective_status || a.status || eff).toUpperCase());
      }
    }
  }

  const propagation = await propagateAdEffectiveStatusToLeads({
    db,
    storeId,
    adStatusByExternalId,
    campaignStatusByExternalId,
  });

  return {
    storeId,
    campaignsSynced,
    adsetsSynced,
    adsSynced,
    deactivatedAdsCount: propagation.deactivatedAdsCount,
    leadsUpdatedCount: propagation.leadsUpdatedCount,
    syncedAt: nowIso,
  };
}

export async function runGlobalMetaAdsTwiceDailySync(): Promise<{
  storesProcessed: number;
  summaries: MetaAdSyncSummary[];
}> {
  const db = getServerClient();
  const { data: accounts } = await db
    .from("store_ad_accounts")
    .select("store_id")
    .eq("platform", "meta_ads")
    .eq("status", "connected");

  const storeIds = Array.from(new Set((accounts || []).map((a: any) => String(a.store_id)).filter(Boolean)));
  const summaries: MetaAdSyncSummary[] = [];
  for (const storeId of storeIds) {
    const summary = await syncStoreMetaAdsHierarchy({ db, storeId });
    summaries.push(summary);
  }
  return {
    storesProcessed: storeIds.length,
    summaries,
  };
}
