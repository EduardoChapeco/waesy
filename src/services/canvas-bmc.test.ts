import { describe, it, expect } from "vitest";
import { storeBmcSchema, bmcBlockItemSchema } from "./canvas-bmc.functions";

describe("Business Model Canvas (BMC) & Strategic SWOT (BigTech Council)", () => {
  it("1. Valida item de BMC sem inventar confiança estatística", () => {
    const valid = bmcBlockItemSchema.safeParse({
      id: "item-1",
      text: "Fornecedores regionais de laticínios",
      evidence: "Contrato ativo de fornecimento",
      confidence: null,
    });
    expect(valid.success).toBe(true);

    const invalid = bmcBlockItemSchema.safeParse({
      id: "item-2",
      text: "",
    });
    expect(invalid.success).toBe(false);
    expect(bmcBlockItemSchema.safeParse({ id: "item-3", text: "Texto", confidence: 0.95 }).success).toBe(false);
  });

  it("2. Deve validar estrutura completa dos 9 blocos de Osterwalder", () => {
    const fullBmc = {
      key_partners: [{ id: "p1", text: "Produtores rurais locais" }],
      key_activities: [{ id: "a1", text: "Curadoria e atendimento consultivo" }],
      key_resources: [{ id: "r1", text: "Ponto físico central e PWA Waesy" }],
      value_propositions: [{ id: "v1", text: "Conveniência e produtos frescos no mesmo dia" }],
      customer_relationships: [{ id: "c1", text: "Atendimento humano direto via WhatsApp" }],
      channels: [{ id: "ch1", text: "Loja física e entrega via MotoLink" }],
      customer_segments: [{ id: "s1", text: "Famílias e residentes do bairro" }],
      cost_structure: [{ id: "cs1", text: "Custos de insumos e logística urbana" }],
      revenue_streams: [{ id: "rs1", text: "Vendas à vista, PIX e carnê digital" }],
      confidence: null,
      edited_by_human: true,
    };

    const parsed = storeBmcSchema.safeParse(fullBmc);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.key_partners.length).toBe(1);
      expect(parsed.data.value_propositions[0].text).toContain("Conveniência");
      expect(parsed.data.revenue_streams[0].text).toContain("PIX");
    }
  });

  it("3. Deve aplicar defaults vazios para blocos ausentes", () => {
    const partialBmc = {
      value_propositions: [{ id: "v1", text: "Atendimento diferenciado" }],
    };

    const parsed = storeBmcSchema.safeParse(partialBmc);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.key_partners).toEqual([]);
      expect(parsed.data.key_activities).toEqual([]);
      expect(parsed.data.channels).toEqual([]);
      expect(parsed.data.cost_structure).toEqual([]);
      expect(parsed.data.confidence).toBeUndefined();
      expect(parsed.data.edited_by_human).toBe(false);
    }
  });
});
