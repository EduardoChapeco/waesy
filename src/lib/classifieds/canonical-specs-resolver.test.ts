import { describe, it, expect } from "vitest";
import { resolveClassifiedDetailedSpecs } from "./canonical-specs-resolver";
import { formatMoney } from "@/lib/money";

describe("resolveClassifiedDetailedSpecs", () => {
  it("retorna array vazio para anúncio nulo ou indefinido", () => {
    expect(resolveClassifiedDetailedSpecs(null)).toEqual([]);
    expect(resolveClassifiedDetailedSpecs(undefined)).toEqual([]);
  });

  it("resolve corretamente atributos de veículos com chaves divergentes (year_fab/year_model e mileage_km)", () => {
    const vehicleAd = {
      category: "vehicle",
      condition: "seminovo",
      attributes: {
        brand: "Toyota",
        model: "Corolla",
        version: "2.0 XEi",
        year_fab: 2022,
        year_model: 2023,
        mileage_km: 28500,
        fuel_type: "Flex",
        transmission: "Automático CVT",
        color: "Prata",
        features: ["Bancos de Couro", "Sensor de Ré"],
      },
    };

    const specs = resolveClassifiedDetailedSpecs(vehicleAd);
    expect(specs).toEqual(
      expect.arrayContaining([
        { label: "Condição", value: "Seminovo Impecável", category: "technical", highlight: true },
        { label: "Marca", value: "Toyota", category: "technical" },
        { label: "Modelo", value: "Corolla", category: "technical" },
        { label: "Versão", value: "2.0 XEi", category: "technical" },
        { label: "Ano", value: "2022/2023", category: "technical" },
        { label: "Quilometragem", value: "28.500 km", category: "technical" },
        { label: "Combustível", value: "Flex", category: "technical" },
        { label: "Câmbio", value: "Automático CVT", category: "technical" },
        { label: "Cor", value: "Prata", category: "technical" },
        { label: "Opcionais", value: "Bancos de Couro, Sensor de Ré", category: "technical" },
      ])
    );
  });

  it("resolve corretamente atributos de imóveis (parking_spots, suítes, condomínio, IPTU)", () => {
    const realEstateAd = {
      category: "real_estate",
      property_type: "Apartamento",
      deal_type: "venda",
      area_sqm: 110,
      bedrooms: 3,
      suites: 1,
      bathrooms: 2,
      parking_spots: 2,
      attributes: {
        condo_cents: 65000,
        iptu_cents: 12000,
        furnished: true,
      },
    };

    const specs = resolveClassifiedDetailedSpecs(realEstateAd);
    expect(specs).toEqual(
      expect.arrayContaining([
        { label: "Tipo de Imóvel", value: "Apartamento", category: "technical" },
        { label: "Finalidade", value: "Venda", category: "commercial" },
        { label: "Área Útil", value: "110 m²", category: "dimensions" },
        { label: "Quartos", value: "3", category: "technical" },
        { label: "Suítes", value: "1", category: "technical" },
        { label: "Banheiros", value: "2", category: "technical" },
        { label: "Vagas", value: "2", category: "technical" },
        { label: "Condomínio", value: formatMoney(65000), category: "commercial" },
        { label: "IPTU", value: formatMoney(12000), category: "commercial" },
        { label: "Mobiliado", value: "Sim, completo", category: "technical" },
      ])
    );
  });

  it("resolve serviços com modalidade, horários e duração média", () => {
    const serviceAd = {
      category: "service",
      service_duration_minutes: 90,
      attributes: {
        modality: "domicilio",
        service_area: "Zona Sul de São Paulo",
        service_subniche: "Manutenção Elétrica",
        working_hours_start: "08:00",
        working_hours_end: "18:00",
        available_weekdays: ["Seg", "Ter", "Qua", "Qui", "Sex"],
      },
    };

    const specs = resolveClassifiedDetailedSpecs(serviceAd);
    expect(specs).toEqual(
      expect.arrayContaining([
        { label: "Modalidade", value: "Atendimento a Domicílio", category: "technical" },
        { label: "Região de Atendimento", value: "Zona Sul de São Paulo", category: "logistics" },
        { label: "Duração Média", value: "90 minutos", category: "technical" },
        { label: "Especialidade", value: "Manutenção Elétrica", category: "technical" },
        { label: "Horário de Atendimento", value: "08:00 às 18:00", category: "logistics" },
        { label: "Dias de Atendimento", value: "Seg, Ter, Qua, Qui, Sex", category: "logistics" },
      ])
    );
  });

  it("resolve negócios (M&A) com faturamento e lucro líquido", () => {
    const businessAd = {
      category: "business",
      attributes: {
        business_type: "Franquia de Cafeteria",
        business_segment: "Alimentação & Bebidas",
        monthly_revenue_cents: 8500000,
        net_profit_cents: 1800000,
        employees_range: "5 a 10 funcionários",
        foundation_year: "2019",
      },
    };

    const specs = resolveClassifiedDetailedSpecs(businessAd);
    expect(specs).toEqual(
      expect.arrayContaining([
        { label: "Modelo de Negócio", value: "Franquia de Cafeteria", category: "technical" },
        { label: "Segmento", value: "Alimentação & Bebidas", category: "technical" },
        { label: "Faturamento Médio", value: `${formatMoney(8500000)}/mês`, category: "commercial", highlight: true },
        { label: "Lucro Líquido", value: `${formatMoney(1800000)}/mês`, category: "commercial", highlight: true },
        { label: "Funcionários", value: "5 a 10 funcionários", category: "technical" },
        { label: "Fundação", value: "2019", category: "technical" },
      ])
    );
  });
});
