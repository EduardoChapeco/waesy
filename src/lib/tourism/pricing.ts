import { type Proposal } from "@/services/proposals";

export interface ProposalRoomBreakdownItem {
  id: string;
  roomNumber: number;
  roomType: string;
  label: string;
  adults: number;
  children: number;
  childrenAges: number[];
  totalReais: number;
  perPersonReais: number;
  boardBasis?: string;
  notes?: string;
}

export type QuoteTotals = {
  subtotal: number;
  total: number;
  descontoPixPercentual: number;
  totalPix: number;
  parcelasCartao: number;
  valorParcelaCartao: number;
  parcelasBoleto: number;
  valorParcelaBoleto: number;
  paxTotal: number;
  passageirosTotal: number;
  adultosTotal: number;
  criancasTotal: number;
  valorPorPessoa: number;
  valorPorAdulto: number;
  roomsBreakdown: ProposalRoomBreakdownItem[];
  breakdown: {
    voos: number;
    hoteis: number;
    transfers: number;
    passeios: number;
    seguro: number;
    extrasObrigatorios: number;
    extrasOpcionais: number;
  };
};

export function parsePtBrCurrencyToReais(raw: string): number {
  const clean = String(raw || "")
    .replace(/[^\d.,]/g, "")
    .trim();
  if (!clean) return 0;
  if (clean.includes(",")) {
    const normalized = clean.replace(/\./g, "").replace(",", ".");
    const num = Number(normalized);
    return Number.isFinite(num) && num >= 0 ? num : 0;
  }
  const num = Number(clean);
  return Number.isFinite(num) && num >= 0 ? num : 0;
}

export function extractLegacyRoomsFromNotes(
  notes?: string | null,
): ProposalRoomBreakdownItem[] {
  if (!notes || typeof notes !== "string") return [];
  const results: ProposalRoomBreakdownItem[] = [];
  const regex =
    /Quarto\s+(\d+)\s*(?:[—-]\s*([^(:\n]+))?\s*(?:\((\d+)\s*Adultos?(?:\s*\+\s*(\d+)\s*Crian[çc]as?)?\))?\s*:\s*R\$\s*([\d.,]+)/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(notes)) !== null) {
    const roomNumber = Math.max(1, parseInt(match[1], 10) || results.length + 1);
    const roomType = (match[2] || "Standard").trim();
    const adults = Math.max(1, parseInt(match[3], 10) || 2);
    const children = Math.max(0, parseInt(match[4], 10) || 0);
    const totalReais = parsePtBrCurrencyToReais(match[5]);
    const paxCount = Math.max(1, adults + children);
    if (totalReais > 0) {
      results.push({
        id: `legacy_room_${roomNumber}`,
        roomNumber,
        roomType,
        label: `Quarto ${roomNumber}${roomType ? ` — ${roomType}` : ""}`,
        adults,
        children,
        childrenAges: [],
        totalReais,
        perPersonReais: totalReais / paxCount,
      });
    }
  }
  return results;
}

export function extractGatewayLogisticsFromNotes(notes?: string | null): string | null {
  if (!notes || typeof notes !== "string") return null;
  const match = notes.match(/Logística Regional de Aeroporto Gateway:\s*([^\n]+)/i);
  return match?.[1]?.trim() || null;
}

export function sanitizeLegacyProposalSummaryNotes(notes?: string | null): string {
  if (!notes || typeof notes !== "string") return "";
  let cleaned = notes;
  cleaned = cleaned.replace(/Proposta de Viagem\s*\([^)]*\)\.?\s*/gi, "");
  cleaned = cleaned.replace(
    /Divis[ãa]o por Quartos:[\s\S]*?(?=Itens Inclusos:|Log[íi]stica Regional de Aeroporto Gateway:|$)/gi,
    "",
  );
  cleaned = cleaned.replace(
    /(?:•\s*)?Quarto\s+\d+\s*[—-][^\n]*?R\$\s*[\d.,]+[\s\S]*?(?=Itens Inclusos:|Log[íi]stica Regional de Aeroporto Gateway:|$)/gi,
    "",
  );
  cleaned = cleaned.replace(
    /Itens Inclusos:[\s\S]*?(?=Log[íi]stica Regional de Aeroporto Gateway:|$)/gi,
    "",
  );
  cleaned = cleaned.replace(/Log[íi]stica Regional de Aeroporto Gateway:[^\n]*/gi, "");
  return cleaned.trim();
}

export function calculateQuoteTotals(state: Partial<Proposal>): QuoteTotals {
  // Safe extraction of arrays
  const flights = state.flights || [];
  const hotels = state.hotels || [];
  const transfers = state.transfers || [];
  const tours = state.tours || [];

  // Custom payments logic (extras) - handling later if added, for now let's sum known arrays
  const customPayments = state.custom_payments || [];

  // Calculate Breakdowns
  const voos = flights.reduce((acc, f) => acc + (Number(f.price) || 0), 0);
  const hoteis = hotels.reduce((acc, h) => acc + (Number(h.price) || 0), 0);
  const transfersTotal = transfers.reduce((acc, t) => acc + (Number(t.price) || 0), 0);
  const passeios = tours.reduce((acc, t) => acc + (Number(t.price) || 0), 0);

  // Custom Payments (extras)
  // Assuming extra items have a 'price' and 'is_optional' flag.
  // If no optional flag exists yet, we assume all are mandatory.
  let extrasObrigatorios = 0;
  let extrasOpcionais = 0;

  for (const cp of customPayments) {
    const val = Number(cp.price) || 0;
    if (cp.is_optional) {
      extrasOpcionais += val;
    } else {
      extrasObrigatorios += val;
    }
  }

  // Seguro Viagem (typed, no more `as any` cast)
  const insurance = state.insurance;
  const insurancePrice = Number(insurance?.price) || 0;

  // The base Subtotal only includes mandatory items
  const lineItemsSubtotal = voos + hoteis + transfersTotal + passeios + extrasObrigatorios + insurancePrice;

  // Support canonical TravelProposalDTO.pricing (in cents) when line-item prices are not individually populated
  const dtoPricing = (state as any).pricing;
  const dtoTotalCents = Number(dtoPricing?.total_price_cents ?? dtoPricing?.total_cents ?? 0);
  const dtoBaseCents = Number(dtoPricing?.base_price_cents ?? 0);
  const dtoTaxesCents =
    Number(dtoPricing?.boarding_tax_cents ?? 0) + Number(dtoPricing?.other_taxes_cents ?? 0);
  const dtoDiscountCents = Number(dtoPricing?.discount_cents ?? 0);

  const hasDtoPricing = dtoTotalCents > 0 || dtoBaseCents > 0;
  const dtoSubtotalReais =
    dtoBaseCents + dtoTaxesCents > 0
      ? (dtoBaseCents + dtoTaxesCents) / 100
      : (dtoTotalCents + dtoDiscountCents) / 100;
  const dtoTotalReais =
    dtoTotalCents > 0
      ? dtoTotalCents / 100
      : Math.max(0, dtoSubtotalReais - dtoDiscountCents / 100);

  const subtotal =
    lineItemsSubtotal > 0
      ? lineItemsSubtotal
      : hasDtoPricing
        ? dtoSubtotalReais
        : Number(state.subtotal || state.total || 0);

  // Final Total
  const flatDiscount =
    lineItemsSubtotal > 0
      ? Number(state.discount) || 0
      : dtoDiscountCents > 0
        ? dtoDiscountCents / 100
        : Number(state.discount) || 0;
  const total =
    lineItemsSubtotal > 0
      ? Math.max(0, subtotal - flatDiscount)
      : hasDtoPricing
        ? dtoTotalReais
        : Math.max(0, Number(state.total || state.subtotal || 0) - flatDiscount);

  const installmentOptions: Array<{
    installments_count: number;
    installment_value_cents: number;
    method: string;
  }> = Array.isArray(dtoPricing?.installments_options) ? dtoPricing.installments_options : [];

  const cardOptions = installmentOptions.filter(
    (opt) => opt.method === "credit_card" || opt.method === "card",
  );
  const bestCardOption =
    cardOptions.length > 0
      ? cardOptions.reduce((prev, curr) =>
          curr.installments_count > prev.installments_count ? curr : prev,
        )
      : null;

  const boletoOptions = installmentOptions.filter((opt) => opt.method === "boleto");
  const bestBoletoOption =
    boletoOptions.length > 0
      ? boletoOptions.reduce((prev, curr) =>
          curr.installments_count > prev.installments_count ? curr : prev,
        )
      : null;

  const pixOption = installmentOptions.find((opt) => opt.method === "pix");

  // Pix Discount
  let descontoPixPercentual = Number(state.pix_discount_percent) || 0;
  if (descontoPixPercentual === 0 && subtotal > 0 && dtoDiscountCents > 0) {
    descontoPixPercentual = Math.round(((dtoDiscountCents / 100) / subtotal) * 100);
  } else if (
    descontoPixPercentual === 0 &&
    total > 0 &&
    pixOption &&
    pixOption.installment_value_cents > 0 &&
    pixOption.installment_value_cents / 100 < total
  ) {
    descontoPixPercentual = Math.round(
      ((total - pixOption.installment_value_cents / 100) / total) * 100,
    );
  }

  const pixDiscountAmount = (total * descontoPixPercentual) / 100;
  const totalPix =
    pixOption && pixOption.installment_value_cents > 0 && pixOption.installment_value_cents / 100 < total
      ? pixOption.installment_value_cents / 100
      : Math.max(0, total - pixDiscountAmount);

  // Installments
  const parcelasCartao = bestCardOption
    ? Math.max(1, bestCardOption.installments_count)
    : Math.max(1, Number(state.installments_card) || 10);
  const valorParcelaCartao =
    bestCardOption && bestCardOption.installment_value_cents > 0
      ? bestCardOption.installment_value_cents / 100
      : total / parcelasCartao;

  const parcelasBoleto = bestBoletoOption
    ? Math.max(1, bestBoletoOption.installments_count)
    : Math.max(1, Number(state.installments_boleto) || 1);
  const valorParcelaBoleto =
    bestBoletoOption && bestBoletoOption.installment_value_cents > 0
      ? bestBoletoOption.installment_value_cents / 100
      : total / parcelasBoleto;

  // Passengers
  const rawRooms: any[] = Array.isArray((state as any).rooms) ? (state as any).rooms : [];
  const rawNotesText = String(
    (state as any).raw_special_notes ||
      (state as any).special_notes ||
      state.notes ||
      (state as any).subtitle ||
      "",
  );
  const legacyRoomsFromNotes = extractLegacyRoomsFromNotes(rawNotesText);

  const roomsSumAdults = rawRooms.reduce((acc, r) => acc + (Number(r?.adults) || 0), 0);
  const roomsSumChildren = rawRooms.reduce((acc, r) => acc + (Number(r?.children) || 0), 0);

  const paxAdults =
    Number(state.pax_adults ?? (state as any).adults_count) ||
    roomsSumAdults ||
    legacyRoomsFromNotes.reduce((acc, r) => acc + r.adults, 0) ||
    0;
  const paxSeniors = Number(state.pax_seniors) || 0;
  const paxChildren =
    Number(state.pax_children ?? (state as any).children_count) ||
    roomsSumChildren ||
    legacyRoomsFromNotes.reduce((acc, r) => acc + r.children, 0) ||
    0;
  const paxInfants = Number(state.pax_infants) || 0;
  const adultosTotal = paxAdults + paxSeniors;
  const criancasTotal = paxChildren;
  const passageirosTotal = adultosTotal + criancasTotal + paxInfants;

  const customFields: Record<string, any> = {
    ...(dtoPricing?.custom_fields && typeof dtoPricing.custom_fields === "object"
      ? dtoPricing.custom_fields
      : {}),
    ...((state as any).custom_fields && typeof (state as any).custom_fields === "object"
      ? (state as any).custom_fields
      : {}),
  };
  const customPerPersonCents = Number(customFields.custom_price_per_person_cents || 0);

  // Value per person (paying) and per adult
  const payingPax = adultosTotal + criancasTotal;
  const valorPorPessoa =
    customPerPersonCents > 0
      ? customPerPersonCents / 100
      : payingPax > 0
        ? total / payingPax
        : total;
  const valorPorAdulto =
    customPerPersonCents > 0
      ? customPerPersonCents / 100
      : adultosTotal > 0
        ? total / (adultosTotal + criancasTotal * 0.5)
        : valorPorPessoa;

  let roomsBreakdown: ProposalRoomBreakdownItem[] = [];
  if (rawRooms.length > 0) {
    const validRooms = rawRooms.filter((r) => Number(r?.adults) > 0 || Number(r?.roomNumber) > 0);
    const totalOccupancyWeight = validRooms.reduce(
      (acc, r) => acc + Math.max(1, (Number(r?.adults) || 1) + (Number(r?.children) || 0) * 0.5),
      0,
    );
    roomsBreakdown = validRooms.map((r, idx) => {
      const roomNumber = Number(r?.roomNumber) || idx + 1;
      const adults = Math.max(1, Number(r?.adults) || 1);
      const children = Math.max(0, Number(r?.children) || 0);
      const childrenAges = Array.isArray(r?.childrenAges) ? r.childrenAges.map(Number) : [];
      const roomType = String(r?.roomType || r?.type || (adults === 1 ? "Single" : adults === 2 ? "Duplo / Casal" : "Familiar"));
      const explicitCents = Number(r?.price_cents ?? r?.roomTotalCents ?? 0);
      const legacyMatch = legacyRoomsFromNotes.find((lr) => lr.roomNumber === roomNumber);
      const weight = Math.max(1, adults + children * 0.5);
      const roomTotalReais =
        explicitCents > 0
          ? explicitCents / 100
          : legacyMatch && legacyMatch.totalReais > 0
            ? legacyMatch.totalReais
            : totalOccupancyWeight > 0
              ? (total * weight) / totalOccupancyWeight
              : total / Math.max(1, validRooms.length);
      const explicitPerPersonCents = Number(r?.price_per_person_cents ?? r?.perPersonCents ?? 0);
      const paxInRoom = Math.max(1, adults + children);
      const perPersonReais =
        explicitPerPersonCents > 0 ? explicitPerPersonCents / 100 : roomTotalReais / paxInRoom;
      return {
        id: String(r?.id || `room_${roomNumber}`),
        roomNumber,
        roomType,
        label:
          typeof r?.label === "string" && r.label.trim()
            ? r.label.trim()
            : `Quarto ${roomNumber}${roomType ? ` — ${roomType}` : ""}`,
        adults,
        children,
        childrenAges,
        totalReais: roomTotalReais,
        perPersonReais,
        boardBasis: typeof r?.board_basis === "string" ? r.board_basis : undefined,
        notes: typeof r?.notes === "string" && r.notes.trim() ? r.notes.trim() : undefined,
      };
    });
  } else if (legacyRoomsFromNotes.length > 0) {
    roomsBreakdown = legacyRoomsFromNotes;
  }

  return {
    subtotal,
    total,
    descontoPixPercentual,
    totalPix,
    parcelasCartao,
    valorParcelaCartao,
    parcelasBoleto,
    valorParcelaBoleto,
    paxTotal: passageirosTotal,
    passageirosTotal,
    adultosTotal,
    criancasTotal,
    valorPorPessoa,
    valorPorAdulto,
    roomsBreakdown,
    breakdown: {
      voos,
      hoteis,
      transfers: transfersTotal,
      passeios,
      seguro: insurancePrice,
      extrasObrigatorios,
      extrasOpcionais,
    },
  };
}

export function getAgencyMarkup(agencySettings?: any, channel?: string): number {
  if (channel === "infotravel" && agencySettings?.infotravel_markup_percent !== undefined) {
    return Number(agencySettings.infotravel_markup_percent) || 0;
  }
  return Number(agencySettings?.default_markup_percent) || 0;
}

export function calculateMarkup(baseCost: number, markupPercent: number): number {
  return Math.round(baseCost * (1 + (markupPercent / 100)));
}
