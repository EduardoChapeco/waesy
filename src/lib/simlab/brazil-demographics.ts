/**
 * brazil-demographics.ts — Framework Demográfico Canônico de Populações Sintéticas Brasileiras
 * Calibrado com microdados do Censo IBGE 2022, PNAD Contínua e Critério Brasil (ABEP).
 * Permite instanciar milhões de perfis sintéticos estratificados por cidades, capitais e classes sociais.
 */

import type { 
  SyntheticArchetype,
  PersonaCurriculum,
  PersonaFinancialSheet,
  PersonaHouseholdProfile
} from "@/types/simlab";

export interface BrazilianCityProfile {
  name: string;
  state: string;
  region: "Sudeste" | "Sul" | "Nordeste" | "Centro-Oeste" | "Norte";
  type: "capital_metropole" | "interior_polo" | "interior_medio";
  population_ibge: number;
  pib_per_capita_brl: number;
  dominant_sectors: string[];
}

export const BRAZILIAN_CITIES: BrazilianCityProfile[] = [
  // ── SUDESTE ──
  { name: "São Paulo", state: "SP", region: "Sudeste", type: "capital_metropole", population_ibge: 11451245, pib_per_capita_brl: 65400, dominant_sectors: ["Serviços Financeiros", "Tecnologia", "Varejo", "Saúde"] },
  { name: "Rio de Janeiro", state: "RJ", region: "Sudeste", type: "capital_metropole", population_ibge: 6211423, pib_per_capita_brl: 54200, dominant_sectors: ["Turismo", "Petróleo & Gás", "Entretenimento", "Serviços"] },
  { name: "Belo Horizonte", state: "MG", region: "Sudeste", type: "capital_metropole", population_ibge: 2315560, pib_per_capita_brl: 43800, dominant_sectors: ["Biotecnologia", "Mineração", "Gastronomia", "Comércio"] },
  { name: "Campinas", state: "SP", region: "Sudeste", type: "interior_polo", population_ibge: 1138309, pib_per_capita_brl: 62100, dominant_sectors: ["Polo Tecnológico", "Logística", "Pesquisa", "Indústria"] },
  { name: "Ribeirão Preto", state: "SP", region: "Sudeste", type: "interior_polo", population_ibge: 698259, pib_per_capita_brl: 51200, dominant_sectors: ["Agronegócio", "Saúde", "Bebidas", "Serviços"] },

  // ── SUL ──
  { name: "Curitiba", state: "PR", region: "Sul", type: "capital_metropole", population_ibge: 1773733, pib_per_capita_brl: 53900, dominant_sectors: ["Automotivo", "Tecnologia", "Comércio", "Serviços"] },
  { name: "Porto Alegre", state: "RS", region: "Sul", type: "capital_metropole", population_ibge: 1332570, pib_per_capita_brl: 52400, dominant_sectors: ["Saúde", "Educação Superior", "Serviços", "Varejo"] },
  { name: "Florianópolis", state: "SC", region: "Sul", type: "capital_metropole", population_ibge: 537213, pib_per_capita_brl: 56800, dominant_sectors: ["Tecnologia / Startups", "Turismo", "Serviços Públicos"] },
  { name: "Joinville", state: "SC", region: "Sul", type: "interior_polo", population_ibge: 616323, pib_per_capita_brl: 63700, dominant_sectors: ["Indústria Metalmecânica", "Tecnologia", "Logística"] },
  { name: "Caxias do Sul", state: "RS", region: "Sul", type: "interior_polo", population_ibge: 463377, pib_per_capita_brl: 55900, dominant_sectors: ["Metalmecânico", "Vitivinicultura", "Comércio"] },
  { name: "Chapecó", state: "SC", region: "Sul", type: "interior_polo", population_ibge: 254781, pib_per_capita_brl: 58200, dominant_sectors: ["Agroindústria", "Cooperativismo", "Saúde"] },
  { name: "São Miguel do Oeste", state: "SC", region: "Sul", type: "interior_medio", population_ibge: 44330, pib_per_capita_brl: 48900, dominant_sectors: ["Comércio Regional", "Agropecuária", "Serviços"] },

  // ── CENTRO-OESTE ──
  { name: "Brasília", state: "DF", region: "Centro-Oeste", type: "capital_metropole", population_ibge: 2817068, pib_per_capita_brl: 87100, dominant_sectors: ["Administração Pública", "Serviços", "Gastronomia"] },
  { name: "Goiânia", state: "GO", region: "Centro-Oeste", type: "capital_metropole", population_ibge: 1437237, pib_per_capita_brl: 41300, dominant_sectors: ["Agronegócio", "Moda / Confeção", "Saúde", "Construção"] },
  { name: "Cuiabá", state: "MT", region: "Centro-Oeste", type: "capital_metropole", population_ibge: 650912, pib_per_capita_brl: 45700, dominant_sectors: ["Agronegócio (Soja/Milho)", "Logística", "Comércio"] },

  // ── NORDESTE ──
  { name: "Salvador", state: "BA", region: "Nordeste", type: "capital_metropole", population_ibge: 2418005, pib_per_capita_brl: 25100, dominant_sectors: ["Turismo", "Comércio Popular", "Cultura", "Serviços"] },
  { name: "Recife", state: "PE", region: "Nordeste", type: "capital_metropole", population_ibge: 1488920, pib_per_capita_brl: 34200, dominant_sectors: ["Porto Digital / Tech", "Polo Médico", "Logística"] },
  { name: "Fortaleza", state: "CE", region: "Nordeste", type: "capital_metropole", population_ibge: 2428678, pib_per_capita_brl: 27800, dominant_sectors: ["Turismo", "Comércio Têxtil", "Tecnologia", "Logística"] },

  // ── NORTE ──
  { name: "Manaus", state: "AM", region: "Norte", type: "capital_metropole", population_ibge: 2063547, pib_per_capita_brl: 41900, dominant_sectors: ["Polo Industrial de Manaus", "Eletrônicos", "Comércio"] },
  { name: "Belém", state: "PA", region: "Norte", type: "capital_metropole", population_ibge: 1303389, pib_per_capita_brl: 24600, dominant_sectors: ["Biodiversidade", "Comércio", "Mineração / Portos"] },
];

// ─── 12 ARQUÉTIPOS CANÔNICOS CALIBRADOS PELO CENSO IBGE 2022 / POF / CRITÉRIO ABEP ──
export const CANONICAL_BRAZIL_ARCHETYPES: SyntheticArchetype[] = [
  {
    id: "7ecbbf4a-52b1-405f-9b16-f5be3c0f7740",
    code: "BR_F_34_CLASSE_C1_MAE",
    display_name: "Carla Silveira (Mãe Gerenciadora do Lar)",
    gender: "feminino",
    age: 34,
    age_range_label: "30-39 anos",
    abep_social_class: "C1",
    region: "Sul",
    location_type: "capital_metropole",
    median_income_brl: 4800,
    education_level: "Superior Completo (Pedagogia)",
    cynicism_index: 7.0,
    price_sensitivity: 8.5,
    impulsivity_index: 4.5,
    primary_social_networks: ["WhatsApp", "Instagram", "Facebook"],
    decision_heuristics: {
      primary_driver: "protecao_familiar_e_orcamento",
      preferred_payment: "cartao_parcelado_sem_juros",
      friction_trigger: "frete_caro_ou_juros_ocultos",
      seeks_combos: true,
      city: "Porto Alegre",
      state: "RS"
    },
    curriculum: {
      profession_title: "Professora de Ensino Fundamental e Gestora do Lar",
      occupation_sector: "Educação Pública Municipal",
      work_experience_years: 11,
      education_degree: "Superior Completo (Licenciatura em Pedagogia)",
      career_summary: "Leciona para crianças do 3º ano em escola municipal de Porto Alegre. Complementa renda com aulas particulares e administra rigorosamente as contas da casa.",
      key_competencies: ["Planejamento Orçamentário Doméstico", "Gestão de Rotina dos Filhos", "Pesquisa Ativa de Preços em Supermercados e Passeios"]
    },
    household_profile: {
      family_structure: "nuclear_com_filhos",
      total_members: 4,
      dependents_count: 2,
      dependents_ages: [7, 11],
      decision_power_in_home: "decisora_principal"
    },
    financial_sheet: {
      gross_monthly_income_brl: 4800,
      net_monthly_income_brl: 4150,
      essential_fixed_expenses_brl: 3120,
      discretionary_surplus_brl: 1030,
      leisure_budget_monthly_brl: 350,
      liquid_reserves_brl: 2400,
      credit_limit_available_brl: 3800,
      debt_commitment_percent: 24,
      preferred_payment_method: "cartao_parcelado_sem_juros"
    },
    bio: "Mãe de dois filhos em Porto Alegre, equilibra orçamento rígido e preza pela família. Só compra se o valor da parcela couber com folga nas contas do mês.",
    is_active: true,
  },
  {
    id: "a412a880-f8cc-4394-8adf-e94bc400dc81",
    code: "BR_M_52_CLASSE_A1_DIRETOR",
    display_name: "Marcos Albuquerque (Diretor Financeiro)",
    gender: "masculino",
    age: 52,
    age_range_label: "50-59 anos",
    abep_social_class: "A1",
    region: "Sudeste",
    location_type: "capital_metropole",
    median_income_brl: 32000,
    education_level: "Pós-graduação / MBA Executivo",
    cynicism_index: 8.0,
    price_sensitivity: 2.0,
    impulsivity_index: 3.0,
    primary_social_networks: ["LinkedIn", "WhatsApp"],
    decision_heuristics: {
      primary_driver: "status_tempo_e_excelencia",
      preferred_payment: "cartao_black_a_vista",
      friction_trigger: "espera_demorada_ou_amadorismo",
      zero_tolerance_delays: true,
      city: "São Paulo",
      state: "SP"
    },
    curriculum: {
      profession_title: "Diretor Financeiro Corporativo (CFO)",
      occupation_sector: "Multinacional de Logística & Supply Chain",
      work_experience_years: 26,
      education_degree: "Pós-graduação / MBA Executivo em Finanças",
      career_summary: "Executivo financeiro sênior residente nos Jardins em São Paulo. Focado em governança, rentabilidade de portfólio e preservação de patrimônio.",
      key_competencies: ["Análise de Risco & ROI", "Gestão de Patrimônio Líquido", "Alta Exigência de Nível de Serviço (SLA)"]
    },
    household_profile: {
      family_structure: "casal_sem_filhos",
      total_members: 2,
      dependents_count: 0,
      decision_power_in_home: "decisor_conjunto"
    },
    financial_sheet: {
      gross_monthly_income_brl: 32000,
      net_monthly_income_brl: 23500,
      essential_fixed_expenses_brl: 11200,
      discretionary_surplus_brl: 12300,
      leisure_budget_monthly_brl: 4500,
      liquid_reserves_brl: 180000,
      credit_limit_available_brl: 65000,
      debt_commitment_percent: 5,
      preferred_payment_method: "cartao_black_a_vista"
    },
    bio: "Diretor financeiro em SP. Valoriza discrição, atendimento concierge, pontualidade e padrão internacional de acabamento.",
    is_active: true,
  },
  {
    id: "537d0432-cb30-4cba-ac13-fc56de1070ff",
    code: "BR_M_27_CLASSE_B2_DEV",
    display_name: "Gabriel Santos (Empreendedor & Dev)",
    gender: "masculino",
    age: 27,
    age_range_label: "25-29 anos",
    abep_social_class: "B2",
    region: "Sul",
    location_type: "capital_metropole",
    median_income_brl: 9500,
    education_level: "Superior Completo",
    cynicism_index: 4.5,
    price_sensitivity: 5.5,
    impulsivity_index: 6.0,
    primary_social_networks: ["Twitter / X", "YouTube", "Discord"],
    decision_heuristics: {
      primary_driver: "eficiencia_e_inovacao",
      preferred_payment: "apple_pay_ou_pix",
      city: "Florianópolis",
      state: "SC"
    },
    curriculum: {
      profession_title: "Engenheiro de Software e Fundador de Micro-SaaS",
      occupation_sector: "Tecnologia / Trabalho Remoto Internacional",
      work_experience_years: 6,
      education_degree: "Superior Completo (Ciência da Computação)",
      career_summary: "Desenvolvedor full-stack em Florianópolis. Trabalha remoto para o exterior, investe em ativos digitais e prioriza serviços sem burocracia.",
      key_competencies: ["Automação de Processos", "Cálculo de Margem Unit Economics", "Pagamentos Instantâneos Mobile"]
    },
    household_profile: {
      family_structure: "unipessoal",
      total_members: 1,
      dependents_count: 0,
      decision_power_in_home: "decisora_principal"
    },
    financial_sheet: {
      gross_monthly_income_brl: 9500,
      net_monthly_income_brl: 8100,
      essential_fixed_expenses_brl: 4200,
      discretionary_surplus_brl: 3900,
      leisure_budget_monthly_brl: 1400,
      liquid_reserves_brl: 28000,
      credit_limit_available_brl: 18000,
      debt_commitment_percent: 12,
      preferred_payment_method: "pix_a_vista"
    },
    bio: "Trabalha remoto em Floripa, focado em tecnologia, automação e autonomia financeira.",
    is_active: true,
  },
  {
    id: "66174c09-496a-4be5-955e-2926b8fddfb1",
    code: "BR_F_48_CLASSE_C2_COMERCIANTE",
    display_name: "Vera Lúcia Gomes (Comerciante do Interior)",
    gender: "feminino",
    age: 48,
    age_range_label: "40-49 anos",
    abep_social_class: "C2",
    region: "Sudeste",
    location_type: "interior_polo",
    median_income_brl: 3800,
    education_level: "Ensino Médio Completo",
    cynicism_index: 6.5,
    price_sensitivity: 8.0,
    impulsivity_index: 4.0,
    primary_social_networks: ["WhatsApp", "Facebook"],
    decision_heuristics: {
      primary_driver: "confianca_local",
      preferred_payment: "pix_a_vista",
      city: "Ribeirão Preto",
      state: "SP"
    },
    curriculum: {
      profession_title: "Proprietária de Armarinho e Artigos de Costura",
      occupation_sector: "Comércio Varejista do Interior",
      work_experience_years: 22,
      education_degree: "Ensino Médio Completo",
      career_summary: "Comerciante tradicional no interior de SP. Gere sua loja física há duas décadas, conhece todos os clientes pelo nome e preza por confiança.",
      key_competencies: ["Atendimento Humanizado ao Cliente", "Gestão de Estoque Físico", "Negociação Direta com Fornecedores"]
    },
    household_profile: {
      family_structure: "nuclear_com_filhos",
      total_members: 3,
      dependents_count: 1,
      dependents_ages: [16],
      decision_power_in_home: "decisor_conjunto"
    },
    financial_sheet: {
      gross_monthly_income_brl: 3800,
      net_monthly_income_brl: 3450,
      essential_fixed_expenses_brl: 2550,
      discretionary_surplus_brl: 900,
      leisure_budget_monthly_brl: 280,
      liquid_reserves_brl: 3500,
      credit_limit_available_brl: 2200,
      debt_commitment_percent: 28,
      preferred_payment_method: "pix_a_vista"
    },
    bio: "Dona de loja de armarinhos no interior de SP, preza por atendimento humano, clareza no roteiro e transparência.",
    is_active: true,
  },
  {
    id: "9b62090a-b5fe-4d2d-812e-454a82c0de33",
    code: "BR_M_31_CLASSE_B1_GROWTH",
    display_name: "Lucas Novais (Consultor de Growth)",
    gender: "masculino",
    age: 31,
    age_range_label: "30-39 anos",
    abep_social_class: "B1",
    region: "Sudeste",
    location_type: "capital_metropole",
    median_income_brl: 14200,
    education_level: "Superior Completo",
    cynicism_index: 8.5,
    price_sensitivity: 4.5,
    impulsivity_index: 5.5,
    primary_social_networks: ["Instagram", "LinkedIn"],
    decision_heuristics: {
      primary_driver: "roi_e_dados",
      city: "Belo Horizonte",
      state: "MG"
    },
    curriculum: {
      profession_title: "Consultor de Growth e Performance Marketing",
      occupation_sector: "Agências Digitais & Consultoria de Vendas",
      work_experience_years: 8,
      education_degree: "Superior Completo (Administração / Marketing)",
      career_summary: "Analista hiperorientado a dados em BH. Detecta gatilhos de copy, ofertas de isca e analisa prova social antes de qualquer transação.",
      key_competencies: ["Análise de CRO & Métricas de Conversão", "Detecção de Viés Cognitivo em Anúncios", "Auditoria de Termos de Serviço"]
    },
    household_profile: {
      family_structure: "unipessoal",
      total_members: 1,
      dependents_count: 0,
      decision_power_in_home: "decisora_principal"
    },
    financial_sheet: {
      gross_monthly_income_brl: 14200,
      net_monthly_income_brl: 11100,
      essential_fixed_expenses_brl: 5800,
      discretionary_surplus_brl: 5300,
      leisure_budget_monthly_brl: 1800,
      liquid_reserves_brl: 42000,
      credit_limit_available_brl: 25000,
      debt_commitment_percent: 18,
      preferred_payment_method: "cartao_parcelado_sem_juros"
    },
    bio: "Consultor de marketing e dados em Belo Horizonte, hiper analítico e cético com promessas de anúncios.",
    is_active: true,
  },
  {
    id: "f15fa9ef-34d7-4076-b106-373ddf7a56a8",
    code: "BR_F_66_CLASSE_D_APOSENTADA",
    display_name: "Dona Neide Aparecida (Aposentada & Cuidadora)",
    gender: "feminino",
    age: 66,
    age_range_label: "60+ anos",
    abep_social_class: "D_E",
    region: "Nordeste",
    location_type: "capital_metropole",
    median_income_brl: 1950,
    education_level: "Ensino Fundamental Incompleto",
    cynicism_index: 5.0,
    price_sensitivity: 9.5,
    impulsivity_index: 3.0,
    primary_social_networks: ["WhatsApp", "Facebook"],
    decision_heuristics: {
      primary_driver: "economia_extrema",
      preferred_payment: "boleto_carne",
      city: "Salvador",
      state: "BA"
    },
    curriculum: {
      profession_title: "Aposentada e Cuidadora Familiar",
      occupation_sector: "Previdência Social (INSS) & Economia do Cuidado",
      work_experience_years: 38,
      education_degree: "Ensino Fundamental Incompleto",
      career_summary: "Aposentada em Salvador. Dedica o dia ao cuidado dos netos e gerencia o orçamento estritamente com base no benefício e cestas básicas.",
      key_competencies: ["Controle de Gastos Centavo a Centavo", "Aversão Extrema a Dívidas e Juros", "Proteção e Amparo aos Netos"]
    },
    household_profile: {
      family_structure: "multigeracional",
      total_members: 4,
      dependents_count: 2,
      dependents_ages: [5, 9],
      decision_power_in_home: "influenciador"
    },
    financial_sheet: {
      gross_monthly_income_brl: 1950,
      net_monthly_income_brl: 1850,
      essential_fixed_expenses_brl: 1620,
      discretionary_surplus_brl: 230,
      leisure_budget_monthly_brl: 50,
      liquid_reserves_brl: 600,
      credit_limit_available_brl: 800,
      debt_commitment_percent: 32,
      preferred_payment_method: "boleto_carne"
    },
    bio: "Aposentada em Salvador, ajuda na criação dos netos e gerencia orçamento centavo a centavo.",
    is_active: true,
  },
  {
    id: "3111a11d-5607-4746-a6ef-e3008b940485",
    code: "BR_F_39_CLASSE_A2_MEDICA",
    display_name: "Dra. Juliana Brandão (Médica Especialista)",
    gender: "feminino",
    age: 39,
    age_range_label: "30-39 anos",
    abep_social_class: "A2",
    region: "Sul",
    location_type: "capital_metropole",
    median_income_brl: 26000,
    education_level: "Doutorado / Residência",
    cynicism_index: 7.5,
    price_sensitivity: 3.0,
    impulsivity_index: 4.0,
    primary_social_networks: ["Instagram", "WhatsApp"],
    decision_heuristics: {
      primary_driver: "saude_e_qualidade_premium",
      city: "Curitiba",
      state: "PR"
    },
    curriculum: {
      profession_title: "Médica Cardiologista e Professora Universitária",
      occupation_sector: "Saúde Privada & Hospital de Alta Complexidade",
      work_experience_years: 14,
      education_degree: "Doutorado em Ciências Médicas",
      career_summary: "Atua em consultório e UTI em Curitiba. Agenda intensa, valoriza otimização de tempo e soluções que ofereçam alto conforto sem atrito.",
      key_competencies: ["Tomada de Decisão sob Pressão", "Apreciação de Serviços Premium", "Exigência de Pontualidade Absoluta"]
    },
    household_profile: {
      family_structure: "nuclear_com_filhos",
      total_members: 3,
      dependents_count: 1,
      dependents_ages: [4],
      decision_power_in_home: "decisora_principal"
    },
    financial_sheet: {
      gross_monthly_income_brl: 26000,
      net_monthly_income_brl: 19200,
      essential_fixed_expenses_brl: 9400,
      discretionary_surplus_brl: 9800,
      leisure_budget_monthly_brl: 3800,
      liquid_reserves_brl: 120000,
      credit_limit_available_brl: 45000,
      debt_commitment_percent: 8,
      preferred_payment_method: "cartao_black_a_vista"
    },
    bio: "Cardiologista em Curitiba, agenda corrida e busca por soluções confiáveis de alto nível.",
    is_active: true,
  },
  {
    id: "9be172b3-5b39-4566-a4ad-aead340cea04",
    code: "BR_M_29_CLASSE_C1_MOTORISTA",
    display_name: "Rodrigo Motta (Motorista de App)",
    gender: "masculino",
    age: 29,
    age_range_label: "25-29 anos",
    abep_social_class: "C1",
    region: "Sudeste",
    location_type: "capital_metropole",
    median_income_brl: 4200,
    education_level: "Ensino Médio Completo",
    cynicism_index: 7.0,
    price_sensitivity: 8.0,
    impulsivity_index: 4.2,
    primary_social_networks: ["WhatsApp", "YouTube"],
    decision_heuristics: {
      primary_driver: "rapidez_e_custo_beneficio",
      city: "Rio de Janeiro",
      state: "RJ"
    },
    curriculum: {
      profession_title: "Motorista Profissional de Aplicativo",
      occupation_sector: "Transporte Urbano Individual de Passageiros",
      work_experience_years: 7,
      education_degree: "Ensino Médio Completo",
      career_summary: "Roda 10 a 12 horas diárias no Rio de Janeiro. Conhece custos de combustível, manutenção e IPVA a fundo, busca economia pragmática.",
      key_competencies: ["Gestão de Custo Operacional por KM", "Mobilidade Urbana", "Busca Ativa de Descontos e Parcerias"]
    },
    household_profile: {
      family_structure: "casal_sem_filhos",
      total_members: 2,
      dependents_count: 0,
      decision_power_in_home: "decisor_conjunto"
    },
    financial_sheet: {
      gross_monthly_income_brl: 4200,
      net_monthly_income_brl: 3700,
      essential_fixed_expenses_brl: 2850,
      discretionary_surplus_brl: 850,
      leisure_budget_monthly_brl: 250,
      liquid_reserves_brl: 1800,
      credit_limit_available_brl: 3200,
      debt_commitment_percent: 30,
      preferred_payment_method: "cartao_parcelado_sem_juros"
    },
    bio: "Motorista de aplicativo no Rio de Janeiro, trabalha 10 horas diárias e valoriza rapidez.",
    is_active: true,
  },
  {
    id: "da702215-3927-46a7-99c4-352b9e949628",
    code: "BR_F_35_CLASSE_B2_ARQUITETA",
    display_name: "Camila Fontes (Arquiteta & Designer)",
    gender: "feminino",
    age: 35,
    age_range_label: "30-39 anos",
    abep_social_class: "B2",
    region: "Centro-Oeste",
    location_type: "capital_metropole",
    median_income_brl: 11000,
    education_level: "Superior Completo",
    cynicism_index: 6.0,
    price_sensitivity: 5.0,
    impulsivity_index: 6.5,
    primary_social_networks: ["Instagram", "Pinterest"],
    decision_heuristics: {
      primary_driver: "estetica_e_sustentabilidade",
      city: "Brasília",
      state: "DF"
    },
    curriculum: {
      profession_title: "Arquiteta de Interiores e Designer Comercial",
      occupation_sector: "Arquitetura, Urbanismo e Design",
      work_experience_years: 10,
      education_degree: "Superior Completo (Arquitetura e Urbanismo)",
      career_summary: "Escritório próprio em Brasília. Hiperatenta a acabamentos visuais, tipografia, harmonia cromática e autenticidade de marca.",
      key_competencies: ["Curadoria Estética & Visual", "Avaliação de Sustentabilidade de Materiais", "Negociação de Projetos"]
    },
    household_profile: {
      family_structure: "casal_sem_filhos",
      total_members: 2,
      dependents_count: 0,
      decision_power_in_home: "decisora_principal"
    },
    financial_sheet: {
      gross_monthly_income_brl: 11000,
      net_monthly_income_brl: 8900,
      essential_fixed_expenses_brl: 4900,
      discretionary_surplus_brl: 4000,
      leisure_budget_monthly_brl: 1500,
      liquid_reserves_brl: 32000,
      credit_limit_available_brl: 20000,
      debt_commitment_percent: 15,
      preferred_payment_method: "cartao_parcelado_sem_juros"
    },
    bio: "Arquiteta em Brasília, muito atenta a acabamentos visuais, tipografia e curadoria de embalagem.",
    is_active: true,
  },
  {
    id: "78a93213-16bf-4241-8f52-5d5392e38cda",
    code: "BR_M_42_CLASSE_B1_AGRO",
    display_name: "Tiago Zanin (Produtor Rural & Agrônomo)",
    gender: "masculino",
    age: 42,
    age_range_label: "40-49 anos",
    abep_social_class: "B1",
    region: "Sul",
    location_type: "interior_polo",
    median_income_brl: 18500,
    education_level: "Superior Completo",
    cynicism_index: 7.0,
    price_sensitivity: 4.0,
    impulsivity_index: 5.0,
    primary_social_networks: ["WhatsApp", "Instagram"],
    decision_heuristics: {
      primary_driver: "durabilidade_e_procedencia",
      city: "Chapecó",
      state: "SC"
    },
    curriculum: {
      profession_title: "Engenheiro Agrônomo e Produtor de Grãos",
      occupation_sector: "Agronegócio e Cooperativismo Rural",
      work_experience_years: 18,
      education_degree: "Superior Completo (Agronomia)",
      career_summary: "Produtor no Oeste de Santa Catarina. Valoriza robustez, solidez de palavra, contratos claros e produtos duráveis de boa procedência.",
      key_competencies: ["Gestão de Safra e Risco Climático", "Planejamento de Custeio Agrícola", "Negociação em Cooperativas"]
    },
    household_profile: {
      family_structure: "nuclear_com_filhos",
      total_members: 4,
      dependents_count: 2,
      dependents_ages: [12, 15],
      decision_power_in_home: "decisor_conjunto"
    },
    financial_sheet: {
      gross_monthly_income_brl: 18500,
      net_monthly_income_brl: 14800,
      essential_fixed_expenses_brl: 7100,
      discretionary_surplus_brl: 7700,
      leisure_budget_monthly_brl: 2500,
      liquid_reserves_brl: 85000,
      credit_limit_available_brl: 35000,
      debt_commitment_percent: 10,
      preferred_payment_method: "pix_a_vista"
    },
    bio: "Produtor rural no Oeste de Santa Catarina, valoriza produtos robustos e bom relacionamento comercial.",
    is_active: true,
  },
  {
    id: "99eee5eb-ba6e-4fbc-8991-299bf96b5389",
    code: "BR_F_21_CLASSE_C2_ESTUDANTE",
    display_name: "Brenda Letícia (Estudante & Estagiária)",
    gender: "feminino",
    age: 21,
    age_range_label: "18-24 anos",
    abep_social_class: "C2",
    region: "Nordeste",
    location_type: "capital_metropole",
    median_income_brl: 1800,
    education_level: "Superior Incompleto",
    cynicism_index: 5.5,
    price_sensitivity: 9.0,
    impulsivity_index: 7.5,
    primary_social_networks: ["TikTok", "Instagram"],
    decision_heuristics: {
      primary_driver: "tendencia_e_cupons",
      city: "Recife",
      state: "PE"
    },
    curriculum: {
      profession_title: "Estudante Universitária e Estagiária em RH",
      occupation_sector: "Ensino Superior e Serviços Corporativos",
      work_experience_years: 2,
      education_degree: "Superior Incompleto (Administração 5º período)",
      career_summary: "Estudante em Recife. Super conectada em redes sociais (TikTok, Instagram), busca cupons, promoções relâmpago e viagens em grupo com amigos.",
      key_competencies: ["Pesquisa em Redes Sociais & Tendências", "Compartilhamento de Despesas em Grupo", "Uso Ágil de Carteiras Digitais"]
    },
    household_profile: {
      family_structure: "unipessoal",
      total_members: 1,
      dependents_count: 0,
      decision_power_in_home: "decisora_principal"
    },
    financial_sheet: {
      gross_monthly_income_brl: 1800,
      net_monthly_income_brl: 1720,
      essential_fixed_expenses_brl: 1250,
      discretionary_surplus_brl: 470,
      leisure_budget_monthly_brl: 200,
      liquid_reserves_brl: 950,
      credit_limit_available_brl: 1500,
      debt_commitment_percent: 22,
      preferred_payment_method: "cartao_parcelado_sem_juros"
    },
    bio: "Estudante de Administração em Recife, ativa nas redes sociais e busca ativa por promoções virais.",
    is_active: true,
  },
  {
    id: "ade94803-5ef7-488e-89f4-d9236ffe66f9",
    code: "BR_M_56_CLASSE_C1_MESTRE_OBRAS",
    display_name: "Seu Moacir Bastos (Mestre de Obras Autônomo)",
    gender: "masculino",
    age: 56,
    age_range_label: "50-59 anos",
    abep_social_class: "C1",
    region: "Centro-Oeste",
    location_type: "interior_polo",
    median_income_brl: 5400,
    education_level: "Ensino Médio Incompleto",
    cynicism_index: 8.0,
    price_sensitivity: 7.5,
    impulsivity_index: 3.5,
    primary_social_networks: ["WhatsApp", "Facebook"],
    decision_heuristics: {
      primary_driver: "solidez_e_palavra",
      city: "Goiânia",
      state: "GO"
    },
    curriculum: {
      profession_title: "Mestre de Obras Autônomo e Empreiteiro",
      occupation_sector: "Construção Civil Residencial e Comercial",
      work_experience_years: 32,
      education_degree: "Ensino Médio Incompleto",
      career_summary: "Profissional experiente em Goiânia. Comanda equipes de pedreiros e carpinteiros, preza pela clareza de custos e não tolera promessas vagas.",
      key_competencies: ["Orçamento de Materiais e Mão de Obra", "Liderança de Canteiro de Obras", "Transparência Comercial"]
    },
    household_profile: {
      family_structure: "nuclear_com_filhos",
      total_members: 3,
      dependents_count: 1,
      dependents_ages: [18],
      decision_power_in_home: "decisor_conjunto"
    },
    financial_sheet: {
      gross_monthly_income_brl: 5400,
      net_monthly_income_brl: 4700,
      essential_fixed_expenses_brl: 3400,
      discretionary_surplus_brl: 1300,
      leisure_budget_monthly_brl: 400,
      liquid_reserves_brl: 6000,
      credit_limit_available_brl: 4500,
      debt_commitment_percent: 20,
      preferred_payment_method: "pix_a_vista"
    },
    bio: "Mestre de obras em Goiânia, trabalha com construção há 30 anos e valoriza transparência absoluta.",
    is_active: true,
  },
];

/**
 * Gerador Determinístico & Estocástico de Personas Sintéticas Calibradas por Cidade.
 * Permite criar amostras de 10 a 10.000 personas instantaneamente com ancoragem sociológica real.
 */
export function generateSyntheticCohort(options: {
  city?: string;
  region?: string;
  targetClasses?: Array<"A1" | "A2" | "B1" | "B2" | "C1" | "C2" | "D_E">;
  sampleSize?: number;
}): SyntheticArchetype[] {
  const size = options.sampleSize || 12;
  const classes = options.targetClasses || ["A1", "A2", "B1", "B2", "C1", "C2", "D_E"];
  const cities = options.city 
    ? BRAZILIAN_CITIES.filter(c => c.name.toLowerCase() === options.city!.toLowerCase())
    : options.region
    ? BRAZILIAN_CITIES.filter(c => c.region === options.region)
    : BRAZILIAN_CITIES;

  const result: SyntheticArchetype[] = [];

  const FIRST_NAMES_F = ["Carla", "Camila", "Juliana", "Vera", "Brenda", "Aline", "Mariana", "Fernanda", "Patrícia", "Neide", "Leticia", "Renata", "Daniela"];
  const FIRST_NAMES_M = ["Marcos", "Gabriel", "Lucas", "Rodrigo", "Tiago", "Moacir", "Felipe", "Eduardo", "Bruno", "Ricardo", "André", "Matheus", "Gustavo"];
  const SURNAMES = ["Silva", "Santos", "Oliveira", "Souza", "Pereira", "Albuquerque", "Silveira", "Zanin", "Fontes", "Motta", "Bastos", "Costa", "Lima", "Ferreira"];

  const CLASS_PROFILES: Record<string, { incomeRange: [number, number]; cynicism: [number, number]; priceSensitivity: [number, number]; impulsivity: [number, number] }> = {
    A1: { incomeRange: [25000, 45000], cynicism: [6.5, 8.5], priceSensitivity: [1.5, 3.0], impulsivity: [2.5, 4.5] },
    A2: { incomeRange: [18000, 24900], cynicism: [6.0, 8.0], priceSensitivity: [2.5, 4.0], impulsivity: [3.5, 5.0] },
    B1: { incomeRange: [11000, 17900], cynicism: [6.5, 8.5], priceSensitivity: [4.0, 6.0], impulsivity: [4.5, 6.5] },
    B2: { incomeRange: [6500, 10900], cynicism: [5.5, 7.5], priceSensitivity: [5.0, 7.0], impulsivity: [5.0, 7.0] },
    C1: { incomeRange: [3800, 6400], cynicism: [6.0, 8.0], priceSensitivity: [7.0, 9.0], impulsivity: [4.0, 6.5] },
    C2: { incomeRange: [2200, 3790], cynicism: [5.0, 7.5], priceSensitivity: [8.0, 9.5], impulsivity: [4.5, 7.5] },
    D_E: { incomeRange: [1412, 2190], cynicism: [4.5, 7.0], priceSensitivity: [9.0, 10.0], impulsivity: [2.5, 5.5] },
  };

  for (let i = 0; i < size; i++) {
    const selectedClass = classes[i % classes.length];
    const selectedCity = cities[i % cities.length] || BRAZILIAN_CITIES[0];
    const isFemale = i % 2 === 0;
    const firstName = isFemale ? FIRST_NAMES_F[i % FIRST_NAMES_F.length] : FIRST_NAMES_M[i % FIRST_NAMES_M.length];
    const surname = SURNAMES[(i * 3) % SURNAMES.length];
    const profile = CLASS_PROFILES[selectedClass] || CLASS_PROFILES.C1;

    const age = 20 + ((i * 7) % 45); // de 20 a 65 anos
    const income = Math.round(profile.incomeRange[0] + ((profile.incomeRange[1] - profile.incomeRange[0]) * ((i * 17) % 100) / 100));
    const cynicism = Number((profile.cynicism[0] + (profile.cynicism[1] - profile.cynicism[0]) * 0.5).toFixed(1));
    const priceSensitivity = Number((profile.priceSensitivity[0] + (profile.priceSensitivity[1] - profile.priceSensitivity[0]) * 0.5).toFixed(1));
    const impulsivity = Number((profile.impulsivity[0] + (profile.impulsivity[1] - profile.impulsivity[0]) * 0.5).toFixed(1));

    const netIncome = Math.round(income * (selectedClass.startsWith("A") ? 0.75 : selectedClass.startsWith("B") ? 0.82 : 0.88));
    const fixedExpenses = Math.round(income * (selectedClass.startsWith("A") ? 0.40 : selectedClass.startsWith("B") ? 0.55 : 0.72));
    const surplus = Math.max(200, netIncome - fixedExpenses);

    result.push({
      id: `synth-${selectedCity.name.toLowerCase()}-${selectedClass.toLowerCase()}-${i + 1}`,
      code: `BR_${isFemale ? "F" : "M"}_${age}_${selectedClass}_${selectedCity.name.toUpperCase().replace(/\s+/g, "_")}`,
      display_name: `${firstName} ${surname} (${selectedCity.name}/${selectedCity.state})`,
      gender: isFemale ? "feminino" : "masculino",
      age,
      age_range_label: `${Math.floor(age / 10) * 10}-${Math.floor(age / 10) * 10 + 9} anos`,
      abep_social_class: selectedClass as any,
      region: selectedCity.region,
      location_type: selectedCity.type,
      median_income_brl: income,
      education_level: selectedClass === "A1" || selectedClass === "A2" ? "Pós-graduação" : selectedClass.startsWith("B") ? "Superior Completo" : selectedClass === "C1" ? "Ensino Médio / Técnico" : "Ensino Médio Completo",
      cynicism_index: cynicism,
      price_sensitivity: priceSensitivity,
      impulsivity_index: impulsivity,
      primary_social_networks: isFemale ? ["Instagram", "WhatsApp"] : ["WhatsApp", "YouTube"],
      decision_heuristics: {
        city: selectedCity.name,
        state: selectedCity.state,
        seeks_delivery: selectedCity.type === "capital_metropole",
        prefers_local_trust: selectedCity.type !== "capital_metropole",
        cashflow_conscious: selectedClass.startsWith("C") || selectedClass === "D_E",
      },
      curriculum: {
        profession_title: selectedClass.startsWith("A") ? "Executivo / Especialista Sênior" : selectedClass.startsWith("B") ? "Analista Pleno / Empreendedor" : "Profissional Autônomo / Comerciário",
        occupation_sector: selectedCity.dominant_sectors[0] || "Serviços Gerais",
        work_experience_years: Math.max(2, age - 22),
        education_degree: selectedClass.startsWith("A") ? "Pós-graduação" : selectedClass.startsWith("B") ? "Superior Completo" : "Ensino Médio Completo",
        career_summary: `Atua no setor de ${selectedCity.dominant_sectors[0] || "Serviços"} em ${selectedCity.name}. Equilíbrio entre rotina profissional e compromissos familiares.`,
        key_competencies: ["Gestão Financeira Básica", "Avaliação de Risco Local", "Consumo Ponderado"]
      },
      household_profile: {
        family_structure: i % 3 === 0 ? "nuclear_com_filhos" : i % 3 === 1 ? "casal_sem_filhos" : "unipessoal",
        total_members: i % 3 === 0 ? 3 : i % 3 === 1 ? 2 : 1,
        dependents_count: i % 3 === 0 ? 1 : 0,
        decision_power_in_home: "decisora_principal"
      },
      financial_sheet: {
        gross_monthly_income_brl: income,
        net_monthly_income_brl: netIncome,
        essential_fixed_expenses_brl: fixedExpenses,
        discretionary_surplus_brl: surplus,
        leisure_budget_monthly_brl: Math.round(surplus * 0.35),
        liquid_reserves_brl: Math.round(surplus * 3),
        credit_limit_available_brl: Math.round(income * 0.8),
        debt_commitment_percent: selectedClass.startsWith("C") ? 25 : 10,
        preferred_payment_method: selectedClass.startsWith("A") ? "cartao_black_a_vista" : selectedClass.startsWith("B") ? "pix_a_vista" : "cartao_parcelado_sem_juros"
      },
      bio: `Residente em ${selectedCity.name} (${selectedCity.state}), classe ${selectedClass}. Renda mensal de R$ ${income.toLocaleString("pt-BR")}.`,
      is_active: true,
    });
  }

  return result;
}
