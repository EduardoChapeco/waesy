import { describe, expect, it } from "vitest";
import {
  buildGfmMarkdownTable,
  compileContractDocument,
} from "./contract-compiler";
import { splitMarkdownAndTables } from "@/components/contracts/contract-markdown-renderer";
import { interpolateContractVariables } from "./contract-semantic-dictionary";

describe("Compilador Multi-Nicho de Contratos Tabulares (Markdown GFM)", () => {
  it("gera tabela GFM alinhada e sanitiza pipes e quebras de linha em celulas", () => {
    const md = buildGfmMarkdownTable(
      ["Item", "Observacao", "Valor"],
      [
        ["Pacote\nGramado", "Aereo | Hotel 4*", "R$ 3.450,00"],
        ["Passeio", null, "Incluso"],
      ],
      ["left", "center", "right"],
    );

    const lines = md.split("\n");
    expect(lines).toHaveLength(4);
    expect(lines[0]).toBe("| Item | Observacao | Valor |");
    expect(lines[1]).toBe("| :--- | :---: | ---: |");
    expect(lines[2]).toBe("| Pacote Gramado | Aereo / Hotel 4* | R$ 3.450,00 |");
    expect(lines[3]).toBe("| Passeio | — | Incluso |");
  });

  it("retorna string vazia quando cabecalhos ou linhas estiverem vazios", () => {
    expect(buildGfmMarkdownTable([], [["a"]])).toBe("");
    expect(buildGfmMarkdownTable(["Col"], [])).toBe("");
  });

  it("compila contrato de Turismo completo com todas as tabelas GFM e variaveis {{custom.*}}", () => {
    const compiled = compileContractDocument({
      title: "Contrato Pacote Nordeste 2027",
      nicheHint: "tourism",
      issuer: {
        name: "Excelencia Tour SMO",
        document: "12345678000199",
        cityState: "Sao Miguel do Oeste / SC",
        phone: "49999990000",
        email: "atendimento@excelenciatour.com",
      },
      customer: {
        name: "Maria Clara Oliveira",
        document: "12345678909",
        phone: "49988887777",
        email: "maria@exemplo.com",
      },
      items: [
        {
          title: "Pacote Porto de Galinhas 5 Noites",
          unit: "pax",
          quantity: 2,
          unitPriceCents: 250000,
          totalPriceCents: 500000,
        },
      ],
      specs: [
        { label: "Destino", value: "Porto de Galinhas / PE" },
        { label: "Regime", value: "All Inclusive" },
      ],
      itinerary: [
        { day: 1, title: "Chegada ao Recife e Transfer", description: "Recepcao no aeroporto e check-in." },
        { day: 2, title: "Praia dos Carneiros", description: "Passeio de catamara.", meals: "Cafe da manha" },
      ],
      passengers: [
        { name: "Maria Clara Oliveira", document: "12345678909", boardingPoint: "Rodoviaria SMO" },
        { name: "Joao Oliveira", document: "98765432100", boardingPoint: "Rodoviaria SMO" },
      ],
      installments: [
        { installmentNumber: "1/2", dueDate: "2027-02-01", amountCents: 250000, method: "PIX" },
        { installmentNumber: "2/2", dueDate: "2027-03-01", amountCents: 250000, method: "PIX" },
      ],
      customFields: {
        boarding_point: "Rodoviaria SMO",
        restricao_alimentar: "Sem lactose",
        quarterao_preferencia: "Quarto casal andar alto",
      },
      totalValueCents: 500000,
      paymentConditions: "2x sem juros no PIX",
      travelStartDate: "2027-04-10",
      travelEndDate: "2027-04-15",
      destination: "Porto de Galinhas / PE",
    });

    expect(compiled.nicheId).toBe("tourism");
    expect(compiled.templateIdUsed).toBe("template-turismo-pacote-viagem");
    expect(compiled.contentMarkdown).toContain("| Parte |");
    expect(compiled.contentMarkdown).toContain("Pacote Porto de Galinhas 5 Noites");
    expect(compiled.contentMarkdown).toContain("| Dia 1 |");
    expect(compiled.contentMarkdown).toContain("Maria Clara Oliveira");
    expect(compiled.contentMarkdown).toContain("Rodoviaria SMO");
    expect(compiled.contentMarkdown).toContain("Sem lactose");
    expect(compiled.tables.installmentsTable).toContain("1/2");
    expect(compiled.clauses.length).toBeGreaterThan(0);
    expect(compiled.contentMarkdown).not.toMatch(/\{\{[^}]+\}\}/);

    const blocks = splitMarkdownAndTables(compiled.contentMarkdown);
    const tableBlocks = blocks.filter((b) => b.type === "table");
    expect(tableBlocks.length).toBeGreaterThanOrEqual(4);
  });

  it("compila contrato Automotivo mapeando placa, chassi e campos customizados", () => {
    const compiled = compileContractDocument({
      title: "Compra e Venda Honda Civic 2022",
      nicheHint: "automotive",
      issuer: { name: "Garagem Premium Motors", document: "98765432000188" },
      customer: { name: "Carlos Eduardo Silva", document: "11122233344" },
      items: [
        {
          title: "Honda Civic EXL 2.0 2022",
          sku: "CIVIC-2022-PRATA",
          unit: "veiculo",
          quantity: 1,
          unitPriceCents: 11800000,
          totalPriceCents: 11800000,
        },
      ],
      customFields: {
        marca: "Honda",
        modelo: "Civic EXL 2.0",
        ano: "2022",
        placa: "ABC1D23",
        quilometragem: "42.000 km",
      },
      totalValueCents: 11800000,
      paymentConditions: "TED a vista na entrega das chaves",
    });

    expect(compiled.nicheId).toBe("automotive");
    expect(compiled.templateIdUsed).toBe("template-compra-venda-veiculo");
    expect(compiled.variablesApplied.veiculo_marca_modelo).toContain("Honda Civic EXL 2.0");
    expect(compiled.variablesApplied.veiculo_dados).toContain("ABC1D23");
    expect(compiled.variablesApplied.veiculo_placa).toBe("ABC1D23");
    expect(compiled.variablesApplied.quilometragem_atual).toBe("42.000 km");
    expect(compiled.contentMarkdown).toContain("ABC1D23");
    expect(compiled.contentMarkdown).toContain("42.000 km");
    expect(compiled.contentMarkdown).not.toMatch(/\{\{[^}]+\}\}/);
  });

  it("omiti tabelas desativadas via sectionConfig (teste negativo de personalizacao)", () => {
    const compiled = compileContractDocument({
      title: "Contrato Servico Enxuto",
      nicheHint: "services",
      sectionConfig: {
        showItemsTable: false,
        showSpecsTable: false,
        showCustomFieldsTable: false,
        showFinancialTable: false,
        includeLegalClauses: false,
      },
      customer: { name: "Empresa Alpha LTDA" },
      items: [{ title: "Consultoria SEO", unit: "mes", quantity: 1, unitPriceCents: 300000, totalPriceCents: 300000 }],
      customFields: { canal_preferido: "Slack" },
      totalValueCents: 300000,
    });

    expect(compiled.contentMarkdown).not.toContain("Consultoria SEO");
    expect(compiled.contentMarkdown).not.toContain("Slack");
    expect(compiled.clauses).toHaveLength(0);
  });

  it("interpola chaves {{custom.*}} com metacaracteres de regex sem quebrar", () => {
    const text = "Campo especial: {{custom.obs+cliente[1]}} e normal: {{nome_cliente}}.";
    const rendered = interpolateContractVariables(text, {
      "custom.obs+cliente[1]": "Prioridade VIP",
      nome_cliente: "Ana Paula",
    });
    expect(rendered).toBe("Campo especial: Prioridade VIP e normal: Ana Paula.");
  });

  it("splitMarkdownAndTables ignora linhas com pipe sem linha separadora GFM", () => {
    const blocks = splitMarkdownAndTables("Texto | com | pipe solto\n\n| A | B |\n| :--- | :--- |\n| 1 | 2 |");
    expect(blocks).toHaveLength(2);
    expect(blocks[0]?.type).toBe("markdown");
    expect(blocks[1]?.type).toBe("table");
    if (blocks[1]?.type === "table") {
      expect(blocks[1].headers).toEqual(["A", "B"]);
      expect(blocks[1].rows).toEqual([["1", "2"]]);
    }
  });

  it("faz fallback seguro para template do nicho quando templateId for desconhecido e sanitiza objetos aninhados em customFields", () => {
    const compiled = compileContractDocument({
      title: "Contrato Servico Juridico",
      nicheHint: "legal",
      templateId: "template-inexistente-legado",
      issuer: { name: "Silva & Associados Advocacia" },
      customer: { name: "Industria Beta S/A", document: "55444333000122" },
      items: [{ title: "Assessoria Societaria Mensal", quantity: 1, unitPriceCents: 650000, totalPriceCents: 650000 }],
      customFields: {
        comarca_foro: "Florianopolis | SC",
        objeto_detalhado: { regime: "Contencioso", urgente: true } as any,
        vazio: null,
      },
      totalValueCents: 650000,
    });

    expect(compiled.templateIdUsed).not.toBe("template-inexistente-legado");
    expect(compiled.contentMarkdown).toContain("Industria Beta S/A");
    expect(compiled.contentMarkdown).toContain("Florianopolis / SC");
    expect(compiled.contentMarkdown).not.toContain("[object Object]");
    expect(compiled.contentMarkdown).not.toMatch(/\{\{[^}]+\}\}/);
  });
});
