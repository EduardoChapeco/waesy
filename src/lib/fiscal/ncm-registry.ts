/**
 * ncm-registry.ts — Dono Único de Classificação Fiscal NCM, CEST, CFOP e Reforma IBS/CBS (R22)
 *
 * Fonte Única da Verdade para:
 * - Catálogo referencial de NCMs (Nomenclatura Comum do Mercosul)
 * - Tabela padrão de CFOPs (Código Fiscal de Operações e Prestações)
 * - Tabela de CESTs (Código Especificador da Substituição Tributária)
 * - Parâmetros preliminares de IBS / CBS da Reforma Tributária (Emenda Constitucional 132/2023)
 * - Sanitização e validação de documentos fiscais
 *
 * Regra B.2: src/lib/ é utilitário puro.
 * Regra R22: Proibido duplicar NCM_REGISTRY ou CFOP_TABLE em outros módulos.
 */

export interface NcmEntry {
  code: string; // 8 dígitos formatados ou desformatados
  description: string;
  category: 'alimentos' | 'bebidas' | 'vestuario' | 'eletronicos' | 'servicos' | 'geral';
  defaultCest?: string;
  nationalTaxRatePercent: number; // Média estimada IBPT
  importTaxRatePercent: number;
}

export interface CfopEntry {
  code: string; // 4 dígitos
  description: string;
  type: 'entrada' | 'saida';
  scope: 'estadual' | 'interestadual' | 'exterior';
}

export interface TaxReformRates {
  ibsRatePercent: number; // Imposto sobre Bens e Serviços (Estados/Municípios)
  cbsRatePercent: number; // Contribuição sobre Bens e Serviços (União)
  isExemptOrReduced: boolean;
  reducedPercent?: number;
}

// ── Registry Canônico de NCM ─────────────────────────────────────────────────

export const NCM_REGISTRY: Record<string, NcmEntry> = {
  // Alimentos & Perecíveis
  '02013000': {
    code: '02013000',
    description: 'Carnes de bovino, frescas ou refrigeradas, desossadas',
    category: 'alimentos',
    defaultCest: '1708700',
    nationalTaxRatePercent: 4.0,
    importTaxRatePercent: 12.0,
  },
  '04012010': {
    code: '04012010',
    description: 'Leite UHT integral',
    category: 'alimentos',
    defaultCest: '1701900',
    nationalTaxRatePercent: 4.2,
    importTaxRatePercent: 14.5,
  },
  '07020000': {
    code: '07020000',
    description: 'Tomates frescos ou refrigerados (Hortifruti)',
    category: 'alimentos',
    nationalTaxRatePercent: 0.0,
    importTaxRatePercent: 10.0,
  },
  '19059090': {
    code: '19059090',
    description: 'Produtos de panificação, pastelaria e biscoitos',
    category: 'alimentos',
    defaultCest: '1705600',
    nationalTaxRatePercent: 12.0,
    importTaxRatePercent: 25.0,
  },
  '22021000': {
    code: '22021000',
    description: 'Águas minerais, refrigerantes e outras bebidas com adição de açúcar',
    category: 'bebidas',
    defaultCest: '0300700',
    nationalTaxRatePercent: 18.5,
    importTaxRatePercent: 32.0,
  },

  // Vestuário & Calçados
  '61091000': {
    code: '61091000',
    description: 'Camisetas (t-shirts) de malha, de algodão',
    category: 'vestuario',
    nationalTaxRatePercent: 13.5,
    importTaxRatePercent: 35.0,
  },
  '64039990': {
    code: '64039990',
    description: 'Calçados com sola exterior de borracha/plástico e parte superior em couro',
    category: 'vestuario',
    defaultCest: '2803800',
    nationalTaxRatePercent: 14.2,
    importTaxRatePercent: 35.0,
  },

  // Eletrônicos & Acessórios
  '85171300': {
    code: '85171300',
    description: 'Smartphones e telefones para redes celulares',
    category: 'eletronicos',
    defaultCest: '2105300',
    nationalTaxRatePercent: 15.8,
    importTaxRatePercent: 42.0,
  },
  '85044010': {
    code: '85044010',
    description: 'Carregadores de acumuladores para dispositivos móveis',
    category: 'eletronicos',
    defaultCest: '2102100',
    nationalTaxRatePercent: 16.0,
    importTaxRatePercent: 38.0,
  },

  // Serviços e Atividades Avulsas (NCM genérico / NBS de apoio)
  '00000000': {
    code: '00000000',
    description: 'Operações de Serviços, Ingressos e Não Mercadorias',
    category: 'servicos',
    nationalTaxRatePercent: 0.0,
    importTaxRatePercent: 0.0,
  },
};

// ── Tabela Canônica de CFOP ──────────────────────────────────────────────────

export const CFOP_TABLE: Record<string, CfopEntry> = {
  // Saídas Internas (Dentro do Estado)
  '5102': {
    code: '5102',
    description: 'Venda de mercadoria adquirida ou recebida de terceiros',
    type: 'saida',
    scope: 'estadual',
  },
  '5405': {
    code: '5405',
    description: 'Venda de mercadoria adquirida ou recebida de terceiros, sujeita ao regime de substituição tributária (ST)',
    type: 'saida',
    scope: 'estadual',
  },
  '5933': {
    code: '5933',
    description: 'Prestação de serviço tributado pelo ISSQN',
    type: 'saida',
    scope: 'estadual',
  },
  '5202': {
    code: '5202',
    description: 'Devolução de compra para comercialização',
    type: 'saida',
    scope: 'estadual',
  },

  // Saídas Interestaduais
  '6102': {
    code: '6102',
    description: 'Venda de mercadoria adquirida ou recebida de terceiros para outro Estado',
    type: 'saida',
    scope: 'interestadual',
  },
  '6404': {
    code: '6404',
    description: 'Venda de mercadoria sujeita a ST destinada a não contribuinte interestadual',
    type: 'saida',
    scope: 'interestadual',
  },

  // Entradas Internas
  '1102': {
    code: '1102',
    description: 'Compra para comercialização',
    type: 'entrada',
    scope: 'estadual',
  },
  '1403': {
    code: '1403',
    description: 'Compra para comercialização em operação com mercadoria sujeita a ST',
    type: 'entrada',
    scope: 'estadual',
  },
};

// ── Funções de Validação e Formatação ─────────────────────────────────────────

/**
 * Higieniza código NCM removendo pontos e caracteres não numéricos
 */
export function sanitizeNcm(ncm: string): string {
  return (ncm || '').replace(/\D/g, '').slice(0, 8);
}

/**
 * Valida se um código NCM tem o formato canônico de 8 dígitos numéricos
 */
export function isValidNcmFormat(ncm: string): boolean {
  const clean = sanitizeNcm(ncm);
  return clean.length === 8;
}

/**
 * Formata NCM no padrão clássico da Receita Federal (ex: 8517.13.00)
 */
export function formatNcm(ncm: string): string {
  const clean = sanitizeNcm(ncm);
  if (clean.length !== 8) return clean;
  return `${clean.slice(0, 4)}.${clean.slice(4, 6)}.${clean.slice(6, 8)}`;
}

/**
 * Busca NCM no catálogo canônico ou retorna fallback seguro
 */
export function findNcmEntry(ncm: string): NcmEntry | null {
  const clean = sanitizeNcm(ncm);
  return NCM_REGISTRY[clean] || null;
}

/**
 * Calcula estimativa inicial de IBS e CBS para a Reforma Tributária (EC 132/2023)
 */
export function estimateTaxReform(
  ncm: string,
  nicheId?: string
): TaxReformRates {
  // Cesta básica e hortifruti têm alíquota zero / redução de 100%
  const clean = sanitizeNcm(ncm);
  const entry = NCM_REGISTRY[clean];

  if (entry?.category === 'alimentos' && (clean === '07020000' || clean === '04012010')) {
    return {
      ibsRatePercent: 0,
      cbsRatePercent: 0,
      isExemptOrReduced: true,
      reducedPercent: 100,
    };
  }

  // Serviços de turismo e hotelaria possuem regime diferenciado (redução de 60%)
  if (nicheId === 'turismo') {
    return {
      ibsRatePercent: 6.8, // 17.0 * 0.4
      cbsRatePercent: 3.5, // 8.8 * 0.4
      isExemptOrReduced: true,
      reducedPercent: 60,
    };
  }

  // Alíquota padrão estimada para bens de consumo
  return {
    ibsRatePercent: 17.0,
    cbsRatePercent: 8.8,
    isExemptOrReduced: false,
  };
}
