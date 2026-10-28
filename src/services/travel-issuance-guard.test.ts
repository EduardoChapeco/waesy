/**
 * travel-issuance-guard.test.ts
 * Suíte de Testes Automatizados para o Motor de Validação de Emissão, KYC e Prevenção de Erros Aéreos
 */

import { describe, it, expect } from "vitest";
import {
  calculateNameSimilarity,
  normalizeNameForAirline,
  computeIssuanceEligibility,
} from "./travel-issuance-guard.functions";

describe("Anti-Fraud & ANAC Security: Motor de Validação de Emissão", () => {
  it("deve normalizar nomes removendo acentos e caracteres especiais no padrão IATA/ANAC", () => {
    expect(normalizeNameForAirline("João Victor de Araújo!")).toBe("JOAO VICTOR DE ARAUJO");
    expect(normalizeNameForAirline("Renata  Müller-Svensson")).toBe("RENATA MULLERSVENSSON");
  });

  it("deve calcular a similaridade de nomes detectando divergências parciais e completas", () => {
    expect(calculateNameSimilarity("Carlos Eduardo da Silva", "Carlos Eduardo da Silva")).toBe(1.0);
    expect(calculateNameSimilarity("João da Silva", "Joao da Silva")).toBe(1.0);
    // Primeiro e último nome coincidentes
    expect(calculateNameSimilarity("Carlos E. Silva", "Carlos Eduardo da Silva")).toBeGreaterThanOrEqual(0.85);
    // Nomes completamente distintos
    expect(calculateNameSimilarity("Maria Conceição", "Carlos Eduardo da Silva")).toBeLessThan(0.4);
  });

  it("deve programar emissão após 1h quando o pagamento for à vista (PIX/Dinheiro)", () => {
    const result = computeIssuanceEligibility({
      paymentMethod: "pix",
      typedTravelerName: "Carlos Eduardo da Silva",
      typedTravelerCpf: "12345678901",
      hasVerifiedDocument: false,
      hasVerifiedFace: false,
    });

    expect(result.policy).toBe("delayed_1h");
    expect(result.canIssueImmediately).toBe(false);
    expect(result.checklist.isCashUpfront).toBe(true);
    expect(result.scheduledIssuanceTime).toBeDefined();
  });

  it("deve liberar emissão instantânea na hora para cartão quando a Tríade de Confiança for atendida", () => {
    const result = computeIssuanceEligibility({
      paymentMethod: "credit_card",
      typedTravelerName: "Carlos Eduardo da Silva",
      typedTravelerCpf: "12345678901",
      cardholderName: "CARLOS EDUARDO DA SILVA",
      cardholderCpf: "123.456.789-01",
      hasVerifiedDocument: true,
      hasVerifiedFace: true,
    });

    expect(result.policy).toBe("instant");
    expect(result.canIssueImmediately).toBe(true);
    expect(result.checklist.hasVerifiedDocument).toBe(true);
    expect(result.checklist.hasVerifiedFace).toBe(true);
    expect(result.checklist.isCardholderSameAsTraveler).toBe(true);
  });

  it("deve reter para revisão de backoffice quando o cartão estiver em nome de terceiro", () => {
    const result = computeIssuanceEligibility({
      paymentMethod: "credit_card",
      typedTravelerName: "Carlos Eduardo da Silva",
      typedTravelerCpf: "12345678901",
      cardholderName: "MARCOS VINICIUS PEREIRA", // Terceiro
      cardholderCpf: "98765432100",
      hasVerifiedDocument: true,
      hasVerifiedFace: true,
    });

    expect(result.policy).toBe("manual_review");
    expect(result.canIssueImmediately).toBe(false);
    expect(result.checklist.isCardholderSameAsTraveler).toBe(false);
    expect(result.reason).toContain("Cartão em nome de terceiro");
  });

  it("deve reter para revisão quando biometria facial ou documento estiverem pendentes no cartão", () => {
    const result = computeIssuanceEligibility({
      paymentMethod: "credit_card",
      typedTravelerName: "Carlos Eduardo da Silva",
      typedTravelerCpf: "12345678901",
      cardholderName: "Carlos Eduardo da Silva",
      hasVerifiedDocument: true,
      hasVerifiedFace: false, // Biometria facial pendente
    });

    expect(result.policy).toBe("manual_review");
    expect(result.canIssueImmediately).toBe(false);
    expect(result.reason).toContain("Validação facial");
  });
});
