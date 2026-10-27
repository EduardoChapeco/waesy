import { describe, it, expect } from "vitest";
import {
  UpsertCommercialContactSchema,
  UpsertTravelInterestSchema,
  RecordCommercialInteractionSchema,
  PromoteOpportunityToCrmLeadSchema,
  BulkImportInterestsSchema,
} from "./travel-commercial-intelligence.functions";

describe("Travel Commercial Intelligence Schemas & Invariants", () => {
  it("valida criação de contato comercial pré-CRM com canal whatsapp", () => {
    const validContact = {
      name: "Mariana Souza",
      phone: "(49) 98877-6655",
      email: "mariana.souza@exemplo.com",
      city: "Chapecó",
      preferredChannel: "whatsapp" as const,
      status: "active" as const,
      notes: "Família com 2 crianças, planeja férias escolares",
    };

    const parsed = UpsertCommercialContactSchema.safeParse(validContact);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.name).toBe("Mariana Souza");
      expect(parsed.data.preferredChannel).toBe("whatsapp");
    }
  });

  it("rejeita contato com nome vazio ou telefone muito curto", () => {
    const invalidContact = {
      name: "M",
      phone: "123",
    };

    const parsed = UpsertCommercialContactSchema.safeParse(invalidContact);
    expect(parsed.success).toBe(false);
  });

  it("valida interesse de viagem com flexibilidade de mês e orçamento de parcela", () => {
    const validInterest = {
      contactId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      title: "Caribe em Família Julho 2026",
      destinations: ["Punta Cana", "Caribe", "Cancún"],
      destinationCategories: ["praia", "resort", "all_inclusive"],
      preferredOrigins: ["XAP", "FLN"],
      dates: {
        flexibility: "specific_month" as const,
        targetMonths: ["2026-07", "2026-08"],
        preferredSeason: "school_holidays" as const,
      },
      party: {
        adults: 2,
        children: 2,
        childrenAges: [6, 10],
        roomConfiguration: "family" as const,
      },
      budget: {
        maxTotalBudgetCents: 2500000,
        maxInstallmentCents: 150000,
        preferredInstallments: 12,
        priceBasisPreference: "per_family" as const,
      },
      inclusionsWanted: ["all_inclusive", "aereo_incluso", "transfer"],
      urgency: "moderate" as const,
    };

    const parsed = UpsertTravelInterestSchema.safeParse(validInterest);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.destinations).toHaveLength(3);
      expect(parsed.data.party.children).toBe(2);
      expect(parsed.data.budget.preferredInstallments).toBe(12);
    }
  });

  it("rejeita interesse sem nenhum destino", () => {
    const invalidInterest = {
      contactId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      title: "Viagem Indefinida",
      destinations: [],
      dates: { flexibility: "flexible_anytime" as const },
      party: { adults: 2, children: 0, childrenAges: [], roomConfiguration: "double" as const },
      budget: { priceBasisPreference: "per_person" as const },
    };

    const parsed = UpsertTravelInterestSchema.safeParse(invalidInterest);
    expect(parsed.success).toBe(false);
  });

  it("valida registro de interação e feedback do passageiro", () => {
    const validInteraction = {
      matchId: "b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b22",
      status: "approached" as const,
      approachNotes: "Enviado rascunho de WhatsApp com link da página pública",
      customerFeedback: "Adorou a opção mas pediu para ver saída por Florianópolis",
    };

    const parsed = RecordCommercialInteractionSchema.safeParse(validInteraction);
    expect(parsed.success).toBe(true);
  });

  it("valida payload de promoção consciente da oportunidade ao CRM", () => {
    const validPromotion = {
      matchId: "c2eebc99-9c0b-4ef8-bb6d-6bb9bd380c33",
      customEstimatedBudgetCents: 1850000,
      notes: "Cliente confirmou interesse, solicitou emissão formal e bloqueio aéreo.",
    };

    const parsed = PromoteOpportunityToCrmLeadSchema.safeParse(validPromotion);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.customEstimatedBudgetCents).toBe(1850000);
    }
  });

  it("valida importação em lote com múltiplos contatos e destinos", () => {
    const validBatch = {
      items: [
        {
          name: "Roberto Silveira",
          phone: "49999887766",
          destinations: ["Punta Cana", "Cancún"],
          targetMonth: "2026-07",
          maxInstallmentCents: 90000,
          adults: 2,
          children: 1,
          notes: "Prefere resort all inclusive com voo saindo de Chapecó",
        },
        {
          name: "Fernanda Costa",
          phone: "49988771122",
          destinations: ["Maceió", "Porto de Galinhas"],
          targetMonth: "2026-09",
          maxInstallmentCents: 65000,
          adults: 2,
          children: 0,
        },
      ],
    };

    const parsed = BulkImportInterestsSchema.safeParse(validBatch);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.items).toHaveLength(2);
      expect(parsed.data.items[0].destinations).toEqual(["Punta Cana", "Cancún"]);
      expect(parsed.data.items[1].maxInstallmentCents).toBe(65000);
    }
  });

  it("rejeita importação em lote com lista vazia ou telefone inválido", () => {
    const emptyBatch = { items: [] };
    expect(BulkImportInterestsSchema.safeParse(emptyBatch).success).toBe(false);

    const invalidPhoneBatch = {
      items: [
        {
          name: "João",
          phone: "123",
          destinations: ["Caribe"],
        },
      ],
    };
    expect(BulkImportInterestsSchema.safeParse(invalidPhoneBatch).success).toBe(false);
  });
});
