import { describe, it, expect } from "vitest";
import { formatMoney, formatCentsToBRL, parseBRLToCents, maskCurrencyBRL, parseMoney } from "./money";

describe("Money Library - BRL Cents", () => {
 it("formats integer cents into localized BRL currency", () => {
 expect(formatMoney(10000)).toMatch(/R\$\s*100,00/);
 expect(formatMoney(0)).toMatch(/R\$\s*0,00/);
 expect(formatMoney(1250)).toMatch(/R\$\s*12,50/);
 expect(formatMoney(99)).toMatch(/R\$\s*0,99/);
 expect(formatMoney(null)).toMatch(/R\$\s*0,00/);
 expect(formatMoney(undefined)).toMatch(/R\$\s*0,00/);
 });

 it("formats cents to plain BRL decimal string", () => {
 expect(formatCentsToBRL(80000)).toBe("800,00");
 expect(formatCentsToBRL(1250)).toBe("12,50");
 expect(formatCentsToBRL(0)).toBe("0,00");
 expect(formatCentsToBRL(null)).toBe("");
 expect(formatCentsToBRL(undefined)).toBe("");
 });

 it("parses BRL formatted string into integer cents", () => {
 expect(parseBRLToCents("800,00")).toBe(80000);
 expect(parseBRLToCents("R$ 1.250,50")).toBe(125050);
 expect(parseBRLToCents("0,50")).toBe(50);
 expect(parseBRLToCents("")).toBe(0);
 expect(parseBRLToCents(null)).toBe(0);
 });

 it("masks input progressively into BRL format", () => {
 expect(maskCurrencyBRL("800")).toBe("8,00");
 expect(maskCurrencyBRL("80000")).toBe("800,00");
 expect(maskCurrencyBRL("")).toBe("");
 expect(maskCurrencyBRL(null)).toBe("");
 });

 it("parses raw formatted money back to numeric value", () => {
 expect(parseMoney("R$ 100,00")).toBe(10000);
 expect(parseMoney("R$ -50,00")).toBe(-5000);
 });
});
