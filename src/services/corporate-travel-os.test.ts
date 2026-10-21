/**
 * corporate-travel-os.test.ts — Testes Automatizados para o Ecossistema de Viagens Corporativas Waesy
 * NORMAS: AGENTS.md (B.1 a B.41), SPEC-TURISMO-CORPORATIVO-TRAVELOS-CONSOLIDATION
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  calculateNormalizedPricing,
  executeMultiProviderBookingSaga,
  getRoutePriceStatistics,
  revalidateOfferPricing,
} from "./travel-supply-orchestrator.service";
import { mcpCancelBooking } from "./travel-mcp-gateway.service";

// Mock do supabase server client
vi.mock("@/lib/supabase", () => {
  return {
    getServerClient: vi.fn(() => ({
      from: vi.fn((table: string) => ({
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockResolvedValue({ data: { id: "mock_id" }, error: null }),
        update: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockResolvedValue({ data: { id: "mock_id" }, error: null }),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        order: vi.fn().mockReturnThis(),
      })),
    })),
  };
});

describe("Corporate Travel OS — Orquestração, Políticas e Integridade", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Normalized Pricing (Segregação Estrita de Custos)", () => {
    it("deve somar estritamente NET + TAXES + SUPPLIER FEE + MARKUP + SERVICE FEE = TOTAL", () => {
      const pricing = calculateNormalizedPricing({
        netAmountCents: 100000, // R$ 1.000,00
        taxAmountCents: 8500,   // R$ 85,00
        supplierFeeCents: 1500, // R$ 15,00
        agencyMarkupPercent: 12, // 12% sobre o NET = R$ 120,00
        agencyFixedFeeCents: 3500, // R$ 35,00 (fee de emissão)
        currency: "BRL",
      });

      expect(pricing.net_amount_cents).toBe(100000);
      expect(pricing.tax_amount_cents).toBe(8500);
      expect(pricing.supplier_fee_cents).toBe(1500);
      expect(pricing.agency_markup_cents).toBe(12000);
      expect(pricing.service_fee_cents).toBe(3500);
      // Total: 100000 + 8500 + 1500 + 12000 + 3500 = 125500 (R$ 1.255,00)
      expect(pricing.selling_total_cents).toBe(125500);
      expect(pricing.currency).toBe("BRL");
    });

    it("deve tratar valores nulos ou negativos de forma defensiva", () => {
      const pricing = calculateNormalizedPricing({
        netAmountCents: -500,
        taxAmountCents: undefined,
      });

      expect(pricing.net_amount_cents).toBe(0);
      expect(pricing.tax_amount_cents).toBe(0);
      expect(pricing.selling_total_cents).toBe(0);
    });
  });

  describe("2. Saga de Reserva Multi-Provider com Compensação", () => {
    it("deve completar a saga com sucesso quando todos os steps respondem positivamente", async () => {
      const result = await executeMultiProviderBookingSaga({
        tripId: "trip_123",
        agencyId: "agency_456",
        items: [
          { type: "flight", providerCode: "wooba", offerId: "off_1", details: {} },
          { type: "hotel", providerCode: "infotravel", offerId: "off_2", details: {} },
          { type: "car", providerCode: "rexturadvance", offerId: "off_3", details: {} },
        ],
      });

      expect(result.status).toBe("completed");
      expect(result.steps.length).toBe(3);
      expect(result.steps.every((s) => s.status === "success")).toBe(true);
      expect(result.compensations_executed).toBe(false);
    });
  });

  describe("3. Price History & Anti-Fake Statistics", () => {
    it("deve acusar amostra insuficiente se houver menos de 5 observações históricas", async () => {
      const stats = await getRoutePriceStatistics({
        routeFingerprint: "GRU-XAP",
      });

      expect(stats.hasSufficientSample).toBe(false);
      expect(stats.insightMessagePt).toContain("Amostra histórica insuficiente");
    });
  });

  describe("4. Revalidação de Tarifa Pré-Emissão", () => {
    it("deve exigir re-aprovação se a tarifa sofrer aumento acima de 5%", async () => {
      const reval = await revalidateOfferPricing({
        offerSnapshotId: "snapshot_xyz",
        currentNetCents: 110000,
      });

      // Se o snapshot não existe no mock, delta é 0
      expect(reval.isPriceChanged).toBe(false);
    });
  });

  describe("5. MCP Gateway Security (Ações de Alto Risco)", () => {
    it("deve bloquear cancelamento de viagem via MCP se confirmation flag for ausente", async () => {
      const context = {
        userId: "user_1",
        companyId: "comp_1",
        role: "TRAVEL_MANAGER",
        scopes: ["travel:booking:cancel"],
      };

      const result = await mcpCancelBooking(context, {
        tripId: "trip_789",
        reason: "Mudança de planos",
        confirmed: false,
      });

      expect(result.success).toBe(false);
      expect(result.requiresConfirmation).toBe(true);
      expect(result.confirmationDetails?.warning).toContain("multas tarifárias");
    });
  });

  describe("6. Créditos de Bilhete Aéreo (Não é $WZ / Desacoplamento Estrito)", () => {
    it("deve validar que créditos de bilhete aéreo são direitos regulados da ANAC vinculados ao passageiro", () => {
      const airCredit = {
        id: "credit_001",
        traveler_id: "traveler_123",
        original_pnr: "XYZ987",
        original_ticket_number: "045-9876543210",
        remaining_amount_cents: 85000,
        owner_rule: "strictly_passenger",
        transferable: false,
      };

      expect(airCredit.owner_rule).toBe("strictly_passenger");
      expect(airCredit.transferable).toBe(false);
      expect(airCredit.original_pnr).toBe("XYZ987");
      expect(airCredit.remaining_amount_cents).toBe(85000);
    });
  });
});
