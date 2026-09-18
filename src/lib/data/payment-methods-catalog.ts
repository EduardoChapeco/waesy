/**
 * Catálogo Canônico de Meios de Pagamento e Bandeiras (SEFAZ / NF-e / BACEN / PIX)
 * Usado para: PDV Frente de Caixa, Checkout Online, Configuração de Gateway,
 * Conciliação Financeira, Emissão de Cupom Fiscal NFC-e/NF-e e Split de Pagamentos.
 */

export interface PaymentMethodDefinition {
  sefaz_code: string;  // Código oficial da SEFAZ na Nota Fiscal (ex: 01, 03, 17)
  code: string;        // Identificador amigável (ex: PIX, CREDIT_CARD, CASH)
  name: string;
  category: "dinheiro" | "pix" | "cartao_credito" | "cartao_debito" | "boleto" | "vale" | "credito_loja" | "carteira_digital" | "fidelidade";
  settlement_days: number; // Prazo médio de liquidação financeira (D+0, D+1, D+30)
  supports_installments: boolean; // Suporta parcelamento
  is_instant: boolean;
  active: boolean;
  description: string;
}

export interface CardBrandDefinition {
  code: string;
  name: string;
  category: "credito_debito" | "voucher_beneficios" | "privatelabel";
  sefaz_brand_code: string; // Tabela de bandeiras de cartão da SEFAZ (01 Visa, 02 Mastercard, 03 Amex, etc.)
  bin_ranges_hint: string;
}

export const GLOBAL_PAYMENT_METHODS_CATALOG: PaymentMethodDefinition[] = [
  {
    sefaz_code: "01",
    code: "CASH",
    name: "Dinheiro em Espécie",
    category: "dinheiro",
    settlement_days: 0,
    supports_installments: false,
    is_instant: true,
    active: true,
    description: "Pagamento físico em cédulas ou moedas de Real (BRL) diretamente no balcão.",
  },
  {
    sefaz_code: "17",
    code: "PIX",
    name: "PIX (Banco Central)",
    category: "pix",
    settlement_days: 0,
    supports_installments: false,
    is_instant: true,
    active: true,
    description: "Pagamento instantâneo brasileiro do BACEN disponível 24/7 com liquidação em segundos.",
  },
  {
    sefaz_code: "03",
    code: "CREDIT_CARD",
    name: "Cartão de Crédito",
    category: "cartao_credito",
    settlement_days: 30,
    supports_installments: true,
    is_instant: true,
    active: true,
    description: "Pagamento a prazo via cartão de crédito presencial ou online com opção de parcelamento.",
  },
  {
    sefaz_code: "04",
    code: "DEBIT_CARD",
    name: "Cartão de Débito",
    category: "cartao_debito",
    settlement_days: 1,
    supports_installments: false,
    is_instant: true,
    active: true,
    description: "Pagamento à vista com débito direto na conta bancária do comprador.",
  },
  {
    sefaz_code: "15",
    code: "BOLETO",
    name: "Boleto Bancário",
    category: "boleto",
    settlement_days: 2,
    supports_installments: false,
    is_instant: false,
    active: true,
    description: "Título de cobrança bancária tradicional com vencimento e compensação via CIP/Febraban.",
  },
  {
    sefaz_code: "10",
    code: "VALE_ALIMENTACAO",
    name: "Vale-Alimentação (VA)",
    category: "vale",
    settlement_days: 30,
    supports_installments: false,
    is_instant: true,
    active: true,
    description: "Cartão benefício PAT para aquisição de alimentos in natura e supermercados.",
  },
  {
    sefaz_code: "11",
    code: "VALE_REFEICAO",
    name: "Vale-Refeição (VR)",
    category: "vale",
    settlement_days: 30,
    supports_installments: false,
    is_instant: true,
    active: true,
    description: "Cartão benefício PAT para consumo de refeições prontas em restaurantes, bares e lanchonetes.",
  },
  {
    sefaz_code: "13",
    code: "VALE_COMBUSTIVEL",
    name: "Vale-Combustível",
    category: "vale",
    settlement_days: 30,
    supports_installments: false,
    is_instant: true,
    active: true,
    description: "Cartão corporativo para abastecimento em postos de combustível e serviços automotivos.",
  },
  {
    sefaz_code: "05",
    code: "STORE_CREDIT",
    name: "Crédito Loja / Crediário Próprio",
    category: "credito_loja",
    settlement_days: 0,
    supports_installments: true,
    is_instant: true,
    active: true,
    description: "Financiamento direto do lojista (carnê, conta corrente interna ou crediário fidelidade).",
  },
  {
    sefaz_code: "18",
    code: "DIGITAL_WALLET",
    name: "Carteira Digital (Apple Pay, Google Pay, Mercado Pago)",
    category: "carteira_digital",
    settlement_days: 1,
    supports_installments: true,
    is_instant: true,
    active: true,
    description: "Pagamento por aproximação NFC ou autenticação biométrica em carteiras digitais seguras.",
  },
  {
    sefaz_code: "19",
    code: "LOYALTY_CASHBACK",
    name: "Pontos de Fidelidade / Cashback Waesy",
    category: "fidelidade",
    settlement_days: 0,
    supports_installments: false,
    is_instant: true,
    active: true,
    description: "Resgate de saldo acumulado em programa de recompensas da comunidade Waesy.",
  }
];

export const GLOBAL_CARD_BRANDS_CATALOG: CardBrandDefinition[] = [
  {
    code: "VISA",
    name: "Visa",
    category: "credito_debito",
    sefaz_brand_code: "01",
    bin_ranges_hint: "4xxx",
  },
  {
    code: "MASTERCARD",
    name: "Mastercard",
    category: "credito_debito",
    sefaz_brand_code: "02",
    bin_ranges_hint: "51-55, 22-27",
  },
  {
    code: "AMERICAN_EXPRESS",
    name: "American Express",
    category: "credito_debito",
    sefaz_brand_code: "03",
    bin_ranges_hint: "34, 37",
  },
  {
    code: "ELO",
    name: "Elo",
    category: "credito_debito",
    sefaz_brand_code: "06",
    bin_ranges_hint: "4011, 4312, 5067, 6363",
  },
  {
    code: "HIPERCARD",
    name: "Hipercard",
    category: "credito_debito",
    sefaz_brand_code: "07",
    bin_ranges_hint: "6062",
  },
  {
    code: "ALELO",
    name: "Alelo",
    category: "voucher_beneficios",
    sefaz_brand_code: "99",
    bin_ranges_hint: "5066, 6505",
  },
  {
    code: "SODEXO_PLUXEE",
    name: "Pluxee (Sodexo)",
    category: "voucher_beneficios",
    sefaz_brand_code: "99",
    bin_ranges_hint: "6033, 6060",
  },
  {
    code: "TICKET",
    name: "Ticket Serviços",
    category: "voucher_beneficios",
    sefaz_brand_code: "99",
    bin_ranges_hint: "6037",
  },
  {
    code: "VR_BENEFICIOS",
    name: "VR Benefícios",
    category: "voucher_beneficios",
    sefaz_brand_code: "99",
    bin_ranges_hint: "6274, 6370",
  }
];
