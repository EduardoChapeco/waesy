import { describe, it, expect, vi } from "vitest";
import {
  isValidCnpjMod11,
  parseOsmOpeningHours,
  computeIsOpenNow,
  synthesizeBusinessDescription,
} from "./business-curation-bootstrap";

describe("Business Curation Bootstrap Engine — Suite de Testes Canônicos", () => {
  describe("1. Validação Algorítmica de CNPJ (Módulo 11)", () => {
    it("deve validar com sucesso CNPJs reais matematicamente válidos", () => {
      // CNPJs de teste padrão da Receita Federal
      expect(isValidCnpjMod11("00.000.000/0001-91")).toBe(true);
      expect(isValidCnpjMod11("00000000000191")).toBe(true);
      expect(isValidCnpjMod11("11.222.333/0001-81")).toBe(true);
      expect(isValidCnpjMod11("33.000.167/0001-01")).toBe(true); // Petrobras
    });

    it("deve rejeitar CNPJs com dígitos verificadores corrompidos ou sequências repetidas", () => {
      expect(isValidCnpjMod11("00.000.000/0000-00")).toBe(false);
      expect(isValidCnpjMod11("11.111.111/1111-11")).toBe(false);
      expect(isValidCnpjMod11("12.345.678/0001-99")).toBe(false);
      expect(isValidCnpjMod11("00.000.000/0001-90")).toBe(false);
      expect(isValidCnpjMod11("abc")).toBe(false);
    });
  });

  describe("2. Normalizador de Horários de Funcionamento (OSM opening_hours)", () => {
    it("deve normalizar formato 24/7 para todos os dias da semana", () => {
      const hours = parseOsmOpeningHours("24/7");
      expect(hours).not.toBeNull();
      expect(hours?.segunda).toBe("Aberto 24 horas");
      expect(hours?.domingo).toBe("Aberto 24 horas");
    });

    it("deve mapear intervalo de dias Mo-Fr e sábado Sa corretamente", () => {
      const raw = "Mo-Fr 08:00-18:00; Sa 08:00-12:00";
      const hours = parseOsmOpeningHours(raw);
      expect(hours).not.toBeNull();
      expect(hours?.segunda).toBe("08:00-18:00");
      expect(hours?.terca).toBe("08:00-18:00");
      expect(hours?.quarta).toBe("08:00-18:00");
      expect(hours?.quinta).toBe("08:00-18:00");
      expect(hours?.sexta).toBe("08:00-18:00");
      expect(hours?.sabado).toBe("08:00-12:00");
      expect(hours?.domingo).toBe("Fechado");
    });

    it("deve retornar null para valores vazios ou indefinidos", () => {
      expect(parseOsmOpeningHours(null)).toBeNull();
      expect(parseOsmOpeningHours("")).toBeNull();
      expect(parseOsmOpeningHours("   ")).toBeNull();
    });
  });

  describe("3. Cálculo Dinâmico de Aberto Agora (computeIsOpenNow)", () => {
    it("deve retornar true para horários 'Aberto 24 horas'", () => {
      const hours = {
        segunda: "Aberto 24 horas",
        terca: "Aberto 24 horas",
        quarta: "Aberto 24 horas",
        quinta: "Aberto 24 horas",
        sexta: "Aberto 24 horas",
        sabado: "Aberto 24 horas",
        domingo: "Aberto 24 horas",
      };
      expect(computeIsOpenNow(hours)).toBe(true);
    });

    it("deve retornar false quando todos os dias estão marcados como Fechado", () => {
      const hours = {
        segunda: "Fechado",
        terca: "Fechado",
        quarta: "Fechado",
        quinta: "Fechado",
        sexta: "Fechado",
        sabado: "Fechado",
        domingo: "Fechado",
      };
      expect(computeIsOpenNow(hours)).toBe(false);
    });

    it("deve retornar false para workingHours nulo ou indefinido", () => {
      expect(computeIsOpenNow(null)).toBe(false);
      expect(computeIsOpenNow(undefined)).toBe(false);
    });
  });

  describe("4. Síntese Institucional Editorial (synthesizeBusinessDescription)", () => {
    it("deve gerar descrição fluida e informativa sem chavões publicitários", () => {
      const desc = synthesizeBusinessDescription({
        businessName: "Supermercado Alfa",
        category: "mercado",
        city: "Chapecó",
        state: "SC",
        address: "Av. Fernando Machado, 100",
        cnpjData: {
          cnae_principal: { descricao: "Comércio varejista de mercadorias em geral" },
        },
        workingHours: {
          segunda: "08:00 - 21:00",
        },
      });

      expect(desc).toContain("Supermercado Alfa");
      expect(desc).toContain("Chapecó/SC");
      expect(desc).toContain("supermercado e conveniência");
      expect(desc).toContain("Av. Fernando Machado, 100");
      expect(desc).toContain("Comércio varejista de mercadorias em geral");
      expect(desc).toContain("08:00 - 21:00");
      expect(desc.length).toBeGreaterThan(100);
    });
  });
});
