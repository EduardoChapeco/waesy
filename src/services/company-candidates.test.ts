import { describe, it, expect } from "vitest";
import { ListCompanyJobApplicationsSchema, UpdateCompanyJobApplicationStatusSchema, CompanyCustomFormFieldSchema, UpdateCompanyCustomFormSettingsSchema } from "./company-mvp.functions";

describe("Company Candidates & Custom Form Schemas", () => {
  describe("ListCompanyJobApplicationsSchema", () => {
    it("valida objeto vazio ou com parâmetros válidos", () => {
      const parsedEmpty = ListCompanyJobApplicationsSchema.safeParse({});
      expect(parsedEmpty.success).toBe(true);
      if (parsedEmpty.success) {
        expect(parsedEmpty.data.limit).toBe(50);
      }

      const parsedWithFilter = ListCompanyJobApplicationsSchema.safeParse({
        status: "submitted",
        limit: 20,
      });
      expect(parsedWithFilter.success).toBe(true);
    });

    it("rejeita limites fora do intervalo", () => {
      const parsedZero = ListCompanyJobApplicationsSchema.safeParse({ limit: 0 });
      expect(parsedZero.success).toBe(false);

      const parsedOver = ListCompanyJobApplicationsSchema.safeParse({ limit: 150 });
      expect(parsedOver.success).toBe(false);
    });
  });

  describe("UpdateCompanyJobApplicationStatusSchema", () => {
    it("valida status canônicos permitidos com UUID válido", () => {
      const valid = UpdateCompanyJobApplicationStatusSchema.safeParse({
        applicationId: "c18a993e-f6cb-4034-9ca9-a9a3b04c1065",
        status: "reviewing",
        feedbackNotes: "Candidato com bom perfil para entrevista inicial.",
      });
      expect(valid.success).toBe(true);
    });

    it("rejeita status inválidos e UUIDs mal formatados", () => {
      const invalidStatus = UpdateCompanyJobApplicationStatusSchema.safeParse({
        applicationId: "c18a993e-f6cb-4034-9ca9-a9a3b04c1065",
        status: "invalido",
      });
      expect(invalidStatus.success).toBe(false);

      const invalidUuid = UpdateCompanyJobApplicationStatusSchema.safeParse({
        applicationId: "123-nao-uuid",
        status: "submitted",
      });
      expect(invalidUuid.success).toBe(false);
    });
  });

  describe("CompanyCustomFormFieldSchema & UpdateCompanyCustomFormSettingsSchema", () => {
    it("valida campos customizados de texto, select e checkbox", () => {
      const parsed = UpdateCompanyCustomFormSettingsSchema.safeParse({
        fields: [
          {
            id: "data_pretendida",
            label: "Qual a data preferida para atendimento?",
            type: "text",
            required: true,
          },
          {
            id: "tipo_imovel",
            label: "Qual o tipo de imóvel de interesse?",
            type: "select",
            required: false,
            options: ["Apartamento", "Casa", "Terreno"],
          },
          {
            id: "aceita_veiculo",
            label: "Possui veículo para dar de entrada?",
            type: "checkbox",
            required: false,
          },
        ],
      });
      expect(parsed.success).toBe(true);
    });

    it("rejeita campos sem rótulo ou com tipo desconhecido", () => {
      const invalid = CompanyCustomFormFieldSchema.safeParse({
        id: "teste",
        label: "",
        type: "unknown_type" as any,
      });
      expect(invalid.success).toBe(false);
    });
  });
});
