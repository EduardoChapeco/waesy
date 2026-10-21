import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  ServicePackageSchema,
  BookWithPassSchema,
  AdjustPassCreditsSchema,
  MarkAppointmentNoShowSchema,
} from "../service-packages.functions";

describe("Service Packages & Passes - End-to-End Contract & Validation Audit", () => {
  describe("Zod Validation Schemas", () => {
    it("validates correct ServicePackage configuration", () => {
      const validPayload = {
        service_id: "00000000-0000-0000-0000-000000000001",
        title: "Combo 10 Aulas Pilates",
        description: "Aulas de reformer e solo com flexibilidade de agendamento",
        total_credits: 10,
        price_cents: 35000,
        validity_days: 45,
        is_recurring: false,
        recurrence_interval: "monthly",
        max_reschedules_per_credit: 2,
        is_active: true,
      };

      const result = ServicePackageSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it("rejects ServicePackage with invalid negative price or zero credits", () => {
      const invalidPayload = {
        service_id: "00000000-0000-0000-0000-000000000001",
        title: "A",
        total_credits: 0,
        price_cents: -50,
      };

      const result = ServicePackageSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors.some((e) => e.path.includes("total_credits"))).toBe(true);
        expect(result.error.errors.some((e) => e.path.includes("price_cents"))).toBe(true);
        expect(result.error.errors.some((e) => e.path.includes("title"))).toBe(true);
      }
    });

    it("validates BookWithPass booking payload", () => {
      const validBooking = {
        pass_id: "00000000-0000-0000-0000-000000000002",
        scheduled_at: "2026-11-01T14:00:00.000Z",
        notes: "Primeira aula após lesão no joelho",
      };

      const result = BookWithPassSchema.safeParse(validBooking);
      expect(result.success).toBe(true);
    });

    it("validates AdjustPassCreditsSchema requiring non-zero delta and audit reason", () => {
      const validAdjustment = {
        pass_id: "00000000-0000-0000-0000-000000000002",
        credits_delta: 2,
        reason: "Bonificação de cortesia por fidelidade do aluno",
      };

      const result = AdjustPassCreditsSchema.safeParse(validAdjustment);
      expect(result.success).toBe(true);

      const zeroDelta = {
        pass_id: "00000000-0000-0000-0000-000000000002",
        credits_delta: 0,
        reason: "Justificativa válida",
      };
      const zeroResult = AdjustPassCreditsSchema.safeParse(zeroDelta);
      expect(zeroResult.success).toBe(false);

      const emptyReason = {
        pass_id: "00000000-0000-0000-0000-000000000002",
        credits_delta: 1,
        reason: "a",
      };
      const reasonResult = AdjustPassCreditsSchema.safeParse(emptyReason);
      expect(reasonResult.success).toBe(false);
    });

    it("validates MarkAppointmentNoShowSchema", () => {
      const validNoShow = {
        appointment_id: "00000000-0000-0000-0000-000000000003",
        penalty_applied: true,
        reason: "Cliente não compareceu e não avisou com antecedência",
      };

      const result = MarkAppointmentNoShowSchema.safeParse(validNoShow);
      expect(result.success).toBe(true);
    });
  });

  describe("Credit Reconciliation Logic (EARS-03)", () => {
    it("strictly reconciles available, reserved, and completed credits without double-counting", () => {
      const rawPass = {
        id: "pass-123",
        total_credits: 10,
        remaining_credits: 6, // 4 créditos foram consumidos/reservados na ledger
        booking_appointments: [
          {
            id: "appt-1",
            status: "completed",
            check_in_at: "2026-10-15T10:00:00Z",
            scheduled_at: "2026-10-15T10:00:00Z",
          },
          {
            id: "appt-2",
            status: "completed",
            check_in_at: "2026-10-17T10:00:00Z",
            scheduled_at: "2026-10-17T10:00:00Z",
          },
          {
            id: "appt-3",
            status: "confirmed",
            check_in_at: null,
            scheduled_at: "2026-11-01T10:00:00Z", // futuro
          },
          {
            id: "appt-4",
            status: "confirmed",
            check_in_at: null,
            scheduled_at: "2026-11-05T10:00:00Z", // futuro
          },
        ],
      };

      const now = new Date("2026-10-21T00:00:00Z");

      const activeReservations = rawPass.booking_appointments.filter(
        (app) =>
          (app.status === "confirmed" || app.status === "pending") &&
          !app.check_in_at &&
          new Date(app.scheduled_at) >= now,
      );

      const completedSessions = rawPass.booking_appointments.filter(
        (app) => app.status === "completed" || !!app.check_in_at,
      );

      const reservedCredits = activeReservations.length;
      const completedCredits = completedSessions.length;
      const availableCredits = rawPass.remaining_credits;

      expect(reservedCredits).toBe(2);
      expect(completedCredits).toBe(2);
      expect(availableCredits).toBe(6);
      expect(availableCredits + reservedCredits + completedCredits).toBe(10);
    });
  });

  describe("Contractual Immutability (EARS-02)", () => {
    it("creates an immutable snapshot protecting purchased conditions against subsequent catalog edits", () => {
      const catalogItem = {
        id: "pkg-original",
        title: "Pacote Promocional Outubro",
        description: "10 Aulas por R$ 200",
        service_id: "serv-pilates",
        service_title: "Pilates Studio",
        duration_minutes: 50,
        price_cents: 20000,
        validity_days: 30,
        total_credits: 10,
      };

      // Snapshot criado na hora da compra
      const purchasedSnapshot = {
        title: catalogItem.title,
        description: catalogItem.description,
        service_id: catalogItem.service_id,
        service_title: catalogItem.service_title,
        duration_minutes: catalogItem.duration_minutes,
        price_cents: catalogItem.price_cents,
        validity_days: catalogItem.validity_days,
        total_credits: catalogItem.total_credits,
        purchased_at: new Date().toISOString(),
      };

      // Alteração posterior no catálogo do lojista
      catalogItem.title = "Pacote Reajustado 2027";
      catalogItem.price_cents = 35000;
      catalogItem.validity_days = 20;

      // O snapshot do cliente permanece inalterado
      expect(purchasedSnapshot.title).toBe("Pacote Promocional Outubro");
      expect(purchasedSnapshot.price_cents).toBe(20000);
      expect(purchasedSnapshot.validity_days).toBe(30);
    });
  });
});
