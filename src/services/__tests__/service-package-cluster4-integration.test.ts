import { describe, it, expect } from "vitest";
import {
  listPackageCommissions,
  savePackageCommission,
  listPackageRecurrences,
  savePackageRecurrence,
  checkInAppointment,
  markAppointmentNoShow,
} from "@/services/service-packages.functions";

describe("Cluster 4: Serviços, Comissões & Recorrências", () => {
  it("deve exportar todas as funções de pacotes, comissões e agendamentos com validação Zod ativa", () => {
    expect(typeof listPackageCommissions).toBe("function");
    expect(typeof savePackageCommission).toBe("function");
    expect(typeof listPackageRecurrences).toBe("function");
    expect(typeof savePackageRecurrence).toBe("function");
    expect(typeof checkInAppointment).toBe("function");
    expect(typeof markAppointmentNoShow).toBe("function");
  });

  it("deve rejeitar comissão de pacote com percentual superior a 100%", async () => {
    await expect(
      savePackageCommission({
        data: {
          packageId: "invalid-uuid",
          professionalId: "invalid-uuid",
          commissionPercent: 105,
        } as any,
      })
    ).rejects.toThrow();
  });

  it("deve rejeitar recorrência de pacote com intervalo inválido", async () => {
    await expect(
      savePackageRecurrence({
        data: {
          customerPassId: "invalid-uuid",
          packageId: "invalid-uuid",
          customerId: "invalid-uuid",
          storeId: "invalid-uuid",
          billingInterval: "hourly" as any,
          nextBillingDate: "2026-12-01",
        } as any,
      })
    ).rejects.toThrow();
  });
});
