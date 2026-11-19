import { decryptSecret } from "@/lib/crypto-vault.server";

export interface EnrichedMetaAdMetadata {
  campaignId?: string | null;
  campaignName?: string | null;
  adsetId?: string | null;
  adsetName?: string | null;
  adId?: string | null;
  adName?: string | null;
  adHeadline?: string | null;
  adBody?: string | null;
  creativeThumbnailUrl?: string | null;
  sourcePixelId?: string | null;
  source?: "store_ad_campaigns" | "ad_campaigns" | "meta_graph_api";
}

function normalizeCampaignStatus(raw?: unknown): string {
  const s = String(raw || "").trim().toUpperCase();
  if (s === "ACTIVE") return "active";
  if (s === "PAUSED") return "paused";
  if (s === "ARCHIVED" || s === "DELETED") return "archived";
  return s ? s.toLowerCase() : "active";
}

export function formatReadableCampaignDetail(parts: {
  campaignName?: string | null;
  adsetName?: string | null;
  adName?: string | null;
  adHeadline?: string | null;
  listingTitle?: string | null;
  adId?: string | null;
}): string {
  const ordered = [
    parts.campaignName?.trim() || null,
    parts.adsetName?.trim() || null,
    parts.adName?.trim() || parts.adHeadline?.trim() || parts.listingTitle?.trim() || null,
  ].filter((v): v is string => Boolean(v));

  const unique: string[] = [];
  for (const item of ordered) {
    if (!unique.some((u) => u.toLowerCase() === item.toLowerCase())) {
      unique.push(item);
    }
  }
  if (unique.length > 0) {
    return unique.join(" · ");
  }
  return parts.adId ? `Anúncio Meta #${parts.adId}` : "";
}

async function resolveStoreMetaGraphToken(db: any, storeId: string): Promise<string | null> {
  try {
    const { data: oauthAcc } = await db
      .from("store_ad_accounts")
      .select("oauth_access_token")
      .eq("store_id", storeId)
      .eq("platform", "meta_ads")
      .maybeSingle();
    if (oauthAcc?.oauth_access_token) {
      const tok = decryptSecret(oauthAcc.oauth_access_token);
      if (tok && tok.length > 8) return tok.trim();
    }
  } catch {
    // Fallback para integration_credentials
  }

  try {
    const { data: creds } = await db
      .from("integration_credentials")
      .select("secret_payload_encrypted, token_payload")
      .eq("store_id", storeId)
      .in("provider", ["meta_ads", "meta_pixel"])
      .eq("is_active", true)
      .limit(4);

    for (const c of creds || []) {
      if (c?.secret_payload_encrypted) {
        try {
          const parsed = JSON.parse(decryptSecret(c.secret_payload_encrypted));
          const tok = parsed?.access_token || parsed?.oauth_access_token;
          if (typeof tok === "string" && tok.trim().length > 8) return tok.trim();
        } catch {}
      }
      const tpTok = c?.token_payload?.access_token;
      if (typeof tpTok === "string" && tpTok.trim().length > 8) return tpTok.trim();
    }
  } catch {
    // Sem token ativo
  }

  return null;
}

/**
 * Resolve nomes amigáveis de Campanha · Conjunto · Anúncio consultando ambas tabelas locais
 * (`store_ad_campaigns` e `ad_campaigns`) e enriquecendo via Meta Graph API caso ausente.
 */
export async function resolveAndEnrichMetaAdMetadata(
  db: any,
  input: {
    storeId: string;
    adId?: string | null;
    campaignId?: string | null;
    adsetId?: string | null;
    skipGraphApi?: boolean;
  },
): Promise<EnrichedMetaAdMetadata | null> {
  const adId = input.adId ? String(input.adId).trim() : null;
  const campaignId = input.campaignId ? String(input.campaignId).trim() : null;
  const adsetId = input.adsetId ? String(input.adsetId).trim() : null;
  if (!adId && !campaignId) return null;

  const lookupTokens = Array.from(new Set([adId, campaignId].filter(Boolean) as string[]));

  // 1. Consulta store_ad_campaigns
  try {
    const orClauses = [
      ...lookupTokens.map((t) => `external_campaign_id.eq.${t}`),
      ...(adId ? [`external_ad_id.eq.${adId}`] : []),
    ];
    let storeCampRes = await db
      .from("store_ad_campaigns")
      .select("id, title, external_campaign_id, adset_id, adset_name, external_ad_id, external_ad_name, creative_thumbnail_url, source_pixel_id, metadata")
      .eq("store_id", input.storeId)
      .or(orClauses.join(","))
      .limit(1)
      .maybeSingle();

    if (storeCampRes?.error && /column|does not exist/i.test(storeCampRes.error.message || "")) {
      storeCampRes = await db
        .from("store_ad_campaigns")
        .select("id, title, external_campaign_id, metadata")
        .eq("store_id", input.storeId)
        .or(lookupTokens.map((t) => `external_campaign_id.eq.${t}`).join(","))
        .limit(1)
        .maybeSingle();
    }

    const row = storeCampRes?.data;
    if (row) {
      const meta = (row.metadata && typeof row.metadata === "object" ? row.metadata : {}) as Record<string, any>;
      const resolvedCampName = row.title || meta.campaign_name || null;
      const resolvedAdsetName = row.adset_name || meta.adset_name || null;
      const resolvedAdName = row.external_ad_name || meta.ad_name || meta.ad_headline || null;
      if (resolvedCampName || resolvedAdName) {
        return {
          campaignId: row.external_campaign_id || campaignId,
          campaignName: resolvedCampName,
          adsetId: row.adset_id || meta.adset_id || adsetId,
          adsetName: resolvedAdsetName,
          adId: row.external_ad_id || adId,
          adName: resolvedAdName,
          creativeThumbnailUrl: row.creative_thumbnail_url || meta.thumbnail_url || null,
          sourcePixelId: row.source_pixel_id || null,
          source: "store_ad_campaigns",
        };
      }
    }
  } catch {
    // Segue para fallback ad_campaigns
  }

  // 2. Consulta ad_campaigns (campanhas criadas no Ad Studio / Hub)
  try {
    const adOr = [
      ...lookupTokens.map((t) => `external_campaign_id.eq.${t}`),
      ...(adId ? [`external_ad_id.eq.${adId}`] : []),
    ];
    let adCampRes = await db
      .from("ad_campaigns")
      .select("id, title, external_campaign_id, external_adset_id, external_ad_id, adset_name, ad_name, creative_thumbnail_url, metadata")
      .eq("store_id", input.storeId)
      .or(adOr.join(","))
      .limit(1)
      .maybeSingle();

    if (adCampRes?.error && /column|does not exist/i.test(adCampRes.error.message || "")) {
      adCampRes = await db
        .from("ad_campaigns")
        .select("id, title, metadata")
        .eq("store_id", input.storeId)
        .limit(5);
      const list = Array.isArray(adCampRes?.data) ? adCampRes.data : [];
      const matched = list.find((c: any) => {
        const m = (c?.metadata && typeof c.metadata === "object" ? c.metadata : {}) as Record<string, any>;
        return lookupTokens.includes(String(m.meta_campaign_id || "")) || (adId && String(m.meta_ad_id || "") === adId);
      });
      adCampRes = { data: matched || null };
    }

    const row = adCampRes?.data;
    if (row) {
      const meta = (row.metadata && typeof row.metadata === "object" ? row.metadata : {}) as Record<string, any>;
      return {
        campaignId: row.external_campaign_id || meta.meta_campaign_id || campaignId,
        campaignName: row.title || meta.campaign_name || null,
        adsetId: row.external_adset_id || meta.meta_adset_id || adsetId,
        adsetName: row.adset_name || meta.adset_name || null,
        adId: row.external_ad_id || meta.meta_ad_id || adId,
        adName: row.ad_name || meta.ad_name || null,
        creativeThumbnailUrl: row.creative_thumbnail_url || meta.thumbnail_url || null,
        source: "ad_campaigns",
      };
    }
  } catch {
    // Segue para Graph API quando aplicavel
  }

  // 3. Enriquecimento ao vivo via Meta Graph API (com cache local em store_ad_campaigns)
  if (!input.skipGraphApi && adId && typeof fetch === "function") {
    const token = await resolveStoreMetaGraphToken(db, input.storeId);
    if (token) {
      try {
        const url = `https://graph.facebook.com/v20.0/${encodeURIComponent(adId)}?fields=id,name,status,adset{id,name},campaign{id,name,status},creative{id,title,body,thumbnail_url}&access_token=${encodeURIComponent(token)}`;
        const res = await fetch(url, { method: "GET", signal: AbortSignal.timeout(4500) });
        if (res.ok) {
          const json = (await res.json().catch(() => null)) as Record<string, any> | null;
          if (json && json.id) {
            const enriched: EnrichedMetaAdMetadata = {
              campaignId: json.campaign?.id ? String(json.campaign.id) : campaignId,
              campaignName: json.campaign?.name ? String(json.campaign.name) : null,
              adsetId: json.adset?.id ? String(json.adset.id) : adsetId,
              adsetName: json.adset?.name ? String(json.adset.name) : null,
              adId: String(json.id),
              adName: json.name ? String(json.name) : null,
              adHeadline: json.creative?.title ? String(json.creative.title) : null,
              adBody: json.creative?.body ? String(json.creative.body) : null,
              creativeThumbnailUrl: json.creative?.thumbnail_url ? String(json.creative.thumbnail_url) : null,
              source: "meta_graph_api",
            };

            if (enriched.campaignId && enriched.campaignName) {
              const nowIso = new Date().toISOString();
              await db
                .from("store_ad_campaigns")
                .upsert(
                  {
                    store_id: input.storeId,
                    platform: "meta_ads",
                    external_campaign_id: enriched.campaignId,
                    title: enriched.campaignName,
                    status: normalizeCampaignStatus(json.campaign?.status || json.status),
                    adset_id: enriched.adsetId || null,
                    adset_name: enriched.adsetName || null,
                    external_ad_id: enriched.adId || null,
                    external_ad_name: enriched.adName || null,
                    creative_thumbnail_url: enriched.creativeThumbnailUrl || null,
                    metadata: {
                      ad_id: enriched.adId,
                      ad_name: enriched.adName,
                      adset_id: enriched.adsetId,
                      adset_name: enriched.adsetName,
                      creative_id: json.creative?.id || null,
                      creative_title: enriched.adHeadline,
                      thumbnail_url: enriched.creativeThumbnailUrl,
                      enriched_at: nowIso,
                    },
                    updated_at: nowIso,
                  },
                  { onConflict: "store_id,platform,external_campaign_id" },
                )
                .then(() => null, () => null);
            }

            return enriched;
          }
        }
      } catch {
        // Sem bloquear webhook caso Meta Graph esteja fora ou sem permissao
      }
    }
  }

  return null;
}
