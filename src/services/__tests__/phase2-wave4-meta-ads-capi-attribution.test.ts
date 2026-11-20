import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  cleanAttributionObject,
  extractWhatsAppReferralAndTokens,
} from "@/services/omnichannel-attribution.server";
import { isMetaAdStatusDeactivated } from "@/services/meta-ads-sync.server";

describe("Phase 2 — Wave 4: Meta Ads 360 Sync, CAPI MQL/SQL & Omnichannel Attribution", () => {
  const rootDir = process.cwd();

  it("extracts CTWA referral signals from audioMessage, ephemeralMessage, and pre-normalized payloads without loss", () => {
    const ephemeralAudioPayload = {
      message: {
        ephemeralMessage: {
          message: {
            audioMessage: {
              contextInfo: {
                externalAdReply: {
                  ctwa_clid: "ctwa_audio_123",
                  source_id: "238500001111",
                  source_type: "ad",
                  headline: "Pacote Gramado Inverno 2027",
                  body: "Saídas de Chapecó com aéreo ou terrestre",
                  thumbnailUrl: "https://cdn.waesy.com.br/ad-gramado.jpg",
                },
              },
            },
          },
        },
      },
    };

    const extracted = extractWhatsAppReferralAndTokens(ephemeralAudioPayload, "Oi, vi o anúncio!");
    expect(extracted).not.toBeNull();
    expect(extracted?.ctwa_clid).toBe("ctwa_audio_123");
    expect(extracted?.ad_id).toBe("238500001111");
    expect(extracted?.ad_headline).toBe("Pacote Gramado Inverno 2027");
    expect(extracted?.ad_body).toBe("Saídas de Chapecó com aéreo ou terrestre");
    expect(extracted?.ad_media_url).toBe("https://cdn.waesy.com.br/ad-gramado.jpg");

    // Pre-normalized double-parse resilience
    const doubleParsed = extractWhatsAppReferralAndTokens(extracted as any, "Oi!");
    expect(doubleParsed?.ad_headline).toBe("Pacote Gramado Inverno 2027");
    expect(doubleParsed?.ctwa_clid).toBe("ctwa_audio_123");
  });

  it("preserves campaign_name, ad_name, adset_name, source_pixel_id, and ad_effective_status in cleanAttributionObject", () => {
    const cleaned = cleanAttributionObject({
      platform: "meta_ads",
      campaign_id: "camp_1",
      campaign_name: "Campanha Julho Serra Gaúcha",
      adset_id: "adset_1",
      adset_name: "Público Famílias SC",
      ad_id: "ad_1",
      ad_name: "Vídeo Natal Luz",
      source_pixel_id: "00000000-0000-4000-8000-000000000099",
      ad_effective_status: "PAUSED",
      ad_headline: "Natal Luz 12x",
    });

    expect((cleaned as any).campaign_name).toBe("Campanha Julho Serra Gaúcha");
    expect((cleaned as any).ad_name).toBe("Vídeo Natal Luz");
    expect((cleaned as any).adset_name).toBe("Público Famílias SC");
    expect((cleaned as any).source_pixel_id).toBe("00000000-0000-4000-8000-000000000099");
    expect((cleaned as any).ad_effective_status).toBe("PAUSED");
  });

  it("correctly identifies deactivated Meta Ad statuses for lead profile stamping", () => {
    expect(isMetaAdStatusDeactivated("PAUSED")).toBe(true);
    expect(isMetaAdStatusDeactivated("CAMPAIGN_PAUSED")).toBe(true);
    expect(isMetaAdStatusDeactivated("ADSET_PAUSED")).toBe(true);
    expect(isMetaAdStatusDeactivated("ARCHIVED")).toBe(true);
    expect(isMetaAdStatusDeactivated("DISAPPROVED")).toBe(true);
    expect(isMetaAdStatusDeactivated("ACTIVE")).toBe(false);
  });

  it("verifies digits-only CAPI phone hashing, MQL/SQL qualification tiers, and StoreAnalyticsInjector on /f/$slug and /paginas/$slug", () => {
    const pixelsSrc = fs.readFileSync(path.join(rootDir, "src/services/pixels.functions.ts"), "utf8");
    const formRouteSrc = fs.readFileSync(path.join(rootDir, "src/routes/_store.f.$slug.tsx"), "utf8");
    const pageRouteSrc = fs.readFileSync(path.join(rootDir, "src/routes/_store.paginas.$slug.tsx"), "utf8");
    const metaWebhookSrc = fs.readFileSync(path.join(rootDir, "src/routes/api.webhooks.meta-ads.ts"), "utf8");

    expect(pixelsSrc).toContain("return `55${national}`;");
    expect(pixelsSrc).not.toContain("return `+55${national}`;");
    expect(pixelsSrc).toContain("qualification_tier: qualificationTier");
    expect(pixelsSrc).toContain('"qualify_lead"');
    expect(pixelsSrc).toContain("clientId: data.deviceId || data.leadId || undefined");

    expect(formRouteSrc).toContain("<StoreAnalyticsInjector");
    expect(pageRouteSrc).toContain("<StoreAnalyticsInjector");
    expect(metaWebhookSrc).toContain("external_ad_id.eq.");
  });
});
