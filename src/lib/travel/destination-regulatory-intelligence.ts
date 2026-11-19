/**
 * DESTINATION REGULATORY & TAX INTELLIGENCE ENGINE (Waesy Travel Engine)
 *
 * Mapeia, detecta e formata automaticamente taxas ambientais, vouchers governamentais
 * obrigatórios (ex: Bonito Voucher Digital, Noronha TPA/ICMBio, Jeri TTS, Cancún Visitax),
 * vistos, regras de validade de passaporte e exigências de seguro viagem conforme o destino.
 */

export type RegulatoryRequirementCategory =
  | "environmental_tax"
  | "voucher_mandatory"
  | "visa_and_passport"
  | "resort_fee"
  | "health_and_insurance"
  | "park_admission";

export type RegulatorySeverity = "mandatory" | "warning" | "advisory";

export type PaymentTiming =
  | "prior_online"
  | "agency_voucher"
  | "on_arrival"
  | "hotel_checkin"
  | "airline_checkin";

export interface DestinationRegulatoryRequirement {
  id: string;
  category: RegulatoryRequirementCategory;
  severity: RegulatorySeverity;
  title: string;
  summary: string;
  detailedNotice: string;
  approximateEstimateText: string;
  estimateCentsPerPaxDay?: number;
  estimateCentsFixedPerPax?: number;
  paymentTiming: PaymentTiming;
  officialSource: string;
  actionTip: string;
  externalUrl?: string;
}

export interface DestinationRegulatoryReport {
  matchedDestination: string | null;
  hasMandatoryFees: boolean;
  hasPassportOrVisaAlerts: boolean;
  requirements: DestinationRegulatoryRequirement[];
  totalEstimatedFeesCents: number;
  disclaimerText: string;
}

interface DestinationRuleConfig {
  id: string;
  name: string;
  keywords: string[];
  requirements: DestinationRegulatoryRequirement[];
}

export const CANONICAL_DESTINATION_RULES: DestinationRuleConfig[] = [
  {
    id: "bonito_ms",
    name: "Bonito (Mato Grosso do Sul)",
    keywords: ["bonito", "bodoquena", "jardim ms", "pantanal sul", "rio da prata", "gruta do lago azul"],
    requirements: [
      {
        id: "bonito-voucher-unico",
        category: "voucher_mandatory",
        severity: "mandatory",
        title: "Voucher Único Digital Obrigatório",
        summary: "Nenhum atrativo aceita pagamento ou entrada avulsa no local sem emissão prévia de voucher.",
        detailedNotice:
          "Todos os passeios de flutuação, grutas, cachoeiras e balneários em Bonito são tabelados e exigem emissão do Voucher Único Digital por agência de turismo credenciada pela Prefeitura de Bonito. A compra deve ser feita com antecedência para reserva de horários nos grupos.",
        approximateEstimateText: "Incluso nas diárias dos passeios tabelados",
        paymentTiming: "agency_voucher",
        officialSource: "Prefeitura Municipal de Bonito / SECTUR",
        actionTip: "Emita todos os vouchers dos atrativos no nome completo dos viajantes antes do embarque.",
      },
      {
        id: "bonito-taxa-ambiental",
        category: "environmental_tax",
        severity: "advisory",
        title: "Taxa de Conservação Ambiental (TCA)",
        summary: "Taxa municipal para preservação de mananciais e conservação de estradas ecológicas.",
        detailedNotice:
          "Instituída pelo município de Bonito para investimentos em saneamento e proteção das águas cristalinas dos rios Formoso, Sucuri e da Prata.",
        approximateEstimateText: "R$ 5,00 a R$ 10,00 por dia/atrativo (geralmente embutida no voucher)",
        paymentTiming: "agency_voucher",
        officialSource: "Prefeitura Municipal de Bonito - Lei Complementar",
        actionTip: "Informe aos clientes que a preservação de Bonito depende da estrita obediência aos limites de carga dos grupos.",
      },
    ],
  },
  {
    id: "noronha_pe",
    name: "Fernando de Noronha (Pernambuco)",
    keywords: ["noronha", "fernando de noronha", "baia do sancho", "ilha de noronha", "fen"],
    requirements: [
      {
        id: "noronha-tpa",
        category: "environmental_tax",
        severity: "mandatory",
        title: "TPA — Taxa de Preservação Ambiental",
        summary: "Tributo diário obrigatório recolhido pelo Governo de PE por dia de permanência na ilha.",
        detailedNotice:
          "A TPA é calculada progressivamente por dias de estada. Deve ser paga online preferencialmente antes do voo para evitar filas no desembarque no Aeroporto de Noronha.",
        approximateEstimateText: "Aprox. R$ 97,16 por dia/pessoa (tabela progressiva oficial)",
        estimateCentsPerPaxDay: 9716,
        paymentTiming: "prior_online",
        officialSource: "Administração do Distrito Estadual de Fernando de Noronha (noronha.pe.gov.br)",
        actionTip: "Oriente o cliente a pagar e emitir o comprovante da TPA online pelo site oficial pelo menos 48h antes do voo.",
        externalUrl: "https://www.noronha.pe.gov.br",
      },
      {
        id: "noronha-parnamar",
        category: "park_admission",
        severity: "mandatory",
        title: "Ingresso PARNAMAR / ICMBio",
        summary: "Cartão de acesso para as praias protegidas do Parque Nacional Marinho (Sancho, Sueste, Leão).",
        detailedNotice:
          "Válido por 10 dias consecutivos após a ativação. Obrigatório para visitar a Baía do Sancho (eleita melhor praia do mundo), Baía dos Porcos, Praia do Sueste e piscinas naturais.",
        approximateEstimateText: "R$ 186,00 (brasileiros) / R$ 373,00 (estrangeiros) por pessoa",
        estimateCentsFixedPerPax: 18600,
        paymentTiming: "prior_online",
        officialSource: "ICMBio / EcoNoronha",
        actionTip: "Agende as trilhas com antecedência (Atalaia, Capim-Açu) assim que o ingresso for emitido.",
        externalUrl: "https://www.parnanoronha.com.br",
      },
    ],
  },
  {
    id: "jericoacoara_ce",
    name: "Jericoacoara (Ceará)",
    keywords: ["jericoacoara", "jeri", "jijoca de jericoacoara", "vila de jeri", "jjd"],
    requirements: [
      {
        id: "jeri-tts",
        category: "environmental_tax",
        severity: "mandatory",
        title: "TTS — Taxa de Turismo Sustentável",
        summary: "Taxa municipal recolhida na entrada da Vila de Jericoacoara.",
        detailedNotice:
          "Cobrada pela Prefeitura de Jijoca de Jericoacoara por cada dia de permanência de cada hóspede. Isenção para menores de 12 anos e idosos acima de 60 anos.",
        approximateEstimateText: "R$ 41,50 por pessoa (para até 10 dias) + R$ 4,15 por dia excedente",
        estimateCentsFixedPerPax: 4150,
        paymentTiming: "prior_online",
        officialSource: "Prefeitura de Jijoca de Jericoacoara (jijocadejericoacoara.ce.gov.br)",
        actionTip: "Gere a taxa e efetue o pagamento online antes do transfer 4x4 sair de Fortaleza ou Cruz/JJD.",
        externalUrl: "https://speedgov.com.br/satjij/servlet/hauthvoucher",
      },
    ],
  },
  {
    id: "cancun_mexico",
    name: "Cancún & Riviera Maya (México)",
    keywords: ["cancun", "cancún", "riviera maya", "playa del carmen", "tulum", "cozumel", "cun"],
    requirements: [
      {
        id: "cancun-visitax",
        category: "environmental_tax",
        severity: "mandatory",
        title: "Visitax — Imposto de Turismo de Quintana Roo",
        summary: "Taxa governamental obrigatória para todo visitante estrangeiro no estado de Quintana Roo.",
        detailedNotice:
          "O Visitax deve ser pago online antes do embarque ou na saída do Aeroporto de Cancún (CUN). É necessário guardar o código de barras/QR Code no celular.",
        approximateEstimateText: "Aprox. USD 17 a 19 por passageiro (cerca de R$ 95 a R$ 110)",
        estimateCentsFixedPerPax: 10500,
        paymentTiming: "prior_online",
        officialSource: "SATQ - Servicio de Administración Tributaria de Quintana Roo",
        actionTip: "Gere o pagamento apenas pelo portal oficial do governo estadual (evite sites terceiros não autorizados).",
        externalUrl: "https://www.visitax.gob.mx",
      },
      {
        id: "cancun-sanitation-tax",
        category: "environmental_tax",
        severity: "mandatory",
        title: "Derecho de Saneamiento Ambiental (Hotéis)",
        summary: "Taxa municipal cobrada diretamente na recepção dos resorts por quarto/noite.",
        detailedNotice:
          "Cobrada pelos municípios de Benito Juárez (Cancún) e Solidaridad (Playa del Carmen). Não pode ser incluída na diária pré-paga por determinação fiscal mexicana.",
        approximateEstimateText: "Aprox. USD 3 a 5 (70 a 80 pesos mexicanos) por quarto/noite",
        paymentTiming: "hotel_checkin",
        officialSource: "Município de Benito Juárez / Playa del Carmen",
        actionTip: "Avise o hóspede para deixar saldo em cartão ou pesos mexicanos para o check-in.",
      },
      {
        id: "cancun-passport-validity",
        category: "visa_and_passport",
        severity: "mandatory",
        title: "Passaporte com Validade Mínima",
        summary: "Passaporte brasileiro válido para todo o período da estadia no México.",
        detailedNotice:
          "Brasileiros necessitam de visto consular mexicano OU visto americano físico válido no passaporte para entrada a turismo.",
        approximateEstimateText: "Visto mexicano ou Visto Americano válido obrigatório",
        paymentTiming: "prior_online",
        officialSource: "Instituto Nacional de Migración (INM - México)",
        actionTip: "Verifique se o cliente possui Visto Americano no passaporte (isenta visto mexicano).",
      },
    ],
  },
  {
    id: "punta_cana",
    name: "Punta Cana (República Dominicana)",
    keywords: ["punta cana", "república dominicana", "republica dominicana", "puj", "bavaro"],
    requirements: [
      {
        id: "punta-cana-eticket",
        category: "voucher_mandatory",
        severity: "mandatory",
        title: "E-Ticket Eletrônico de Imigração e Alfândega",
        summary: "Formulário digital unificado com QR Code obrigatório para entrada e saída.",
        detailedNotice:
          "O e-Ticket substitui os formulários de papel. Deve ser preenchido nas 72h antes do voo de ida e novamente antes do voo de volta.",
        approximateEstimateText: "Gratuito (formulário oficial da Direção Geral de Migração)",
        paymentTiming: "prior_online",
        officialSource: "Dirección General de Migración (República Dominicana)",
        actionTip: "O e-Ticket é 100% gratuito no portal oficial. Nunca pague em sites fraudulentos.",
        externalUrl: "https://eticket.migracion.gob.do",
      },
      {
        id: "punta-cana-passport",
        category: "visa_and_passport",
        severity: "mandatory",
        title: "Passaporte com Validade Mínima de 6 Meses",
        summary: "Exigência de validade mínima na data de entrada no país.",
        detailedNotice: "Brasileiros a turismo não necessitam de visto prévio para até 30 dias.",
        approximateEstimateText: "Validade mínima de 6 meses exigida pelas companhias aéreas",
        paymentTiming: "airline_checkin",
        officialSource: "Consulado Geral da República Dominicana",
        actionTip: "Confira a validade de todos os passaportes dos viajantes.",
      },
    ],
  },
  {
    id: "usa_destinations",
    name: "Estados Unidos (Orlando, Miami, Nova York, Las Vegas)",
    keywords: ["orlando", "miami", "nova york", "new york", "las vegas", "los angeles", "disney", "universal", "eua", "estados unidos", "usa", "mco", "mia", "jfk"],
    requirements: [
      {
        id: "usa-b1b2-visa",
        category: "visa_and_passport",
        severity: "mandatory",
        title: "Visto Americano (B1/B2) ou Autorização ESTA",
        summary: "Visto consular válido ou autorização eletrônica ESTA para portadores de passaporte europeu.",
        detailedNotice:
          "O visto deve ser emitido com antecedência junto à embaixada/consulados americanos no Brasil. Passageiros com passaporte europeu/elegível devem emitir o ESTA com pelo menos 72h de antecedência.",
        approximateEstimateText: "Taxa MRV USD 185 (B1/B2) ou USD 21 (ESTA)",
        paymentTiming: "prior_online",
        officialSource: "U.S. Department of State / U.S. CBP",
        actionTip: "Verifique se a data de expiração do visto cobre todo o período da viagem.",
      },
      {
        id: "usa-resort-fee",
        category: "resort_fee",
        severity: "warning",
        title: "Resort Fee / Facility Fee (Hotéis)",
        summary: "Taxa de lazer e comodidades cobrada diretamente no cartão de crédito no check-in.",
        detailedNotice:
          "A grande maioria dos hotéis em Orlando, Miami e Las Vegas cobra taxas de conveniência/resort de USD 20 a USD 50 por noite, além de caução reembolsável.",
        approximateEstimateText: "USD 20 a 50 por noite/quarto + depósito caução",
        paymentTiming: "hotel_checkin",
        officialSource: "Regulamento Hoteleiro dos EUA",
        actionTip: "Destaque no orçamento que a taxa de resort é paga localmente no check-in com cartão de crédito internacional desbloqueado.",
      },
    ],
  },
  {
    id: "europe_schengen",
    name: "Europa (Espaço Schengen)",
    keywords: ["paris", "roma", "madrid", "lisboa", "italia", "itália", "frança", "franca", "espanha", "portugal", "alemanha", "amsterdam", "suíça", "europa", "londres"],
    requirements: [
      {
        id: "europe-travel-insurance",
        category: "health_and_insurance",
        severity: "mandatory",
        title: "Seguro Viagem Obrigatório (€ 30.000)",
        summary: "Tratado de Schengen exige apólice médica com cobertura mínima de 30 mil euros.",
        detailedNotice:
          "A imigração europeia exige comprovante de seguro viagem internacional com cobertura mínima de € 30.000 para acidentes, emergências e repatriação médica.",
        approximateEstimateText: "Incluso no pacote ou contratado via apólice internacional",
        paymentTiming: "agency_voucher",
        officialSource: "Comissão Europeia / Tratado de Schengen",
        actionTip: "Inclua a apólice de seguro viagem com assistência médica completa na cotação.",
      },
      {
        id: "europe-passport-validity",
        category: "visa_and_passport",
        severity: "mandatory",
        title: "Passaporte Válido por 3 Meses pós-Retorno",
        summary: "Validade mínima de 90 dias após a data planejada de saída da Europa.",
        detailedNotice: "Passaporte deve ter sido emitido nos últimos 10 anos e conter pelo menos 2 páginas em branco.",
        approximateEstimateText: "Validade de 3 meses pós-volta",
        paymentTiming: "airline_checkin",
        officialSource: "União Europeia - Frontex",
        actionTip: "Exija foto nítida do passaporte do passageiro para validar a validade antes da emissão dos bilhetes.",
      },
      {
        id: "europe-city-tax",
        category: "environmental_tax",
        severity: "advisory",
        title: "City Tax / Tassa di Soggiorno (Taxa Turística Urbana)",
        summary: "Cobrada por pessoa por noite em cidades como Paris, Roma, Florença, Lisboa e Barcelona.",
        detailedNotice:
          "Varia de € 2 a € 10 por hóspede/noite dependendo da categoria da hospedagem (estrelas). Recolhida no check-out.",
        approximateEstimateText: "€ 3 a € 8 por pessoa/noite",
        paymentTiming: "hotel_checkin",
        officialSource: "Prefeituras Municipais Europeias",
        actionTip: "Avise o cliente sobre a City Tax municipal europeia para evitar surpresas no check-in.",
      },
    ],
  },
  {
    id: "gramado_canela",
    name: "Gramado & Canela (Rio Grande do Sul)",
    keywords: ["gramado", "canela", "serra gaucha", "serra gaúcha", "caxias do sul", "bento gonçalves"],
    requirements: [
      {
        id: "gramado-taxa-turismo",
        category: "environmental_tax",
        severity: "advisory",
        title: "Taxa de Turismo Sustentável (TTS Gramado)",
        summary: "Taxa de conservação urbana recolhida nas diárias hoteleiras.",
        detailedNotice:
          "Cobrada pela rede hoteleira de Gramado e Canela por quarto/noite, revertida para infraestrutura e eventos turísticos.",
        approximateEstimateText: "R$ 3,00 a R$ 5,00 por diária de hospedagem",
        paymentTiming: "hotel_checkin",
        officialSource: "Prefeitura Municipal de Gramado",
        actionTip: "Geralmente é adicionada na conta final do hotel.",
      },
    ],
  },
  {
    id: "jalapao_to",
    name: "Jalapão (Tocantins)",
    keywords: ["jalapao", "jalapão", "mateiros", "ponte alta", "fervedouros", "palmas to"],
    requirements: [
      {
        id: "jalapao-guia-credenciado",
        category: "voucher_mandatory",
        severity: "mandatory",
        title: "Expedição com Veículo 4x4 e Guia Credenciado",
        summary: "Acesso aos atrativos e dunas exige condutor credenciado e capacidade off-road.",
        detailedNotice:
          "As estradas de areia fofa e fervedouros possuem controle rígido de visitação do Naturatins. É vedada a entrada de veículos comuns.",
        approximateEstimateText: "Incluso nas expedições autorizadas",
        paymentTiming: "agency_voucher",
        officialSource: "Naturatins / Governo do Tocantins",
        actionTip: "Garanta que a expedição comercializada inclua guia local cadastrado no CADASTUR e Naturatins.",
      },
    ],
  },
  {
    id: "chile_argentina",
    name: "Chile & Argentina (Mercosul)",
    keywords: ["santiago", "chile", "atacama", "buenos aires", "bariloche", "mendoza", "argentina", "patagonia", "patagônia", "ushuaia", "scl", "eze", "aep"],
    requirements: [
      {
        id: "mercosul-rg-recent",
        category: "visa_and_passport",
        severity: "mandatory",
        title: "RG com menos de 10 anos de emissão ou Passaporte",
        summary: "CNH NÃO é aceita para imigração aérea internacional no Mercosul.",
        detailedNotice:
          "A Polícia Federal e os agentes de imigração do Chile/Argentina exigem Passaporte válido OU Cédula de Identidade civil (RG) em perfeito estado de conservação emitida há menos de 10 anos.",
        approximateEstimateText: "Apresentação obrigatória no check-in",
        paymentTiming: "airline_checkin",
        officialSource: "Acordo sobre Documentos de Viagem dos Estados Partes do Mercosul",
        actionTip: "ALERTA CRÍTICO: CNH não vale para entrar no Chile ou Argentina. Exija conferência do RG ou Passaporte do cliente.",
      },
    ],
  },
];

/**
 * Detecta regras regulatórias, taxas e exigências aplicáveis para uma string de destino ou lista de tags.
 */
export function detectDestinationRegulatoryRequirements(
  destinationOrTags: string | string[] | Array<{ label?: string; [key: string]: unknown }> | null | undefined,
  stayDays: number = 7,
  paxCount: number = 2
): DestinationRegulatoryReport {
  if (!destinationOrTags) {
    return {
      matchedDestination: null,
      hasMandatoryFees: false,
      hasPassportOrVisaAlerts: false,
      requirements: [],
      totalEstimatedFeesCents: 0,
      disclaimerText: "",
    };
  }

  // Normaliza texto para busca
  let textToScan = "";
  if (typeof destinationOrTags === "string") {
    textToScan = destinationOrTags;
  } else if (Array.isArray(destinationOrTags)) {
    textToScan = destinationOrTags
      .map((item) => (typeof item === "string" ? item : String(item?.label || "")))
      .join(" ");
  }

  const normalized = textToScan
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const matchedRules: DestinationRuleConfig[] = [];

  for (const rule of CANONICAL_DESTINATION_RULES) {
    const isHit = rule.keywords.some((kw) => {
      const normKw = kw
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      return normalized.includes(normKw);
    });

    if (isHit) {
      matchedRules.push(rule);
    }
  }

  if (matchedRules.length === 0) {
    return {
      matchedDestination: null,
      hasMandatoryFees: false,
      hasPassportOrVisaAlerts: false,
      requirements: [],
      totalEstimatedFeesCents: 0,
      disclaimerText: "",
    };
  }

  const primaryRule = matchedRules[0];
  const allRequirements = matchedRules.flatMap((r) => r.requirements);

  const hasMandatoryFees = allRequirements.some(
    (req) => req.severity === "mandatory" && req.category !== "visa_and_passport"
  );
  const hasPassportOrVisaAlerts = allRequirements.some(
    (req) => req.category === "visa_and_passport"
  );

  let totalEstimatedFeesCents = 0;
  for (const req of allRequirements) {
    if (req.estimateCentsPerPaxDay) {
      totalEstimatedFeesCents += req.estimateCentsPerPaxDay * paxCount * Math.max(1, stayDays);
    }
    if (req.estimateCentsFixedPerPax) {
      totalEstimatedFeesCents += req.estimateCentsFixedPerPax * paxCount;
    }
  }

  const disclaimerText = formatDestinationTaxesDisclaimer(allRequirements);

  return {
    matchedDestination: primaryRule.name,
    hasMandatoryFees,
    hasPassportOrVisaAlerts,
    requirements: allRequirements,
    totalEstimatedFeesCents,
    disclaimerText,
  };
}

/**
 * Formata um parágrafo claro para proposta, e-mail ou WhatsApp com todas as exigências do destino.
 */
export function formatDestinationTaxesDisclaimer(requirements: DestinationRegulatoryRequirement[]): string {
  if (requirements.length === 0) return "";

  const lines = [
    "[INFORMAÇÕES REGULATÓRIAS E TAXAS DO DESTINO]:",
    ...requirements.map((r) => {
      const prefix = r.severity === "mandatory" ? "[OBRIGATÓRIO]" : "[INFORMATIVO]";
      return `${prefix} ${r.title}: ${r.summary} (${r.approximateEstimateText}).`;
    }),
    "Recomendamos que toda a documentação e comprovantes de pagamento sejam conferidos com antecedência pela nossa equipe.",
  ];

  return lines.join("\n");
}
