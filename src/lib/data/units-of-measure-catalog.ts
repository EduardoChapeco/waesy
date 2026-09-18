/**
 * Catálogo Canônico de Unidades de Medida Oficiais do Brasil (SEFAZ / NF-e / MDIC / Receita Federal)
 * Usado para: Cadastro de produtos, notas fiscais eletrônicas (NF-e/NFC-e),
 * controle de estoque, pesagem, fracionamento e precificação no PDV/ERP.
 */

export interface UnitOfMeasureDefinition {
  code: string;       // Código padrão SEFAZ (ex: UN, KG, LT)
  name: string;       // Nome por extenso
  symbol: string;     // Símbolo abreviado
  category: "quantidade" | "peso" | "volume" | "comprimento" | "area" | "embalagem" | "tempo" | "servico";
  sefaz_code: string; // Código correspondente na tabela da SEFAZ
  is_fractionable: boolean; // Permite casas decimais (ex: KG=sim, UN=não)
  description: string;
}

export const GLOBAL_UNITS_OF_MEASURE_CATALOG: UnitOfMeasureDefinition[] = [
  // Quantidade & Contagem
  {
    code: "UN",
    name: "Unidade",
    symbol: "un",
    category: "quantidade",
    sefaz_code: "UN",
    is_fractionable: false,
    description: "Unidade unitária inteira de produto individual.",
  },
  {
    code: "PAR",
    name: "Par",
    symbol: "par",
    category: "quantidade",
    sefaz_code: "PAR",
    is_fractionable: false,
    description: "Conjunto de dois itens complementares (ex: calçados, luvas, brincos).",
  },
  {
    code: "DZ",
    name: "Dúzia",
    symbol: "dz",
    category: "quantidade",
    sefaz_code: "DZ",
    is_fractionable: false,
    description: "Conjunto contendo 12 unidades inteiras.",
  },
  {
    code: "CENTO",
    name: "Cento",
    symbol: "ct",
    category: "quantidade",
    sefaz_code: "CENTO",
    is_fractionable: false,
    description: "Conjunto contendo 100 unidades inteiras (ex: salgadinhos, doces, parafusos).",
  },
  {
    code: "MILHEI",
    name: "Milheiro",
    symbol: "mil",
    category: "quantidade",
    sefaz_code: "MILHEI",
    is_fractionable: false,
    description: "Conjunto contendo 1000 unidades inteiras (ex: tijolos, panfletos, envelopes).",
  },

  // Peso & Massa
  {
    code: "KG",
    name: "Quilograma",
    symbol: "kg",
    category: "peso",
    sefaz_code: "KG",
    is_fractionable: true,
    description: "Unidade básica de massa padrão do Sistema Internacional.",
  },
  {
    code: "G",
    name: "Grama",
    symbol: "g",
    category: "peso",
    sefaz_code: "G",
    is_fractionable: true,
    description: "Submúltiplo do quilograma, comum em itens a granel, especiarias e jóias.",
  },
  {
    code: "MG",
    name: "Miligrama",
    symbol: "mg",
    category: "peso",
    sefaz_code: "MG",
    is_fractionable: true,
    description: "Usado predominantemente na indústria farmacêutica e insumos químicos.",
  },
  {
    code: "TON",
    name: "Tonelada",
    symbol: "t",
    category: "peso",
    sefaz_code: "TON",
    is_fractionable: true,
    description: "Massa equivalente a 1000 quilogramas, comum em grãos, aços e cargas agrícolas.",
  },

  // Volume & Líquidos
  {
    code: "LT",
    name: "Litro",
    symbol: "L",
    category: "volume",
    sefaz_code: "LT",
    is_fractionable: true,
    description: "Unidade de capacidade volumétrica de líquidos e bebidas.",
  },
  {
    code: "ML",
    name: "Mililitro",
    symbol: "ml",
    category: "volume",
    sefaz_code: "ML",
    is_fractionable: true,
    description: "Milésima parte do litro, usada em cosméticos, perfumaria e doses.",
  },
  {
    code: "M3",
    name: "Metro Cúbico",
    symbol: "m³",
    category: "volume",
    sefaz_code: "M3",
    is_fractionable: true,
    description: "Volume cúbico tridimensional, comum em madeira, concreto, água e gás.",
  },
  {
    code: "GL",
    name: "Galão",
    symbol: "gl",
    category: "volume",
    sefaz_code: "GL",
    is_fractionable: false,
    description: "Galão padrão brasileiro (tipicamente 3,6L em tintas ou 20L em água mineral).",
  },

  // Comprimento & Dimensão Linear
  {
    code: "M",
    name: "Metro",
    symbol: "m",
    category: "comprimento",
    sefaz_code: "M",
    is_fractionable: true,
    description: "Medida linear padrão para tecidos, cabos elétricos, mangueiras e ferragens.",
  },
  {
    code: "CM",
    name: "Centímetro",
    symbol: "cm",
    category: "comprimento",
    sefaz_code: "CM",
    is_fractionable: true,
    description: "Medida submúltipla do metro para armarinhos, molduras e ferragens.",
  },
  {
    code: "MM",
    name: "Milímetro",
    symbol: "mm",
    category: "comprimento",
    sefaz_code: "MM",
    is_fractionable: true,
    description: "Medida de alta precisão linear para cutelaria, usinagem e eletrônica.",
  },

  // Área & Superfície
  {
    code: "M2",
    name: "Metro Quadrado",
    symbol: "m²",
    category: "area",
    sefaz_code: "M2",
    is_fractionable: true,
    description: "Medida de área para pisos, revestimentos, vidros, placas solares e tecidos.",
  },
  {
    code: "HA",
    name: "Hectare",
    symbol: "ha",
    category: "area",
    sefaz_code: "HA",
    is_fractionable: true,
    description: "Medida de área equivalente a 10.000 metros quadrados, comum em imóveis rurais.",
  },

  // Embalagens & Agrupamentos
  {
    code: "CX",
    name: "Caixa",
    symbol: "cx",
    category: "embalagem",
    sefaz_code: "CX",
    is_fractionable: false,
    description: "Caixa contendo múltiplos produtos idênticos ou kit fechado.",
  },
  {
    code: "PCT",
    name: "Pacote",
    symbol: "pct",
    category: "embalagem",
    sefaz_code: "PCT",
    is_fractionable: false,
    description: "Embalagem plástica ou de papel contendo itens agrupados.",
  },
  {
    code: "FD",
    name: "Fardo",
    symbol: "fd",
    category: "embalagem",
    sefaz_code: "FD",
    is_fractionable: false,
    description: "Agrupamento industrial amarrado ou selado (ex: fardo de refrigerante ou arroz).",
  },
  {
    code: "SC",
    name: "Saco",
    symbol: "sc",
    category: "embalagem",
    sefaz_code: "SC",
    is_fractionable: false,
    description: "Embalagem de papelão ou ráfia (ex: saco de cimento 50kg, ração 15kg).",
  },
  {
    code: "RL",
    name: "Rolo",
    symbol: "rl",
    category: "embalagem",
    sefaz_code: "RL",
    is_fractionable: false,
    description: "Rolo contínuo enrolado (ex: arame, fita adesiva, papel de parede, grama sintética).",
  },
  {
    code: "KIT",
    name: "Kit",
    symbol: "kit",
    category: "embalagem",
    sefaz_code: "KIT",
    is_fractionable: false,
    description: "Combinação pré-definida de produtos vendidos sob um único código comercial.",
  },

  // Tempo & Serviços
  {
    code: "HOR",
    name: "Hora de Trabalho",
    symbol: "h",
    category: "tempo",
    sefaz_code: "HOR",
    is_fractionable: true,
    description: "Tarifa cobrada por hora técnica de consultoria, mão de obra ou locação.",
  },
  {
    code: "DIA",
    name: "Diária",
    symbol: "dia",
    category: "tempo",
    sefaz_code: "DIA",
    is_fractionable: false,
    description: "Período de 24 horas para hospedagem, locação de veículos e equipamentos.",
  },
  {
    code: "MES",
    name: "Mensalidade",
    symbol: "mês",
    category: "tempo",
    sefaz_code: "MES",
    is_fractionable: false,
    description: "Ciclo de cobrança recorrente mensal para planos, assinaturas e aluguéis.",
  },
  {
    code: "SV",
    name: "Serviço Prestado",
    symbol: "sv",
    category: "servico",
    sefaz_code: "SV",
    is_fractionable: false,
    description: "Prestação de serviço integral fechado (escopo contratual determinado).",
  }
];
