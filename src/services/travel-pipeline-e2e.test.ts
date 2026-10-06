import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { executeWithIdempotency, resetIdempotencyStore } from "@/lib/idempotency/idempotency-guard";
import {
  resolveTravelDocumentConflicts,
  type TravelDocumentConflict,
} from "@/lib/travel-document-conflicts";
import { normalizeOperatorDocument } from "@/lib/travel-operator-sync";
import { OperatorQuoteExtractionResultSchema } from "./travel-operator-ocr.functions";

type Stage = "lead" | "proposal" | "accepted" | "reserved" | "voucher" | "commissioned";
type Event = { type: string; payload: Record<string, unknown> };
type LedgerEntry = {
  id: string;
  amountCents: number;
  reference: string;
  previousHash: string;
  hash: string;
};

class TravelPipelineContractHarness {
  stage: Stage = "lead";
  lead = { id: "lead-001", name: "João da Silva", email: "joao@example.com" };
  proposal: { id: string; totalCents: number; operatorCode: string } | null = null;
  trip: { id: string; locator: string } | null = null;
  voucher: { id: string; locator: string } | null = null;
  conflicts: TravelDocumentConflict[] = [];
  resolvedFields = new Map<string, unknown>();
  documents: Array<{
    id: string;
    kind: "reservation_confirmation" | "payment_receipt" | "voucher";
    extraction: Record<string, unknown>;
  }> = [];
  events: Event[] = [];
  ledger: LedgerEntry[] = [];

  private event(type: string, payload: Record<string, unknown> = {}) {
    this.events.push({ type, payload });
  }

  ingestQuote() {
    const extraction = OperatorQuoteExtractionResultSchema.parse({
      operator_name: "Orinter",
      quote_reference_number: "OR-98412",
      destination: "Maceió - AL",
      travel_start: "2026-10-15",
      travel_end: "2026-10-22",
      adults_count: 2,
      gross_price_cents: 890000,
      operator_net_cents: 780000,
      flights: [
        { airline: "LATAM", flight_number: "LA3412", origin_iata: "XAP", destination_iata: "MCZ" },
      ],
      hotels: [{ hotel_name: "Jatiúca Hotel & Resort", city: "Maceió", nights_count: 7 }],
    });
    const canonical = normalizeOperatorDocument({
      sourceKind: "operator_quote",
      ingestionId: "11111111-1111-4111-8111-111111111111",
      extraction,
    });
    this.proposal = {
      id: "proposal-001",
      totalCents: canonical.financial.gross_cents || 0,
      operatorCode: canonical.operator.code,
    };
    this.stage = "proposal";
    this.event("quote.normalized", {
      operator_code: canonical.operator.code,
      proposal_id: this.proposal.id,
    });
    return canonical;
  }

  attachDocuments() {
    this.documents = [
      {
        id: "confirmation-001",
        kind: "reservation_confirmation",
        extraction: { reservation: { locator: "ABC123", total: 890000, hotel: "Jatiúca Hotel" } },
      },
      {
        id: "receipt-001",
        kind: "payment_receipt",
        extraction: {
          reservation: { locator: "ABC123", total: 900000, hotel: "Jatiúca Hotel" },
          payment: { paid: 450000 },
        },
      },
      {
        id: "voucher-001",
        kind: "voucher",
        extraction: {
          reservation: { locator: "ABC123", total: 890000, hotel: "Jatiúca Hotel confirmado" },
        },
      },
    ];
    this.event("documents.ingested", { count: this.documents.length });
  }

  analyzeConflicts() {
    this.conflicts = resolveTravelDocumentConflicts(this.documents);
    this.event("documents.reconciled", { conflicts: this.conflicts.length });
    return this.conflicts;
  }

  resolveCriticalConflicts() {
    for (const conflict of this.conflicts.filter(
      (item) => item.severity === "critical" && item.status !== "open",
    )) {
      this.resolvedFields.set(conflict.fieldPath, conflict.suggestedValue);
    }
    this.conflicts = this.conflicts.map((conflict) =>
      conflict.severity === "critical" ? { ...conflict, status: "open" as const } : conflict,
    );
  }

  resolveAllConflicts() {
    for (const conflict of this.conflicts)
      this.resolvedFields.set(conflict.fieldPath, conflict.suggestedValue);
    this.conflicts = this.conflicts.map((conflict) => ({
      ...conflict,
      status: "suggested" as const,
    }));
    this.event("documents.conflicts_resolved", { count: this.conflicts.length });
  }

  hasOpenCriticalConflict() {
    return this.conflicts.some(
      (conflict) =>
        conflict.severity === "critical" && !this.resolvedFields.has(conflict.fieldPath),
    );
  }

  acceptProposal() {
    if (this.stage !== "proposal")
      throw new Error("Proposta precisa estar em draft antes do aceite.");
    this.stage = "accepted";
    this.event("proposal.accepted", { proposal_id: this.proposal?.id });
  }

  async convertToReservation() {
    return executeWithIdempotency({
      key: "travel-convert-proposal-001",
      scope: "travel_reservation",
      handler: async () => {
        if (this.stage !== "accepted") throw new Error("Aceite obrigatório antes da reserva.");
        if (this.hasOpenCriticalConflict()) throw new Error("Conflito crítico bloqueia a reserva.");
        this.trip ||= { id: "trip-001", locator: "ABC123" };
        this.stage = "reserved";
        this.event("reservation.created", { trip_id: this.trip.id, locator: this.trip.locator });
        return this.trip;
      },
    });
  }

  async issueVoucher() {
    return executeWithIdempotency({
      key: "travel-voucher-trip-001",
      scope: "travel_voucher",
      handler: async () => {
        if (this.stage !== "reserved" || !this.trip)
          throw new Error("Reserva obrigatória antes do voucher.");
        this.voucher ||= { id: "voucher-001", locator: this.trip.locator };
        this.stage = "voucher";
        this.event("voucher.issued", { voucher_id: this.voucher.id });
        return this.voucher;
      },
    });
  }

  calculateCommission() {
    if (this.stage !== "voucher") throw new Error("Voucher obrigatório antes da comissão.");
    const gross = this.proposal?.totalCents || 0;
    const net = 780000;
    const amount = gross - net;
    this.stage = "commissioned";
    this.event("commission.accrued", { base_cents: amount, commission_cents: amount });
    return { baseCents: amount, commissionCents: amount };
  }

  appendLedger(amountCents: number, reference: string) {
    const previousHash = this.ledger.at(-1)?.hash || "GENESIS";
    const id = `ledger-${this.ledger.length + 1}`;
    const hash = createHash("sha256")
      .update(`${id}|${amountCents}|${reference}|${previousHash}`)
      .digest("hex");
    const entry = { id, amountCents, reference, previousHash, hash };
    this.ledger.push(entry);
    return entry;
  }

  verifyLedger() {
    return this.ledger.every((entry, index) => {
      const previousHash = index === 0 ? "GENESIS" : this.ledger[index - 1].hash;
      const expected = createHash("sha256")
        .update(`${entry.id}|${entry.amountCents}|${entry.reference}|${previousHash}`)
        .digest("hex");
      return entry.previousHash === previousHash && entry.hash === expected;
    });
  }
}

describe("Travel pipeline E2E contract", () => {
  beforeEach(() => resetIdempotencyStore());

  it("valida OCR, normaliza operadora e cria proposta vinculada ao lead", () => {
    const harness = new TravelPipelineContractHarness();
    const canonical = harness.ingestQuote();
    expect(canonical.operator.code).toBe("orinter");
    expect(canonical.reservation.destination).toBe("Maceió - AL");
    expect(harness.proposal).toEqual({
      id: "proposal-001",
      totalCents: 890000,
      operatorCode: "orinter",
    });
    expect(harness.lead.id).toBe("lead-001");
  });

  it("persiste os três documentos e identifica divergências", () => {
    const harness = new TravelPipelineContractHarness();
    harness.ingestQuote();
    harness.attachDocuments();
    const conflicts = harness.analyzeConflicts();
    expect(harness.documents).toHaveLength(3);
    expect(conflicts.some((conflict) => conflict.fieldPath === "reservation.total")).toBe(true);
    expect(harness.events.at(-1)?.type).toBe("documents.reconciled");
  });

  it("seleciona recibo para valor financeiro e voucher para operação", () => {
    const harness = new TravelPipelineContractHarness();
    harness.attachDocuments();
    const conflicts = harness.analyzeConflicts();
    const total = conflicts.find((conflict) => conflict.fieldPath === "reservation.total");
    const hotel = conflicts.find((conflict) => conflict.fieldPath === "reservation.hotel");
    expect(total?.suggestedSourceKind).toBe("payment_receipt");
    expect(hotel?.suggestedSourceKind).toBe("voucher");
  });

  it("bloqueia a reserva quando há conflito crítico aberto", async () => {
    const harness = new TravelPipelineContractHarness();
    harness.ingestQuote();
    harness.attachDocuments();
    harness.analyzeConflicts();
    harness.acceptProposal();
    await expect(harness.convertToReservation()).rejects.toThrow("Conflito crítico");
    expect(harness.trip).toBeNull();
  });

  it("resolve divergências sem modificar extrações originais", async () => {
    const harness = new TravelPipelineContractHarness();
    harness.ingestQuote();
    harness.attachDocuments();
    const originalReceipt = structuredClone(harness.documents[1].extraction);
    harness.analyzeConflicts();
    harness.resolveAllConflicts();
    await harness.acceptProposal();
    const trip = await harness.convertToReservation();
    expect(trip.locator).toBe("ABC123");
    expect(harness.documents[1].extraction).toEqual(originalReceipt);
    expect(harness.resolvedFields.get("reservation.total")).toBe(900000);
  });

  it("converte a mesma proposta uma única vez", async () => {
    const harness = new TravelPipelineContractHarness();
    harness.ingestQuote();
    harness.attachDocuments();
    harness.analyzeConflicts();
    harness.resolveAllConflicts();
    harness.acceptProposal();
    const first = await harness.convertToReservation();
    const second = await harness.convertToReservation();
    expect(second).toEqual(first);
    expect(harness.events.filter((event) => event.type === "reservation.created")).toHaveLength(1);
  });

  it("emite voucher idempotentemente após a reserva", async () => {
    const harness = new TravelPipelineContractHarness();
    harness.ingestQuote();
    harness.attachDocuments();
    harness.analyzeConflicts();
    harness.resolveAllConflicts();
    harness.acceptProposal();
    await harness.convertToReservation();
    const first = await harness.issueVoucher();
    const second = await harness.issueVoucher();
    expect(second).toEqual(first);
    expect(harness.events.filter((event) => event.type === "voucher.issued")).toHaveLength(1);
  });

  it("calcula comissão pela margem da venda e vincula a etapa final", async () => {
    const harness = new TravelPipelineContractHarness();
    harness.ingestQuote();
    harness.attachDocuments();
    harness.analyzeConflicts();
    harness.resolveAllConflicts();
    harness.acceptProposal();
    await harness.convertToReservation();
    await harness.issueVoucher();
    expect(harness.calculateCommission()).toEqual({ baseCents: 110000, commissionCents: 110000 });
    expect(harness.stage).toBe("commissioned");
  });

  it("registra comissão no ledger e valida a cadeia", () => {
    const harness = new TravelPipelineContractHarness();
    const accrual = harness.appendLedger(110000, "travel_commission:trip-001");
    const payout = harness.appendLedger(110000, "travel_commission_payout:trip-001");
    expect(accrual.previousHash).toBe("GENESIS");
    expect(payout.previousHash).toBe(accrual.hash);
    expect(harness.verifyLedger()).toBe(true);
  });

  it("detecta adulteração do ledger", () => {
    const harness = new TravelPipelineContractHarness();
    harness.appendLedger(110000, "travel_commission:trip-001");
    harness.appendLedger(110000, "travel_commission_payout:trip-001");
    harness.ledger[0].amountCents = 1;
    expect(harness.verifyLedger()).toBe(false);
  });

  it("libera a chave de conversão para retentativa após falha transitória", async () => {
    let attempts = 0;
    const handler = () =>
      executeWithIdempotency({
        key: "travel-retry-001",
        scope: "travel_reservation",
        handler: async () => {
          attempts += 1;
          if (attempts === 1) throw new Error("falha transitória");
          return { tripId: "trip-recovered" };
        },
      });
    await expect(handler()).rejects.toThrow("falha transitória");
    await expect(handler()).resolves.toEqual({ tripId: "trip-recovered" });
    expect(attempts).toBe(2);
  });

  it("preserva a ordem operacional completa do pipeline", async () => {
    const harness = new TravelPipelineContractHarness();
    harness.ingestQuote();
    harness.attachDocuments();
    harness.analyzeConflicts();
    harness.resolveAllConflicts();
    harness.acceptProposal();
    await harness.convertToReservation();
    await harness.issueVoucher();
    harness.calculateCommission();
    expect(harness.events.map((event) => event.type)).toEqual([
      "quote.normalized",
      "documents.ingested",
      "documents.reconciled",
      "documents.conflicts_resolved",
      "proposal.accepted",
      "reservation.created",
      "voucher.issued",
      "commission.accrued",
    ]);
  });
});
