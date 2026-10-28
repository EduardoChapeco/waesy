import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { RichPostContent } from "./rich-post-content";
import { checkHasCustomPageMobileHeader } from "@/components/shell/app-shell";

describe("Community Feed Experience Suite", () => {
  it("checkHasCustomPageMobileHeader reconhece rotas de comunidades /c/ e evita duplicação de cabeçalhos", () => {
    expect(checkHasCustomPageMobileHeader("/c")).toBe(true);
    expect(checkHasCustomPageMobileHeader("/c/design-threads")).toBe(true);
    expect(checkHasCustomPageMobileHeader("/c/beta-community")).toBe(true);
    expect(checkHasCustomPageMobileHeader("/c/qualquer-slug")).toBe(true);
  });

  it("RichPostContent renderiza marca-texto cromático (amarelo padrão e cores específicas)", () => {
    const html1 = renderToStaticMarkup(<RichPostContent content="Este é um ==texto destacado==" />);
    expect(html1).toContain("texto destacado");
    expect(html1).toContain("bg-amber-300/90");

    const html2 = renderToStaticMarkup(<RichPostContent content="Novidade ==cyan:estilo moderno== na área" />);
    expect(html2).toContain("estilo moderno");
    expect(html2).toContain("bg-cyan-300/90");

    const html3 = renderToStaticMarkup(<RichPostContent content="Oferta ==pink:super exclusiva== aqui" />);
    expect(html3).toContain("super exclusiva");
    expect(html3).toContain("bg-pink-300/90");
  });

  it("RichPostContent renderiza formatações inline Markdown (*bold*, _italic_, ~strike~, `code`)", () => {
    const html = renderToStaticMarkup(
      <RichPostContent content="Testando *palavra em negrito*, _palavra em itálico_, ~palavra riscada~ e `código inline`." />
    );

    expect(html).toContain("<strong class=\"font-bold text-foreground\">palavra em negrito</strong>");
    expect(html).toContain("<em class=\"italic\">palavra em itálico</em>");
    expect(html).toContain("<del class=\"line-through opacity-80\">palavra riscada</del>");
    expect(html).toContain("<code class=\"px-2 py-1 rounded-sm bg-muted text-xs font-mono text-primary font-semibold\">código inline</code>");
  });

  it("RichPostContent combina marca-texto com formatações internas sem quebra", () => {
    const html = renderToStaticMarkup(
      <RichPostContent content="Veja esse ==green:*destaque em negrito*==" />
    );
    expect(html).toContain("bg-emerald-300/90");
    expect(html).toContain("<strong class=\"font-bold text-foreground\">destaque em negrito</strong>");
  });
});
