/**
 * ============================================================================
 * Waesy Platform — financial-cards-loans.test.tsx
 * ============================================================================
 * Testes unitários para componentes de Cartão de Crédito e Empréstimos:
 * - CreditCardInvoiceView
 * - CardSettingsDrawer
 * - LoanSimulationSheet
 * - InstallmentTimelineDrawer
 * ============================================================================
 */

import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

// Mock @/components/ui/sheet para renderização estática SSR no Vitest
vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children, open }: any) => (open ? <div data-testid="sheet-open">{children}</div> : null),
  SheetContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  SheetHeader: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  SheetTitle: ({ children, ...props }: any) => <h2 {...props}>{children}</h2>,
}));

import { CreditCardInvoiceView } from "./CreditCardInvoiceView";
import { CardSettingsDrawer } from "./CardSettingsDrawer";
import { LoanSimulationSheet } from "./LoanSimulationSheet";
import { InstallmentTimelineDrawer } from "./InstallmentTimelineDrawer";

describe("Waesy Bank — CreditCardInvoiceView", () => {
  it("renderiza o estado honesto quando não há faturas no banco", () => {
    const html = renderToStaticMarkup(
      <CreditCardInvoiceView
        cardHolderName="EDUARDO RAMOS"
        lastFourDigits="4892"
        invoices={[]}
      />
    );

    expect(html).toContain("EDUARDO RAMOS");
    expect(html).toContain("•••• 4892");
    expect(html).toContain("Nenhuma fatura em aberto");
  });

  it("renderiza o resumo da fatura com barra de limite e CTAs táteis quando há dados reais", () => {
    const html = renderToStaticMarkup(
      <CreditCardInvoiceView
        cardHolderName="EDUARDO RAMOS"
        lastFourDigits="4892"
        totalLimitCents={500000}
        usedLimitCents={148290}
        invoices={[
          {
            id: "inv-out",
            monthLabel: "OUT",
            fullLabel: "Outubro 2026",
            status: "open",
            totalCents: 148290,
            dueDate: "15 OUT",
            items: [],
          },
        ]}
      />
    );

    expect(html).toContain("EDUARDO RAMOS");
    expect(html).toContain("•••• 4892");
    expect(html).toContain("Limite disponível");
    expect(html).toContain("Pagar");
    expect(html).toContain("Virtual");
    expect(html).toContain("Limites");
    expect(html).toContain("Faturas Mensais");
  });
});

describe("Waesy Bank — CardSettingsDrawer", () => {
  it("renderiza os controles do cartão virtual e switches de segurança quando aberto", () => {
    const html = renderToStaticMarkup(
      <CardSettingsDrawer
        open={true}
        onOpenChange={() => {}}
        cardHolderName="EDUARDO RAMOS"
        cardNumber="4892 5601 2348 9012"
      />
    );

    expect(html).toContain("Cartão Virtual Waesy");
    expect(html).toContain("WAESY BANK");
    expect(html).toContain("Bloqueio Temporário");
    expect(html).toContain("Limite do Cartão");
    expect(html).toContain("Compras por Aproximação");
    expect(html).toContain("Compras Online");
  });
});

describe("Waesy Bank — LoanSimulationSheet", () => {
  it("renderiza a simulação de empréstimo e solicita análise sem prometer saque", () => {
    const html = renderToStaticMarkup(
      <LoanSimulationSheet
        open={true}
        onOpenChange={() => {}}
        preApprovedLimitCents={2500000}
      />
    );

    expect(html).toContain("Empréstimo Pessoal Waesy");
    expect(html).toContain("Limite Pré-Aprovado");
    expect(html).toContain("Quanto você precisa?");
    expect(html).toContain("Em quantas parcelas?");
    expect(html).toContain("Valor da parcela");
    expect(html).toContain("Solicitar análise");
  });
});

describe("Waesy Bank — InstallmentTimelineDrawer", () => {
  it("renderiza o estado honesto vazio quando não há parcelas cadastradas", () => {
    const html = renderToStaticMarkup(
      <InstallmentTimelineDrawer
        open={true}
        onOpenChange={() => {}}
        contractTitle="Empréstimo Pessoal Waesy #9482"
        installments={[]}
      />
    );

    expect(html).toContain("Cronograma de Parcelas");
    expect(html).toContain("Empréstimo Pessoal Waesy #9482");
    expect(html).toContain("Nenhuma parcela ativa encontrada");
  });

  it("renderiza o cronograma de parcelas e progresso do contrato quando há parcelas ativas", () => {
    const html = renderToStaticMarkup(
      <InstallmentTimelineDrawer
        open={true}
        onOpenChange={() => {}}
        contractTitle="Empréstimo Pessoal Waesy #9482"
        totalInstallments={6}
        installments={[
          { number: 1, dueDate: "15/08/2026", amountCents: 18742, status: "paid" },
          { number: 2, dueDate: "15/09/2026", amountCents: 18742, status: "due" },
        ]}
      />
    );

    expect(html).toContain("Cronograma de Parcelas");
    expect(html).toContain("Empréstimo Pessoal Waesy #9482");
    expect(html).toContain("Progresso do contrato");
    expect(html).toContain("Parcela 1/6");
  });
});
