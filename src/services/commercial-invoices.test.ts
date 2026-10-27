import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock @tanstack/react-start
vi.mock("@tanstack/react-start", () => ({
  createServerFn: vi.fn(() => {
    const fnBuilder: any = {
      validator: vi.fn((validatorFn: any) => {
        fnBuilder._validator = validatorFn;
        return fnBuilder;
      }),
      handler: vi.fn((handlerFn: any) => {
        const callable = async (args: any) => {
          let data = args?.data;
          if (fnBuilder._validator && data !== undefined) {
            data = typeof fnBuilder._validator === "function"
              ? fnBuilder._validator(data)
              : fnBuilder._validator.parse(data);
          }
          return handlerFn({ data });
        };
        callable.handler = handlerFn;
        return callable;
      }),
    };
    return fnBuilder;
  }),
}));

// Mock Supabase Server Client
const mockSingle = vi.fn();
const mockMaybeSingle = vi.fn();

const createQueryBuilder = () => {
  const builder: any = {
    select: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    update: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    range: vi.fn(() => Promise.resolve({ data: [], error: null, count: 0 })),
    single: mockSingle,
    maybeSingle: mockMaybeSingle,
  };
  return builder;
};

const mockRpc = vi.fn();

vi.mock("@/lib/supabase", () => ({
  getServerClient: () => {
    const builder = createQueryBuilder();
    return {
      from: vi.fn(() => builder),
      rpc: mockRpc,
    };
  },
  getAnonServerClient: () => {
    const builder = createQueryBuilder();
    return {
      from: vi.fn(() => builder),
    };
  },
}));

vi.mock("@/lib/server-access", () => ({
  requireStaff: vi.fn(() =>
    Promise.resolve({
      id: "usr-staff-1",
      store_id: "11111111-2222-3333-4444-555555555555",
      role: "owner",
    }),
  ),
  getServerIdentity: vi.fn(() =>
    Promise.resolve({
      id: "usr-staff-1",
      store_id: "11111111-2222-3333-4444-555555555555",
    }),
  ),
}));

import {
  getNextInvoiceSequence,
  getStoreCommercialPaymentConfig,
  createCommercialInvoice,
  convertInvoiceToContract,
} from "./commercial-invoices.functions";

describe("Motor Canônico de Faturas Comerciais & Bloco de Orçamento (Waesy Enterprise)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Geração de Numeração Sequencial Contínua", () => {
    it("deve invocar RPC e formatar código contínuo #ORC-AAAA-XXXX", async () => {
      mockRpc.mockResolvedValueOnce({
        data: [{ next_seq: 42, next_code: "#ORC-2026-0042" }],
        error: null,
      });

      const res = await getNextInvoiceSequence({
        data: {
          documentType: "budget",
          storeId: "11111111-2222-3333-4444-555555555555",
        },
      });

      expect(res.nextSeq).toBe(42);
      expect(res.nextCode).toBe("#ORC-2026-0042");
    });

    it("deve gerar prefixo FAT para faturas comerciais", async () => {
      mockRpc.mockResolvedValueOnce({
        data: [{ next_seq: 1, next_code: "#FAT-2026-0001" }],
        error: null,
      });

      const res = await getNextInvoiceSequence({
        data: {
          documentType: "invoice",
          storeId: "11111111-2222-3333-4444-555555555555",
        },
      });

      expect(res.nextCode).toContain("FAT");
    });
  });

  describe("2. Criação de Fatura / Bloco de Orçamento com Snapshots", () => {
    it("deve persistir orçamento com itens, valores em centavos e snapshots imutáveis", async () => {
      mockMaybeSingle.mockResolvedValueOnce({
        data: {
          id: "11111111-2222-3333-4444-555555555555",
          name: "Marcenaria Artesanal Waesy",
          cnpj: "12.345.678/0001-90",
          phone: "(49) 98888-7777",
          email: "contato@marcenaria.com",
          city: "Chapecó",
          state: "SC",
        },
        error: null,
      });

      mockRpc.mockResolvedValueOnce({
        data: [{ next_seq: 15, next_code: "#ORC-2026-0015" }],
        error: null,
      });

      mockSingle.mockResolvedValueOnce({
        data: {
          id: "inv-uuid-1",
          invoice_code: "#ORC-2026-0015",
          sequential_number: 15,
          status: "draft",
          total_cents: 250000,
          public_token: "tok_test_abcdef1234567890",
        },
        error: null,
      });

      const res = await createCommercialInvoice({
        data: {
          storeId: "11111111-2222-3333-4444-555555555555",
          documentType: "budget",
          customer: {
            name: "Carlos Alberto",
            cpfOrCnpj: "123.456.789-00",
            phone: "(49) 99111-2222",
            cityState: "Chapecó - SC",
          },
          items: [
            {
              title: "Mesa de Jantar Madeira Maciça 2.20m",
              unit: "un",
              quantity: 1,
              unitPriceCents: 250000,
              discountCents: 0,
              totalPriceCents: 250000,
            },
          ],
          subtotalCents: 250000,
          discountCents: 0,
          shippingCents: 0,
          totalCents: 250000,
          paymentTerms: {
            method: "pix",
            installmentsCount: 1,
            installmentValueCents: 250000,
            notes: "50% de entrada no ato + 50% na entrega",
            pixKey: "12.345.678/0001-90",
          },
          validUntil: "2026-11-05",
        },
      });

      expect(res.success).toBe(true);
      expect(res.invoice.invoice_code).toBe("#ORC-2026-0015");
      expect(res.invoice.total_cents).toBe(250000);
    });
  });

  describe("3. Conversão de Orçamento em Contrato Digital (Ponte 1 Clique)", () => {
    it("deve transferir itens, dados do cliente e gerar contrato versionado no banco", async () => {
      // 1. Mock do SELECT da fatura comercial
      mockSingle.mockResolvedValueOnce({
        data: {
          id: "inv-uuid-1",
          store_id: "11111111-2222-3333-4444-555555555555",
          invoice_code: "#ORC-2026-0015",
          customer_snapshot: {
            name: "Carlos Alberto",
            cpfOrCnpj: "123.456.789-00",
            address: "Rua das Palmeiras, 100",
            phone: "(49) 99111-2222",
            email: "carlos@email.com",
          },
          issuer_snapshot: {
            companyName: "Marcenaria Artesanal Waesy",
            cnpjOrCpf: "12.345.678/0001-90",
            address: "Av. Fernando Machado, 500",
            cityState: "Chapecó - SC",
          },
          items: [
            {
              title: "Mesa de Jantar Madeira Maciça 2.20m",
              unit: "un",
              quantity: 1,
              unitPriceCents: 250000,
              totalPriceCents: 250000,
            },
          ],
          total_cents: 250000,
          payment_terms: {
            method: "pix",
            notes: "50% de entrada + 50% na entrega",
          },
          valid_until: "2026-11-05",
        },
        error: null,
      });

      // 2. Mock do INSERT em contracts
      mockSingle.mockResolvedValueOnce({
        data: {
          id: "contract-uuid-1",
          title: "Contrato Comercial · Ref: #ORC-2026-0015",
          category: "service_agreement",
          status: "draft",
        },
        error: null,
      });

      // 3. Mock do INSERT em contract_versions
      mockSingle.mockResolvedValueOnce({
        data: {
          id: "version-uuid-1",
          contract_id: "contract-uuid-1",
          version_number: 1,
        },
        error: null,
      });

      const res = await convertInvoiceToContract({
        data: {
          invoiceId: "11111111-2222-3333-4444-555555555555",
          templateId: "template-prestacao-servicos",
        },
      });

      expect(res.success).toBe(true);
      expect(res.contractId).toBe("contract-uuid-1");
      expect(res.versionId).toBe("version-uuid-1");
      expect(res.invoiceCode).toBe("#ORC-2026-0015");
    });

    it("should load store payment configuration and methods from SSOT", async () => {
      const validStoreUuid = "550e8400-e29b-41d4-a716-446655440000";

      // Mock do retorno da loja com settings de pagamento e chave Pix
      mockMaybeSingle.mockResolvedValueOnce({
        data: {
          id: validStoreUuid,
          name: "Marcenaria Artesanal Chapecó",
          cnpj: "12.345.678/0001-99",
          phone: "49988776655",
          pix_key: "financeiro@marcenaria.com.br",
          payment_instructions: "Pagamento imediato via chave Pix oficial.",
          settings: {
            payment_settings: {
              pix_discount_percentage: 5,
              max_installments: 10,
              interest_free_installments: 3,
            },
          },
        },
        error: null,
      });

      const config = await getStoreCommercialPaymentConfig({
        data: { storeId: validStoreUuid },
      });

      expect(config.storeId).toBe(validStoreUuid);
      expect(config.pixKey).toBe("financeiro@marcenaria.com.br");
      expect(config.pixDiscountPercentage).toBe(5);
      expect(config.maxInstallments).toBe(10);
      expect(config.interestFreeInstallments).toBe(3);
      expect(config.availableMethods.length).toBeGreaterThan(0);
      expect(config.availableMethods.some((m) => m.type === "pix")).toBe(true);
      expect(config.availableMethods.some((m) => m.type === "cartao")).toBe(true);
    });
  });
});
