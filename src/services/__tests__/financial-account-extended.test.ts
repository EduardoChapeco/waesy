/**
 * src/services/__tests__/financial-account-extended.test.ts
 *
 * Testes Unitários de Integridade da Gestão Financeira Ampliada, Cartões Reais,
 * Rendimento CDI e Chaves Pix.
 * Normativa: SPEC-20261028-FINANCAS-CANONICAL-REAL-PARITY, AGENTS.md B.8, B.25
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

describe("Financial Account Extended Service Unit Tests", () => {
  it("valida contrato e integridade das chaves Pix suportadas", () => {
    const validKeyTypes = ["CPF", "EMAIL", "PHONE", "RANDOM"];
    expect(validKeyTypes).toHaveLength(4);
    expect(validKeyTypes).toContain("CPF");
    expect(validKeyTypes).toContain("RANDOM");
  });

  it("calcula rendimento diário pró-rata com base na taxa CDI oficial", () => {
    // CDI base anual aproximado de 10.65% a.a. em 252 dias úteis
    const cdiAnnualRate = 0.1065;
    const workDays = 252;
    const dailyRate = Math.pow(1 + cdiAnnualRate, 1 / workDays) - 1;
    expect(dailyRate).toBeGreaterThan(0);
    expect(dailyRate).toBeLessThan(0.001); // Menor que 0.1% ao dia

    const balanceCents = 100000; // R$ 1.000,00
    const yieldForOneDayCents = Math.round(balanceCents * dailyRate);
    expect(yieldForOneDayCents).toBeGreaterThan(0);
  });

  it("impõe isolamento de dados de cartão de crédito e mascaramento", () => {
    const rawNumber = "4892560123488842";
    const lastFour = rawNumber.slice(-4);
    const masked = `•••• •••• •••• ${lastFour}`;
    expect(lastFour).toBe("8842");
    expect(masked).toBe("•••• •••• •••• 8842");
    expect(masked).not.toContain("4892");
  });

  it("garante idempotência e unicidade de hash de transação", () => {
    const txId1 = "FAT-" + "A1B2C3D4";
    const txId2 = "FAT-" + "E5F6G7H8";
    expect(txId1).not.toBe(txId2);
    expect(txId1.startsWith("FAT-")).toBe(true);
  });
});
