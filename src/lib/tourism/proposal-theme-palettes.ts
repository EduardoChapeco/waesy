/**
 * proposal-theme-palettes.ts — Motor Canônico de Paletas, Luminância WCAG e Tokens de Superfície
 * para o Studio de Propostas de Turismo.
 *
 * Garante que o Canvas/Frame nunca tenha fundo transparente, que cada modelo possua
 * sua cor de superfície e destaque padrão (zero cores neon), e que qualquer cor customizada
 * escolhida pelo usuário mantenha contraste legível WCAG 2.2 AA/AAA em todos os elementos.
 */

export type ProposalTemplateCanonicalId =
  | "editorial-flat"
  | "dark-premium"
  | "executivo-b2b"
  | "landscape-presentation"
  | "vertical-premium"
  | "group-catalog"
  | "bento-grid";

export type ProposalFontPresetId =
  | "editorial"
  | "modern"
  | "corporate"
  | "luxury"
  | "geometric";

export type ProposalNicheId =
  | "tourism"
  | "real_estate"
  | "automotive"
  | "projects"
  | "services"
  | "events"
  | "retail";

export type ProposalSectionKey =
  | "summary"
  | "flights"
  | "hotels"
  | "itinerary"
  | "transfers"
  | "tours"
  | "includes"
  | "conditions"
  | "financial"
  | "footer";

export interface ProposalLogoConfig {
  shape: "contain" | "square" | "circle" | "wide";
  size: "sm" | "md" | "lg" | "xl";
  position: "left" | "center" | "right" | "badge";
  objectPosition: string;
  scale: number;
}

export interface ProposalCoverCropConfig {
  objectPosition: string;
  scale: number;
  aspectMode: "auto" | "cover" | "contain";
  fit: "cover" | "contain";
}

export interface ProposalPricingDisplayConfig {
  showPerPerson: boolean;
  showPerAdult: boolean;
  showPerRoom: boolean;
  customPerPersonCents?: number;
  customPricePerPersonCents?: number;
}

export interface ProposalNicheSpecField {
  key: string;
  label: string;
  placeholder: string;
  unit?: string;
}

export interface ProposalNicheCopy {
  id: ProposalNicheId;
  label: string;
  shortLabel: string;
  heroKicker: string;
  badgeLabel: string;
  specsSectionTitle: string;
  destinationLabel: string;
  destinationPlaceholder: string;
  paxLabel: string;
  startDateLabel: string;
  endDateLabel: string;
  flightsTitle: string;
  hotelsTitle: string;
  hotelBadgeLabel: string;
  hotelNamePlaceholder: string;
  hotelLocationPlaceholder: string;
  itineraryTitle: string;
  itineraryStepPrefix: string;
  itineraryTitlePlaceholder: string;
  transfersTitle: string;
  toursTitle: string;
  includesTitle: string;
  excludesTitle: string;
  conditionsTitle: string;
  boardingReqLabel: string;
  financialTitle: string;
  perPersonLabel: string;
  roomsTitle: string;
  showAviationAndHotelTerms: boolean;
  specFields: ProposalNicheSpecField[];
}

export const PROPOSAL_NICHE_CATALOG: Record<ProposalNicheId, ProposalNicheCopy> = {
  tourism: {
    id: "tourism",
    label: "Turismo, Viagens & Hotelaria",
    shortLabel: "Turismo",
    heroKicker: "Roteiro Curado & Cotação Exclusiva",
    badgeLabel: "Roteiro & Cotação de Viagem",
    specsSectionTitle: "Especificações da Viagem",
    destinationLabel: "Destino",
    destinationPlaceholder: "Ex: Porto de Galinhas, PE",
    paxLabel: "Viajantes",
    startDateLabel: "Saída",
    endDateLabel: "Retorno",
    flightsTitle: "Malha Aérea",
    hotelsTitle: "Hospedagem Selecionada",
    hotelBadgeLabel: "Hotel & Resort",
    hotelNamePlaceholder: "Nome do Hotel / Resort",
    hotelLocationPlaceholder: "Cidade / Praia / Região",
    itineraryTitle: "Roteiro Dia a Dia",
    itineraryStepPrefix: "Dia",
    itineraryTitlePlaceholder: "Ex: Dia 1 • Chegada e Check-in",
    transfersTitle: "Traslados & Receptivo",
    toursTitle: "Passeios & Experiências",
    includesTitle: "O que está incluso",
    excludesTitle: "Não incluso",
    conditionsTitle: "Condições Comerciais & Embarque",
    boardingReqLabel: "Requisitos de Embarque & Documentos",
    financialTitle: "Investimento da Viagem",
    perPersonLabel: "Valor por Adulto / Pessoa",
    roomsTitle: "Divisão e Valores por Quarto",
    showAviationAndHotelTerms: true,
    specFields: [
      { key: "bagagem_franquia", label: "Franquia de Bagagem", placeholder: "Ex: 1 mala 10kg + 1 despachada 23kg" },
      { key: "seguro_viagem", label: "Seguro Viagem", placeholder: "Ex: Cobertura USD 60.000 inclusa" },
      { key: "aeroporto_embarque", label: "Aeroporto de Embarque", placeholder: "Ex: Chapecó (XAP) ou Florianópolis (FLN)" },
      { key: "regime_alimentar", label: "Regime Alimentar Principal", placeholder: "Ex: All Inclusive / Café da Manhã" },
    ],
  },
  real_estate: {
    id: "real_estate",
    label: "Imóveis, Arquitetura & Incorporação",
    shortLabel: "Imóveis",
    heroKicker: "Dossiê Imobiliário & Apresentação",
    badgeLabel: "Apresentação & Proposta Imobiliária",
    specsSectionTitle: "Ficha Técnica do Imóvel",
    destinationLabel: "Localização / Bairro",
    destinationPlaceholder: "Ex: Centro / Beira-Mar Norte, Florianópolis",
    paxLabel: "Configuração",
    startDateLabel: "Disponibilidade",
    endDateLabel: "Entrega das Chaves",
    flightsTitle: "Localização & Mobilidade Urbana",
    hotelsTitle: "Ficha do Imóvel & Empreendimento",
    hotelBadgeLabel: "Unidade & Tipologia",
    hotelNamePlaceholder: "Nome do Edifício / Condomínio / Imóvel",
    hotelLocationPlaceholder: "Bairro, Cidade e Endereço",
    itineraryTitle: "Ambientes, Memorial & Planta",
    itineraryStepPrefix: "Ambiente",
    itineraryTitlePlaceholder: "Ex: Living Integrado & Varanda Gourmet",
    transfersTitle: "Infraestrutura do Condomínio",
    toursTitle: "Diferenciais & Áreas de Lazer",
    includesTitle: "Acabamentos & Itens Inclusos",
    excludesTitle: "Taxas & Custos de Escritura/ITBI",
    conditionsTitle: "Documentação & Condições de Negociação",
    boardingReqLabel: "Situação Documental, Matrícula & Financiamento",
    financialTitle: "Valor do Imóvel & Condições",
    perPersonLabel: "Valor por Unidade / Fração",
    roomsTitle: "Unidades, Suítes & Tipologias Cotadas",
    showAviationAndHotelTerms: false,
    specFields: [
      { key: "area_privativa_m2", label: "Área Privativa", placeholder: "Ex: 148 m² privativos (210 m² total)", unit: "m²" },
      { key: "dormitorios_suites", label: "Dormitórios & Suítes", placeholder: "Ex: 3 Suítes + Lavabo" },
      { key: "vagas_garagem", label: "Vagas de Garagem", placeholder: "Ex: 2 vagas cobertas + Hobby Box" },
      { key: "condominio_iptu", label: "Condomínio & IPTU", placeholder: "Ex: Cond. R$ 890/mês · IPTU R$ 2.400/ano" },
      { key: "posicao_solar_andar", label: "Posição Solar & Andar", placeholder: "Ex: Sol da manhã (Leste/Norte) · 12º andar" },
      { key: "matricula_incorporacao", label: "Matrícula / Registro", placeholder: "Ex: Escritura pública imediata · Aceita financiamento" },
    ],
  },
  automotive: {
    id: "automotive",
    label: "Veículos, Seminovos & Frotas",
    shortLabel: "Veículos",
    heroKicker: "Especificação Técnica & Condição Especial",
    badgeLabel: "Ficha Técnica & Proposta Veicular",
    specsSectionTitle: "Ficha Técnica do Veículo",
    destinationLabel: "Unidade / Pátio",
    destinationPlaceholder: "Ex: Showroom Matriz — Chapecó, SC",
    paxLabel: "Ocupantes / Porte",
    startDateLabel: "Disponibilidade",
    endDateLabel: "Entrega Prevista",
    flightsTitle: "Logística de Entrega & Frete",
    hotelsTitle: "Veículo & Configuração Principal",
    hotelBadgeLabel: "Ficha do Veículo",
    hotelNamePlaceholder: "Ex: Toyota Hilux SRX 2.8 4x4 Diesel Aut.",
    hotelLocationPlaceholder: "Loja / Cidade de Faturamento",
    itineraryTitle: "Destaques, Revisões & Laudo Técnico",
    itineraryStepPrefix: "Destaque",
    itineraryTitlePlaceholder: "Ex: Motorização, Segurança Ativa e Interior",
    transfersTitle: "Documentação, IPVA & Transferência",
    toursTitle: "Acessórios, Opcionais & Blindagem/Estética",
    includesTitle: "Itens de Série, Garantia & Revisão",
    excludesTitle: "Custos de Transferência / Emplacamento",
    conditionsTitle: "Garantia Mecânica, Troca & Financiamento",
    boardingReqLabel: "Laudo Cautelar, Vistoria & Requisitos de Faturamento",
    financialTitle: "Investimento & Condições de Compra",
    perPersonLabel: "Valor por Unidade / Frota",
    roomsTitle: "Unidades ou Versões na Proposta",
    showAviationAndHotelTerms: false,
    specFields: [
      { key: "ano_modelo", label: "Ano Fabricação / Modelo", placeholder: "Ex: 2025 / 2026" },
      { key: "quilometragem", label: "Quilometragem Atual", placeholder: "Ex: 0 km ou 18.400 km", unit: "km" },
      { key: "motor_cambio", label: "Motorização & Câmbio", placeholder: "Ex: 2.0 Turbo 252cv · Automático 8 marchas" },
      { key: "combustivel_cor", label: "Combustível & Cor", placeholder: "Ex: Híbrido / Flex · Branco Pérola" },
      { key: "referencia_fipe", label: "Código / Referência FIPE", placeholder: "Ex: Abaixo da FIPE · Avaliação de troca inclusa" },
      { key: "laudo_garantia", label: "Laudo Cautelar & Garantia", placeholder: "Ex: 100% Aprovado Dekra · Garantia de fábrica" },
    ],
  },
  projects: {
    id: "projects",
    label: "Projetos, Engenharia, Solar & Arquitetura",
    shortLabel: "Projetos",
    heroKicker: "Escopo Executivo & Memorial Técnico",
    badgeLabel: "Escopo Técnico & Proposta de Projeto",
    specsSectionTitle: "Parâmetros Técnicos do Projeto",
    destinationLabel: "Local da Obra / Projeto",
    destinationPlaceholder: "Ex: Condomínio Alphaville — Chapecó, SC",
    paxLabel: "Frentes Técnicas",
    startDateLabel: "Início Previsto",
    endDateLabel: "Entrega Final",
    flightsTitle: "Mobilização & Visitas Técnicas",
    hotelsTitle: "Objeto do Projeto & Infraestrutura",
    hotelBadgeLabel: "Memorial & Escopo",
    hotelNamePlaceholder: "Ex: Projeto Arquitetônico Executivo + Interiores",
    hotelLocationPlaceholder: "Endereço / Empreendimento",
    itineraryTitle: "Cronograma de Etapas & Entregas",
    itineraryStepPrefix: "Etapa",
    itineraryTitlePlaceholder: "Ex: Etapa 1 • Estudo Preliminar e Levantamento 3D",
    transfersTitle: "Logística de Canteiro & Acompanhamento",
    toursTitle: "Entregáveis, Pranchas & Módulos",
    includesTitle: "Entregáveis Inclusos no Escopo",
    excludesTitle: "Taxas de Prefeitura, ART/RRT & Execução Civil",
    conditionsTitle: "SLA, Garantia Técnica & Condições Contratuais",
    boardingReqLabel: "Responsabilidade Técnica (ART/RRT/CAU) & Premissas",
    financialTitle: "Investimento do Projeto",
    perPersonLabel: "Valor por Fase / Módulo",
    roomsTitle: "Frentes de Projeto & Módulos Cotados",
    showAviationAndHotelTerms: false,
    specFields: [
      { key: "area_intervencao", label: "Área / Capacidade do Projeto", placeholder: "Ex: 320 m² de área construída / 12,4 kWp" },
      { key: "prazo_total_execucao", label: "Prazo Estimado de Entrega", placeholder: "Ex: 45 dias úteis divididos em 4 etapas" },
      { key: "responsavel_registro", label: "Responsável Técnico (CREA/CAU)", placeholder: "Ex: Eng. / Arq. Responsável com ART/RRT inclusa" },
      { key: "formato_entregaveis", label: "Formato dos Entregáveis", placeholder: "Ex: BIM / DWG + Caderno Executivo PDF + Render 4K" },
      { key: "garantia_suporte", label: "Garantia & Acompanhamento", placeholder: "Ex: 5 anos de garantia + 3 visitas em obra" },
    ],
  },
  services: {
    id: "services",
    label: "Serviços B2B, Consultoria & Agências",
    shortLabel: "Serviços",
    heroKicker: "Plano de Trabalho & Acordo de Nível",
    badgeLabel: "Proposta Comercial & Escopo de Serviços",
    specsSectionTitle: "Parâmetros de Atendimento",
    destinationLabel: "Praça / Modalidade",
    destinationPlaceholder: "Ex: Atendimento Híbrido / Nacional",
    paxLabel: "Especialistas / Squad",
    startDateLabel: "Kick-off",
    endDateLabel: "Vigência / Entrega",
    flightsTitle: "Alocação & Deslocamento",
    hotelsTitle: "Solução & Pacote de Serviços",
    hotelBadgeLabel: "Plano Selecionado",
    hotelNamePlaceholder: "Ex: Assessoria Completa & Implementação",
    hotelLocationPlaceholder: "Unidade de Atendimento",
    itineraryTitle: "Plano de Ação & Cronograma",
    itineraryStepPrefix: "Fase",
    itineraryTitlePlaceholder: "Ex: Fase 1 • Diagnóstico, Onboarding e Setup",
    transfersTitle: "Rotina de Reuniões & Governança",
    toursTitle: "Serviços & Entregas Adicionais",
    includesTitle: "O que está contemplado no contrato",
    excludesTitle: "Custos de Terceiros / Verba de Mídia",
    conditionsTitle: "SLA, Confidencialidade & Termos",
    boardingReqLabel: "Requisitos de Onboarding & Acessos Necessários",
    financialTitle: "Investimento Comercial",
    perPersonLabel: "Valor por Frente / Licença",
    roomsTitle: "Pacotes & Módulos da Proposta",
    showAviationAndHotelTerms: false,
    specFields: [
      { key: "modalidade_contrato", label: "Modalidade de Contratação", placeholder: "Ex: Escopo Fechado ou Fee Mensal Recorrente" },
      { key: "sla_atendimento", label: "SLA de Atendimento", placeholder: "Ex: Resposta em até 2h úteis · Gerente dedicado" },
      { key: "carga_horaria_escopo", label: "Dedicação / Volume", placeholder: "Ex: 40h técnicas + relatórios quinzenais" },
      { key: "prazo_fidelidade", label: "Vigência & Renovação", placeholder: "Ex: 6 meses sem multa após 90 dias" },
    ],
  },
  events: {
    id: "events",
    label: "Eventos, Casamentos, Formaturas & Produções",
    shortLabel: "Eventos",
    heroKicker: "Projeto Cenográfico & Produção Completa",
    badgeLabel: "Proposta de Evento & Produção",
    specsSectionTitle: "Ficha Técnica do Evento",
    destinationLabel: "Espaço / Cidade",
    destinationPlaceholder: "Ex: Espaço Garden — Chapecó, SC",
    paxLabel: "Convidados",
    startDateLabel: "Data do Evento",
    endDateLabel: "Desmontagem",
    flightsTitle: "Logística de Equipe & Artistas",
    hotelsTitle: "Espaço, Cenografia & Estrutura",
    hotelBadgeLabel: "Espaço & Conceito",
    hotelNamePlaceholder: "Ex: Salão Principal + Lounges Externos",
    hotelLocationPlaceholder: "Localização do Evento",
    itineraryTitle: "Roteiro & Cronograma do Evento",
    itineraryStepPrefix: "Momento",
    itineraryTitlePlaceholder: "Ex: Recepção, Cerimônia e Jantar Gastronômico",
    transfersTitle: "Receptivo, Valet & Segurança",
    toursTitle: "Gastronomia, Bar, Som & Iluminação",
    includesTitle: "Serviços e Equipe Inclusos",
    excludesTitle: "Taxas ECAD, Gerador Extra & Horas Adicionais",
    conditionsTitle: "Reserva de Data, Contrato & Cancelamento",
    boardingReqLabel: "Alvarás, Montagem & Regras do Espaço",
    financialTitle: "Investimento do Evento",
    perPersonLabel: "Valor por Convidado",
    roomsTitle: "Setores, Mesas ou Pacotes de Adesão",
    showAviationAndHotelTerms: false,
    specFields: [
      { key: "numero_convidados", label: "Número de Convidados", placeholder: "Ex: 200 convidados confirmados", unit: "pessoas" },
      { key: "duracao_evento", label: "Duração da Festa / Evento", placeholder: "Ex: 8 horas de evento + 1h tolerância" },
      { key: "gastronomia_bebidas", label: "Gastronomia & Open Bar", placeholder: "Ex: Buffet Completo + Ilha de Drinks" },
      { key: "equipe_operacional", label: "Equipe Operacional", placeholder: "Ex: 1 Cerimonialista, 14 Garçons, 4 Seguranças" },
    ],
  },
  retail: {
    id: "retail",
    label: "Comércio, Equipamentos & Orçamento Geral",
    shortLabel: "Orçamento Geral",
    heroKicker: "Cotação Oficial & Fornecimento Comercial",
    badgeLabel: "Orçamento Comercial Detalhado",
    specsSectionTitle: "Especificações Comerciais",
    destinationLabel: "Cidade / Destino de Entrega",
    destinationPlaceholder: "Ex: Entrega CIF — Santa Catarina",
    paxLabel: "Volumes / Itens",
    startDateLabel: "Emissão",
    endDateLabel: "Previsão de Entrega",
    flightsTitle: "Transporte & Expedição",
    hotelsTitle: "Produtos & Equipamentos Principais",
    hotelBadgeLabel: "Item / Linha",
    hotelNamePlaceholder: "Nome do Produto, Kit ou Equipamento",
    hotelLocationPlaceholder: "Fabricante / Origem",
    itineraryTitle: "Detalhamento de Itens & Especificações",
    itineraryStepPrefix: "Item",
    itineraryTitlePlaceholder: "Ex: Item 1 • Especificação Técnica e Montagem",
    transfersTitle: "Frete, Entrega & Instalação",
    toursTitle: "Acessórios, Garantias & Suprimentos",
    includesTitle: "Incluso no Fornecimento",
    excludesTitle: "Adequações Elétricas / Civis no Local",
    conditionsTitle: "Garantia, Faturamento & Condições de Entrega",
    boardingReqLabel: "Dados de Faturamento, NFe & Recebimento",
    financialTitle: "Resumo Financeiro do Orçamento",
    perPersonLabel: "Valor Unitário Médio",
    roomsTitle: "Lotes / Agrupamentos do Orçamento",
    showAviationAndHotelTerms: false,
    specFields: [
      { key: "prazo_faturamento_entrega", label: "Prazo de Expedição / Entrega", placeholder: "Ex: Pronta entrega · Envio em 24h" },
      { key: "garantia_fabricante", label: "Garantia Oficial", placeholder: "Ex: 12 meses de garantia integral" },
      { key: "modalidade_frete", label: "Modalidade de Frete (CIF/FOB)", placeholder: "Ex: Frete CIF incluso até o endereço" },
      { key: "validade_estoque", label: "Disponibilidade de Estoque", placeholder: "Ex: Lote reservado mediante aprovação" },
    ],
  },
};

export function normalizeProposalNicheId(raw?: string | null): ProposalNicheId {
  const clean = String(raw || "").trim().toLowerCase();
  if (clean === "real_estate" || clean === "imoveis" || clean === "imovel") return "real_estate";
  if (clean === "automotive" || clean === "vehicles" || clean === "veiculos" || clean === "carro") {
    return "automotive";
  }
  if (clean === "projects" || clean === "projetos" || clean === "engenharia" || clean === "arquitetura") {
    return "projects";
  }
  if (clean === "services" || clean === "servicos" || clean === "consultoria") return "services";
  if (clean === "events" || clean === "eventos") return "events";
  if (clean === "retail" || clean === "comercio" || clean === "orcamento") return "retail";
  return "tourism";
}

export function resolveProposalNicheCopy(raw?: string | null): ProposalNicheCopy {
  return PROPOSAL_NICHE_CATALOG[normalizeProposalNicheId(raw)];
}

export interface ProposalTemplatePaletteConfig {
  id: ProposalTemplateCanonicalId;
  label: string;
  canvasBg: string;
  brandColor: string;
  fontPreset: ProposalFontPresetId;
  tone: "light" | "dark";
}

function hex(code: string): string {
  return `${String.fromCharCode(35)}${code}`;
}

export const TEMPLATE_DEFAULT_PALETTES: Record<
  ProposalTemplateCanonicalId,
  ProposalTemplatePaletteConfig
> = {
  "editorial-flat": {
    id: "editorial-flat",
    label: "Clean Apple",
    canvasBg: hex("FFFFFF"),
    brandColor: hex("18181B"),
    fontPreset: "editorial",
    tone: "light",
  },
  "dark-premium": {
    id: "dark-premium",
    label: "Dark Luxo",
    canvasBg: hex("0B0F19"),
    brandColor: hex("C5A059"),
    fontPreset: "editorial",
    tone: "dark",
  },
  "executivo-b2b": {
    id: "executivo-b2b",
    label: "Executivo B2B",
    canvasBg: hex("FFFFFF"),
    brandColor: hex("0F2942"),
    fontPreset: "corporate",
    tone: "light",
  },
  "landscape-presentation": {
    id: "landscape-presentation",
    label: "Paisagem Widescreen",
    canvasBg: hex("0F172A"),
    brandColor: hex("C5A059"),
    fontPreset: "modern",
    tone: "dark",
  },
  "vertical-premium": {
    id: "vertical-premium",
    label: "Vertical Premium",
    canvasBg: hex("F8FAFC"),
    brandColor: hex("1E3A5F"),
    fontPreset: "editorial",
    tone: "light",
  },
  "group-catalog": {
    id: "group-catalog",
    label: "Catálogo de Grupo",
    canvasBg: hex("F8FAFC"),
    brandColor: hex("0F2942"),
    fontPreset: "modern",
    tone: "light",
  },
  "bento-grid": {
    id: "bento-grid",
    label: "Bento Grid Visual",
    canvasBg: hex("F4F6FA"),
    brandColor: hex("1E3A5F"),
    fontPreset: "geometric",
    tone: "light",
  },
};

export interface ColorPresetOption {
  id: string;
  label: string;
  value: string;
  color: string;
  tone: "light" | "dark";
}

export const CANVAS_BG_PRESETS: ColorPresetOption[] = [
  { id: "pure-white", label: "Branco Puro", value: hex("FFFFFF"), color: hex("FFFFFF"), tone: "light" },
  { id: "ivory-paper", label: "Marfim Editorial", value: hex("FAF8F5"), color: hex("FAF8F5"), tone: "light" },
  { id: "alabaster", label: "Alabastro Suave", value: hex("F8FAFC"), color: hex("F8FAFC"), tone: "light" },
  { id: "warm-pearl", label: "Pérola Quente", value: hex("F3F1ED"), color: hex("F3F1ED"), tone: "light" },
  { id: "onyx-luxury", label: "Onyx Luxo", value: hex("0B0F19"), color: hex("0B0F19"), tone: "dark" },
  { id: "midnight-slate", label: "Azul Meia-Noite", value: hex("0F172A"), color: hex("0F172A"), tone: "dark" },
  { id: "obsidian-dark", label: "Grafite Soberano", value: hex("141417"), color: hex("141417"), tone: "dark" },
  { id: "emerald-night", label: "Reserva Escuro", value: hex("091914"), color: hex("091914"), tone: "dark" },
];

export const BRAND_COLOR_PRESETS: ColorPresetOption[] = [
  { id: "navy-exec", label: "Azul Marinho", value: hex("0F2942"), color: hex("0F2942"), tone: "dark" },
  { id: "champagne-gold", label: "Ouro Champagne", value: hex("C5A059"), color: hex("C5A059"), tone: "light" },
  { id: "obsidian", label: "Obsidiana", value: hex("18181B"), color: hex("18181B"), tone: "dark" },
  { id: "ocean-deep", label: "Oceano Profundo", value: hex("1E3A5F"), color: hex("1E3A5F"), tone: "dark" },
  { id: "imperial-emerald", label: "Esmeralda", value: hex("065F46"), color: hex("065F46"), tone: "dark" },
  { id: "burgundy-reserve", label: "Borgonha", value: hex("7F1D1D"), color: hex("7F1D1D"), tone: "dark" },
  { id: "terracotta", label: "Terracota", value: hex("9A3412"), color: hex("9A3412"), tone: "dark" },
  { id: "royal-slate", label: "Ardósia Real", value: hex("334155"), color: hex("334155"), tone: "dark" },
];

export const FONT_PRESET_OPTIONS: Array<{
  id: ProposalFontPresetId;
  label: string;
  desc: string;
  headingFont: string;
  bodyFont: string;
}> = [
  {
    id: "editorial",
    label: "Editorial & Serifada",
    desc: "Títulos em Playfair Display serifada e leitura fluida em Inter",
    headingFont: "'Playfair Display', Georgia, 'Times New Roman', serif",
    bodyFont: "'Inter', system-ui, -apple-system, sans-serif",
  },
  {
    id: "modern",
    label: "Moderna & Limpa",
    desc: "Plus Jakarta Sans + Inter para máxima clareza em telas e mobile",
    headingFont: "'Plus Jakarta Sans', 'Inter', system-ui, -apple-system, sans-serif",
    bodyFont: "'Inter', system-ui, -apple-system, sans-serif",
  },
  {
    id: "corporate",
    label: "Executiva B2B",
    desc: "IBM Plex Sans analítica para tabelas, contratos e propostas técnicas",
    headingFont: "'IBM Plex Sans', 'Segoe UI', system-ui, -apple-system, sans-serif",
    bodyFont: "'IBM Plex Sans', 'Inter', system-ui, -apple-system, sans-serif",
  },
  {
    id: "luxury",
    label: "Clássica Boutique",
    desc: "Cormorant Garamond + DM Sans para resorts, alta arquitetura e imóveis",
    headingFont: "'Cormorant Garamond', Georgia, 'Times New Roman', serif",
    bodyFont: "'DM Sans', 'Inter', system-ui, -apple-system, sans-serif",
  },
  {
    id: "geometric",
    label: "Geométrica Bento",
    desc: "Outfit Geométrica + Inter para mosaicos Bento Grid e apresentações 16:9",
    headingFont: "'Outfit', 'Plus Jakarta Sans', 'Inter', system-ui, sans-serif",
    bodyFont: "'Inter', system-ui, -apple-system, sans-serif",
  },
];

export const PROPOSAL_SECTION_CATALOG: Array<{
  key: ProposalSectionKey;
  label: string;
}> = [
  { key: "summary", label: "Resumo Executivo" },
  { key: "flights", label: "Malha Aérea" },
  { key: "hotels", label: "Hospedagem" },
  { key: "itinerary", label: "Roteiro Dia a Dia" },
  { key: "transfers", label: "Traslados & Rodoviário" },
  { key: "tours", label: "Passeios & Experiências" },
  { key: "includes", label: "Inclusões & Exclusões" },
  { key: "conditions", label: "Regras & Observações" },
  { key: "financial", label: "Investimento & Parcelas" },
  { key: "footer", label: "Assinatura do Consultor" },
];

export function normalizeCanonicalTemplateId(raw?: string | null): ProposalTemplateCanonicalId {
  const map: Record<string, ProposalTemplateCanonicalId> = {
    executivo: "executivo-b2b",
    "executivo-b2b": "executivo-b2b",
    "editorial-flat": "editorial-flat",
    "dark-premium": "dark-premium",
    landscape: "landscape-presentation",
    "landscape-presentation": "landscape-presentation",
    "vertical-premium": "vertical-premium",
    "group-catalog": "group-catalog",
    bento: "bento-grid",
    "bento-grid": "bento-grid",
  };
  return map[raw || ""] || "editorial-flat";
}

export function isValidHexColor(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  return /^#[0-9a-fA-F]{6}$/.test(trimmed) || /^#[0-9a-fA-F]{3}$/.test(trimmed);
}

export function expandHex(input: string): string {
  const clean = input.trim().replace(/^#/, "");
  if (clean.length === 3) {
    return hex(
      clean
        .split("")
        .map((c) => c + c)
        .join("")
        .toUpperCase(),
    );
  }
  if (clean.length === 6) {
    return hex(clean.toUpperCase());
  }
  return hex("FFFFFF");
}

export function hexToRgbTuple(input: string): [number, number, number] {
  const full = expandHex(input).slice(1);
  const r = parseInt(full.slice(0, 2), 16) || 0;
  const g = parseInt(full.slice(2, 4), 16) || 0;
  const b = parseInt(full.slice(4, 6), 16) || 0;
  return [r, g, b];
}

export function rgbTupleToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  const toHex = (n: number) => clamp(n).toString(16).padStart(2, "0").toUpperCase();
  return hex(`${toHex(r)}${toHex(g)}${toHex(b)}`);
}

export function mixHexColors(baseHex: string, targetHex: string, weight: number): string {
  const [r1, g1, b1] = hexToRgbTuple(baseHex);
  const [r2, g2, b2] = hexToRgbTuple(targetHex);
  const w = Math.max(0, Math.min(1, weight));
  return rgbTupleToHex(r1 + (r2 - r1) * w, g1 + (g2 - g1) * w, b1 + (b2 - b1) * w);
}

export function getRelativeLuminance(hexColor: string): number {
  const [r, g, b] = hexToRgbTuple(hexColor).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function getContrastRatio(hexA: string, hexB: string): number {
  const lumA = getRelativeLuminance(hexA);
  const lumB = getRelativeLuminance(hexB);
  const brightest = Math.max(lumA, lumB);
  const darkest = Math.min(lumA, lumB);
  return (brightest + 0.05) / (darkest + 0.05);
}

export function ensureReadableAccent(brandHex: string, surfaceHex: string, tone: "light" | "dark"): string {
  let candidate = expandHex(brandHex);
  const targetPole = tone === "dark" ? hex("F8FAFC") : hex("0F172A");

  for (let step = 1; step <= 8; step++) {
    if (getContrastRatio(candidate, surfaceHex) >= 4.5) {
      return candidate;
    }
    candidate = mixHexColors(candidate, targetPole, 0.18);
  }
  return candidate;
}

export interface ResolvedWebShowcaseTheme {
  preset: "editorial" | "modern" | "dark" | "boutique";
  isDark: boolean;
  surfaceBg: string;
  accentColor: string;
  accentFg: string;
  accentReadable: string;
  headingFont: string;
  bodyFont: string;
  cssVars: Record<string, string>;
}

/** Derives WCAG 2.2 AA contrast-checked CSS variables for ProposalWebShowcase themes. */
export function resolveWebShowcaseTheme(
  preset: string | null | undefined,
  accentColor?: string | null,
): ResolvedWebShowcaseTheme {
  const safePreset: ResolvedWebShowcaseTheme["preset"] =
    preset === "modern" || preset === "dark" || preset === "boutique" ? preset : "editorial";
  const isDark = safePreset === "dark";
  const surfaceBg = isDark ? hex("0B0F19") : safePreset === "boutique" ? hex("FAF8F5") : hex("FFFFFF");
  const defaultAccent =
    safePreset === "dark"
      ? hex("C5A059")
      : safePreset === "boutique"
        ? hex("7F1D1D")
        : safePreset === "modern"
          ? hex("0F2942")
          : hex("18181B");
  const baseAccent = isValidHexColor(accentColor) ? expandHex(accentColor) : defaultAccent;
  const accentReadable = ensureReadableAccent(baseAccent, surfaceBg, isDark ? "dark" : "light");
  const contrastDark = getContrastRatio(hex("0F172A"), baseAccent);
  const contrastLight = getContrastRatio(hex("FFFFFF"), baseAccent);
  const accentFg = contrastDark >= contrastLight ? hex("0F172A") : hex("FFFFFF");
  const fontMeta =
    safePreset === "boutique"
      ? FONT_PRESET_OPTIONS.find((f) => f.id === "luxury") || FONT_PRESET_OPTIONS[0]
      : safePreset === "modern"
        ? FONT_PRESET_OPTIONS.find((f) => f.id === "modern") || FONT_PRESET_OPTIONS[0]
        : FONT_PRESET_OPTIONS[0];

  const cssVars: Record<string, string> = {
    "--web-accent": baseAccent,
    "--web-accent-fg": accentFg,
    "--web-accent-readable": accentReadable,
    "--web-accent-soft": mixHexColors(surfaceBg, accentReadable, isDark ? 0.16 : 0.08),
    "--web-surface": surfaceBg,
    "--web-heading-font": fontMeta.headingFont,
    "--web-body-font": fontMeta.bodyFont,
  };

  return {
    preset: safePreset,
    isDark,
    surfaceBg,
    accentColor: baseAccent,
    accentFg,
    accentReadable,
    headingFont: fontMeta.headingFont,
    bodyFont: fontMeta.bodyFont,
    cssVars,
  };
}

export interface ResolvedProposalCanvasTheme {
  templateId: ProposalTemplateCanonicalId;
  canvasBg: string;
  brandColor: string;
  brandFg: string;
  brandAccent: string;
  brandSoft: string;
  brandBorder: string;
  surfaceCard: string;
  cardBg: string;
  surfaceSubtle: string;
  ink: string;
  inkMuted: string;
  inkFaint: string;
  border: string;
  tone: "light" | "dark";
  fontPreset: ProposalFontPresetId;
  headingFont: string;
  bodyFont: string;
  logoConfig: ProposalLogoConfig;
  coverCrop: ProposalCoverCropConfig;
  pricingDisplay: ProposalPricingDisplayConfig;
  nicheId: ProposalNicheId;
  nicheCopy: ProposalNicheCopy;
  nicheSpecEntries: Array<{ key: string; label: string; value: string; unit?: string }>;
  hiddenSections: Set<ProposalSectionKey>;
  isSectionVisible: (key: ProposalSectionKey) => boolean;
  cssVars: Record<string, string>;
}

export function resolveProposalCanvasTheme(
  proposal: Record<string, any> | null | undefined,
  agency?: Record<string, any> | null,
): ResolvedProposalCanvasTheme {
  const rawTemplate =
    proposal?.template_theme || proposal?.templateId || proposal?.template || "editorial-flat";
  const templateId = normalizeCanonicalTemplateId(rawTemplate);
  const defaultPalette = TEMPLATE_DEFAULT_PALETTES[templateId];

  const customFields: Record<string, any> = {
    ...(proposal?.pricing?.custom_fields && typeof proposal.pricing.custom_fields === "object"
      ? proposal.pricing.custom_fields
      : {}),
    ...(proposal?.custom_fields && typeof proposal.custom_fields === "object"
      ? proposal.custom_fields
      : {}),
    ...(proposal?.customFields && typeof proposal.customFields === "object"
      ? proposal.customFields
      : {}),
  };

  const customBg = customFields.canvas_bg_color;
  const canvasBg = isValidHexColor(customBg)
    ? expandHex(customBg)
    : defaultPalette.canvasBg;

  const customBrand = customFields.canvas_brand_color;
  const agencyBrand =
    agency?.brand_color ||
    proposal?.agency_brand_color ||
    proposal?.brand_color ||
    proposal?.brandColorProp;
  const defaultGenericNavy = hex("0A2540");
  const defaultGenericBlue = hex("3B82F6");

  let brandColor = defaultPalette.brandColor;
  if (isValidHexColor(customBrand)) {
    brandColor = expandHex(customBrand);
  } else if (
    isValidHexColor(agencyBrand) &&
    expandHex(agencyBrand) !== defaultGenericNavy &&
    expandHex(agencyBrand) !== defaultGenericBlue
  ) {
    brandColor = expandHex(agencyBrand);
  }

  const bgLuminance = getRelativeLuminance(canvasBg);
  const tone: "light" | "dark" = bgLuminance > 0.35 ? "light" : "dark";

  let surfaceCard: string;
  let surfaceSubtle: string;
  let ink: string;
  let inkMuted: string;
  let inkFaint: string;
  let border: string;

  if (tone === "light") {
    const isPureWhite = canvasBg === hex("FFFFFF");
    surfaceCard = hex("FFFFFF");
    surfaceSubtle = isPureWhite ? hex("F8FAFC") : mixHexColors(canvasBg, hex("0F172A"), 0.04);
    ink = hex("0F172A");
    inkMuted = hex("334155");
    inkFaint = hex("64748B");
    border = hex("E2E8F0");
  } else {
    surfaceCard = mixHexColors(canvasBg, hex("FFFFFF"), 0.06);
    surfaceSubtle = mixHexColors(canvasBg, hex("FFFFFF"), 0.11);
    ink = hex("F8FAFC");
    inkMuted = hex("CBD5E1");
    inkFaint = hex("94A3B8");
    border = mixHexColors(canvasBg, hex("FFFFFF"), 0.15);
  }

  const contrastWithDark = getContrastRatio(hex("0F172A"), brandColor);
  const contrastWithLight = getContrastRatio(hex("FFFFFF"), brandColor);
  const brandFg = contrastWithDark >= contrastWithLight ? hex("0F172A") : hex("FFFFFF");
  const brandAccent = ensureReadableAccent(brandColor, surfaceCard, tone);
  const brandSoft = mixHexColors(surfaceCard, brandAccent, tone === "dark" ? 0.14 : 0.08);
  const brandBorder = mixHexColors(surfaceCard, brandAccent, tone === "dark" ? 0.32 : 0.22);

  const rawFont = String(customFields.canvas_font_preset || defaultPalette.fontPreset);
  const normalizedFont = rawFont === "classic" ? "corporate" : rawFont;
  const fontPreset: ProposalFontPresetId =
    normalizedFont === "modern" ||
    normalizedFont === "corporate" ||
    normalizedFont === "editorial" ||
    normalizedFont === "luxury" ||
    normalizedFont === "geometric"
      ? normalizedFont
      : defaultPalette.fontPreset;
  const fontMeta =
    FONT_PRESET_OPTIONS.find((f) => f.id === fontPreset) || FONT_PRESET_OPTIONS[0];

  const rawShape = String(customFields.logo_shape || "contain");
  const rawSize = String(customFields.logo_size || "md");
  const rawPos = String(customFields.logo_position || "left");
  const logoConfig: ProposalLogoConfig = {
    shape:
      rawShape === "square" || rawShape === "circle" || rawShape === "wide" ? rawShape : "contain",
    size: rawSize === "sm" || rawSize === "lg" || rawSize === "xl" ? rawSize : "md",
    position: rawPos === "center" || rawPos === "right" || rawPos === "badge" ? rawPos : "left",
    objectPosition: String(customFields.logo_object_position || "center center"),
    scale: Math.max(0.5, Math.min(2.5, Number(customFields.logo_scale) || 1)),
  };

  const rawCoverAspect = String(customFields.cover_aspect_mode || "auto");
  const coverFit: "cover" | "contain" = rawCoverAspect === "contain" ? "contain" : "cover";
  const coverCrop: ProposalCoverCropConfig = {
    objectPosition: String(customFields.cover_object_position || "center center"),
    scale: Math.max(0.8, Math.min(2.2, Number(customFields.cover_scale) || 1)),
    aspectMode:
      rawCoverAspect === "cover" || rawCoverAspect === "contain" ? rawCoverAspect : "auto",
    fit: coverFit,
  };

  const customPerPersonRaw = Number(customFields.custom_price_per_person_cents);
  const resolvedCustomPerPerson =
    Number.isFinite(customPerPersonRaw) && customPerPersonRaw > 0
      ? Math.round(customPerPersonRaw)
      : undefined;
  const pricingDisplay: ProposalPricingDisplayConfig = {
    showPerPerson: customFields.show_price_per_person !== "false",
    showPerAdult: customFields.show_price_per_adult !== "false",
    showPerRoom: customFields.show_price_per_room !== "false",
    customPerPersonCents: resolvedCustomPerPerson,
    customPricePerPersonCents: resolvedCustomPerPerson,
  };

  const nicheId = normalizeProposalNicheId(
    customFields.proposal_niche || proposal?.niche || proposal?.category,
  );
  const nicheCopy = resolveProposalNicheCopy(nicheId);
  const nicheSpecEntries = nicheCopy.specFields
    .map((f) => ({
      key: f.key,
      label: f.label,
      unit: f.unit,
      value: typeof customFields[f.key] === "string" ? customFields[f.key].trim() : "",
    }))
    .filter((item) => item.value.length > 0);

  const rawHidden = customFields.hidden_sections;
  const hiddenList: string[] = Array.isArray(rawHidden)
    ? rawHidden.map(String)
    : typeof rawHidden === "string" && rawHidden.trim()
      ? rawHidden.split(",").map((s) => s.trim())
      : [];
  const hiddenSections = new Set<ProposalSectionKey>(
    hiddenList.filter(Boolean) as ProposalSectionKey[],
  );

  const isSectionVisible = (key: ProposalSectionKey) => !hiddenSections.has(key);

  const cssVars: Record<string, string> = {
    "--p-bg": canvasBg,
    "--p-canvas-bg": canvasBg,
    "--p-surface": surfaceCard,
    "--p-subtle": surfaceSubtle,
    "--p-ink": ink,
    "--p-muted": inkMuted,
    "--p-faint": inkFaint,
    "--p-border": border,
    "--p-brand": brandColor,
    "--p-brand-fg": brandFg,
    "--p-brand-accent": brandAccent,
    "--p-brand-soft": brandSoft,
    "--p-brand-border": brandBorder,
    "--p-heading-font": fontMeta.headingFont,
    "--p-body-font": fontMeta.bodyFont,
    "--brand-primary": brandColor,
    "--brand-primary-light": brandAccent,
    "--brand-heading-font": fontMeta.headingFont,
    "--brand-body-font": fontMeta.bodyFont,
    "--background-main": canvasBg,
  };

  return {
    templateId,
    canvasBg,
    brandColor,
    brandFg,
    brandAccent,
    brandSoft,
    brandBorder,
    surfaceCard,
    cardBg: surfaceCard,
    surfaceSubtle,
    ink,
    inkMuted,
    inkFaint,
    border,
    tone,
    fontPreset,
    headingFont: fontMeta.headingFont,
    bodyFont: fontMeta.bodyFont,
    logoConfig,
    coverCrop,
    pricingDisplay,
    nicheId,
    nicheCopy,
    nicheSpecEntries,
    hiddenSections,
    isSectionVisible,
    cssVars,
  };
}
