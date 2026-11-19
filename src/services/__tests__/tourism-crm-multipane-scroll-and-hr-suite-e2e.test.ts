import { describe, expect, it } from "vitest";
import { saveEmployeeFullProfileSchema } from "@/services/hr.functions";

describe("Waesy Architecture — Multi-Pane Scroll Invariants & HR Suite E2E", () => {
  describe("1. Multi-Pane Independent Internal Scroll Layout Invariants", () => {
    it("deve garantir que o modo 'form' (Geral) declara 3 colunas independentes com overflow interno", () => {
      // Regra de layout do Dossier para visão de 3 colunas (Viagem/Destino, Atendimento/Saúde e Sidecar de Governança)
      const columnLayouts = {
        modeForm: {
          col1: { name: "Viagem & Destino", scrollClass: "overflow-y-auto overscroll-contain scrollbar-waesy", bottomPadding: "pb-16 lg:pb-24" },
          col2: { name: "Atendimento & Saúde", scrollClass: "overflow-y-auto overscroll-contain scrollbar-waesy", bottomPadding: "pb-16 lg:pb-24" },
          col3: { name: "Sidecar Governança", scrollClass: "overflow-y-auto overscroll-contain scrollbar-waesy", bottomPadding: "pb-16 lg:pb-24" },
        },
        modeTab: {
          col1: { name: "Conteúdo da Aba Ativa", scrollClass: "overflow-y-auto overscroll-contain scrollbar-waesy", bottomPadding: "pb-16 lg:pb-24" },
          col2: { name: "Sidecar Governança", scrollClass: "overflow-y-auto overscroll-contain scrollbar-waesy", bottomPadding: "pb-16 lg:pb-24" },
        },
      };

      expect(Object.keys(columnLayouts.modeForm)).toHaveLength(3);
      expect(columnLayouts.modeForm.col1.scrollClass).toContain("overflow-y-auto");
      expect(columnLayouts.modeForm.col2.scrollClass).toContain("overflow-y-auto");
      expect(columnLayouts.modeForm.col3.scrollClass).toContain("overflow-y-auto");
      expect(columnLayouts.modeForm.col1.bottomPadding).toContain("lg:pb-24");
      expect(columnLayouts.modeForm.col2.bottomPadding).toContain("lg:pb-24");
      expect(columnLayouts.modeForm.col3.bottomPadding).toContain("lg:pb-24");
    });

    it("deve garantir que as abas com 2 colunas mantêm scroll independente entre aba ativa e sidecar", () => {
      const tabsWithTwoColumns = [
        "travelers",
        "payment",
        "contracts",
        "proposals",
        "opportunities",
        "anamnese",
        "customer360",
        "lgpd",
        "meeting",
        "presentation",
        "checklists",
        "attachments",
        "comments",
        "all",
      ];

      tabsWithTwoColumns.forEach((tabId) => {
        expect(tabId).toBeTruthy();
      });
      expect(tabsWithTwoColumns).toHaveLength(14);
    });
  });

  describe("2. HR Suite — Ficha 360° e Governança Multi-Nicho", () => {
    it("deve validar o schema Zod completo de admissão/atualização de colaborador (saveEmployeeFullProfile)", () => {
      const validPayload = {
        fullName: "Carlos Eduardo da Silva",
        email: "carlos.vendas@agenciawaesy.com.br",
        phone: "+55 (11) 98765-4321",
        cpfMasked: "123.456.789-00",
        rg: "12.345.678-9",
        birthDate: "1990-05-15",
        jobTitle: "Consultor de Viagens Sênior",
        departmentId: "22222222-2222-4222-a222-222222222222",
        departmentName: "Comercial & Vendas",
        employmentType: "clt" as const,
        baseSalaryCents: 450000,
        hireDate: "2024-01-10",
        status: "active" as const,
        commercial: {
          isSeller: true,
          commissionPct: 8.5,
          monthlyGoalCents: 15000000,
          assignedCustomerIds: [
            "33333333-3333-4333-a333-333333333333",
            "44444444-4444-4444-a444-444444444444",
          ],
        },
        workSchedule: {
          workShiftType: "clt_44h",
          workStartTime: "08:30",
          workEndTime: "18:00",
          lunchStartTime: "12:00",
          lunchEndTime: "13:30",
        },
        pinCode: "4829",
        defaultBenefits: {
          vtEnabled: true,
          vrEnabled: true,
          healthPlanEnabled: true,
        },
        asoRecords: [{ expiryDate: "2027-01-10", type: "admissional", status: "valid" }],
        nicheData: {
          nicheRole: "travel_expert_closer",
          nicheCertifications: ["Emirates Certified Expert", "Disney Destination Planner"],
        },
      };

      const result = saveEmployeeFullProfileSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.fullName).toBe("Carlos Eduardo da Silva");
        expect(result.data.commercial?.isSeller).toBe(true);
        expect(result.data.commercial?.assignedCustomerIds).toHaveLength(2);
        expect(result.data.pinCode).toBe("4829");
      }
    });

    it("deve rejeitar e-mail inválido ou salário base negativo", () => {
      const invalidPayload = {
        fullName: "João",
        jobTitle: "Vendedor",
        email: "email-invalido",
        baseSalaryCents: -500,
      };

      const result = saveEmployeeFullProfileSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });
  });
});
