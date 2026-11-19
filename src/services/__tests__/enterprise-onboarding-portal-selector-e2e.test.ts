import { describe, it, expect, vi } from "vitest";
import { registerEnterpriseOnboardingSchema } from "@/services/enterprise-onboarding.functions";
import { validateCpfMod11, validateBirthDate } from "@/lib/document-validator";

describe("Enterprise Onboarding & Portal Selector E2E Suite", () => {
  it("valida schema de onboarding corporativo com dados legais estritos do titular", () => {
    const validData = {
      fullName: "Carlos Eduardo Oliveira",
      cpf: "11144477735",
      birthDate: "1990-05-15",
      phone: "49999887766",
      email: "contato@destinosecia.com.br",
      password: "senhaSegura123",
      tradeName: "Destinos & Cia Turismo",
      corporateName: "Destinos & Cia Viagens Ltda",
      cnpj: "12345678000195",
      niche: "turismo",
      city: "São Miguel do Oeste",
      state: "SC",
      address: "Rua Duque de Caxias, 100",
    };

    const parsed = registerEnterpriseOnboardingSchema.safeParse(validData);
    expect(parsed.success).toBe(true);
  });

  it("rejeita onboarding com titular menor de 18 anos", () => {
    const today = new Date();
    const minorYear = today.getFullYear() - 16;
    const minorDate = `${minorYear}-01-01`;

    const check = validateBirthDate(minorDate, { minAge: 18 });
    expect(check.isValid).toBe(false);
    expect(check.error).toBeDefined();
  });

  it("aceita titular maior de 18 anos conforme legislação brasileira", () => {
    const adultDate = "1995-10-20";
    const check = validateBirthDate(adultDate, { minAge: 18 });
    expect(check.isValid).toBe(true);
    expect(check.age).toBeGreaterThanOrEqual(18);
  });

  it("valida conformidade de CPF Mod11 no onboarding", () => {
    expect(validateCpfMod11("11144477735")).toBe(true);
    expect(validateCpfMod11("00000000000")).toBe(false);
    expect(validateCpfMod11("12345678901")).toBe(false);
  });

  it("exige nicho e dados de localização no cadastro do negócio", () => {
    const incompleteData = {
      fullName: "Ana Maria Souza",
      cpf: "11144477735",
      birthDate: "1988-03-22",
      phone: "11988776655",
      email: "ana@loja.com",
      tradeName: "Boutique Elegance",
      niche: "", // vazio
      city: "",
      state: "SP",
    };

    const parsed = registerEnterpriseOnboardingSchema.safeParse(incompleteData);
    expect(parsed.success).toBe(false);
  });

  it("garante que estado UF seja normalizado em 2 letras", () => {
    const invalidStateData = {
      fullName: "Roberto Silva",
      cpf: "11144477735",
      birthDate: "1985-07-10",
      phone: "49999887766",
      email: "roberto@atacado.com",
      tradeName: "Distribuidora Oeste",
      niche: "b2b_distribuidora",
      city: "Chapecó",
      state: "SANTA CATARINA", // Inválido (deve ter 2 letras)
    };

    const parsed = registerEnterpriseOnboardingSchema.safeParse(invalidStateData);
    expect(parsed.success).toBe(false);
  });
});
