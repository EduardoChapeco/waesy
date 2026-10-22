import { describe, it, expect } from "vitest";
import {
  SaveContractTemplateSchema,
  ContractClauseSchema,
} from "./travel-contract.functions";

describe("Travel Contract Templates & Clauses Customization (BFF)", () => {
  it("valida contrato de cláusula de viagem com numeração e seção", () => {
    const clause = {
      number: 1,
      section: "DA COMISSÃO DE ASSESSORIA DA AGÊNCIA",
      clause_text:
        "Os honorários de assessoria turística e intermediação representam 30% do valor total contratado e consideram-se integralmente cumpridos com a entrega dos vouchers e confirmação da viagem.",
      is_mandatory: true,
    };

    const parsed = ContractClauseSchema.parse(clause);
    expect(parsed.number).toBe(1);
    expect(parsed.section).toContain("ASSESSORIA");
    expect(parsed.is_mandatory).toBe(true);
  });

  it("valida contrato de template completo da agência", () => {
    const templateInput = {
      title: "Contrato Premium Internacional 2026",
      description: "Template para pacotes internacionais com seguro viagem obrigatório",
      isDefault: true,
      clauses: [
        {
          number: 1,
          section: "DO OBJETO",
          clause_text: "Intermediação de serviços de turismo para Europa e Estados Unidos.",
          is_mandatory: true,
        },
        {
          number: 2,
          section: "DAS MULTAS DE CANCELAMENTO",
          clause_text:
            "A comissão de 30% da agência é retida a título de serviços prestados, somando-se à taxa de reembolso de operadora.",
          is_mandatory: true,
        },
      ],
    };

    const parsed = SaveContractTemplateSchema.parse(templateInput);
    expect(parsed.title).toBe("Contrato Premium Internacional 2026");
    expect(parsed.isDefault).toBe(true);
    expect(parsed.clauses.length).toBe(2);
  });

  it("rejeita template sem cláusulas", () => {
    expect(() =>
      SaveContractTemplateSchema.parse({
        title: "Template Vazio",
        clauses: [],
      })
    ).toThrow();
  });
});
