import { describe, it, expect, vi } from "vitest";

// Mock @tanstack/react-start para permitir execução das server functions em ambiente de teste unitário
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

import {
  searchCentralProfessions,
  searchCentralOnDemandServices,
  getCentralMarketingCalendar,
  getCentralDemographics,
} from "./central-knowledge.functions";
import { GLOBAL_PROFESSIONS_CATALOG } from "@/lib/data/professions-catalog";
import { GLOBAL_ON_DEMAND_SERVICES_CATALOG } from "@/lib/data/services-catalog";
import { GLOBAL_MASTER_PRODUCTS_CATALOG } from "@/lib/data/master-products-catalog";
import {
  IBGE_ECONOMIC_CLASSES,
  BRAZIL_REGIONS_DEMOGRAPHICS,
  generateSyntheticPopulations,
} from "@/lib/data/ibge-demographics";
import { getHolidaysForYear } from "@/lib/data/holidays-calendar-catalog";

describe("Fase 14: Central Knowledge Bases, Autopopulation & SimLab Expansion", () => {
  // ── 1. BANCO DE PROFISSÕES & MÉDIAS SALARIAIS (CBO / MTE) ──
  describe("Professions & Salary Benchmark Database", () => {
    it("deve conter profissões canônicas cadastradas com código CBO oficial", async () => {
      const res = await searchCentralProfessions({ data: { query: "" } });
      expect(res.professions.length).toBeGreaterThanOrEqual(20);

      const dev = res.professions.find((p) => p.cbo_code === "2124-05");
      expect(dev).toBeDefined();
      expect(dev?.title).toContain("Desenvolvedor");
    });

    it("deve ordenar os salários em centavos estritamente: Jr <= Pleno <= Sênior <= Lead", () => {
      for (const prof of GLOBAL_PROFESSIONS_CATALOG) {
        expect(prof.average_salary_junior_cents).toBeGreaterThan(0);
        expect(prof.average_salary_mid_cents).toBeGreaterThanOrEqual(prof.average_salary_junior_cents);
        expect(prof.average_salary_senior_cents).toBeGreaterThanOrEqual(prof.average_salary_mid_cents);
        expect(prof.average_salary_lead_cents).toBeGreaterThanOrEqual(prof.average_salary_senior_cents);
        expect(prof.hourly_rate_benchmark_cents).toBeGreaterThan(0);
        expect(prof.essential_skills.length).toBeGreaterThan(0);
      }
    });

    it("deve permitir busca por termo textual de habilidades ou títulos", async () => {
      const res = await searchCentralProfessions({ data: { query: "React" } });
      expect(res.professions.length).toBeGreaterThan(0);
      expect(res.professions.some((p) => p.essential_skills.includes("React"))).toBe(true);
    });
  });

  // ── 2. BANCO DE SERVIÇOS SOB DEMANDA (GETNINJAS / WORKANA / 99FREELAS) ──
  describe("On-Demand Marketplace Services Database", () => {
    it("deve conter serviços sob demanda com precificação consistente", async () => {
      const res = await searchCentralOnDemandServices({ data: { query: "" } });
      expect(res.services.length).toBeGreaterThanOrEqual(10);

      for (const s of GLOBAL_ON_DEMAND_SERVICES_CATALOG) {
        expect(s.estimated_min_price_cents).toBeGreaterThan(0);
        expect(s.estimated_avg_price_cents).toBeGreaterThanOrEqual(s.estimated_min_price_cents);
        expect(s.estimated_max_price_cents).toBeGreaterThanOrEqual(s.estimated_avg_price_cents);
        expect(s.estimated_delivery_days).toBeGreaterThanOrEqual(1);
        expect(["hora", "projeto", "m²", "ponto", "diária", "visita", "palavra"]).toContain(s.pricing_unit);
      }
    });

    it("deve encontrar eletricista, pintor e desenvolvedor web na busca", async () => {
      const eletricista = await searchCentralOnDemandServices({ data: { query: "eletricista" } });
      expect(eletricista.services.length).toBeGreaterThan(0);
      expect(eletricista.services[0].category).toBe("Reformas & Reparos");

      const devWeb = await searchCentralOnDemandServices({ data: { query: "website" } });
      expect(devWeb.services.length).toBeGreaterThan(0);
      expect(devWeb.services[0].category).toBe("Tecnologia & Programação");
    });
  });

  // ── 3. CALENDÁRIO EDITORIAL & DATAS COMERCIAIS DE MARKETING ──
  describe("Seasonal Marketing & Holidays Calendar", () => {
    it("deve calcular datas comemorativas nacionais incluindo Consciência Negra (Lei 14.759/2023)", () => {
      const currentYear = new Date().getFullYear();
      const holidays = getHolidaysForYear(currentYear);

      const conscienciaNegra = holidays.find((h) => h.id === "holiday-consciencia-negra");
      expect(conscienciaNegra).toBeDefined();
      expect(conscienciaNegra?.date).toBe(`${currentYear}-11-20`);
      expect(conscienciaNegra?.is_official_holiday).toBe(true);

      const anoNovo = holidays.find((h) => h.id === "holiday-ano-novo");
      expect(anoNovo?.date).toBe(`${currentYear}-01-01`);
    });

    it("deve conter feriados estaduais e municipais de cidades polo", () => {
      const currentYear = new Date().getFullYear();
      const holidays = getHolidaysForYear(currentYear);

      const revSP = holidays.find((h) => h.id === "holiday-estadual-sp-9-julho");
      expect(revSP).toBeDefined();
      expect(revSP?.state_code).toBe("SP");

      const farroupilhaRS = holidays.find((h) => h.id === "holiday-estadual-rs-farroupilha");
      expect(farroupilhaRS).toBeDefined();
      expect(farroupilhaRS?.state_code).toBe("RS");

      const chapeco = holidays.find((h) => h.id === "holiday-mun-chapeco-aniversario");
      expect(chapeco).toBeDefined();
      expect(chapeco?.city_name).toBe("Chapecó");
    });

    it("deve retornar próximas datas de campanha com dias de antecedência ordenados", async () => {
      const res = await getCentralMarketingCalendar({ data: { daysAhead: 120 } });
      expect(res.marketing_events).toBeDefined();
      expect(res.marketing_events.length).toBeGreaterThan(0);

      // Validação de contagem regressiva positiva e ordenação crescente
      for (let i = 0; i < res.marketing_events.length - 1; i++) {
        expect(res.marketing_events[i].days_until).toBeGreaterThanOrEqual(0);
        expect(res.marketing_events[i].days_until).toBeLessThanOrEqual(res.marketing_events[i + 1].days_until);
      }
    });
  });

  // ── 4. DEMOGRAFIA OFICIAL IBGE & GERAÇÃO SINTÉTICA SIMLAB ──
  describe("IBGE Demographics & Synthetic Cohorts", () => {
    it("deve abranger as 6 classes econômicas com somatório de 100% da população", () => {
      const totalPercentage = IBGE_ECONOMIC_CLASSES.reduce((acc, c) => acc + c.brazil_population_percentage, 0);
      expect(Math.round(totalPercentage)).toBe(100);

      for (const ec of IBGE_ECONOMIC_CLASSES) {
        expect(ec.median_monthly_household_income_cents).toBeGreaterThan(0);
        expect(ec.discretionary_budget_percentage).toBeGreaterThan(0);
        expect(ec.preferred_payment_methods.length).toBeGreaterThan(0);
      }
    });

    it("deve conter distribuição macro-regional com renda per capita em centavos", () => {
      const regions = ["Sul", "Sudeste", "Centro_Oeste", "Nordeste", "Norte"];
      for (const reg of regions) {
        const data = BRAZIL_REGIONS_DEMOGRAPHICS[reg];
        expect(data).toBeDefined();
        expect(data.population_ibge_2022).toBeGreaterThan(10000000);
        expect(data.average_monthly_household_per_capita_cents).toBeGreaterThan(100000);
        expect(data.ecommerce_penetration_rate).toBeGreaterThan(50);
      }
    });

    it("deve gerar coortes sintéticas fiéis às estatísticas do IBGE via generateSyntheticPopulations", () => {
      const cohort = generateSyntheticPopulations(20, { region: "Sul" });
      expect(cohort.length).toBe(20);

      for (const citizen of cohort) {
        expect(citizen.id).toContain("citizen-ibge-sul");
        expect(citizen.name.split(" ").length).toBeGreaterThanOrEqual(2);
        expect(citizen.monthly_income_cents).toBeGreaterThan(0);
        expect(citizen.discretionary_budget_cents).toBeGreaterThan(0);
        expect(citizen.age).toBeGreaterThanOrEqual(18);
        expect(citizen.city).toBeDefined();
      }
    });
  });

  // ── 5. CATÁLOGO MESTRE DE PRODUTOS EXPANDIDO ──
  describe("Expanded Master Products Catalog (Bebidas, Gastronomia, Móveis, Eletro, Auto)", () => {
    it("deve conter produtos das novas categorias solicitadas pelo usuário", () => {
      const categories = GLOBAL_MASTER_PRODUCTS_CATALOG.map((p) => p.category);
      expect(categories).toContain("Bebidas");
      expect(categories).toContain("Gastronomia");
      expect(categories).toContain("Móveis");
      expect(categories).toContain("Eletrodomésticos");
      expect(categories).toContain("Automotivo");
    });

    it("todos os produtos devem possuir GTIN (12 a 14 dígitos), NCM e enquadramento na Reforma Tributária 2026", () => {
      for (const prod of GLOBAL_MASTER_PRODUCTS_CATALOG) {
        expect(prod.barcode_ean).toMatch(/^\d{12,14}$/);
        expect(prod.ncm_code).toMatch(/^\d{4}\.\d{2}\.\d{2}$/);
        expect(prod.suggested_price_cents).toBeGreaterThan(0);
        expect(prod.ibs_rate).toBeGreaterThanOrEqual(0);
        expect(prod.cbs_rate).toBeGreaterThanOrEqual(0);
      }
    });
  });
});
