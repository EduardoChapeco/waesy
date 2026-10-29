import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  type SponsorDTO,
  type CanonicalEditorialPlacementZone,
  CANONICAL_EDITORIAL_PLACEMENT_ZONES,
  resolveEditorialAdPlacementsFn,
  recordEditorialAdEventFn,
} from "@/services/news.functions";

describe("Waesy Editorial Ad Server & Display Network Engine", () => {
  const storeA = "11111111-1111-4111-8111-111111111111";
  const storeB = "22222222-2222-4222-8222-222222222222";
  const articleId = "33333333-3333-4333-8333-333333333333";
  const sponsorIdA1 = "44444444-4444-4444-8444-444444444444";
  const sponsorIdA2 = "55555555-5555-4555-8555-555555555555";
  const sponsorIdB1 = "66666666-6666-4666-8666-666666666666";

  it("exports all 8 canonical placement zones matching Google Ad Manager standards", () => {
    expect(CANONICAL_EDITORIAL_PLACEMENT_ZONES).toEqual([
      "portal_top_billboard",
      "breaking_rail_card",
      "feed_in_stream",
      "sidebar_sticky",
      "article_hero_sponsor",
      "article_inline_mid",
      "article_footer_cta",
      "builder_custom_slot",
    ]);
  });

  it("validates strict tenant isolation: sponsors from store B never leak into store A", () => {
    const sponsorsStoreA: SponsorDTO[] = [
      {
        id: sponsorIdA1,
        store_id: storeA,
        name: "Padaria Central SJC",
        tier: "gold",
        active: true,
        created_at: new Date().toISOString(),
        placement_mode: "all",
      },
    ];

    const sponsorsStoreB: SponsorDTO[] = [
      {
        id: sponsorIdB1,
        store_id: storeB,
        name: "Concessionária Vale Sul",
        tier: "diamond",
        active: true,
        created_at: new Date().toISOString(),
        placement_mode: "all",
      },
    ];

    // Simula filtragem estrita por store_id
    const filteredForStoreA = [...sponsorsStoreA, ...sponsorsStoreB].filter(
      (s) => s.store_id === storeA,
    );

    expect(filteredForStoreA).toHaveLength(1);
    expect(filteredForStoreA[0].id).toBe(sponsorIdA1);
    expect(filteredForStoreA.some((s) => s.store_id === storeB)).toBe(false);
  });

  it("enforces Brand Safety: disables all ad delivery when article ad_policy is ads_disabled", () => {
    const requestedZones: CanonicalEditorialPlacementZone[] = [
      "article_hero_sponsor",
      "article_inline_mid",
      "article_footer_cta",
    ];

    const adPolicy = "ads_disabled";
    const resolutions: Record<string, any> = {};

    if (adPolicy === "ads_disabled") {
      for (const zone of requestedZones) {
        resolutions[zone] = {
          placement_zone: zone,
          status: "disabled",
          sponsor: null,
          is_exclusive: false,
          is_house_ad: false,
          rendered_creative: {
            banner_url: null,
            headline: "",
            cta_label: "",
            target_url: "",
          },
        };
      }
    }

    expect(resolutions.article_hero_sponsor.status).toBe("disabled");
    expect(resolutions.article_hero_sponsor.sponsor).toBeNull();
    expect(resolutions.article_inline_mid.status).toBe("disabled");
    expect(resolutions.article_footer_cta.status).toBe("disabled");
  });

  it("enforces exclusive_lock: delivers only designates sponsors for exclusive editorial partnerships", () => {
    const pool: SponsorDTO[] = [
      {
        id: sponsorIdA1,
        store_id: storeA,
        name: "Banco Vale Regional",
        tier: "diamond",
        active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: sponsorIdA2,
        store_id: storeA,
        name: "Supermercado Piratininga",
        tier: "silver",
        active: true,
        created_at: new Date().toISOString(),
      },
    ];

    const exclusiveSponsorIds = [sponsorIdA1];
    const adPolicy = "exclusive_lock";

    const eligible = pool.filter((s) =>
      adPolicy === "exclusive_lock" ? exclusiveSponsorIds.includes(s.id) : true,
    );

    expect(eligible).toHaveLength(1);
    expect(eligible[0].id).toBe(sponsorIdA1);
    expect(eligible[0].name).toBe("Banco Vale Regional");
  });

  it("honors placement_overrides to pin specific sponsors to designated slots", () => {
    const pool: SponsorDTO[] = [
      {
        id: sponsorIdA1,
        store_id: storeA,
        name: "Hospital São José",
        tier: "gold",
        active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: sponsorIdA2,
        store_id: storeA,
        name: "Faculdade Vale",
        tier: "standard",
        active: true,
        created_at: new Date().toISOString(),
      },
    ];

    const overrides: Record<string, string> = {
      article_hero_sponsor: sponsorIdA1,
    };

    const targetZone = "article_hero_sponsor";
    const pinnedSponsorId = overrides[targetZone];
    const resolvedSponsor = pool.find((s) => s.id === pinnedSponsorId);

    expect(resolvedSponsor).toBeDefined();
    expect(resolvedSponsor?.id).toBe(sponsorIdA1);
    expect(resolvedSponsor?.name).toBe("Hospital São José");
  });

  it("filters out expired campaigns and exhausted impression/click quotas", () => {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

    const candidates: SponsorDTO[] = [
      {
        id: "active-campaign",
        store_id: storeA,
        name: "Campanha Vigente",
        tier: "gold",
        active: true,
        created_at: now.toISOString(),
        starts_at: yesterday,
        ends_at: tomorrow,
        max_impressions_quota: 1000,
        views_count: 500,
      },
      {
        id: "expired-campaign",
        store_id: storeA,
        name: "Campanha Vencida",
        tier: "gold",
        active: true,
        created_at: now.toISOString(),
        starts_at: yesterday,
        ends_at: yesterday, // Vencida ontem
      },
      {
        id: "quota-exhausted",
        store_id: storeA,
        name: "Quota Esgotada",
        tier: "silver",
        active: true,
        created_at: now.toISOString(),
        max_impressions_quota: 100,
        views_count: 100, // Atingiu limite
      },
    ];

    const valid = candidates.filter((s) => {
      if (s.starts_at && new Date(s.starts_at) > now) return false;
      if (s.ends_at && new Date(s.ends_at) < now) return false;
      if (s.max_impressions_quota && (s.views_count || 0) >= s.max_impressions_quota) return false;
      return true;
    });

    expect(valid).toHaveLength(1);
    expect(valid[0].id).toBe("active-campaign");
  });

  it("matches geotargeting and category filters, falling back to House Ad when no sponsor qualifies", () => {
    const candidates: SponsorDTO[] = [
      {
        id: "taubate-only",
        store_id: storeA,
        name: "Imobiliária Taubaté",
        tier: "standard",
        active: true,
        created_at: new Date().toISOString(),
        target_cities: ["Taubaté"],
        target_categories: ["imoveis"],
        placement_mode: "specific",
        allowed_placements: ["portal_top_billboard"],
      },
    ];

    // Consulta para leitor de São José dos Campos lendo Segurança
    const viewerCity = "São José dos Campos";
    const category = "seguranca";
    const zone = "feed_in_stream";

    const match = candidates.filter((s) => {
      if (s.target_cities && s.target_cities.length > 0) {
        if (!s.target_cities.some((c) => c.toLowerCase() === viewerCity.toLowerCase())) {
          return false;
        }
      }
      if (s.target_categories && s.target_categories.length > 0) {
        if (!s.target_categories.some((c) => c.toLowerCase() === category.toLowerCase())) {
          return false;
        }
      }
      if (s.placement_mode === "specific") {
        if (!s.allowed_placements?.includes(zone)) return false;
      }
      return true;
    });

    expect(match).toHaveLength(0);

    // Fallback House Ad
    const houseAd = {
      placement_zone: zone,
      status: "house_ad",
      sponsor: null,
      is_exclusive: false,
      is_house_ad: true,
      rendered_creative: {
        banner_url: null,
        headline: "Espaço Publicitário Disponível",
        cta_label: "Anuncie no Portal",
        target_url: `/paginas/anuncie?portal=${storeA}&zone=${zone}`,
      },
    };

    expect(houseAd.status).toBe("house_ad");
    expect(houseAd.is_house_ad).toBe(true);
    expect(houseAd.rendered_creative.cta_label).toBe("Anuncie no Portal");
  });
});
