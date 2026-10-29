import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { BlockErrorBoundary } from "./BlockErrorBoundary";

describe("BlockErrorBoundary — Isolamento Defensivo do OmniBuilder", () => {
  it("renderiza os filhos normalmente quando não há exceções", () => {
    const html = renderToStaticMarkup(
      <BlockErrorBoundary blockId="block-1" blockType="hero_banner">
        <div data-testid="safe-content">Bloco Seguro</div>
      </BlockErrorBoundary>
    );

    expect(html).toContain("Bloco Seguro");
    expect(html).not.toContain("Falha na renderização deste bloco");
  });

  it("getDerivedStateFromError atualiza o estado para hasError true", () => {
    const testError = new Error("Erro de renderização em nó");
    const derivedState = BlockErrorBoundary.getDerivedStateFromError(testError);

    expect(derivedState.hasError).toBe(true);
    expect(derivedState.error).toBe(testError);
  });

  it("renderiza o fallback defensivo quando hasError é true no estado", () => {
    const boundary = new BlockErrorBoundary({
      blockId: "block-test-99",
      blockType: "food_menu_streamlined",
      children: React.createElement("div", null, "Conteúdo"),
    });

    boundary.state = {
      hasError: true,
      error: new Error("Falha no componente"),
    };

    const rendered = boundary.render();
    const html = renderToStaticMarkup(rendered as React.ReactElement);

    expect(html).toContain("food_menu_streamlined");
    expect(html).toContain("Falha na renderização deste bloco");
    expect(html).toContain("Recarregar");
  });
});
