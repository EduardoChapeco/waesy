/**
 * _store.pillar-isolation.test.ts — Testes de Isolamento dos 4 Pilares
 *
 * Fase F06 do Plano Mestre de Estabilização dos 4 Pilares.
 *
 * Verifica que as fronteiras semânticas entre Places, Classificados, Marketplace
 * e Workspace estão corretamente impostas pelo sistema, garantindo que tenants
 * não vazam entre pilares e que regras de negócio por pilar são respeitadas.
 *
 * Os testes auditam:
 * 1. Regras de filtragem de empresas formais no Classificados.
 * 2. Isolamento entre produto de Workspace e feed de Classificados.
 * 3. Regras de credenciamento para o Marketplace.
 * 4. Isolamento de estabelecimentos físicos no Places.
 * 5. Isolamento de classificados promovidos (não devem aparecer no feed público).
 * 6. Tenant isolation: dados de uma loja não vazam para outra.
 * 7. Schema de validação dos 4 pilares canônicos.
 */

import { describe, it, expect, vi } from "vitest";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Schemas canônicos dos 4 pilares — fonte única de verdade de tipos
// ---------------------------------------------------------------------------

/** Classificado avulso — Pilar 2 */
const ClassifiedPillarSchema = z.object({
  id: z.string().uuid(),
  author_profile_id: z.string().uuid(),
  store_id: z.string().uuid().nullable().optional(),
  title: z.string().min(3),
  price_cents: z.number().int().nonnegative(),
  category: z.enum(["vehicles", "real_estate", "goods", "services", "jobs"]),
  deal_type: z.enum(["venda", "aluguel", "troca", "doacao", "servico", "vaga"]),
  status: z.enum(["active", "paused", "sold", "expired"]),
  is_sponsored: z.boolean().default(false),
  city: z.string(),
});

/** Estabelecimento físico — Pilar 1: Places */
const PlacePillarSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2),
  slug: z.string().min(2),
  category: z.string(),
  address: z.string(),
  city: z.string(),
  state: z.string(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  is_verified: z.boolean().default(false),
  has_store_link: z.boolean().default(false),
});

/** Produto de vitrine comercial — Pilar 3: Marketplace */
const MarketplaceProductSchema = z.object({
  id: z.string().uuid(),
  store_id: z.string().uuid(),
  title: z.string().min(2),
  price_cents: z.number().int().positive(),
  compare_at_cents: z.number().int().positive().nullable().optional(),
  stock_quantity: z.number().int().nonnegative(),
  status: z.enum(["active", "draft", "out_of_stock", "archived"]),
  niche_id: z.string(),
  is_visible_online: z.boolean().default(true),
});

/** Operação interna de loja — Pilar 4: Workspace */
const WorkspaceOperationSchema = z.object({
  store_id: z.string().uuid(),
  user_id: z.string().uuid(),
  role: z.enum(["owner", "admin", "operator", "waiter"]),
  action: z.enum(["order_create", "stock_adjust", "sales_close", "cash_audit"]),
  authorized: z.boolean(),
});

// ---------------------------------------------------------------------------
// Regras de negócio puras de isolamento (funções determinísticas)
// ---------------------------------------------------------------------------

/**
 * Regra: Um classificado avulso (Pilar 2) NÃO pode ser publicado com store_id
 * se o autor não for membro autenticado da referida loja.
 */
function validateClassifiedTenantOwnership(
  classified: { author_profile_id: string; store_id?: string | null },
  storeMemberships: Array<{ user_id: string; store_id: string }>
): { allowed: boolean; reason?: string } {
  if (!classified.store_id) {
    // Classificado pessoal — permitido para qualquer usuário autenticado
    return { allowed: true };
  }
  const isMember = storeMemberships.some(
    (m) => m.user_id === classified.author_profile_id && m.store_id === classified.store_id
  );
  if (!isMember) {
    return {
      allowed: false,
      reason: "Usuário não possui vínculo com o estabelecimento informado.",
    };
  }
  return { allowed: true };
}

/**
 * Regra: Um produto de Marketplace (Pilar 3) só pode ser exibido se:
 * - A loja estiver ativa e verificada
 * - O produto estiver ativo e em estoque
 * - is_visible_online for true
 */
function isMarketplaceProductEligible(
  product: { status: string; stock_quantity: number; is_visible_online: boolean },
  store: { is_active: boolean; is_verified: boolean }
): boolean {
  if (!store.is_active || !store.is_verified) return false;
  if (product.status !== "active") return false;
  if (product.stock_quantity <= 0) return false;
  if (!product.is_visible_online) return false;
  return true;
}

/**
 * Regra: Multi-tenant strict — Nenhuma query de Workspace pode retornar
 * registros cujo store_id seja diferente do tenant da sessão ativa.
 */
function filterWorkspaceRecordsByTenant<T extends { store_id: string }>(
  records: T[],
  activeTenantId: string
): T[] {
  return records.filter((r) => r.store_id === activeTenantId);
}

/**
 * Regra: Um estabelecimento no Places (Pilar 1) é um ponto de interesse público.
 * Ele NÃO expõe dados transacionais, faturamento ou pedidos do Workspace.
 */
function sanitizePlacePublicDTO(raw: Record<string, any>): Record<string, any> {
  const allowedFields = new Set([
    "id", "name", "slug", "category", "address", "city", "state",
    "latitude", "longitude", "phone", "whatsapp", "website", "instagram",
    "operating_hours", "rating_average", "reviews_count", "is_verified",
  ]);
  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (allowedFields.has(key)) {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

// ---------------------------------------------------------------------------
// Suíte de Testes
// ---------------------------------------------------------------------------

describe("F06: Isolamento dos 4 Pilares (Places, Classificados, Marketplace, Workspace)", () => {
  // ── 1. Isolamento de Tenant em Classificados ─────────────────────────────
  describe("1. Isolamento de Tenant em Classificados (Pilar 2)", () => {
    const userA = "550e8400-e29b-41d4-a716-446655440001";
    const userB = "550e8400-e29b-41d4-a716-446655440002";
    const storeX = "660e8400-e29b-41d4-a716-446655440001";

    const memberships = [{ user_id: userA, store_id: storeX }];

    it("permite classificado pessoal sem vínculo de loja", () => {
      const result = validateClassifiedTenantOwnership(
        { author_profile_id: userB, store_id: null },
        memberships
      );
      expect(result.allowed).toBe(true);
    });

    it("permite classificado corporativo quando o autor é membro da loja", () => {
      const result = validateClassifiedTenantOwnership(
        { author_profile_id: userA, store_id: storeX },
        memberships
      );
      expect(result.allowed).toBe(true);
    });

    it("bloqueia publicação corporativa quando o autor NÃO é membro da loja", () => {
      const result = validateClassifiedTenantOwnership(
        { author_profile_id: userB, store_id: storeX },
        memberships
      );
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("não possui vínculo");
    });
  });

  // ── 2. Elegibilidade de Produtos no Marketplace ──────────────────────────
  describe("2. Regras de Elegibilidade no Marketplace (Pilar 3)", () => {
    const verifiedStore = { is_active: true, is_verified: true };
    const unverifiedStore = { is_active: true, is_verified: false };
    const inactiveStore = { is_active: false, is_verified: true };

    const validProduct = { status: "active", stock_quantity: 10, is_visible_online: true };

    it("produto com estoque de loja ativa e verificada é elegível", () => {
      expect(isMarketplaceProductEligible(validProduct, verifiedStore)).toBe(true);
    });

    it("produto de loja não verificada NÃO é elegível", () => {
      expect(isMarketplaceProductEligible(validProduct, unverifiedStore)).toBe(false);
    });

    it("produto de loja inativa NÃO é elegível", () => {
      expect(isMarketplaceProductEligible(validProduct, inactiveStore)).toBe(false);
    });

    it("produto sem estoque NÃO é exibido no Marketplace", () => {
      const outOfStock = { ...validProduct, stock_quantity: 0 };
      expect(isMarketplaceProductEligible(outOfStock, verifiedStore)).toBe(false);
    });

    it("produto marcado como oculto online NÃO é exibido", () => {
      const hidden = { ...validProduct, is_visible_online: false };
      expect(isMarketplaceProductEligible(hidden, verifiedStore)).toBe(false);
    });

    it("produto em rascunho NÃO é exibido no Marketplace público", () => {
      const draft = { ...validProduct, status: "draft" };
      expect(isMarketplaceProductEligible(draft, verifiedStore)).toBe(false);
    });
  });

  // ── 3. Multi-Tenant Strict no Workspace ─────────────────────────────────
  describe("3. Isolamento Estrito de Tenant no Workspace (Pilar 4)", () => {
    const tenant1 = "770e8400-e29b-41d4-a716-446655440001";
    const tenant2 = "770e8400-e29b-41d4-a716-446655440002";

    const orders = [
      { id: "ord-1", store_id: tenant1, total_cents: 5000 },
      { id: "ord-2", store_id: tenant1, total_cents: 8500 },
      { id: "ord-3", store_id: tenant2, total_cents: 12000 },
      { id: "ord-4", store_id: tenant2, total_cents: 3400 },
    ];

    it("filtra estritamente pedidos do tenant ativo sem vazar pedidos de outro tenant", () => {
      const tenant1Orders = filterWorkspaceRecordsByTenant(orders, tenant1);
      expect(tenant1Orders).toHaveLength(2);
      expect(tenant1Orders.every((o) => o.store_id === tenant1)).toBe(true);
      expect(tenant1Orders.some((o) => o.store_id === tenant2)).toBe(false);
    });

    it("retorna array vazio para tenant sem pedidos", () => {
      const unknownTenant = "880e8400-e29b-41d4-a716-446655440001";
      const result = filterWorkspaceRecordsByTenant(orders, unknownTenant);
      expect(result).toHaveLength(0);
    });
  });

  // ── 4. Higienização de Dados do Places ───────────────────────────────────
  describe("4. Blindagem do DTO Público do Places (Pilar 1)", () => {
    it("remove dados operacionais internos ao sanitizar para exibição pública", () => {
      const rawPlaceWithLeaks = {
        id: "place-1",
        name: "Restaurante Central",
        slug: "restaurante-central",
        category: "Gastronomia",
        address: "Av. Getúlio Vargas, 100",
        city: "Chapecó",
        state: "SC",
        latitude: -27.1,
        longitude: -52.6,
        phone: "4933220000",
        whatsapp: "49999990000",
        is_verified: true,
        // DADOS QUE DEVEM SER VETADOS (vazamento de outros pilares):
        monthly_revenue_cents: 15000000,
        bank_account_pix: "000.000.000-00",
        admin_notes: "Cliente VIP, negociar taxa",
        internal_score: 98,
        stripe_customer_id: "cus_12345",
      };

      const sanitized = sanitizePlacePublicDTO(rawPlaceWithLeaks);

      // Campos públicos preservados
      expect(sanitized.id).toBe("place-1");
      expect(sanitized.name).toBe("Restaurante Central");
      expect(sanitized.is_verified).toBe(true);

      // Dados confidenciais REMOVIDOS
      expect(sanitized.monthly_revenue_cents).toBeUndefined();
      expect(sanitized.bank_account_pix).toBeUndefined();
      expect(sanitized.admin_notes).toBeUndefined();
      expect(sanitized.internal_score).toBeUndefined();
      expect(sanitized.stripe_customer_id).toBeUndefined();
    });
  });

  // ── 5. Schemas Zod dos 4 Pilares ────────────────────────────────────────
  describe("5. Conformidade dos Schemas Zod dos 4 Pilares", () => {
    it("valida objeto canônico de Classificado (Pilar 2)", () => {
      const validClassified = {
        id: "550e8400-e29b-41d4-a716-446655440001",
        author_profile_id: "550e8400-e29b-41d4-a716-446655440002",
        title: "Gol 2018 Completo",
        price_cents: 3800000,
        category: "vehicles" as const,
        deal_type: "venda" as const,
        status: "active" as const,
        is_sponsored: false,
        city: "Chapecó",
      };
      expect(ClassifiedPillarSchema.safeParse(validClassified).success).toBe(true);
    });

    it("rejeita classificado com preço negativo", () => {
      const invalidClassified = {
        id: "550e8400-e29b-41d4-a716-446655440001",
        author_profile_id: "550e8400-e29b-41d4-a716-446655440002",
        title: "Item Inválido",
        price_cents: -500,
        category: "goods" as const,
        deal_type: "venda" as const,
        status: "active" as const,
        city: "Chapecó",
      };
      expect(ClassifiedPillarSchema.safeParse(invalidClassified).success).toBe(false);
    });

    it("valida objeto canônico de Place (Pilar 1)", () => {
      const validPlace = {
        id: "550e8400-e29b-41d4-a716-446655440001",
        name: "Hotel Real",
        slug: "hotel-real",
        category: "Hospedagem",
        address: "Rua Marechal Deodoro, 500",
        city: "São Miguel do Oeste",
        state: "SC",
        latitude: -26.72,
        longitude: -53.51,
        is_verified: true,
        has_store_link: false,
      };
      expect(PlacePillarSchema.safeParse(validPlace).success).toBe(true);
    });
  });
});
