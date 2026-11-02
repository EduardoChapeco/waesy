import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { WaesyNewsPortal } from "../waesy-news-portal";
import { PrometheeNewsPortalBlock } from "@/components/builder/blocks/PrometheeNewsPortalBlock";
import { OmniPageRenderer } from "@/components/builder/OmniPageRenderer";
import { getStudioTemplate, materializeStudioTemplate } from "@/lib/builder/studio-catalog";
import { NEWS_WIX_APP_PAGES, applyTemplateToPage } from "@/lib/builder/omni-templates";
import { createEmptyOmniPage } from "@/types/omni-builder";
import { getSiteBlockByIdStrict } from "@/components/builder/registry";
import { resolveCityNewsCover } from "@/lib/news/city-editorial-images";
import { isSafePublicHttpsImageUrl, type NewsArticleDTO } from "@/services/news.functions";
import {
  buildStudioCarouselSlidesFromNews,
  normalizePrometheeArticle,
} from "@/lib/news/news-studio-templates";

describe("WaesyNewsPortal, Modular Prométhée Omni Blocks & Real News Pipeline", () => {
  it("renders the minimalist Prométhée portal with Waesynews brand, fixed + icon button, and Feito com Waesy signature without any proposal elements", () => {
    const html = renderToStaticMarkup(<WaesyNewsPortal />);
    expect(html).toContain("h-dvh");
    expect(html).toContain("overflow-y-auto");
    expect(html).toContain("light");
    expect(html).toContain("Waesynews");
    expect(html).not.toContain("Proposta");
    expect(html).toContain("Estúdio PNG");
    expect(html).toContain("Cidades da Região:");
    expect(html).toContain("Visualização em Grade");
    expect(html).toContain("Sem matérias neste filtro");
    expect(html).not.toContain("BREAKING NEWS");
    expect(html).toContain("ADS");
    expect(html).toContain("Feito com");
    expect(html).toContain("/brand-logo.png");
    expect(html).toContain('aria-label="Enviar pauta ou relato"');
  });

  it("renders real mined journalistic cover photos when present and honest text cards (zero stock fallbacks) when absent", () => {
    const realArticles: NewsArticleDTO[] = [
      {
        id: "11111111-1111-4111-8111-111111111111",
        store_id: "22222222-2222-4222-8222-222222222222",
        title: "São José Basketball vence fora de casa pelo NBB",
        slug: "sao-jose-basketball-vence-nbb",
        kicker: "São José dos Campos",
        subtitle: "Equipe joseense abre vantagem na série dos playoffs.",
        content_sections: [
          { type: "paragraph", content: "O São José Basketball conquistou vitória importante fora de casa." },
        ],
        cover_media_url: "https://s2-g1.glbimg.com/real-editorial-photo-sjc.jpg",
        cover_media_type: "image",
        category: "esportes",
        tags: ["São José dos Campos", "Esportes"],
        reading_time_minutes: 3,
        views_count: 85,
        unique_views_count: 70,
        status: "published",
        published_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      },
      {
        id: "33333333-3333-4333-8333-333333333333",
        store_id: "22222222-2222-4222-8222-222222222222",
        title: "Comunicado oficial sobre manutenção viária em Taubaté",
        slug: "comunicado-manutencao-viaria-taubate",
        kicker: "Taubaté",
        subtitle: "Nota puramente textual sem fotografia anexada.",
        content_sections: [
          { type: "paragraph", content: "Equipes atuam no período noturno sem interdição total." },
        ],
        cover_media_url: null,
        cover_media_type: "image",
        category: "cidades",
        tags: ["Taubaté"],
        reading_time_minutes: 2,
        views_count: 19,
        unique_views_count: 16,
        status: "published",
        published_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      },
    ];

    const html = renderToStaticMarkup(<WaesyNewsPortal initialArticles={realArticles} />);
    expect(html).toContain("https://s2-g1.glbimg.com/real-editorial-photo-sjc.jpg");
    expect(html).toContain("São José Basketball vence fora de casa pelo NBB");
    expect(html).toContain("Comunicado oficial sobre manutenção viária em Taubaté");
    expect(html).not.toContain("unsplash.com");
    expect(html).not.toContain("pexels.com");

    const norm = normalizePrometheeArticle(realArticles[0], 0);
    expect(norm.city).toBe("São José dos Campos");
    expect(norm.category).toBe("Esportes");
    expect(norm.coverImageUrl).toBe("https://s2-g1.glbimg.com/real-editorial-photo-sjc.jpg");

    const slides = buildStudioCarouselSlidesFromNews(norm);
    expect(slides).toHaveLength(4);
    expect(slides[0].headline).toContain("São José Basketball");
  });

  it("registers news_promethee_portal, all 7 modular blocks, and NEWS_WIX_APP_PAGES in Omni Builder", () => {
    const modularIds = [
      "news_promethee_portal",
      "news_promethee_header",
      "news_promethee_nav",
      "news_promethee_breaking",
      "news_promethee_feed",
      "news_promethee_ad_slot",
      "news_promethee_article_reader",
      "news_promethee_footer",
    ];

    for (const blockId of modularIds) {
      const def = getSiteBlockByIdStrict(blockId);
      expect(def, `Block ${blockId} should be registered`).toBeDefined();
    }

    const studioTpl = getStudioTemplate("template_editorial_news");
    expect(studioTpl).toBeDefined();
    expect(studioTpl?.blocks[0]?.type).toBe("news_promethee_portal");

    const emptyDoc = createEmptyOmniPage("jornal-local", "Jornal Local", "news");
    const materialized = materializeStudioTemplate(emptyDoc, "template_editorial_news");
    expect(materialized.blocks.length).toBeGreaterThanOrEqual(4);
    expect(materialized.blocks[0].type).toBe("news_promethee_portal");

    const portalDef = getSiteBlockByIdStrict("news_promethee_portal")!;
    const blockHtml = renderToStaticMarkup(
      <PrometheeNewsPortalBlock id="test-promethee" data={portalDef.defaultProps} />,
    );
    expect(blockHtml).toContain("Waesy News");
    expect(blockHtml).toContain("Ler mais");

    // Wix-style multi-page News App Suite composed of modular blocks
    expect(NEWS_WIX_APP_PAGES.map((p) => p.slug)).toEqual([
      "noticias",
      "artigo",
      "anuncie",
      "enviar-pauta",
    ]);

    const modularHomeDoc = applyTemplateToPage(
      createEmptyOmniPage("noticias", "Portal Regional", "media"),
      "wix_news_home",
    );
    expect(modularHomeDoc.blocks.map((b) => b.type)).toEqual([
      "news_promethee_header",
      "news_promethee_nav",
      "news_promethee_breaking",
      "news_promethee_feed",
      "news_promethee_ad_slot",
      "news_promethee_article_reader",
      "news_promethee_footer",
    ]);

    const renderedModularHome = renderToStaticMarkup(
      <OmniPageRenderer
        document={modularHomeDoc}
        newsArticles={[
          {
            id: "art-live-1",
            title: "Investimento industrial cresce em Taubaté",
            subtitle: "Setor produtivo amplia contratações no primeiro semestre.",
            cover_media_url: "https://s2-g1.glbimg.com/taubate-industria.jpg",
            category: "economia",
            kicker: "Taubaté",
          },
        ]}
      />,
    );
    expect(renderedModularHome).toContain("Waesynews");
    expect(renderedModularHome).toContain("Investimento industrial cresce em Taubaté");
    expect(renderedModularHome).toContain("https://s2-g1.glbimg.com/taubate-industria.jpg");
    expect(renderedModularHome).toContain("Feito com");
  });

  it("enforces anti-fake cover validation and SSRF protection on remote news images", () => {
    expect(resolveCityNewsCover({ coverUrl: null, city: "São José dos Campos" })).toBeNull();
    expect(
      resolveCityNewsCover({
        coverUrl: "https://portal.gov.br/wp-content/uploads/avatar-150x150.jpg",
      }),
    ).toBeNull();
    expect(
      resolveCityNewsCover({
        coverUrl: "https://images.unsplash.com/photo-123456",
      }),
    ).toBeNull();
    expect(
      resolveCityNewsCover({
        coverUrl: "https://s2-g1.glbimg.com/authentic-cover.jpg",
      }),
    ).toBe("https://s2-g1.glbimg.com/authentic-cover.jpg");

    expect(isSafePublicHttpsImageUrl("https://s2-g1.glbimg.com/authentic-cover.jpg")).toBe(true);
    expect(isSafePublicHttpsImageUrl("http://s2-g1.glbimg.com/insecure.jpg")).toBe(false);
    expect(isSafePublicHttpsImageUrl("https://localhost/secret.png")).toBe(false);
    expect(isSafePublicHttpsImageUrl("https://127.0.0.1/secret.png")).toBe(false);
    expect(isSafePublicHttpsImageUrl("https://169.254.169.254/latest/meta-data")).toBe(false);
    expect(isSafePublicHttpsImageUrl("https://images.pexels.com/photos/123/mock.jpeg")).toBe(false);
  });
});
