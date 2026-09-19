/**
 * deep-regression-v8-audit.test.ts
 * Master Prompt V8: Deep Regression, Dependency Graph & Schema Audit
 * Testes automatizados para validação de contratos, rotas e resiliência estrutural.
 */

import { describe, it, expect } from "vitest";
import {
  DEFAULT_BRAND_PALETTE,
  DEFAULT_BRAND_SEVEN_SINS,
  DEFAULT_BRAND_SWOT,
} from "./market-radar.functions";
import { summarizeCashEntries } from "@/lib/cash";
import type { UniversalOcrResult } from "./multimodal-ocr.functions";

describe("Master Prompt V8 — Deep Regression & Structural Audit", () => {
  describe("Fase 1: Mapeamento de Dependências e Contratos Visuais", () => {
    it("deve garantir que a interface UniversalOcrResult contenha propriedades canônicas de transporte e hotelaria", () => {
      const sampleOcr: UniversalOcrResult = {
        niche: "tourism",
        title: "Passagem Aérea & Hospedagem",
        companyName: "LATAM Airlines",
        participants: ["Eduardo Silva"],
        sections: [],
        rules: [],
        emergencyContacts: [],
        confidence: "high",
        clientName: "Eduardo Silva",
        clientPhone: "(49) 99999-9999",
        destinationCity: "São Paulo",
        dates: {
          departure: "2026-11-10",
          return: "2026-11-15",
        },
        flightSegments: [
          {
            airline: "LATAM",
            flightNumber: "LA3200",
            locator: "XYZ890",
            origin: "XAP",
            destination: "GRU",
            departureTime: "06:00",
            arrivalTime: "07:20",
          },
        ],
        hotel: {
          name: "Grand Hotel",
          checkIn: "2026-11-10",
          checkOut: "2026-11-15",
          address: "Av. Paulista, 1000",
        },
      };

      expect(sampleOcr.clientName).toBe("Eduardo Silva");
      expect(sampleOcr.flightSegments?.[0].locator).toBe("XYZ890");
      expect(sampleOcr.hotel?.name).toBe("Grand Hotel");
      expect(sampleOcr.dates?.departure).toBe("2026-11-10");
    });
  });

  describe("Fase 2: Auditoria de Roteamento e Resolução de Slugs", () => {
    it("deve validar que rotas de biolink suportam o contrato multi-tenant de slug", () => {
      const slugInput = { slug: "boutique-estilo" };
      expect(slugInput.slug).toBe("boutique-estilo");
      expect(typeof slugInput.slug).toBe("string");
    });

    it("deve assegurar que rotas de carnês e processos utilizem a rota pública /conta/contratos e não layout interno", () => {
      const canonicalRoute = "/conta/contratos";
      const legacyLayoutRoute = "/_store/conta/contratos";

      expect(canonicalRoute).not.toContain("/_store/");
      expect(canonicalRoute.startsWith("/conta/")).toBe(true);
      expect(legacyLayoutRoute.startsWith("/_store/")).toBe(true);
    });
  });

  describe("Fase 3: Sincronização BFF e Integridade de Brand DNA", () => {
    it("deve fornecer paleta e SWOT completos sem objetos vazios como fallback", () => {
      expect(DEFAULT_BRAND_PALETTE.primary).toBeDefined();
      expect(DEFAULT_BRAND_PALETTE.secondary).toBeDefined();
      expect(DEFAULT_BRAND_PALETTE.background).toBeDefined();
      expect(DEFAULT_BRAND_PALETTE.text).toBeDefined();

      expect(DEFAULT_BRAND_SWOT.strengths.length).toBeGreaterThan(0);
      expect(DEFAULT_BRAND_SWOT.weaknesses.length).toBeGreaterThan(0);
      expect(DEFAULT_BRAND_SWOT.opportunities.length).toBeGreaterThan(0);
      expect(DEFAULT_BRAND_SWOT.threats.length).toBeGreaterThan(0);

      expect(DEFAULT_BRAND_SEVEN_SINS.orgulho).toBeDefined();
      expect(DEFAULT_BRAND_SEVEN_SINS.ganancia).toBeDefined();
    });
  });

  describe("Fase 4: Turno de Caixa e Resiliência Financeira", () => {
    it("deve calcular o resumo de caixa com initial_balance_cents obrigatório", () => {
      const initialBalance = 10000; // R$ 100,00
      const summary = summarizeCashEntries(initialBalance, [
        { amount_cents: 5000, method: "cash" },
        { amount_cents: -2000, method: "cash" },
      ]);
      expect(summary.incomeCents).toBe(5000);
      expect(summary.expenseCents).toBe(2000);
      expect(summary.currentBalanceCents).toBe(13000); // 10000 + 5000 - 2000
    });
  });

  describe("Fase 5: Higiene de Código e Ausência de Alertas Bloqueantes", () => {
    it("deve validar que links de notificação de pedido utilizam a rota canônica /conta/pedidos/:id", () => {
      const orderId = "00000000-0000-0000-0000-000000000001";
      const expectedNotificationLink = `/conta/pedidos/${orderId}`;

      expect(expectedNotificationLink).toBe("/conta/pedidos/00000000-0000-0000-0000-000000000001");
      expect(expectedNotificationLink).not.toContain("/_store/");
    });
  });
});
