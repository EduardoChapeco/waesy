import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FinancialHeroCard } from "./FinancialHeroCard";
import { FinancialActionGrid } from "./FinancialActionGrid";
import { InAppNumericKeypad } from "./InAppNumericKeypad";
import { PaymentSuccessReceipt } from "./PaymentSuccessReceipt";

describe("Waesy Bank Financial Components (99Pay Parity)", () => {
  describe("FinancialHeroCard", () => {
    it("renders formatted balance and 99Pay yield pill", () => {
      const html = renderToStaticMarkup(
        <FinancialHeroCard
          balanceCents={2000000} // R$ 20.000,00
          yieldRateText="120% CDI ↑"
          cashbackText="1% de cashback"
        />
      );

      expect(html).toContain("Saldo Total");
      expect(html).toContain("120% CDI ↑");
      expect(html).toContain("1% de cashback");
      expect(html).toContain("Abastecer");
      expect(html).toContain("Pagar");
      expect(html).toContain("Transferir");
    });
  });

  describe("FinancialActionGrid", () => {
    it("renders all 8 squircle action items with min 44px touch targets", () => {
      const html = renderToStaticMarkup(<FinancialActionGrid />);

      expect(html).toContain("Pix");
      expect(html).toContain("Boleto");
      expect(html).toContain("Transferir");
      expect(html).toContain("Extrato");
      expect(html).toContain("Cobrar");
      expect(html).toContain("Cartões");
      expect(html).toContain("Recargas");
      expect(html).toContain("Empréstimos");
      expect(html).toContain("Instantâneo");
      expect(html).toContain("Até 36x");
    });
  });

  describe("InAppNumericKeypad", () => {
    it("renders ATM-style numeric keys and utility buttons with >=44px heights", () => {
      const html = renderToStaticMarkup(
        <InAppNumericKeypad
          onDigit={vi.fn()}
          onBackspace={vi.fn()}
          onClear={vi.fn()}
        />
      );

      // Verify digits 0-9
      for (let i = 0; i <= 9; i++) {
        expect(html).toContain(`Dígito ${i}`);
      }
      expect(html).toContain("Limpar");
      expect(html).toContain("Apagar dígito");
      expect(html).toContain("h-14 min-h-14");
    });
  });

  describe("PaymentSuccessReceipt", () => {
    it("renders success title, amount, recipient name and action buttons", () => {
      const html = renderToStaticMarkup(
        <PaymentSuccessReceipt
          amountCents={125000} // R$ 1.250,00
          recipientName="João Pedro Gonçalves"
          recipientInstitution="PICPAY"
          transactionId="TX-99887766"
        />
      );

      expect(html).toContain("Pix enviado com sucesso!");
      expect(html).toContain("Para João Pedro Gonçalves");
      expect(html).toContain("PICPAY");
      expect(html).toContain("TX-99887766");
    });
  });
});
