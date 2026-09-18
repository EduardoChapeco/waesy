/**
 * Catálogo Canônico de Classificação e Tipos de Imóveis (COFECI / CRECI / Mercado Imobiliário)
 * Usado para: Portal de Imóveis, Classificados Imobiliários, Ficha de Captação do Corretor,
 * Contratos de Locação/Venda e Filtros de Busca Avançada na Waesy Imóveis.
 */

export interface RealEstateTypeDefinition {
  id: string;
  name: string;
  code: string;
  category: "residencial" | "comercial" | "rural" | "terreno_incorporacao" | "industrial";
  transaction_modes: ("venda" | "locacao" | "temporada")[];
  typical_features: string[];
  requires_area_useful: boolean;
  requires_bedrooms: boolean;
  requires_parking_spaces: boolean;
  description: string;
}

export const GLOBAL_REAL_ESTATE_TYPES_CATALOG: RealEstateTypeDefinition[] = [
  // Residencial
  {
    id: "re-apartamento-padrao",
    name: "Apartamento Padrão",
    code: "APARTAMENTO_PADRAO",
    category: "residencial",
    transaction_modes: ["venda", "locacao", "temporada"],
    typical_features: ["Elevador", "Sacada", "Churrasqueira", "Interfone", "Portaria 24h", "Salão de Festas"],
    requires_area_useful: true,
    requires_bedrooms: true,
    requires_parking_spaces: true,
    description: "Unidade residencial autônoma em edifício multifamiliar vertical.",
  },
  {
    id: "re-casa-alvenaria",
    name: "Casa Residencial",
    code: "CASA_RESIDENCIAL",
    category: "residencial",
    transaction_modes: ["venda", "locacao", "temporada"],
    typical_features: ["Pátio Privativo", "Garagem Fechada", "Murado", "Área de Serviço", "Jardim"],
    requires_area_useful: true,
    requires_bedrooms: true,
    requires_parking_spaces: true,
    description: "Imóvel unifamiliar isolado em lote exclusivo.",
  },
  {
    id: "re-sobrado-geminado",
    name: "Sobrado Geminado",
    code: "SOBRADO_GEMINADO",
    category: "residencial",
    transaction_modes: ["venda", "locacao"],
    typical_features: ["2 Pavimentos", "Lavabo", "Quintal nos Fundos", "Entrada Individual"],
    requires_area_useful: true,
    requires_bedrooms: true,
    requires_parking_spaces: true,
    description: "Residência com dois ou mais pavimentos compartilhando parede lateral com outra unidade.",
  },
  {
    id: "re-cobertura",
    name: "Cobertura / Penthouse",
    code: "COBERTURA",
    category: "residencial",
    transaction_modes: ["venda", "locacao", "temporada"],
    typical_features: ["Terraço Gourmet", "Piscina Privativa", "Vista Panorâmica", "Elevador com Chave", "Suíte Master"],
    requires_area_useful: true,
    requires_bedrooms: true,
    requires_parking_spaces: true,
    description: "Unidade no último andar do edifício com área aberta, terraço privativo e alto padrão de acabamento.",
  },
  {
    id: "re-studio-loft",
    name: "Studio / Loft / Kitnet",
    code: "STUDIO_LOFT",
    category: "residencial",
    transaction_modes: ["venda", "locacao", "temporada"],
    typical_features: ["Conceito Aberto", "Mobiliado", "Lavanderia Coletiva", "Academia no Prédio", "Coworking"],
    requires_area_useful: true,
    requires_bedrooms: false,
    requires_parking_spaces: false,
    description: "Espaço compacto e integrado sem divisórias internas rígidas, ideal para solteiros e curta temporada.",
  },
  {
    id: "re-casa-condominio",
    name: "Casa em Condomínio Fechado",
    code: "CASA_CONDOMINIO",
    category: "residencial",
    transaction_modes: ["venda", "locacao"],
    typical_features: ["Segurança 24h", "Quadra de Tênis", "Piscina Coletiva", "Pista de Caminhada", "Clube Privativo"],
    requires_area_useful: true,
    requires_bedrooms: true,
    requires_parking_spaces: true,
    description: "Residência de alto padrão construída dentro de perímetro murado com portaria e segurança privada.",
  },

  // Comercial
  {
    id: "re-sala-comercial",
    name: "Sala / Conjunto Comercial",
    code: "SALA_COMERCIAL",
    category: "comercial",
    transaction_modes: ["venda", "locacao"],
    typical_features: ["Recepção", "Sanitário Privativo", "Catraca Eletrônica", "Auditório Coletivo", "Fibra Óptica"],
    requires_area_useful: true,
    requires_bedrooms: false,
    requires_parking_spaces: true,
    description: "Espaço modular para consultórios, escritórios de advocacia, clínicas e empresas de serviços.",
  },
  {
    id: "re-loja-terrea",
    name: "Loja Térrea de Rua",
    code: "LOJA_TERREA",
    category: "comercial",
    transaction_modes: ["venda", "locacao"],
    typical_features: ["Vitrine Frontal", "Porta de Aço Automática", "Piso de Alto Tráfego", "Estacionamento para Clientes"],
    requires_area_useful: true,
    requires_bedrooms: false,
    requires_parking_spaces: false,
    description: "Ponto comercial térreo com visibilidade direta para calçada ou avenida de alto fluxo de pedestres.",
  },
  {
    id: "re-ponto-comercial",
    name: "Ponto Comercial / Fundo de Comércio",
    code: "PONTO_COMERCIAL",
    category: "comercial",
    transaction_modes: ["venda"],
    typical_features: ["Clientela Ativa", "Instalações Prontas", "Estoque Incluso", "Contrato de Locação Renovável"],
    requires_area_useful: true,
    requires_bedrooms: false,
    requires_parking_spaces: false,
    description: "Cessão de instalações, equipamentos, carteira de clientes e direito de ocupação de negócio em operação.",
  },

  // Industrial & Logístico
  {
    id: "re-galpao-logistico",
    name: "Galpão Industrial / Logístico",
    code: "GALPAO_LOGISTICO",
    category: "industrial",
    transaction_modes: ["venda", "locacao"],
    typical_features: ["Pé-direito Duplo (8m a 12m)", "Docas de Carga/Descarga", "Piso com Resistência 5 ton/m²", "Pátio de Manobra", "Zoneamento Industrial"],
    requires_area_useful: true,
    requires_bedrooms: false,
    requires_parking_spaces: true,
    description: "Edificação ampla para centros de distribuição, estoques atacadistas ou linhas de montagem industrial.",
  },

  // Terrenos & Lotes
  {
    id: "re-terreno-urbano",
    name: "Terreno Urbano",
    code: "TERRENO_URBANO",
    category: "terreno_incorporacao",
    transaction_modes: ["venda"],
    typical_features: ["Topografia Plana", "Frente Murada", "Rede de Água e Energia", "Escriturado", "Pronto para Construir"],
    requires_area_useful: true,
    requires_bedrooms: false,
    requires_parking_spaces: false,
    description: "Lote desprovido de edificação permanente em perímetro urbano aprovado pela prefeitura.",
  },
  {
    id: "re-lote-condominio",
    name: "Lote em Condomínio Fechado",
    code: "LOTE_CONDOMINIO",
    category: "terreno_incorporacao",
    transaction_modes: ["venda"],
    typical_features: ["Portaria Blindada", "Asfalto Ecológico", "Rede Subterrânea", "Área de Preservação", "Clube Social"],
    requires_area_useful: true,
    requires_bedrooms: false,
    requires_parking_spaces: false,
    description: "Fração ideal de terreno inserida em empreendimento fechado com estatuto construtivo próprio.",
  },

  // Rural
  {
    id: "re-chacara-lazer",
    name: "Chácara de Lazer",
    code: "CHACARA_LAZER",
    category: "rural",
    transaction_modes: ["venda", "temporada"],
    typical_features: ["Açude / Tanque de Peixe", "Pomar Produtivo", "Quiosque com Fogão a Lenha", "Poço Artesiano", "Casa Sede"],
    requires_area_useful: true,
    requires_bedrooms: true,
    requires_parking_spaces: true,
    description: "Pequena propriedade rural ou periurbana para descanso, convivência familiar e pequenos cultivos.",
  },
  {
    id: "re-sitio-fazenda",
    name: "Fazenda / Sítio Produtivo",
    code: "FAZENDA_SITIO",
    category: "rural",
    transaction_modes: ["venda"],
    typical_features: ["Terra Mecanizável", "Nascentes Naturais", "Curral com Balança", "Barracão de Máquinas", "Reserva Legal Averbada"],
    requires_area_useful: true,
    requires_bedrooms: false,
    requires_parking_spaces: false,
    description: "Grande extensão de terra rural destinada à agricultura comercial, silvicultura ou pecuária intensiva.",
  }
];
