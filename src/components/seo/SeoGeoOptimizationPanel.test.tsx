import React from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SeoGeoOptimizationPanel, type SeoGeoMetadata } from "./SeoGeoOptimizationPanel";

describe("SeoGeoOptimizationPanel", () => {
  it("renders the canonical SEO and GEO panel markup with WebMCP badge and title", () => {
    const value: SeoGeoMetadata = {
      seoTitle: "Título Canônico de Teste",
      seoDescription: "Descrição detalhada para teste de SEO e agentes",
      keywords: ["imovel", "centro", "venda"],
      latitude: -26.7265,
      longitude: -53.5186,
      city: "São Miguel do Oeste",
      state: "SC",
      allowAiIndexing: true,
    };
    const onChange = vi.fn();

    const html = renderToStaticMarkup(
      <SeoGeoOptimizationPanel
        value={value}
        onChange={onChange}
        referenceTitle="Título de Referência"
      />
    );

    expect(html).toContain("SEO, GEO &amp; Agentes de IA");
    expect(html).toContain("WebMCP 2.0");
    expect(html).toContain("Otimização para Google, ChatGPT, Perplexity e busca local");
    expect(html).toContain("Configurar");
  });

  it("includes SEO fields, character counter and tags in render output", () => {
    const value: SeoGeoMetadata = {
      seoTitle: "Apartamento 3 Quartos Centro",
      seoDescription: "Excelente oportunidade em área nobre.",
      keywords: ["apartamento", "imoveis"],
      allowAiIndexing: true,
    };

    const html = renderToStaticMarkup(
      <SeoGeoOptimizationPanel
        value={value}
        onChange={vi.fn()}
        defaultOpen={true}
      />
    );

    expect(html).toContain("Título SEO Canônico");
    expect(html).toContain("Meta Descrição (Snippet)");
    expect(html).toContain("Tags &amp; Palavras-chave de Busca");
    expect(html).toContain("Geolocalização &amp; Indexação Local (GEO/ICBM)");
    expect(html).toContain("#apartamento");
    expect(html).toContain("#imoveis");
  });
});
