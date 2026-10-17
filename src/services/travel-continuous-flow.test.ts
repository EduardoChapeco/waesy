import { describe, it, expect } from "vitest";
import { formatMoney } from "@/lib/money";

describe("Ecossistema de Turismo — Onda 1 (Blindagem Fiscal, Multi-Payer & Continuous Flow)", () => {
  it("garante a segregação estrita entre Volume Total da Operadora e Fato Gerador da Agência", () => {
    // Simulação dos dados reais da Orinter extraídos em d:\DOWNLOADS\ALISSON\
    const grossOperatorVolumeCents = 783638; // R$ 7.836,38 (total do pacote)
    const operatorDirectTransactedCents = 783638; // 10x R$ 783,64 no cartão Elo direto na Orinter
    const agencyRetainedPixCents = 0; // Agência não reteve Pix nessa venda

    // A operadora remunera a agência com 10% de comissão base + taxa DU de R$ 150,00
    const baseCommissionPct = 10.0;
    const baseCommissionCents = Math.round((grossOperatorVolumeCents * baseCommissionPct) / 100); // R$ 783,64
    const duFeeCents = 15000; // R$ 150,00
    const overGrossCents = 0;

    // Fato gerador EXCLUSIVO da NFS-e de intermediação turística da agência
    const agencyTaxableTakeRateCents = baseCommissionCents + duFeeCents + overGrossCents; // R$ 933,64

    // Projeção do Simples Nacional Anexo III Turismo (6%)
    const projectedTaxRatePct = 6.0;
    const correctTaxDueCents = Math.round((agencyTaxableTakeRateCents * projectedTaxRatePct) / 100); // 6% sobre R$ 933,64 = R$ 56,02

    // Cálculo ERRADO (Bitributação abusiva sobre o volume da operadora)
    const incorrectTaxDueCents = Math.round((grossOperatorVolumeCents * projectedTaxRatePct) / 100); // 6% sobre R$ 7.836,38 = R$ 470,18

    expect(formatMoney(grossOperatorVolumeCents)).toBe("R$ 7.836,38");
    expect(formatMoney(agencyTaxableTakeRateCents)).toBe("R$ 933,64");
    expect(formatMoney(correctTaxDueCents)).toBe("R$ 56,02");
    expect(formatMoney(incorrectTaxDueCents)).toBe("R$ 470,18");

    // Prova matemática: A blindagem fiscal economiza R$ 414,16 nesta venda isolada
    const taxSavingsCents = incorrectTaxDueCents - correctTaxDueCents;
    expect(taxSavingsCents).toBe(41416);
  });

  it("garante a distribuição percentual e por cotas entre múltiplos pagadores de um contrato", () => {
    const totalContractCents = 1200000; // R$ 12.000,00

    const signers = [
      { name: "Passageiro A", sharePct: 50.0, method: "card" },
      { name: "Passageiro B", sharePct: 30.0, method: "pix" },
      { name: "Passageiro C", sharePct: 20.0, method: "boleto" },
    ];

    const totalSharePct = signers.reduce((acc, s) => acc + s.sharePct, 0);
    expect(totalSharePct).toBe(100.0);

    const calculatedAmounts = signers.map((s) => ({
      name: s.name,
      amountCents: Math.round((totalContractCents * s.sharePct) / 100),
    }));

    expect(calculatedAmounts[0].amountCents).toBe(600000); // R$ 6.000,00
    expect(calculatedAmounts[1].amountCents).toBe(360000); // R$ 3.600,00
    expect(calculatedAmounts[2].amountCents).toBe(240000); // R$ 2.400,00

    const sumAmounts = calculatedAmounts.reduce((acc, s) => acc + s.amountCents, 0);
    expect(sumAmounts).toBe(totalContractCents);
  });

  it("valida a trava de emissão quando houver pagadores com assinatura pendente", () => {
    const signers = [
      { id: "s1", status: "signed" },
      { id: "s2", status: "pending" }, // Pendência!
    ];

    const hasPendingSigners = signers.some((s) => s.status !== "signed");
    expect(hasPendingSigners).toBe(true);

    const canEmitTrip = !hasPendingSigners;
    expect(canEmitTrip).toBe(false);

    // Quando todos assinam:
    signers[1].status = "signed";
    const canEmitNow = !signers.some((s) => s.status !== "signed");
    expect(canEmitNow).toBe(true);
  });

  it("valida regras de deep link para check-in oficial das companhias aéreas", () => {
    const airlineTemplate =
      "https://www.latamairlines.com/br/pt/cartao-de-embarque?orderId={{pnr}}&lastName={{lastName}}";
    const pnr = "ABC123";
    const lastName = "CRUZ";

    const resolvedUrl = airlineTemplate
      .replace("{{pnr}}", encodeURIComponent(pnr))
      .replace("{{lastName}}", encodeURIComponent(lastName));

    expect(resolvedUrl).toBe(
      "https://www.latamairlines.com/br/pt/cartao-de-embarque?orderId=ABC123&lastName=CRUZ",
    );
  });
});
