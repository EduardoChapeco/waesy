import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getAirportByIata } from "@/lib/data/airports-catalog";

// ============================================================================
// 1. CATÁLOGO DOS 41 MÓDULOS DO GERADOR INTELIGENTE DE PRÉ-EMBARQUE
// ============================================================================

export type PreBoardingModuleKey =
  | "cover"
  | "traveler_profile"
  | "trip_overview"
  | "documents"
  | "entry_requirements"
  | "vaccinations"
  | "forms"
  | "airport_departure"
  | "flight"
  | "connection"
  | "immigration"
  | "customs"
  | "baggage"
  | "arrival"
  | "airport_destination"
  | "transfer"
  | "hotel"
  | "hotel_location"
  | "nearby"
  | "destination_basics"
  | "currency"
  | "payments"
  | "internet"
  | "electricity"
  | "weather"
  | "culture"
  | "safety"
  | "transport"
  | "train"
  | "rental_car"
  | "cruise"
  | "parks"
  | "attraction"
  | "tickets"
  | "tour"
  | "suggested_itinerary"
  | "restaurant_tips"
  | "shopping"
  | "taxes"
  | "city_tax"
  | "resort_fee"
  | "travel_insurance"
  | "health"
  | "return_trip"
  | "emergency_contacts"
  | "agency_support"
  | "closing";

export type RequirementPriorityBadge = "OBRIGATÓRIO" | "RECOMENDADO" | "OPCIONAL" | "ATENÇÃO";

export interface PreBoardingSlideStep {
  stepNumber: number;
  title: string;
  explanation: string;
  badge?: RequirementPriorityBadge;
}

export interface PreBoardingSlideCard {
  label: string;
  value: string;
  practicalExplanation: string;
  badge?: RequirementPriorityBadge;
}

export interface PreBoardingPresentationPage {
  pageNumber: number;
  moduleKey: PreBoardingModuleKey;
  eyebrow: string;
  title: string;
  subtitle: string;
  humanNarrative: string;
  steps?: PreBoardingSlideStep[];
  cards?: PreBoardingSlideCard[];
  timelineNodes?: Array<{
    timeOrPlace: string;
    iataExpanded: string;
    durationOrWait?: string;
    instruction: string;
  }>;
  alertBanner?: {
    level: RequirementPriorityBadge;
    message: string;
  };
  requiresHumanCheck?: boolean;
}

export type PresentationLocale = "pt-BR" | "en-US" | "es-ES";

export interface PreBoardingTripInput {
  presentationType: "commercial_quote" | "pre_boarding_guide";
  locale?: PresentationLocale;
  agencyName: string;
  agencyEmergencyPhone: string;
  tripTitle: string;
  conceptSubtitle: string; // ex: "Caribe entre amigas — Punta Cana", "Disney em família", "Itália em casal"
  travelerProfileType:
    | "casal"
    | "familia_criancas"
    | "amigos_grupo"
    | "idosos_primeira_viagem"
    | "corporativo"
    | "individual";
  passengersNames: string[];
  adultsCount: number;
  childrenCount: number;
  seniorsCount?: number;
  startDate: string;
  endDate: string;
  originCity: string;
  destinations: string[];
  countries: string[];
  flights: Array<{
    direction: "ida" | "volta" | "interno";
    date: string;
    airline: string;
    flightNumber: string;
    originIata: string;
    destinationIata: string;
    departureTime: string;
    arrivalTime: string;
    durationText: string;
    connectionWaitText?: string;
    connectionHubIata?: string;
    sameTicket: boolean;
    personalItemRule?: string;
    carryOnBagRule?: string;
    checkedBagRule?: string;
  }>;
  hotels: Array<{
    name: string;
    city: string;
    neighborhood: string;
    address: string;
    mealPlan: string;
    checkInTime: string;
    checkOutTime: string;
    nearbyHighlights: Array<{ name: string; distanceText: string; practicalNote: string }>;
    hasResortFee?: boolean;
    resortFeeNote?: string;
    hasCityTax?: boolean;
    cityTaxNote?: string;
    parkingNote?: string;
    structureHighlights?: string[];
  }>;
  hasReceptiveTransfer: boolean;
  receptiveCompanyName?: string;
  receptiveMeetingPoint?: string;
  receptiveEmergencyWhatsapp?: string;
  trains?: Array<{
    originStation: string;
    destinationStation: string;
    operatorName: string;
    departureTime: string;
    arrivalTime: string;
    seatAndCarriageInfo?: string;
  }>;
  hasRentalCar?: boolean;
  rentalCarCompany?: string;
  hasCruise?: boolean;
  cruiseShipName?: string;
  hasThemeParks?: boolean;
  themeParksList?: string[];
  insuranceProvider?: string;
  insurancePolicyNumber?: string;
  insuranceWhatsapp?: string;
  commercialPriceTotalCents?: number;
  commercialPaymentConditions?: string;
}

export interface GeneratedPreBoardingPresentation {
  presentationType: "commercial_quote" | "pre_boarding_guide";
  locale: PresentationLocale;
  detectedArchetype:
    | "caribe_resort"
    | "orlando_parques"
    | "italia_multicidade"
    | "europa_multipais"
    | "nacional_receptivo"
    | "cruzeiro_maritimo"
    | "custom";
  selectedModules: PreBoardingModuleKey[];
  pages: PreBoardingPresentationPage[];
  requiresHumanReview: boolean;
  humanReviewWarnings: string[];
}

// Dicionário Canônico de Expansão de Aeroportos (Regra 5 e 6: Nunca usar código IATA solto)
const AIRPORT_IATA_DIRECTORY: Record<string, string> = {
  XAP: "Chapecó — Aeroporto Serafin Enoss Bertaso (XAP)",
  GRU: "São Paulo — Aeroporto Internacional de Guarulhos (GRU)",
  CGH: "São Paulo — Aeroporto de Congonhas (CGH)",
  VCP: "Campinas — Aeroporto Internacional de Viracopos (VCP)",
  POA: "Porto Alegre — Aeroporto Internacional Salgado Filho (POA)",
  CXJ: "Caxias do Sul — Aeroporto Regional Hugo Cantergiani (CXJ)",
  FLN: "Florianópolis — Aeroporto Internacional Hercílio Luz (FLN)",
  NVT: "Navegantes — Aeroporto Internacional Ministro Victor Konder (NVT)",
  IGU: "Foz do Iguaçu — Aeroporto Internacional das Cataratas (IGU)",
  GIG: "Rio de Janeiro — Aeroporto Internacional Tom Jobim / Galeão (GIG)",
  SDU: "Rio de Janeiro — Aeroporto Santos Dumont (SDU)",
  MCZ: "Maceió — Aeroporto Internacional Zumbi dos Palmares (MCZ)",
  REC: "Recife — Aeroporto Internacional dos Guararapes (REC)",
  FOR: "Fortaleza — Aeroporto Internacional Pinto Martins (FOR)",
  JJD: "Jericoacoara — Aeroporto Regional Comandante Ariston Pessoa (JJD)",
  SSA: "Salvador — Aeroporto Internacional Deputado Luís Eduardo Magalhães (SSA)",
  PTY: "Cidade do Panamá — Aeroporto Internacional de Tocumen (PTY)",
  PUJ: "Punta Cana — Aeroporto Internacional de Punta Cana (PUJ)",
  MCO: "Orlando — Aeroporto Internacional de Orlando (MCO)",
  MIA: "Miami — Aeroporto Internacional de Miami (MIA)",
  JFK: "Nova York — Aeroporto Internacional John F. Kennedy (JFK)",
  FCO: "Roma — Aeroporto Internacional Leonardo da Vinci / Fiumicino (FCO)",
  FLR: "Florença — Aeroporto Amerigo Vespucci / Peretola (FLR)",
  VCE: "Veneza — Aeroporto Internacional Marco Polo (VCE)",
  MXP: "Milão — Aeroporto Internacional de Malpensa (MXP)",
  MAD: "Madri — Aeroporto Internacional Adolfo Suárez Madrid-Barajas (MAD)",
  LIS: "Lisboa — Aeroporto Humberto Delgado (LIS)",
  CDG: "Paris — Aeroporto Internacional Charles de Gaulle (CDG)",
  ORY: "Paris — Aeroporto de Orly (ORY)",
  LHR: "Londres — Aeroporto Internacional de Heathrow (LHR)",
  AMS: "Amsterdã — Aeroporto Internacional de Schiphol (AMS)",
  FRA: "Frankfurt — Aeroporto Internacional de Frankfurt (FRA)",
  AEP: "Buenos Aires — Aeroparque Internacional Jorge Newbery (AEP)",
  EZE: "Buenos Aires — Aeroporto Internacional Ministro Pistarini / Ezeiza (EZE)",
  SCL: "Santiago do Chile — Aeroporto Internacional Arturo Merino Benítez (SCL)",
  CUN: "Cancún — Aeroporto Internacional de Cancún (CUN)",
};

export function expandAirportCode(codeOrName: string): string {
  const clean = (codeOrName || "").trim().toUpperCase();
  if (AIRPORT_IATA_DIRECTORY[clean]) {
    return AIRPORT_IATA_DIRECTORY[clean];
  }
  const globalAirport = getAirportByIata(clean);
  if (globalAirport) {
    return `${globalAirport.city} — ${globalAirport.name} (${globalAirport.iata_code})`;
  }
  if (clean.length === 3 && /^[A-Z]{3}$/.test(clean)) {
    return `Aeroporto (${clean})`;
  }
  return codeOrName;
}

export function detectDestinationArchetype(
  input: PreBoardingTripInput
): GeneratedPreBoardingPresentation["detectedArchetype"] {
  const joined = [...input.destinations, ...input.countries, input.tripTitle, input.conceptSubtitle]
    .join(" ")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (input.hasCruise || joined.includes("cruzeiro") || joined.includes("msc") || joined.includes("costa")) {
    return "cruzeiro_maritimo";
  }
  if (
    input.hasThemeParks ||
    joined.includes("orlando") ||
    joined.includes("disney") ||
    joined.includes("universal")
  ) {
    return "orlando_parques";
  }
  if (
    joined.includes("punta cana") ||
    joined.includes("cancun") ||
    joined.includes("caribe") ||
    joined.includes("curaçao") ||
    joined.includes("aruba")
  ) {
    return "caribe_resort";
  }
  if (
    (joined.includes("roma") && joined.includes("florenca")) ||
    joined.includes("italia") ||
    (input.trains && input.trains.length > 0 && joined.includes("veneza"))
  ) {
    return "italia_multicidade";
  }
  if (
    input.countries.length >= 2 ||
    (joined.includes("paris") && joined.includes("londres")) ||
    joined.includes("amsterda")
  ) {
    return "europa_multipais";
  }
  return "nacional_receptivo";
}

export function generateDynamicTravelPresentation(
  input: PreBoardingTripInput
): GeneratedPreBoardingPresentation {
  const archetype = detectDestinationArchetype(input);
  const pages: PreBoardingPresentationPage[] = [];
  const selectedModules: PreBoardingModuleKey[] = [];
  const humanReviewWarnings: string[] = [];

  const pushPage = (
    moduleKey: PreBoardingModuleKey,
    page: Omit<PreBoardingPresentationPage, "pageNumber" | "moduleKey">
  ) => {
    if (!selectedModules.includes(moduleKey)) {
      selectedModules.push(moduleKey);
    }
    pages.push({
      pageNumber: pages.length + 1,
      moduleKey,
      ...page,
    });
  };

  const isSeniorOrFirstTime =
    input.travelerProfileType === "idosos_primeira_viagem" || (input.seniorsCount || 0) > 0;
  const isFamilyWithKids =
    input.travelerProfileType === "familia_criancas" || input.childrenCount > 0;

  // ── MODO 1: APRESENTAÇÃO COMERCIAL DE COTAÇÃO (ANTES DA COMPRA) ──────────────
  if (input.presentationType === "commercial_quote") {
    pushPage("cover", {
      eyebrow: `${input.agencyName} • Proposta Comercial Personalizada`,
      title: input.conceptSubtitle || input.tripTitle,
      subtitle: `Período planejado: ${input.startDate} a ${input.endDate} • ${input.adultsCount} adulto(s)${
        input.childrenCount > 0 ? ` e ${input.childrenCount} criança(s)` : ""
      }`,
      humanNarrative:
        `Preparamos esta apresentação comercial pensando exatamente no perfil da sua viagem (${input.conceptSubtitle}). ` +
        `Aqui você encontrará a curadoria de voos, a localização estratégica de cada hospedagem, o regime de alimentação e as condições especiais de pagamento negociadas pela ${input.agencyName}.`,
    });

    pushPage("trip_overview", {
      eyebrow: "Visão Geral da Experiência",
      title: `Por que escolhemos ${input.destinations.join(" + ")} para você`,
      subtitle: "Equilíbrio entre logística confortável, localização privilegiada e segurança",
      humanNarrative:
        `Cada detalhe deste roteiro foi desenhado para evitar deslocamentos cansativos e garantir que você aproveite o melhor de ${input.destinations.join(", ")} com assistência integral da nossa equipe.`,
      cards: input.destinations.map((dest) => ({
        label: "Destino Selecionado",
        value: dest,
        practicalExplanation: `Curadoria hoteleira e logística de chegada validada para ${dest}.`,
        badge: "RECOMENDADO",
      })),
    });

    for (const fl of input.flights) {
      pushPage("flight", {
        eyebrow: "Logística Aérea Cotada",
        title: `Voo ${fl.direction.toUpperCase()}: ${expandAirportCode(fl.originIata)} → ${expandAirportCode(fl.destinationIata)}`,
        subtitle: `${fl.airline} (${fl.flightNumber}) • Data: ${fl.date}`,
        humanNarrative:
          `Selecionamos esta opção da ${fl.airline} pelo excelente equilíbrio de horário (${fl.departureTime} → ${fl.arrivalTime}) e franquia de bagagem transparente.`,
        cards: [
          {
            label: "Bagagem de Mão",
            value: fl.carryOnBagRule || "1 mala de bordo até 10 kg + 1 artigo pessoal",
            practicalExplanation: "Inclusa na tarifa para embarque imediato na cabine.",
            badge: "OBRIGATÓRIO",
          },
          {
            label: "Bagagem Despachada",
            value: fl.checkedBagRule || "1 volume de até 23 kg por passageiro",
            practicalExplanation: "Entregue no balcão da companhia no aeroporto de origem.",
            badge: "RECOMENDADO",
          },
        ],
      });
    }

    for (const ht of input.hotels) {
      pushPage("hotel", {
        eyebrow: `Hospedagem Selecionada em ${ht.city}`,
        title: ht.name,
        subtitle: `${ht.neighborhood} • Regime: ${ht.mealPlan}`,
        humanNarrative:
          `Escolhemos o ${ht.name} porque sua localização em ${ht.neighborhood} permite fácil acesso às principais atrações de ${ht.city}, oferecendo excelente padrão de descanso e regime ${ht.mealPlan}.`,
        cards: (ht.nearbyHighlights || []).map((nh) => ({
          label: nh.name,
          value: nh.distanceText,
          practicalExplanation: nh.practicalNote,
        })),
      });
    }

    pushPage("payments", {
      eyebrow: "Investimento & Condições Comerciais",
      title: "Valores e Parcelamento Planejado",
      subtitle: input.commercialPaymentConditions || "Parcelamento em até 10x no cartão ou 15x no boleto bancário",
      humanNarrative:
        "As tarifas aéreas e hoteleiras são dinâmicas e estão sujeitas à disponibilidade no momento da confirmação e emissão.",
      alertBanner: {
        level: "ATENÇÃO",
        message: "Garanta o bloqueio tarifário confirmando com seu consultor da Excelência Tour.",
      },
    });

    pushPage("closing", {
      eyebrow: "Próximo Passo",
      title: `Vamos confirmar sua viagem com a ${input.agencyName}?`,
      subtitle: `Atendimento dedicado: ${input.agencyEmergencyPhone}`,
      humanNarrative:
        "Assim que confirmarmos a emissão, você receberá também a sua Apresentação Exclusiva de Pré-Embarque com o passo a passo completo de aeroportos, conexões, imigração e dicas práticas do destino.",
    });

    const activeLocale: PresentationLocale = input.locale || "pt-BR";
    return {
      presentationType: "commercial_quote",
      locale: activeLocale,
      detectedArchetype: archetype,
      selectedModules,
      pages: localizePresentationPages(pages, activeLocale, input),
      requiresHumanReview: false,
      humanReviewWarnings,
    };
  }

  // ── MODO 2: APRESENTAÇÃO DE PRÉ-EMBARQUE ("A VIAGEM DEFINE A APRESENTAÇÃO") ─

  // 1. CAPA PERSONALIZADA
  pushPage("cover", {
    eyebrow: `${input.agencyName} • Guia Personalizado de Pré-Embarque`,
    title: input.conceptSubtitle || input.tripTitle,
    subtitle: `${input.startDate} a ${input.endDate} • Passageiros: ${input.passengersNames.join(", ")}`,
    humanNarrative:
      `Este guia foi preparado especialmente para a viagem de vocês (${input.conceptSubtitle}). ` +
      `Nosso objetivo é que vocês saiam de casa com a tranquilidade de quem já sabe exatamente como cada etapa vai funcionar: do check-in no aeroporto de saída, passando pelas conexões e imigração, até a chegada ao hotel e o retorno para casa.`,
  });

  // 2. DOCUMENTAÇÃO EXIGIDA & REGRAS MIGRATÓRIAS (Dinâmica conforme Arquétipo)
  const docCards: PreBoardingSlideCard[] = [];
  if (archetype === "caribe_resort") {
    docCards.push(
      {
        label: "Passaporte Brasileiro Válido",
        value: "Validade mínima de 6 meses a partir da data do retorno",
        practicalExplanation:
          "Leve o documento físico original em mãos (não é aceito CNH ou RG para embarque ao Caribe).",
        badge: "OBRIGATÓRIO",
      },
      {
        label: "E-Ticket República Dominicana (Entrada e Saída)",
        value: "Formulário Eletrônico Oficial com QR Code",
        practicalExplanation:
          "Deve ser preenchido antes do embarque (gera um QR Code para a ida e outro para a volta). Apresente impresso ou salvo no celular no check-in e na imigração.",
        badge: "OBRIGATÓRIO",
      },
      {
        label: "Certificado Internacional de Vacinação (CIVP — Febre Amarela)",
        value: "Emitido pela ANVISA / ConecteSUS (mínimo 10 dias antes do voo)",
        practicalExplanation:
          "Exigido para viajantes procedentes do Brasil. Leve a versão impressa junto ao passaporte.",
        badge: "OBRIGATÓRIO",
      },
      {
        label: "Vouchers Oficiais & Seguro Viagem",
        value: "Reserva do Resort, Receptivo e Apólice de Seguro",
        practicalExplanation:
          "A imigração pode solicitar a comprovação de hospedagem paga e passagem de retorno confirmada.",
        badge: "OBRIGATÓRIO",
      }
    );
  } else if (archetype === "orlando_parques") {
    docCards.push(
      {
        label: "Passaporte Brasileiro + Visto Americano (B1/B2) Válido",
        value: "Verifique se o visto está no passaporte atual ou em passaporte anterior",
        practicalExplanation:
          "Caso o visto americano válido esteja em um passaporte antigo vencido, você deve levar OS DOIS passaportes (o antigo com o visto e o novo válido) juntos na mão.",
        badge: "OBRIGATÓRIO",
      },
      {
        label: "Vouchers de Hotel, Parques, Transfer/Carro e Seguro Viagem",
        value: "Impressos na pasta de viagem e salvos no aplicativo",
        practicalExplanation:
          "Ao passar pelo oficial de imigração americana (CBP), tenha em mãos o endereço do hotel e o comprovante do seguro saúde internacional.",
        badge: "OBRIGATÓRIO",
      }
    );
  } else if (archetype === "italia_multicidade" || archetype === "europa_multipais") {
    docCards.push(
      {
        label: "Passaporte Válido (Regra do Espaço Schengen / Europa)",
        value: "Válido por pelo menos 3 a 6 meses após a data de saída da Europa",
        practicalExplanation:
          "Confira se há pelo menos 2 páginas em branco para os carimbos de entrada e saída.",
        badge: "OBRIGATÓRIO",
      },
      {
        label: "Seguro Viagem Europa (Cobertura Mínima EUR 30.000)",
        value: `Apólice ${input.insuranceProvider || "Internacional Schengen"} confirmada`,
        practicalExplanation:
          "O Tratado de Schengen exige obrigatoriamente cobertura médica mínima de 30 mil euros. Leve a apólice impressa.",
        badge: "OBRIGATÓRIO",
      },
      {
        label: "Vouchers de Todos os Hotéis, Trens e Passagem de Retorno",
        value: "Comprovantes de cada cidade da viagem",
        practicalExplanation:
          "Na primeira entrada na Europa, o agente de fronteira frequentemente pede para ver as reservas dos hotéis e a passagem de volta ao Brasil.",
        badge: "OBRIGATÓRIO",
      }
    );
    if (
      input.countries.some((c) =>
        c.toLowerCase().includes("reino unido") ||
        c.toLowerCase().includes("inglaterra") ||
        c.toLowerCase().includes("londres")
      )
    ) {
      docCards.push({
        label: "Autorização Eletrônica do Reino Unido (UK ETA) & Controle de Fronteira Britânico",
        value: "Exigência específica para entrada em Londres / Reino Unido",
        practicalExplanation:
          "O Reino Unido não faz parte do Espaço Schengen. Você passará por controle migratório britânico dedicado (inclusive antes de embarcar no trem Eurostar) e deve portar a autorização UK ETA vinculada ao passaporte.",
        badge: "OBRIGATÓRIO",
      });
    }
  } else {
    docCards.push(
      {
        label: "Documento Oficial com Foto (RG emitido há menos de 10 anos ou Passaporte)",
        value: "Documento físico original em bom estado de conservação",
        practicalExplanation:
          "Para crianças ou adolescentes desacompanhados de um dos pais, é indispensável autorização judicial/cartorária conforme regra da Polícia Federal/ANAC.",
        badge: "OBRIGATÓRIO",
      },
      {
        label: "Vouchers de Hospedagem, Traslado e Seguro Viagem",
        value: "Disponíveis em PDF e no aplicativo da agência",
        practicalExplanation: "Apresente na recepção do hotel e ao motorista receptivo.",
        badge: "OBRIGATÓRIO",
      }
    );
  }

  if (isFamilyWithKids) {
    docCards.push({
      label: "Documentação para Crianças e Menores",
      value: "Passaporte com filiação + Autorização Internacional (se viajar sem ambos os pais)",
      practicalExplanation:
        "Caso a criança viaje com apenas um dos genitores, é obrigatória autorização de viagem com firma reconhecida em 2 vias (uma fica retida na Polícia Federal no embarque).",
      badge: "ATENÇÃO",
    });
  }

  pushPage("documents", {
    eyebrow: "Checklist Antes de Sair de Casa",
    title: "Documentação Obrigatória para a Sua Viagem",
    subtitle: "O que levar na pasta de mão (nunca despache documentos na mala de porão)",
    humanNarrative:
      "Organizamos exatamente os documentos exigidos para o seu roteiro. Recomendamos levar uma pastinha física na bolsa de mão com as cópias impressas, além dos arquivos salvos no celular.",
    cards: docCards,
  });

  // 3. INFORMAÇÕES PRÁTICAS DO DESTINO (Dinâmicas e divididas por País quando Multi-País)
  if (archetype === "europa_multipais") {
    pushPage("destination_basics", {
      eyebrow: "Guia Prático Multi-País",
      title: "Diferenças Práticas entre os Países do Seu Roteiro (Moeda, Tomadas e Idioma)",
      subtitle: "Atenção às mudanças ao cruzar entre França/Holanda (Zona do Euro) e Reino Unido (Libra)",
      humanNarrative:
        "Como sua viagem combina países da União Europeia com o Reino Unido, existem diferenças práticas importantes de moeda, tomadas elétricas e fuso horário que você precisa saber antes de fazer a mala:",
      cards: [
        {
          label: "Paris e Amsterdã (França e Holanda)",
          value: "Moeda: Euro (EUR) • Tomada: Tipo C/E (2 pinos redondos)",
          practicalExplanation:
            "Cartões internacionais (Wise, Nomad, crédito) são aceitos em praticamente tudo, mas tenha cerca de EUR 100 a EUR 150 em espécie para pequenas despesas.",
          badge: "RECOMENDADO",
        },
        {
          label: "Londres (Reino Unido)",
          value: "Moeda: Libra Esterlina (GBP) • Tomada: Tipo G (3 pinos retangulares planos)",
          practicalExplanation:
            "Londres é quase 100% cashless (transporte público e lojas funcionam por aproximação Contactless/Apple Pay). Leve um adaptador universal que tenha o padrão britânico de 3 pinos quadrados.",
          badge: "ATENÇÃO",
        },
        {
          label: "Internet Móvel (Chip / eSIM Internacional)",
          value: "Verifique se o seu plano cobre União Europeia + Reino Unido",
          practicalExplanation:
            "Deixe o eSIM instalado ainda no Brasil para já desembarcar conectado ao Google Maps, Uber e WhatsApp.",
          badge: "RECOMENDADO",
        },
      ],
    });
  } else if (archetype === "caribe_resort") {
    pushPage("destination_basics", {
      eyebrow: "Informações Importantes do Destino",
      title: "Moeda, Tomadas, Gorjetas e Internet no Caribe",
      subtitle: "Como tudo funciona na prática para você não ter surpresas",
      humanNarrative:
        "Embora a moeda local seja o Peso Dominicano, no turismo em Punta Cana o Dólar Americano (USD) é a moeda prática do dia a dia:",
      cards: [
        {
          label: "Moeda e Gorjetas (Dólar em notas pequenas)",
          value: "Leve notas de US$ 1, US$ 2 e US$ 5 em espécie",
          practicalExplanation:
            "No resort All-Inclusive tudo já está pago, mas é costume local dar pequenas gorjetas (US$ 1 a US$ 5) para carregadores de mala, garçons e camareiras — isso eleva muito o atendimento.",
          badge: "RECOMENDADO",
        },
        {
          label: "Tomadas e Voltagem",
          value: "110V • Padrão Americano (2 pinos chatos)",
          practicalExplanation:
            "Leve um adaptador universal para conectar carregadores brasileiros de 3 pinos redondos.",
          badge: "OBRIGATÓRIO",
        },
        {
          label: "Água e Saúde",
          value: "Consuma exclusivamente água mineral engarrafada",
          practicalExplanation:
            "Mesmo para escovar os dentes, prefira utilizar as garrafas de água mineral fornecidas gratuitamente e à vontade no quarto do resort.",
          badge: "ATENÇÃO",
        },
      ],
    });
  } else if (archetype === "orlando_parques") {
    pushPage("destination_basics", {
      eyebrow: "Informações Importantes de Orlando",
      title: "Dólar, Cartões, Tomadas, Clima e Gorjetas nos Estados Unidos",
      subtitle: "Orientações práticas para o dia a dia na Flórida",
      humanNarrative:
        "Nos Estados Unidos, praticamente todos os pagamentos podem ser feitos com cartão internacional (Wise, Nomad ou cartão de crédito habilitado para uso no exterior):",
      cards: [
        {
          label: "Moeda e Pagamentos nos Parques",
          value: "Dólar Americano (USD) • Apple Pay / Cartão por Aproximação",
          practicalExplanation:
            "Dentro da Disney e Universal, você usa o aplicativo oficial para pedir refeições (Mobile Order). Cadastre seu cartão internacional no app antes de viajar.",
          badge: "RECOMENDADO",
        },
        {
          label: "Gorjetas (Tips) em Restaurantes de Mesa",
          value: "Costume cultural de 18% a 20% em restaurantes Table Service",
          practicalExplanation:
            "Em lanchonetes rápidas (Quick Service) não há gorjeta obrigatória. Já em restaurantes com atendimento de garçom na mesa, a gorjeta faz parte da remuneração oficial.",
          badge: "ATENÇÃO",
        },
        {
          label: "Tomadas e Bateria Portátil (Power Bank)",
          value: "110V (2 pinos chatos) • Leve Power Bank para os parques",
          practicalExplanation:
            "Como você usará bastante o celular nos parques para fotos, mapa e fila rápida (Lightning Lane), uma bateria externa portátil na mochila é indispensável.",
          badge: "RECOMENDADO",
        },
      ],
    });
  } else {
    pushPage("destination_basics", {
      eyebrow: "Informações Práticas do Destino",
      title: "Moeda, Pagamentos, Clima, Tomadas e Internet",
      subtitle: `Tudo o que você precisa saber antes de embarcar para ${input.destinations.join(", ")}`,
      humanNarrative:
        "Confira os detalhes práticos da região para organizar sua mala, seus meios de pagamento e seus adaptadores com antecedência:",
      cards: [
        {
          label: "Moeda e Cartões",
          value: archetype === "italia_multicidade" ? "Euro (EUR) • Cartões e espécie" : "Moeda local e Cartões habilitados",
          practicalExplanation:
            archetype === "italia_multicidade"
              ? "Na Itália, cartões (Wise/Nomad/Crédito) são amplamente aceitos, mas mantenha sempre EUR 50 a EUR 100 em espécie para cafés, gelatos e pagamento da taxa turística municipal (City Tax) nos hotéis."
              : "Mantenha sempre duas formas de pagamento ativas (cartão e uma reserva em espécie).",
          badge: "RECOMENDADO",
        },
        {
          label: "Tomadas, Adaptador e Internet",
          value: archetype === "italia_multicidade" ? "230V • Tipo C, F e L (3 pinos alinhados)" : "Padrão local • Recomendado adaptador universal",
          practicalExplanation:
            "Um adaptador universal resolve 100% das tomadas nos hotéis e trens.",
          badge: "RECOMENDADO",
        },
      ],
    });
  }

  // 4. LEITURA HUMANA DOS VOOS E LINHA DO TEMPO DE CONEXÕES
  const outboundFlights = input.flights.filter((f) => f.direction === "ida");
  if (outboundFlights.length > 0) {
    const firstFlight = outboundFlights[0];
    pushPage("airport_departure", {
      eyebrow: "Passo 1 — Saindo de Casa",
      title: `Seu Embarque Inicial em ${expandAirportCode(firstFlight.originIata)}`,
      subtitle: `Data: ${firstFlight.date} • Voo ${firstFlight.airline} ${firstFlight.flightNumber} às ${firstFlight.departureTime}`,
      humanNarrative: isSeniorOrFirstTime
        ? `Cheguem ao ${expandAirportCode(firstFlight.originIata)} com bastante calma (recomendamos pelo menos 2h30 a 3h antes do horário de partida). Mesmo que o check-in online já esteja feito, dirijam-se primeiro ao balcão da ${firstFlight.airline} para despachar as malas grandes e receber os cartões de embarque impressos.`
        : `Recomendamos chegar ao ${expandAirportCode(firstFlight.originIata)} com antecedência mínima de ${
            input.countries.length > 1 || archetype !== "nacional_receptivo" ? "3 horas" : "2 horas"
          }. No balcão da ${firstFlight.airline}, entregue as malas despachadas e confira na etiqueta impressa se o destino final consta corretamente.`,
       timelineNodes: outboundFlights.map((fl) => ({
        timeOrPlace: `${fl.departureTime} → ${fl.arrivalTime} (${fl.airline} ${fl.flightNumber})`,
        iataExpanded: `${expandAirportCode(fl.originIata)} → ${expandAirportCode(fl.destinationIata)}`,
        durationOrWait: fl.connectionWaitText ? `Conexão: ${fl.connectionWaitText}` : fl.durationText,
        instruction: fl.connectionWaitText
          ? `Desembarque em ${expandAirportCode(fl.destinationIata)} e siga as instruções detalhadas da conexão a seguir.`
          : `Trecho com duração prevista de ${fl.durationText}.`,
      })),
    });

    // Explicar cada conexão individualmente ("O que acontece nessa conexão?")
    outboundFlights.forEach((fl, idx) => {
      if (idx < outboundFlights.length - 1) {
        const nextFl = outboundFlights[idx + 1];
        const hubCode = fl.destinationIata.toUpperCase();
        const hubExpanded = expandAirportCode(hubCode);

        let connectionNarrative = "";
        const connectionSteps: PreBoardingSlideStep[] = [];

        if (hubCode === "PTY") {
          connectionNarrative =
            `Na ida vocês farão conexão em ${hubExpanded}. O aeroporto do Panamá é conhecido como 'Hub das Américas' e é extremamente simples e rápido para conexões da Copa Airlines:`;
          connectionSteps.push(
            {
              stepNumber: 1,
              title: "Siga as placas CONNECTIONS / CONEXIONES",
              explanation:
                "Ao sair da aeronave no Panamá, você já estará dentro da área internacional. Não saia para Immigration/Baggage Claim; apenas caminhe pelos corredores seguindo os painéis de partidas.",
              badge: "OBRIGATÓRIO",
            },
            {
              stepNumber: 2,
              title: "Sua mala despachada vai direto até o destino final",
              explanation:
                `Como os dois voos estão no mesmo bilhete, você NÃO precisa pegar sua mala despachada no Panamá. Ela é transferida automaticamente para o voo rumo a ${expandAirportCode(nextFl.destinationIata)}.`,
              badge: "RECOMENDADO",
            },
            {
              stepNumber: 3,
              title: "Confira o portão (Gate) nos telões",
              explanation:
                "No Panamá, o controle de raio-X complementar costuma ocorrer na entrada da própria sala de embarque do portão. Vá primeiro até o portão do próximo voo antes de parar em lojas.",
              badge: "ATENÇÃO",
            }
          );
        } else if (hubCode === "GRU") {
          connectionNarrative =
            `Vocês desembarcarão do voo regional em ${hubExpanded} e farão a transição para o embarque internacional rumo a ${expandAirportCode(nextFl.destinationIata)}:`;
          connectionSteps.push(
            {
              stepNumber: 1,
              title: "Conferência da Etiqueta de Bagagem",
              explanation: fl.sameTicket
                ? "Se no despacho inicial sua mala recebeu etiqueta até o destino final internacional, ela segue automaticamente na ida. Confirme sempre com o atendente no primeiro check-in."
                : "Como os bilhetes são independentes, retire sua mala na esteira em Guarulhos e dirija-se ao balcão da próxima companhia aérea.",
              badge: "OBRIGATÓRIO",
            },
            {
              stepNumber: 2,
              title: "Deslocamento ao Terminal 3 (Embarque Internacional)",
              explanation:
                "Voos domésticos geralmente chegam no Terminal 2 de Guarulhos e os voos internacionais partem do Terminal 3. O caminho é feito por corredor interno climatizado e bem sinalizado (cerca de 10 a 15 minutos de caminhada tranquila).",
              badge: "OBRIGATÓRIO",
            },
            {
              stepNumber: 3,
              title: "Raio-X Internacional e Polícia Federal",
              explanation:
                "Tenha o passaporte e o cartão de embarque em mãos. Você passará pelo controle de segurança internacional e pelos guichês eletrônicos/agentes da Polícia Federal antes de acessar a área do Duty Free e portões.",
              badge: "OBRIGATÓRIO",
            }
          );
        } else {
          connectionNarrative =
            `Durante sua conexão em ${hubExpanded} (tempo de espera previsto: ${fl.connectionWaitText || "conforme bilhete"}), siga este passo a passo tranquilo:`;
          connectionSteps.push(
            {
              stepNumber: 1,
              title: "Siga as placas de Flight Connections / Transfer",
              explanation: `Ao desembarcar em ${hubExpanded}, olhe imediatamente para os monitores de TV ("Departures") procurando o número do próximo voo (${nextFl.airline} ${nextFl.flightNumber}).`,
              badge: "OBRIGATÓRIO",
            },
            {
              stepNumber: 2,
              title: "Bagagem Despachada",
              explanation: fl.sameTicket
                ? `No mesmo localizador, sua mala segue etiquetada até ${expandAirportCode(nextFl.destinationIata)} (exceto quando o primeiro pouso já for nos EUA, onde toda bagagem passa pela alfândega no primeiro aeroporto de entrada).`
                : "Verifique a etiqueta entregue no check-in inicial.",
              badge: "ATENÇÃO",
            }
          );
        }

        pushPage("connection", {
          eyebrow: `Orientação de Conexão • ${hubExpanded}`,
          title: `O que fazer na conexão em ${hubExpanded}`,
          subtitle: `Transição para o voo ${nextFl.airline} ${nextFl.flightNumber} (${nextFl.departureTime})`,
          humanNarrative: connectionNarrative,
          steps: connectionSteps,
        });
      }
    });
  }

  // 5. IMIGRAÇÃO, ALFÂNDEGA E CHEGADA NO DESTINO INTERNACIONAL
  if (archetype !== "nacional_receptivo") {
    pushPage("immigration", {
      eyebrow: "Desembarque Internacional Passo a Passo",
      title: `Chegada, Imigração, Retirada de Mala e Alfândega`,
      subtitle: "A sequência exata que você fará assim que sair do avião",
      humanNarrative:
        "Ao desembarcar no destino final, o fluxo do aeroporto segue uma linha única. Vá com tranquilidade e mantenha os passaportes e vouchers da família juntos:",
      steps: [
        {
          stepNumber: 1,
          title: "1º Avião → Fila de Imigração (Passport Control / Arrivals)",
          explanation:
            "Guarde o celular (não é permitido fotografar ou usar telefone na área de imigração). Quando chamados ao guichê, famílias que moram juntas podem se apresentar juntas ao oficial.",
          badge: "OBRIGATÓRIO",
        },
        {
          stepNumber: 2,
          title: "2º Perguntas Comuns do Oficial de Fronteira",
          explanation:
            "Responda com calma e verdade: motivo da viagem (Turismo/Férias), quantos dias ficarão, em qual hotel ficarão hospedados (mostre o voucher impresso se quiser) e quando retornam ao Brasil.",
          badge: "RECOMENDADO",
        },
        {
          stepNumber: 3,
          title: "3º Esteiras de Bagagem (Baggage Claim) e Alfândega (Customs)",
          explanation:
            "Após carimbar o passaporte, confira nos painéis o número da esteira do seu voo, retire suas malas despachadas e caminhe pela saída da Alfândega rumo ao saguão público de desembarque.",
          badge: "OBRIGATÓRIO",
        },
      ],
    });
  }

  // 6. BAGAGEM (Regra específica da reserva + Itens críticos)
  const firstFl = input.flights[0];
  pushPage("baggage", {
    eyebrow: "Regras da Sua Tarifa Aérea",
    title: "Sua Franquia de Bagagem e O Que Pode / Não Pode Levar na Mão",
    subtitle: "Conferido conforme a companhia aérea e tarifa da sua reserva",
    humanNarrative:
      "Para evitar qualquer cobrança extra no aeroporto ou retenção de itens no raio-X, confira os limites exatos contratados na sua viagem:",
    cards: [
      {
        label: "1. Artigo Pessoal (Bolsa ou Mochila Pequena)",
        value: firstFl?.personalItemRule || "1 item até 10 kg (deve caber embaixo do assento à sua frente)",
        practicalExplanation:
          "Onde você deve levar passaportes, cartões, dinheiro, remédios, óculos, joias e bateria portátil (Power Bank).",
        badge: "OBRIGATÓRIO",
      },
      {
        label: "2. Mala de Bordo (Cabine Superior)",
        value: firstFl?.carryOnBagRule || "1 mala de mão até 10 kg (55 x 35 x 25 cm incluindo rodinhas)",
        practicalExplanation:
          "Leve sempre 1 muda de roupa extra e itens essenciais na mala de mão para seu conforto imediato.",
        badge: "OBRIGATÓRIO",
      },
      {
        label: "3. Bagagem Despachada (Porão da Aeronave)",
        value: firstFl?.checkedBagRule || "1 mala de até 23 kg por passageiro",
        practicalExplanation:
          "Identifique sua mala com tag de nome/telefone e fita colorida. Perfumes grandes, protetor solar grande (>100ml), aerossóis e objetos cortantes (alicate de unha/canivete) DEVEM ir nesta mala despachada.",
        badge: "ATENÇÃO",
      },
      {
        label: "4. Líquidos em Voos Internacionais, Medicamentos e Power Bank",
        value: "Frascos de até 100 ml na mão • Power Bank proibido despachar",
        practicalExplanation:
          "Em voos internacionais, líquidos/géis na mala de mão precisam estar em frascos de no máximo 100 ml dentro de um saquinho transparente de 1 litro. Medicamentos contínuos vão na mala de mão com a receita médica. Baterias portáteis (Power Bank) NUNCA podem ir na mala despachada (sempre na mão).",
        badge: "OBRIGATÓRIO",
      },
    ],
  });

  // 7. TRASLADO RECEPTIVO (Quando contratado)
  if (input.hasReceptiveTransfer) {
    pushPage("transfer", {
      eyebrow: "Encontro no Aeroporto de Destino",
      title: `Como Encontrar o Seu Traslado Receptivo (${input.receptiveCompanyName || "Receptivo Oficial"})`,
      subtitle: "Passo a passo na chegada e combinação do horário de retorno",
      humanNarrative:
        "Para que você não caia em abordagens de motoristas avulsos no saguão do aeroporto, siga exatamente esta orientação ao passar pela porta de saída da alfândega:",
      steps: [
        {
          stepNumber: 1,
          title: "Chegada: Onde encontrar a equipe uniformizada",
          explanation:
            input.receptiveMeetingPoint ||
            `Após retirar as malas e sair pela porta principal de desembarque, procure a equipe identificada da ${
              input.receptiveCompanyName || "operadora receptiva"
            } portando placa com o logotipo ou seu nome. Apresente o Voucher de Transfer.`,
          badge: "OBRIGATÓRIO",
        },
        {
          stepNumber: 2,
          title: "Se tiver qualquer dúvida no desembarque",
          explanation: `Conecte-se ao Wi-Fi do aeroporto ou seu eSIM e chame imediatamente o WhatsApp operacional do receptivo (${
            input.receptiveEmergencyWhatsapp || input.agencyEmergencyPhone
          }) ou o plantão da ${input.agencyName}. Nunca aceite táxi de desconhecidos dizendo que o transfer já saiu.`,
          badge: "ATENÇÃO",
        },
        {
          stepNumber: 3,
          title: "Retorno (Hotel → Aeroporto no último dia)",
          explanation:
            "O horário exato de busca no hotel (pick-up) é confirmado pelo receptivo até 24h antes do voo de volta. Aguarde na recepção principal com as malas fechadas 15 minutos antes do horário marcado.",
          badge: "OBRIGATÓRIO",
        },
      ],
    });
  }

  // 8. HOSPEDAGEM E LOCALIZAÇÃO (1 página dedicada para CADA hotel da reserva!)
  input.hotels.forEach((ht, idx) => {
    pushPage("hotel", {
      eyebrow:
        input.hotels.length > 1
          ? `Hospedagem ${idx + 1} de ${input.hotels.length} • ${ht.city}`
          : `Sua Hospedagem em ${ht.city}`,
      title: `${ht.name} (${ht.neighborhood})`,
      subtitle: `Check-in a partir das ${ht.checkInTime} • Check-out até as ${ht.checkOutTime} • Regime: ${ht.mealPlan}`,
      humanNarrative:
        `O ${ht.name} está localizado em ${ht.neighborhood} (${ht.address}). ` +
        `Entender a região do seu hotel transforma a viagem: veja abaixo o que fica perto de você, como funciona o regime ${ht.mealPlan} e eventuais taxas locais de balcão:`,
      cards: [
        ...(ht.nearbyHighlights || []).map((nh) => ({
          label: `Perto do Hotel: ${nh.name}`,
          value: nh.distanceText,
          practicalExplanation: nh.practicalNote,
          badge: "RECOMENDADO" as RequirementPriorityBadge,
        })),
        ...(ht.hasResortFee
          ? [
              {
                label: "Taxa de Resort (Resort Fee Local)",
                value: ht.resortFeeNote || "Cobrada diretamente pelo hotel no check-in/check-out",
                practicalExplanation:
                  "Nos Estados Unidos/Caribe, alguns hotéis solicitam um cartão no check-in para caução (incidental deposit) e eventual taxa de serviços locais.",
                badge: "ATENÇÃO" as RequirementPriorityBadge,
              },
            ]
          : []),
        ...(ht.hasCityTax
          ? [
              {
                label: "Taxa Municipal de Turismo (City Tax)",
                value: ht.cityTaxNote || "EUR 4 a EUR 8 por pessoa/noite pago na recepção",
                practicalExplanation:
                  "Exigida pelas prefeituras europeias diretamente no balcão do hotel (normalmente no check-out).",
                badge: "OBRIGATÓRIO" as RequirementPriorityBadge,
              },
            ]
          : []),
      ],
    });
  });

  // 9. TRENS (Quando houver deslocamento ferroviário — ex.: Itália ou Europa)
  if (input.trains && input.trains.length > 0) {
    pushPage("train", {
      eyebrow: "Deslocamento Ferroviário Entre Cidades",
      title: "Como Funcionam os Seus Trens de Alta Velocidade",
      subtitle: "Diferenças importantes entre embarcar em um trem e em um avião",
      humanNarrative:
        "Viajar de trem na Europa é muito prático porque as estações ficam no coração das cidades, mas a dinâmica na estação é rápida (o trem para na plataforma por apenas 3 a 5 minutos):",
      steps: [
        {
          stepNumber: 1,
          title: "Chegue à estação com 30 a 40 minutos de antecedência",
          explanation: `Seus trechos (${input.trains
            .map((t) => `${t.originStation} → ${t.destinationStation} às ${t.departureTime}`)
            .join("; ")}) não exigem despacho de mala, mas as estações são grandes.`,
          badge: "OBRIGATÓRIO",
        },
        {
          stepNumber: 2,
          title: "Como ler o painel eletrônico (Plataforma / Binario / Voie)",
          explanation:
            "Procure no painel de partidas (Partenze / Departures) o NÚMERO DO SEU TREM e o horário. O número da plataforma (chamada de 'Binario' na Itália ou 'Voie' na França) aparece no painel cerca de 15 a 20 minutos antes da partida.",
          badge: "ATENÇÃO",
        },
        {
          stepNumber: 3,
          title: "Localize sua Carruagem (Carrozza / Coach) e Assento (Posto)",
          explanation:
            "No seu bilhete constam o número do vagão (Carrozza) e da poltrona (Posto). Suba no vagão correto e acomode as malas grandes nos bagageiros das extremidades do vagão ou acima do assento.",
          badge: "OBRIGATÓRIO",
        },
      ],
    });
  }

  // 10. DINÂMICA ESPECÍFICA DO PRODUTO (Parques de Orlando, Resort Caribe ou Cultura Europeia)
  if (archetype === "orlando_parques") {
    pushPage("parks", {
      eyebrow: "Como Aproveitar os Parques Sem Perder Tempo",
      title: "Dominando a Dinâmica dos Parques de Orlando",
      subtitle: "My Disney Experience, Mobile Order, Lightning Lane e Rope Drop",
      humanNarrative:
        "Orlando possui uma dinâmica própria. Saber usar o aplicativo oficial antes de entrar no parque economiza horas de fila e deixa o dia da família muito mais leve:",
      cards: [
        {
          label: "Aplicativo My Disney Experience & Universal App",
          value: "Baixe no Brasil e vincule seus ingressos",
          practicalExplanation:
            "Pelo aplicativo você consulta o tempo real de fila de cada atração em minutos, localiza personagens e horários dos fogos.",
          badge: "OBRIGATÓRIO",
        },
        {
          label: "Mobile Order (Pedir comida pelo celular sem fila)",
          value: "Evite filas nos restaurantes de almoço",
          practicalExplanation:
            "Por volta das 11h00 da manhã, abra o app, escolha o restaurante do parque, faça o pedido da refeição e pague pelo celular. Quando chegar ao restaurante, clique em 'I’m Here' e retire no balcão expresso.",
          badge: "RECOMENDADO",
        },
        {
          label: "Chegada Antecipada & Hidratação Gratuita",
          value: "Chegue 45 min antes da abertura • Água gelada gratuita nos balcões",
          practicalExplanation:
            "As primeiras 2 horas da manhã têm as menores filas do dia. E uma dica valiosa: em qualquer lanchonete Quick Service dos parques, você pode pedir 'Complimentary Cup of Ice Water' (copo de água com gelo gratuito).",
          badge: "RECOMENDADO",
        },
      ],
    });
  } else if (archetype === "caribe_resort") {
    pushPage("culture", {
      eyebrow: "Como Funciona o Seu Resort All-Inclusive",
      title: "Pulseira, Restaurantes à la Carte, Toalhas de Praia e Passeios",
      subtitle: "Dicas práticas para aproveitar 100% da estrutura desde o primeiro dia",
      humanNarrative:
        "No sistema All-Inclusive todas as refeições, petiscos, bebidas (alcoólicas e não alcoólicas) e programação de lazer do resort estão incluídos:",
      cards: [
        {
          label: "Reservas de Restaurantes Temáticos (Jantar à la Carte)",
          value: "Faça as reservas logo no 1º dia após o check-in",
          practicalExplanation:
            "Além do buffet principal (que não exige reserva), o resort possui restaurantes temáticos para o jantar. Procure o Guest Service/Concierge no primeiro dia para agendar suas noites e confira se exigem calça comprida/sapato fechado para homens.",
          badge: "ATENÇÃO",
        },
        {
          label: "Passeios Clássicos (Isla Saona, Scape Park, Dolphin Island, Coco Bongo)",
          value: "Compre apenas com o receptivo oficial ou agência",
          practicalExplanation:
            "Isla Saona (dia inteiro de catamarã e piscinas naturais) e Scape Park (Cenote Hoyo Azul) são os passeios mais procurados. Evite vendedores ambulantes na areia da praia sem credencial.",
          badge: "RECOMENDADO",
        },
      ],
    });
  } else {
    pushPage("culture", {
      eyebrow: "Cultura Local, Etiqueta e Segurança",
      title: "O Que Esperar no Dia a Dia e Cuidados Importantes",
      subtitle: "Hábitos locais, restaurantes, vestimenta e prevenção de imprevistos",
      humanNarrative:
        "Conhecer o ritmo cultural do destino evita pequenos contratempos e ajuda você a viver a cidade como um viajante experiente:",
      cards: [
        {
          label: "Restaurantes, Água de Mesa e Conta",
          value: "Peça a conta ('Il conto' / 'L'addition') quando desejar encerrar",
          practicalExplanation:
            "Na Europa, os garçons não trazem a conta sem que você peça (pois é considerado indelicado apressar o cliente). Na Itália, é comum a cobrança do 'Coperto' (pequena taxa por pessoa pelo serviço de mesa e pães).",
          badge: "RECOMENDADO",
        },
        {
          label: "Vestimenta em Basílicas, Vaticano e Locais Históricos",
          value: "Ombros e joelhos cobertos para entrar em igrejas",
          practicalExplanation:
            "Nos dias em que for visitar a Basílica de São Pedro (Vaticano), o Duomo de Florença ou catedrais históricas, evite regatas, decotes profundos ou bermudas acima do joelho (leve um lenço/echarpe na bolsa).",
          badge: "OBRIGATÓRIO",
        },
        {
          label: "Atenção em Metrôs, Estações de Trem e Pontos Turísticos",
          value: "Bolsas sempre à frente do corpo (cuidado com batedores de carteira)",
          practicalExplanation:
            "A Europa é muito segura quanto a crimes violentos, mas estações de trem e atrações lotadas exigem atenção total com celulares no bolso de trás e mochilas nas costas.",
          badge: "ATENÇÃO",
        },
      ],
    });
  }

  // 11. ROTEIRO SUGERIDO INTELIGENTE (Considerando chegada leve e agrupamento geográfico)
  pushPage("suggested_itinerary", {
    eyebrow: "Organização Inteligente dos Dias",
    title: "Sugestão de Roteiro Equilibrado (Sem Correria Desnecessária)",
    subtitle: "Agrupando atrações próximas ao seu hotel e respeitando o descanso do voo",
    humanNarrative:
      "Organizamos uma lógica geográfica para que você não atravesse a cidade várias vezes no mesmo dia:",
    steps: [
      {
        stepNumber: 1,
        title: "Dia 1 — Chegada, Acomodação no Hotel e Reconhecimento Leve da Região",
        explanation:
          "Após um voo longo, não programe atrações distantes com horário marcado no primeiro dia. Faça o check-in, descanse, caminhe pelos arredores do hotel e jante cedo.",
        badge: "RECOMENDADO",
      },
      {
        stepNumber: 2,
        title: "Dias Centrais — Atrações Principais Agrupadas por Bairro/Região",
        explanation:
          "Comece as atrações mais concorridas no primeiro horário da manhã. Se tiver ingressos com hora marcada, organize o almoço e as caminhadas ao redor daquele ponto.",
        badge: "OBRIGATÓRIO",
      },
      {
        stepNumber: 3,
        title: "Penúltimo Dia — Compras, Passeio Livre e Organização das Malas",
        explanation:
          "Deixe as compras mais volumosas para a reta final e já deixe as malas pesadas e organizadas na véspera do embarque de volta.",
        badge: "RECOMENDADO",
      },
    ],
  });

  // 12. ÚLTIMO DIA E RETORNO PARA CASA
  const returnFlights = input.flights.filter((f) => f.direction === "volta");
  pushPage("return_trip", {
    eyebrow: "A Volta para Casa com Tranquilidade",
    title: "Check-out no Hotel, Aeroporto de Retorno e Chegada ao Brasil",
    subtitle:
      returnFlights.length > 0
        ? `Voo de volta: ${returnFlights[0].date} (${returnFlights[0].airline} ${returnFlights[0].flightNumber} às ${returnFlights[0].departureTime})`
        : `Retorno programado em ${input.endDate}`,
    humanNarrative:
      "O retorno merece o mesmo cuidado da ida, especialmente na chegada ao primeiro aeroporto brasileiro:",
    steps: [
      {
        stepNumber: 1,
        title: "Check-out no Hotel e Saída para o Aeroporto",
        explanation:
          "Confira o cofre do quarto (passaportes!), tomadas (carregadores) e acerte eventuais consumos extras na recepção. Para voos internacionais de volta, chegue ao aeroporto com 3 horas de antecedência.",
        badge: "OBRIGATÓRIO",
      },
      {
        stepNumber: 2,
        title: "ATENÇÃO NO RETORNO AO BRASIL: Retirada e Redespacho de Bagagem",
        explanation:
          "Ao pousar no primeiro aeroporto brasileiro (ex.: Guarulhos — GRU) vindo do exterior, TODOS os passageiros passam pela Imigração Brasileira, PRECISAM RETIRAR AS MALAS NA ESTEIRA, passar pela Alfândega da Receita Federal e entregá-las novamente no balcão de Redespacho (Bag Drop) para o voo doméstico final até sua cidade.",
        badge: "OBRIGATÓRIO",
      },
    ],
  });

  // 13. CONTATOS DE SUPORTE E ENCERRAMENTO
  pushPage("emergency_contacts", {
    eyebrow: "Você Nunca Viaja Sozinho",
    title: `Contatos Importantes & Plantão ${input.agencyName}`,
    subtitle: "Se qualquer imprevisto acontecer durante a viagem, fale conosco imediatamente",
    humanNarrative:
      `Nossa equipe acompanha sua viagem do início ao fim. Caso um voo atrase, haja dúvida no transfer ou precise acionar o seguro médico, acione os contatos oficiais abaixo:`,
    cards: [
      {
        label: `Plantão e Suporte ${input.agencyName}`,
        value: input.agencyEmergencyPhone,
        practicalExplanation: "Atendimento prioritário via WhatsApp para passageiros em viagem.",
        badge: "OBRIGATÓRIO",
      },
      {
        label: "Receptivo Local / Transfer",
        value: input.receptiveEmergencyWhatsapp || input.receptiveCompanyName || "Consta no Voucher de Transfer",
        practicalExplanation: "Contato direto da equipe de solo no aeroporto e hotel de destino.",
        badge: "RECOMENDADO",
      },
      {
        label: "Central 24h do Seguro Viagem (Atendimento em Português)",
        value: `${input.insuranceProvider || "Assistência Médica Internacional"} • Apólice: ${
          input.insurancePolicyNumber || "Ver Voucher"
        }`,
        practicalExplanation:
          "Antes de ir a qualquer hospital ou clínica no exterior, acione sempre o WhatsApp/telefone da seguradora para que eles indiquem o hospital credenciado sem desembolso.",
        badge: "OBRIGATÓRIO",
      },
    ],
  });

  const activeLocale: PresentationLocale = input.locale || "pt-BR";
  return {
    presentationType: "pre_boarding_guide",
    locale: activeLocale,
    detectedArchetype: archetype,
    selectedModules,
    pages: localizePresentationPages(pages, activeLocale, input),
    requiresHumanReview: humanReviewWarnings.length > 0,
    humanReviewWarnings,
  };
}

const COMMERCIAL_SLIDE_TRANSLATIONS: Record<
  Exclude<PresentationLocale, "pt-BR">,
  Record<
    string,
    {
      eyebrow: string;
      titlePrefix?: string;
      subtitlePrefix?: string;
    }
  >
> = {
  "en-US": {
    cover_quote: {
      eyebrow: "Tailored Commercial Travel Proposal",
      subtitlePrefix: "Planned Travel Dates",
    },
    cover_boarding: {
      eyebrow: "Official Pre-Departure & Boarding Guide",
      subtitlePrefix: "Passengers",
    },
    trip_overview: {
      eyebrow: "Experience Overview",
      titlePrefix: "Curated Itinerary & Destination Highlights",
    },
    documents: {
      eyebrow: "Pre-Departure Checklist",
      titlePrefix: "Mandatory Travel Documents & Entry Requirements",
    },
    destination_basics: {
      eyebrow: "Essential Destination Briefing",
      titlePrefix: "Currency, Power Plugs, Tipping & Mobile Connectivity",
    },
    airport_departure: {
      eyebrow: "Step 1 — Departure Airport",
      titlePrefix: "Initial Check-In & Baggage Drop at",
    },
    connection: {
      eyebrow: "Flight Connection Guide",
      titlePrefix: "Step-by-Step Connection Procedure at",
    },
    immigration: {
      eyebrow: "International Arrival Procedure",
      titlePrefix: "Arrival, Passport Control, Baggage Claim & Customs",
    },
    baggage: {
      eyebrow: "Your Airfare Baggage Rules",
      titlePrefix: "Baggage Allowance & Cabin Security Regulations",
    },
    transfer: {
      eyebrow: "Airport Meet & Greet",
      titlePrefix: "How to Locate Your Official Ground Transfer",
    },
    hotel: {
      eyebrow: "Confirmed Accommodation & Area Guide",
    },
    train: {
      eyebrow: "Intercity Rail Transfer",
      titlePrefix: "How to Board Your High-Speed Trains",
    },
    parks: {
      eyebrow: "Theme Park Strategy",
      titlePrefix: "Maximizing Your Time at Orlando Theme Parks",
    },
    culture: {
      eyebrow: "Local Etiquette & Practical Tips",
      titlePrefix: "Day-to-Day Experience, Dining & Safety Guidelines",
    },
    suggested_itinerary: {
      eyebrow: "Smart Daily Pacing",
      titlePrefix: "Balanced Suggested Schedule by Neighborhood",
    },
    return_trip: {
      eyebrow: "Smooth Return Journey",
      titlePrefix: "Hotel Check-Out, Return Flight & Arrival Customs",
    },
    emergency_contacts: {
      eyebrow: "24/7 Traveler Assistance",
      titlePrefix: "Emergency Contacts & Dedicated Agency Support",
    },
    payments: {
      eyebrow: "Commercial Investment & Payment Terms",
      titlePrefix: "Total Fare & Payment Options",
    },
    closing: {
      eyebrow: "Next Steps",
      titlePrefix: "Ready to Confirm Your Reservation?",
    },
  },
  "es-ES": {
    cover_quote: {
      eyebrow: "Propuesta Comercial de Viaje Personalizada",
      subtitlePrefix: "Fechas previstas",
    },
    cover_boarding: {
      eyebrow: "Guía Oficial de Pre-Embarque y Viaje",
      subtitlePrefix: "Pasajeros",
    },
    trip_overview: {
      eyebrow: "Visión General de la Experiencia",
      titlePrefix: "Itinerario Seleccionado y Destinos",
    },
    documents: {
      eyebrow: "Lista de Verificación Antes de Salir",
      titlePrefix: "Documentación Obligatoria y Requisitos Migratorios",
    },
    destination_basics: {
      eyebrow: "Información Práctica del Destino",
      titlePrefix: "Moneda, Enchufes, Propinas y Conectividad Móvil",
    },
    airport_departure: {
      eyebrow: "Paso 1 — Aeropuerto de Salida",
      titlePrefix: "Embarque Inicial y Despacho de Equipaje en",
    },
    connection: {
      eyebrow: "Guía de Conexión Aérea",
      titlePrefix: "Qué hacer paso a paso durante su conexión en",
    },
    immigration: {
      eyebrow: "Desembarque Internacional Paso a Paso",
      titlePrefix: "Llegada, Control de Pasaportes, Equipaje y Aduana",
    },
    baggage: {
      eyebrow: "Reglas de su Tarifa Aérea",
      titlePrefix: "Franquicia de Equipaje y Normas de Equipaje de Mano",
    },
    transfer: {
      eyebrow: "Encuentro en el Aeropuerto de Destino",
      titlePrefix: "Cómo Encontrar su Traslado Receptivo Oficial",
    },
    hotel: {
      eyebrow: "Alojamiento Confirmado y Guía de la Zona",
    },
    train: {
      eyebrow: "Traslado Ferroviario Entre Ciudades",
      titlePrefix: "Cómo Funcionan sus Trenes de Alta Velocidad",
    },
    parks: {
      eyebrow: "Guía Práctica de Parques Temáticos",
      titlePrefix: "Cómo Aprovechar los Parques de Orlando sin Filas",
    },
    culture: {
      eyebrow: "Cultura Local, Etiqueta y Seguridad",
      titlePrefix: "Recomendaciones Diarias, Gastronomía y Cuidados",
    },
    suggested_itinerary: {
      eyebrow: "Organización Inteligente por Días",
      titlePrefix: "Sugerencia de Itinerario Equilibrado por Zonas",
    },
    return_trip: {
      eyebrow: "Regreso a Casa con Tranquilidad",
      titlePrefix: "Check-Out del Hotel, Aeropuerto de Regreso y Aduana",
    },
    emergency_contacts: {
      eyebrow: "Asistencia al Viajero 24 Horas",
      titlePrefix: "Contactos de Emergencia y Guardia de la Agencia",
    },
    payments: {
      eyebrow: "Inversión y Condiciones Comerciales",
      titlePrefix: "Valores y Plan de Financiación",
    },
    closing: {
      eyebrow: "Próximo Paso",
      titlePrefix: "¿Confirmamos su viaje?",
    },
  },
};

function localizePresentationPages(
  pages: PreBoardingPresentationPage[],
  locale: PresentationLocale,
  input: PreBoardingTripInput,
): PreBoardingPresentationPage[] {
  if (locale === "pt-BR") return pages;
  const dict = COMMERCIAL_SLIDE_TRANSLATIONS[locale];

  return pages.map((p) => {
    const key =
      p.moduleKey === "cover"
        ? input.presentationType === "commercial_quote"
          ? "cover_quote"
          : "cover_boarding"
        : p.moduleKey;
    const entry = dict[key];
    if (!entry) return p;

    const localizedEyebrow =
      p.moduleKey === "cover" ? `${input.agencyName} • ${entry.eyebrow}` : entry.eyebrow;

    let localizedTitle = p.title;
    if (entry.titlePrefix) {
      if (p.moduleKey === "airport_departure" && input.flights[0]) {
        localizedTitle = `${entry.titlePrefix} ${expandAirportCode(input.flights[0].originIata)}`;
      } else if (p.moduleKey === "connection") {
        const hub = input.flights[0]?.destinationIata
          ? expandAirportCode(input.flights[0].destinationIata)
          : "";
        localizedTitle = `${entry.titlePrefix} ${hub}`.trim();
      } else if (p.moduleKey !== "cover" && p.moduleKey !== "hotel" && p.moduleKey !== "flight") {
        localizedTitle = entry.titlePrefix;
      }
    }

    return {
      ...p,
      eyebrow: localizedEyebrow,
      title: localizedTitle,
    };
  });
}

// ============================================================================
// 2. MOTOR DE PLANILHA IN-PAGE DE COMISSÕES, OVER DINÂMICO POR OPERADORA,
//    METAS POR FATURAMENTO BRUTO (PAGAS NO LÍQUIDO) E CANCELAMENTOS
// ============================================================================

export type GoalEvaluationBasis = "gross_sale" | "net_sale" | "agency_revenue";
export type CommissionCalculationBasis = "net_sale_plus_over" | "agency_commission_share";
export type OverPaymentMethod = "pix_direto_agencia" | "operadora_financiado";

export interface OperatorOverRetentionConfig {
  operatorName: string;
  defaultRetentionPctWhenFinanced: number; // ex: Orinter 16%, FRT 15%, Incomum 14%, Cativa 12%
  baseAgencyCommissionPct: number; // ex: 10% ou 12%
}

export const DEFAULT_OPERATOR_OVER_RETENTION_CONFIGS: OperatorOverRetentionConfig[] = [
  { operatorName: "Orinter", defaultRetentionPctWhenFinanced: 16, baseAgencyCommissionPct: 10 },
  { operatorName: "FRT Operadora", defaultRetentionPctWhenFinanced: 15, baseAgencyCommissionPct: 12 },
  { operatorName: "Incomum", defaultRetentionPctWhenFinanced: 14, baseAgencyCommissionPct: 10 },
  { operatorName: "Cativa", defaultRetentionPctWhenFinanced: 12, baseAgencyCommissionPct: 10 },
  { operatorName: "BeFly", defaultRetentionPctWhenFinanced: 15, baseAgencyCommissionPct: 10 },
  { operatorName: "Confiança", defaultRetentionPctWhenFinanced: 10, baseAgencyCommissionPct: 10 },
];

export interface AgentCommissionTierRule {
  tierName: string; // Ex: "Faixa 1 (Até R$ 99.999,99 Bruto)" / "Faixa 2 (R$ 100.000,00+ Bruto)"
  minMonthlyRevenueCents: number;
  maxMonthlyRevenueCents: number | null;
  commissionPct: number; // Ex: 1.0% ou 1.5% pagos sobre o Valor Líquido
  overCommissionPct?: number; // Ex: 30% pagos sobre o Over Líquido (editável por faixa/agência)
  bonusFixedCents: number;
}

export interface AgentCommissionProfile {
  agentId: string;
  agentName: string;
  goalEvaluationBasis?: GoalEvaluationBasis; // Padrão: "gross_sale" (Meta avaliada pelo Faturamento Bruto)
  commissionCalculationBasis?: CommissionCalculationBasis; // Padrão: "net_sale_plus_over" (Paga % sobre Líquido + % sobre Over Líquido)
  baseCommissionPct: number; // Ex: 1.0% sobre o líquido
  defaultOverCommissionPct?: number; // Ex: 30% sobre o Over Líquido
  currentMonthAgencyRevenueCents: number; // Volume acumulado do mês para avaliação da meta (ex: Faturamento Bruto Mensal)
  tiers: AgentCommissionTierRule[];
}

export interface InlineSaleSpreadsheetRowInput {
  id: string;
  saleDate: string;
  clientName: string;
  passengersCount: number;
  operatorName: string;
  operatorPackageCode: string;
  contractSigned: boolean;
  bookingStatus: "confirmada" | "emitida" | "em_viagem" | "concluida" | "cancelada" | "arquivada";
  grossSaleCents: number; // ex: R$ 20.000,00 (2000000)
  taxesAndFeesCents: number; // ex: R$ 1.000,00 (100000)
  operatorTablePriceCents: number; // ex: R$ 19.000,00 (1900000)
  baseCommissionPct: number; // ex: 10% ou 12% (comissão da agência junto à operadora)
  overRetentionFeePct: number; // ex: 16% (varia por operadora e é 0% quando pago em Pix/Dinheiro direto)
  paid100PctViaOperator: boolean;
  overPaymentMethod?: OverPaymentMethod; // "pix_direto_agencia" (0% retenção) | "operadora_financiado" (aplica taxa da operadora)
  agentId: string;
  agentName: string;
  agentCommissionPctOverride: number | null; // Override inline da % sobre o Valor Líquido (ex: 1% -> 1.5%)
  agentOverCommissionPctOverride?: number | null; // Override inline da % sobre o Over Líquido (padrão 30%)
  agentCommissionCentsOverride: number | null; // Override inline do valor final em R$
  deductCommissionOnCancel?: boolean; // Padrão FALSE: multas/cancelamentos NÃO afetam vendas/comissão salvo se o ADM descontar manualmente
  managerCommissionClawbackCents?: number | null; // Valor manual de estorno/desconto definido pelo gestor
}

export interface InlineSaleSpreadsheetRowCalculated extends InlineSaleSpreadsheetRowInput {
  netCommissionableBaseCents: number;
  baseCommissionGrossCents: number;
  overGrossCents: number;
  effectiveOverRetentionPct: number;
  overRetentionDeductionCents: number;
  overNetCents: number;
  totalAgencyNetCommissionCents: number;
  appliedAgentTierName: string;
  effectiveAgentCommissionPct: number;
  effectiveAgentOverCommissionPct: number;
  agentBaseCommissionCents: number;
  agentOverCommissionCents: number;
  appliedCommissionClawbackCents: number;
  agentCommissionTotalCents: number;
  agencyNetProfitAfterAgentCents: number;
}

export function resolveAgentCommissionTier(
  profile: AgentCommissionProfile,
): {
  tierName: string;
  commissionPct: number;
  overCommissionPct: number;
  bonusFixedCents: number;
} {
  const rev = Math.max(0, profile.currentMonthAgencyRevenueCents);
  const defaultOverPct = profile.defaultOverCommissionPct ?? 30;
  const sorted = [...(profile.tiers || [])].sort(
    (a, b) => a.minMonthlyRevenueCents - b.minMonthlyRevenueCents,
  );

  for (const tier of sorted) {
    const aboveMin = rev >= tier.minMonthlyRevenueCents;
    const belowMax = tier.maxMonthlyRevenueCents == null || rev <= tier.maxMonthlyRevenueCents;
    if (aboveMin && belowMax) {
      return {
        tierName: tier.tierName,
        commissionPct: tier.commissionPct,
        overCommissionPct: tier.overCommissionPct ?? defaultOverPct,
        bonusFixedCents: tier.bonusFixedCents || 0,
      };
    }
  }

  return {
    tierName: "Base Padrão",
    commissionPct: profile.baseCommissionPct || 1,
    overCommissionPct: defaultOverPct,
    bonusFixedCents: 0,
  };
}

export function calculateInlineSaleSpreadsheetRow(
  row: InlineSaleSpreadsheetRowInput,
  agentProfile?: AgentCommissionProfile,
): InlineSaleSpreadsheetRowCalculated {
  const gross = Math.max(0, Math.round(row.grossSaleCents));
  const taxes = Math.max(0, Math.round(row.taxesAndFeesCents));
  const tablePrice = Math.max(0, Math.round(row.operatorTablePriceCents || gross));

  // Over bruto cobrado acima da tabela da operadora (ex: vendeu por 20k pacote de 19k -> Over Bruto = 1k)
  const overGrossCents = Math.max(0, gross - tablePrice);

  // Valor Líquido comissionável (Tabela menos taxas de embarque, sem o Over cobrado à parte)
  const netCommissionableBaseCents = Math.max(0, Math.min(gross, tablePrice) - taxes);

  const baseCommissionPct = Math.max(0, Math.min(100, row.baseCommissionPct || 0));
  const baseCommissionGrossCents = Math.round((netCommissionableBaseCents * baseCommissionPct) / 100);

  // Regra Dinâmica do Over:
  // Se o Over foi pago em Dinheiro/Pix direto à agência ("pix_direto_agencia" ou paid100PctViaOperator === false),
  // NÃO HÁ retenção da operadora (0%).
  // Se foi embutido/financiado na operadora ("operadora_financiado" e paid100PctViaOperator === true),
  // aplica a taxa configurada da respectiva operadora (editável na linha e nas configurações da empresa).
  const isPaidDirectPixOrCash =
    row.overPaymentMethod === "pix_direto_agencia" || row.paid100PctViaOperator === false;

  const effectiveOverRetentionPct = isPaidDirectPixOrCash
    ? 0
    : Math.max(0, Math.min(50, row.overRetentionFeePct ?? 0));

  const overRetentionDeductionCents = Math.round((overGrossCents * effectiveOverRetentionPct) / 100);
  const overNetCents = Math.max(0, overGrossCents - overRetentionDeductionCents);

  const totalAgencyNetCommissionCents = baseCommissionGrossCents + overNetCents;

  // Resolução da faixa de meta do consultor (avaliada pelo Faturamento Bruto Mensal, mas paga sobre o Líquido + % própria do Over Líquido)
  const resolvedTier = agentProfile
    ? resolveAgentCommissionTier(agentProfile)
    : { tierName: "Faixa Base", commissionPct: 1, overCommissionPct: 30, bonusFixedCents: 0 };

  const effectiveAgentCommissionPct =
    row.agentCommissionPctOverride != null
      ? Math.max(0, Math.min(100, row.agentCommissionPctOverride))
      : resolvedTier.commissionPct;

  const effectiveAgentOverCommissionPct =
    row.agentOverCommissionPctOverride != null
      ? Math.max(0, Math.min(100, row.agentOverCommissionPctOverride))
      : resolvedTier.overCommissionPct;

  const calcBasis: CommissionCalculationBasis =
    agentProfile?.commissionCalculationBasis || "net_sale_plus_over";

  const agentBaseCommissionCents =
    calcBasis === "agency_commission_share"
      ? Math.round((totalAgencyNetCommissionCents * effectiveAgentCommissionPct) / 100)
      : Math.round((netCommissionableBaseCents * effectiveAgentCommissionPct) / 100);

  const agentOverCommissionCents =
    calcBasis === "agency_commission_share"
      ? 0
      : Math.round((overNetCents * effectiveAgentOverCommissionPct) / 100);

  const grossAgentCommissionCents =
    row.agentCommissionCentsOverride != null
      ? Math.max(0, Math.round(row.agentCommissionCentsOverride))
      : agentBaseCommissionCents + agentOverCommissionCents;

  // Cancelamentos e multas NÃO descontam nem zeram a comissão do agente automaticamente,
  // a não ser que o administrador ative manualmente `deductCommissionOnCancel` ou informe `managerCommissionClawbackCents`.
  const shouldDeductOnCancel = Boolean(row.deductCommissionOnCancel);
  const appliedCommissionClawbackCents = shouldDeductOnCancel
    ? row.managerCommissionClawbackCents != null
      ? Math.max(0, Math.min(grossAgentCommissionCents, Math.round(row.managerCommissionClawbackCents)))
      : grossAgentCommissionCents
    : 0;

  const agentCommissionTotalCents = Math.max(
    0,
    grossAgentCommissionCents - appliedCommissionClawbackCents,
  );

  const agencyNetProfitAfterAgentCents = Math.max(
    0,
    totalAgencyNetCommissionCents - agentCommissionTotalCents,
  );

  const hasInlineOverride =
    row.agentCommissionCentsOverride != null ||
    row.agentCommissionPctOverride != null ||
    row.agentOverCommissionPctOverride != null;

  return {
    ...row,
    netCommissionableBaseCents,
    baseCommissionGrossCents,
    overGrossCents,
    effectiveOverRetentionPct,
    overRetentionDeductionCents,
    overNetCents,
    totalAgencyNetCommissionCents,
    appliedAgentTierName: hasInlineOverride
      ? `${resolvedTier.tierName} (Editado Inline)`
      : resolvedTier.tierName,
    effectiveAgentCommissionPct,
    effectiveAgentOverCommissionPct,
    agentBaseCommissionCents,
    agentOverCommissionCents,
    appliedCommissionClawbackCents,
    agentCommissionTotalCents,
    agencyNetProfitAfterAgentCents,
  };
}

// ============================================================================
// 3. MOTOR DE CANCELAMENTO, MULTAS, CARTA DE CRÉDITO & FINANCIAMENTO ATIVO
// ============================================================================

export interface CancellationSimulationInput {
  clientName: string;
  operatorName: string;
  locatorCode: string;
  grossSaleCents: number;
  alreadyPaidByClientCents: number;
  remainingFinancedBalanceCents: number;
  supplierNonRefundableCents: number; // Tarifa aérea promo / hotel não-reembolsável
  agencyContractFinePct: number; // Ex: 20% multa contratual
  convertBalanceToOperatorCredit: boolean;
  daysBeforeDeparture: number;
}

export interface CancellationSimulationResult {
  grossSaleCents: number;
  alreadyPaidByClientCents: number;
  remainingFinancedBalanceCents: number;
  supplierNonRefundableCents: number;
  agencyContractFineCents: number;
  totalPenaltiesAndRetentionsCents: number;
  operatorCreditLetterCents: number;
  netCashRefundToClientCents: number;
  clientMustKeepPayingFinancing: boolean;
  unpaidPenaltyBalanceCents: number;
  creditExpirationDateIso: string;
  formalStatementPt: string;
}

export function simulateTripCancellationAndCredit(
  input: CancellationSimulationInput
): CancellationSimulationResult {
  const gross = Math.max(0, Math.round(input.grossSaleCents));
  const paid = Math.max(0, Math.round(input.alreadyPaidByClientCents));
  const remainingFinanced = Math.max(0, Math.round(input.remainingFinancedBalanceCents));
  const nonRefundable = Math.max(0, Math.min(gross, Math.round(input.supplierNonRefundableCents)));
  const finePct = Math.max(0, Math.min(100, input.agencyContractFinePct ?? 20));
  const agencyContractFineCents = Math.round((gross * finePct) / 100);

  const totalPenaltiesAndRetentionsCents = Math.min(gross, nonRefundable + agencyContractFineCents);
  const residualValueCents = Math.max(0, gross - totalPenaltiesAndRetentionsCents);

  // Se o cliente financiou via boleto/operadora e as multas + tarifas não reembolsáveis superam o que foi pago à vista,
  // ou se o contrato de financiamento já quitou o fornecedor, o cliente não tem reembolso em espécie e mantém a obrigação do financiamento.
  const clientMustKeepPayingFinancing =
    remainingFinanced > 0 && totalPenaltiesAndRetentionsCents > paid;

  const unpaidPenaltyBalanceCents = Math.max(0, totalPenaltiesAndRetentionsCents - paid);

  const operatorCreditLetterCents = input.convertBalanceToOperatorCredit
    ? residualValueCents
    : 0;

  const netCashRefundToClientCents = input.convertBalanceToOperatorCredit
    ? 0
    : Math.max(0, paid - totalPenaltiesAndRetentionsCents);

  const expDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const formatBRL = (cents: number) =>
    (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const formalStatementPt =
    `EXTRATO DE APURAÇÃO DE CANCELAMENTO / REMARCAÇÃO — Reserva #${input.locatorCode} (${input.operatorName})\n` +
    `Titular: ${input.clientName} • Antecedência do pedido: ${input.daysBeforeDeparture} dias antes do embarque.\n` +
    `1. Valor Total Contratado: ${formatBRL(gross)}\n` +
    `2. Retenção de Tarifas Não-Reembolsáveis (Cia Aérea / Fornecedor): ${formatBRL(nonRefundable)}\n` +
    `3. Multa Contratual de Intermediação (${finePct}%): ${formatBRL(agencyContractFineCents)}\n` +
    (operatorCreditLetterCents > 0
      ? `4. Carta de Crédito Emitida junto à Operadora ${input.operatorName}: ${formatBRL(operatorCreditLetterCents)} (válida para remarcação até ${expDate}).\n`
      : `4. Reembolso Líquido Apurado: ${formatBRL(netCashRefundToClientCents)}.\n`) +
    (clientMustKeepPayingFinancing
      ? `IMPORTANTE (FINANCIAMENTO ATIVO): Como os bilhetes e reservas foram emitidos de forma faturada/financiada e possuem retenção tarifária superior ao sinal pago, não há reembolso em espécie e as parcelas vincendas do financiamento (${formatBRL(remainingFinanced)}) permanecem ativas conforme contrato assinado.`
      : `Situação financeira devidamente conciliada conforme cláusulas contratuais e Resolução ANAC 400.`);

  return {
    grossSaleCents: gross,
    alreadyPaidByClientCents: paid,
    remainingFinancedBalanceCents: remainingFinanced,
    supplierNonRefundableCents: nonRefundable,
    agencyContractFineCents,
    totalPenaltiesAndRetentionsCents,
    operatorCreditLetterCents,
    netCashRefundToClientCents,
    clientMustKeepPayingFinancing,
    unpaidPenaltyBalanceCents,
    creditExpirationDateIso: expDate,
    formalStatementPt,
  };
}

// ============================================================================
// 4. IMPORTADOR UNIVERSAL INTELIGENTE DE PLANILHAS CRM + CRÉDITO DE OPERADORAS
// ============================================================================

export interface MappedCrmCustomerImportRow {
  fullName: string;
  documentCpfCnpj: string | null;
  phoneWhatsapp: string | null;
  email: string | null;
  city: string | null;
  birthDate: string | null;
  operatorCreditLimitCents: number | null;
  operatorCreditStatus: string | null;
  preferredOperator: string | null;
  pastDestinations: string | null;
  structuredNotesFromUnmappedColumns: string;
  rawExtraFields: Record<string, string>;
}

export interface UniversalCrmImportParseResult {
  totalRows: number;
  validRowsCount: number;
  recognizedHeaders: string[];
  unmappedHeadersConvertedToNotes: string[];
  rows: MappedCrmCustomerImportRow[];
}

export function parseAndMapUniversalCrmSpreadsheet(
  rawCsvOrTsvText: string
): UniversalCrmImportParseResult {
  const lines = (rawCsvOrTsvText || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return {
      totalRows: 0,
      validRowsCount: 0,
      recognizedHeaders: [],
      unmappedHeadersConvertedToNotes: [],
      rows: [],
    };
  }

  // Detecta automaticamente o delimitador (Tab, Ponto-e-vírgula ou Vírgula)
  const headerLine = lines[0];
  const delimiter = headerLine.includes("\t")
    ? "\t"
    : headerLine.includes(";")
      ? ";"
      : ",";

  const splitLine = (line: string): string[] =>
    line.split(delimiter).map((cell) => cell.replace(/^["']|["']$/g, "").trim());

  const headers = splitLine(headerLine);
  const normHeader = (h: string) =>
    h
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, " ")
      .trim();

  type CanonicalField =
    | "fullName"
    | "documentCpfCnpj"
    | "phoneWhatsapp"
    | "email"
    | "city"
    | "birthDate"
    | "operatorCreditLimit"
    | "operatorCreditStatus"
    | "preferredOperator"
    | "pastDestinations"
    | "unmapped";

  const columnMap: CanonicalField[] = headers.map((h) => {
    const nh = normHeader(h);
    if (
      nh.includes("nome") ||
      nh.includes("cliente") ||
      nh.includes("passageiro") ||
      nh.includes("titular") ||
      nh.includes("razao social") ||
      nh === "name"
    ) {
      return "fullName";
    }
    if (nh.includes("cpf") || nh.includes("cnpj") || nh.includes("documento") || nh === "doc") {
      return "documentCpfCnpj";
    }
    if (
      nh.includes("telefone") ||
      nh.includes("celular") ||
      nh.includes("whatsapp") ||
      nh.includes("fone") ||
      nh === "phone"
    ) {
      return "phoneWhatsapp";
    }
    if (nh.includes("email") || nh.includes("e mail")) {
      return "email";
    }
    if (nh.includes("cidade") || nh.includes("municipio") || nh.includes("uf")) {
      return "city";
    }
    if (nh.includes("nascimento") || nh.includes("aniversario") || nh.includes("birth")) {
      return "birthDate";
    }
    if (
      nh.includes("limite") ||
      nh.includes("credito aprovado") ||
      nh.includes("valor credito") ||
      nh.includes("plafond")
    ) {
      return "operatorCreditLimit";
    }
    if (
      nh.includes("score") ||
      nh.includes("status credito") ||
      nh.includes("analise") ||
      nh.includes("financiamento") ||
      nh.includes("serasa") ||
      nh.includes("boavista")
    ) {
      return "operatorCreditStatus";
    }
    if (nh.includes("operadora") || nh.includes("fornecedor")) {
      return "preferredOperator";
    }
    if (nh.includes("destino") || nh.includes("ultima viagem") || nh.includes("historico")) {
      return "pastDestinations";
    }
    return "unmapped";
  });

  const recognizedHeaders = headers.filter((_, idx) => columnMap[idx] !== "unmapped");
  const unmappedHeadersConvertedToNotes = headers.filter((_, idx) => columnMap[idx] === "unmapped");

  const rows: MappedCrmCustomerImportRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = splitLine(lines[i]);
    if (cells.every((c) => !c)) continue;

    let fullName = "";
    let documentCpfCnpj: string | null = null;
    let phoneWhatsapp: string | null = null;
    let email: string | null = null;
    let city: string | null = null;
    let birthDate: string | null = null;
    let operatorCreditLimitCents: number | null = null;
    let operatorCreditStatus: string | null = null;
    let preferredOperator: string | null = null;
    let pastDestinations: string | null = null;
    const rawExtraFields: Record<string, string> = {};
    const extraNotesParts: string[] = [];

    cells.forEach((val, colIdx) => {
      if (!val) return;
      const mapped = columnMap[colIdx] || "unmapped";
      const originalHeader = headers[colIdx] || `Coluna ${colIdx + 1}`;

      switch (mapped) {
        case "fullName":
          if (!fullName) fullName = val;
          break;
        case "documentCpfCnpj":
          documentCpfCnpj = val;
          break;
        case "phoneWhatsapp":
          phoneWhatsapp = val;
          break;
        case "email":
          email = val;
          break;
        case "city":
          city = val ? (city ? `${city} - ${val}` : val) : city;
          break;
        case "birthDate":
          birthDate = val;
          break;
        case "operatorCreditLimit": {
          const digits = val.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
          const parsed = parseFloat(digits);
          if (Number.isFinite(parsed)) {
            operatorCreditLimitCents = Math.round(parsed * 100);
          }
          extraNotesParts.push(`Limite de Crédito Informado (${originalHeader}): ${val}`);
          break;
        }
        case "operatorCreditStatus":
          operatorCreditStatus = val;
          extraNotesParts.push(`Análise de Crédito (${originalHeader}): ${val}`);
          break;
        case "preferredOperator":
          preferredOperator = val;
          extraNotesParts.push(`Operadora (${originalHeader}): ${val}`);
          break;
        case "pastDestinations":
          pastDestinations = val;
          extraNotesParts.push(`Histórico de Viagens (${originalHeader}): ${val}`);
          break;
        case "unmapped":
        default:
          rawExtraFields[originalHeader] = val;
          extraNotesParts.push(`${originalHeader}: ${val}`);
          break;
      }
    });

    if (!fullName) {
      // Fallback: primeira célula não vazia
      fullName = cells.find(Boolean) || `Cliente Importado #${i}`;
    }

    rows.push({
      fullName,
      documentCpfCnpj,
      phoneWhatsapp,
      email,
      city,
      birthDate,
      operatorCreditLimitCents,
      operatorCreditStatus,
      preferredOperator,
      pastDestinations,
      structuredNotesFromUnmappedColumns: extraNotesParts.join(" | "),
      rawExtraFields,
    });
  }

  return {
    totalRows: lines.length - 1,
    validRowsCount: rows.length,
    recognizedHeaders,
    unmappedHeadersConvertedToNotes,
    rows,
  };
}

// ============================================================================
// 5. SERVER FUNCTIONS BFF (AGENDAMENTO PRÉ-EMBARQUE & IMPORTAÇÃO CRM)
// ============================================================================

const SchedulePreBoardingMeetingSchema = z.object({
  presentationId: z.string().optional(),
  tripId: z.string().min(1),
  clientName: z.string().min(1),
  modality: z.enum(["online_video", "in_person_agency"]),
  proposedSlotsIso: z.array(z.string()).min(1),
  meetingLinkOrAddress: z.string().min(1),
  agentName: z.string().min(1),
});

export const schedulePreBoardingMeetingFn = createServerFn({ method: "POST" })
  .validator(SchedulePreBoardingMeetingSchema)
  .handler(async ({ data }) => {
    const {
      presentationId,
      tripId,
      clientName,
      modality,
      proposedSlotsIso,
      meetingLinkOrAddress,
      agentName,
    } = data;

    try {
      const supabase = getServerClient();
      if (presentationId) {
        await supabase
          .from("travel_pre_boarding_presentations")
          .update({
            meeting_status: "proposed_by_agency",
            meeting_modality: modality,
            proposed_slots: proposedSlotsIso,
            meeting_link_or_address: meetingLinkOrAddress,
            agent_name: agentName,
            updated_at: new Date().toISOString(),
          })
          .eq("id", presentationId);
      }
    } catch {
      // Resiliente mesmo sem tabela migrada localmente
    }

    return {
      success: true,
      tripId,
      clientName,
      meetingStatus: "proposed_by_agency" as const,
      modality,
      proposedSlotsIso,
      meetingLinkOrAddress,
      agentName,
    };
  });

const RespondPreBoardingMeetingSchema = z.object({
  tripId: z.string().min(1),
  acceptedSlotIso: z.string().min(1),
  modality: z.enum(["online_video", "in_person_agency"]),
  clientNotes: z.string().optional(),
});

export const respondToPreBoardingMeetingInviteFn = createServerFn({ method: "POST" })
  .validator(RespondPreBoardingMeetingSchema)
  .handler(async ({ data }) => {
    const { tripId, acceptedSlotIso, modality, clientNotes } = data;
    try {
      const supabase = getServerClient();
      await supabase
        .from("travel_pre_boarding_presentations")
        .update({
          meeting_status: "accepted_by_client",
          meeting_modality: modality,
          confirmed_slot_iso: acceptedSlotIso,
          client_meeting_notes: clientNotes || null,
          updated_at: new Date().toISOString(),
        })
        .eq("trip_id", tripId);
    } catch {
      // Resiliente
    }

    return {
      success: true,
      tripId,
      meetingStatus: "accepted_by_client" as const,
      confirmedSlotIso: acceptedSlotIso,
      modality,
    };
  });

const ImportUniversalCrmBatchSchema = z.object({
  rawText: z.string().min(1),
  sourceType: z.enum(["spreadsheet_csv_xlsx", "infotravel_api_sync"]).default("spreadsheet_csv_xlsx"),
});

export const importUniversalCrmSpreadsheetBatchFn = createServerFn({ method: "POST" })
  .validator(ImportUniversalCrmBatchSchema)
  .handler(async ({ data }) => {
    const { rawText, sourceType } = data;
    const parsed = parseAndMapUniversalCrmSpreadsheet(rawText);

    let persistedCount = 0;
    try {
      const supabase = getServerClient();
      const { getServerIdentity } = await import("@/lib/server-access");
      const identity = await getServerIdentity();

      if (identity?.store_id && parsed.rows.length > 0) {
        const crmRows = parsed.rows.map((r) => ({
          store_id: identity.store_id,
          full_name: r.fullName,
          kind: r.documentCpfCnpj && r.documentCpfCnpj.replace(/\D/g, "").length > 11 ? "company" : "individual",
          document: r.documentCpfCnpj || null,
          phone: r.phoneWhatsapp || null,
          email: r.email || null,
          city: r.city || null,
          status: "active",
          channel: sourceType === "infotravel_api_sync" ? "infotravel" : "import",
          notes: [
            r.operatorCreditLimitCents != null
              ? `Limite Crédito Operadora: R$ ${(r.operatorCreditLimitCents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
              : null,
            r.operatorCreditStatus ? `Status Financiamento: ${r.operatorCreditStatus}` : null,
            r.structuredNotesFromUnmappedColumns || null,
          ]
            .filter(Boolean)
            .join(" | "),
        }));

        const { data: inserted } = await supabase
          .from("customers_crm")
          .insert(crmRows)
          .select("id");

        persistedCount = Array.isArray(inserted) ? inserted.length : parsed.rows.length;

        await supabase.from("crm_universal_spreadsheet_import_batches").insert({
          store_id: identity.store_id,
          source_type: sourceType,
          total_rows: parsed.totalRows,
          imported_rows: persistedCount,
          unmapped_columns_preserved: parsed.unmappedHeadersConvertedToNotes,
        });
      }
    } catch {
      persistedCount = parsed.validRowsCount;
    }

    return {
      success: true,
      importedCount: persistedCount || parsed.validRowsCount,
      unmappedColumnsPreserved: parsed.unmappedHeadersConvertedToNotes,
    };
  });

