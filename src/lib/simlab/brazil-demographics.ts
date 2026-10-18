/**
 * Catálogo legado de arquétipos fictícios para exploração qualitativa.
 * Não é calibrado, não representa amostra/população e não deve gerar previsão quantitativa.
 * Dados demográficos reais só podem ser adicionados com fonte, versão, licença e transformação rastreáveis.
 */

import type { SyntheticArchetype } from "@/types/simlab";

// ─── ARQUÉTIPOS SINTÉTICOS DE SEED (FICTÍCIOS; NÃO CALIBRADOS) ──
const SEED_ARCHETYPES: Omit<SyntheticArchetype, "profile_origin" | "source_profile_type" | "calibration_status">[] = [
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
  {
    id: "f1a8c412-9012-4b5a-8e31-7c8899001122",
    code: "BR_M_44_CLASSE_B1_COOPERADO_SMO",
    display_name: "Valdir Bianchini (Produtor Integrado & Cooperado)",
    gender: "masculino",
    age: 44,
    age_range_label: "35-49 anos",
    abep_social_class: "B1",
    region: "Sul",
    location_type: "interior_polo",
    municipality: "São Miguel do Oeste - SC",
    median_income_brl: 11200,
    education_level: "Ensino Médio Técnico (Agropecuária)",
    cynicism_index: 7.2,
    price_sensitivity: 6.4,
    impulsivity_index: 3.2,
    primary_social_networks: ["WhatsApp", "Facebook", "YouTube"],
    decision_heuristics: {
      primary_driver: "durabilidade_pos_venda_local_e_desconto_a_vista",
      city: "São Miguel do Oeste",
      state: "SC",
      neighborhood: "Linha Sete de Setembro / Centro"
    },
    curriculum: {
      profession_title: "Produtor Rural Integrado (Suinocultura e Leite)",
      occupation_sector: "Agronegócio e Cooperativismo do Extremo Oeste",
      work_experience_years: 24,
      education_degree: "Técnico em Agropecuária",
      career_summary: "Produtor integrado em São Miguel do Oeste - SC. Compra caminhonetes, insumos, energia solar e lazer familiar na região, sempre negociando desconto forte no PIX e exigindo assistência técnica local.",
      key_competencies: ["Gestão de Custos Rurais", "Negociação à Vista no PIX", "Reputação na Comunidade Local"]
    },
    household_profile: {
      family_structure: "nuclear_com_filhos",
      total_members: 4,
      dependents_count: 2,
      dependents_ages: [12, 16],
      decision_power_in_home: "decisor_conjunto"
    },
    financial_sheet: {
      gross_monthly_income_brl: 11200,
      net_monthly_income_brl: 9650,
      essential_fixed_expenses_brl: 5200,
      discretionary_surplus_brl: 4450,
      leisure_budget_monthly_brl: 1450,
      liquid_reserves_brl: 48000,
      credit_limit_available_brl: 18000,
      debt_commitment_percent: 18,
      preferred_payment_method: "pix_a_vista"
    },
    bio: "Produtor integrado em São Miguel do Oeste - SC. Valoriza palavra cumprida, nota fiscal e atendimento olho no olho.",
    is_active: true,
  },
  {
    id: "d9b2e531-7410-4c9a-9f12-3a4455667788",
    code: "BR_F_29_CLASSE_B2_COMERCIO_SMO",
    display_name: "Camila Dalmagro (Gestora de Clínica & Comércio Local)",
    gender: "feminino",
    age: 29,
    age_range_label: "25-34 anos",
    abep_social_class: "B2",
    region: "Sul",
    location_type: "interior_polo",
    municipality: "São Miguel do Oeste - SC",
    median_income_brl: 6400,
    education_level: "Superior Completo (Administração - Unoesc)",
    cynicism_index: 5.8,
    price_sensitivity: 6.2,
    impulsivity_index: 5.6,
    primary_social_networks: ["Instagram", "WhatsApp", "TikTok"],
    decision_heuristics: {
      primary_driver: "prova_social_regional_e_praticidade",
      city: "São Miguel do Oeste",
      state: "SC",
      neighborhood: "Bairro Agostini / Centro"
    },
    curriculum: {
      profession_title: "Gestora Administrativa em Clínica Odontológica",
      occupation_sector: "Saúde Privada e Serviços Locais",
      work_experience_years: 8,
      education_degree: "Bacharel em Administração (Unoesc SMO)",
      career_summary: "Formada na Unoesc em São Miguel do Oeste. Consome gastronomia local, eventos, estética e pacotes de viagem de fim de semana (Itapiranga, Ametista do Sul, Serra e Litoral SC).",
      key_competencies: ["Atendimento ao Cliente", "Pesquisa no Instagram Local", "Compras Recorrentes"]
    },
    household_profile: {
      family_structure: "casal_sem_filhos",
      total_members: 2,
      dependents_count: 0,
      decision_power_in_home: "decisora_principal"
    },
    financial_sheet: {
      gross_monthly_income_brl: 6400,
      net_monthly_income_brl: 5380,
      essential_fixed_expenses_brl: 3350,
      discretionary_surplus_brl: 2030,
      leisure_budget_monthly_brl: 950,
      liquid_reserves_brl: 11000,
      credit_limit_available_brl: 9500,
      debt_commitment_percent: 24,
      preferred_payment_method: "cartao_parcelado_sem_juros"
    },
    bio: "Administradora em São Miguel do Oeste - SC, acompanha todas as novidades das lojas da cidade pelo Instagram e WhatsApp.",
    is_active: true,
  },
];

export const CANONICAL_BRAZIL_ARCHETYPES: SyntheticArchetype[] = SEED_ARCHETYPES.map((profile): SyntheticArchetype => ({
  ...profile,
  gender: profile.gender as SyntheticArchetype["gender"],
  profile_origin: "seed_catalog_profile",
  source_profile_type: "code_seed_catalog_unverified",
  calibration_status: "not_calibrated",
}));

export interface MunicipalityDemographicPreset {
  municipality: string;
  state: string;
  region: SyntheticArchetype["region"];
  location_type: SyntheticArchetype["location_type"];
  ibge_population_estimate: number;
  income_multiplier: number;
  class_weights: Record<SyntheticArchetype["abep_social_class"], number>;
  local_neighborhoods: string[];
  economic_context: string;
}

export const MUNICIPALITY_DEMOGRAPHIC_PRESETS: Record<string, MunicipalityDemographicPreset> = {
  "São Miguel do Oeste - SC": {
    municipality: "São Miguel do Oeste - SC",
    state: "SC",
    region: "Sul",
    location_type: "interior_polo",
    ibge_population_estimate: 44330,
    income_multiplier: 1.08,
    class_weights: { A1: 0.03, A2: 0.06, B1: 0.16, B2: 0.28, C1: 0.27, C2: 0.14, D_E: 0.06 },
    local_neighborhoods: ["Centro", "Agostini", "Sagrado Coração", "Andreatta", "Estrela", "São Gotardo", "Progresso"],
    economic_context: "Polo regional do Extremo Oeste Catarinense: forte presença de agroindústria, cooperativismo, comércio varejista consolidado, polo universitário (Unoesc) e serviços de saúde.",
  },
  "Chapecó - SC": {
    municipality: "Chapecó - SC",
    state: "SC",
    region: "Sul",
    location_type: "interior_polo",
    ibge_population_estimate: 254785,
    income_multiplier: 1.15,
    class_weights: { A1: 0.04, A2: 0.08, B1: 0.18, B2: 0.28, C1: 0.24, C2: 0.12, D_E: 0.06 },
    local_neighborhoods: ["Centro", "Efapi", "Presidente Médici", "Maria Goretti", "Passo dos Fortes", "Santa Maria"],
    economic_context: "Capital do Oeste Catarinense e polo global de proteína animal, logística, construção civil e tecnologia.",
  },
  "Pinhalzinho - SC": {
    municipality: "Pinhalzinho - SC",
    state: "SC",
    region: "Sul",
    location_type: "interior_medio",
    ibge_population_estimate: 21972,
    income_multiplier: 1.04,
    class_weights: { A1: 0.02, A2: 0.05, B1: 0.15, B2: 0.29, C1: 0.29, C2: 0.14, D_E: 0.06 },
    local_neighborhoods: ["Centro", "Efapi", "Pioneiro", "Nova Divinéia", "Bela Vista"],
    economic_context: "Economia industrial, laticínios, metalmecânica e cooperativismo integrado no Oeste de SC.",
  },
  "Maravilha - SC": {
    municipality: "Maravilha - SC",
    state: "SC",
    region: "Sul",
    location_type: "interior_medio",
    ibge_population_estimate: 28054,
    income_multiplier: 1.05,
    class_weights: { A1: 0.02, A2: 0.06, B1: 0.15, B2: 0.28, C1: 0.28, C2: 0.15, D_E: 0.06 },
    local_neighborhoods: ["Centro", "Bela Vista", "Floresta", "Progresso", "Universitário"],
    economic_context: "Cidade das Crianças, polo industrial têxtil, metalmecânico e comércio ativo na BR-282.",
  },
  "Florianópolis - SC": {
    municipality: "Florianópolis - SC",
    state: "SC",
    region: "Sul",
    location_type: "capital_metropole",
    ibge_population_estimate: 537211,
    income_multiplier: 1.28,
    class_weights: { A1: 0.06, A2: 0.11, B1: 0.21, B2: 0.26, C1: 0.2, C2: 0.1, D_E: 0.06 },
    local_neighborhoods: ["Centro", "Trindade", "Itacorubi", "Jurerê", "Campeche", "Ingleses", "Coqueiros"],
    economic_context: "Capital com alta concentração de tecnologia (Ilha do Silício), funcionalismo público e turismo de alto padrão.",
  },
  "São Paulo - SP": {
    municipality: "São Paulo - SP",
    state: "SP",
    region: "Sudeste",
    location_type: "capital_metropole",
    ibge_population_estimate: 11451999,
    income_multiplier: 1.22,
    class_weights: { A1: 0.05, A2: 0.09, B1: 0.17, B2: 0.24, C1: 0.23, C2: 0.14, D_E: 0.08 },
    local_neighborhoods: ["Pinheiros", "Vila Mariana", "Mooca", "Tatuapé", "Santana", "Santo Amaro", "Itaquera"],
    economic_context: "Maior centro financeiro, corporativo e de serviços da América Latina.",
  },
  Nacional: {
    municipality: "Nacional (Brasil Estratificado IBGE)",
    state: "BR",
    region: "Sudeste",
    location_type: "capital_metropole",
    ibge_population_estimate: 203080756,
    income_multiplier: 1.0,
    class_weights: { A1: 0.02, A2: 0.04, B1: 0.09, B2: 0.17, C1: 0.23, C2: 0.25, D_E: 0.2 },
    local_neighborhoods: ["Centro", "Zona Sul", "Zona Norte", "Bairro Industrial", "Subúrbio Comercial"],
    economic_context: "Amostra nacional estratificada conforme Censo Demográfico IBGE 2022, PNAD Contínua e POF.",
  },
};

function createDeterministicPrng(seedInput: string): () => number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seedInput.length; i++) {
    h ^= seedInput.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return function mulberry32() {
    let t = (h += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Gera uma coorte sintética estratificada pelo Censo IBGE/POF (de 5 até 500 personas únicas)
 * combinando arquétipos reais com expansão procedural determinística (MatrAIx 1200d + OCEAN).
 */
export function generateStratifiedSyntheticCohort(options: {
  count: number;
  baseProfiles?: SyntheticArchetype[];
  municipalityFilter?: string;
  regions?: string[];
  socialClasses?: string[];
  ageMin?: number;
  ageMax?: number;
  seed?: string;
}): {
  profiles: SyntheticArchetype[];
  preset: MunicipalityDemographicPreset;
} {
  const targetCount = Math.max(1, Math.min(500, Math.round(options.count || 20)));
  const presetKey =
    options.municipalityFilter && MUNICIPALITY_DEMOGRAPHIC_PRESETS[options.municipalityFilter]
      ? options.municipalityFilter
      : "Nacional";
  const preset = MUNICIPALITY_DEMOGRAPHIC_PRESETS[presetKey];
  const rand = createDeterministicPrng(
    `${options.seed || "waesy-simlab-v4"}:${presetKey}:${targetCount}`,
  );

  const catalog =
    options.baseProfiles && options.baseProfiles.length > 0
      ? options.baseProfiles
      : CANONICAL_BRAZIL_ARCHETYPES;

  // Filtra catálogo por classe e idade caso especificado
  let candidates = catalog.filter((p) => {
    if (
      options.socialClasses &&
      options.socialClasses.length > 0 &&
      !options.socialClasses.includes(p.abep_social_class)
    ) {
      return false;
    }
    if (typeof options.ageMin === "number" && p.age < options.ageMin) return false;
    if (typeof options.ageMax === "number" && p.age > options.ageMax) return false;
    return true;
  });

  if (candidates.length === 0) {
    candidates = [...catalog];
  }

  // Se o município for específico do Sul, prioriza candidatos da região ou adapta os perfis para a cidade-alvo
  const results: SyntheticArchetype[] = [];

  for (let idx = 0; idx < targetCount; idx++) {
    const template = candidates[idx % candidates.length];
    const isFirstPass = idx < candidates.length;
    const neighborhood =
      preset.local_neighborhoods[idx % preset.local_neighborhoods.length] || "Centro";
    const classWeight = preset.class_weights[template.abep_social_class] ?? 0.14;

    // Variação procedural de renda e idade quando expandindo além do catálogo base
    const incomeJitter = isFirstPass ? 1.0 : 0.86 + rand() * 0.32;
    const effectiveMultiplier =
      presetKey === "Nacional" ? incomeJitter : preset.income_multiplier * incomeJitter;

    const baseNetIncome =
      template.financial_sheet?.net_monthly_income_brl ??
      Number(template.median_income_brl || 3200);
    const adjustedNetIncome = Math.round(baseNetIncome * effectiveMultiplier);
    const baseFixed =
      template.financial_sheet?.essential_fixed_expenses_brl ??
      Math.round(baseNetIncome * 0.7);
    const adjustedFixed = Math.round(baseFixed * (0.92 + rand() * 0.16));
    const adjustedSurplus = Math.max(90, adjustedNetIncome - adjustedFixed);

    const ageOffset = isFirstPass ? 0 : Math.round((rand() - 0.5) * 6);
    const adjustedAge = Math.max(18, Math.min(82, template.age + ageOffset));

    const oceanVector = {
      openness: Math.round((4.5 + rand() * 5.0) * 10) / 10,
      conscientiousness: Math.round((5.0 + rand() * 4.5) * 10) / 10,
      extraversion: Math.round((3.8 + rand() * 5.8) * 10) / 10,
      agreeableness: Math.round((4.2 + rand() * 5.2) * 10) / 10,
      neuroticism: Math.round((2.5 + rand() * 6.0) * 10) / 10,
    };

    const localizedCity =
      presetKey !== "Nacional"
        ? preset.municipality
        : template.municipality ||
          `${template.decision_heuristics?.city || "Brasil"} - ${template.decision_heuristics?.state || template.region}`;

    const suffixLabel = isFirstPass ? "" : ` · Coorte #${idx + 1} (${neighborhood})`;

    results.push({
      ...template,
      id: isFirstPass ? template.id : `${template.id}-cohort-${idx + 1}`,
      code: isFirstPass ? template.code : `${template.code}_C${idx + 1}`,
      display_name: `${template.display_name}${suffixLabel}`,
      age: adjustedAge,
      region: presetKey !== "Nacional" ? preset.region : template.region,
      location_type: presetKey !== "Nacional" ? preset.location_type : template.location_type,
      municipality: localizedCity,
      median_income_brl: adjustedNetIncome,
      cynicism_index:
        Math.round(
          Math.max(1, Math.min(10, template.cynicism_index + (isFirstPass ? 0 : (rand() - 0.5) * 1.4))) *
            10,
        ) / 10,
      price_sensitivity:
        Math.round(
          Math.max(
            1,
            Math.min(10, template.price_sensitivity + (isFirstPass ? 0 : (rand() - 0.5) * 1.4)),
          ) * 10,
        ) / 10,
      impulsivity_index:
        Math.round(
          Math.max(
            1,
            Math.min(10, template.impulsivity_index + (isFirstPass ? 0 : (rand() - 0.5) * 1.4)),
          ) * 10,
        ) / 10,
      census_weight: classWeight,
      ocean_vector: oceanVector,
      financial_sheet: {
        gross_monthly_income_brl: Math.round(adjustedNetIncome * 1.18),
        net_monthly_income_brl: adjustedNetIncome,
        essential_fixed_expenses_brl: adjustedFixed,
        discretionary_surplus_brl: adjustedSurplus,
        leisure_budget_monthly_brl: Math.round(adjustedSurplus * 0.42),
        liquid_reserves_brl: Math.round(
          (template.financial_sheet?.liquid_reserves_brl ?? adjustedSurplus * 3) * effectiveMultiplier,
        ),
        credit_limit_available_brl: Math.round(
          (template.financial_sheet?.credit_limit_available_brl ?? adjustedNetIncome * 1.4) *
            effectiveMultiplier,
        ),
        debt_commitment_percent: template.financial_sheet?.debt_commitment_percent ?? 24,
        preferred_payment_method:
          template.financial_sheet?.preferred_payment_method ?? "cartao_parcelado_sem_juros",
      },
      decision_heuristics: {
        ...template.decision_heuristics,
        city: presetKey !== "Nacional" ? preset.municipality.split(" - ")[0] : template.decision_heuristics?.city,
        state: presetKey !== "Nacional" ? preset.state : template.decision_heuristics?.state,
        neighborhood,
        economic_context: preset.economic_context,
      },
      profile_origin: isFirstPass ? template.profile_origin : "procedural_ibge_profile",
    });
  }

  return { profiles: results, preset };
}

