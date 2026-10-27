import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { RideBookingBottomSheet } from "./RideBookingBottomSheet";

describe("Mobility — RideBookingBottomSheet (BlaBlaCar & Apple HIG Parity)", () => {
  it("renderiza o indicador de ponto de embarque a pé e opções de veículos", () => {
    const html = renderToStaticMarkup(
      <RideBookingBottomSheet
        snapPoint="medium"
        originText="Av. Paulista, 1000"
        destinationText="Aeroporto de Congonhas"
        walkingDistanceMeters={220}
        walkingMinutes={3}
      />
    );

    expect(html).toContain("Ponto de embarque:");
    expect(html).toContain("220m");
    expect(html).toContain("(3 min a pé)");
    expect(html).toContain("Av. Paulista, 1000");
    expect(html).toContain("Aeroporto de Congonhas");
    expect(html).toContain("MotoLink Express");
    expect(html).toContain("Waesy Go Econômico");
    expect(html).toContain("Forma de Pagamento");
    expect(html).toContain("Confirmar");
  });

  it("renderiza no modo compacto com visual enxuto", () => {
    const html = renderToStaticMarkup(
      <RideBookingBottomSheet
        snapPoint="compact"
        originText="Rua XV de Novembro"
        walkingDistanceMeters={150}
        walkingMinutes={2}
      />
    );

    expect(html).toContain("Ponto de embarque:");
    expect(html).toContain("150m");
    expect(html).toContain("Rua XV de Novembro");
  });
});
