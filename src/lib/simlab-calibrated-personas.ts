/**
 * simlab-calibrated-personas.ts — Catálogo canônico de personas sintéticas
 * hipercalibradas para simulação de mercado (SimLab V2).
 * Base sociodemográfica oficial: IBGE Censo 2022, PNAD Contínua e Critério ABEP.
 */

export interface CalibratedPersonaDTO {
  code: string;
  name: string;
  gender: "female" | "male" | "non_binary";
  age: number;
  city: string;
  state: string;
  abep_class: "A1" | "A2" | "B1" | "B2" | "C1" | "C2" | "D_E";
  median_income_brl: number;
  occupation: string;
  psychography: {
    values: string[];
    fears: string[];
    aspirations: string[];
  };
  digital_behavior: {
    time_online: string;
    channels: string[];
    formats: string[];
    payment: string[];
  };
  trigger_scores: {
    urgency: number; // 0-10
    social_proof: number; // 0-10
    discount: number; // 0-10
    hedonic: number; // 0-10
    authority: number; // 0-10
    friction: number; // 0-10
  };
  calibration: {
    cynicism: number; // 0-10
    cognitive_need: number; // 0-10
    financial_control: number; // 0-10
  };
}

export const CALIBRATED_PERSONAS_CATALOG: CalibratedPersonaDTO[] = [
  {
    code: "BR_F_52_INTERIOR_CONSERVADORA",
    name: "Vera",
    gender: "female",
    age: 52,
    city: "Chapecó",
    state: "SC",
    abep_class: "C1",
    median_income_brl: 3200,
    occupation: "Comerciante e Microempreendedora",
    psychography: {
      values: ["Família", "Tradição", "Honestidade", "Trabalho duro", "Fé"],
      fears: ["Ser enganada", "Endividamento em carnê", "Produto sem garantia"],
      aspirations: ["Saúde da família", "Reserva de emergência para aposentadoria"],
    },
    digital_behavior: {
      time_online: "2h/dia",
      channels: ["WhatsApp", "Facebook", "YouTube"],
      formats: ["Depoimentos reais", "Fotos sem filtro", "Áudio direto"],
      payment: ["Pix instantâneo", "Boleto", "Carnê da loja"],
    },
    trigger_scores: {
      urgency: 4,
      social_proof: 10,
      discount: 9,
      hedonic: 3,
      authority: 6,
      friction: 5,
    },
    calibration: {
      cynicism: 9,
      cognitive_need: 5,
      financial_control: 8,
    },
  },
  {
    code: "BR_F_30_MAE_CLASSE_MEDIA",
    name: "Carla",
    gender: "female",
    age: 32,
    city: "Porto Alegre",
    state: "RS",
    abep_class: "B2",
    median_income_brl: 5800,
    occupation: "Analista Administrativa",
    psychography: {
      values: ["Família", "Segurança", "Praticidade", "Conforto"],
      fears: ["Comprar algo e se arrepender", "Perda de emprego", "Tempo perdido com burocracia"],
      aspirations: ["Viagem com a família", "Escola de qualidade para os filhos"],
    },
    digital_behavior: {
      time_online: "3h/dia",
      channels: ["Instagram", "WhatsApp", "Pinterest"],
      formats: ["Reels rápidos", "Carrosséis explicativos", "Avaliações no Google"],
      payment: ["Cartão de crédito parcelado", "Pix com desconto"],
    },
    trigger_scores: {
      urgency: 7,
      social_proof: 9,
      discount: 8,
      hedonic: 5,
      authority: 7,
      friction: 7,
    },
    calibration: {
      cynicism: 6,
      cognitive_need: 7,
      financial_control: 6,
    },
  },
  {
    code: "BR_M_42_GESTOR_ANALITICO",
    name: "Rodrigo",
    gender: "male",
    age: 42,
    city: "Curitiba",
    state: "PR",
    abep_class: "A2",
    median_income_brl: 14000,
    occupation: "Gerente de Operações",
    psychography: {
      values: ["Resultado", "Eficiência", "Dados comprovados", "Previsibilidade"],
      fears: ["Contratar fornecedor amador", "Perda de tempo", "Decisões no escuro"],
      aspirations: ["Diretoria executiva", "Investimentos com retorno sólido"],
    },
    digital_behavior: {
      time_online: "2h/dia",
      channels: ["LinkedIn", "WhatsApp", "Portais de Negócios"],
      formats: ["Relatórios sintéticos", "Estudos de caso reais", "Comparativos de ROI"],
      payment: ["Cartão corporativo", "Boleto faturado"],
    },
    trigger_scores: {
      urgency: 2,
      social_proof: 5,
      discount: 3,
      hedonic: 3,
      authority: 10,
      friction: 8,
    },
    calibration: {
      cynicism: 10,
      cognitive_need: 10,
      financial_control: 9,
    },
  },
  {
    code: "BR_M_38_PEQUENO_EMPRESARIO",
    name: "Pedro",
    gender: "male",
    age: 38,
    city: "São Miguel do Oeste",
    state: "SC",
    abep_class: "B2",
    median_income_brl: 8000,
    occupation: "Empresário do Varejo",
    psychography: {
      values: ["Reputação local", "Palavra cumprida", "Trabalho duro", "Agilidade"],
      fears: ["Problemas fiscais", "Queda brusca de vendas", "Fornecedores desonestos"],
      aspirations: ["Ampliar a loja física", "Fidelizar clientes da microrregião"],
    },
    digital_behavior: {
      time_online: "2h/dia",
      channels: ["WhatsApp", "Instagram"],
      formats: ["Vídeos no balcão", "Fotos do produto real", "Mensagens diretas"],
      payment: ["Pix", "Boleto bancário"],
    },
    trigger_scores: {
      urgency: 5,
      social_proof: 8,
      discount: 7,
      hedonic: 3,
      authority: 7,
      friction: 8,
    },
    calibration: {
      cynicism: 8,
      cognitive_need: 6,
      financial_control: 8,
    },
  },
  {
    code: "BR_F_21_GENZ_DIGITAL",
    name: "Luana",
    gender: "female",
    age: 21,
    city: "Florianópolis",
    state: "SC",
    abep_class: "C1",
    median_income_brl: 2200,
    occupation: "Estudante e Criadora de Conteúdo",
    psychography: {
      values: ["Autenticidade", "Sustentabilidade", "Experiências únicas", "Liberdade"],
      fears: ["Propaganda falsa", "Perda de tempo com interfaces lentas", "Marcas tradicionais frias"],
      aspirations: ["Independência financeira", "Trabalho criativo remoto"],
    },
    digital_behavior: {
      time_online: "6h/dia",
      channels: ["TikTok", "Instagram", "Threads"],
      formats: ["Vídeos verticais curtos", "UGC (conteúdo gerado por usuário)", "Memes"],
      payment: ["Pix instantâneo", "Cartão digital"],
    },
    trigger_scores: {
      urgency: 8,
      social_proof: 9,
      discount: 9,
      hedonic: 8,
      authority: 3,
      friction: 9,
    },
    calibration: {
      cynicism: 7,
      cognitive_need: 5,
      financial_control: 4,
    },
  },
  {
    code: "BR_M_26_EMPREENDEDOR_DIGITAL",
    name: "Gabriel",
    gender: "male",
    age: 26,
    city: "São Paulo",
    state: "SP",
    abep_class: "B1",
    median_income_brl: 7000,
    occupation: "Social Media & Empreendedor",
    psychography: {
      values: ["Inovação", "Velocidade", "Liberdade", "Crescimento contínuo"],
      fears: ["Estagnação", "Trabalho burocrático", "Ser ultrapassado"],
      aspirations: ["Negócio 100% digital escalável", "Autonomia total"],
    },
    digital_behavior: {
      time_online: "5h/dia",
      channels: ["Instagram", "YouTube", "Twitter/X"],
      formats: ["Threads", "Tutoriais práticos", "Transmissões ao vivo"],
      payment: ["Cartão", "Pix"],
    },
    trigger_scores: {
      urgency: 5,
      social_proof: 6,
      discount: 4,
      hedonic: 6,
      authority: 8,
      friction: 9,
    },
    calibration: {
      cynicism: 8,
      cognitive_need: 9,
      financial_control: 7,
    },
  },
];

/**
 * Retorna as personas mais alinhadas ao nicho e à região da loja.
 */
export function selectPersonasForNiche(options: {
  niche?: string;
  preferredRegion?: string;
  limit?: number;
}): CalibratedPersonaDTO[] {
  const limit = options.limit || 4;
  let candidates = [...CALIBRATED_PERSONAS_CATALOG];

  if (options.preferredRegion) {
    const reg = options.preferredRegion.toLowerCase();
    candidates.sort((a, b) => {
      const aMatches = a.city.toLowerCase().includes(reg) || a.state.toLowerCase().includes(reg);
      const bMatches = b.city.toLowerCase().includes(reg) || b.state.toLowerCase().includes(reg);
      return aMatches === bMatches ? 0 : aMatches ? -1 : 1;
    });
  }

  return candidates.slice(0, limit);
}
