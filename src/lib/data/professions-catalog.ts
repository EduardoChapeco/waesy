/**
 * professions-catalog.ts — Catálogo Centralizado de Profissões e Ocupações do Brasil (CBO / MTE)
 * Enriquecido com Código CBO oficial, faixas salariais de mercado por senioridade (Júnior, Pleno, Sênior, Lead),
 * piso salarial da categoria (em centavos BRL), modalidades comuns (CLT, PJ, Freela) e competências técnicas.
 */

export interface ProfessionDefinition {
  id: string;
  cbo_code: string;
  title: string;
  sector: string;
  category: string;
  description: string;
  required_education: string;
  technical_body?: string;
  standard_workload_hours_weekly: number;
  hiring_regimes: string[];
  junior_salary_cents: number;
  average_salary_junior_cents: number;
  mid_salary_cents: number;
  average_salary_mid_cents: number;
  senior_salary_cents: number;
  average_salary_senior_cents: number;
  lead_salary_cents: number;
  average_salary_lead_cents: number;
  hourly_rate_cents: number;
  hourly_rate_benchmark_cents: number;
  common_regimes: Array<"clt" | "pj" | "freela" | "diaria" | "estagio">;
  required_skills: string[];
  essential_skills: string[];
  behavioral_competencies: string[];
  market_demand_level: "altíssima" | "alta" | "moderada" | "estável";
  tags: string[];
}

export type ProfessionRecord = ProfessionDefinition;

const RAW_PROFESSIONS = [
  // ── 1. TECNOLOGIA DA INFORMAÇÃO & PRODUTO DIGITAL ──
  {
    cbo_code: "2124-05",
    title: "Desenvolvedor de Software Full Stack",
    sector: "Tecnologia & Inovação",
    description: "Planeja, desenvolve e sustenta aplicações web completas (frontend, backend e banco de dados), arquiteturas de microsserviços e APIs REST/GraphQL.",
    junior_salary_cents: 450000,   // R$ 4.500,00
    mid_salary_cents: 850000,      // R$ 8.500,00
    senior_salary_cents: 1400000,  // R$ 14.000,00
    lead_salary_cents: 2000000,    // R$ 20.000,00
    hourly_rate_cents: 8500,       // R$ 85,00/h
    common_regimes: ["clt", "pj", "freela"],
    required_skills: ["TypeScript", "React", "Node.js", "PostgreSQL", "Git", "Docker", "REST APIs"],
    tags: ["programador", "full stack", "desenvolvedor", "ti", "software", "tecnologia"],
  },
  {
    cbo_code: "2124-20",
    title: "Designer de UI/UX (Interface e Experiência)",
    sector: "Tecnologia & Inovação",
    description: "Elabora arquitetura de informação, protótipos de alta fidelidade, design systems e fluxos ergonômicos centrados no usuário para produtos digitais.",
    junior_salary_cents: 380000,   // R$ 3.800,00
    mid_salary_cents: 700000,      // R$ 7.000,00
    senior_salary_cents: 1200000,  // R$ 12.000,00
    lead_salary_cents: 1750000,    // R$ 17.500,00
    hourly_rate_cents: 7000,       // R$ 70,00/h
    common_regimes: ["clt", "pj", "freela"],
    required_skills: ["Figma", "Design System", "Design Ops", "Prototipagem", "Pesquisa UX", "Testes de Usabilidade"],
    tags: ["ux", "ui", "designer", "produto", "figma", "usabilidade"],
  },
  {
    cbo_code: "2124-30",
    title: "Engenheiro de DevOps & Cloud",
    sector: "Tecnologia & Inovação",
    description: "Gerencia pipelines de CI/CD, esteiras de automação de infraestrutura em nuvem, orquestração de containers e monitoramento de observabilidade.",
    junior_salary_cents: 550000,   // R$ 5.500,00
    mid_salary_cents: 1000000,     // R$ 10.000,00
    senior_salary_cents: 1650000,  // R$ 16.500,00
    lead_salary_cents: 2300000,    // R$ 23.000,00
    hourly_rate_cents: 11000,      // R$ 110,00/h
    common_regimes: ["clt", "pj"],
    required_skills: ["AWS", "Docker", "Kubernetes", "Terraform", "CI/CD", "Linux", "Grafana"],
    tags: ["devops", "cloud", "aws", "infraestrutura", "kubernetes", "sre"],
  },
  {
    cbo_code: "2124-40",
    title: "Cientista de Dados & Engenheiro de IA",
    sector: "Tecnologia & Inovação",
    description: "Modela soluções estatísticas, aprendizado de máquina (Machine Learning), automações de modelos de linguagem (LLMs) e análise preditiva de negócios.",
    junior_salary_cents: 500000,   // R$ 5.000,00
    mid_salary_cents: 950000,      // R$ 9.500,00
    senior_salary_cents: 1550000,  // R$ 15.500,00
    lead_salary_cents: 2200000,    // R$ 22.000,00
    hourly_rate_cents: 10000,      // R$ 100,00/h
    common_regimes: ["clt", "pj"],
    required_skills: ["Python", "SQL", "Machine Learning", "LLMs", "Pandas", "PyTorch", "Estatística"],
    tags: ["dados", "data science", "inteligência artificial", "ia", "python", "machine learning"],
  },

  // ── 2. GESTÃO, FINANÇAS, VENDAS & B2B ──
  {
    cbo_code: "2522-10",
    title: "Contador Geral & Consultor Tributário",
    sector: "Gestão & Finanças",
    description: "Supervisiona escriturações contábeis e fiscais, demonstrações financeiras (DRE, Balanço), planejamento tributário e enquadramentos da Reforma Tributária 2026.",
    junior_salary_cents: 380000,   // R$ 3.800,00
    mid_salary_cents: 650000,      // R$ 6.500,00
    senior_salary_cents: 1100000,  // R$ 11.000,00
    lead_salary_cents: 1600000,    // R$ 16.000,00
    hourly_rate_cents: 6500,       // R$ 65,00/h
    common_regimes: ["clt", "pj", "freela"],
    required_skills: ["CRC Ativo", "Legislação Tributária", "Reforma 2026", "Sped Fiscal", "Balanço Patrimonial", "DRE"],
    tags: ["contador", "contabilidade", "fiscal", "tributos", "crc", "finanças"],
  },
  {
    cbo_code: "1423-05",
    title: "Gerente Comercial & Vendas B2B",
    sector: "Vendas & Negócios",
    description: "Estrutura estratégias de expansão de vendas, gestão de funil comercial (CRM), liderança de times de consultores e negociações corporativas de médio e grande porte.",
    junior_salary_cents: 400000,   // R$ 4.000,00 (+ comissões)
    mid_salary_cents: 750000,      // R$ 7.500,00
    senior_salary_cents: 1300000,  // R$ 13.000,00
    lead_salary_cents: 2000000,    // R$ 20.000,00
    hourly_rate_cents: 8000,       // R$ 80,00/h
    common_regimes: ["clt", "pj"],
    required_skills: ["CRM", "Inside Sales", "Negociação B2B", "Liderança de Times", "Forecast", "KPIs de Vendas"],
    tags: ["comercial", "vendas", "gerente", "b2b", "fechamento", "negociação"],
  },
  {
    cbo_code: "2531-15",
    title: "Analista de Marketing Digital & Tráfego Pago",
    sector: "Marketing & Comunicação",
    description: "Gerencia campanhas de tráfego pago (Meta Ads, Google Ads), funis de conversão, otimização de ROAS e telemetria avançada de eventos e conversões.",
    junior_salary_cents: 320000,   // R$ 3.200,00
    mid_salary_cents: 550000,      // R$ 5.500,00
    senior_salary_cents: 900000,   // R$ 9.000,00
    lead_salary_cents: 1350000,    // R$ 13.500,00
    hourly_rate_cents: 5500,       // R$ 55,00/h
    common_regimes: ["clt", "pj", "freela"],
    required_skills: ["Meta Ads", "Google Ads", "Google Analytics 4", "Copywriting", "Gestão de Tráfego", "ROAS"],
    tags: ["marketing", "tráfego pago", "meta ads", "google ads", "growth", "anúncios"],
  },

  // ── 3. SAÚDE, CUIDADOS & BEM-ESTAR ──
  {
    cbo_code: "2251-25",
    title: "Médico Clínico Geral",
    sector: "Saúde & Cuidados",
    description: "Realiza consultas ambulatoriais, diagnósticos clínicos, prescrições de medicamentos, solicitação de exames e encaminhamentos a especialistas.",
    junior_salary_cents: 1200000,  // R$ 12.000,00
    mid_salary_cents: 1800000,     // R$ 18.000,00
    senior_salary_cents: 2600000,  // R$ 26.000,00
    lead_salary_cents: 3500000,    // R$ 35.000,00
    hourly_rate_cents: 15000,      // R$ 150,00/h (Plantão / Consulta)
    common_regimes: ["pj", "clt"],
    required_skills: ["CRM Ativo", "Diagnóstico Clínico", "Prescrição Médica", "Atendimento Humanizado", "Urgência e Emergência"],
    tags: ["médico", "clínico geral", "saúde", "crm", "consulta", "medicina"],
  },
  {
    cbo_code: "2236-05",
    title: "Fisioterapeuta Ortopédico & Reabilitação",
    sector: "Saúde & Cuidados",
    description: "Avalia distúrbios cinéticos funcionais, prescreve planos de reabilitação motora, alívio de dor e prevenção de lesões musculoesqueléticas.",
    junior_salary_cents: 350000,   // R$ 3.500,00
    mid_salary_cents: 520000,      // R$ 5.200,00
    senior_salary_cents: 800000,   // R$ 8.000,00
    lead_salary_cents: 1150000,    // R$ 11.500,00
    hourly_rate_cents: 8000,       // R$ 80,00 por sessão
    common_regimes: ["clt", "pj", "freela"],
    required_skills: ["CREFITO Ativo", "Reabilitação Motora", "Terapia Manual", "Pilates Clínico", "Cinesioterapia"],
    tags: ["fisioterapia", "fisioterapeuta", "reabilitação", "crefito", "coluna", "ortopedia"],
  },
  {
    cbo_code: "2237-10",
    title: "Nutricionista Clínico & Esportivo",
    sector: "Saúde & Cuidados",
    description: "Elabora planos alimentares individualizados, análise de composição corporal (bioimpedância) e orientação nutricional esportiva e preventiva.",
    junior_salary_cents: 300000,   // R$ 3.000,00
    mid_salary_cents: 480000,      // R$ 4.800,00
    senior_salary_cents: 750000,   // R$ 7.500,00
    lead_salary_cents: 1050000,    // R$ 10.500,00
    hourly_rate_cents: 10000,      // R$ 100,00 por consulta
    common_regimes: ["clt", "pj", "freela"],
    required_skills: ["CRN Ativo", "Bioimpedância", "Dietoterapia", "Nutrição Esportiva", "Antropometria"],
    tags: ["nutricionista", "dieta", "emagrecimento", "saúde", "crn", "alimentação"],
  },
  {
    cbo_code: "2235-05",
    title: "Enfermeiro Geral & Coordenador Assistencial",
    sector: "Saúde & Cuidados",
    description: "Coordena equipes de enfermagem, administra medicações complexas, curativos especializados e supervisiona protocolos de segurança do paciente.",
    junior_salary_cents: 475000,   // R$ 4.750,00 (Piso Nacional Enfermagem)
    mid_salary_cents: 650000,      // R$ 6.500,00
    senior_salary_cents: 950000,   // R$ 9.500,00
    lead_salary_cents: 1300000,    // R$ 13.000,00
    hourly_rate_cents: 5500,       // R$ 55,00/h
    common_regimes: ["clt", "pj"],
    required_skills: ["COREN Ativo", "Piso Nacional Enfermagem", "Triagem", "Gestão Hospitalar", "Cuidados Intensivos"],
    tags: ["enfermeiro", "enfermagem", "coren", "hospital", "plantão", "saúde"],
  },

  // ── 4. GASTRONOMIA, BARES & HOSPITALIDADE ──
  {
    cbo_code: "5134-05",
    title: "Chef de Cozinha & Coordenador Gastronômico",
    sector: "Gastronomia & Hospitalidade",
    description: "Cria fichas técnicas, elabora cardápios autorais, calcula CMV (Custo de Mercadoria Vendida), treina equipes de praça e controla segurança alimentar.",
    junior_salary_cents: 400000,   // R$ 4.000,00
    mid_salary_cents: 650000,      // R$ 6.500,00
    senior_salary_cents: 1050000,  // R$ 10.500,00
    lead_salary_cents: 1600000,    // R$ 16.000,00
    hourly_rate_cents: 6000,       // R$ 60,00/h
    common_regimes: ["clt", "pj"],
    required_skills: ["Ficha Técnica", "Cálculo de CMV", "Gestão de Cozinha", "Boas Práticas ANVISA", "Cardápios"],
    tags: ["chef", "cozinha", "restaurante", "gastronomia", "culinária", "cmv"],
  },
  {
    cbo_code: "5135-05",
    title: "Cozinheiro Geral & Chapeiro",
    sector: "Gastronomia & Hospitalidade",
    description: "Prepara pratos quentes e frios, cortes de carnes, lanches artesanais, porções e organiza mise en place da cozinha em restaurante e hamburguerias.",
    junior_salary_cents: 220000,   // R$ 2.200,00
    mid_salary_cents: 320000,      // R$ 3.200,00
    senior_salary_cents: 450000,   // R$ 4.500,00
    lead_salary_cents: 600000,     // R$ 6.000,00
    hourly_rate_cents: 2500,       // R$ 25,00/h (Diária média R$ 200,00)
    common_regimes: ["clt", "diaria", "pj"],
    required_skills: ["Mise en Place", "Boas Práticas de Higiene", "Agilidade na Chapa", "Cozimento", "Grelhados"],
    tags: ["cozinheiro", "chapeiro", "cozinha", "hambúrguer", "lanche", "restaurante"],
  },
  {
    cbo_code: "5132-20",
    title: "Pizzaiolo Forneiro & Padeiro Artesanal",
    sector: "Gastronomia & Hospitalidade",
    description: "Preparo de massas de fermentação longa e natural (levain/biga), molhos artesanais, abertura manual de discos e operação de forno a lenha, lastro e esteira.",
    junior_salary_cents: 230000,   // R$ 2.300,00
    mid_salary_cents: 360000,      // R$ 3.600,00
    senior_salary_cents: 520000,   // R$ 5.200,00
    lead_salary_cents: 750000,     // R$ 7.500,00
    hourly_rate_cents: 3000,       // R$ 30,00/h
    common_regimes: ["clt", "diaria", "pj"],
    required_skills: ["Fermentação Natural", "Forno a Lenha", "Abertura Manual", "Mise en Place", "Controle de Temperatura"],
    tags: ["pizzaiolo", "pizza", "forneiro", "massa", "pizzaria", "gastronomia"],
  },
  {
    cbo_code: "5134-25",
    title: "Sushiman Especialista & Saucier",
    sector: "Gastronomia & Hospitalidade",
    description: "Especialista no preparo e filetagem de pescados nobres (salmão, atum, peixe branco), preparação de arroz shari e montagem de combinados premium.",
    junior_salary_cents: 280000,   // R$ 2.800,00
    mid_salary_cents: 450000,      // R$ 4.500,00
    senior_salary_cents: 700000,   // R$ 7.000,00
    lead_salary_cents: 950000,     // R$ 9.500,00
    hourly_rate_cents: 4000,       // R$ 40,00/h
    common_regimes: ["clt", "diaria", "pj"],
    required_skills: ["Filetagem de Pescados", "Preparo de Shari", "Cozinha Japonesa", "Controle de Temperatura", "Combinados"],
    tags: ["sushiman", "sushi", "oriental", "salmão", "japonesa", "gastronomia"],
  },
  {
    cbo_code: "5134-20",
    title: "Barman & Mixologista de Coquetelaria",
    sector: "Gastronomia & Hospitalidade",
    description: "Criação e execução de coquetéis clássicos e autorais, manipulação de xaropes artesanais, infusões e gestão de estoque de destilados.",
    junior_salary_cents: 220000,   // R$ 2.200,00
    mid_salary_cents: 350000,      // R$ 3.500,00
    senior_salary_cents: 550000,   // R$ 5.500,00
    lead_salary_cents: 800000,     // R$ 8.000,00
    hourly_rate_cents: 3500,       // R$ 35,00/h (Eventos / Diárias)
    common_regimes: ["clt", "diaria", "freela"],
    required_skills: ["Mixologia", "Coquetelaria Clássica", "Atendimento ao Balcão", "Controle de Doses", "Speed Opening"],
    tags: ["barman", "bartender", "drinks", "coquetéis", "bar", "mixologia"],
  },

  // ── 5. SERVIÇOS GERAIS, MANUTENÇÃO, OBRAS & REFORMAS ──
  {
    cbo_code: "7156-15",
    title: "Eletricista Predial & Residencial",
    sector: "Engenharia & Manutenção",
    description: "Executa instalações de quadros de distribuição, cabeamento estruturado, circuitos bifásicos e trifásicos, disjuntores e sistemas de aterramento conforme NR-10.",
    junior_salary_cents: 250000,   // R$ 2.500,00
    mid_salary_cents: 380000,      // R$ 3.800,00
    senior_salary_cents: 550000,   // R$ 5.500,00
    lead_salary_cents: 800000,     // R$ 8.000,00
    hourly_rate_cents: 6000,       // R$ 60,00/h (Visita/Ponto R$ 120-180)
    common_regimes: ["clt", "pj", "freela"],
    required_skills: ["NR-10 Válida", "Leitura de Diagramas Elétricos", "Quadros de Distribuição", "Aterramento", "Normas ABNT NBR 5410"],
    tags: ["eletricista", "elétrica", "fiação", "quadro de luz", "nr-10", "manutenção"],
  },
  {
    cbo_code: "7241-10",
    title: "Encanador & Instalador Hidráulico",
    sector: "Engenharia & Manutenção",
    description: "Localiza vazamentos com geofone, instala tubulações de água fria e quente (PPR, CPVC, Cobre), reparos em válvulas de descarga, caixas d'água e bombas.",
    junior_salary_cents: 240000,   // R$ 2.400,00
    mid_salary_cents: 360000,      // R$ 3.600,00
    senior_salary_cents: 520000,   // R$ 5.200,00
    lead_salary_cents: 750000,     // R$ 7.500,00
    hourly_rate_cents: 5500,       // R$ 55,00/h (Visita R$ 150,00)
    common_regimes: ["clt", "pj", "freela"],
    required_skills: ["Detecção de Vazamentos", "Tubulação PPR/CPVC", "Sistemas de Esgoto", "Instalação de Louças", "Bombas"],
    tags: ["encanador", "hidráulica", "vazamento", "cano", "infiltração", "reforma"],
  },
  {
    cbo_code: "9144-05",
    title: "Mecânico de Automóveis & Injeção Eletrônica",
    sector: "Automotivo & Mecânica",
    description: "Diagnóstico computadorizado por scanner OBD-II, retífica de motores, suspensão, freios ABS, troca de correias e revisão preventiva de veículos leves.",
    junior_salary_cents: 280000,   // R$ 2.800,00
    mid_salary_cents: 420000,      // R$ 4.200,00
    senior_salary_cents: 650000,   // R$ 6.500,00
    lead_salary_cents: 950000,     // R$ 9.500,00
    hourly_rate_cents: 7000,       // R$ 70,00/h de oficina
    common_regimes: ["clt", "pj"],
    required_skills: ["Scanner OBD-II", "Injeção Eletrônica", "Suspensão & Freios", "Diagnóstico de Motor", "Câmbio Manual e Automático"],
    tags: ["mecânico", "oficina", "carro", "injeção eletrônica", "revisão", "automotivo"],
  },
  {
    cbo_code: "7152-10",
    title: "Pedreiro de Acabamento & Mestre de Obras",
    sector: "Engenharia & Manutenção",
    description: "Executa assentamento de porcelanatos em grandes formatos, alvenaria estrutural, nivelamento com laser, contra-piso e gestão de canteiro de obras residenciais.",
    junior_salary_cents: 240000,   // R$ 2.400,00
    mid_salary_cents: 380000,      // R$ 3.800,00
    senior_salary_cents: 550000,   // R$ 5.500,00
    lead_salary_cents: 800000,     // R$ 8.000,00
    hourly_rate_cents: 4000,       // R$ 40,00/h (Diária R$ 220-300)
    common_regimes: ["clt", "diaria", "pj"],
    required_skills: ["Porcelanato em Grande Formato", "Nivelamento Laser", "Alvenaria", "Leitura de Plantas", "Cálculo de Materiais"],
    tags: ["pedreiro", "reforma", "obra", "porcelanato", "acabamento", "construção"],
  },
  {
    cbo_code: "5121-05",
    title: "Diarista & Profissional de Higienização Residencial",
    sector: "Serviços Domésticos",
    description: "Higienização profunda de residências, apartamentos, vidraças, organização de ambientes e desinfecção com produtos adequados e alta agilidade.",
    junior_salary_cents: 200000,   // R$ 2.000,00
    mid_salary_cents: 300000,      // R$ 3.000,00
    senior_salary_cents: 420000,   // R$ 4.200,00
    lead_salary_cents: 550000,     // R$ 5.500,00
    hourly_rate_cents: 3000,       // R$ 30,00/h (Diária típica R$ 180-250)
    common_regimes: ["diaria", "freela", "clt"],
    required_skills: ["Limpeza Pesada", "Higienização de Vidros", "Organização", "Pontualidade", "Cuidado com Superfícies"],
    tags: ["diarista", "faxina", "limpeza", "casa", "higienização", "residencial"],
  },

  // ── 6. LOGÍSTICA, ENTREGAS & MOBILIDADE URBANA ──
  {
    cbo_code: "5191-10",
    title: "Entregador Motofretista (MotoLink / Delivery)",
    sector: "Logística & Mobilidade",
    description: "Transporte ágil de pedidos de gastronomia, farmácias, e-commerce e malotes em perímetro urbano com baú ou mochila térmica e CNH categoria A válida.",
    junior_salary_cents: 240000,   // R$ 2.400,00
    mid_salary_cents: 360000,      // R$ 3.600,00
    senior_salary_cents: 500000,   // R$ 5.000,00
    lead_salary_cents: 680000,     // R$ 6.800,00
    hourly_rate_cents: 3000,       // R$ 30,00/h (ou por corrida R$ 8-15)
    common_regimes: ["pj", "freela", "clt"],
    required_skills: ["CNH A Válida", "Condução Defensiva", "GPS Urbano", "Agilidade", "Cuidados com Alimentos"],
    tags: ["motoboy", "entregador", "motolink", "delivery", "moto", "frete"],
  },
  {
    cbo_code: "7825-10",
    title: "Motorista de Carga & Utilitários Leves (Fiorino / Van)",
    sector: "Logística & Mobilidade",
    description: "Transporte rodoviário e distribuição urbana de mercadorias, conferência de notas fiscais, carga e descarga com segurança em veículo utilitário.",
    junior_salary_cents: 260000,   // R$ 2.600,00
    mid_salary_cents: 380000,      // R$ 3.800,00
    senior_salary_cents: 540000,   // R$ 5.400,00
    lead_salary_cents: 720000,     // R$ 7.200,00
    hourly_rate_cents: 3500,       // R$ 35,00/h
    common_regimes: ["clt", "pj"],
    required_skills: ["CNH B/C/D", "Conferência de NF-e", "Roteirização", "Carga e Descarga", "Direção Defensiva"],
    tags: ["motorista", "utilitário", "fiorino", "transporte", "logística", "distribuição"],
  },

  // ── 7. BELEZA, ESTÉTICA & CUIDADOS PESSOAIS ──
  {
    cbo_code: "5161-10",
    title: "Barbeiro & Cabeleireiro Estilista",
    sector: "Beleza & Estética",
    description: "Execução de cortes masculinos e femininos, degradê na navalha (fade), barba com toalha quente, colorimetria e tratamentos capilares.",
    junior_salary_cents: 220000,   // R$ 2.200,00 (+ comissão)
    mid_salary_cents: 380000,      // R$ 3.800,00
    senior_salary_cents: 650000,   // R$ 6.500,00
    lead_salary_cents: 950000,     // R$ 9.500,00
    hourly_rate_cents: 4500,       // R$ 45,00 por corte
    common_regimes: ["pj", "clt", "freela"],
    required_skills: ["Corte Tesoura e Máquina", "Degradê/Fade", "Barboterapia", "Colorimetria", "Visagismo"],
    tags: ["barbeiro", "barbearia", "cabeleireiro", "corte", "fade", "beleza"],
  },
  {
    cbo_code: "5161-20",
    title: "Manicure, Pedicure & Nail Designer",
    sector: "Beleza & Estética",
    description: "Alongamento de unhas em fibra de vidro, gel e acrílico, cutilagem russa, esmaltação em gel e spa dos pés com instrumentos esterilizados em autoclave.",
    junior_salary_cents: 200000,   // R$ 2.000,00
    mid_salary_cents: 320000,      // R$ 3.200,00
    senior_salary_cents: 520000,   // R$ 5.200,00
    lead_salary_cents: 750000,     // R$ 7.500,00
    hourly_rate_cents: 4000,       // R$ 40,00 por procedimento
    common_regimes: ["pj", "freela", "clt"],
    required_skills: ["Alongamento Fibra/Gel", "Cutilagem", "Esmaltação em Gel", "Esterilização Autoclave", "Nail Art"],
    tags: ["manicure", "nail designer", "unhas", "fibra de vidro", "pedicure", "estética"],
  },
];

export const GLOBAL_PROFESSIONS_CATALOG: ProfessionDefinition[] = RAW_PROFESSIONS.map((p) => {
  const education = p.sector.includes("Tecnologia") || p.sector.includes("Comunicação") || p.sector.includes("Saúde") || p.sector.includes("Jurídico")
    ? "Ensino Superior Completo"
    : p.sector.includes("Operações") || p.sector.includes("Beleza") || p.sector.includes("Gastronomia")
    ? "Ensino Médio / Técnico"
    : "Ensino Médio Completo";

  return {
    ...p,
    common_regimes: p.common_regimes as Array<"clt" | "pj" | "freela" | "diaria" | "estagio">,
    id: `prof-${p.cbo_code.replace("-", "")}`,
    category: p.sector,
    required_education: education,
    standard_workload_hours_weekly: 44,
    hiring_regimes: p.common_regimes.map((r) => r.toUpperCase()),
    average_salary_junior_cents: p.junior_salary_cents,
    average_salary_mid_cents: p.mid_salary_cents,
    average_salary_senior_cents: p.senior_salary_cents,
    average_salary_lead_cents: p.lead_salary_cents,
    hourly_rate_benchmark_cents: p.hourly_rate_cents,
    essential_skills: p.required_skills,
    behavioral_competencies: ["Comunicação Assertiva", "Trabalho em Equipe", "Resolução de Problemas", "Comprometimento"],
    market_demand_level: "alta",
  };
});

/**
 * Busca a profissão mais compatível a partir do título do cargo ou CBO
 */
export function findProfessionByTitle(query?: string | null): ProfessionDefinition | null {
  if (!query || typeof query !== "string") return null;
  const clean = query.trim().toLowerCase();
  if (!clean) return null;

  // 1. Busca exata por CBO
  const byCbo = GLOBAL_PROFESSIONS_CATALOG.find((p) => p.cbo_code.toLowerCase() === clean);
  if (byCbo) return byCbo;

  // 2. Busca exata por título
  const byTitleExact = GLOBAL_PROFESSIONS_CATALOG.find((p) => p.title.toLowerCase() === clean);
  if (byTitleExact) return byTitleExact;

  // 3. Busca por inclusão de termos inteiros no título ou tags (sem colisão por substrings curtas)
  const cleanWords = clean.split(/[\s,/-]+/).filter((w) => w.length > 2);
  const byTitleIncludes = GLOBAL_PROFESSIONS_CATALOG.find((p) => {
    const pTitleLower = p.title.toLowerCase();
    if (pTitleLower.includes(clean)) return true;

    // Todas as palavras da busca constam no título ou tags exatas
    const pTagsLower = p.tags.map((t) => t.toLowerCase());
    return cleanWords.every((w) => pTitleLower.includes(w) || pTagsLower.includes(w));
  });
  if (byTitleIncludes) return byTitleIncludes;

  // 4. Busca ponderada por relevância de tokens com peso maior para termo principal
  if (cleanWords.length > 0) {
    const STOPWORDS = new Set(["profissional", "especialista", "senior", "pleno", "junior", "auxiliar", "assistente"]);
    const primaryKeyword = cleanWords[0]; // Primeiro termo é o substantivo principal da ocupação
    let bestMatch: ProfessionDefinition | null = null;
    let highestScore = 0;

    for (const p of GLOBAL_PROFESSIONS_CATALOG) {
      const pTitleLower = p.title.toLowerCase();
      const pWords = (pTitleLower + " " + p.tags.join(" ")).toLowerCase().split(/[\s,/-]+/);
      let score = 0;

      // Bônus se o título começar pelo termo principal pesquisado
      if (pTitleLower.startsWith(primaryKeyword)) {
        score += 15;
      }

      for (let idx = 0; idx < cleanWords.length; idx++) {
        const t = cleanWords[idx];
        const isStopword = STOPWORDS.has(t);
        const weight = idx === 0 ? 3 : 1; // Primeiro termo tem peso triplicado

        if (pWords.includes(t)) {
          score += (isStopword ? 1 : 6) * weight;
        } else if (pWords.some((w) => w.startsWith(t) || (w.length > 3 && t.startsWith(w)))) {
          score += (isStopword ? 1 : 3) * weight;
        }
      }

      if (score > highestScore) {
        highestScore = score;
        bestMatch = p;
      }
    }

    if (bestMatch && highestScore >= 3) return bestMatch;
  }

  return null;
}
