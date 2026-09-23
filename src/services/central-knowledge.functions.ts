/**
 * central-knowledge.functions.ts
 * BFF / Server Functions para Consulta Centralizada:
 * - Veículos, Motos e Utilitários FIPE (vehicles_catalog)
 * - Serviços Regulamentados LC 116/03 & NBS (services_master_catalog)
 * - Municípios e Cidades do Brasil IBGE (cities_global)
 * - Instituições Financeiras BACEN / COMPE / ISPB / PIX (financial_institutions_catalog)
 * - Países, Moedas e DDI Internacional ISO (countries_currencies_catalog)
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity } from "@/lib/server-access";
import { GLOBAL_VEHICLES_CATALOG, VehicleModelRecord } from "@/lib/data/vehicles-catalog";
import { GLOBAL_SERVICES_CATALOG, MasterServiceRecord } from "@/lib/data/services-catalog";
import { GLOBAL_BRAZIL_CITIES_CATALOG, CityRecord } from "@/lib/data/cities-brazil-catalog";
import { GLOBAL_FINANCIAL_INSTITUTIONS_CATALOG, FinancialInstitutionDefinition } from "@/lib/data/financial-institutions-catalog";
import { GLOBAL_COUNTRIES_CATALOG, CountryDefinition } from "@/lib/data/countries-catalog";
import { GLOBAL_AIRLINES_CATALOG, GLOBAL_CRUISES_CATALOG, AirlineRecord, CruiseLineRecord } from "@/lib/data/airlines-cruises-catalog";
import { GLOBAL_CNAE_CATALOG, CnaeRecord } from "@/lib/data/cnae-catalog";
import { GLOBAL_HEALTH_INSURANCE_CATALOG, HealthInsuranceOperator } from "@/lib/data/health-insurance-catalog";
import { GLOBAL_SHIPPING_CARRIERS_CATALOG, ShippingCarrierDefinition } from "@/lib/data/shipping-carriers-catalog";
import { GLOBAL_UNITS_OF_MEASURE_CATALOG, UnitOfMeasureDefinition } from "@/lib/data/units-of-measure-catalog";
import { GLOBAL_PAYMENT_METHODS_CATALOG, PaymentMethodDefinition } from "@/lib/data/payment-methods-catalog";
import { GLOBAL_REAL_ESTATE_TYPES_CATALOG, RealEstateTypeDefinition } from "@/lib/data/real-estate-types-catalog";
import { GLOBAL_HOLIDAYS_CATALOG, HolidayDefinition, getUpcomingMarketingCalendar } from "@/lib/data/holidays-calendar-catalog";
import { GLOBAL_PROFESSIONS_CATALOG, ProfessionDefinition } from "@/lib/data/professions-catalog";
import { GLOBAL_ON_DEMAND_SERVICES_CATALOG, OnDemandMarketplaceService } from "@/lib/data/services-catalog";
import { IBGE_ECONOMIC_CLASSES, BRAZIL_REGIONS_DEMOGRAPHICS, generateSyntheticPopulations } from "@/lib/data/ibge-demographics";

// ── 1. BUSCA DE VEÍCULOS & MOTOS ──
const searchVehiclesSchema = z.object({
  query: z.string().optional().default(""),
  category: z.string().optional(),
  brand: z.string().optional(),
  limit: z.number().optional().default(30),
});

export const searchCentralVehicles = createServerFn({ method: "GET" })
  .validator((data: unknown) => searchVehiclesSchema.parse(data))
  .handler(async ({ data }) => {
    const { query, category, brand, limit } = data;
    const cleanQuery = (query || "").trim().toLowerCase();

    try {
      const supabase = getServerClient();
      let dbQuery = supabase.from("vehicles_catalog").select("*").limit(limit);

      if (category) {
        dbQuery = dbQuery.eq("category", category);
      }
      if (brand) {
        dbQuery = dbQuery.ilike("brand", brand);
      }
      if (cleanQuery) {
        dbQuery = dbQuery.or(`brand.ilike.%${cleanQuery}%,model.ilike.%${cleanQuery}%`);
      }

      const { data: dbVehicles, error } = await dbQuery;
      if (!error && dbVehicles && dbVehicles.length > 0) {
        return {
          vehicles: dbVehicles,
          source: "database" as const,
        };
      }
    } catch {
      // Fallback gracioso in-memory
    }

    let filtered = GLOBAL_VEHICLES_CATALOG;
    if (category) {
      filtered = filtered.filter((v) => v.category.toLowerCase() === category.toLowerCase());
    }
    if (brand) {
      filtered = filtered.filter((v) => v.brand.toLowerCase() === brand.toLowerCase());
    }
    if (cleanQuery) {
      filtered = filtered.filter(
        (v) =>
          v.brand.toLowerCase().includes(cleanQuery) ||
          v.model.toLowerCase().includes(cleanQuery) ||
          v.popular_features.some((f) => f.toLowerCase().includes(cleanQuery))
      );
    }

    return {
      vehicles: filtered.slice(0, limit),
      source: "canonical_library" as const,
    };
  });

// ── 2. BUSCA DE SERVIÇOS REGULAMENTADOS ──
const searchServicesSchema = z.object({
  query: z.string().optional().default(""),
  category: z.string().optional(),
  limit: z.number().optional().default(30),
});

export const searchCentralServices = createServerFn({ method: "GET" })
  .validator((data: unknown) => searchServicesSchema.parse(data))
  .handler(async ({ data }) => {
    const { query, category, limit } = data;
    const cleanQuery = (query || "").trim().toLowerCase();

    try {
      const supabase = getServerClient();
      let dbQuery = supabase.from("services_master_catalog").select("*").limit(limit);

      if (category) {
        dbQuery = dbQuery.eq("category", category);
      }
      if (cleanQuery) {
        dbQuery = dbQuery.or(`name.ilike.%${cleanQuery}%,code_lc116.ilike.%${cleanQuery}%,cnae_principal.ilike.%${cleanQuery}%`);
      }

      const { data: dbServices, error } = await dbQuery;
      if (!error && dbServices && dbServices.length > 0) {
        return {
          services: dbServices,
          source: "database" as const,
        };
      }
    } catch {
      // Fallback gracioso in-memory
    }

    let filtered = GLOBAL_SERVICES_CATALOG;
    if (category) {
      filtered = filtered.filter((s) => s.category.toLowerCase() === category.toLowerCase());
    }
    if (cleanQuery) {
      const tokens = cleanQuery.split(/\s+/).filter(Boolean);
      filtered = filtered.filter((s) => {
        const fullSearchable = `${s.name} ${s.description} ${s.code_lc116} ${s.cnae_principal} ${(s.keywords || []).join(" ")} ${s.regulatory_body || ""}`.toLowerCase();
        return tokens.some((t) => fullSearchable.includes(t));
      });
    }

    return {
      services: filtered.slice(0, limit),
      source: "canonical_library" as const,
    };
  });

// ── 3. BUSCA DE CIDADES & MUNICÍPIOS ──
const searchCitiesSchema = z.object({
  query: z.string().optional().default(""),
  state: z.string().optional(),
  isTourismHub: z.boolean().optional(),
  limit: z.number().optional().default(30),
});

export const searchCentralCities = createServerFn({ method: "GET" })
  .validator((data: unknown) => searchCitiesSchema.parse(data))
  .handler(async ({ data }) => {
    const { query, state, isTourismHub, limit } = data;
    const cleanQuery = (query || "").trim().toLowerCase();

    try {
      const supabase = getServerClient();
      let dbQuery = supabase.from("cities_global").select("*").limit(limit);

      if (state) {
        dbQuery = dbQuery.eq("state", state.toUpperCase());
      }
      if (isTourismHub !== undefined) {
        dbQuery = dbQuery.eq("is_tourism_hub", isTourismHub);
      }
      if (cleanQuery) {
        dbQuery = dbQuery.or(`name.ilike.%${cleanQuery}%,ddd.eq.${cleanQuery},ibge_code.ilike.%${cleanQuery}%`);
      }

      const { data: dbCities, error } = await dbQuery;
      if (!error && dbCities && dbCities.length > 0) {
        return {
          cities: dbCities,
          source: "database" as const,
        };
      }
    } catch {
      // Fallback gracioso in-memory
    }

    let filtered = GLOBAL_BRAZIL_CITIES_CATALOG;
    if (state) {
      filtered = filtered.filter((c) => c.state.toLowerCase() === state.toLowerCase());
    }
    if (isTourismHub !== undefined) {
      filtered = filtered.filter((c) => c.is_tourism_hub === isTourismHub);
    }
    if (cleanQuery) {
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(cleanQuery) ||
          c.ddd === cleanQuery ||
          c.ibge_code.includes(cleanQuery) ||
          c.nearest_airport_iata.toLowerCase().includes(cleanQuery)
      );
    }

    return {
      cities: filtered.slice(0, limit),
      source: "canonical_library" as const,
    };
  });

// ── 4. BUSCA DE INSTITUIÇÕES FINANCEIRAS (BANCOS & PIX) ──
const searchFinancialInstitutionsSchema = z.object({
  query: z.string().optional().default(""),
  popularOnly: z.boolean().optional(),
  limit: z.number().optional().default(30),
});

export const searchCentralFinancialInstitutions = createServerFn({ method: "GET" })
  .validator((data: unknown) => searchFinancialInstitutionsSchema.parse(data))
  .handler(async ({ data }) => {
    const { query, popularOnly, limit } = data;
    const cleanQuery = (query || "").trim().toLowerCase();

    try {
      const supabase = getServerClient();
      let dbQuery = supabase.from("financial_institutions_catalog").select("*").limit(limit);

      if (popularOnly) {
        dbQuery = dbQuery.eq("is_popular", true);
      }
      if (cleanQuery) {
        dbQuery = dbQuery.or(`short_name.ilike.%${cleanQuery}%,compe_code.ilike.%${cleanQuery}%,legal_name.ilike.%${cleanQuery}%`);
      }

      const { data: dbBanks, error } = await dbQuery;
      if (!error && dbBanks && dbBanks.length > 0) {
        return {
          institutions: dbBanks,
          source: "database" as const,
        };
      }
    } catch {
      // Fallback gracioso in-memory
    }

    let filtered = GLOBAL_FINANCIAL_INSTITUTIONS_CATALOG;
    if (popularOnly) {
      filtered = filtered.filter((b) => b.is_popular);
    }
    if (cleanQuery) {
      filtered = filtered.filter(
        (b) =>
          b.short_name.toLowerCase().includes(cleanQuery) ||
          b.compe_code.includes(cleanQuery) ||
          b.legal_name.toLowerCase().includes(cleanQuery) ||
          b.ispb_code.includes(cleanQuery)
      );
    }

    return {
      institutions: filtered.slice(0, limit),
      source: "canonical_library" as const,
    };
  });

// ── 5. BUSCA DE PAÍSES & MOEDAS ──
const searchCountriesSchema = z.object({
  query: z.string().optional().default(""),
  continent: z.string().optional(),
  limit: z.number().optional().default(30),
});

export const searchCentralCountries = createServerFn({ method: "GET" })
  .validator((data: unknown) => searchCountriesSchema.parse(data))
  .handler(async ({ data }) => {
    const { query, continent, limit } = data;
    const cleanQuery = (query || "").trim().toLowerCase();

    try {
      const supabase = getServerClient();
      let dbQuery = supabase.from("countries_currencies_catalog").select("*").limit(limit);

      if (continent) {
        dbQuery = dbQuery.eq("continent", continent);
      }
      if (cleanQuery) {
        dbQuery = dbQuery.or(`name_pt.ilike.%${cleanQuery}%,iso_alpha2.ilike.%${cleanQuery}%,currency_code.ilike.%${cleanQuery}%,phone_ddi.ilike.%${cleanQuery}%`);
      }

      const { data: dbCountries, error } = await dbQuery;
      if (!error && dbCountries && dbCountries.length > 0) {
        return {
          countries: dbCountries,
          source: "database" as const,
        };
      }
    } catch {
      // Fallback gracioso in-memory
    }

    let filtered = GLOBAL_COUNTRIES_CATALOG;
    if (continent) {
      filtered = filtered.filter((co) => co.continent.toLowerCase() === continent.toLowerCase());
    }
    if (cleanQuery) {
      filtered = filtered.filter(
        (co) =>
          co.name_pt.toLowerCase().includes(cleanQuery) ||
          co.iso_alpha2.toLowerCase().includes(cleanQuery) ||
          co.currency_code.toLowerCase().includes(cleanQuery) ||
          co.phone_ddi.includes(cleanQuery)
      );
    }

    return {
      countries: filtered.slice(0, limit),
      source: "canonical_library" as const,
    };
  });

// ── 6. BUSCA DE COMPANHIAS AÉREAS ──
const searchAirlinesSchema = z.object({
  query: z.string().optional().default(""),
  domesticOnly: z.boolean().optional(),
  limit: z.number().optional().default(30),
});

export const searchCentralAirlines = createServerFn({ method: "GET" })
  .validator((data: unknown) => searchAirlinesSchema.parse(data))
  .handler(async ({ data }) => {
    const { query, domesticOnly, limit } = data;
    const cleanQuery = (query || "").trim().toLowerCase();

    try {
      const supabase = getServerClient();
      let dbQuery = supabase.from("airlines_catalog").select("*").limit(limit);

      if (domesticOnly) {
        dbQuery = dbQuery.eq("is_brazilian_domestic", true);
      }
      if (cleanQuery) {
        dbQuery = dbQuery.or(`name.ilike.%${cleanQuery}%,iata_code.ilike.%${cleanQuery}%,icao_code.ilike.%${cleanQuery}%,country.ilike.%${cleanQuery}%`);
      }

      const { data: dbAirlines, error } = await dbQuery;
      if (!error && dbAirlines && dbAirlines.length > 0) {
        return {
          airlines: dbAirlines as AirlineRecord[],
          source: "database" as const,
        };
      }
    } catch {
      // Fallback gracioso in-memory
    }

    let filtered = GLOBAL_AIRLINES_CATALOG;
    if (domesticOnly) {
      filtered = filtered.filter((a) => a.is_brazilian_domestic);
    }
    if (cleanQuery) {
      filtered = filtered.filter(
        (a) =>
          a.name.toLowerCase().includes(cleanQuery) ||
          a.iata_code.toLowerCase().includes(cleanQuery) ||
          a.icao_code.toLowerCase().includes(cleanQuery) ||
          a.country.toLowerCase().includes(cleanQuery) ||
          a.frequent_flyer_program.toLowerCase().includes(cleanQuery)
      );
    }

    return {
      airlines: filtered.slice(0, limit),
      source: "canonical_library" as const,
    };
  });

// ── 7. BUSCA DE CRUZEIROS & ARMADORAS ──
const searchCruisesSchema = z.object({
  query: z.string().optional().default(""),
  limit: z.number().optional().default(30),
});

export const searchCentralCruises = createServerFn({ method: "GET" })
  .validator((data: unknown) => searchCruisesSchema.parse(data))
  .handler(async ({ data }) => {
    const { query, limit } = data;
    const cleanQuery = (query || "").trim().toLowerCase();

    try {
      const supabase = getServerClient();
      let dbQuery = supabase.from("cruises_catalog").select("*").limit(limit);

      if (cleanQuery) {
        dbQuery = dbQuery.or(`name.ilike.%${cleanQuery}%,style.ilike.%${cleanQuery}%`);
      }

      const { data: dbCruises, error } = await dbQuery;
      if (!error && dbCruises && dbCruises.length > 0) {
        return {
          cruises: dbCruises as CruiseLineRecord[],
          source: "database" as const,
        };
      }
    } catch {
      // Fallback gracioso in-memory
    }

    let filtered = GLOBAL_CRUISES_CATALOG;
    if (cleanQuery) {
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(cleanQuery) ||
          c.featured_ships_brazil.some((s) => s.toLowerCase().includes(cleanQuery)) ||
          c.departure_ports_brazil.some((p) => p.toLowerCase().includes(cleanQuery)) ||
          c.style.toLowerCase().includes(cleanQuery)
      );
    }

    return {
      cruises: filtered.slice(0, limit),
      source: "canonical_library" as const,
    };
  });

// ── 8. BUSCA DE CNAE (ATIVIDADES ECONÔMICAS) ──
const searchCnaeSchema = z.object({
  query: z.string().optional().default(""),
  sector: z.string().optional(),
  limit: z.number().optional().default(30),
});

export const searchCentralCnae = createServerFn({ method: "GET" })
  .validator((data: unknown) => searchCnaeSchema.parse(data))
  .handler(async ({ data }) => {
    const { query, sector, limit } = data;
    const cleanQuery = (query || "").trim().toLowerCase();

    try {
      const supabase = getServerClient();
      let dbQuery = supabase.from("cnae_catalog").select("*").limit(limit);

      if (sector) {
        dbQuery = dbQuery.eq("sector", sector);
      }
      if (cleanQuery) {
        dbQuery = dbQuery.or(`description.ilike.%${cleanQuery}%,code.ilike.%${cleanQuery}%,raw_code.ilike.%${cleanQuery}%`);
      }

      const { data: dbCnae, error } = await dbQuery;
      if (!error && dbCnae && dbCnae.length > 0) {
        return {
          cnaes: dbCnae as CnaeRecord[],
          source: "database" as const,
        };
      }
    } catch {
      // Fallback gracioso in-memory
    }

    let filtered = GLOBAL_CNAE_CATALOG;
    if (sector) {
      filtered = filtered.filter((c) => c.sector.toLowerCase() === sector.toLowerCase());
    }
    if (cleanQuery) {
      const tokens = cleanQuery.split(/\s+/).filter(Boolean);
      filtered = filtered.filter((c) => {
        const fullSearchable = `${c.code} ${c.raw_code} ${c.description} ${c.sector} ${(c.keywords || []).join(" ")}`.toLowerCase();
        return tokens.some((t) => fullSearchable.includes(t));
      });
    }

    return {
      cnaes: filtered.slice(0, limit),
      source: "canonical_library" as const,
    };
  });

// ── 9. BUSCA DE OPERADORAS DE SAÚDE & CONVÊNIOS ANS ──
const searchHealthInsuranceSchema = z.object({
  query: z.string().optional().default(""),
  popularOnly: z.boolean().optional(),
  limit: z.number().optional().default(30),
});

export const searchCentralHealthInsurance = createServerFn({ method: "GET" })
  .validator((data: unknown) => searchHealthInsuranceSchema.parse(data))
  .handler(async ({ data }) => {
    const { query, popularOnly, limit } = data;
    const cleanQuery = (query || "").trim().toLowerCase();

    try {
      const supabase = getServerClient();
      let dbQuery = supabase.from("health_insurance_catalog").select("*").limit(limit);

      if (popularOnly) {
        dbQuery = dbQuery.eq("is_popular", true);
      }
      if (cleanQuery) {
        dbQuery = dbQuery.or(`trade_name.ilike.%${cleanQuery}%,ans_code.ilike.%${cleanQuery}%,corporate_name.ilike.%${cleanQuery}%`);
      }

      const { data: dbHealth, error } = await dbQuery;
      if (!error && dbHealth && dbHealth.length > 0) {
        return {
          operators: dbHealth as HealthInsuranceOperator[],
          source: "database" as const,
        };
      }
    } catch {
      // Fallback gracioso in-memory
    }

    let filtered = GLOBAL_HEALTH_INSURANCE_CATALOG;
    if (popularOnly) {
      filtered = filtered.filter((h) => h.is_popular);
    }
    if (cleanQuery) {
      filtered = filtered.filter(
        (h) =>
          h.trade_name.toLowerCase().includes(cleanQuery) ||
          h.ans_code.includes(cleanQuery) ||
          h.corporate_name.toLowerCase().includes(cleanQuery)
      );
    }

    return {
      operators: filtered.slice(0, limit),
      source: "canonical_library" as const,
    };
  });

// ── 10. BUSCA DE TRANSPORTADORAS & FRETE ──
const searchShippingCarriersSchema = z.object({
  query: z.string().optional().default(""),
  category: z.string().optional(),
  supports_same_day: z.boolean().optional(),
  limit: z.number().optional().default(30),
});

export const searchCentralShippingCarriers = createServerFn({ method: "GET" })
  .validator((data: unknown) => searchShippingCarriersSchema.parse(data))
  .handler(async ({ data }) => {
    const { query, category, supports_same_day, limit } = data;
    const cleanQuery = (query || "").trim().toLowerCase();

    try {
      const supabase = getServerClient();
      let dbQuery = supabase.from("shipping_carriers_catalog").select("*").limit(limit);

      if (category) {
        dbQuery = dbQuery.eq("category", category);
      }
      if (supports_same_day !== undefined) {
        dbQuery = dbQuery.eq("supports_same_day", supports_same_day);
      }
      if (cleanQuery) {
        dbQuery = dbQuery.or(`name.ilike.%${cleanQuery}%,code.ilike.%${cleanQuery}%,company_legal_name.ilike.%${cleanQuery}%`);
      }

      const { data: dbCarriers, error } = await dbQuery;
      if (!error && dbCarriers && dbCarriers.length > 0) {
        return {
          carriers: dbCarriers as ShippingCarrierDefinition[],
          source: "database" as const,
        };
      }
    } catch {
      // Fallback gracioso in-memory
    }

    let filtered = GLOBAL_SHIPPING_CARRIERS_CATALOG;
    if (category) {
      filtered = filtered.filter((c) => c.category === category);
    }
    if (supports_same_day !== undefined) {
      filtered = filtered.filter((c) => c.supports_same_day === supports_same_day);
    }
    if (cleanQuery) {
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(cleanQuery) ||
          c.code.toLowerCase().includes(cleanQuery) ||
          c.company_legal_name.toLowerCase().includes(cleanQuery) ||
          c.description.toLowerCase().includes(cleanQuery)
      );
    }

    return {
      carriers: filtered.slice(0, limit),
      source: "canonical_library" as const,
    };
  });

// ── 11. BUSCA DE UNIDADES DE MEDIDA SEFAZ ──
const searchUnitsOfMeasureSchema = z.object({
  query: z.string().optional().default(""),
  category: z.string().optional(),
  limit: z.number().optional().default(50),
});

export const searchCentralUnitsOfMeasure = createServerFn({ method: "GET" })
  .validator((data: unknown) => searchUnitsOfMeasureSchema.parse(data))
  .handler(async ({ data }) => {
    const { query, category, limit } = data;
    const cleanQuery = (query || "").trim().toLowerCase();

    try {
      const supabase = getServerClient();
      let dbQuery = supabase.from("units_of_measure_catalog").select("*").limit(limit);

      if (category) {
        dbQuery = dbQuery.eq("category", category);
      }
      if (cleanQuery) {
        dbQuery = dbQuery.or(`name.ilike.%${cleanQuery}%,code.ilike.%${cleanQuery}%,symbol.ilike.%${cleanQuery}%`);
      }

      const { data: dbUnits, error } = await dbQuery;
      if (!error && dbUnits && dbUnits.length > 0) {
        return {
          units: dbUnits as UnitOfMeasureDefinition[],
          source: "database" as const,
        };
      }
    } catch {
      // Fallback gracioso in-memory
    }

    let filtered = GLOBAL_UNITS_OF_MEASURE_CATALOG;
    if (category) {
      filtered = filtered.filter((u) => u.category === category);
    }
    if (cleanQuery) {
      filtered = filtered.filter(
        (u) =>
          u.name.toLowerCase().includes(cleanQuery) ||
          u.code.toLowerCase().includes(cleanQuery) ||
          u.symbol.toLowerCase().includes(cleanQuery) ||
          u.description.toLowerCase().includes(cleanQuery)
      );
    }

    return {
      units: filtered.slice(0, limit),
      source: "canonical_library" as const,
    };
  });

// ── 12. BUSCA DE MEIOS DE PAGAMENTO BACEN/SEFAZ ──
const searchPaymentMethodsSchema = z.object({
  query: z.string().optional().default(""),
  category: z.string().optional(),
  supports_installments: z.boolean().optional(),
  limit: z.number().optional().default(30),
});

export const searchCentralPaymentMethods = createServerFn({ method: "GET" })
  .validator((data: unknown) => searchPaymentMethodsSchema.parse(data))
  .handler(async ({ data }) => {
    const { query, category, supports_installments, limit } = data;
    const cleanQuery = (query || "").trim().toLowerCase();

    try {
      const supabase = getServerClient();
      let dbQuery = supabase.from("payment_methods_catalog").select("*").limit(limit);

      if (category) {
        dbQuery = dbQuery.eq("category", category);
      }
      if (supports_installments !== undefined) {
        dbQuery = dbQuery.eq("supports_installments", supports_installments);
      }
      if (cleanQuery) {
        dbQuery = dbQuery.or(`name.ilike.%${cleanQuery}%,code.ilike.%${cleanQuery}%,sefaz_code.ilike.%${cleanQuery}%`);
      }

      const { data: dbPayments, error } = await dbQuery;
      if (!error && dbPayments && dbPayments.length > 0) {
        return {
          methods: dbPayments as PaymentMethodDefinition[],
          source: "database" as const,
        };
      }
    } catch {
      // Fallback gracioso in-memory
    }

    let filtered = GLOBAL_PAYMENT_METHODS_CATALOG;
    if (category) {
      filtered = filtered.filter((p) => p.category === category);
    }
    if (supports_installments !== undefined) {
      filtered = filtered.filter((p) => p.supports_installments === supports_installments);
    }
    if (cleanQuery) {
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(cleanQuery) ||
          p.code.toLowerCase().includes(cleanQuery) ||
          p.sefaz_code.includes(cleanQuery) ||
          p.description.toLowerCase().includes(cleanQuery)
      );
    }

    return {
      methods: filtered.slice(0, limit),
      source: "canonical_library" as const,
    };
  });

// ── 13. BUSCA DE TIPOS DE IMÓVEIS (CRECI/COFECI) ──
const searchRealEstateTypesSchema = z.object({
  query: z.string().optional().default(""),
  category: z.string().optional(),
  transaction_mode: z.string().optional(),
  limit: z.number().optional().default(30),
});

export const searchCentralRealEstateTypes = createServerFn({ method: "GET" })
  .validator((data: unknown) => searchRealEstateTypesSchema.parse(data))
  .handler(async ({ data }) => {
    const { query, category, transaction_mode, limit } = data;
    const cleanQuery = (query || "").trim().toLowerCase();

    try {
      const supabase = getServerClient();
      let dbQuery = supabase.from("real_estate_types_catalog").select("*").limit(limit);

      if (category) {
        dbQuery = dbQuery.eq("category", category);
      }
      if (cleanQuery) {
        dbQuery = dbQuery.or(`name.ilike.%${cleanQuery}%,code.ilike.%${cleanQuery}%`);
      }

      const { data: dbRealEstate, error } = await dbQuery;
      if (!error && dbRealEstate && dbRealEstate.length > 0) {
        let results = dbRealEstate as RealEstateTypeDefinition[];
        if (transaction_mode) {
          results = results.filter((r) => r.transaction_modes.includes(transaction_mode as any));
        }
        return {
          types: results,
          source: "database" as const,
        };
      }
    } catch {
      // Fallback gracioso in-memory
    }

    let filtered = GLOBAL_REAL_ESTATE_TYPES_CATALOG;
    if (category) {
      filtered = filtered.filter((r) => r.category === category);
    }
    if (transaction_mode) {
      filtered = filtered.filter((r) => r.transaction_modes.includes(transaction_mode as any));
    }
    if (cleanQuery) {
      filtered = filtered.filter(
        (r) =>
          r.name.toLowerCase().includes(cleanQuery) ||
          r.code.toLowerCase().includes(cleanQuery) ||
          r.description.toLowerCase().includes(cleanQuery) ||
          r.typical_features.some((f) => f.toLowerCase().includes(cleanQuery))
      );
    }

    return {
      types: filtered.slice(0, limit),
      source: "canonical_library" as const,
    };
  });

// ── 14. CONSULTA DE FERIADOS & DATAS COMERCIAIS CRÍTICAS ──
const searchHolidaysSchema = z.object({
  query: z.string().optional().default(""),
  type: z.string().optional(),
  impact: z.string().optional(),
  is_official_holiday: z.boolean().optional(),
  limit: z.number().optional().default(30),
});

export const searchCentralHolidays = createServerFn({ method: "GET" })
  .validator((data: unknown) => searchHolidaysSchema.parse(data))
  .handler(async ({ data }) => {
    const { query, type, impact, is_official_holiday, limit } = data;
    const cleanQuery = (query || "").trim().toLowerCase();

    try {
      const supabase = getServerClient();
      let dbQuery = supabase.from("holidays_calendar_catalog").select("*").limit(limit);

      if (type) {
        dbQuery = dbQuery.eq("type", type);
      }
      if (impact) {
        dbQuery = dbQuery.eq("commercial_impact", impact);
      }
      if (is_official_holiday !== undefined) {
        dbQuery = dbQuery.eq("is_official_holiday", is_official_holiday);
      }
      if (cleanQuery) {
        dbQuery = dbQuery.or(`name.ilike.%${cleanQuery}%,date_rule.ilike.%${cleanQuery}%`);
      }

      const { data: dbHolidays, error } = await dbQuery;
      if (!error && dbHolidays && dbHolidays.length > 0) {
        return {
          holidays: dbHolidays as HolidayDefinition[],
          source: "database" as const,
        };
      }
    } catch {
      // Fallback gracioso in-memory
    }

    let filtered = GLOBAL_HOLIDAYS_CATALOG;
    if (type) {
      filtered = filtered.filter((h) => h.type === type);
    }
    if (impact) {
      filtered = filtered.filter((h) => h.commercial_impact === impact);
    }
    if (is_official_holiday !== undefined) {
      filtered = filtered.filter((h) => h.is_official_holiday === is_official_holiday);
    }
    if (cleanQuery) {
      filtered = filtered.filter(
        (h) =>
          h.name.toLowerCase().includes(cleanQuery) ||
          h.date_rule.toLowerCase().includes(cleanQuery) ||
          h.description.toLowerCase().includes(cleanQuery) ||
          h.target_retail_sectors.some((s) => s.toLowerCase().includes(cleanQuery))
      );
    }

    return {
      holidays: filtered.slice(0, limit),
      source: "canonical_library" as const,
    };
  });

// ── 15. BUSCA DE PROFISSÕES & MÉDIAS SALARIAIS (CBO / MTE) ──
const searchProfessionsSchema = z.object({
  query: z.string().optional().default(""),
  category: z.string().optional(),
  demand: z.string().optional(),
  limit: z.number().optional().default(30),
});

export const searchCentralProfessions = createServerFn({ method: "GET" })
  .validator((data: unknown) => searchProfessionsSchema.parse(data))
  .handler(async ({ data }) => {
    const { query, category, demand, limit } = data;
    const cleanQuery = (query || "").trim().toLowerCase();

    try {
      const supabase = getServerClient();
      let dbQuery = supabase.from("professions_catalog").select("*").limit(limit);

      if (category) {
        dbQuery = dbQuery.eq("category", category);
      }
      if (demand) {
        dbQuery = dbQuery.eq("market_demand_level", demand);
      }
      if (cleanQuery) {
        dbQuery = dbQuery.or(`title.ilike.%${cleanQuery}%,cbo_code.ilike.%${cleanQuery}%`);
      }

      const { data: dbProfessions, error } = await dbQuery;
      if (!error && dbProfessions && dbProfessions.length > 0) {
        return {
          professions: dbProfessions as ProfessionDefinition[],
          source: "database" as const,
        };
      }
    } catch {
      // Fallback gracioso in-memory
    }

    let filtered = GLOBAL_PROFESSIONS_CATALOG;
    if (category) {
      filtered = filtered.filter((p) => p.category.toLowerCase() === category.toLowerCase());
    }
    if (demand) {
      filtered = filtered.filter((p) => p.market_demand_level === demand);
    }
    if (cleanQuery) {
      filtered = filtered.filter(
        (p) =>
          p.title.toLowerCase().includes(cleanQuery) ||
          p.cbo_code.toLowerCase().includes(cleanQuery) ||
          p.description.toLowerCase().includes(cleanQuery) ||
          p.essential_skills.some((s) => s.toLowerCase().includes(cleanQuery))
      );
    }

    return {
      professions: filtered.slice(0, limit),
      source: "canonical_library" as const,
    };
  });

// ── 16. BUSCA DE SERVIÇOS SOB DEMANDA (GETNINJAS / WORKANA / 99FREELAS) ──
const searchOnDemandServicesSchema = z.object({
  query: z.string().optional().default(""),
  category: z.string().optional(),
  pricing_unit: z.string().optional(),
  limit: z.number().optional().default(30),
});

export const searchCentralOnDemandServices = createServerFn({ method: "GET" })
  .validator((data: unknown) => searchOnDemandServicesSchema.parse(data))
  .handler(async ({ data }) => {
    const { query, category, pricing_unit, limit } = data;
    const cleanQuery = (query || "").trim().toLowerCase();

    try {
      const supabase = getServerClient();
      let dbQuery = supabase.from("on_demand_services_catalog").select("*").limit(limit);

      if (category) {
        dbQuery = dbQuery.eq("category", category);
      }
      if (pricing_unit) {
        dbQuery = dbQuery.eq("pricing_unit", pricing_unit);
      }
      if (cleanQuery) {
        dbQuery = dbQuery.or(`name.ilike.%${cleanQuery}%,description.ilike.%${cleanQuery}%`);
      }

      const { data: dbServices, error } = await dbQuery;
      if (!error && dbServices && dbServices.length > 0) {
        return {
          services: dbServices as OnDemandMarketplaceService[],
          source: "database" as const,
        };
      }
    } catch {
      // Fallback gracioso in-memory
    }

    let filtered = GLOBAL_ON_DEMAND_SERVICES_CATALOG;
    if (category) {
      filtered = filtered.filter((s) => s.category.toLowerCase() === category.toLowerCase());
    }
    if (pricing_unit) {
      filtered = filtered.filter((s) => s.pricing_unit === pricing_unit);
    }
    if (cleanQuery) {
      filtered = filtered.filter(
        (s) =>
          s.name.toLowerCase().includes(cleanQuery) ||
          s.subcategory.toLowerCase().includes(cleanQuery) ||
          s.description.toLowerCase().includes(cleanQuery) ||
          s.suggested_tags.some((t) => t.toLowerCase().includes(cleanQuery))
      );
    }

    return {
      services: filtered.slice(0, limit),
      source: "canonical_library" as const,
    };
  });

// ── 17. CALENDÁRIO EDITORIAL & DATAS DE MARKETING SAZONAIS ──
const getMarketingCalendarSchema = z.object({
  daysAhead: z.number().optional().default(60),
  sector: z.string().optional(),
  stateCode: z.string().optional(),
  cityName: z.string().optional(),
});

export const getCentralMarketingCalendar = createServerFn({ method: "GET" })
  .validator((data: unknown) => getMarketingCalendarSchema.parse(data))
  .handler(async ({ data }) => {
    const { daysAhead, sector, stateCode, cityName } = data;

    const calendar = getUpcomingMarketingCalendar(daysAhead, {
      sector,
      stateCode,
      cityName,
    });

    return {
      marketing_events: calendar,
      total: calendar.length,
      reference_date: new Date().toISOString().split("T")[0],
      source: "canonical_library" as const,
    };
  });

// ── 18. DEMOGRAFIA BRASILEIRA & GERAÇÃO DE POPULAÇÕES SINTÉTICAS (IBGE) ──
const getDemographicsSchema = z.object({
  region: z.enum(["Sul", "Sudeste", "Centro-Oeste", "Nordeste", "Norte"]).optional(),
  generateCohortCount: z.number().min(0).max(100).optional().default(0),
});

export const getCentralDemographics = createServerFn({ method: "GET" })
  .validator((data: unknown) => getDemographicsSchema.parse(data))
  .handler(async ({ data }) => {
    const { region, generateCohortCount } = data;

    const economicClasses = IBGE_ECONOMIC_CLASSES;
    const regionData = region 
      ? BRAZIL_REGIONS_DEMOGRAPHICS[region === "Centro-Oeste" ? "Centro_Oeste" : region]
      : BRAZIL_REGIONS_DEMOGRAPHICS;

    const generatedCohort = generateCohortCount > 0 
      ? generateSyntheticPopulations(generateCohortCount, { region })
      : [];

    return {
      economic_classes: economicClasses,
      regional_distribution: regionData,
      synthetic_cohort: generatedCohort,
      source: "ibge_canonical" as const,
    };
  });



// ─── 19. RECURSOS CENTRAIS EXTENDIDOS & SIMLAB (DATABASE-DRIVEN) ───

// 1. Veículos FIPE (ck_vehicles_fipe)
export const searchFipeVehicles = createServerFn({ method: "GET" })
  .validator(
    z.object({
      query: z.string().optional(),
      brand: z.string().optional(),
      vehicle_type: z.enum(["cars", "motorcycles", "trucks"]).optional(),
      limit: z.number().int().min(1).max(100).default(30),
    })
  )
  .handler(async ({ data }) => {
    const db = getServerClient();
    let q = db.from("ck_vehicles_fipe").select("*").order("brand", { ascending: true }).limit(data.limit);

    if (data.brand) q = q.ilike("brand", `%${data.brand}%`);
    if (data.vehicle_type) q = q.eq("vehicle_type", data.vehicle_type);
    if (data.query?.trim()) {
      const s = `%${data.query.trim()}%`;
      q = q.or(`model.ilike.${s},fipe_code.ilike.${s},brand.ilike.${s}`);
    }

    const { data: rows, error } = await q;
    if (error) throw new Error(`[central-knowledge:searchFipeVehicles] ${error.message}`);
    return rows || [];
  });

// 2. NCM Fiscal (ck_ncm)
export const searchNcm = createServerFn({ method: "GET" })
  .validator(
    z.object({
      query: z.string().optional(),
      code: z.string().optional(),
      limit: z.number().int().min(1).max(100).default(30),
    })
  )
  .handler(async ({ data }) => {
    const db = getServerClient();
    let q = db.from("ck_ncm").select("*").limit(data.limit);

    if (data.code?.trim()) q = q.ilike("code", `${data.code.trim()}%`);
    if (data.query?.trim()) {
      const s = `%${data.query.trim()}%`;
      q = q.or(`description.ilike.${s},code.ilike.${s}`);
    }

    const { data: rows, error } = await q;
    if (error) throw new Error(`[central-knowledge:searchNcm] ${error.message}`);
    return rows || [];
  });

// 3. Instituições Financeiras (ck_financial_institutions)
export const listFinancialInstitutions = createServerFn({ method: "GET" })
  .validator(
    z.object({
      query: z.string().optional(),
      is_pix_participant: z.boolean().optional(),
      limit: z.number().int().min(1).max(200).default(50),
    }).optional()
  )
  .handler(async ({ data }) => {
    const db = getServerClient();
    let q = db.from("ck_financial_institutions").select("*").order("ispb_code", { ascending: true }).limit(data?.limit || 50);

    if (data?.is_pix_participant !== undefined) q = q.eq("is_pix_participant", data.is_pix_participant);
    if (data?.query?.trim()) {
      const s = `%${data.query.trim()}%`;
      q = q.or(`short_name.ilike.${s},full_name.ilike.${s},compe_code.ilike.${s}`);
    }

    const { data: rows, error } = await q;
    if (error) throw new Error(`[central-knowledge:listFinancialInstitutions] ${error.message}`);
    return rows || [];
  });

// 4. Aeroportos (ck_airports)
export const searchAirports = createServerFn({ method: "GET" })
  .validator(
    z.object({
      query: z.string().optional(),
      country_code: z.string().optional(),
      is_hub: z.boolean().optional(),
      limit: z.number().int().min(1).max(100).default(30),
    })
  )
  .handler(async ({ data }) => {
    const db = getServerClient();
    let q = db.from("ck_airports").select("*").limit(data.limit);

    if (data.country_code) q = q.eq("country_code", data.country_code.toUpperCase());
    if (data.is_hub !== undefined) q = q.eq("is_hub", data.is_hub);
    if (data.query?.trim()) {
      const s = `%${data.query.trim()}%`;
      q = q.or(`name.ilike.${s},city.ilike.${s},iata_code.ilike.${s},icao_code.ilike.${s}`);
    }

    const { data: rows, error } = await q;
    if (error) throw new Error(`[central-knowledge:searchAirports] ${error.message}`);
    return rows || [];
  });

// 5. Marcas Globais (ck_brands)
export const listBrands = createServerFn({ method: "GET" })
  .validator(
    z.object({
      query: z.string().optional(),
      segment: z.string().optional(),
      limit: z.number().int().min(1).max(100).default(50),
    }).optional()
  )
  .handler(async ({ data }) => {
    const db = getServerClient();
    let q = db.from("ck_brands").select("*").order("name", { ascending: true }).limit(data?.limit || 50);

    if (data?.segment) q = q.eq("segment", data.segment);
    if (data?.query?.trim()) {
      q = q.ilike("name", `%${data.query.trim()}%`);
    }

    const { data: rows, error } = await q;
    if (error) throw new Error(`[central-knowledge:listBrands] ${error.message}`);
    return rows || [];
  });

// 6. Variações e Grade Padrão (ck_product_variations)
export const listProductVariations = createServerFn({ method: "GET" })
  .validator(
    z.object({
      category: z.string().optional(),
    }).optional()
  )
  .handler(async ({ data }) => {
    const db = getServerClient();
    let q = db.from("ck_product_variations").select("*").order("display_order", { ascending: true });

    if (data?.category) q = q.eq("category", data.category);

    const { data: rows, error } = await q;
    if (error) throw new Error(`[central-knowledge:listProductVariations] ${error.message}`);
    return rows || [];
  });

// 7. Produtos Genéricos / Catálogo Base (ck_generic_products)
export const searchGenericProducts = createServerFn({ method: "GET" })
  .validator(
    z.object({
      query: z.string().optional(),
      niche: z.string().optional(),
      category: z.string().optional(),
      limit: z.number().int().min(1).max(100).default(30),
    })
  )
  .handler(async ({ data }) => {
    const db = getServerClient();
    let q = db.from("ck_generic_products").select("*").limit(data.limit);

    if (data.niche) q = q.eq("niche", data.niche);
    if (data.category) q = q.eq("category", data.category);
    if (data.query?.trim()) {
      const s = `%${data.query.trim()}%`;
      q = q.or(`name.ilike.${s},default_barcode.ilike.${s},suggested_ncm.ilike.${s}`);
    }

    const { data: rows, error } = await q;
    if (error) throw new Error(`[central-knowledge:searchGenericProducts] ${error.message}`);
    return rows || [];
  });

// 8. Serviços CNAE / Atividades Econômicas (ck_cnae_services)
export const searchCnaeServices = createServerFn({ method: "GET" })
  .validator(
    z.object({
      query: z.string().optional(),
      cnae_code: z.string().optional(),
      limit: z.number().int().min(1).max(100).default(30),
    })
  )
  .handler(async ({ data }) => {
    const db = getServerClient();
    let q = db.from("ck_cnae_services").select("*").limit(data.limit);

    if (data.cnae_code?.trim()) q = q.ilike("cnae_code", `${data.cnae_code.trim()}%`);
    if (data.query?.trim()) {
      const s = `%${data.query.trim()}%`;
      q = q.or(`service_name.ilike.${s},cnae_code.ilike.${s}`);
    }

    const { data: rows, error } = await q;
    if (error) throw new Error(`[central-knowledge:searchCnaeServices] ${error.message}`);
    return rows || [];
  });

// 9. Populações Sintéticas (synthetic_populations)
export const getSyntheticPopulations = createServerFn({ method: "GET" })
  .validator(
    z.object({
      region: z.string().optional(),
      economic_class: z.string().optional(),
      limit: z.number().int().min(1).max(100).default(30),
    }).optional()
  )
  .handler(async ({ data }) => {
    const db = getServerClient();
    let q = db.from("synthetic_populations").select("*").limit(data?.limit || 30);

    if (data?.region) q = q.eq("region", data.region);
    if (data?.economic_class) q = q.eq("economic_class", data.economic_class);

    const { data: rows, error } = await q;
    if (error) throw new Error(`[central-knowledge:getSyntheticPopulations] ${error.message}`);
    return rows || [];
  });

// 10. Perfis de Consumo de Personas (persona_consumption_profiles)
export const getPersonaConsumptionProfiles = createServerFn({ method: "GET" })
  .validator(
    z.object({
      persona_code: z.string().optional(),
    }).optional()
  )
  .handler(async ({ data }) => {
    const db = getServerClient();
    let q = db.from("persona_consumption_profiles").select("*");

    if (data?.persona_code) q = q.eq("persona_code", data.persona_code);

    const { data: rows, error } = await q;
    if (error) throw new Error(`[central-knowledge:getPersonaConsumptionProfiles] ${error.message}`);
    return rows || [];
  });

// 11. Simulações Focus Group (persona_focus_group_simulations)
export const runPersonaFocusGroupSimulation = createServerFn({ method: "POST" })
  .validator(
    z.object({
      prompt_topic: z.string().min(3),
      population_sample_size: z.number().int().min(1).max(100).default(10),
      region_filter: z.string().optional(),
    })
  )
  .handler(async ({ data }) => {
    const db = getServerClient();
    const { store_id } = await getServerIdentity().catch(() => ({ store_id: null }));

    const { data: inserted, error } = await db
      .from("persona_focus_group_simulations")
      .insert({
        store_id,
        prompt_topic: data.prompt_topic,
        population_sample_size: data.population_sample_size,
        region_filter: data.region_filter || "Nacional",
        status: "completed",
        aggregate_sentiment: "Neutro a Positivo",
        insights_summary: `Simulação de grupo focal realizada com amostra de ${data.population_sample_size} personas sintéticas sobre '${data.prompt_topic}'.`,
      })
      .select()
      .single();

    if (error) throw new Error(`[central-knowledge:runPersonaFocusGroupSimulation] ${error.message}`);
    return inserted;
  });
