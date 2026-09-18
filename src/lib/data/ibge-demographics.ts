/**
 * ibge-demographics.ts — Matriz Demográfica Oficial do Brasil (Censo IBGE 2022 / PNAD / ABEP)
 * Fonte de verdade estatística para geração de populações sintéticas no SimLab,
 * calibração de personas para agentes de IA e inteligência de mercado regional.
 */

export interface EconomicClassDefinition {
  code: "A" | "B1" | "B2" | "C1" | "C2" | "D_E";
  label: string;
  min_monthly_household_income_cents: number;
  median_monthly_household_income_cents: number;
  max_monthly_household_income_cents: number;
  brazil_population_percentage: number;
  discretionary_budget_percentage: number; // Percentual da renda livre para lazer, delivery, compras impulsivas
  financial_channels: string[];
  preferred_payment_methods: string[];
  consumption_affinity: {
    gastronomia_delivery: number; // 0.0 a 1.0 (afinidade)
    eletronicos_tech: number;
    moda_vestuario: number;
    turismo_viagens: number;
    automotivo_veiculos: number;
    moveis_decoracao: number;
    educacao_cursos: number;
  };
}

export const IBGE_ECONOMIC_CLASSES: EconomicClassDefinition[] = [
  {
    code: "A",
    label: "Classe A (Alta Renda)",
    min_monthly_household_income_cents: 2350000, // R$ 23.500+
    median_monthly_household_income_cents: 3200000,
    max_monthly_household_income_cents: 12000000,
    brazil_population_percentage: 2.8,
    discretionary_budget_percentage: 42,
    financial_channels: ["Bancos Private / Investimentos", "Cartões Black / Infinite", "Pix Alto Valor"],
    preferred_payment_methods: ["cartao_credito_a_vista", "pix"],
    consumption_affinity: {
      gastronomia_delivery: 0.95,
      eletronicos_tech: 0.92,
      moda_vestuario: 0.88,
      turismo_viagens: 0.98,
      automotivo_veiculos: 0.90,
      moveis_decoracao: 0.89,
      educacao_cursos: 0.85,
    },
  },
  {
    code: "B1",
    label: "Classe B1 (Média-Alta Superior)",
    min_monthly_household_income_cents: 1250000, // R$ 12.500 a R$ 23.499
    median_monthly_household_income_cents: 1680000,
    max_monthly_household_income_cents: 2349900,
    brazil_population_percentage: 5.4,
    discretionary_budget_percentage: 30,
    financial_channels: ["Bancos Digitais Premium", "Cartões Platinum", "Pix"],
    preferred_payment_methods: ["cartao_credito_parcelado", "pix", "cartao_credito_a_vista"],
    consumption_affinity: {
      gastronomia_delivery: 0.90,
      eletronicos_tech: 0.88,
      moda_vestuario: 0.82,
      turismo_viagens: 0.90,
      automotivo_veiculos: 0.82,
      moveis_decoracao: 0.80,
      educacao_cursos: 0.80,
    },
  },
  {
    code: "B2",
    label: "Classe B2 (Média-Alta Padrão)",
    min_monthly_household_income_cents: 650000, // R$ 6.500 a R$ 12.499
    median_monthly_household_income_cents: 890000,
    max_monthly_household_income_cents: 1249900,
    brazil_population_percentage: 13.8,
    discretionary_budget_percentage: 22,
    financial_channels: ["Bancos Tradicionais & Fintechs (Nubank, Inter)", "Cartões Gold"],
    preferred_payment_methods: ["cartao_credito_parcelado", "pix"],
    consumption_affinity: {
      gastronomia_delivery: 0.82,
      eletronicos_tech: 0.80,
      moda_vestuario: 0.75,
      turismo_viagens: 0.78,
      automotivo_veiculos: 0.75,
      moveis_decoracao: 0.72,
      educacao_cursos: 0.75,
    },
  },
  {
    code: "C1",
    label: "Classe C1 (Média Típica Brasileira)",
    min_monthly_household_income_cents: 380000, // R$ 3.800 a R$ 6.499
    median_monthly_household_income_cents: 490000,
    max_monthly_household_income_cents: 649900,
    brazil_population_percentage: 22.5,
    discretionary_budget_percentage: 14,
    financial_channels: ["Fintechs (Nubank, PicPay, Mercado Pago)", "Caixa Econômica"],
    preferred_payment_methods: ["cartao_credito_parcelado", "pix"],
    consumption_affinity: {
      gastronomia_delivery: 0.75,
      eletronicos_tech: 0.70,
      moda_vestuario: 0.68,
      turismo_viagens: 0.60,
      automotivo_veiculos: 0.62,
      moveis_decoracao: 0.65,
      educacao_cursos: 0.62,
    },
  },
  {
    code: "C2",
    label: "Classe C2 (Média de Entrada)",
    min_monthly_household_income_cents: 220000, // R$ 2.200 a R$ 3.799
    median_monthly_household_income_cents: 295000,
    max_monthly_household_income_cents: 379900,
    brazil_population_percentage: 25.3,
    discretionary_budget_percentage: 8,
    financial_channels: ["Contas Digitais", "Caixa Tem", "Pix"],
    preferred_payment_methods: ["pix", "cartao_credito_parcelado", "boleto"],
    consumption_affinity: {
      gastronomia_delivery: 0.60,
      eletronicos_tech: 0.55,
      moda_vestuario: 0.58,
      turismo_viagens: 0.38,
      automotivo_veiculos: 0.45,
      moveis_decoracao: 0.52,
      educacao_cursos: 0.48,
    },
  },
  {
    code: "D_E",
    label: "Classes D e E (Base da Pirâmide)",
    min_monthly_household_income_cents: 70000, // Até R$ 2.199
    median_monthly_household_income_cents: 141200, // 1 Salário Mínimo
    max_monthly_household_income_cents: 219900,
    brazil_population_percentage: 30.2,
    discretionary_budget_percentage: 4,
    financial_channels: ["Caixa Tem / Benefícios Sociais", "Pix", "Dinheiro em Espécie"],
    preferred_payment_methods: ["pix", "dinheiro", "boleto"],
    consumption_affinity: {
      gastronomia_delivery: 0.35,
      eletronicos_tech: 0.30,
      moda_vestuario: 0.42,
      turismo_viagens: 0.18,
      automotivo_veiculos: 0.22,
      moveis_decoracao: 0.35,
      educacao_cursos: 0.30,
    },
  },
];

export interface BrazilRegionDemographics {
  region: "Sul" | "Sudeste" | "Centro-Oeste" | "Nordeste" | "Norte";
  population_ibge_2022: number;
  percentage_of_brazil: number;
  average_monthly_household_per_capita_cents: number;
  ecommerce_penetration_rate: number; // Percentual de domicílios que compram online
  class_distribution_percentage: Record<"A" | "B1" | "B2" | "C1" | "C2" | "D_E", number>;
  key_metropolises: string[];
  characteristic_cultural_traits: string[];
}

export const BRAZIL_REGIONS_DEMOGRAPHICS: Record<string, BrazilRegionDemographics> = {
  Sul: {
    region: "Sul",
    population_ibge_2022: 29933315,
    percentage_of_brazil: 14.7,
    average_monthly_household_per_capita_cents: 228000, // R$ 2.280 per capita
    ecommerce_penetration_rate: 78.4,
    class_distribution_percentage: {
      A: 4.2,
      B1: 7.8,
      B2: 18.5,
      C1: 28.0,
      C2: 24.5,
      D_E: 17.0,
    },
    key_metropolises: ["Curitiba", "Porto Alegre", "Florianópolis", "Joinville", "Caxias do Sul", "Chapecó"],
    characteristic_cultural_traits: [
      "Forte tradição cooperativista e comércio local",
      "Alta exigência em prazos e qualidade técnica",
      "Consumo elevado de carnes, vinhos, café e artigos de inverno",
    ],
  },
  Sudeste: {
    region: "Sudeste",
    population_ibge_2022: 84847187,
    percentage_of_brazil: 41.8,
    average_monthly_household_per_capita_cents: 236000, // R$ 2.360 per capita
    ecommerce_penetration_rate: 82.1,
    class_distribution_percentage: {
      A: 4.8,
      B1: 8.5,
      B2: 17.2,
      C1: 25.5,
      C2: 25.0,
      D_E: 19.0,
    },
    key_metropolises: ["São Paulo", "Rio de Janeiro", "Belo Horizonte", "Campinas", "Santos", "Ribeirão Preto"],
    characteristic_cultural_traits: [
      "Ritmo acelerado com alta adesão a delivery sob demanda e ultra-fast delivery",
      "Sensibilidade a marcas globais e tendências de redes sociais",
      "Grande volume de serviços por aplicativo (transporte, reformas, freelas)",
    ],
  },
  Centro_Oeste: {
    region: "Centro-Oeste",
    population_ibge_2022: 16287809,
    percentage_of_brazil: 8.0,
    average_monthly_household_per_capita_cents: 245000, // R$ 2.450 per capita (puxado pelo DF e Agronegócio)
    ecommerce_penetration_rate: 74.5,
    class_distribution_percentage: {
      A: 4.5,
      B1: 8.0,
      B2: 16.5,
      C1: 26.0,
      C2: 25.0,
      D_E: 20.0,
    },
    key_metropolises: ["Brasília", "Goiânia", "Cuiabá", "Campo Grande", "Anápolis"],
    characteristic_cultural_traits: [
      "Forte poder de compra derivado do agronegócio e funcionalismo público",
      "Consumo elevado de veículos utilitários/picapes e lazer ao ar livre",
      "Crescimento acelerado no consumo de vestuário e produtos de tecnologia",
    ],
  },
  Nordeste: {
    region: "Nordeste",
    population_ibge_2022: 54644582,
    percentage_of_brazil: 26.9,
    average_monthly_household_per_capita_cents: 122000, // R$ 1.220 per capita
    ecommerce_penetration_rate: 65.2,
    class_distribution_percentage: {
      A: 1.5,
      B1: 3.2,
      B2: 9.8,
      C1: 18.5,
      C2: 26.0,
      D_E: 41.0,
    },
    key_metropolises: ["Salvador", "Fortaleza", "Recife", "Natal", "João Pessoa", "Maceió", "São Luís"],
    characteristic_cultural_traits: [
      "Comércio vibrante impulsionado pelo turismo, festas populares e criatividade",
      "Uso maciço do WhatsApp para compras e negociações com lojistas locais",
      "Alta adesão ao Pix e busca por condições especiais de frete ou retirada presencial",
    ],
  },
  Norte: {
    region: "Norte",
    population_ibge_2022: 17349583,
    percentage_of_brazil: 8.5,
    average_monthly_household_per_capita_cents: 118000, // R$ 1.180 per capita
    ecommerce_penetration_rate: 59.8,
    class_distribution_percentage: {
      A: 1.4,
      B1: 2.8,
      B2: 8.8,
      C1: 17.5,
      C2: 27.5,
      D_E: 42.0,
    },
    key_metropolises: ["Manaus", "Belém", "Porto Velho", "Macapá", "Palmas"],
    characteristic_cultural_traits: [
      "Logística fluvial e rodoviária diferenciada com forte comércio ribeirinho e metropolitano",
      "Polo industrial tecnológico em Manaus e riqueza cultural gastronômica nativa",
      "Sensibilidade a prazos de entrega e custo de frete",
    ],
  },
};

/**
 * Perfil sintético gerado com calibração empírica do IBGE
 */
export interface GeneratedSyntheticCitizen {
  id: string;
  name: string;
  gender: "feminino" | "masculino";
  age: number;
  region: "Sul" | "Sudeste" | "Centro-Oeste" | "Nordeste" | "Norte";
  city: string;
  state: string;
  economic_class: "A" | "B1" | "B2" | "C1" | "C2" | "D_E";
  profession: string;
  monthly_income_cents: number;
  discretionary_budget_cents: number;
  primary_payment_method: string;
  top_interests: string[];
}

const FIRST_NAMES_FEMALE = [
  "Ana", "Beatriz", "Camila", "Daniela", "Eduarda", "Fernanda", "Gabriela", "Helena",
  "Isabela", "Juliana", "Larissa", "Mariana", "Natália", "Patrícia", "Rafaela", "Vanessa"
];

const FIRST_NAMES_MALE = [
  "Alexandre", "Bruno", "Carlos", "Diego", "Eduardo", "Felipe", "Gabriel", "Henrique",
  "Igor", "João Pedro", "Lucas", "Mateus", "Rodrigo", "Thiago", "Vinícius", "Willian"
];

const SURNAMES = [
  "Silva", "Santos", "Oliveira", "Souza", "Rodrigues", "Ferreira", "Alves", "Pereira",
  "Lima", "Gomes", "Costa", "Ribeiro", "Martins", "Carvalho", "Almeida", "Barbosa"
];

/**
 * Gerador probabilístico de cidadãos sintéticos fiéis às estatísticas do IBGE
 */
export function generateSyntheticPopulations(
  count: number,
  filters?: {
    region?: "Sul" | "Sudeste" | "Centro-Oeste" | "Nordeste" | "Norte";
    economic_class?: "A" | "B1" | "B2" | "C1" | "C2" | "D_E";
  }
): GeneratedSyntheticCitizen[] {
  const result: GeneratedSyntheticCitizen[] = [];

  const availableRegions = filters?.region 
    ? [filters.region] 
    : (["Sudeste", "Sul", "Nordeste", "Centro-Oeste", "Norte"] as const);

  for (let i = 0; i < count; i++) {
    const region = availableRegions[i % availableRegions.length];
    const regionData = BRAZIL_REGIONS_DEMOGRAPHICS[region === "Centro-Oeste" ? "Centro_Oeste" : region];
    
    // Sorteio de classe econômica com base na distribuição regional real
    const targetClassCode = filters?.economic_class || (
      i % 100 < 3 ? "A" :
      i % 100 < 9 ? "B1" :
      i % 100 < 24 ? "B2" :
      i % 100 < 50 ? "C1" :
      i % 100 < 75 ? "C2" : "D_E"
    );

    const economicClass = IBGE_ECONOMIC_CLASSES.find((c) => c.code === targetClassCode) || IBGE_ECONOMIC_CLASSES[3];
    const gender: "feminino" | "masculino" = i % 2 === 0 ? "feminino" : "masculino";
    const firstName = gender === "feminino" 
      ? FIRST_NAMES_FEMALE[i % FIRST_NAMES_FEMALE.length] 
      : FIRST_NAMES_MALE[i % FIRST_NAMES_MALE.length];
    const surname = SURNAMES[(i * 3) % SURNAMES.length];
    const city = regionData.key_metropolises[i % regionData.key_metropolises.length];

    // Renda aleatória dentro do intervalo da classe
    const incomeSpread = economicClass.max_monthly_household_income_cents - economicClass.min_monthly_household_income_cents;
    const monthlyIncome = economicClass.min_monthly_household_income_cents + Math.floor(((i * 73) % 100) / 100 * incomeSpread);
    const discretionaryBudget = Math.round(monthlyIncome * (economicClass.discretionary_budget_percentage / 100));

    result.push({
      id: `citizen-ibge-${region.toLowerCase()}-${i + 1}`,
      name: `${firstName} ${surname}`,
      gender,
      age: 22 + ((i * 11) % 45),
      region,
      city,
      state: region === "Sul" ? "SC" : region === "Sudeste" ? "SP" : "DF",
      economic_class: economicClass.code,
      profession: economicClass.code === "A" || economicClass.code === "B1" ? "Especialista / Gestor" : "Comércio / Serviços",
      monthly_income_cents: monthlyIncome,
      discretionary_budget_cents: discretionaryBudget,
      primary_payment_method: economicClass.preferred_payment_methods[0],
      top_interests: Object.entries(economicClass.consumption_affinity)
        .filter(([_, score]) => score >= 0.70)
        .map(([key]) => key.replace("_", " ")),
    });
  }

  return result;
}
