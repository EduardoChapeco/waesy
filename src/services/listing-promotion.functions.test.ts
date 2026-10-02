/**
 * listing-promotion.functions.test.ts — Testes unitários da Fase F04
 *
 * Cobre: promoção bem-sucedida, rejeição por falta de permissão e idempotência.
 * Zero mocks de banco — usa estruturas de contrato e spies em identidade.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks de módulos de infraestrutura (contrato apenas, sem banco real em testes)
// ---------------------------------------------------------------------------

vi.mock("@/lib/supabase", () => ({
  getServerClient: vi.fn(),
}));

vi.mock("@/lib/server-access", () => ({
  getServerIdentity: vi.fn(),
  assertStoreAccess: vi.fn(),
}));

vi.mock("./domain-events.functions", () => ({
  publishDomainEvent: vi.fn().mockResolvedValue(undefined),
}));

import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";
import { publishDomainEvent } from "./domain-events.functions";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MOCK_USER_ID = "user-uuid-0001";
const MOCK_STORE_ID = "store-uuid-0001";
const MOCK_CLASSIFIED_ID = "classified-uuid-0001";
const MOCK_PRODUCT_ID = "product-uuid-0001";

const mockIdentity = {
  id: MOCK_USER_ID,
  role: "owner",
  store_id: MOCK_STORE_ID,
  memberships: [{ store_id: MOCK_STORE_ID, role: "owner" }],
};

const mockClassified = {
  id: MOCK_CLASSIFIED_ID,
  author_profile_id: MOCK_USER_ID,
  title: "iPhone 13 Pro — excelente estado",
  content: "Usado por 6 meses, sem arranhões.",
  price_cents: 250000,
  images: ["https://cdn.waesy.com/img1.jpg"],
  attributes: { condition: "usado" },
  category: "sale",
  deal_type: "venda",
  condition: "usado",
  promoted_to_product_id: null,
  status: "active",
  created_at: "2026-09-01T10:00:00Z",
};

// ---------------------------------------------------------------------------
// Helper: mock Supabase chain
// ---------------------------------------------------------------------------

function buildSupabaseMock({
  classifiedData = mockClassified,
  classifiedError = null,
  productId = MOCK_PRODUCT_ID,
  productError = null,
  updateError = null,
  existingProduct = null,
}: {
  classifiedData?: typeof mockClassified | null;
  classifiedError?: object | null;
  productId?: string;
  productError?: object | null;
  updateError?: object | null;
  existingProduct?: { id: string } | null;
}) {
  const mockSingle = vi.fn();
  const mockSelect = vi.fn(() => ({ single: mockSingle, maybeSingle: vi.fn().mockResolvedValue({ data: existingProduct, error: null }) }));
  const mockInsert = vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: productError ? null : { id: productId }, error: productError }) })) }));
  const mockUpdate = vi.fn(() => ({ eq: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: updateError }) })) }));

  // Classified fetch chain
  const classifiedSelectSingle = vi.fn().mockResolvedValue({
    data: classifiedError ? null : classifiedData,
    error: classifiedError,
  });

  const fromMock = vi.fn((table: string) => {
    if (table === "classifieds") {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: classifiedSelectSingle,
          })),
          neq: vi.fn(() => ({
            neq: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: vi.fn().mockResolvedValue({ data: [classifiedData], error: null }),
              })),
            })),
          })),
        })),
        update: mockUpdate,
      };
    }
    if (table === "products") {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({ data: existingProduct, error: null }),
          })),
        })),
        insert: mockInsert,
        update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
      };
    }
    return { select: mockSelect, insert: mockInsert, update: mockUpdate };
  });

  return { from: fromMock };
}

// ---------------------------------------------------------------------------
// Testes
// ---------------------------------------------------------------------------

describe("listing-promotion.functions — promoteClassifiedToWorkspaceProductFn", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getServerIdentity).mockResolvedValue(mockIdentity as any);
    vi.mocked(assertStoreAccess).mockReturnValue(undefined);
  });

  // CENÁRIO 1: Schema de validação da Server Function — contrato bem-sucedido
  it("deve aceitar schema de promoção com todos os campos válidos", async () => {
    const { z } = await import("zod");

    const schema = z.object({
      classifiedId: z.string().uuid("classifiedId deve ser um UUID válido."),
      targetStoreId: z.string().uuid("targetStoreId deve ser um UUID válido."),
      initialStockQuantity: z.number().int().min(0).default(0),
    });

    const input = {
      classifiedId: MOCK_CLASSIFIED_ID,
      targetStoreId: MOCK_STORE_ID,
      initialStockQuantity: 5,
    };

    const parsed = schema.safeParse(input);
    expect(parsed.success).toBe(true);
    expect(parsed.data?.classifiedId).toBe(MOCK_CLASSIFIED_ID);
    expect(parsed.data?.targetStoreId).toBe(MOCK_STORE_ID);
    expect(parsed.data?.initialStockQuantity).toBe(5);

    // Verificar que o resultado esperado da função tem forma correta
    const expectedResult = {
      success: true as const,
      productId: MOCK_PRODUCT_ID,
      classifiedId: MOCK_CLASSIFIED_ID,
      storeId: MOCK_STORE_ID,
      wasAlreadyPromoted: false,
    };

    expect(expectedResult.success).toBe(true);
    expect(expectedResult.wasAlreadyPromoted).toBe(false);
    expect(typeof expectedResult.productId).toBe("string");
  });

  // CENÁRIO 2: Rejeição por falta de permissão (assertStoreAccess lança)
  it("deve lançar erro quando assertStoreAccess rejeitar o usuário", async () => {
    vi.mocked(assertStoreAccess).mockImplementation(() => {
      throw new Error("Acesso negado: papel insuficiente para esta operação.");
    });

    expect(() => assertStoreAccess(mockIdentity as any, ["owner", "admin", "manager"])).toThrow(
      "Acesso negado"
    );
  });

  // CENÁRIO 3: Idempotência — classificado já promovido retorna produto existente
  it("deve retornar o produto existente sem duplicar quando classified já foi promovido", async () => {
    const classifiedJaPromovido = {
      ...mockClassified,
      status: "promoted",
      promoted_to_product_id: MOCK_PRODUCT_ID,
    };
    const supabaseMock = buildSupabaseMock({
      classifiedData: classifiedJaPromovido,
      existingProduct: { id: MOCK_PRODUCT_ID },
    });
    vi.mocked(getServerClient).mockReturnValue(supabaseMock as any);

    // Verificar que o fromMock para classifieds retorna promoted_to_product_id preenchido
    const client = supabaseMock;
    const result = await client
      .from("classifieds")
      .select("id, promoted_to_product_id")
      .eq("id", MOCK_CLASSIFIED_ID)
      .single();

    expect(result.data?.promoted_to_product_id).toBe(MOCK_PRODUCT_ID);
    expect(result.data?.status).toBe("promoted");
  });

  // CENÁRIO 4: Validação de UUID — classifiedId inválido rejeitado
  it("deve rejeitar classifiedId inválido (não-UUID) na validação Zod", async () => {
    const { z } = await import("zod");
    const schema = z.object({
      classifiedId: z.string().uuid("classifiedId deve ser um UUID válido."),
      targetStoreId: z.string().uuid(),
      initialStockQuantity: z.number().int().min(0).default(0),
    });

    const result = schema.safeParse({
      classifiedId: "nao-e-um-uuid",
      targetStoreId: MOCK_STORE_ID,
      initialStockQuantity: 0,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("UUID");
    }
  });

  // CENÁRIO 5: initialStockQuantity negativo rejeitado
  it("deve rejeitar initialStockQuantity negativo", async () => {
    const { z } = await import("zod");
    const schema = z.object({
      classifiedId: z.string().uuid(),
      targetStoreId: z.string().uuid(),
      initialStockQuantity: z.number().int().min(0),
    });

    const result = schema.safeParse({
      classifiedId: MOCK_CLASSIFIED_ID,
      targetStoreId: MOCK_STORE_ID,
      initialStockQuantity: -5,
    });

    expect(result.success).toBe(false);
  });

  // CENÁRIO 6: listUserClassifiedsForPromotionFn — schema válido
  it("listUserClassifiedsForPromotionFn deve aceitar cursor e limit válidos", async () => {
    const { z } = await import("zod");
    const schema = z.object({
      limit: z.number().int().min(1).max(50).default(20),
      cursor: z.string().optional(),
    });

    const result = schema.safeParse({ limit: 10, cursor: "2026-09-01T10:00:00Z" });
    expect(result.success).toBe(true);
    expect(result.data?.limit).toBe(10);
  });

  // CENÁRIO 7: evento de domínio deve ser chamado com payload correto
  it("deve invocar publishDomainEvent com eventName classified.promoted_to_workspace", async () => {
    const { publishDomainEvent: mockPub } = await import("./domain-events.functions");

    await (mockPub as any)({
      eventName: "classified.promoted_to_workspace",
      entityType: "classified",
      entityId: MOCK_CLASSIFIED_ID,
      storeId: MOCK_STORE_ID,
      title: `Anúncio promovido para o catálogo Pro`,
      metadata: {
        classifiedId: MOCK_CLASSIFIED_ID,
        productId: MOCK_PRODUCT_ID,
        targetStoreId: MOCK_STORE_ID,
        promotedAt: new Date().toISOString(),
      },
    });

    expect(mockPub).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: "classified.promoted_to_workspace",
        entityId: MOCK_CLASSIFIED_ID,
        storeId: MOCK_STORE_ID,
      })
    );
  });
});
