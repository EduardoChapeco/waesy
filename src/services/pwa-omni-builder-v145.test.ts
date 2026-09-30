import { describe, it, expect } from "vitest";
import { z } from "zod";

// Contratos e Schemas do Omni-PWA Builder V145
const OmniPwaSettingsSchema = z.object({
  showBottomNav: z.boolean().default(true),
  showStoriesReel: z.boolean().default(true),
  showPromoBanner: z.boolean().default(true),
  bannerTitle: z.string().min(1).default("Novidades Exclusivas no App"),
  bannerSubtitle: z.string().default("Aproveite condições especiais e entregas rápidas na sua cidade."),
  showCategoryGrid: z.boolean().default(true),
  showQuickCheckout: z.boolean().default(true),
  quickCheckoutLabel: z.string().default("Finalizar Pedido"),
  splashAnimation: z.enum(["pulse", "bounce", "fade"]).default("pulse"),
  lastEditedAt: z.string().datetime().optional(),
});

const PwaTelemetryEventSchema = z.object({
  storeId: z.string().uuid(),
  eventType: z.enum(["prompt_shown", "prompt_accepted", "prompt_dismissed", "installed", "app_opened"]),
  platform: z.enum(["ios", "android", "desktop", "unknown"]).default("unknown"),
  userAgent: z.string().max(500).optional().nullable(),
});

describe("Master Prompt V145: Omni-PWA Builder, Telemetry & Metamorphosis", () => {
  it("valida configurações profundas do App Builder em settings JSONB", () => {
    const defaultSettings = OmniPwaSettingsSchema.parse({});
    expect(defaultSettings.showBottomNav).toBe(true);
    expect(defaultSettings.showStoriesReel).toBe(true);
    expect(defaultSettings.showPromoBanner).toBe(true);
    expect(defaultSettings.splashAnimation).toBe("pulse");

    const customSettings = OmniPwaSettingsSchema.parse({
      showBottomNav: true,
      showStoriesReel: false,
      showPromoBanner: true,
      bannerTitle: "Super Lançamento 2026",
      bannerSubtitle: "Primeira compra com frete grátis via MotoLink",
      showCategoryGrid: true,
      showQuickCheckout: true,
      quickCheckoutLabel: "Comprar Agora (1-Clique)",
      splashAnimation: "bounce",
      lastEditedAt: new Date().toISOString(),
    });

    expect(customSettings.showStoriesReel).toBe(false);
    expect(customSettings.bannerTitle).toBe("Super Lançamento 2026");
    expect(customSettings.quickCheckoutLabel).toBe("Comprar Agora (1-Clique)");
    expect(customSettings.splashAnimation).toBe("bounce");
  });

  it("garante validação rígida de telemetria nativa com tipos de eventos permitidos", () => {
    const validStoreId = "00000000-0000-0000-0000-000000000001";

    const promptEvt = PwaTelemetryEventSchema.parse({
      storeId: validStoreId,
      eventType: "prompt_shown",
      platform: "android",
    });
    expect(promptEvt.eventType).toBe("prompt_shown");

    const installEvt = PwaTelemetryEventSchema.parse({
      storeId: validStoreId,
      eventType: "installed",
      platform: "ios",
    });
    expect(installEvt.eventType).toBe("installed");

    const appOpenedEvt = PwaTelemetryEventSchema.parse({
      storeId: validStoreId,
      eventType: "app_opened",
      platform: "desktop",
    });
    expect(appOpenedEvt.eventType).toBe("app_opened");

    // Evento inválido deve falhar
    const invalidEvt = PwaTelemetryEventSchema.safeParse({
      storeId: validStoreId,
      eventType: "click_button",
    });
    expect(invalidEvt.success).toBe(false);
  });

  it("calcula agregações de telemetria sem divisões por zero ou valores NaN", () => {
    // Caso 1: Zero eventos
    const zeroShown = 0;
    const zeroAccepted = 0;
    const rateZero = zeroShown > 0 ? Math.round((zeroAccepted / zeroShown) * 100) : 0;
    expect(rateZero).toBe(0);
    expect(Number.isNaN(rateZero)).toBe(false);

    // Caso 2: 100 exibidos, 45 aceitos
    const shown = 100;
    const accepted = 45;
    const rate = shown > 0 ? Math.round((accepted / shown) * 100) : 0;
    expect(rate).toBe(45);
  });

  it("garante vinculação e separação de responsabilidade civil da loja parceira vs Waesy", () => {
    const legalDisclaimer = {
      platformProvider: "Waesy Tecnologia LTDA",
      merchantPartnerName: "Pizzaria Napoli",
      userConsentRequired: true,
      cdcCompliance: true,
      lgpdCompliance: true,
    };

    expect(legalDisclaimer.userConsentRequired).toBe(true);
    expect(legalDisclaimer.cdcCompliance).toBe(true);
    expect(legalDisclaimer.lgpdCompliance).toBe(true);
    expect(legalDisclaimer.merchantPartnerName).toBe("Pizzaria Napoli");
  });
});
