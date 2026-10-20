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

  it("resolve sinônimos de atributos cadastrados pelo Workspace Catalog (usable_area, parking_spaces, license_plate_end, dimensions)", () => {
    const catalogItem = {
      category: "real_estate",
      attributes: {
        usable_area: 88,
        total_area: 120,
        parking_spaces: 2,
        bedrooms: 2,
      },
    };

    const specsRealEstate = resolveClassifiedDetailedSpecs(catalogItem);
    expect(specsRealEstate).toEqual(
      expect.arrayContaining([
        { label: "Área Útil", value: "88 m²", category: "dimensions", highlight: true },
        { label: "Área Total", value: "120 m²", category: "dimensions" },
        { label: "Vagas", value: "2", category: "technical", highlight: true },
      ])
    );

    const vehicleCatalogItem = {
      category: "vehicle",
      attributes: {
        brand: "Honda",
        model: "Civic",
        year: "2021",
        license_plate_end: "9",
        mileage: 45000,
      },
    };

    const specsVehicle = resolveClassifiedDetailedSpecs(vehicleCatalogItem);
    expect(specsVehicle).toEqual(
      expect.arrayContaining([
        { label: "Marca", value: "Honda", category: "technical" },
        { label: "Modelo", value: "Civic", category: "technical" },
        { label: "Final da Placa", value: "9", category: "technical" },
        { label: "Quilometragem", value: "45.000 km", category: "technical", highlight: true },
      ])
    );

    const physicalProductItem = {
      category: "retail",
      attributes: {
        weight_kg: 1.5,
        dimensions: "30 x 20 x 10 cm",
        material: "Aço Inox",
      },
    };

    const specsPhysical = resolveClassifiedDetailedSpecs(physicalProductItem);
    expect(specsPhysical).toEqual(
      expect.arrayContaining([
        { label: "Peso", value: "1.5 kg", category: "dimensions" },
        { label: "Dimensões", value: "30 x 20 x 10 cm", category: "dimensions" },
        { label: "Material", value: "Aço Inox", category: "technical" },
      ])
    );
  });

  it("isola estritamente produtos de conveniência/bebidas contra vazamento de viagens, veículos e imóveis (Invariante B.37)", () => {
    const beverageAd = {
      title: "Drink Pronto Mansão Maromba Whisky Double Darkness - 1L Alcoólico",
      category: "grocery",
      deal_type: "venda",
      delivery_mode: "both",
      attributes: {
        brand: "Mansão Maromba",
        volume: "1L",
        is_alcoholic: true,
        department: "Bebidas & Destilados",
        deal_type: "venda",
        max_guests: 1, // resíduo comum de banco/template
      },
    };

    const specs = resolveClassifiedDetailedSpecs(beverageAd);

    // Deve conter especificações de conveniência / bebidas
    expect(specs).toEqual(
      expect.arrayContaining([
        { label: "Marca", value: "Mansão Maromba", category: "technical", highlight: true },
        { label: "Volume / Peso", value: "1L", category: "dimensions", highlight: true },
        { label: "Bebida Alcoólica", value: "Sim (+18)", category: "technical", highlight: true },
        { label: "Departamento", value: "Bebidas & Destilados", category: "technical" },
        { label: "Logística", value: "Entrega Local ou Retirada", category: "logistics", highlight: true },
      ])
    );

    // NÃO deve vazar especificações de imóveis, viagens, veículos ou serviços
    const labels = specs.map((s) => s.label);
    expect(labels).not.toContain("Capacidade");
    expect(labels).not.toContain("Finalidade");
    expect(labels).not.toContain("Destino");
    expect(labels).not.toContain("Passageiros");
    expect(labels).not.toContain("Quartos");
    expect(labels).not.toContain("Quilometragem");
    expect(labels).not.toContain("Câmbio");
  });

  it("garante que vaga de emprego com nome de alimento no título NÃO seja sequestrada como conveniência (Invariante B.37)", () => {
    const jobAd = {
      title: "Churrasqueiro Profissional Especialista em Picanha e Costela",
      category: "job",
      attributes: {
        role: "Churrasqueiro",
        work_model: "presencial",
        regime: "clt",
        salary_range: "R$ 3.000 a R$ 4.500",
        min_education: "ensino_medio",
        experience_level: "pleno",
      },
    };

    const specs = resolveClassifiedDetailedSpecs(jobAd);
    expect(specs).toEqual(
      expect.arrayContaining([
        { label: "Cargo", value: "Churrasqueiro", category: "hiring", highlight: true },
        { label: "Remuneração", value: "R$ 3.000 a R$ 4.500", category: "hiring", highlight: true },
      ])
    );

    const labels = specs.map((s) => s.label);
    expect(labels).not.toContain("Bebida Alcoólica");
    expect(labels).not.toContain("Departamento");
    expect(labels).not.toContain("Volume / Peso");
  });

  it("resolve corretamente o nicho de Eventos e Shows sem vazar produtos físicos", () => {
    const eventAd = {
      title: "Festival de Inovação e Tecnologia 2026",
      category: "event",
      template_style: "event",
      attributes: {
        event_date: "24/10/2026",
        start_time: "19:00",
        gates_open_time: "17:30",
        venue_name: "Centro de Convenções Regional",
        venue_address: "Av. Brasil, 1500, Centro",
        age_rating: "16 anos",
        ticket_tiers: [{ name: "1º Lote Pista" }, { name: "VIP Open Bar" }],
        speakers: [{ name: "Dra. Ana Silva" }, { name: "Carlos Mendes" }],
      },
    };

    const specs = resolveClassifiedDetailedSpecs(eventAd);
    expect(specs).toEqual(
      expect.arrayContaining([
        { label: "Data do Evento", value: "24/10/2026", category: "technical", highlight: true },
        { label: "Horário", value: "Portões às 17:30 / Início às 19:00", category: "logistics", highlight: true },
        { label: "Local / Espaço", value: "Centro de Convenções Regional", category: "logistics", highlight: true },
        { label: "Endereço", value: "Av. Brasil, 1500, Centro", category: "logistics" },
        { label: "Classificação Etária", value: "16 anos", category: "technical" },
        { label: "Lotes de Ingressos", value: "1º Lote Pista, VIP Open Bar", category: "commercial" },
        { label: "Atrações / Palestrantes", value: "Dra. Ana Silva, Carlos Mendes", category: "technical" },
      ])
    );

    const labels = specs.map((s) => s.label);
    expect(labels).not.toContain("Condição");
    expect(labels).not.toContain("Logística");
  });

  it("resolve corretamente o nicho de Agronegócio com Horímetro e Tração", () => {
    const agriAd = {
      title: "Trator John Deere 6110J 4x4 Cabinado 2021",
      category: "agri",
      attributes: {
        horimetro: 3450,
        traction: "4x4",
        year_fab: 2021,
        power_hp: 110,
        cabin: true,
        cautelar_aprovada: true,
      },
    };

    const specs = resolveClassifiedDetailedSpecs(agriAd);
    expect(specs).toEqual(
      expect.arrayContaining([
        { label: "Segmento", value: "Agronegócio & Maquinário", category: "technical", highlight: true },
        { label: "Horímetro", value: "3.450 Horas", category: "technical", highlight: true },
        { label: "Tração", value: "Tração 4x4", category: "technical", highlight: true },
        { label: "Ano Fabricação", value: "2021", category: "technical" },
        { label: "Potência", value: "110 CV", category: "technical" },
        { label: "Cabine", value: "Cabinado com Ar", category: "technical" },
        { label: "Vistoria", value: "Vistoria no Campo Aprovada", category: "technical" },
      ])
    );
  });

  it("resolve farmácia com retenção de receita e princípio ativo", () => {
    const pharmaAd = {
      title: "Suplemento Vitamínico D3 50.000 UI",
      category: "pharmacy",
      attributes: {
        subniche: "Vitaminas & Suplementos",
        retention_prescription: false,
        active_ingredient: "Colecalciferol 50.000 UI",
        manufacturer: "Laboratório Pharma Brasil",
        anvisa_registry: "MS 1.0234.0567",
      },
    };

    const specs = resolveClassifiedDetailedSpecs(pharmaAd);
    expect(specs).toEqual(
      expect.arrayContaining([
        { label: "Classificação", value: "Vitaminas & Suplementos", category: "technical", highlight: true },
        { label: "Prescrição", value: "Venda Livre (Sem Receita)", category: "technical", highlight: true },
        { label: "Princípio Ativo", value: "Colecalciferol 50.000 UI", category: "technical" },
        { label: "Fabricante / Laboratório", value: "Laboratório Pharma Brasil", category: "technical" },
        { label: "Registro Anvisa", value: "MS 1.0234.0567", category: "technical" },
      ])
    );
  });
});
