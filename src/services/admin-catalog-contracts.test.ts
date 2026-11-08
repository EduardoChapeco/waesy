import { describe, it, expect, vi } from "vitest";
import { z } from "zod";
import { getNicheSemantics } from "@/lib/niche-semantics";
import { getNicheCatalogContext } from "@/lib/catalog-niche-context";
import { resolveStoreIdWithFallback } from "@/services/admin-catalog.functions";

// Schema canônico de validação de item no catálogo
const ProductValidationSchema = z.object({
 title: z.string().min(2, "Título deve ter no mínimo 2 caracteres").max(120),
 slug: z.string().regex(/^[a-z0-9-]+$/, "Slug deve conter apenas letras minúsculas, números e hífens"),
 price_cents: z.number().int().nonnegative("Preço não pode ser negativo"),
 status: z.enum(["published", "draft", "archived"]),
 stock: z.number().int().nonnegative().optional(),
});

describe("Catálogo, Estoque & Precificação — Ciclo 3 Microfase 3.1", () => {
 describe("Validação de Contratos de Produtos & Variantes", () => {
 it("valida criação de produto com campos obrigatórios íntegros", () => {
 const validProduct = {
 title: "Café Espresso Duplo Especial",
 slug: "cafe-espresso-duplo-especial",
 price_cents: 1450,
 status: "published" as const,
 stock: 50,
 };

 const parsed = ProductValidationSchema.safeParse(validProduct);
 expect(parsed.success).toBe(true);
 });

 it("rejeita produto com preço negativo", () => {
 const invalidProduct = {
 title: "Item Promocional Inválido",
 slug: "item-invalido",
 price_cents: -500,
 status: "published" as const,
 };

 const parsed = ProductValidationSchema.safeParse(invalidProduct);
 expect(parsed.success).toBe(false);
 });

 it("rejeita slug com caracteres especiais ou espaços", () => {
 const invalidSlug = {
 title: "Produto Teste",
 slug: "produto com espaco e Ç",
 price_cents: 2990,
 status: "draft" as const,
 };

 const parsed = ProductValidationSchema.safeParse(invalidSlug);
 expect(parsed.success).toBe(false);
 });
 });

 describe("Adaptação de Semântica Multi-Nicho no Catálogo", () => {
 it("retorna semântica correta para o nicho de Gastronomia", () => {
 const storeGastro = {
 settings: { segment: "gastronomy" },
 };
 const semantics = getNicheSemantics(storeGastro);
 const ctx = getNicheCatalogContext(storeGastro);

 expect(semantics.nicheId).toBe("gastronomy");
 expect(ctx.entityName).toBe("Item do Cardápio");
 });

 it("retorna semântica correta para o nicho de Turismo", () => {
 const storeTourism = {
 settings: { segment: "tourism" },
 };
 const semantics = getNicheSemantics(storeTourism);
 const ctx = getNicheCatalogContext(storeTourism);

 expect(semantics.nicheId).toBe("tourism");
 expect(ctx.entityName).toBe("Pacote / Roteiro");
 });

 it("retorna semântica correta para o nicho de Varejo Geral", () => {
 const storeRetail = {
 settings: { segment: "retail" },
 };
 const semantics = getNicheSemantics(storeRetail);
 const ctx = getNicheCatalogContext(storeRetail);

 expect(semantics.nicheId).toBe("retail");
 expect(ctx.entityName).toBe("Produto");
 expect(ctx.categoryPlaceholder).toContain("Camisas");
 expect(ctx.categoryDesc).toContain("produtos no catálogo");
 });

 it("garante que loja de Moda/Vestuário não receba placeholders de Turismo em categorias", () => {
 const storeFashion = {
 name: "Loja Moda Teste",
 settings: { segment: "retail" },
 };
 const semantics = getNicheSemantics(storeFashion);
 const ctx = getNicheCatalogContext(storeFashion);

 expect(ctx.categoryPlaceholder).not.toContain("Resorts");
 expect(ctx.categoryPlaceholder).not.toContain("Ecoturismo");
 expect(ctx.categoryDesc).not.toContain("destino");
 expect(ctx.categoryPlaceholder).toContain("Camisas");
 });

 it("valida contrato de payload de categoria suportando store_id explícito", () => {
 const CategoryPayloadSchema = z.object({
 name: z.string().min(1).max(100),
 slug: z.string().regex(/^[a-z0-9-]+$/),
 parent_id: z.string().uuid().optional().nullable(),
 status: z.enum(["active", "inactive"]).default("active"),
 store_id: z.string().uuid().optional().nullable(),
 });

 const validWithStore = {
 name: "Camisas",
 slug: "camisas",
 store_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
 };
 expect(CategoryPayloadSchema.safeParse(validWithStore).success).toBe(true);

 const validWithoutStore = {
 name: "Calças",
 slug: "calcas",
 };
 expect(CategoryPayloadSchema.safeParse(validWithoutStore).success).toBe(true);
 });

 it("valida contrato de criação rápida de marca/fabricante por loja", () => {
  const CreateStoreBrandSchema = z.object({
   name: z.string().min(1, "Nome da marca obrigatório").max(100),
   store_id: z.string().uuid().optional().nullable(),
  });

  expect(CreateStoreBrandSchema.safeParse({ name: "Zara", store_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890" }).success).toBe(true);
  expect(CreateStoreBrandSchema.safeParse({ name: "Nike" }).success).toBe(true);
  expect(CreateStoreBrandSchema.safeParse({ name: "" }).success).toBe(false);
 });

 it("adapta rótulos e placeholders de marca/fabricante conforme nicho", () => {
  const storeFashion = { settings: { segment: "retail" } };
  const storeVehicles = { settings: { segment: "vehicles" } };
  const storeTourism = { settings: { segment: "tourism" } };
  const storeGastro = { settings: { segment: "gastronomy" } };

  const ctxFashion = getNicheCatalogContext(storeFashion);
  const ctxVehicles = getNicheCatalogContext(storeVehicles);
  const ctxTourism = getNicheCatalogContext(storeTourism);
  const ctxGastro = getNicheCatalogContext(storeGastro);

  expect(ctxFashion.brandLabel).toBe("Marca / Fabricante");
  expect(ctxFashion.brandPlaceholder).toContain("Zara");

  expect(ctxVehicles.brandLabel).toBe("Marca / Montadora");
  expect(ctxVehicles.brandPlaceholder).toContain("Toyota");

  expect(ctxTourism.brandLabel).toBe("Operadora / Cia Aérea / Frota");
  expect(ctxTourism.brandPlaceholder).toContain("CVC");

  expect(ctxGastro.brandLabel).toContain("Cozinha");
 });

 it("valida contrato de upsertOptionGroup com suporte a store_id e normalização de ID vazio/temporário", () => {
  const OptionGroupSchema = z.object({
   id: z.string().uuid().optional().nullable().or(z.literal("")),
   store_id: z.string().uuid().optional().nullable(),
   internal_name: z.string().min(1),
   display_name: z.string().min(1),
   description: z.string().optional().nullable(),
   selection_type: z.enum(["single", "multiple"]),
   min_selections: z.number().int().min(0),
   max_selections: z.number().int().min(1),
   is_required: z.boolean(),
   values: z.array(
    z.object({
     id: z.string().uuid().optional().nullable().or(z.literal("")),
     label: z.string().min(1),
     description: z.string().optional().nullable(),
     image_url: z.string().optional().nullable(),
     price_modifier_cents: z.number().int().default(0),
     max_quantity_per_item: z.number().int().min(1).default(1).optional(),
     is_default: z.boolean().default(false),
     is_active: z.boolean().default(true),
     sort_order: z.number().int().default(0),
    }),
   ),
  });

  // Caso 1: Criação nova com preset (sem id ou com id vazio)
  const validNewPreset = {
   id: "",
   store_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
   internal_name: "embalagem-presente",
   display_name: "Opções de Embalagem",
   description: "Envie diretamente com pacote especial de presente",
   selection_type: "single" as const,
   min_selections: 0,
   max_selections: 1,
   is_required: false,
   values: [
    {
     id: "",
     label: "Embalagem Padrão de Envio",
     description: "Envelope de segurança reforçado",
     price_modifier_cents: 0,
     is_default: true,
     is_active: true,
     sort_order: 0,
    },
    {
     id: null,
     label: "Caixa Presente com Laço de Cetim",
     description: "Caixa rígida com laço",
     price_modifier_cents: 1500,
     is_default: false,
     is_active: true,
     sort_order: 1,
    },
   ],
  };

  expect(OptionGroupSchema.safeParse(validNewPreset).success).toBe(true);

  // Caso 2: Rejeição de display_name vazio
  expect(OptionGroupSchema.safeParse({ ...validNewPreset, display_name: "" }).success).toBe(false);

  // Caso 3: Rejeição de selection_type inválido
  expect(OptionGroupSchema.safeParse({ ...validNewPreset, selection_type: "custom" as any }).success).toBe(false);
 });
 });

  describe("Resolução Resiliente de Loja / Tenant sem Falso-Negativo (DEC-455)", () => {
    it("prioriza requestedStoreId quando fornecido explicitamente", async () => {
      const identity = { id: "user-1", role: "owner", store_id: "store-a", memberships: [{ store_id: "store-a" }] };
      const resolved = await resolveStoreIdWithFallback(identity, "store-explicit");
      expect(resolved).toBe("store-explicit");
    });

    it("utiliza store_id da identidade quando não fornecido explicitamente", async () => {
      const identity = { id: "user-1", role: "owner", store_id: "store-identity", memberships: [] };
      const resolved = await resolveStoreIdWithFallback(identity, undefined);
      expect(resolved).toBe("store-identity");
    });

    it("utiliza primeiro membership como fallback seguro quando store_id for nulo", async () => {
      const identity = { id: "user-1", role: "customer", store_id: null, memberships: [{ store_id: "store-from-member" }] };
      const resolved = await resolveStoreIdWithFallback(identity, undefined);
      expect(resolved).toBe("store-from-member");
    });

    it("executa fallback na tabela stores para platform admin sem memberships ativas", async () => {
      const mockDb = {
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: { id: "store-latest-admin" }, error: null }),
        })),
      };
      const adminIdentity = { id: "admin-1", role: "platform_admin", store_id: null, memberships: [], isPlatformAdmin: true };
      const resolved = await resolveStoreIdWithFallback(adminIdentity, undefined, mockDb);
      expect(resolved).toBe("store-latest-admin");
    });

    it("lança erro defensivo quando nenhum contexto for resolúvel para usuário civil comum", async () => {
      const civilIdentity = { id: "user-civil", role: "customer", store_id: null, memberships: [] };
      await expect(resolveStoreIdWithFallback(civilIdentity, undefined)).rejects.toThrow("Nenhuma loja ativa selecionada.");
    });
  });
});
