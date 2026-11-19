import { describe, expect, it } from "vitest";
import {
  aspectPresetToCssValue,
  buildDefaultWebPageConfig,
  normalizeEntityMediaList,
  normalizeTransfersList,
  resolveHeroSlotAspectPreset,
} from "./proposal-normalization";
import {
  buildGreatCircleArc,
  buildSvgProjectionForRoute,
  extractFlightRouteChains,
  FLIGHT_ROUTE_DISCLAIMER,
  resolveFlightRouteModel,
} from "./flight-route-geometry";
import {
  buildInstallmentTable,
  computeRealCountdownState,
  resolveProposalCommercialOffer,
} from "./proposal-payment-calc";
import { getContrastRatio, resolveWebShowcaseTheme } from "./proposal-theme-palettes";
import { computeSmartPdfPageSlices } from "../pdf-export";

describe("Proposal Web & Studio E2E Contracts (EARS-01 .. EARS-07)", () => {
  describe("EARS-03: Aspect Ratios, Crop Coordinates & Layout Slots", () => {
    it("returns undefined for 'auto' and 'free' so natural proportions are preserved without forced 4/3 cropping", () => {
      expect(aspectPresetToCssValue("auto")).toBeUndefined();
      expect(aspectPresetToCssValue("free")).toBeUndefined();
      expect(aspectPresetToCssValue("16:9")).toBe("16 / 9");
      expect(aspectPresetToCssValue("4:3")).toBe("4 / 3");
      expect(aspectPresetToCssValue("1:1")).toBe("1 / 1");
      expect(aspectPresetToCssValue("4:5")).toBe("4 / 5");
      expect(aspectPresetToCssValue("9:16")).toBe("9 / 16");
      expect(aspectPresetToCssValue("21:9")).toBe("21 / 9");
    });

    it("resolves slot-matched aspect ratios for all 6 hero_layout modes", () => {
      expect(resolveHeroSlotAspectPreset("immersive", 0).preset).toBe("21:9");
      expect(resolveHeroSlotAspectPreset("gallery_mosaic_3", 0)).toMatchObject({
        preset: "16:9",
        slotRole: "hero_primary",
      });
      expect(resolveHeroSlotAspectPreset("gallery_mosaic_3", 1).preset).toBe("4:3");
      expect(resolveHeroSlotAspectPreset("gallery_bento_4", 0).preset).toBe("4:3");
      expect(resolveHeroSlotAspectPreset("gallery_bento_4", 2).preset).toBe("1:1");
      expect(resolveHeroSlotAspectPreset("minimal", 0).preset).toBe("4:3");
    });

    it("preserves extended crop pixels, image_scale and video_poster_url in normalizeEntityMediaList", () => {
      const normalized = normalizeEntityMediaList({
        media: [
          {
            id: "hero-1",
            url: "https://cdn.waesy.com/hero.jpg",
            type: "image",
            aspectPreset: "16:9",
            crop_x: 120,
            crop_y: 45,
            crop_width: 1280,
            crop_height: 720,
            image_scale: 1.4,
            slot_role: "hero_primary",
          },
          {
            id: "vid-1",
            url: "https://cdn.waesy.com/promo.mp4",
            type: "video",
            aspectPreset: "9:16",
            video_poster_url: "https://cdn.waesy.com/poster.jpg",
            objectPosition: "50% 15%",
          },
        ],
      });

      expect(normalized[0]).toMatchObject({
        crop_x: 120,
        crop_y: 45,
        crop_width: 1280,
        crop_height: 720,
        image_scale: 1.4,
        slot_role: "hero_primary",
      });
      expect(normalized[1]).toMatchObject({
        type: "video",
        video_poster_url: "https://cdn.waesy.com/poster.jpg",
        posterUrl: "https://cdn.waesy.com/poster.jpg",
        objectPosition: "50% 15%",
      });
    });
  });

  describe("EARS-02: Geodesic Flight Route Map & Automatic Layovers", () => {
    it("extracts automatic connection chains and resolves coordinates combining DB airports + curated hubs", () => {
      const chains = extractFlightRouteChains([
        {
          type: "outbound",
          origin_iata: "XAP",
          connection_airports: ["GRU", "LIM"],
          destination_iata: "CUN",
        },
        {
          type: "return",
          origin_iata: "CUN",
          connection_airports: ["PTY"],
          destination_iata: "XAP",
        },
      ]);

      expect(chains[0]).toEqual({
        direction: "ida",
        chain: ["XAP", "GRU", "LIM", "CUN"],
        layoverIatas: ["GRU", "LIM"],
      });
      expect(chains[1]).toEqual({
        direction: "volta",
        chain: ["CUN", "PTY", "XAP"],
        layoverIatas: ["PTY"],
      });

      const model = resolveFlightRouteModel([
        { type: "outbound", origin_iata: "XAP", connection_airports: ["GRU"], destination_iata: "BPS" },
        { type: "return", origin_iata: "BPS", connection_airports: ["VCP"], destination_iata: "XAP" },
      ]);

      expect(model.unresolvedIatas).toEqual([]);
      expect(model.stops.map((s) => `${s.iata}:${s.role}`)).toEqual([
        "XAP:origin",
        "GRU:layover",
        "BPS:destination",
        "VCP:layover",
      ]);
      expect(model.legs.length).toBe(4);
      const proj = buildSvgProjectionForRoute(model);
      expect(proj.paths).toHaveLength(4);
      expect(proj.stops).toHaveLength(4);
      expect(FLIGHT_ROUTE_DISCLAIMER).toContain("Rotas ilustrativas");
    });

    it("merges unknown DB airport coordinates cleanly and flags missing codes without crashing", () => {
      const arc = buildGreatCircleArc({ lat: -27.13, lng: -52.65 }, { lat: -23.43, lng: -46.47 }, 10);
      expect(arc).toHaveLength(11);

      const resolved = resolveFlightRouteModel(
        [{ type: "outbound", origin_iata: "XAP", connection_airports: ["TST"], destination_iata: "ZZZ" }],
        [{ iata_code: "TST", city: "TesteHub", name: "Teste Airport", latitude: -15.5, longitude: -48.1 }],
      );

      expect(resolved.stops.map((s) => s.iata)).toEqual(["XAP", "TST"]);
      expect(resolved.unresolvedIatas).toEqual(["ZZZ"]);
    });
  });

  describe("EARS-04: Commercial Offer, Real Countdown (Zero Fake), Availability & WCAG Accent", () => {
    it("hides countdown when disabled, invalid, or in the past, and ticks accurately when valid future date", () => {
      const now = Date.parse("2027-06-01T12:00:00.000Z");

      expect(
        computeRealCountdownState({ enabled: false, mode: "proposal_valid_until" }, "2027-06-03T12:00:00.000Z", now).isActive,
      ).toBe(false);
      expect(
        computeRealCountdownState({ enabled: true, mode: "proposal_valid_until" }, "2027-05-30T12:00:00.000Z", now).isExpired,
      ).toBe(true);
      expect(
        computeRealCountdownState({ enabled: true, mode: "custom", custom_ends_at: "not-a-date" }, null, now).isActive,
      ).toBe(false);

      const active = computeRealCountdownState(
        { enabled: true, mode: "custom", custom_ends_at: "2027-06-03T15:30:45.000Z", label: "Expira em" },
        null,
        now,
      );
      expect(active.isActive).toBe(true);
      expect(active.days).toBe(2);
      expect(active.hours).toBe(3);
      expect(active.minutes).toBe(30);
      expect(active.seconds).toBe(45);
      expect(active.label).toBe("Expira em");
    });

    it("computes PIX discount, 1x..Nx installment table, optional seats and checked-only trust badges", () => {
      const offer = resolveProposalCommercialOffer({
        totalCents: 1000000,
        validUntil: "2027-06-05T12:00:00.000Z",
        countdownConfig: { enabled: true, mode: "proposal_valid_until" },
        availabilityConfig: { enabled: true, spots_remaining: 3 },
        paymentDisplayConfig: {
          show_pix: true,
          pix_discount_percent: 5,
          show_card: true,
          max_installments: 10,
          interest_free: true,
          show_boleto: true,
          boleto_due_days: 7,
          show_financing: false,
          show_installment_simulator: true,
        },
        trustBadgesConfig: {
          agency_verified: true,
          cadastur_badge: true,
          support_24h: false,
          free_rebooking: false,
          secure_payment: false,
        },
        nowMs: Date.parse("2027-06-01T12:00:00.000Z"),
      });

      expect(offer.pixFinalCents).toBe(950000);
      expect(offer.installmentTable).toHaveLength(10);
      expect(offer.installmentTable[9].installmentCents).toBe(100000);
      expect(offer.spotsRemaining).toBe(3);
      expect(offer.countdown.isActive).toBe(true);
      expect(offer.trustBadges.map((t) => t.id)).toEqual(["agency_verified", "cadastur_badge"]);

      const tableOnly = buildInstallmentTable(500000, 5, true);
      expect(tableOnly).toHaveLength(5);
    });

    it("enforces WCAG 2.2 AA (>= 4.5:1) readable accent color on both dark and light web themes", () => {
      const darkTheme = resolveWebShowcaseTheme("dark", "#7C3AED");
      expect(darkTheme.isDark).toBe(true);
      expect(getContrastRatio(darkTheme.accentReadable, darkTheme.surfaceBg)).toBeGreaterThanOrEqual(4.5);

      const lightTheme = resolveWebShowcaseTheme("boutique", "#FACC15");
      expect(lightTheme.isDark).toBe(false);
      expect(getContrastRatio(lightTheme.accentReadable, lightTheme.surfaceBg)).toBeGreaterThanOrEqual(4.5);
    });
  });

  describe("EARS-05: Chronological Transfer Ordering", () => {
    it("sorts mixed-order transfers strictly chronologically by date, pickup_time, and travel stage", () => {
      const sorted = normalizeTransfersList([
        { id: "ret", route_name: "Transfer Hotel / Aeroporto (Saída)", date: "2027-08-10", pickup_time: "15:00", kind: "departure" },
        { id: "city", route_name: "Transfer Intermunicipal Jeri", date: "2027-08-05", pickup_time: "09:00", kind: "intercity" },
        { id: "arr-late", route_name: "Transfer Receptivo Tarde", date: "2027-08-03", pickup_time: "18:30", kind: "arrival" },
        { id: "arr-early", route_name: "Transfer Chegada Aeroporto (In)", date: "2027-08-03", pickup_time: "08:00", kind: "arrival" },
      ]);

      expect(sorted.map((t) => t.id)).toEqual(["arr-early", "arr-late", "city", "ret"]);
      expect(sorted.map((t) => t.sequence_number)).toEqual([1, 2, 3, 4]);
    });
  });

  describe("EARS-06: Smart Non-Splitting Multi-Page PDF Slices & Web Defaults", () => {
    it("snaps continuous page slices before break-inside-avoid blocks crossing page boundary", () => {
      const slices = computeSmartPdfPageSlices(2800, 1120, [
        { top: 40, bottom: 520 },
        { top: 540, bottom: 1260 }, // crosses 1120px boundary!
        { top: 1280, bottom: 2050 },
        { top: 2080, bottom: 2760 },
      ]);

      expect(slices[0]).toEqual({ startY: 0, endY: 540, height: 540 });
      expect(slices[1].startY).toBe(540);
      expect(slices[slices.length - 1].endY).toBe(2800);
    });

    it("hydrates default web config with extended commercial defaults", () => {
      const def = buildDefaultWebPageConfig({ id: "prop-x", title: "Paris Premium" });
      expect(def.show_flight_route_map).toBe(true);
      expect(def.countdown_config?.enabled).toBe(false);
      expect(def.payment_display_config?.show_installment_simulator).toBe(true);
    });
  });
});
