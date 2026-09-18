/**
 * cnae-catalog.ts — Tabela Nacional de CNAEs (Classificação Nacional de Atividades Econômicas)
 * Fonte: IBGE / Concla & Receita Federal do Brasil
 * Usado para: Onboarding de Lojas e Empresas, Emissão Fiscal de NFS-e / NF-e,
 * Enquadramento no Simples Nacional e parametrização tributária automática.
 */

export interface CnaeRecord {
  code: string; // Ex: "4711-3/02"
  raw_code: string; // "4711302"
  description: string;
  sector: "Comércio Varejista" | "Alimentação & Gastronomia" | "Tecnologia & Inovação" | "Serviços Profissionais" | "Saúde & Cuidados" | "Logística & Transporte" | "Turismo & Hospedagem" | "Construção & Reformas" | "Automotivo";
  simples_nacional_anexo: "Anexo I (Comércio)" | "Anexo II (Indústria)" | "Anexo III (Serviços)" | "Anexo IV (Construção/Advocacia)" | "Anexo V (Tecnologia/Engenharia)";
  fator_r_applies: boolean; // Se sujeito ao Fator R (transição Anexo V -> Anexo III com folha >= 28%)
  keywords: string[];
}

export const GLOBAL_CNAE_CATALOG: CnaeRecord[] = [
  // ── 1. COMÉRCIO VAREJISTA ──
  {
    code: "4711-3/02",
    raw_code: "4711302",
    description: "Comércio varejista de mercadorias em geral, com predominância de produtos alimentícios - minimercados, mercearias e armazéns",
    sector: "Comércio Varejista",
    simples_nacional_anexo: "Anexo I (Comércio)",
    fator_r_applies: false,
    keywords: ["mercado", "minimercado", "mercearia", "armazém", "mercearia de bairro", "conveniência"],
  },
  {
    code: "4711-3/01",
    raw_code: "4711301",
    description: "Comércio varejista de mercadorias em geral, com predominância de produtos alimentícios - hipermercados e supermercados",
    sector: "Comércio Varejista",
    simples_nacional_anexo: "Anexo I (Comércio)",
    fator_r_applies: false,
    keywords: ["supermercado", "hipermercado", "atacarejo", "alimentos", "hortifrúti"],
  },
  {
    code: "4781-4/00",
    raw_code: "4781400",
    description: "Comércio varejista de artigos do vestuário e acessórios",
    sector: "Comércio Varejista",
    simples_nacional_anexo: "Anexo I (Comércio)",
    fator_r_applies: false,
    keywords: ["roupas", "loja de roupas", "vestuário", "moda", "boutique", "acessórios", "moda feminina", "moda masculina"],
  },
  {
    code: "4782-2/01",
    raw_code: "4782201",
    description: "Comércio varejista de calçados",
    sector: "Comércio Varejista",
    simples_nacional_anexo: "Anexo I (Comércio)",
    fator_r_applies: false,
    keywords: ["calçados", "sapataria", "tênis", "sapatos", "sandálias", "chinelos"],
  },
  {
    code: "4771-7/01",
    raw_code: "4771701",
    description: "Comércio varejista de produtos farmacêuticos, sem manipulação de fórmulas",
    sector: "Comércio Varejista",
    simples_nacional_anexo: "Anexo I (Comércio)",
    fator_r_applies: false,
    keywords: ["farmácia", "drogaria", "remédios", "medicamentos", "higiene", "dermocosméticos"],
  },
  {
    code: "4772-5/00",
    raw_code: "4772500",
    description: "Comércio varejista de cosméticos, produtos de perfumaria e de higiene pessoal",
    sector: "Comércio Varejista",
    simples_nacional_anexo: "Anexo I (Comércio)",
    fator_r_applies: false,
    keywords: ["cosméticos", "perfumaria", "maquiagem", "beleza", "perfume", "skincare"],
  },
  {
    code: "4751-2/01",
    raw_code: "4751201",
    description: "Comércio varejista especializado de equipamentos e suprimentos de informática",
    sector: "Comércio Varejista",
    simples_nacional_anexo: "Anexo I (Comércio)",
    fator_r_applies: false,
    keywords: ["informática", "computadores", "notebooks", "periféricos", "hardware", "placa de vídeo"],
  },
  {
    code: "4752-1/00",
    raw_code: "4752100",
    description: "Comércio varejista especializado de equipamentos de telefonia e comunicação",
    sector: "Comércio Varejista",
    simples_nacional_anexo: "Anexo I (Comércio)",
    fator_r_applies: false,
    keywords: ["celulares", "smartphones", "capinhas", "carregadores", "telefonia", "acessórios de celular"],
  },
  {
    code: "4744-0/99",
    raw_code: "4744099",
    description: "Comércio varejista de materiais de construção em geral",
    sector: "Comércio Varejista",
    simples_nacional_anexo: "Anexo I (Comércio)",
    fator_r_applies: false,
    keywords: ["materiais de construção", "cimento", "tinta", "ferramentas", "hidráulica", "elétrica", "reforma"],
  },
  {
    code: "4789-0/04",
    raw_code: "4789004",
    description: "Comércio varejista de animais vivos e de artigos e alimentos para animais de estimação (Pet Shop)",
    sector: "Comércio Varejista",
    simples_nacional_anexo: "Anexo I (Comércio)",
    fator_r_applies: false,
    keywords: ["pet shop", "ração", "artigos pet", "veterinária", "acessórios para cães e gatos", "banho e tosa"],
  },

  // ── 2. ALIMENTAÇÃO & GASTRONOMIA ──
  {
    code: "5611-2/01",
    raw_code: "5611201",
    description: "Restaurantes e similares",
    sector: "Alimentação & Gastronomia",
    simples_nacional_anexo: "Anexo I (Comércio)",
    fator_r_applies: false,
    keywords: ["restaurante", "bistrô", "rodízio", "buffet", "almoço", "jantar", "churrascaria"],
  },
  {
    code: "5611-2/03",
    raw_code: "5611203",
    description: "Lanchonetes, casas de chá, de sucos e similares",
    sector: "Alimentação & Gastronomia",
    simples_nacional_anexo: "Anexo I (Comércio)",
    fator_r_applies: false,
    keywords: ["lanchonete", "hambúrguer", "pastelaria", "sucos", "açaí", "lanches", "cafeteria"],
  },
  {
    code: "5620-1/04",
    raw_code: "5620104",
    description: "Fornecimento de alimentos preparados preponderantemente para consumo domiciliar (Delivery / Marmitarias)",
    sector: "Alimentação & Gastronomia",
    simples_nacional_anexo: "Anexo I (Comércio)",
    fator_r_applies: false,
    keywords: ["delivery", "marmitex", "marmitas", "comida congelada", "cozinha delivery", "dark kitchen"],
  },
  {
    code: "5611-2/04",
    raw_code: "5611204",
    description: "Bares e outros estabelecimentos especializados em servir bebidas, sem entretenimento",
    sector: "Alimentação & Gastronomia",
    simples_nacional_anexo: "Anexo I (Comércio)",
    fator_r_applies: false,
    keywords: ["bar", "pub", "cervejaria", "boteco", "choperia", "drinks"],
  },
  {
    code: "1091-1/02",
    raw_code: "1091102",
    description: "Fabricação de produtos de padaria e confeitaria com predominância de produção própria",
    sector: "Alimentação & Gastronomia",
    simples_nacional_anexo: "Anexo II (Indústria)",
    fator_r_applies: false,
    keywords: ["padaria", "panificadora", "confeitaria", "bolos", "pães", "doces"],
  },

  // ── 3. TECNOLOGIA DA INFORMAÇÃO & INOVAÇÃO ──
  {
    code: "6201-5/01",
    raw_code: "6201501",
    description: "Desenvolvimento de programas de computador sob encomenda",
    sector: "Tecnologia & Inovação",
    simples_nacional_anexo: "Anexo V (Tecnologia/Engenharia)",
    fator_r_applies: true, // Fator R: se folha >= 28%, cai para Anexo III (alíquota 6% inicial)
    keywords: ["software", "programação", "aplicativos", "web app", "saas", "api", "sistemas"],
  },
  {
    code: "6202-3/00",
    raw_code: "6202300",
    description: "Desenvolvimento e licenciamento de programas de computador customizáveis",
    sector: "Tecnologia & Inovação",
    simples_nacional_anexo: "Anexo V (Tecnologia/Engenharia)",
    fator_r_applies: true,
    keywords: ["licenciamento", "software erp", "crm", "plataforma", "venda de licenças"],
  },
  {
    code: "6209-1/00",
    raw_code: "6209100",
    description: "Suporte técnico, manutenção e outros serviços em tecnologia da informação",
    sector: "Tecnologia & Inovação",
    simples_nacional_anexo: "Anexo III (Serviços)",
    fator_r_applies: false,
    keywords: ["helpdesk", "suporte de ti", "manutenção de computadores", "redes", "ti"],
  },
  {
    code: "6311-9/00",
    raw_code: "6311900",
    description: "Tratamento de dados, provedores de serviços de aplicação e serviços de hospedagem na internet",
    sector: "Tecnologia & Inovação",
    simples_nacional_anexo: "Anexo III (Serviços)",
    fator_r_applies: false,
    keywords: ["hospedagem de sites", "cloud", "servidores", "banco de dados", "processamento"],
  },

  // ── 4. MARKETING, DESIGN & PUBLICIDADE ──
  {
    code: "7311-4/00",
    raw_code: "7311400",
    description: "Agências de publicidade e propaganda",
    sector: "Serviços Profissionais",
    simples_nacional_anexo: "Anexo V (Tecnologia/Engenharia)",
    fator_r_applies: true,
    keywords: ["agência de marketing", "publicidade", "propaganda", "tráfego pago", "social media", "branding"],
  },
  {
    code: "7410-2/99",
    raw_code: "7410299",
    description: "Atividades de design não especificadas anteriormente (UI/UX, Design Gráfico)",
    sector: "Serviços Profissionais",
    simples_nacional_anexo: "Anexo V (Tecnologia/Engenharia)",
    fator_r_applies: true,
    keywords: ["design", "ui ux", "design gráfico", "identidade visual", "criação de logotipos", "ilustração"],
  },
  {
    code: "7420-0/01",
    raw_code: "7420001",
    description: "Atividades de produção de fotografias, exceto aérea e submarina",
    sector: "Serviços Profissionais",
    simples_nacional_anexo: "Anexo III (Serviços)",
    fator_r_applies: false,
    keywords: ["fotografia", "fotógrafo", "ensaios", "fotos de eventos", "fotografia de produtos"],
  },

  // ── 5. SAÚDE & CUIDADOS PESSOAIS ──
  {
    code: "8630-5/03",
    raw_code: "8630503",
    description: "Atividade médica ambulatorial restrita a consultas",
    sector: "Saúde & Cuidados",
    simples_nacional_anexo: "Anexo V (Tecnologia/Engenharia)",
    fator_r_applies: true,
    keywords: ["médico", "consulta médica", "clínica médica", "telemedicina", "especialidades"],
  },
  {
    code: "8630-5/04",
    raw_code: "8630504",
    description: "Atividade odontológica",
    sector: "Saúde & Cuidados",
    simples_nacional_anexo: "Anexo V (Tecnologia/Engenharia)",
    fator_r_applies: true,
    keywords: ["dentista", "odontologia", "ortodontia", "implantes", "consultório odontológico"],
  },
  {
    code: "8650-0/04",
    raw_code: "8650004",
    description: "Atividades de fisioterapia",
    sector: "Saúde & Cuidados",
    simples_nacional_anexo: "Anexo V (Tecnologia/Engenharia)",
    fator_r_applies: true,
    keywords: ["fisioterapia", "reabilitação", "pilates", "rpg", "clínica de fisioterapia"],
  },
  {
    code: "9602-5/01",
    raw_code: "9602501",
    description: "Cabeleireiros, manicure e pedicure",
    sector: "Saúde & Cuidados",
    simples_nacional_anexo: "Anexo III (Serviços)",
    fator_r_applies: false,
    keywords: ["salão de beleza", "cabeleireiro", "manicure", "pedicure", "barbearia", "cabelo"],
  },
  {
    code: "9602-5/02",
    raw_code: "9602502",
    description: "Atividades de estética e outros serviços de cuidados com a beleza",
    sector: "Saúde & Cuidados",
    simples_nacional_anexo: "Anexo III (Serviços)",
    fator_r_applies: false,
    keywords: ["estética", "limpeza de pele", "depilação", "drenagem", "harmonização", "massagem"],
  },

  // ── 6. LOGÍSTICA & TRANSPORTE ──
  {
    code: "5320-2/02",
    raw_code: "5320202",
    description: "Serviços de entrega rápida (Motoboy / Entregas Urbanas)",
    sector: "Logística & Transporte",
    simples_nacional_anexo: "Anexo III (Serviços)",
    fator_r_applies: false,
    keywords: ["motoboy", "entrega rápida", "delivery", "coleta expressa", "motolink", "encomendas"],
  },
  {
    code: "4930-2/02",
    raw_code: "4930202",
    description: "Transporte rodoviário de carga, exceto produtos perigosos e mudanças, intermunicipal, interestadual e internacional",
    sector: "Logística & Transporte",
    simples_nacional_anexo: "Anexo III (Serviços)",
    fator_r_applies: false,
    keywords: ["transportadora", "frete", "transporte rodoviário", "caminhão", "carga"],
  },
  {
    code: "4930-2/04",
    raw_code: "4930204",
    description: "Transporte rodoviário de mudanças",
    sector: "Logística & Transporte",
    simples_nacional_anexo: "Anexo III (Serviços)",
    fator_r_applies: false,
    keywords: ["mudanças", "transporte de móveis", "mudança residencial", "mudança comercial"],
  },

  // ── 7. TURISMO & HOSPEDAGEM ──
  {
    code: "7911-2/00",
    raw_code: "7911200",
    description: "Agências de viagens",
    sector: "Turismo & Hospedagem",
    simples_nacional_anexo: "Anexo III (Serviços)",
    fator_r_applies: false,
    keywords: ["agência de viagens", "pacotes turísticos", "passagens aéreas", "hotéis", "turismo", "cadastur"],
  },
  {
    code: "7912-1/00",
    raw_code: "7912100",
    description: "Operadores turísticos (Operadoras de Viagens e Excursões)",
    sector: "Turismo & Hospedagem",
    simples_nacional_anexo: "Anexo III (Serviços)",
    fator_r_applies: false,
    keywords: ["operadora de turismo", "fretamento", "excursão", "roteiros turísticos"],
  },
  {
    code: "5510-8/01",
    raw_code: "5510801",
    description: "Hotéis e resorts",
    sector: "Turismo & Hospedagem",
    simples_nacional_anexo: "Anexo III (Serviços)",
    fator_r_applies: false,
    keywords: ["hotel", "resort", "hospedagem", "diárias", "all inclusive", "pousada"],
  },

  // ── 8. OFICINA MECÂNICA & AUTOMOTIVO ──
  {
    code: "4520-0/01",
    raw_code: "4520001",
    description: "Serviços de manutenção e reparação mecânica de veículos automotores",
    sector: "Automotivo",
    simples_nacional_anexo: "Anexo III (Serviços)",
    fator_r_applies: false,
    keywords: ["oficina mecânica", "mecânico", "conserto de carros", "revisão", "freios", "suspensão"],
  },
  {
    code: "4520-0/05",
    raw_code: "4520005",
    description: "Serviços de lavagem, lubrificação e polimento de veículos automotores",
    sector: "Automotivo",
    simples_nacional_anexo: "Anexo III (Serviços)",
    fator_r_applies: false,
    keywords: ["lava rápido", "lavagem técnica", "polimento", "vitrificação", "detalhamento automotivo", "estética automotiva"],
  },
];
