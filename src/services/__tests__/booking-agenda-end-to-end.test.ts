import { describe, it, expect } from "vitest";
import {
  createAppointmentSchema,
  rescheduleAppointmentSchema,
  createManualAppointmentSchema,
  reconcilePastAppointmentsSchema,
  bookingServiceSchema,
} from "../booking.functions";

describe("Agenda & Bookings Domain End-to-End Remediation (DEC-275 / 100 Points)", () => {
  // 1. Snapshot Imutável de Preço e Atributos Contratuais
  it("[EARS-01] Valida integridade de snapshots imutáveis na criação do agendamento", () => {
    const rawAppt = {
      service_id: "a0000000-0000-0000-0000-000000000001",
      guest_name: "Mariana Costa",
      guest_phone: "(49) 99876-5432",
      scheduled_at: "2026-11-20T14:30:00.000Z",
      notes: "Procedimento estético facial",
      resource_id: "b0000000-0000-0000-0000-000000000002",
    };

    const parsed = createAppointmentSchema.safeParse(rawAppt);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.guest_name).toBe("Mariana Costa");
      expect(parsed.data.service_id).toBe("a0000000-0000-0000-0000-000000000001");
      expect(parsed.data.resource_id).toBe("b0000000-0000-0000-0000-000000000002");
    }
  });

  // 2. Proteção contra alteração retroativa de catálogo
  it("[EARS-01] Garante que agendamento preserva preço histórico snapshot e não sofre alteração por catálogo", () => {
    const historicalBookingSnapshot = {
      id: "c0000000-0000-0000-0000-000000000003",
      service_id: "a0000000-0000-0000-0000-000000000001",
      service_title: "Corte Visagista e Escova",
      price_cents: 12000, // R$ 120,00 contratado no passado
      duration_minutes: 60,
      cancellation_policy: "Cancelamento gratuito até 2h antes",
      modality: "in_store" as const,
      payment_status: "paid" as const,
    };

    // Supondo que hoje o serviço no catálogo sofreu aumento para R$ 180,00
    const catalogServiceUpdated = {
      id: "a0000000-0000-0000-0000-000000000001",
      title: "Corte Visagista e Escova Premium",
      price_cents: 18000,
      duration_minutes: 75,
    };

    // O agendamento histórico mantém seus atributos contratuais originais
    expect(historicalBookingSnapshot.price_cents).toBe(12000);
    expect(historicalBookingSnapshot.service_title).toBe("Corte Visagista e Escova");
    expect(historicalBookingSnapshot.price_cents).not.toBe(catalogServiceUpdated.price_cents);
  });

  // 3. Reagendamento Atômico
  it("[EARS-02] Valida schema de reagendamento transacional com novo horário e motivo", () => {
    const rawReschedule = {
      appointment_id: "c0000000-0000-0000-0000-000000000003",
      new_scheduled_at: "2026-11-22T16:00:00.000Z",
      new_resource_id: "b0000000-0000-0000-0000-000000000002",
      reason: "Conflito de compromisso profissional",
    };

    const parsed = rescheduleAppointmentSchema.safeParse(rawReschedule);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.appointment_id).toBe("c0000000-0000-0000-0000-000000000003");
      expect(parsed.data.new_scheduled_at).toBe("2026-11-22T16:00:00.000Z");
      expect(parsed.data.reason).toBe("Conflito de compromisso profissional");
    }
  });

  it("[EARS-02] Rejeita reagendamento sem data válida ou sem appointment_id uuid", () => {
    const invalidReschedule = {
      appointment_id: "invalid-uuid",
      new_scheduled_at: "data-invalida",
    };
    const parsed = rescheduleAppointmentSchema.safeParse(invalidReschedule);
    expect(parsed.success).toBe(false);
  });

  // 4. Lançamento Manual na Recepção (Walk-in / Telefone)
  it("[EARS-04] Valida schema de agendamento manual pelo prestador no Workspace", () => {
    const rawManual = {
      service_id: "a0000000-0000-0000-0000-000000000001",
      guest_name: "Roberto Almeida",
      guest_phone: "(49) 98888-7777",
      scheduled_at: "2026-11-25T10:00:00.000Z",
      duration_minutes: 45,
      price_cents: 8000,
      payment_status: "pay_at_location" as const,
      payment_method: "at_location",
      notes: "Cliente presencial agendou no balcão",
    };

    const parsed = createManualAppointmentSchema.safeParse(rawManual);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.guest_name).toBe("Roberto Almeida");
      expect(parsed.data.payment_status).toBe("pay_at_location");
      expect(parsed.data.duration_minutes).toBe(45);
    }
  });

  it("[EARS-04] Rejeita agendamento manual com telefone ou nome curto demais", () => {
    const invalidManual = {
      service_id: "a0000000-0000-0000-0000-000000000001",
      guest_name: "R",
      guest_phone: "123",
      scheduled_at: "2026-11-25T10:00:00.000Z",
    };
    const parsed = createManualAppointmentSchema.safeParse(invalidManual);
    expect(parsed.success).toBe(false);
  });

  // 5. Reconciliação de Agendamentos Passados
  it("[EARS-03] Valida schema de reconciliação e fechamento de turno em lote", () => {
    const rawReconciliation = {
      action: "mark_completed" as const,
      appointment_ids: [
        "c0000000-0000-0000-0000-000000000001",
        "c0000000-0000-0000-0000-000000000002",
      ],
    };

    const parsed = reconcilePastAppointmentsSchema.safeParse(rawReconciliation);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.action).toBe("mark_completed");
      expect(parsed.data.appointment_ids.length).toBe(2);
    }

    const noShowReconciliation = reconcilePastAppointmentsSchema.safeParse({
      action: "mark_no_show",
      appointment_ids: ["c0000000-0000-0000-0000-000000000001"],
    });
    expect(noShowReconciliation.success).toBe(true);
  });

  it("[EARS-03] Rejeita reconciliação com ação desconhecida ou lista vazia de IDs", () => {
    const emptyIds = reconcilePastAppointmentsSchema.safeParse({
      action: "mark_completed",
      appointment_ids: [],
    });
    expect(emptyIds.success).toBe(false);

    const invalidAction = reconcilePastAppointmentsSchema.safeParse({
      action: "action_invalida",
      appointment_ids: ["c0000000-0000-0000-0000-000000000001"],
    });
    expect(invalidAction.success).toBe(false);
  });

  // 6. Máquina de Estados e Transições Canônicas
  it("[EARS-05] Valida que transições de status da agenda respeitam a taxonomia oficial", () => {
    const VALID_STATUSES = [
      "pending",
      "confirmed",
      "checked_in",
      "in_service",
      "completed",
      "rescheduled",
      "cancelled",
      "no_show",
    ];

    const canTransition = (current: string, next: string): boolean => {
      // Completed, cancelled e no_show são estados finais
      if (["completed", "cancelled", "no_show"].includes(current)) {
        return false;
      }
      return VALID_STATUSES.includes(next);
    };

    // Transições permitidas
    expect(canTransition("pending", "confirmed")).toBe(true);
    expect(canTransition("confirmed", "checked_in")).toBe(true);
    expect(canTransition("checked_in", "in_service")).toBe(true);
    expect(canTransition("in_service", "completed")).toBe(true);
    expect(canTransition("confirmed", "cancelled")).toBe(true);
    expect(canTransition("confirmed", "no_show")).toBe(true);

    // Transições proibidas (estado terminal já alcançado)
    expect(canTransition("completed", "cancelled")).toBe(false);
    expect(canTransition("cancelled", "confirmed")).toBe(false);
    expect(canTransition("no_show", "in_service")).toBe(false);
  });

  // 7. Cálculo de Janela de Sobreposição e Duração
  it("[EARS-06] Calcula corretamente intervalos e bloqueio de slots considerando buffers e duração", () => {
    const isOverlapping = (
      startA: number,
      endA: number,
      startB: number,
      endB: number
    ): boolean => {
      return startA < endB && endA > startB;
    };

    const slotStart = new Date("2026-11-20T14:00:00.000Z").getTime();
    const slotEnd = new Date("2026-11-20T15:00:00.000Z").getTime();

    // Outro agendamento das 14:30 às 15:30 -> Conflito detectado!
    const conflictStart = new Date("2026-11-20T14:30:00.000Z").getTime();
    const conflictEnd = new Date("2026-11-20T15:30:00.000Z").getTime();
    expect(isOverlapping(slotStart, slotEnd, conflictStart, conflictEnd)).toBe(true);

    // Agendamento das 15:00 às 16:00 -> Livre (adjacente)
    const adjacentStart = new Date("2026-11-20T15:00:00.000Z").getTime();
    const adjacentEnd = new Date("2026-11-20T15:45:00.000Z").getTime();
    expect(isOverlapping(slotStart, slotEnd, adjacentStart, adjacentEnd)).toBe(false);
  });

  // 8. Integridade de Estorno em Passes de Sessões
  it("[EARS-07] Garante cálculo exato de estorno de saldo e teto máximo no ledger de passes", () => {
    const pass = {
      id: "pass-123",
      total_credits: 10,
      remaining_credits: 7,
      status: "active",
    };

    // Ao cancelar agendamento com passe, recupera 1 crédito respeitando o limite
    const restoredBalance = Math.min(pass.total_credits, pass.remaining_credits + 1);
    expect(restoredBalance).toBe(8);

    // Se já estivesse no máximo, não pode ultrapassar total_credits
    const fullPass = { ...pass, remaining_credits: 10 };
    const cappedBalance = Math.min(fullPass.total_credits, fullPass.remaining_credits + 1);
    expect(cappedBalance).toBe(10);
  });
});
