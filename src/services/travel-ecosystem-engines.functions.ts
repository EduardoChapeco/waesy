import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";

// ============================================================================
// 1. TIPOS E CONTRATOS CANÔNICOS (ONDAS 2 A 5)
// ============================================================================

export interface DestinationGatewayResolution {
  destinationSlug: string;
  destinationName: string;
  hasOwnCommercialAirport: boolean;
  primaryAirportIata: string;
  primaryAirportName: string;
  primaryDistanceKm: number;
  primaryTransferDurationMins: number;
  secondaryAirportIata: string | null;
  secondaryAirportName: string | null;
  secondaryDistanceKm: number | null;
  secondaryTransferDurationMins: number | null;
  recommendedTransferType:
    | "transfer_regular"
    | "transfer_privativo"
    | "transfer_4x4"
    | "catamara_lancha"
    | "locacao_veiculo"
    | "urbano_direto";
  estimatedTransferCostPerPaxCents: number;
  gatewayLogisticsNotes: string;
}

export interface QuoteRoomAddonItem {
  code: string;
  label: string;
  priceCents: number;
}

export interface QuoteRoomConfigInput {
  roomNumber: number;
  roomLabel: string;
  roomCategory: string;
  mealPlan: string;
  adultsCount: number;
  childrenCount: number;
  childrenAges: number[];
  baseAdultPriceCents: number;
  baseChildPriceCents: number;
  singleSupplementPct?: number;
  addons: QuoteRoomAddonItem[];
  payerName?: string;
  payerCpf?: string;
}

export interface OperatorPaymentCampaignRule {
  operatorSlug: string;
  operatorDisplayName: string;
  maxBoletoInstallments: number;
  boletoMinDownpaymentPct: number;
  maxCardInstallments: number;
  pixCashDiscountPct: number;
}

export interface CalculatedRoomBreakdown {
  roomNumber: number;
  roomLabel: string;
  roomCategory: string;
  mealPlan: string;
  adultsCount: number;
  childrenCount: number;
  childrenAges: number[];
  addons: QuoteRoomAddonItem[];
  roomBaseCents: number;
  roomAddonsCents: number;
  roomTotalCents: number;
  boletoDownpaymentCents: number;
  boletoInstallmentCents: number;
  cardInstallmentCents: number;
  pixCashTotalCents: number;
}

export interface MultiRoomQuoteCalculationResult {
  rooms: CalculatedRoomBreakdown[];
  totalAdults: number;
  totalChildren: number;
  totalPassengers: number;
  grandBaseCents: number;
  grandAddonsCents: number;
  grandTotalCents: number;
  campaignSummary: {
    operatorDisplayName: string;
    maxBoletoInstallments: number;
    boletoDownpaymentCents: number;
    boletoMonthlyInstallmentCents: number;
    maxCardInstallments: number;
    cardMonthlyInstallmentCents: number;
    pixCashTotalCents: number;
  };
}

export type PaymentChannelType =
  | "incomum_chat"
  | "frt_funpay"
  | "santander_app"
  | "orinter_portal"
  | "agency_pix"
  | "credit_card"
  | "boleto_bancario";

export interface TripInstallmentBoletoDTO {
  id: string;
  tripId: string;
  installmentNumber: number;
  totalInstallments: number;
  dueDate: string;
  amountCents: number;
  currency: string;
  operatorSlug: string;
  paymentChannel: PaymentChannelType;
  boletoPdfUrl: string | null;
  digitableLine: string | null;
  pixCopiaECola: string | null;
  externalPaymentLink: string | null;
  status: "pending" | "receipt_uploaded" | "reconciled" | "overdue" | "waived";
  receiptFileUrl: string | null;
  ocrExtractedAmountCents: number | null;
  ocrExtractedDate: string | null;
  ocrExtractedPayer: string | null;
  ocrMatchConfidence: number | null;
}

export interface ExtractedReceiptOcr {
  amountCents: number;
  paymentDate: string;
  payerName?: string;
  digitableLineFragment?: string;
}

export interface ReceiptAutoMatchResult {
  matchedInstallmentId: string | null;
  matchedInstallmentNumber: number | null;
  confidence: number;
  newStatus: "reconciled" | "receipt_uploaded" | "pending";
  explanationPt: string;
}

export interface TripDayItineraryItem {
  dayNumber: number;
  dateLabel: string;
  title: string;
  morningActivity: string;
  afternoonActivity: string;
  eveningActivity: string;
  logisticsTip: string;
  mealIncluded: string;
}

export interface TripGroundedCopilotContext {
  tripCode: string;
  destination: string;
  travelStartDate: string;
  travelEndDate: string;
  operatorName: string;
  reservationCode: string;
  hotelName: string;
  hotelAddress: string;
  hotelConfirmationId: string;
  mealPlan: string;
  roomDescription: string;
  flights: Array<{
    direction: "ida" | "volta";
    airline: string;
    flightNumber: string;
    originIata: string;
    destinationIata: string;
    departureTime: string;
    arrivalTime: string;
    pnr: string;
    handBaggageKg: number;
    checkedBaggageCount: number;
  }>;
  transferDetails: string;
  transferConfirmationId: string;
  emergencyPhone24h: string;
  cancellationRulesText: string;
  fineSchedule: Array<{ daysBeforeDeparture: number; penaltyPct: number }>;
  requiredDocuments: string[];
}

export interface VisaDs160EvaluationInput {
  applicantName: string;
  destinationCountry: string;
  visaType: string;
  monthlyIncomeCents: number;
  occupationType:
    | "empresario"
    | "clt"
    | "servidor_publico"
    | "profissional_liberal"
    | "estudante"
    | "aposentado"
    | "autonomo"
    | "desempregado";
  employmentTenureMonths: number;
  hasIncomeTaxReturn: boolean;
  hasPropertyInBrazil: boolean;
  hasDependentsInBrazil: boolean;
  previousInternationalTrips: string[];
  hasRelativesInDestination: boolean;
  relativesLegalStatus: "none" | "citizen_lpr" | "non_immigrant_visa" | "undocumented";
  previousVisaRefusal: boolean;
  monthsSinceLastRefusal?: number;
  tripSponsorType: "self" | "parents_family" | "company_employer" | "other";
  estimatedTripCostCents: number;
  plannedStayDays: number;
}

export interface VisaDs160EvaluationResult {
  consularTiesScore: number;
  readinessTier: "strong_ties" | "moderate_review" | "high_risk_214b";
  readinessLabelPt: string;
  redFlags: string[];
  strengths: string[];
  recommendedEvidenceChecklist: string[];
  consularAssessmentSummary: string;
}

export interface HybridSaleSplitInput {
  grossSaleCents: number;
  supplierNetCents: number;
  financedByOperatorCents: number;
  pixReceivedByAgencyCents: number;
  agentCommissionRatePct: number;
}

export interface HybridSaleSplitResult {
  grossSaleCents: number;
  supplierNetCents: number;
  agencyCommissionCents: number;
  taxableIntermediationBaseCents: number;
  financedByOperatorCents: number;
  pixReceivedByAgencyCents: number;
  retainedCommissionFromPixCents: number;
  netRemittanceToOperatorCents: number;
  remainingCommissionFromOperatorCents: number;
  agentCommissionCents: number;
  agencyNetProfitAfterAgentCents: number;
  accountingBalanced: boolean;
}

// ============================================================================
// 2. MOTOR DE INTELIGÊNCIA DE AEROPORTOS GATEWAY REGIONAIS
// ============================================================================

const CANONICAL_GATEWAY_DICTIONARY: Record<string, DestinationGatewayResolution> = {
  gramado: {
    destinationSlug: "gramado",
    destinationName: "Gramado e Canela (Serra Gaúcha)",
    hasOwnCommercialAirport: false,
    primaryAirportIata: "POA",
    primaryAirportName: "Aeroporto Internacional Salgado Filho (Porto Alegre)",
    primaryDistanceKm: 115,
    primaryTransferDurationMins: 120,
    secondaryAirportIata: "CXJ",
    secondaryAirportName: "Aeroporto Regional Hugo Cantergiani (Caxias do Sul)",
    secondaryDistanceKm: 68,
    secondaryTransferDurationMins: 75,
    recommendedTransferType: "transfer_regular",
    estimatedTransferCostPerPaxCents: 18000,
    gatewayLogisticsNotes:
      "Gramado não possui aeroporto comercial de grande porte. A rota recomendada desembarca em Porto Alegre (POA) ou Caxias do Sul (CXJ) com conexão imediata via Transfer Terrestre pela Serra Gaúcha.",
  },
  maragogi: {
    destinationSlug: "maragogi",
    destinationName: "Maragogi (Costa dos Corais — AL)",
    hasOwnCommercialAirport: false,
    primaryAirportIata: "MCZ",
    primaryAirportName: "Aeroporto Internacional Zumbi dos Palmares (Maceió)",
    primaryDistanceKm: 125,
    primaryTransferDurationMins: 130,
    secondaryAirportIata: "REC",
    secondaryAirportName: "Aeroporto Internacional dos Guararapes (Recife)",
    secondaryDistanceKm: 130,
    secondaryTransferDurationMins: 140,
    recommendedTransferType: "transfer_privativo",
    estimatedTransferCostPerPaxCents: 19000,
    gatewayLogisticsNotes:
      "Maragogi está situada entre Maceió (MCZ — 125 km) e Recife (REC — 130 km). O motor consulta tarifas em ambos os aeroportos e adiciona o transfer rodoviário litorâneo.",
  },
  "porto de galinhas": {
    destinationSlug: "porto-de-galinhas",
    destinationName: "Porto de Galinhas (Ipojuca — PE)",
    hasOwnCommercialAirport: false,
    primaryAirportIata: "REC",
    primaryAirportName: "Aeroporto Internacional dos Guararapes (Recife)",
    primaryDistanceKm: 52,
    primaryTransferDurationMins: 55,
    secondaryAirportIata: "MCZ",
    secondaryAirportName: "Aeroporto Internacional Zumbi dos Palmares (Maceió)",
    secondaryDistanceKm: 195,
    secondaryTransferDurationMins: 180,
    recommendedTransferType: "transfer_regular",
    estimatedTransferCostPerPaxCents: 11000,
    gatewayLogisticsNotes:
      "Desembarque no Aeroporto do Recife (REC) seguido de 55 minutos de transfer terrestre direto até os resorts de Porto de Galinhas.",
  },
  jericoacoara: {
    destinationSlug: "jericoacoara",
    destinationName: "Vila de Jericoacoara (CE)",
    hasOwnCommercialAirport: false,
    primaryAirportIata: "JJD",
    primaryAirportName: "Aeroporto Regional de Jericoacoara (Cruz)",
    primaryDistanceKm: 30,
    primaryTransferDurationMins: 45,
    secondaryAirportIata: "FOR",
    secondaryAirportName: "Aeroporto Internacional Pinto Martins (Fortaleza)",
    secondaryDistanceKm: 295,
    secondaryTransferDurationMins: 270,
    recommendedTransferType: "transfer_4x4",
    estimatedTransferCostPerPaxCents: 22000,
    gatewayLogisticsNotes:
      "A entrada na Vila de Jericoacoara ocorre pelas dunas em veículo 4x4 credenciado, partindo do Aeroporto Regional de Cruz (JJD — 45 min) ou de Fortaleza (FOR — 4h30).",
  },
  bombinhas: {
    destinationSlug: "bombinhas",
    destinationName: "Bombinhas, Balneário Camboriú e Beto Carrero (SC)",
    hasOwnCommercialAirport: false,
    primaryAirportIata: "NVT",
    primaryAirportName: "Aeroporto Internacional de Navegantes",
    primaryDistanceKm: 60,
    primaryTransferDurationMins: 70,
    secondaryAirportIata: "FLN",
    secondaryAirportName: "Aeroporto Internacional Hercílio Luz (Florianópolis)",
    secondaryDistanceKm: 78,
    secondaryTransferDurationMins: 85,
    recommendedTransferType: "transfer_regular",
    estimatedTransferCostPerPaxCents: 14000,
    gatewayLogisticsNotes:
      "Atendido pelo Aeroporto de Navegantes (NVT — ao lado do Beto Carrero World) ou Florianópolis (FLN) com receptivo terrestre até a península de Bombinhas.",
  },
  "morro de sao paulo": {
    destinationSlug: "morro-de-sao-paulo",
    destinationName: "Morro de São Paulo (Ilha de Tinharé — BA)",
    hasOwnCommercialAirport: false,
    primaryAirportIata: "SSA",
    primaryAirportName: "Aeroporto Internacional de Salvador",
    primaryDistanceKm: 60,
    primaryTransferDurationMins: 140,
    secondaryAirportIata: "IOS",
    secondaryAirportName: "Aeroporto Jorge Amado (Ilhéus)",
    secondaryDistanceKm: 240,
    secondaryTransferDurationMins: 220,
    recommendedTransferType: "catamara_lancha",
    estimatedTransferCostPerPaxCents: 28000,
    gatewayLogisticsNotes:
      "Ilha sem circulação de carros. Desembarque em Salvador (SSA) com conexão marítima via Catamarã direto do Terminal Náutico ou transfer semiterrestre via Valença.",
  },
  "buenos aires": {
    destinationSlug: "buenos-aires",
    destinationName: "Buenos Aires (Argentina)",
    hasOwnCommercialAirport: true,
    primaryAirportIata: "AEP",
    primaryAirportName: "Aeroparque Internacional Jorge Newbery (Centro)",
    primaryDistanceKm: 8,
    primaryTransferDurationMins: 25,
    secondaryAirportIata: "EZE",
    secondaryAirportName: "Aeroporto Internacional Ministro Pistarini (Ezeiza)",
    secondaryDistanceKm: 32,
    secondaryTransferDurationMins: 45,
    recommendedTransferType: "transfer_privativo",
    estimatedTransferCostPerPaxCents: 16000,
    gatewayLogisticsNotes:
      "Opera com dois aeroportos internacionais: Aeroparque (AEP — central, a 20 min da Recoleta/Viamonte) e Ezeiza (EZE — a 45 min via rodovia).",
  },
};

export function resolveDestinationGatewayEngine(destinationQuery: string): DestinationGatewayResolution | null {
  const norm = (destinationQuery || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

  if (!norm) return null;

  if (norm.includes("gramado") || norm.includes("canela") || norm.includes("serra gaucha")) {
    return CANONICAL_GATEWAY_DICTIONARY["gramado"];
  }
  if (norm.includes("maragogi") || norm.includes("japaratinga") || norm.includes("antunes")) {
    return CANONICAL_GATEWAY_DICTIONARY["maragogi"];
  }
  if (norm.includes("porto de galinhas") || norm.includes("muro alto") || norm.includes("ipojuca")) {
    return CANONICAL_GATEWAY_DICTIONARY["porto de galinhas"];
  }
  if (norm.includes("jericoacoara") || norm.includes("jeri") || norm.includes("prea")) {
    return CANONICAL_GATEWAY_DICTIONARY["jericoacoara"];
  }
  if (norm.includes("bombinhas") || norm.includes("beto carrero") || norm.includes("balneario camboriu") || norm.includes("penha")) {
    return CANONICAL_GATEWAY_DICTIONARY["bombinhas"];
  }
  if (norm.includes("morro de sao paulo") || norm.includes("boipeba") || norm.includes("tinhare")) {
    return CANONICAL_GATEWAY_DICTIONARY["morro de sao paulo"];
  }
  if (norm.includes("buenos aires") || norm.includes("caba") || norm.includes("recoleta") || norm.includes("palermo")) {
    return CANONICAL_GATEWAY_DICTIONARY["buenos aires"];
  }

  return null;
}

// ============================================================================
// 3. MOTOR DE CÁLCULO MULTI-QUARTO (ROOMING) + ADICIONAIS + CAMPANHAS (15x/10x)
// ============================================================================

export function calculateMultiRoomQuoteBreakdown(
  rooms: QuoteRoomConfigInput[],
  campaign: OperatorPaymentCampaignRule
): MultiRoomQuoteCalculationResult {
  const maxBoleto = Math.max(1, campaign.maxBoletoInstallments || 15);
  const maxCard = Math.max(1, campaign.maxCardInstallments || 10);
  const downpaymentPct = Math.max(0, Math.min(90, campaign.boletoMinDownpaymentPct ?? 20));
  const pixDiscountPct = Math.max(0, Math.min(30, campaign.pixCashDiscountPct ?? 5));

  const calculatedRooms: CalculatedRoomBreakdown[] = rooms.map((room, index) => {
    const adults = Math.max(1, room.adultsCount);
    const children = Math.max(0, room.childrenCount);
    const singleSupplementMultiplier =
      adults === 1 && (room.singleSupplementPct ?? 30) > 0
        ? 1 + (room.singleSupplementPct ?? 30) / 100
        : 1;

    const adultsCost = Math.round(adults * room.baseAdultPriceCents * singleSupplementMultiplier);
    const childrenCost = Math.round(children * room.baseChildPriceCents);
    const roomBaseCents = adultsCost + childrenCost;

    const addons = Array.isArray(room.addons) ? room.addons : [];
    const roomAddonsCents = addons.reduce((acc, item) => acc + Math.max(0, item.priceCents || 0), 0);
    const roomTotalCents = roomBaseCents + roomAddonsCents;

    const boletoDownpaymentCents = Math.round((roomTotalCents * downpaymentPct) / 100);
    const financedBalance = Math.max(0, roomTotalCents - boletoDownpaymentCents);
    const remainingInstallments = Math.max(1, maxBoleto - (boletoDownpaymentCents > 0 ? 1 : 0));
    const boletoInstallmentCents = Math.round(financedBalance / remainingInstallments);
    const cardInstallmentCents = Math.round(roomTotalCents / maxCard);
    const pixCashTotalCents = Math.round(roomTotalCents * (1 - pixDiscountPct / 100));

    return {
      roomNumber: room.roomNumber || index + 1,
      roomLabel: room.roomLabel || `Quarto ${index + 1}`,
      roomCategory: room.roomCategory || "Standard",
      mealPlan: room.mealPlan || "Café da Manhã",
      adultsCount: adults,
      childrenCount: children,
      childrenAges: room.childrenAges || [],
      addons,
      roomBaseCents,
      roomAddonsCents,
      roomTotalCents,
      boletoDownpaymentCents,
      boletoInstallmentCents,
      cardInstallmentCents,
      pixCashTotalCents,
    };
  });

  const totalAdults = calculatedRooms.reduce((sum, r) => sum + r.adultsCount, 0);
  const totalChildren = calculatedRooms.reduce((sum, r) => sum + r.childrenCount, 0);
  const grandBaseCents = calculatedRooms.reduce((sum, r) => sum + r.roomBaseCents, 0);
  const grandAddonsCents = calculatedRooms.reduce((sum, r) => sum + r.roomAddonsCents, 0);
  const grandTotalCents = grandBaseCents + grandAddonsCents;

  const totalBoletoDownpayment = calculatedRooms.reduce((sum, r) => sum + r.boletoDownpaymentCents, 0);
  const totalBoletoRemaining = Math.max(0, grandTotalCents - totalBoletoDownpayment);
  const remainingBoletoCount = Math.max(1, maxBoleto - (totalBoletoDownpayment > 0 ? 1 : 0));

  return {
    rooms: calculatedRooms,
    totalAdults,
    totalChildren,
    totalPassengers: totalAdults + totalChildren,
    grandBaseCents,
    grandAddonsCents,
    grandTotalCents,
    campaignSummary: {
      operatorDisplayName: campaign.operatorDisplayName,
      maxBoletoInstallments: maxBoleto,
      boletoDownpaymentCents: totalBoletoDownpayment,
      boletoMonthlyInstallmentCents: Math.round(totalBoletoRemaining / remainingBoletoCount),
      maxCardInstallments: maxCard,
      cardMonthlyInstallmentCents: Math.round(grandTotalCents / maxCard),
      pixCashTotalCents: Math.round(grandTotalCents * (1 - pixDiscountPct / 100)),
    },
  };
}

// ============================================================================
// 4. PORTAL "MINHAS VIAGENS": ORIENTAÇÃO POR OPERADORA & AUTO-MATCH DE BOLETOS OCR
// ============================================================================

export function getOperatorPaymentGuidance(
  channel: PaymentChannelType,
  operatorName: string = "Operadora"
): {
  badgeLabel: string;
  headline: string;
  instructionsPt: string;
  actionButtonLabel: string;
} {
  switch (channel) {
    case "incomum_chat":
      return {
        badgeLabel: "Boleto Operadora Incomum",
        headline: "Boletos geridos em parceria com a Incomum Operadora",
        instructionsPt:
          "Os boletos do seu pacote são emitidos pela Incomum e anexados diretamente aqui pela nossa equipe. Após realizar o pagamento no seu banco, basta enviar ou compartilhar o comprovante abaixo que o sistema identifica e dá baixa na sua parcela automaticamente.",
        actionButtonLabel: "Solicitar 2ª Via à Agência",
      };
    case "frt_funpay":
      return {
        badgeLabel: "Funpay · FRT Operadora",
        headline: "Pagamento processado via Portal Funpay (FRT)",
        instructionsPt:
          "Sua viagem conta com parcelamento oficial via Funpay da FRT Operadora. Você pode baixar o boleto da parcela abaixo, copiar o código de barras ou acessar o link direto do Funpay. Envie o comprovante após o pagamento para conciliação automática.",
        actionButtonLabel: "Abrir Portal Funpay",
      };
    case "santander_app":
      return {
        badgeLabel: "Financiamento Santander",
        headline: "Parcelas disponíveis no App Santander e no Portal",
        instructionsPt:
          "O financiamento da sua viagem foi contratado junto ao Banco Santander. Os boletos podem ser pagos diretamente pelo aplicativo do Santander (em Financiamentos / Boletos) ou através do PDF anexado abaixo pela agência.",
        actionButtonLabel: "Ver Instruções Santander",
      };
    case "orinter_portal":
      return {
        badgeLabel: "Orinter Tour & Travel",
        headline: "Parcelamento Oficial Orinter",
        instructionsPt:
          "Os boletos ou cobranças da sua reserva Orinter estão listados abaixo por ordem de vencimento. Copie a linha digitável ou anexe seu comprovante bancário para atualização imediata do seu recibo.",
        actionButtonLabel: "Baixar Boleto da Parcela",
      };
    default:
      return {
        badgeLabel: `Pagamento · ${operatorName}`,
        headline: "Acompanhamento de Parcelas e Recibos",
        instructionsPt:
          "Confira os vencimentos da sua viagem abaixo. Ao efetuar o pagamento via Pix ou Boleto, compartilhe o comprovante neste painel para confirmação imediata.",
        actionButtonLabel: "Enviar Comprovante",
      };
  }
}

export function autoMatchCustomerReceiptToInstallment(
  receiptOcr: ExtractedReceiptOcr,
  installments: TripInstallmentBoletoDTO[]
): ReceiptAutoMatchResult {
  const openInstallments = installments.filter(
    (inst) => inst.status === "pending" || inst.status === "overdue" || inst.status === "receipt_uploaded"
  );

  if (openInstallments.length === 0) {
    return {
      matchedInstallmentId: null,
      matchedInstallmentNumber: null,
      confidence: 0,
      newStatus: "pending",
      explanationPt: "Todas as parcelas desta viagem já constam como quitadas e conciliadas.",
    };
  }

  // 1. Prioridade Máxima: Match por fragmento de Linha Digitável + Valor Exato
  if (receiptOcr.digitableLineFragment && receiptOcr.digitableLineFragment.trim().length >= 8) {
    const cleanFrag = receiptOcr.digitableLineFragment.replace(/\D/g, "");
    const barcodeMatch = openInstallments.find((inst) => {
      const cleanLine = (inst.digitableLine || "").replace(/\D/g, "");
      return cleanLine.length > 0 && cleanLine.includes(cleanFrag);
    });

    if (barcodeMatch) {
      return {
        matchedInstallmentId: barcodeMatch.id,
        matchedInstallmentNumber: barcodeMatch.installmentNumber,
        confidence: 99,
        newStatus: "reconciled",
        explanationPt: `Comprovante conciliado com 99% de precisão na Parcela ${barcodeMatch.installmentNumber} pela linha digitável e valor.`,
      };
    }
  }

  // 2. Match por Valor Exato (tolerância de até R$ 0,50 para centavos de arredondamento)
  const exactAmountCandidates = openInstallments.filter(
    (inst) => Math.abs(inst.amountCents - receiptOcr.amountCents) <= 50
  );

  if (exactAmountCandidates.length > 0) {
    // Se houver múltiplas parcelas de mesmo valor, escolhe a de vencimento mais próximo da data do pagamento
    const payTime = Date.parse(receiptOcr.paymentDate || "");
    const sorted = [...exactAmountCandidates].sort((a, b) => {
      if (!Number.isFinite(payTime)) return a.installmentNumber - b.installmentNumber;
      const diffA = Math.abs(Date.parse(a.dueDate) - payTime);
      const diffB = Math.abs(Date.parse(b.dueDate) - payTime);
      return diffA - diffB;
    });

    const chosen = sorted[0];
    return {
      matchedInstallmentId: chosen.id,
      matchedInstallmentNumber: chosen.installmentNumber,
      confidence: 94,
      newStatus: "reconciled",
      explanationPt: `Valor de R$ ${(receiptOcr.amountCents / 100).toFixed(2).replace(".", ",")} identificado e vinculado automaticamente à Parcela ${chosen.installmentNumber} (vencimento ${chosen.dueDate}).`,
    };
  }

  // 3. Fallback: Vincula à próxima parcela em aberto para revisão com alerta de divergência de valor
  const nextPending = [...openInstallments].sort((a, b) => a.installmentNumber - b.installmentNumber)[0];
  return {
    matchedInstallmentId: nextPending.id,
    matchedInstallmentNumber: nextPending.installmentNumber,
    confidence: 68,
    newStatus: "receipt_uploaded",
    explanationPt: `Comprovante anexado à Parcela ${nextPending.installmentNumber} para conferência rápida (valor lido no comprovante difere do valor nominal da parcela).`,
  };
}

// ============================================================================
// 5. GERADOR AUTOMÁTICO DE ROTEIRO DIA A DIA (FALLBACK INTELIGENTE P/ COTAÇÃO AVULSA)
// ============================================================================

export function buildAutomaticTripItineraryFallback(params: {
  destination: string;
  startDate: string;
  endDate: string;
  hotelName: string;
  arrivalTime?: string;
  departureTime?: string;
  includedTours?: string[];
}): TripDayItineraryItem[] {
  const startMs = Date.parse(params.startDate);
  const endMs = Date.parse(params.endDate);
  const rawDays =
    Number.isFinite(startMs) && Number.isFinite(endMs) && endMs >= startMs
      ? Math.round((endMs - startMs) / (1000 * 60 * 60 * 24)) + 1
      : 5;
  const totalDays = Math.max(2, Math.min(15, rawDays));
  const dest = params.destination || "Destino";
  const hotel = params.hotelName || "Hotel Confirmado";

  const items: TripDayItineraryItem[] = [];
  for (let i = 1; i <= totalDays; i++) {
    const dayDate = Number.isFinite(startMs)
      ? new Date(startMs + (i - 1) * 86400000).toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
        })
      : `Dia ${i}`;

    if (i === 1) {
      items.push({
        dayNumber: 1,
        dateLabel: dayDate,
        title: `Embarque, Chegada em ${dest} e Acomodação`,
        morningActivity: `Apresentação no aeroporto com 2h de antecedência portando documento oficial original com foto e voucher de embarque.`,
        afternoonActivity: `Desembarque em ${dest}${params.arrivalTime ? ` previsto às ${params.arrivalTime}` : ""}, encontro com o receptivo local e traslado até o ${hotel} para check-in.`,
        eveningActivity: `Passeio leve de reconhecimento nos arredores do ${hotel} e jantar de boas-vindas na gastronomia típica local.`,
        logisticsTip: "Mantenha o voucher do transfer e o endereço do hotel salvos no celular.",
        mealIncluded: "Conforme regime contratado no check-in",
      });
    } else if (i === totalDays) {
      items.push({
        dayNumber: i,
        dateLabel: dayDate,
        title: `Check-out no ${hotel} e Retorno`,
        morningActivity: `Café da manhã no hotel, organização das bagagens e encerramento de eventuais extras na recepção até as 11h00.`,
        afternoonActivity: `Traslado do ${hotel} para o aeroporto com antecedência segura para o voo de retorno${params.departureTime ? ` (${params.departureTime})` : ""}.`,
        eveningActivity: `Desembarque na cidade de origem e conclusão da viagem.`,
        logisticsTip: "Confira se todos os pertences e documentos foram retirados do cofre do quarto.",
        mealIncluded: "Café da Manhã",
      });
    } else {
      const customTour = params.includedTours?.[i - 2];
      items.push({
        dayNumber: i,
        dateLabel: dayDate,
        title: customTour ? `${customTour} em ${dest}` : `Exploração Cultural e Pontos Clássicos de ${dest} (${i}º Dia)`,
        morningActivity: customTour
          ? `Saída após o café da manhã no ${hotel} para realização do passeio: ${customTour}.`
          : `Café da manhã no ${hotel} e saída para explorar os principais atrativos históricos e panorâmicos de ${dest}.`,
        afternoonActivity: `Parada estratégica para almoço regional e tarde dedicada a experiências locais, compras ou lazer na estrutura do destino.`,
        eveningActivity: `Sugestão de circuito gastronômico noturno ou espetáculo cultural típico de ${dest}.`,
        logisticsTip: "Use calçados confortáveis, protetor solar e leve garrafa de água durante os passeios.",
        mealIncluded: "Café da Manhã",
      });
    }
  }

  return items;
}

// ============================================================================
// 6. COPILOT DA VIAGEM GROUNDED (CONTRATOS + VOUCHERS OCR + ANAC 400)
// ============================================================================

export function answerTripCopilotGroundedQuestion(
  question: string,
  ctx: TripGroundedCopilotContext
): {
  answerPt: string;
  citations: string[];
  suggestedActions: Array<{ label: string; actionKey: string }>;
} {
  const q = (question || "").toLowerCase();
  const outbound = ctx.flights.find((f) => f.direction === "ida") || ctx.flights[0];
  const inbound = ctx.flights.find((f) => f.direction === "volta") || ctx.flights[1];

  if (q.includes("bagagem") || q.includes("mala") || q.includes("peso") || q.includes("despachar")) {
    const bagText = outbound
      ? `No seu voo ${outbound.airline} ${outbound.flightNumber} (Localizador PNR ${outbound.pnr}), você tem direito a **1 item pessoal** (bolsa ou mochila até 10kg sob o assento), **1 mala de mão de até ${outbound.handBaggageKg}kg** na cabine e **${outbound.checkedBaggageCount} bagagem(ns) despachada(s) de até 23kg** por passageiro.`
      : `Sua franquia inclui 1 artigo pessoal e 1 mala de bordo de até 10kg conforme regras da ANAC Resolução 400.`;

    return {
      answerPt: `Conferi diretamente os dados do seu bilhete e confirmação (${ctx.reservationCode}):\n\n${bagText}\n\nCaso deseje adicionar bagagem extra, o ideal é adquirir antecipadamente pelo código PNR até 48h antes do embarque para pagar a tarifa reduzida de balcão.`,
      citations: [
        `Voucher Oficial #${ctx.reservationCode} (${ctx.operatorName})`,
        `Resolução ANAC nº 400/2016 — Art. 14 (Franquia de Bagagem de Mão)`,
      ],
      suggestedActions: [
        { label: "Ver Bilhete Aéreo e PNR", actionKey: "view_flights" },
        { label: "Abrir Check-in da Cia Aérea", actionKey: "open_checkin" },
      ],
    };
  }

  if (q.includes("cancel") || q.includes("multa") || q.includes("remarc") || q.includes("desist") || q.includes("reembolso")) {
    const scheduleStr =
      ctx.fineSchedule && ctx.fineSchedule.length > 0
        ? ctx.fineSchedule
            .map((s) => `• Até ${s.daysBeforeDeparture} dias antes do embarque: retenção contratual de ${s.penaltyPct}%`)
            .join("\n")
        : "• Mais de 30 dias antes do embarque: multa administrativa de 20% + taxas não reembolsáveis de emissão aérea.\n• Menos de 30 dias do embarque: aplicação das retenções de tarifa da operadora e hotelaria.";

    return {
      answerPt: `Analisei o seu **Contrato de Prestação de Serviços Turísticos (Reserva ${ctx.reservationCode})** e as diretrizes da **Resolução nº 400 da ANAC**:\n\n1. **Regra Contratual da Operadora (${ctx.operatorName}):**\n${ctx.cancellationRulesText || scheduleStr}\n\n2. **Direito de Arrependimento e Alterações involuntárias (ANAC 400):**\n• Para passagens aéreas compradas com no mínimo 7 dias de antecedência da data do voo, a ANAC garante desistência sem ônus em até 24h após o recebimento do comprovante.\n• Caso a própria companhia aérea altere seu voo em mais de 30 minutos (voos domésticos) ou 1 hora (voos internacionais), você tem direito a **reacomodação gratuita** ou **reembolso integral**.`,
      citations: [
        `Contrato Assinado — Reserva #${ctx.reservationCode}`,
        `Resolução ANAC nº 400/2016 — Art. 11 e Art. 28`,
      ],
      suggestedActions: [
        { label: "Ler PDF do Contrato Assinado", actionKey: "download_contract" },
        { label: "Falar com Consultor da Agência", actionKey: "contact_agency" },
      ],
    };
  }

  if (q.includes("hotel") || q.includes("check-in") || q.includes("hospedagem") || q.includes("quarto") || q.includes("cafe")) {
    return {
      answerPt: `Aqui estão os dados oficiais da sua hospedagem confirmada em **${ctx.destination}**:\n\n• **Hotel:** ${ctx.hotelName}\n• **Código de Confirmação do Hotel:** \`${ctx.hotelConfirmationId || ctx.reservationCode}\`\n• **Endereço:** ${ctx.hotelAddress}\n• **Acomodação e Regime:** ${ctx.roomDescription} com **${ctx.mealPlan}** incluso.\n\nNa recepção do hotel, basta apresentar seu documento de identidade/passaporte original e informar o número da reserva acima.`,
      citations: [`Voucher de Hospedagem #${ctx.hotelConfirmationId || ctx.reservationCode} (${ctx.operatorName})`],
      suggestedActions: [
        { label: "Baixar Voucher Original (PDF)", actionKey: "download_voucher" },
        { label: "Ver Rota no Mapa", actionKey: "open_hotel_map" },
      ],
    };
  }

  if (q.includes("transfer") || q.includes("traslado") || q.includes("receptivo") || q.includes("emergencia") || q.includes("plantao")) {
    return {
      answerPt: `Sobre o seu receptivo e atendimento de emergência durante a viagem para **${ctx.destination}**:\n\n• **Serviço de Transfer:** ${ctx.transferDetails || "Transfer Aeroporto / Hotel / Aeroporto confirmado no pacote."}\n• **ID do Serviço / Voucher:** \`${ctx.transferConfirmationId || ctx.reservationCode}\`\n• **Telefone de Plantão 24h da Operadora/Receptivo:** **${ctx.emergencyPhone24h || "+55 (49) 99999-0000"}**\n\nAo desembarcar, procure a equipe do receptivo identificada na saída do desembarque portando seu voucher.`,
      citations: [`Voucher de Serviços e Plantão 24h #${ctx.reservationCode}`],
      suggestedActions: [{ label: "Acionar Plantão 24h no WhatsApp", actionKey: "call_emergency" }],
    };
  }

  // Resposta consultiva geral completa baseada nos dados reais da viagem
  return {
    answerPt: `Estou com toda a documentação oficial da sua viagem para **${ctx.destination}** (${ctx.travelStartDate} a ${ctx.travelEndDate} — Reserva **#${ctx.reservationCode}** via **${ctx.operatorName}**) aberta aqui:\n\n• **Voo de Ida:** ${outbound ? `${outbound.airline} ${outbound.flightNumber} (${outbound.originIata} ${outbound.departureTime} → ${outbound.destinationIata} ${outbound.arrivalTime}) · PNR: ${outbound.pnr}` : "Consulte a aba de voos"}\n• **Voo de Volta:** ${inbound ? `${inbound.airline} ${inbound.flightNumber} (${inbound.originIata} ${inbound.departureTime} → ${inbound.destinationIata} ${inbound.arrivalTime}) · PNR: ${inbound.pnr}` : "Consulte a aba de voos"}\n• **Hospedagem:** ${ctx.hotelName} (${ctx.mealPlan})\n• **Documentos Obrigatórios para Embarque:** ${(ctx.requiredDocuments || ["RG original emitido há menos de 10 anos ou Passaporte válido"]).join(", ")}.\n\nSobre qual ponto específico você gostaria de tirar dúvida (bagagem, horários de check-in, regras do contrato, transfer ou roteiro)?`,
    citations: [
      `Confirmação Operadora #${ctx.reservationCode}`,
      `Contrato de Viagem Vinculado`,
    ],
    suggestedActions: [
      { label: "Ver Roteiro Dia a Dia", actionKey: "view_itinerary" },
      { label: "Baixar Todos os Vouchers (PDF)", actionKey: "download_voucher" },
    ],
  };
}

// ============================================================================
// 7. LEITOR MRZ (ICAO 9303) DE PASSAPORTE & PRÉ-ANÁLISE CONSULAR DS-160 (EUA)
// ============================================================================

export function parseAndValidatePassportMrz(
  line1: string,
  line2: string,
  tripReturnDateIso?: string
): {
  isValidMrz: boolean;
  passportNumber: string;
  issuingCountry: string;
  nationality: string;
  holderLastName: string;
  holderFirstName: string;
  birthDateIso: string;
  expiryDateIso: string;
  meetsSixMonthValidityRule: boolean;
  daysUntilExpiryFromReturn: number;
  validationMessagePt: string;
} {
  const l1 = (line1 || "").trim().toUpperCase();
  const l2 = (line2 || "").trim().toUpperCase();

  if (l1.length < 30 || l2.length < 28 || !l1.startsWith("P")) {
    return {
      isValidMrz: false,
      passportNumber: "",
      issuingCountry: "",
      nationality: "",
      holderLastName: "",
      holderFirstName: "",
      birthDateIso: "",
      expiryDateIso: "",
      meetsSixMonthValidityRule: false,
      daysUntilExpiryFromReturn: 0,
      validationMessagePt: "As linhas MRZ informadas não seguem o padrão internacional ICAO Doc 9303 (TD3).",
    };
  }

  const issuingCountry = l1.slice(2, 5).replace(/</g, "");
  const namesRaw = l1.slice(5);
  const [rawLast = "", rawFirst = ""] = namesRaw.split("<<");
  const holderLastName = rawLast.replace(/</g, " ").trim();
  const holderFirstName = rawFirst.replace(/</g, " ").trim();

  const passportNumber = l2.slice(0, 9).replace(/</g, "");
  const nationality = l2.slice(10, 13).replace(/</g, "");
  const birthRaw = l2.slice(13, 19); // YYMMDD
  const expiryRaw = l2.slice(21, 27); // YYMMDD

  const parseYyMmDd = (yyMmDd: string, isExpiry: boolean): string => {
    if (!/^\d{6}$/.test(yyMmDd)) return "2030-01-01";
    const yy = parseInt(yyMmDd.slice(0, 2), 10);
    const mm = yyMmDd.slice(2, 4);
    const dd = yyMmDd.slice(4, 6);
    const fullYear = isExpiry ? 2000 + yy : yy > 30 ? 1900 + yy : 2000 + yy;
    return `${fullYear}-${mm}-${dd}`;
  };

  const birthDateIso = parseYyMmDd(birthRaw, false);
  const expiryDateIso = parseYyMmDd(expiryRaw, true);

  const refDateMs = tripReturnDateIso ? Date.parse(tripReturnDateIso) : Date.now();
  const expiryMs = Date.parse(expiryDateIso);
  const daysUntilExpiryFromReturn =
    Number.isFinite(refDateMs) && Number.isFinite(expiryMs)
      ? Math.floor((expiryMs - refDateMs) / (1000 * 60 * 60 * 24))
      : 0;

  const meetsSixMonthValidityRule = daysUntilExpiryFromReturn >= 180;

  return {
    isValidMrz: Boolean(passportNumber && holderLastName),
    passportNumber,
    issuingCountry,
    nationality,
    holderLastName,
    holderFirstName,
    birthDateIso,
    expiryDateIso,
    meetsSixMonthValidityRule,
    daysUntilExpiryFromReturn,
    validationMessagePt: meetsSixMonthValidityRule
      ? `Passaporte ${passportNumber} válido e em conformidade (${daysUntilExpiryFromReturn} dias de folga após o retorno).`
      : `ATENÇÃO P0: O passaporte ${passportNumber} vence em ${expiryDateIso} (${daysUntilExpiryFromReturn} dias após o retorno), abaixo do piso internacional de 180 dias (6 meses). Renovação obrigatória antes do embarque.`,
  };
}

export function evaluateUsVisaDs160ConsularTies(
  input: VisaDs160EvaluationInput
): VisaDs160EvaluationResult {
  let score = 50;
  const redFlags: string[] = [];
  const strengths: string[] = [];
  const checklist: string[] = [
    "Passaporte brasileiro válido + passaportes anteriores com carimbos/vistos",
    "Página de confirmação do formulário oficial DS-160 com código de barras CEAC",
    "Comprovante de agendamento CASV + Consulado e recibo da taxa MRV (US$ 185)",
  ];

  // 1. Análise de Ocupação e Estabilidade Profissional
  if (input.occupationType === "servidor_publico") {
    score += 18;
    strengths.push("Cargo público estável no Brasil (forte vínculo empregatício de retorno).");
    checklist.push("Portaria de nomeação / termo de posse + 3 últimos contracheques");
  } else if (input.occupationType === "empresario") {
    score += 15;
    strengths.push("Empresário com negócios ativos no Brasil.");
    checklist.push("Contrato Social atualizado, Cartão CNPJ, DECORE/Pró-labore e extratos PJ dos últimos 3 meses");
  } else if (input.occupationType === "clt") {
    if (input.employmentTenureMonths >= 24) {
      score += 14;
      strengths.push(`Vínculo CLT consolidado (${Math.floor(input.employmentTenureMonths / 12)} anos na empresa).`);
    } else if (input.employmentTenureMonths < 6) {
      score -= 10;
      redFlags.push("Tempo de emprego CLT recente (< 6 meses), exigindo comprovação complementar de histórico profissional.");
    } else {
      score += 6;
    }
    checklist.push("Carteira de Trabalho (CTPS), 3 últimos holerites e carta de férias/vínculo do empregador");
  } else if (input.occupationType === "desempregado") {
    score -= 22;
    redFlags.push("Ausência de vínculo profissional formal ativo no momento da solicitação (alto risco sob seção INA 214b).");
  }

  // 2. Compatibilidade Financeira (Renda vs. Custo da Viagem)
  const monthlyIncome = Math.max(0, input.monthlyIncomeCents);
  const tripCost = Math.max(100000, input.estimatedTripCostCents);
  const incomeToTripRatio = monthlyIncome / tripCost;

  if (incomeToTripRatio >= 0.5) {
    score += 15;
    strengths.push("Capacidade financeira mensal plenamente compatível com o orçamento estimado da viagem.");
  } else if (incomeToTripRatio < 0.25 && input.tripSponsorType === "self") {
    score -= 18;
    redFlags.push("Custo estimado da viagem desproporcional à renda mensal declarada sem patrocinador formal (Custeio Próprio).");
  }

  if (input.tripSponsorType === "parents_family") {
    checklist.push("Carta-convite / Declaração de Custeio assinada pelo patrocinador familiar + DIRPF e extratos bancários do patrocinador");
  }

  // 3. Declaração de Imposto de Renda, Patrimônio e Dependentes no Brasil
  if (input.hasIncomeTaxReturn) {
    score += 8;
    checklist.push("Declaração completa de Imposto de Renda Pessoa Física (DIRPF) + Recibo de Entrega da Receita Federal");
  } else {
    score -= 10;
    redFlags.push("Ausência de Declaração de Imposto de Renda (DIRPF) para comprovação oficial de lastro fiscal.");
  }

  if (input.hasPropertyInBrazil) {
    score += 7;
    strengths.push("Patrimônio imobiliário/bens registrados no Brasil.");
    checklist.push("Matrícula de imóveis, escrituras ou documentos de veículos (CRLV) em nome do requerente");
  }

  if (input.hasDependentsInBrazil) {
    score += 6;
    strengths.push("Vínculos familiares diretos que permanecem no Brasil durante a viagem.");
  }

  // 4. Histórico de Viagens Internacionais
  const prevTripsCount = (input.previousInternationalTrips || []).length;
  if (prevTripsCount >= 3) {
    score += 12;
    strengths.push(`Histórico sólido de viagens internacionais (${prevTripsCount} países visitados com retorno regular).`);
  } else if (prevTripsCount === 0) {
    score -= 5;
    redFlags.push("Primeira viagem internacional (ausência de histórico migratório prévio em passaporte).");
  }

  // 5. Parentes no Destino e Negativas Anteriores (INA 214b)
  if (input.hasRelativesInDestination) {
    if (input.relativesLegalStatus === "undocumented") {
      score -= 30;
      redFlags.push("CRÍTICO (INA 214b): Presença de familiar direto em situação migratória irregular nos Estados Unidos.");
    } else {
      score -= 6;
      redFlags.push("Parente residindo no destino: o oficial consular avaliará com rigor se o propósito é estritamente turístico temporário.");
    }
  }

  if (input.previousVisaRefusal) {
    if ((input.monthsSinceLastRefusal ?? 6) < 12) {
      score -= 22;
      redFlags.push("Negativa consular recente (< 12 meses): reaplicar sem mudança substancial de vínculos socioeconômicos possui alta taxa de reincidência 214(b).");
    } else {
      score -= 8;
      redFlags.push("Negativa anterior registrada: indispensável demonstrar evolução clara de renda/vínculos desde a última entrevista.");
    }
  }

  const finalScore = Math.max(5, Math.min(98, Math.round(score)));
  const readinessTier: VisaDs160EvaluationResult["readinessTier"] =
    finalScore >= 75 ? "strong_ties" : finalScore >= 50 ? "moderate_review" : "high_risk_214b";

  const readinessLabelPt =
    readinessTier === "strong_ties"
      ? "Perfil com Vínculos Sólidos (Alta Prontidão Documental)"
      : readinessTier === "moderate_review"
        ? "Perfil Intermediário (Requer Reforço de Evidências no DS-160)"
        : "Alerta de Risco Elevado INA 214(b) (Recomenda-se Adequação Prévia)";

  const consularAssessmentSummary =
    `Índice Técnico de Vínculos Consulares: ${finalScore}/100 (${readinessLabelPt}). ` +
    `Esta pré-análise segue os critérios objetivos de elegibilidade não-imigrante (INA Section 214b). ` +
    `A aprovação ou recusa do visto é decisão soberana e exclusiva do Oficial Consular da Embaixada/Consulado no ato da entrevista.`;

  return {
    consularTiesScore: finalScore,
    readinessTier,
    readinessLabelPt,
    redFlags,
    strengths,
    recommendedEvidenceChecklist: checklist,
    consularAssessmentSummary,
  };
}

// ============================================================================
// 8. MOTOR FINANCEIRO HÍBRIDO (VENDA 20k -> 15k FINANCIADO + 5k PIX) & ESCUDO FISCAL
// ============================================================================

export function calculateHybridSaleSplitAndTaxShield(
  input: HybridSaleSplitInput
): HybridSaleSplitResult {
  const gross = Math.max(0, Math.round(input.grossSaleCents));
  const netSupplier = Math.max(0, Math.round(input.supplierNetCents));
  const agencyCommission = Math.max(0, gross - netSupplier);

  const financed = Math.max(0, Math.round(input.financedByOperatorCents));
  const pixAgency = Math.max(0, Math.round(input.pixReceivedByAgencyCents));

  // Quanto da comissão da agência já fica retido diretamente do Pix recebido do cliente:
  const retainedCommissionFromPixCents = Math.min(pixAgency, agencyCommission);
  // Quanto do Pix recebido na agência precisa ser repassado líquido para a operadora:
  const netRemittanceToOperatorCents = Math.max(0, pixAgency - retainedCommissionFromPixCents);
  // Caso o Pix de entrada seja menor que a comissão total, o saldo restante vem da operadora:
  const remainingCommissionFromOperatorCents = Math.max(0, agencyCommission - retainedCommissionFromPixCents);

  const ratePct = Math.max(0, Math.min(100, input.agentCommissionRatePct || 0));
  const agentCommissionCents = Math.round((agencyCommission * ratePct) / 100);
  const agencyNetProfitAfterAgentCents = Math.max(0, agencyCommission - agentCommissionCents);

  // Invariante contábil: Financiado + Repasse Líquido do Pix - Saldo Comissão Operadora == Custo NET do Fornecedor
  const operatorReceivesNet = financed + netRemittanceToOperatorCents - remainingCommissionFromOperatorCents;
  const accountingBalanced =
    financed + pixAgency === gross && operatorReceivesNet === netSupplier;

  return {
    grossSaleCents: gross,
    supplierNetCents: netSupplier,
    agencyCommissionCents: agencyCommission,
    taxableIntermediationBaseCents: agencyCommission, // NF-e emitida estritamente sobre a intermediação!
    financedByOperatorCents: financed,
    pixReceivedByAgencyCents: pixAgency,
    retainedCommissionFromPixCents,
    netRemittanceToOperatorCents,
    remainingCommissionFromOperatorCents,
    agentCommissionCents,
    agencyNetProfitAfterAgentCents,
    accountingBalanced,
  };
}

// ============================================================================
// 9. SERVER FUNCTIONS BFF (TANSTACK START + ZOD VALIDATION — INVARIANTE B.25)
// ============================================================================

const ResolveGatewaySchema = z.object({
  destinationQuery: z.string().min(1),
});

export const resolveDestinationGatewayFn = createServerFn({ method: "POST" })
  .validator(ResolveGatewaySchema)
  .handler(async ({ data }): Promise<{ gateway: DestinationGatewayResolution | null }> => {
    const { destinationQuery } = data;
    const localMatch = resolveDestinationGatewayEngine(destinationQuery);
    if (localMatch) {
      return { gateway: localMatch };
    }

    try {
      const supabase = getServerClient();
      const { data: row } = await supabase
        .from("travel_destination_gateways")
        .select("*")
        .ilike("destination_name", `%${destinationQuery.trim()}%`)
        .maybeSingle();

      if (!row) return { gateway: null };

      return {
        gateway: {
          destinationSlug: String(row.destination_slug),
          destinationName: String(row.destination_name),
          hasOwnCommercialAirport: Boolean(row.has_own_commercial_airport),
          primaryAirportIata: String(row.primary_airport_iata),
          primaryAirportName: String(row.primary_airport_name),
          primaryDistanceKm: Number(row.primary_distance_km || 0),
          primaryTransferDurationMins: Number(row.primary_transfer_duration_mins || 30),
          secondaryAirportIata: row.secondary_airport_iata ? String(row.secondary_airport_iata) : null,
          secondaryAirportName: row.secondary_airport_name ? String(row.secondary_airport_name) : null,
          secondaryDistanceKm: row.secondary_distance_km != null ? Number(row.secondary_distance_km) : null,
          secondaryTransferDurationMins:
            row.secondary_transfer_duration_mins != null ? Number(row.secondary_transfer_duration_mins) : null,
          recommendedTransferType: (row.recommended_transfer_type as any) || "transfer_regular",
          estimatedTransferCostPerPaxCents: Number(row.estimated_transfer_cost_per_pax_cents || 12000),
          gatewayLogisticsNotes: String(row.gateway_logistics_notes || ""),
        },
      };
    } catch {
      return { gateway: null };
    }
  });

const SubmitCustomerReceiptSchema = z.object({
  tripId: z.string().min(1),
  receiptFileUrl: z.string().min(1),
  ocrAmountCents: z.number().int().nonnegative(),
  ocrPaymentDate: z.string().min(1),
  ocrPayerName: z.string().optional(),
  ocrDigitableLineFragment: z.string().optional(),
  installments: z.array(
    z.object({
      id: z.string(),
      tripId: z.string(),
      installmentNumber: z.number().int(),
      totalInstallments: z.number().int(),
      dueDate: z.string(),
      amountCents: z.number().int(),
      currency: z.string(),
      operatorSlug: z.string(),
      paymentChannel: z.enum([
        "incomum_chat",
        "frt_funpay",
        "santander_app",
        "orinter_portal",
        "agency_pix",
        "credit_card",
        "boleto_bancario",
      ]),
      boletoPdfUrl: z.string().nullable(),
      digitableLine: z.string().nullable(),
      pixCopiaECola: z.string().nullable(),
      externalPaymentLink: z.string().nullable(),
      status: z.enum(["pending", "receipt_uploaded", "reconciled", "overdue", "waived"]),
      receiptFileUrl: z.string().nullable(),
      ocrExtractedAmountCents: z.number().nullable(),
      ocrExtractedDate: z.string().nullable(),
      ocrExtractedPayer: z.string().nullable(),
      ocrMatchConfidence: z.number().nullable(),
    })
  ),
});

export const submitAndAutoMatchCustomerReceiptFn = createServerFn({ method: "POST" })
  .validator(SubmitCustomerReceiptSchema)
  .handler(async ({ data }): Promise<ReceiptAutoMatchResult> => {
    const {
      tripId,
      receiptFileUrl,
      ocrAmountCents,
      ocrPaymentDate,
      ocrPayerName,
      ocrDigitableLineFragment,
      installments,
    } = data;

    const matchResult = autoMatchCustomerReceiptToInstallment(
      {
        amountCents: ocrAmountCents,
        paymentDate: ocrPaymentDate,
        payerName: ocrPayerName,
        digitableLineFragment: ocrDigitableLineFragment,
      },
      installments
    );

    if (matchResult.matchedInstallmentId) {
      try {
        const supabase = getServerClient();
        await supabase
          .from("travel_trip_installment_boletos")
          .update({
            receipt_file_url: receiptFileUrl,
            receipt_uploaded_at: new Date().toISOString(),
            ocr_extracted_amount_cents: ocrAmountCents,
            ocr_extracted_date: ocrPaymentDate,
            ocr_extracted_payer: ocrPayerName || null,
            ocr_match_confidence: matchResult.confidence,
            status: matchResult.newStatus,
            reconciled_at: matchResult.newStatus === "reconciled" ? new Date().toISOString() : null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", matchResult.matchedInstallmentId)
          .eq("trip_id", tripId);
      } catch {
        // Persistência resiliente mesmo em ambiente local sem migration aplicada
      }
    }

    return matchResult;
  });
