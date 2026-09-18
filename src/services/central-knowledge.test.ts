/**
 * central-knowledge.test.ts
 * Testes unitários para validação de dados centrais:
 * - Malha Aérea & Aeroportos Globais (IATA/ICAO)
 * - Catálogo Mestre de Produtos & Inteligência Fiscal (NCM, CEST, IBS/CBS)
 * - Hub Jurídico & Modelos de Contratos com Interpolação de Variáveis
 * - Banco Hoteleiro & Resorts com Amenidades e Quartos
 */

import { describe, it, expect, vi } from "vitest";

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

import { searchGlobalAirports } from "./tourism-airports.functions";
import { searchMasterCatalogProducts, lookupNcmTributes } from "./master-catalog.functions";
import { listContractTemplates, generateContractDocument } from "./contracts.functions";
import { GLOBAL_HOTELS_RESORTS_CATALOG } from "@/lib/data/hotels-resorts-catalog";
import {
  calculateEasterSunday,
  getHolidaysForYear,
  getHolidayOnDate,
  getSuggestedSurgeMultiplierForDate,
} from "@/lib/data/holidays-calendar-catalog";
import {
  searchCentralVehicles,
  searchCentralServices,
  searchCentralCities,
  searchCentralFinancialInstitutions,
  searchCentralCountries,
  searchCentralAirlines,
  searchCentralCruises,
  searchCentralCnae,
  searchCentralHealthInsurance,
  searchCentralShippingCarriers,
  searchCentralUnitsOfMeasure,
  searchCentralPaymentMethods,
  searchCentralRealEstateTypes,
  searchCentralHolidays,
} from "./central-knowledge.functions";

describe("Banco Central de Conhecimento & Dados Globais (Waesy Enterprise)", () => {
  describe("1. Malha Aérea & Aeroportos Globais", () => {
    it("deve encontrar aeroporto por código IATA exato (ex: GRU)", async () => {
      const result = await searchGlobalAirports({ data: { query: "GRU" } });
      expect(result.airports.length).toBeGreaterThan(0);
      const gru = result.airports.find((a) => a.iata_code === "GRU");
      expect(gru).toBeDefined();
      expect(gru?.city).toContain("São Paulo");
      expect(gru?.country_code).toBe("BR");
      expect(gru?.is_commercial).toBe(true);
    });

    it("deve encontrar aeroportos regionais do interior (ex: XAP - Chapecó)", async () => {
      const result = await searchGlobalAirports({ data: { query: "Chapecó" } });
      expect(result.airports.length).toBeGreaterThan(0);
      const xap = result.airports.find((a) => a.iata_code === "XAP");
      expect(xap).toBeDefined();
      expect(xap?.state_province).toBe("SC");
    });

    it("deve encontrar hubs mundiais dos Estados Unidos (ex: MCO - Orlando)", async () => {
      const result = await searchGlobalAirports({ data: { query: "MCO" } });
      expect(result.airports.length).toBeGreaterThan(0);
      const mco = result.airports.find((a) => a.iata_code === "MCO");
      expect(mco).toBeDefined();
      expect(mco?.country).toBe("Estados Unidos");
    });
  });

  describe("2. Catálogo Mestre de Produtos & Inteligência Fiscal (Reforma Tributária)", () => {
    it("deve localizar produto por código de barras EAN-13 (ex: Coca-Cola 2L)", async () => {
      const result = await searchMasterCatalogProducts({
        data: { barcode: "7894900010015" },
      });
      expect(result.products.length).toBe(1);
      const coke = result.products[0];
      expect(coke.name).toContain("Coca-Cola");
      expect(coke.ncm_code).toBe("2202.10.00");
      expect(coke.cest_code).toBe("03.007.00");
      expect(coke.cfop_default).toBe("5405"); // Substituição Tributária
      expect(coke.ibs_rate).toBeGreaterThan(0);
      expect(coke.cbs_rate).toBeGreaterThan(0);
    });

    it("deve classificar itens da Cesta Básica Nacional com alíquota zero de IBS e CBS", async () => {
      const result = await searchMasterCatalogProducts({
        data: { query: "Arroz" },
      });
      const arroz = result.products.find((p) => p.name.includes("Tio João"));
      expect(arroz).toBeDefined();
      expect(arroz?.ncm_code).toBe("1006.30.21");
      expect(arroz?.ibs_rate).toBe(0.0);
      expect(arroz?.cbs_rate).toBe(0.0);
      expect(arroz?.tax_tribute_group).toBe("isento_cesta_basica");
    });

    it("deve consultar tabela oficial NCM/CEST por código numérico", async () => {
      const result = await lookupNcmTributes({
        data: { ncmCode: "10063021" },
      });
      expect(result.tributes.length).toBeGreaterThan(0);
      expect(result.tributes[0].desc).toContain("Arroz");
    });
  });

  describe("3. Biblioteca Central de Minutas Jurídicas & Interpolação", () => {
    it("deve listar minutas jurídicas com todas as cláusulas e referências legais", async () => {
      const result = await listContractTemplates({ data: {} });
      expect(result.templates.length).toBeGreaterThanOrEqual(9);
      
      const prestacao = result.templates.find((t) => t.id === "template-prestacao-servicos");
      expect(prestacao).toBeDefined();
      expect(prestacao?.legal_framework).toContain("Código Civil");
      expect(prestacao?.clauses.length).toBeGreaterThanOrEqual(5);
    });

    it("deve compilar contrato interpolando todas as variáveis canônicas", async () => {
      const compiled = await generateContractDocument({
        data: {
          templateId: "template-prestacao-servicos",
          variables: {
            contratante_nome: "Acme Indústria Ltda",
            contratante_documento: "12.345.678/0001-90",
            descricao_servicos: "Consultoria em Governança de TI",
            valor_total: "R$ 15.000,00",
            forma_pagamento: "3 parcelas de R$ 5.000,00",
            prazo_vigencia: "6 meses",
            foro_cidade: "São Miguel do Oeste - SC",
          },
        },
      });

      expect(compiled.title).toContain("Prestação de Serviços");
      const clause1 = compiled.compiledClauses[0];
      expect(clause1.content).toContain("Consultoria em Governança de TI");
      expect(clause1.content).not.toContain("{{descricao_servicos}}");

      const clause4 = compiled.compiledClauses.find((c) => c.title.includes("PREÇO"));
      expect(clause4?.content).toContain("R$ 15.000,00");
      expect(clause4?.content).toContain("3 parcelas de R$ 5.000,00");
    });
  });

  describe("4. Banco Central de Hotéis e Resorts", () => {
    it("deve conter grandes resorts do Brasil com estrutura e categorias de quartos", () => {
      expect(GLOBAL_HOTELS_RESORTS_CATALOG.length).toBeGreaterThanOrEqual(5);

      const salinas = GLOBAL_HOTELS_RESORTS_CATALOG.find((h) => h.name.includes("Salinas do Maragogi"));
      expect(salinas).toBeDefined();
      expect(salinas?.stars).toBe(5);
      expect(salinas?.regime_options).toContain("All Inclusive");
      expect(salinas?.structure.beachfront).toBe(true);
      expect(salinas?.structure.water_park).toBe(true);
      expect(salinas?.room_categories.length).toBeGreaterThan(0);
      expect(salinas?.room_categories[0].amenities.length).toBeGreaterThan(3);
    });
  });

  describe("5. Catálogo Centralizado de Veículos, Motos e Utilitários", () => {
    it("deve buscar veículos por modelo e categoria (ex: Hilux, Fiorino, CG 160)", async () => {
      const hiluxRes = await searchCentralVehicles({ data: { query: "Hilux" } });
      expect(hiluxRes.vehicles.length).toBeGreaterThan(0);
      expect(hiluxRes.vehicles[0].brand).toBe("Toyota");

      const fiorinoRes = await searchCentralVehicles({ data: { query: "Fiorino" } });
      expect(fiorinoRes.vehicles.length).toBeGreaterThan(0);
      expect(fiorinoRes.vehicles[0].category).toBe("Comercial");

      const motoRes = await searchCentralVehicles({ data: { category: "Motocicleta" } });
      expect(motoRes.vehicles.length).toBeGreaterThanOrEqual(5);
      const cg = motoRes.vehicles.find((m) => m.model.includes("CG 160"));
      expect(cg).toBeDefined();
    });
  });

  describe("6. Catálogo Nacional de Serviços Regulamentados (LC 116/03 & NBS)", () => {
    it("deve buscar serviços por código LC 116 e CNAE (ex: Software, Medicina, Mudança)", async () => {
      const devRes = await searchCentralServices({ data: { query: "Software" } });
      expect(devRes.services.length).toBeGreaterThan(0);
      expect(devRes.services[0].code_lc116).toBe("1.01");
      expect(devRes.services[0].cnae_principal).toBe("6201-5/01");

      const medRes = await searchCentralServices({ data: { query: "Consulta Médica" } });
      expect(medRes.services.length).toBeGreaterThan(0);
      expect(medRes.services[0].regulatory_body).toContain("CRM");

      const freteRes = await searchCentralServices({ data: { query: "Mudanças" } });
      expect(freteRes.services.length).toBeGreaterThan(0);
      expect(freteRes.services[0].code_lc116).toBe("16.02");
    });
  });

  describe("7. Banco Central de Cidades e Municípios do Brasil (IBGE)", () => {
    it("deve localizar municípios por nome, DDD e estado (ex: São Miguel do Oeste, Chapecó)", async () => {
      const smoRes = await searchCentralCities({ data: { query: "São Miguel do Oeste" } });
      expect(smoRes.cities.length).toBeGreaterThan(0);
      const smo = smoRes.cities[0];
      expect(smo.ibge_code).toBe("4217203");
      expect(smo.state).toBe("SC");
      expect(smo.ddd).toBe("49");
      expect(smo.nearest_airport_iata).toBe("XAP");

      const chapRes = await searchCentralCities({ data: { query: "Chapecó" } });
      expect(chapRes.cities.length).toBeGreaterThan(0);
      expect(chapRes.cities[0].ibge_code).toBe("4204202");
    });

    it("deve filtrar capitais e polos turísticos", async () => {
      const touristRes = await searchCentralCities({ data: { isTourismHub: true, limit: 50 } });
      expect(touristRes.cities.length).toBeGreaterThanOrEqual(10);
      const gramado = touristRes.cities.find((c) => c.name.includes("Gramado"));
      expect(gramado).toBeDefined();
    });
  });

  describe("8. Instituições Financeiras do Brasil (BACEN / COMPE / ISPB / PIX)", () => {
    it("deve buscar instituições financeiras por código COMPE ou nome (ex: 001 Banco do Brasil, 260 Nubank, 748 Sicredi)", async () => {
      const bbRes = await searchCentralFinancialInstitutions({ data: { query: "001" } });
      expect(bbRes.institutions.length).toBeGreaterThan(0);
      expect(bbRes.institutions[0].short_name).toBe("Banco do Brasil");
      expect(bbRes.institutions[0].supports_pix).toBe(true);

      const nuRes = await searchCentralFinancialInstitutions({ data: { query: "Nubank" } });
      expect(nuRes.institutions.length).toBeGreaterThan(0);
      expect(nuRes.institutions[0].compe_code).toBe("260");

      const sicrediRes = await searchCentralFinancialInstitutions({ data: { query: "Sicredi" } });
      expect(sicrediRes.institutions.length).toBeGreaterThan(0);
      expect(sicrediRes.institutions[0].compe_code).toBe("748");
      expect(sicrediRes.institutions[0].type).toBe("cooperativa");
    });
  });

  describe("9. Países, Moedas e DDI Internacional (ISO 3166 / ISO 4217)", () => {
    it("deve consultar países com códigos ISO, moedas oficiais e DDI (ex: BR, US, AR, PT, AE)", async () => {
      const brRes = await searchCentralCountries({ data: { query: "Brasil" } });
      expect(brRes.countries.length).toBeGreaterThan(0);
      expect(brRes.countries[0].iso_alpha2).toBe("BR");
      expect(brRes.countries[0].currency_code).toBe("BRL");
      expect(brRes.countries[0].currency_symbol).toBe("R$");
      expect(brRes.countries[0].phone_ddi).toBe("+55");

      const usaRes = await searchCentralCountries({ data: { query: "USD" } });
      expect(usaRes.countries.length).toBeGreaterThan(0);
      expect(usaRes.countries[0].iso_alpha2).toBe("US");
      expect(usaRes.countries[0].phone_ddi).toBe("+1");
    });
  });

  describe("10. Companhias Aéreas Globais e Nacionais (IATA / ICAO)", () => {
    it("deve buscar companhias aéreas por código IATA ou nome (ex: LA LATAM, G3 Gol, AD Azul, TP TAP)", async () => {
      const latamRes = await searchCentralAirlines({ data: { query: "LA" } });
      expect(latamRes.airlines.length).toBeGreaterThan(0);
      expect(latamRes.airlines[0].name).toContain("LATAM");
      expect(latamRes.airlines[0].is_brazilian_domestic).toBe(true);

      const tapRes = await searchCentralAirlines({ data: { query: "TAP" } });
      expect(tapRes.airlines.length).toBeGreaterThan(0);
      expect(tapRes.airlines[0].country).toBe("Portugal");
      expect(tapRes.airlines[0].alliance).toBe("Star Alliance");

      const domesticRes = await searchCentralAirlines({ data: { domesticOnly: true } });
      expect(domesticRes.airlines.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("11. Companhias Marítimas & Frotas de Cruzeiros", () => {
    it("deve buscar armadoras com navios e portos de embarque no Brasil (ex: MSC, Costa, Disney)", async () => {
      const mscRes = await searchCentralCruises({ data: { query: "MSC" } });
      expect(mscRes.cruises.length).toBeGreaterThan(0);
      expect(mscRes.cruises[0].name).toContain("MSC");
      expect(mscRes.cruises[0].departure_ports_brazil).toContain("Santos (SP)");
      expect(mscRes.cruises[0].featured_ships_brazil.length).toBeGreaterThan(2);

      const disneyRes = await searchCentralCruises({ data: { query: "Disney" } });
      expect(disneyRes.cruises.length).toBeGreaterThan(0);
      expect(disneyRes.cruises[0].style).toBe("Premium");
    });
  });

  describe("12. Tabela Nacional de CNAEs & Simples Nacional", () => {
    it("deve buscar CNAE por código ou palavra-chave com indicação de Anexo e Fator R (ex: Software, Mercado, Farmácia)", async () => {
      const devRes = await searchCentralCnae({ data: { query: "6201-5/01" } });
      expect(devRes.cnaes.length).toBeGreaterThan(0);
      expect(devRes.cnaes[0].description).toContain("Desenvolvimento de programas");
      expect(devRes.cnaes[0].simples_nacional_anexo).toContain("Anexo V");
      expect(devRes.cnaes[0].fator_r_applies).toBe(true);

      const mercadoRes = await searchCentralCnae({ data: { query: "mercado" } });
      expect(mercadoRes.cnaes.length).toBeGreaterThan(0);
      expect(mercadoRes.cnaes[0].simples_nacional_anexo).toContain("Anexo I");

      const farmaciaRes = await searchCentralCnae({ data: { query: "farmácia" } });
      expect(farmaciaRes.cnaes.length).toBeGreaterThan(0);
      expect(farmaciaRes.cnaes[0].raw_code).toBe("4771701");
    });
  });

  describe("13. Operadoras de Saúde & Convênios Médicos (ANS)", () => {
    it("deve buscar convênios por nome ou código ANS (ex: Bradesco, Amil, Unimed)", async () => {
      const bradescoRes = await searchCentralHealthInsurance({ data: { query: "Bradesco" } });
      expect(bradescoRes.operators.length).toBeGreaterThan(0);
      expect(bradescoRes.operators[0].ans_code).toBe("000574");
      expect(bradescoRes.operators[0].coverage_type).toBe("Nacional");
      expect(bradescoRes.operators[0].accepts_tiss_electronic).toBe(true);

      const unimedRes = await searchCentralHealthInsurance({ data: { query: "Unimed" } });
      expect(unimedRes.operators.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("14. Transportadoras & Logística (ANTT / Correios / Couriers)", () => {
    it("deve buscar transportadoras por nome, código ou categoria (ex: SEDEX, Jadlog, MotoLink)", async () => {
      const sedexRes = await searchCentralShippingCarriers({ data: { query: "SEDEX" } });
      expect(sedexRes.carriers.length).toBeGreaterThan(0);
      expect(sedexRes.carriers[0].code).toBe("CORREIOS_SEDEX");
      expect(sedexRes.carriers[0].supports_reverse_logistics).toBe(true);

      const jadlogRes = await searchCentralShippingCarriers({ data: { category: "express_courier" } });
      expect(jadlogRes.carriers.length).toBeGreaterThanOrEqual(2);

      const motoRes = await searchCentralShippingCarriers({ data: { supports_same_day: true } });
      expect(motoRes.carriers.some((c) => c.code === "MOTOLINK_WAESY")).toBe(true);
    });
  });

  describe("15. Unidades de Medida Oficiais SEFAZ / NF-e", () => {
    it("deve buscar unidades por código ou símbolo com indicação de fracionamento (ex: UN, KG, LT, M2)", async () => {
      const unRes = await searchCentralUnitsOfMeasure({ data: { query: "UN" } });
      expect(unRes.units.length).toBeGreaterThan(0);
      expect(unRes.units[0].code).toBe("UN");
      expect(unRes.units[0].is_fractionable).toBe(false);

      const kgRes = await searchCentralUnitsOfMeasure({ data: { query: "kg" } });
      expect(kgRes.units.length).toBeGreaterThan(0);
      expect(kgRes.units[0].is_fractionable).toBe(true);

      const areaRes = await searchCentralUnitsOfMeasure({ data: { category: "area" } });
      expect(areaRes.units.some((u) => u.code === "M2")).toBe(true);
    });
  });

  describe("16. Meios de Pagamento SEFAZ/BACEN & PIX", () => {
    it("deve buscar meios de pagamento por código SEFAZ ou nome (ex: PIX, Crédito, Dinheiro)", async () => {
      const pixRes = await searchCentralPaymentMethods({ data: { query: "PIX" } });
      expect(pixRes.methods.length).toBeGreaterThan(0);
      expect(pixRes.methods[0].sefaz_code).toBe("17");
      expect(pixRes.methods[0].is_instant).toBe(true);
      expect(pixRes.methods[0].settlement_days).toBe(0);

      const creditRes = await searchCentralPaymentMethods({ data: { supports_installments: true } });
      expect(creditRes.methods.some((m) => m.code === "CREDIT_CARD")).toBe(true);
    });
  });

  describe("17. Classificação e Tipos de Imóveis CRECI/COFECI", () => {
    it("deve buscar imóveis por categoria, modo de transação ou características (ex: Apartamento, Galpão, Fazenda)", async () => {
      const aptoRes = await searchCentralRealEstateTypes({ data: { query: "Apartamento" } });
      expect(aptoRes.types.length).toBeGreaterThan(0);
      expect(aptoRes.types[0].requires_bedrooms).toBe(true);
      expect(aptoRes.types[0].transaction_modes).toContain("locacao");

      const galpaoRes = await searchCentralRealEstateTypes({ data: { category: "industrial" } });
      expect(galpaoRes.types.length).toBeGreaterThan(0);
      expect(galpaoRes.types[0].code).toBe("GALPAO_LOGISTICO");
    });
  });

  describe("18. Calendário de Feriados & Picos Comerciais", () => {
    it("deve buscar feriados e datas de pico comercial com multiplicador de surge sugerido (ex: Black Friday, Natal, Dia das Mães)", async () => {
      const bfRes = await searchCentralHolidays({ data: { query: "Black Friday" } });
      expect(bfRes.holidays.length).toBeGreaterThan(0);
      expect(bfRes.holidays[0].commercial_impact).toBe("extremo");
      expect(bfRes.holidays[0].surge_multiplier_suggested).toBeGreaterThan(1.3);

      const natalRes = await searchCentralHolidays({ data: { query: "Natal", is_official_holiday: true } });
      expect(natalRes.holidays.length).toBeGreaterThan(0);
      const natal = natalRes.holidays.find((h) => h.id === "holiday-natal");
      expect(natal).toBeDefined();
      expect(natal?.is_official_holiday).toBe(true);
      expect(natal?.commercial_impact).toBe("extremo");
    });

    it("deve calcular datas móveis de feriados e picos de 2026 com exatidão astronômica", () => {
      // Páscoa de 2026 cai em 05 de Abril
      const easter2026 = calculateEasterSunday(2026);
      expect(easter2026.month).toBe(4);
      expect(easter2026.day).toBe(5);

      const holidays2026 = getHolidaysForYear(2026);
      expect(holidays2026.length).toBeGreaterThanOrEqual(19);

      // Sexta-feira Santa 2026: 03 de Abril
      const sextaSanta = holidays2026.find((h) => h.id === "holiday-sexta-feira-santa");
      expect(sextaSanta?.date).toBe("2026-04-03");

      // Carnaval 2026: 17 de Fevereiro
      const carnaval = holidays2026.find((h) => h.id === "holiday-carnaval-terca");
      expect(carnaval?.date).toBe("2026-02-17");

      // Corpus Christi 2026: 04 de Junho
      const corpus = holidays2026.find((h) => h.id === "holiday-corpus-christi");
      expect(corpus?.date).toBe("2026-06-04");

      // Dia das Mães 2026: 10 de Maio (2º domingo)
      const maes = holidays2026.find((h) => h.id === "holiday-dia-das-maes");
      expect(maes?.date).toBe("2026-05-10");

      // Black Friday 2026: 27 de Novembro (4ª sexta-feira)
      const bf = holidays2026.find((h) => h.id === "holiday-black-friday");
      expect(bf?.date).toBe("2026-11-27");

      // Cyber Monday 2026: 30 de Novembro
      const cm = holidays2026.find((h) => h.id === "holiday-cyber-monday");
      expect(cm?.date).toBe("2026-11-30");

      // Verifica consulta por data específica
      const onChristmas = getHolidayOnDate("2026-12-25");
      expect(onChristmas?.name).toBe("Natal");

      // Verifica multiplicador de surge sugerido
      const surgeMultiplierChristmas = getSuggestedSurgeMultiplierForDate("2026-12-25");
      expect(surgeMultiplierChristmas).toBe(1.60);

      const surgeNormalDay = getSuggestedSurgeMultiplierForDate("2026-07-15");
      expect(surgeNormalDay).toBe(1.00);
    });
  });
});
