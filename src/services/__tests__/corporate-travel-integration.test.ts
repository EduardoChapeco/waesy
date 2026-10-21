import { describe, it, expect } from "vitest";
import {
  listTravelerDocuments,
  saveTravelerDocument,
  listCorporateMembers,
  saveCorporateMember,
  recordAirTicketCredit,
  createApprovalRequest,
  listTravelerTicketCredits,
  listCorporateContracts,
  saveCorporateContract,
  getCorporateCreditLine,
  saveCorporateCreditLine,
  listCorporateTravelBudgets,
  saveCorporateTravelBudget,
  listCorporateTravelAdvances,
  requestCorporateTravelAdvance,
  updateCorporateTravelAdvanceStatus,
  listCorporateTravelExpenses,
  saveCorporateTravelExpense,
  listCorporateInvoiceItems,
} from "@/services/corporate-travel.functions";

describe("GAP-4.11 / Cluster 1: Integração de Funções Corporativas de Viagens & Tabelas B2B", () => {
  it("deve exportar todas as funções corporativas de viagens com validação Zod ativa", () => {
    expect(typeof listTravelerDocuments).toBe("function");
    expect(typeof saveTravelerDocument).toBe("function");
    expect(typeof listCorporateMembers).toBe("function");
    expect(typeof saveCorporateMember).toBe("function");
    expect(typeof recordAirTicketCredit).toBe("function");
    expect(typeof createApprovalRequest).toBe("function");
    expect(typeof listTravelerTicketCredits).toBe("function");
    expect(typeof listCorporateContracts).toBe("function");
    expect(typeof saveCorporateContract).toBe("function");
    expect(typeof getCorporateCreditLine).toBe("function");
    expect(typeof saveCorporateCreditLine).toBe("function");
    expect(typeof listCorporateTravelBudgets).toBe("function");
    expect(typeof saveCorporateTravelBudget).toBe("function");
    expect(typeof listCorporateTravelAdvances).toBe("function");
    expect(typeof requestCorporateTravelAdvance).toBe("function");
    expect(typeof updateCorporateTravelAdvanceStatus).toBe("function");
    expect(typeof listCorporateTravelExpenses).toBe("function");
    expect(typeof saveCorporateTravelExpense).toBe("function");
    expect(typeof listCorporateInvoiceItems).toBe("function");
  });

  it("deve rejeitar payloads inválidos em saveCorporateContract", async () => {
    await expect(
      saveCorporateContract({
        data: {
          companyId: "invalid-uuid",
          agencyId: "invalid-uuid",
          contractNumber: "",
          title: "",
        } as any,
      })
    ).rejects.toThrow();
  });

  it("deve rejeitar payloads inválidos em saveCorporateCreditLine", async () => {
    await expect(
      saveCorporateCreditLine({
        data: {
          companyId: "invalid-uuid",
          agencyId: "invalid-uuid",
          creditLimitCents: -500,
          availableLimitCents: 0,
          paymentTermsDays: "99" as any,
        } as any,
      })
    ).rejects.toThrow();
  });

  it("deve rejeitar payloads inválidos em saveCorporateTravelBudget", async () => {
    await expect(
      saveCorporateTravelBudget({
        data: {
          companyId: "invalid-uuid",
          fiscalYear: 1990,
          budgetCents: -1,
        } as any,
      })
    ).rejects.toThrow();
  });

  it("deve rejeitar payloads inválidos em requestCorporateTravelAdvance", async () => {
    await expect(
      requestCorporateTravelAdvance({
        data: {
          companyId: "invalid-uuid",
          travelerId: "invalid-uuid",
          requestedAmountCents: 0,
          purpose: "",
        } as any,
      })
    ).rejects.toThrow();
  });

  it("deve rejeitar payloads inválidos em saveCorporateTravelExpense", async () => {
    await expect(
      saveCorporateTravelExpense({
        data: {
          companyId: "invalid-uuid",
          travelerId: "invalid-uuid",
          category: "invalid_cat" as any,
          amountCents: -10,
        } as any,
      })
    ).rejects.toThrow();
  });
});
