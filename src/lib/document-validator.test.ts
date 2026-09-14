import { describe, it, expect } from "vitest";
import {
  validateCpfMod11,
  validateCnpjMod11,
  validateBirthDate,
  validateCep,
  formatCpf,
  formatCnpj,
  formatCep,
  formatPhone,
  maskCpfProgressive,
  maskCnpjProgressive,
  maskDocumentProgressive,
  maskPlate,
  validatePlate,
  detectCardBrand,
  maskCreditCardNumber,
  maskCardExpiry,
} from "./document-validator";

describe("document-validator", () => {
  describe("validateCpfMod11", () => {
    it("rejects invalid length or empty CPF", () => {
      expect(validateCpfMod11("")).toBe(false);
      expect(validateCpfMod11("123")).toBe(false);
      expect(validateCpfMod11(null)).toBe(false);
    });

    it("rejects repeated sequence numbers", () => {
      expect(validateCpfMod11("111.111.111-11")).toBe(false);
      expect(validateCpfMod11("00000000000")).toBe(false);
      expect(validateCpfMod11("99999999999")).toBe(false);
    });

    it("validates mathematically valid CPF", () => {
      expect(validateCpfMod11("52998224725")).toBe(true);
      expect(validateCpfMod11("529.982.247-25")).toBe(true);
    });

    it("rejects mathematically invalid check digits", () => {
      expect(validateCpfMod11("52998224726")).toBe(false);
      expect(validateCpfMod11("12345678901")).toBe(false);
    });
  });

  describe("validateCnpjMod11", () => {
    it("rejects invalid length or empty CNPJ", () => {
      expect(validateCnpjMod11("")).toBe(false);
      expect(validateCnpjMod11("12345")).toBe(false);
    });

    it("rejects repeated sequence numbers", () => {
      expect(validateCnpjMod11("00000000000000")).toBe(false);
      expect(validateCnpjMod11("11.111.111/1111-11")).toBe(false);
    });

    it("validates mathematically valid CNPJ", () => {
      expect(validateCnpjMod11("00.000.000/0001-91")).toBe(true);
      expect(validateCnpjMod11("00000000000191")).toBe(true);
    });

    it("rejects invalid check digits", () => {
      expect(validateCnpjMod11("00.000.000/0001-92")).toBe(false);
    });
  });

  describe("validateBirthDate", () => {
    it("calculates age and enforces 18+ requirement", () => {
      const twentyYearsAgo = new Date();
      twentyYearsAgo.setFullYear(twentyYearsAgo.getFullYear() - 20);
      twentyYearsAgo.setMonth(twentyYearsAgo.getMonth() - 1); // Garante que o aniversário já ocorreu
      const isoDate = twentyYearsAgo.toISOString().split("T")[0];

      const res = validateBirthDate(isoDate, { minAge: 18 });
      expect(res.isValid).toBe(true);
      expect(res.age).toBe(20);
    });

    it("rejects under 18 when minAge is 18", () => {
      const tenYearsAgo = new Date();
      tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);
      tenYearsAgo.setMonth(tenYearsAgo.getMonth() - 1); // Garante que o aniversário já ocorreu
      const isoDate = tenYearsAgo.toISOString().split("T")[0];

      const res = validateBirthDate(isoDate, { minAge: 18 });
      expect(res.isValid).toBe(false);
      expect(res.age).toBe(10);
      expect(res.error).toContain("Idade mínima de 18 anos");
    });

    it("handles brazilian date format DD/MM/YYYY", () => {
      const res = validateBirthDate("15/05/1990", { minAge: 18 });
      expect(res.isValid).toBe(true);
      expect(res.age).toBeGreaterThanOrEqual(30);
    });

    it("rejects future dates", () => {
      const nextYear = new Date();
      nextYear.setFullYear(nextYear.getFullYear() + 1);
      const iso = nextYear.toISOString().split("T")[0];
      const res = validateBirthDate(iso);
      expect(res.isValid).toBe(false);
      expect(res.error).toContain("futuro");
    });
  });

  describe("validateCep & formatters", () => {
    it("validates 8 digits CEP", () => {
      expect(validateCep("89800-000")).toBe(true);
      expect(validateCep("89800000")).toBe(true);
      expect(validateCep("1234")).toBe(false);
      expect(validateCep("")).toBe(false);
    });

    it("formats CEP correctly", () => {
      expect(formatCep("89800000")).toBe("89800-000");
    });

    it("formats CPF and CNPJ", () => {
      expect(formatCpf("52998224725")).toBe("529.982.247-25");
      expect(formatCnpj("00000000000191")).toBe("00.000.000/0001-91");
    });

    it("formats phone numbers", () => {
      expect(formatPhone("49999998888")).toBe("(49) 99999-8888");
      expect(formatPhone("4933221100")).toBe("(49) 3322-1100");
    });
  });

  describe("progressive document masking", () => {
    it("masks CPF progressively", () => {
      expect(maskCpfProgressive("5")).toBe("5");
      expect(maskCpfProgressive("529")).toBe("529");
      expect(maskCpfProgressive("5299")).toBe("529.9");
      expect(maskCpfProgressive("52998224725")).toBe("529.982.247-25");
    });

    it("masks CNPJ progressively", () => {
      expect(maskCnpjProgressive("12")).toBe("12");
      expect(maskCnpjProgressive("12345")).toBe("12.345");
      expect(maskCnpjProgressive("12345678000190")).toBe("12.345.678/0001-90");
    });

    it("transitions dynamically between CPF and CNPJ", () => {
      expect(maskDocumentProgressive("52998224725")).toBe("529.982.247-25");
      // Ao digitar o 12º dígito, deve transicionar para máscara de CNPJ
      expect(maskDocumentProgressive("123456780001")).toBe("12.345.678/0001");
      expect(maskDocumentProgressive("12345678000190")).toBe("12.345.678/0001-90");
    });
  });

  describe("plates & credit cards", () => {
    it("validates and masks vehicle plates (traditional and mercosul)", () => {
      expect(validatePlate("ABC-1234")).toBe(true);
      expect(validatePlate("ABC1234")).toBe(true);
      expect(validatePlate("ABC1D23")).toBe(true);
      expect(validatePlate("INVALID")).toBe(false);

      expect(maskPlate("abc1234")).toBe("ABC-1234");
      expect(maskPlate("abc1d23")).toBe("ABC1D23");
    });

    it("detects card brands and formats credit cards", () => {
      expect(detectCardBrand("4111111111111111")).toBe("visa");
      expect(detectCardBrand("5123456789012345")).toBe("mastercard");
      expect(detectCardBrand("6504051234567890")).toBe("elo");
      expect(detectCardBrand("341234567890123")).toBe("amex");
      expect(detectCardBrand("6062821234567890")).toBe("hipercard");

      expect(maskCreditCardNumber("4111111111111111")).toBe("4111 1111 1111 1111");
      expect(maskCardExpiry("1228")).toBe("12/28");
    });
  });
});
