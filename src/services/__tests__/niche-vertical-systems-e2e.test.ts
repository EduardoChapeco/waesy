import { describe, it, expect } from "vitest";
import {
  UNIFIED_NICHE_SPECS,
  resolveUnifiedNicheId,
  getUnifiedNicheSpec,
  listSellableNicheSystems,
  getBookingCategoryLabelFromSsot,
  type UnifiedNicheId,
  type VerticalPlanSkuId,
} from "@/lib/niches/niche-ssot";
import {
  VERTICAL_PLAN_CATALOG,
  resolveStoreWorkspaceCapabilities,
  checkStoreCatalogQuota,
  assertStoreEntitlement,
  isStorePlanExempt,
} from "@/lib/architecture/module-plan-governance";
import {
  resolveWorkspaceNavigation,
  getMasterSidebarPillars,
} from "@/lib/workspace-navigation";
import { buildPlatformInvoiceInsertRow } from "@/services/billing.functions";
import {
  createServiceOrderSchema,
  updateServiceOrderSchema,
} from "@/services/service-orders.functions";
import { updateAppointmentClinicalNotesSchema } from "@/services/booking.functions";

describe("E2E — Taxonomia Unificada SSOT, Sistemas Verticais & Entitlements", () => {
  it("1. Classifica nichos por fronteira de palavra sem colisões históricas de substring", () => {
    expect(resolveUnifiedNicheId("Barbearia do Zé")).toBe("barbershop");
    expect(resolveUnifiedNicheId("Clínica de Ultrassom Diagnóstico")).toBe("healthcare");
    expect(resolveUnifiedNicheId("Casa dos Produtos Naturais")).toBe("retail");
    expect(resolveUnifiedNicheId("Espaço Autocuidado & Estética")).not.toBe("automotive");
    expect(resolveUnifiedNicheId("Centro Automotivo & Mecânica Express")).toBe("automotive");
    expect(resolveUnifiedNicheId("Escritório de Contabilidade Fiscal")).toBe("accounting");
    expect(resolveUnifiedNicheId("Pet Shop & Clínica Veterinária")).toBe("vet_petshop");
    expect(resolveUnifiedNicheId("Agência de Viagens e Excursões")).toBe("tourism");
  });

  it("2. Expõe todos os 20 sistemas verticais vendáveis + generic completos na SSOT", () => {
    const sellable = listSellableNicheSystems();
    expect(sellable.length).toBe(20);

    const allIds = Object.keys(UNIFIED_NICHE_SPECS) as UnifiedNicheId[];
    expect(allIds).toContain("generic");
    expect(allIds.length).toBe(21);

    for (const spec of sellable) {
      expect(spec.label.length).toBeGreaterThan(2);
      expect(spec.shortLabel.length).toBeGreaterThan(1);
      expect(VERTICAL_PLAN_CATALOG[spec.defaultVerticalSku]).toBeDefined();
      expect(spec.seoProfile.titleSuffix.length).toBeGreaterThan(2);
      expect(spec.seoProfile.defaultKeywords.length).toBeGreaterThan(0);
      expect(spec.onboardingBlueprint.defaultCategories.length).toBeGreaterThan(0);
      expect(spec.onboardingBlueprint.defaultDepartments.length).toBeGreaterThan(0);
    }

    for (const agendaNiche of [
      "beauty_salon",
      "barbershop",
      "aesthetics_clinic",
      "healthcare",
      "dental",
      "psychology",
      "vet_petshop",
      "automotive",
    ] as const) {
      expect(UNIFIED_NICHE_SPECS[agendaNiche].onboardingBlueprint.defaultBookingCategories.length).toBeGreaterThan(0);
    }
  });

  it("3. Resolve rótulos canônicos de categorias de agendamento sem mapas hardcoded", () => {
    const barberSpec = getUnifiedNicheSpec("barbershop");
    const firstBarberCat = barberSpec.onboardingBlueprint.defaultBookingCategories[0];
    expect(getBookingCategoryLabelFromSsot(firstBarberCat.slug)).toBe(firstBarberCat.label);
    expect(getBookingCategoryLabelFromSsot("atendimento_avulso")).toBe("Atendimento Avulso");
    expect(getBookingCategoryLabelFromSsot(null)).toBe("Serviço Agendado");
  });

  it("4. Mantém os 10 SKUs verticais consistentes e aplica limites/bloqueios Zero-Trust", () => {
    const skuIds = Object.keys(VERTICAL_PLAN_CATALOG) as VerticalPlanSkuId[];
    expect(skuIds.length).toBe(10);

    const autoStore = {
      id: "22222222-2222-4222-8222-222222222222",
      slug: "oficina-central",
      primary_niche_id: "automotive",
      vertical_sku: "waesy_automotive_workshop",
      subscription_status: "active",
    };

    const caps = resolveStoreWorkspaceCapabilities(autoStore);
    expect(caps.verticalSku).toBe("waesy_automotive_workshop");
    expect(caps.isSuspended).toBe(false);
    expect(caps.capabilities).toContain("service_orders");
    expect(() =>
      assertStoreEntitlement(autoStore, { capability: "service_orders" }),
    ).not.toThrow();

    // Loja com SKU de barbearia NÃO deve possuir capability service_orders nem bypassar cota de catálogo
    const barberStore = {
      id: "33333333-3333-4333-8333-333333333333",
      slug: "barbearia-elite",
      primary_niche_id: "barbershop",
      vertical_sku: "waesy_barbershop",
      subscription_status: "active",
    };

    expect(() =>
      assertStoreEntitlement(barberStore, { capability: "service_orders" }),
    ).toThrow(/não está incluído no pacote/);

    expect(() =>
      assertStoreEntitlement(barberStore, { capability: "agenda_services" }),
    ).not.toThrow();

    const maxCatalog = VERTICAL_PLAN_CATALOG.waesy_barbershop.limits.maxCatalogItems;
    expect(checkStoreCatalogQuota(barberStore, maxCatalog, 1).allowed).toBe(false);
    expect(() =>
      assertStoreEntitlement(barberStore, {
        resourceQuota: { resource: "catalog_items", currentCount: maxCatalog, increment: 1 },
      }),
    ).toThrow(/Limite de/);

    // Cota de IA (ai_calls) positivo e negativo
    const maxAi = VERTICAL_PLAN_CATALOG.waesy_barbershop.limits.maxMonthlyAiCalls;
    expect(() =>
      assertStoreEntitlement(barberStore, {
        resourceQuota: { resource: "ai_calls", currentCount: maxAi - 1, increment: 1 },
      }),
    ).not.toThrow();
    expect(() =>
      assertStoreEntitlement(barberStore, {
        resourceQuota: { resource: "ai_calls", currentCount: maxAi, increment: 1 },
      }),
    ).toThrow(/Cota mensal de/);

    // Assinatura suspensa (past_due) bloqueia operação para lojas pagas não isentas
    const suspendedStore = { ...barberStore, subscription_status: "past_due" };
    expect(resolveStoreWorkspaceCapabilities(suspendedStore).isSuspended).toBe(true);
    expect(() =>
      assertStoreEntitlement(suspendedStore, { capability: "agenda_services" }),
    ).toThrow(/past_due/);
  });

  it("5. Preserva isenção canônica de plataforma (excelencia-tour* e is_platform_root)", () => {
    const rootStore = {
      slug: "excelencia-tour-smo",
      subscription_status: "past_due",
      vertical_sku: "waesy_barbershop",
    };
    expect(isStorePlanExempt(rootStore)).toBe(true);
    expect(() =>
      assertStoreEntitlement(rootStore, {
        capability: "service_orders",
        resourceQuota: { resource: "catalog_items", currentCount: 999999, increment: 1 },
      }),
    ).not.toThrow();

    const flagStore = { slug: "qualquer-outra", is_platform_root: true };
    expect(isStorePlanExempt(flagStore)).toBe(true);
  });

  it("6. Roteia Sidebar dinâmica de Automotive e Contabilidade para /workspace/ordens-servico sem vazamento inter-vertical", () => {
    const autoGroups = resolveWorkspaceNavigation({
      primary_niche_id: "automotive",
      vertical_sku: "waesy_automotive_workshop",
      subscription_status: "active",
    });
    const autoPaths = autoGroups.flatMap((g) => g.items.map((i) => i.path));
    expect(autoPaths).toContain("/workspace/ordens-servico");
    expect(autoPaths).not.toContain("/workspace/turismo/grupos");
    expect(autoPaths).not.toContain("/workspace/pdv/cozinha");

    const accountingGroups = resolveWorkspaceNavigation({
      primary_niche_id: "accounting",
      vertical_sku: "waesy_legal_office",
      subscription_status: "active",
    });
    const accountingPaths = accountingGroups.flatMap((g) => g.items.map((i) => i.path));
    expect(accountingPaths).toContain("/workspace/ordens-servico");
    expect(accountingPaths).not.toContain("/workspace/turismo/grupos");

    const masterPillars = getMasterSidebarPillars(
      resolveWorkspaceNavigation({}, { isMasterMode: true }),
    );
    const masterPaths = masterPillars.flatMap((p) => p.items.map((i) => i.path));
    expect(masterPaths).toContain("/workspace/ordens-servico");
  });

  it("7. Valida contratos Zod de OS automotiva, anotações clínicas e payload de faturas", () => {
    const validOrder = createServiceOrderSchema.parse({
      store_id: "11111111-1111-4111-8111-111111111111",
      client_name: "Carlos Mecânico",
      client_phone: "49999998888",
      equipment_name: "Honda Civic Touring 2022",
      reported_issue: "Ruído na suspensão dianteira ao frear",
      vehicle_plate: "ABC1D23",
      vehicle_brand_model: "Honda Civic",
      vehicle_year: 2022,
      odometer_km: 48200,
      inspection_checklist: [{ item: "Freios dianteiros", ok: false, note: "Pastilha gasta" }],
    });
    expect(validOrder.vehicle_plate).toBe("ABC1D23");

    const validUpdate = updateServiceOrderSchema.parse({
      order_id: "22222222-2222-4222-8222-222222222222",
      odometer_km: 48250,
    });
    expect(validUpdate.odometer_km).toBe(48250);

    const validClinical = updateAppointmentClinicalNotesSchema.parse({
      appointment_id: "33333333-3333-4333-8333-333333333333",
      formula_notes: "7.0 (30g) + OX 20vol",
      return_reminder_at: "2026-12-01T14:00:00.000Z",
      supplies_deducted: true,
    });
    expect(validClinical.supplies_deducted).toBe(true);

    expect(() =>
      updateAppointmentClinicalNotesSchema.parse({
        appointment_id: "nao-e-uuid",
      }),
    ).toThrow();

    const invoice = buildPlatformInvoiceInsertRow({
      storeId: "11111111-1111-4111-8111-111111111111",
      periodStart: "2026-11-01",
      periodEnd: "2026-12-01",
      platformFeeCents: VERTICAL_PLAN_CATALOG.waesy_salon_beauty.monthlyPriceCents,
    });
    expect(invoice.amount_cents).toBe(11900);
    expect(invoice.status).toBe("pending");
  });
});
