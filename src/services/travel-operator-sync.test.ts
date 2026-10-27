import { describe, it, expect } from "vitest";
import {
  IntegrationInputSchema,
  ListTravelOperatorSyncRunsSchema,
  SyncTravelDocumentSchema,
  IngestOperatorSyncBatchSchema,
} from "./travel-operator-sync.functions";

describe("Travel Operator Sync Contracts (BFF) & Invariante B.25", () => {
  describe("IntegrationInputSchema — Parâmetros Presentes e Ausentes", () => {
    it("valida contrato com parâmetros obrigatórios mínimos e aplica defaults seguros", () => {
      const minimal = IntegrationInputSchema.parse({
        providerCode: "cvc",
        displayName: "CVC Viagens Chapecó",
      });

      expect(minimal.providerCode).toBe("cvc");
      expect(minimal.displayName).toBe("CVC Viagens Chapecó");
      expect(minimal.supplierId).toBeUndefined();
      expect(minimal.capabilities).toEqual({});
      expect(minimal.config).toEqual({});
      expect(minimal.status).toBe("active");
    });

    it("valida contrato completo com todos os parâmetros presentes", () => {
      const full = IntegrationInputSchema.parse({
        providerCode: "azul_viagens",
        displayName: "Azul Viagens Matriz",
        supplierId: "55555555-5555-4555-a555-555555555555",
        capabilities: { canSyncPackages: true, canExtractVouchers: true },
        config: { api_endpoint: "https://api.azulviagens.com.br" },
        status: "paused",
      });

      expect(full.providerCode).toBe("azul_viagens");
      expect(full.supplierId).toBe("55555555-5555-4555-a555-555555555555");
      expect(full.capabilities).toEqual({ canSyncPackages: true, canExtractVouchers: true });
      expect(full.config).toEqual({ api_endpoint: "https://api.azulviagens.com.br" });
      expect(full.status).toBe("paused");
    });

    it("rejeita nomes de operadora muito curtos ou em branco", () => {
      expect(() =>
        IntegrationInputSchema.parse({
          providerCode: "cvc",
          displayName: " ",
        }),
      ).toThrow();
    });

    it("rejeita código de operadora desconhecido", () => {
      expect(() =>
        IntegrationInputSchema.parse({
          providerCode: "operadora_inexistente_xyz",
          displayName: "Operadora Teste",
        }),
      ).toThrow();
    });
  });

  describe("ListTravelOperatorSyncRunsSchema — Parâmetros e Filtros", () => {
    it("aplica defaults defensivos quando chamado sem argumentos ou objeto vazio", () => {
      const parsedEmpty = ListTravelOperatorSyncRunsSchema.parse({});
      expect(parsedEmpty.status).toBeUndefined();
      expect(parsedEmpty.limit).toBe(100);

      const parsedUndefined = ListTravelOperatorSyncRunsSchema.parse(undefined);
      expect(parsedUndefined.status).toBeUndefined();
      expect(parsedUndefined.limit).toBe(100);
    });

    it("aceita parâmetros de status e limite customizados dentro do teto seguro (200)", () => {
      const parsed = ListTravelOperatorSyncRunsSchema.parse({
        status: "ready",
        limit: 50,
      });
      expect(parsed.status).toBe("ready");
      expect(parsed.limit).toBe(50);
    });

    it("rejeita limites inválidos (fora do intervalo 1-200)", () => {
      expect(() => ListTravelOperatorSyncRunsSchema.parse({ limit: 0 })).toThrow();
      expect(() => ListTravelOperatorSyncRunsSchema.parse({ limit: 201 })).toThrow();
    });
  });

  describe("SyncTravelDocumentSchema — Integridade de UUID", () => {
    it("aceita ingestionId como UUID válido", () => {
      const valid = SyncTravelDocumentSchema.safeParse({
        ingestionId: "66666666-6666-4666-a666-666666666666",
      });
      expect(valid.success).toBe(true);
    });

    it("rejeita ingestionId vazio ou string arbitrária que não seja UUID", () => {
      const invalid = SyncTravelDocumentSchema.safeParse({
        ingestionId: "ingestion-abc-123",
      });
      expect(invalid.success).toBe(false);
    });
  });

  describe("IngestOperatorSyncBatchSchema — Ingestão de Lote da Extensão e Coletor", () => {
    it("valida payload de lote contendo reservas, passageiros e metadados de pagamento", () => {
      const batch = IngestOperatorSyncBatchSchema.parse({
        operatorCode: "orinter",
        items: [
          {
            id: "13567890",
            status: "Confirmada",
            criacao: "20/10/2026",
            valorTotal: "4.500,00",
            taxas: "150,00",
            comissao: "450,00",
            contato: "Carlos Eduardo da Silva",
            email: "carlos@exemplo.com.br",
            telefone: "(49) 99999-8888",
            hotel: "Mabu Thermas Grand Resort",
            acomodacao: "Master Duplo",
            formaPagto: "Boleto Faturado",
            statusPagto: "Aprovado",
            scoreConfianca: 95,
            bancoEmissor: "Itaú Unibanco",
            parcelamento: "10x",
            passageiros: [
              {
                nome: "Carlos Eduardo da Silva",
                tipo: "ADT",
                birthDate: "15/05/1982",
                cpf: "12345678901",
                titular: true,
              },
              {
                nome: "Mariana da Silva",
                tipo: "ADT",
                birthDate: "20/08/1985",
                cpf: "98765432100",
                titular: false,
              },
            ],
          },
        ],
      });

      expect(batch.operatorCode).toBe("orinter");
      expect(batch.items.length).toBe(1);
      expect(batch.items[0].passageiros.length).toBe(2);
      expect(batch.items[0].scoreConfianca).toBe(95);
      expect(batch.items[0].bancoEmissor).toBe("Itaú Unibanco");
    });
  });
});

