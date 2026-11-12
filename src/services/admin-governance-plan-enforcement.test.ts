import { describe, it, expect } from "vitest";
import {
  STORE_PLANS,
  checkStoreStaffSeatLimit,
  assertStoreStaffSeatAvailable,
  checkStoreWhatsAppInstanceLimit,
  assertStoreWhatsAppInstanceAvailable,
  isStorePlanExempt,
  calculateStoreMonthlyPlanTotalCents,
} from "../lib/architecture/module-plan-governance";
import { buildPlatformInvoiceInsertRow } from "./billing.functions";

describe("Microphase A — Governança de Planos, Cotas e Faturamento Admin Master", () => {
  it("bloqueia novo membro quando a loja atinge maxStaffUsers do plano free/starter", () => {
    const freeStore = { plan_tier: "free", slug: "loja-teste", settings: {} };
    expect(STORE_PLANS.free.maxStaffUsers).toBe(1);

    const status = checkStoreStaffSeatLimit(freeStore, 1);
    expect(status.allowed).toBe(false);

    expect(() => assertStoreStaffSeatAvailable(freeStore, 1)).toThrow(
      /Limite de 1 usuário\(s\) de equipe do plano Gratuito atingido/
    );
  });

  it("permite atualização de membro existente ou loja dentro da cota / isenta SSOT", () => {
    const starterStore = { plan_tier: "starter", slug: "loja-teste", settings: {} };
    expect(checkStoreStaffSeatLimit(starterStore, 2).allowed).toBe(true);
    expect(checkStoreStaffSeatLimit(starterStore, 3, { isExistingStoreMember: true }).allowed).toBe(true);

    const exemptStore = { plan_tier: "free", slug: "excelencia-tour-smo", settings: {} };
    expect(isStorePlanExempt(exemptStore)).toBe(true);
    expect(() => assertStoreStaffSeatAvailable(exemptStore, 250)).not.toThrow();
  });

  it("bloqueia criação de nova instância WhatsApp acima do limite do tier e permite atualizar existente", () => {
    const starterStore = { plan_tier: "starter", slug: "loja-wa", settings: {} };
    expect(STORE_PLANS.starter.maxWhatsAppInstances).toBe(2);

    expect(checkStoreWhatsAppInstanceLimit(starterStore, 1).allowed).toBe(true);
    expect(() => assertStoreWhatsAppInstanceAvailable(starterStore, 2)).toThrow(
      /Limite de 2 instância\(s\) WhatsApp do plano Starter atingido/
    );

    expect(() =>
      assertStoreWhatsAppInstanceAvailable(starterStore, 2, { isUpdatingExistingInstance: true })
    ).not.toThrow();
  });

  it("calcula valor mensal consolidado considerando apenas add-ons fora do plano", () => {
    const store = {
      plan_tier: "starter",
      settings: {
        active_modules: ["module_omnichannel_whatsapp", "module_ai_copilot_voice"],
      },
    };
    // starter = 9900; omnichannel já incluso; ai_copilot_voice addon = 14900 => 24800
    expect(calculateStoreMonthlyPlanTotalCents(store)).toBe(24800);
  });

  it("mapeia billing.functions.ts buildPlatformInvoiceInsertRow estritamente às colunas reais de platform_invoices", () => {
    const row = buildPlatformInvoiceInsertRow({
      storeId: "11111111-1111-4111-8111-111111111111",
      periodStart: "2026-10-01",
      periodEnd: "2026-10-31",
      platformFeeCents: 24900,
    });

    expect(row).toMatchObject({
      store_id: "11111111-1111-4111-8111-111111111111",
      description: "Fatura da Plataforma (2026-10-01 a 2026-10-31)",
      amount_cents: 24900,
      status: "pending",
    });
    expect("period_start" in row).toBe(false);
    expect("period_end" in row).toBe(false);
    expect("platform_fee_cents" in row).toBe(false);
    expect(new Date(row.due_date).getUTCFullYear()).toBe(2026);
  });
});
