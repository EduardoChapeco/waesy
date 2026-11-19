import { describe, it, expect } from "vitest";
import {
  detectDestinationRegulatoryRequirements,
  formatDestinationTaxesDisclaimer,
} from "../destination-regulatory-intelligence";

describe("Destination Regulatory & Tax Intelligence Engine", () => {
  it("detects Bonito (MS) mandatory voucher requirements and environmental fees", () => {
    const report = detectDestinationRegulatoryRequirements("Bonito MS com flutuação no Rio da Prata");
    expect(report.matchedDestination).toContain("Bonito");
    expect(report.hasMandatoryFees).toBe(true);
    expect(report.requirements.length).toBeGreaterThanOrEqual(1);

    const voucherReq = report.requirements.find((r) => r.id === "bonito-voucher-unico");
    expect(voucherReq).toBeDefined();
    expect(voucherReq?.category).toBe("voucher_mandatory");
    expect(voucherReq?.severity).toBe("mandatory");
  });

  it("detects Fernando de Noronha TPA and PARNAMAR ICMBio admission with fee estimates", () => {
    const report = detectDestinationRegulatoryRequirements("Fernando de Noronha", 5, 2);
    expect(report.matchedDestination).toContain("Fernando de Noronha");
    expect(report.hasMandatoryFees).toBe(true);

    const tpaReq = report.requirements.find((r) => r.id === "noronha-tpa");
    const parnamarReq = report.requirements.find((r) => r.id === "noronha-parnamar");
    expect(tpaReq).toBeDefined();
    expect(parnamarReq).toBeDefined();

    // 5 days * 2 pax * 9716 cents + 2 pax * 18600 cents
    // (5 * 2 * 9716) = 97160 cents
    // (2 * 18600) = 37200 cents
    // Total = 134360 cents
    expect(report.totalEstimatedFeesCents).toBe(134360);
  });

  it("detects Cancún Visitax, sanitation hotel tax and passport requirements", () => {
    const report = detectDestinationRegulatoryRequirements("Pacote Cancún All Inclusive Resort");
    expect(report.matchedDestination).toContain("Cancún");
    expect(report.hasMandatoryFees).toBe(true);
    expect(report.hasPassportOrVisaAlerts).toBe(true);

    const visitax = report.requirements.find((r) => r.id === "cancun-visitax");
    expect(visitax).toBeDefined();
    expect(visitax?.severity).toBe("mandatory");
  });

  it("detects Chile/Argentina and alerts about CNH invalidity for international Mercosul flights", () => {
    const report = detectDestinationRegulatoryRequirements("Santiago do Chile com Atacama");
    expect(report.matchedDestination).toContain("Chile & Argentina");
    expect(report.hasPassportOrVisaAlerts).toBe(true);

    const rgReq = report.requirements.find((r) => r.id === "mercosul-rg-recent");
    expect(rgReq).toBeDefined();
    expect(rgReq?.actionTip).toContain("CNH não vale");
  });

  it("formats a clean, readable disclaimer text for customer proposals", () => {
    const report = detectDestinationRegulatoryRequirements("Jericoacoara");
    expect(report.disclaimerText).toContain("INFORMAÇÕES REGULATÓRIAS E TAXAS DO DESTINO");
    expect(report.disclaimerText).toContain("Taxa de Turismo Sustentável");
  });

  it("gracefully returns empty report for unmonitored or empty destination queries", () => {
    const report = detectDestinationRegulatoryRequirements(null);
    expect(report.matchedDestination).toBeNull();
    expect(report.requirements).toEqual([]);
    expect(report.hasMandatoryFees).toBe(false);

    const genericReport = detectDestinationRegulatoryRequirements("Chapecó SC");
    expect(genericReport.matchedDestination).toBeNull();
    expect(genericReport.requirements).toEqual([]);
  });
});
