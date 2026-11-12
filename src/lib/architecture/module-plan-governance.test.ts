import { describe, it, expect } from "vitest";
import {
  COMMERCIAL_MODULE_CATALOG,
  STORE_PLANS,
  isStoreModuleActive,
  assertStoreModuleAccess,
} from "./module-plan-governance";

describe("Governança de Planos e Módulos por Vertical (Multi-Tenant)", () => {
  it("contém catálogo comercial com todos os 6 módulos previstos", () => {
    const modules = Object.keys(COMMERCIAL_MODULE_CATALOG);
    expect(modules).toContain("module_omnichannel_whatsapp");
    expect(modules).toContain("module_ai_copilot_voice");
    expect(modules).toContain("module_financial_erp");
    expect(modules).toContain("module_tourism_studio");
    expect(modules).toContain("module_food_delivery");
    expect(modules).toContain("module_ads_booster");
  });

  it("verifica módulos inclusos no plano professional", () => {
    const store = { plan_tier: "professional", settings: {} };
    expect(isStoreModuleActive(store, "module_omnichannel_whatsapp")).toBe(true);
    expect(isStoreModuleActive(store, "module_ai_copilot_voice")).toBe(true);
    expect(isStoreModuleActive(store, "module_financial_erp")).toBe(true);
    expect(isStoreModuleActive(store, "module_tourism_studio")).toBe(true);
    // Food delivery e ads booster não estão no plano professional padrão
    expect(isStoreModuleActive(store, "module_food_delivery")).toBe(false);
  });

  it("permite ativação avulsa de módulo via settings.active_modules (Add-on)", () => {
    const store = {
      plan_tier: "starter",
      settings: {
        active_modules: ["module_ai_copilot_voice"],
      },
    };
    expect(isStoreModuleActive(store, "module_omnichannel_whatsapp")).toBe(true); // incluso no starter
    expect(isStoreModuleActive(store, "module_ai_copilot_voice")).toBe(true); // contratado como addon
    expect(isStoreModuleActive(store, "module_financial_erp")).toBe(false); // não contratado
  });

  it("dispara erro defensivo em assertStoreModuleAccess quando módulo não está contratado", () => {
    const store = { plan_tier: "free", settings: {} };
    expect(() => assertStoreModuleAccess(store, "module_ai_copilot_voice")).toThrow(
      /não está ativo no plano da sua loja/
    );
  });

  it("libera todos os módulos para plano enterprise", () => {
    const store = { plan_tier: "enterprise", settings: {} };
    expect(isStoreModuleActive(store, "module_omnichannel_whatsapp")).toBe(true);
    expect(isStoreModuleActive(store, "module_ai_copilot_voice")).toBe(true);
    expect(isStoreModuleActive(store, "module_financial_erp")).toBe(true);
    expect(isStoreModuleActive(store, "module_tourism_studio")).toBe(true);
    expect(isStoreModuleActive(store, "module_food_delivery")).toBe(true);
    expect(isStoreModuleActive(store, "module_ads_booster")).toBe(true);
  });
});
