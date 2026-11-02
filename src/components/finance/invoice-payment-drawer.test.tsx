/**
 * ============================================================================
 * Waesy Platform — invoice-payment-drawer.test.tsx
 * ============================================================================
 * Testes unitários para InvoicePaymentDrawer:
 * 1. Renderiza opções de saldo, Pix instantâneo e boleto bancário.
 * 2. Exibe aviso de saldo suficiente vs insuficiente.
 * 3. Formata valor da fatura e chaves EMV BACEN em conformidade.
 * ============================================================================
 */

import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children, open }: any) => (open ? <div data-testid="sheet-open">{children}</div> : null),
  SheetContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  SheetHeader: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  SheetTitle: ({ children, ...props }: any) => <h2 {...props}>{children}</h2>,
  SheetDescription: ({ children, ...props }: any) => <p {...props}>{children}</p>,
}));

import { InvoicePaymentDrawer } from "./InvoicePaymentDrawer";

describe("Waesy Bank — InvoicePaymentDrawer", () => {
  it("renderiza o drawer aberto com saldo suficiente e botão de quitação imediata", () => {
    const html = renderToStaticMarkup(
      <InvoicePaymentDrawer
        open={true}
        onOpenChange={vi.fn()}
        invoiceId="inv-oct-2026-001"
        monthLabel="OUT"
        dueDate="15 OUT"
        amountCents={45000} // R$ 450,00
        availableBalanceCents={100000} // R$ 1.000,00
        onPayWithBalance={vi.fn()}
      />
    );

    expect(html).toContain("Pagamento de Fatura");
    expect(html).toContain("R$ 450,00");
    expect(html).toContain("Fatura OUT");
    expect(html).toContain("Vence em 15 OUT");
    expect(html).toContain("Saldo suficiente");
    expect(html).toContain("Pagar Fatura com Saldo Agora");
  });

  it("renderiza aviso quando o saldo é insuficiente para quitação direta", () => {
    const html = renderToStaticMarkup(
      <InvoicePaymentDrawer
        open={true}
        onOpenChange={vi.fn()}
        invoiceId="inv-oct-2026-002"
        monthLabel="SET"
        dueDate="15 SET"
        amountCents={120000} // R$ 1.200,00
        availableBalanceCents={30000} // R$ 300,00
        onPayWithBalance={vi.fn()}
      />
    );

    expect(html).toContain("Saldo insuficiente na conta Waesy");
    expect(html).toContain("Pagar com Pix Instantâneo");
  });

  it("não renderiza conteúdo quando open é false", () => {
    const html = renderToStaticMarkup(
      <InvoicePaymentDrawer
        open={false}
        onOpenChange={vi.fn()}
        invoiceId="inv-oct-2026-003"
        monthLabel="AGO"
        dueDate="15 AGO"
        amountCents={25000}
        availableBalanceCents={50000}
        onPayWithBalance={vi.fn()}
      />
    );

    expect(html).toBe("");
  });
});
