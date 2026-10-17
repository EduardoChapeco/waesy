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
        { label: "Ano", value: "2022/2023", category: "technical", highlight: true },
        { label: "Quilometragem", value: "28.500 km", category: "technical", highlight: true },
        { label: "Combustível", value: "Flex", category: "technical", highlight: true },
        { label: "Câmbio", value: "Automático CVT", category: "technical", highlight: true },
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
        { label: "Área Útil", value: "110 m²", category: "dimensions", highlight: true },
        { label: "Quartos", value: "3", category: "technical", highlight: true },
        { label: "Suítes", value: "1", category: "technical", highlight: true },
        { label: "Banheiros", value: "2", category: "technical" },
        { label: "Vagas", value: "2", category: "technical", highlight: true },
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
        { label: "Modalidade", value: "Atendimento a Domicílio", category: "technical", highlight: true },
        { label: "Região de Atendimento", value: "Zona Sul de São Paulo", category: "logistics", highlight: true },
        { label: "Duração Média", value: "90 minutos", category: "technical", highlight: true },
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

  it("garante isolamento estrito de turismo (Invariante B.37), sem vazar Finalidade: Venda ou Logística: Retirada no Local", () => {
    const travelAd = {
      category: "travel",
      deal_type: "venda", // resíduo default da tabela
      delivery_mode: "pickup", // resíduo default da tabela
      attributes: {
        destination_city: "Cancún, México",
        departure_city: "Chapecó, SC",
        duration_text: "7 dias e 6 noites",
        transport_type: "airplane",
        meal_plan: "all_inclusive",
        passenger_composition: { adults: 2, children: 1 },
        cancellation_policy: "flexible",
      },
    };

    const specs = resolveClassifiedDetailedSpecs(travelAd);

    // Deve conter especificações legítimas de viagem
    expect(specs).toEqual(
      expect.arrayContaining([
        { label: "Destino", value: "Cancún, México", category: "logistics", highlight: true },
        { label: "Origem", value: "Chapecó, SC", category: "logistics" },
        { label: "Duração", value: "7 dias e 6 noites", category: "logistics", highlight: true },
        { label: "Transporte", value: "Aéreo Regular", category: "logistics", highlight: true },
        { label: "Regime Alimentar", value: "All Inclusive", category: "technical", highlight: true },
        { label: "Passageiros", value: "2 Adulto(s) + 1 Criança(s)", category: "technical" },
        { label: "Cancelamento", value: "Flexível", category: "commercial" },
      ])
    );

    // NÃO deve vazar 'Finalidade: Venda', 'Logística: Retirada no Local' ou 'Capacidade: Até 1 hóspedes'
    const labels = specs.map((s) => s.label);
    expect(labels).not.toContain("Finalidade");
    expect(labels).not.toContain("Logística");
    expect(labels).not.toContain("Capacidade");
  });
});

