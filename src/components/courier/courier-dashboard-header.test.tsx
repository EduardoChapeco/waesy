import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

// Mock Sheet for SSR
vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children, open }: any) => (open ? <div data-testid="sheet-open">{children}</div> : null),
  SheetContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  SheetHeader: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  SheetTitle: ({ children, ...props }: any) => <h2 {...props}>{children}</h2>,
}));

import { CourierDashboardHeader } from "./CourierDashboardHeader";

describe("Courier — CourierDashboardHeader (iFood Entregador Parity)", () => {
  it("renderiza o cabeçalho operacional com status online, ganhos e maquininha bluetooth", () => {
    const html = renderToStaticMarkup(
      <CourierDashboardHeader
        courierName="CARLOS EDUARDO"
        vehicleType="moto"
        rating={4.99}
        totalDeliveries={512}
        todayEarningsCents={24580}
        isOnline={true}
      />
    );

    expect(html).toContain("CARLOS EDUARDO");
    expect(html).toContain("4.99 ");
    expect(html).toContain("512 entregas concluídas");
    expect(html).toContain("Online");
    expect(html).toContain("Ganhos de Hoje");
    expect(html).toContain("Transferir");
    expect(html).toContain("Pax D190 Bluetooth");
    expect(html).toContain("Pronta para Cobrança");
  });
});
