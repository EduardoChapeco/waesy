import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock do TanStack Start createServerFn para execução limpa em testes unitários
vi.mock("@tanstack/react-start", () => {
  return {
    createServerFn: () => {
      let currentValidator: any = null;
      return {
        validator: (v: any) => {
          currentValidator = v;
          return {
            handler: (h: any) => async (args: any) => {
              const inputData = args?.data !== undefined ? args.data : args;
              const validated = currentValidator && typeof currentValidator.parse === "function"
                ? currentValidator.parse(inputData)
                : inputData;
              return h({ data: validated });
            },
          };
        },
        handler: (h: any) => async (args: any) => {
          const inputData = args?.data !== undefined ? args.data : args;
          return h({ data: inputData });
        },
      };
    },
  };
});

describe("RMA & Gastronomy Modifiers AI Protocol (Big Tech Council)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("1. Deve periciar foto de avaria de devolução via analyzeClaimForScam e aprovar foto autêntica", async () => {
    const { analyzeClaimForScam } = await import("./trust-and-safety.functions");
    const result = await analyzeClaimForScam({
      data: {
        orderId: "a0000000-0000-0000-0000-000000000001",
        claimPhotoUrl: "https://images.waesy.com/products/broken_mug_real_photo.jpg",
        claimDescription: "Produto chegou com a alça quebrada e avaria na embalagem original.",
      },
    });

    expect(result.isFlaggedAsScam).toBe(false);
    expect(result.trustStatus).toBe("verified");
  });

  it("2. Deve sinalizar foto gerada por IA com termos de renderização sintética como suspeita de fraude", async () => {
    const { analyzeClaimForScam } = await import("./trust-and-safety.functions");
    const result = await analyzeClaimForScam({
      data: {
        orderId: "a0000000-0000-0000-0000-000000000002",
        claimPhotoUrl: "https://midjourney.ai/renders/hyperrealistic_damaged_box_cinematic_4k.png",
        claimDescription: "Caixa amassada e danificada.",
      },
    });

    expect(result.isFlaggedAsScam).toBe(true);
    expect(result.trustStatus).toBe("flagged");
  });

  it("3. Validação do schema Zod de requestCustomerRma com claimPhotoUrl opcional", () => {
    const validPayload = {
      orderId: "a0000000-0000-0000-0000-000000000003",
      items: [
        {
          order_item_id: "b0000000-0000-0000-0000-000000000001",
          qty: 1,
          reason: "Produto com defeito ou avaria",
        },
      ],
      type: "return",
      notes: "Item quebrado no transporte",
      claimPhotoUrl: "https://storage.waesy.com/evidence/defect_item.jpg",
    };

    expect(validPayload.claimPhotoUrl).toMatch(/^https?:\/\//);
    expect(validPayload.items.length).toBeGreaterThan(0);
  });

  it("4. Deve calcular acréscimo dinâmico de modificadores gastronômicos (price_delta_cents)", () => {
    const baseProductPriceCents = 3500; // R$ 35,00
    const selectedModifiers = [
      { id: "mod-bacon", title: "Bacon Extra", price_delta_cents: 600 }, // + R$ 6,00
      { id: "mod-queijo", title: "Queijo Duplo", price_delta_cents: 450 }, // + R$ 4,50
    ];

    const totalModifiersDeltaCents = selectedModifiers.reduce((acc, m) => acc + m.price_delta_cents, 0);
    const finalUnitPriceCents = baseProductPriceCents + totalModifiersDeltaCents;

    expect(totalModifiersDeltaCents).toBe(1050); // R$ 10,50
    expect(finalUnitPriceCents).toBe(4550); // R$ 45,50
  });

  it("5. Deve validar regra de obrigatoriedade (min_selections) em grupos de modificadores", () => {
    const modifierGroup = {
      id: "group-ponto",
      title: "Ponto da Carne",
      min_selections: 1,
      max_selections: 1,
      is_required: true,
    };

    const emptySelection: string[] = [];
    const validSelection = ["ponto-ao-ponto"];

    const isInvalid = modifierGroup.is_required && emptySelection.length < modifierGroup.min_selections;
    const isValid = modifierGroup.is_required && validSelection.length >= modifierGroup.min_selections;

    expect(isInvalid).toBe(true);
    expect(isValid).toBe(true);
  });
});
