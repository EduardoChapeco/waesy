import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  BuilderViewportProvider,
  VitrineBentoTetris,
  VitrineButtonsDock,
  VitrineClassifiedsRail,
  VitrineCouponStrip,
  VitrineEcosystemRail,
  VitrineMetamorphicBanner,
  VitrineProductShelf,
  VitrineSocialStream,
  VitrineVerticalCarousel,
} from "@/design-system";
import { OmniPageRenderer } from "./OmniPageRenderer";
import { BLOCK_TO_WIX_CATEGORY, getSiteBlockByIdStrict, SITE_BUILDER_BLOCKS } from "./registry";
import { applyTemplateToPage } from "./templates";
import { createEmptyOmniPage, OmniPageDocumentSchema } from "./types";
import { isVitrineAppBlock } from "./vitrine-block-inspector";
import { auditStudioTemplate, getPublicationBlockingFindings } from "@/lib/builder/studio-template-audit";
import { getStudioTemplate } from "@/lib/builder/studio-catalog";

const VITRINE_BLOCK_IDS = [
  "vitrine_metamorphic_banner",
  "vitrine_bento_tetris",
  "vitrine_coupon_strip",
  "vitrine_buttons_dock",
  "vitrine_vertical_carousel",
  "vitrine_product_shelf",
  "vitrine_classifieds_rail",
  "vitrine_social_stream",
  "vitrine_ecosystem_rail",
] as const;

describe("Design System Vitrine & Omni Builder App-Parity Suite", () => {
  it("exporta todas as primitivas canônicas de vitrine no @/design-system e registra os 9 blocos no Omni Builder", () => {
    expect(VitrineMetamorphicBanner).toBeDefined();
    expect(VitrineBentoTetris).toBeDefined();
    expect(VitrineCouponStrip).toBeDefined();
    expect(VitrineButtonsDock).toBeDefined();
    expect(VitrineVerticalCarousel).toBeDefined();
    expect(VitrineProductShelf).toBeDefined();
    expect(VitrineClassifiedsRail).toBeDefined();
    expect(VitrineSocialStream).toBeDefined();
    expect(VitrineEcosystemRail).toBeDefined();

    for (const blockId of VITRINE_BLOCK_IDS) {
      const def = getSiteBlockByIdStrict(blockId);
      expect(def).toBeDefined();
      expect(def?.category).toBe("vitrine_app");
      expect(BLOCK_TO_WIX_CATEGORY[blockId]).toBe("vitrine_app");
      expect(isVitrineAppBlock(blockId)).toBe(true);
      expect(SITE_BUILDER_BLOCKS.some((b) => b.id === blockId)).toBe(true);
    }
  });

  it("renderiza mídias e proporções bidirecionais distintas entre Mobile e Desktop no Banner Metamórfico e suporta vídeo nativo", () => {
    const def = getSiteBlockByIdStrict("vitrine_metamorphic_banner")!;
    const BannerComp = def.component as any;

    const blockConfig = {
      desktopAspectRatio: "slim",
      mobileAspectRatio: "cinema",
      slides: [
        {
          id: "s-1",
          title: "Campanha Oficial",
          imageMobileUrl: "https://cdn.waesy.test/banner-mobile.webp",
          imageDesktopUrl: "https://cdn.waesy.test/banner-desktop.webp",
          imageAlt: "Banner promocional",
          ctaLabel: "Conferir",
          href: "/ofertas",
        },
      ],
    };

    const mobileHtml = renderToStaticMarkup(
      <BuilderViewportProvider viewport="mobile">
        <BannerComp id="b1" data={blockConfig} />
      </BuilderViewportProvider>,
    );
    const desktopHtml = renderToStaticMarkup(
      <BuilderViewportProvider viewport="desktop">
        <BannerComp id="b1" data={blockConfig} />
      </BuilderViewportProvider>,
    );

    expect(mobileHtml).toContain("https://cdn.waesy.test/banner-mobile.webp");
    expect(mobileHtml).not.toContain("https://cdn.waesy.test/banner-desktop.webp");
    expect(mobileHtml).toContain("aspect-banner-cinema");

    expect(desktopHtml).toContain("https://cdn.waesy.test/banner-desktop.webp");
    expect(desktopHtml).not.toContain("https://cdn.waesy.test/banner-mobile.webp");
    expect(desktopHtml).toContain("aspect-banner-slim");

    const videoHtml = renderToStaticMarkup(
      <BuilderViewportProvider viewport="mobile">
        <BannerComp
          id="b2"
          data={{
            slides: [
              {
                id: "v-1",
                title: "Vídeo Loop",
                videoUrl: "https://cdn.waesy.test/hero.mp4",
                mediaType: "video",
              },
            ],
          }}
        />
      </BuilderViewportProvider>,
    );
    expect(videoHtml).toContain("<video");
    expect(videoHtml).toContain("https://cdn.waesy.test/hero.mp4");
  });

  it("bifurca o carrossel/grade de botões editáveis entre grade 4x2 mobile e dock deslizante desktop", () => {
    const def = getSiteBlockByIdStrict("vitrine_buttons_dock")!;
    const DockComp = def.component as any;

    const config = {
      dataSource: "hybrid",
      desktopLayout: "noor_dock",
      mobileLayout: "ifood_grid",
      mobileColumns: 4,
      items: [
        { id: "btn-1", label: "Promoções", badge: "Top", iconName: "Tag", href: "/ofertas" },
      ],
    };
    const categories = [{ id: "cat-1", name: "Bebidas", slug: "bebidas" }];

    const mobileHtml = renderToStaticMarkup(
      <BuilderViewportProvider viewport="mobile">
        <DockComp id="d1" data={config} categories={categories} />
      </BuilderViewportProvider>,
    );
    const desktopHtml = renderToStaticMarkup(
      <BuilderViewportProvider viewport="desktop">
        <DockComp id="d1" data={config} categories={categories} />
      </BuilderViewportProvider>,
    );

    expect(mobileHtml).toContain("grid-cols-2 sm:grid-cols-4");
    expect(mobileHtml).toContain("Promoções");
    expect(mobileHtml).toContain("Bebidas");

    expect(desktopHtml).toContain("carousel");
    expect(desktopHtml).toContain("overflow-x-auto");
    expect(desktopHtml).toContain("Promoções");
    expect(desktopHtml).toContain("Bebidas");
  });

  it("respeita deviceVisibility ocultando blocos exclusivos de outro dispositivo na vitrine publicada", () => {
    const def = getSiteBlockByIdStrict("vitrine_coupon_strip")!;
    const CouponComp = def.component as any;

    const mobileOnlyOnDesktop = renderToStaticMarkup(
      <BuilderViewportProvider viewport="desktop" isEditorCanvas={false}>
        <CouponComp
          id="c1"
          data={{ title: "Exclusivo App Mobile", couponCode: "APP10" }}
          styling={{ deviceVisibility: "mobile_only" }}
        />
      </BuilderViewportProvider>,
    );
    const mobileOnlyOnMobile = renderToStaticMarkup(
      <BuilderViewportProvider viewport="mobile" isEditorCanvas={false}>
        <CouponComp
          id="c1"
          data={{ title: "Exclusivo App Mobile", couponCode: "APP10" }}
          styling={{ deviceVisibility: "mobile_only" }}
        />
      </BuilderViewportProvider>,
    );

    expect(mobileOnlyOnDesktop).toBe("");
    expect(mobileOnlyOnMobile).toContain("Exclusivo App Mobile");
    expect(mobileOnlyOnMobile).toContain("APP10");
  });

  it("garante anti-fake (B.33), isolamento de nichos (B.37) e integridade textual de posts e estabelecimentos (B.30/B.38)", () => {
    const ClassifiedsComp = getSiteBlockByIdStrict("vitrine_classifieds_rail")!.component as any;
    const SocialComp = getSiteBlockByIdStrict("vitrine_social_stream")!.component as any;
    const EcoComp = getSiteBlockByIdStrict("vitrine_ecosystem_rail")!.component as any;

    // 1. Classificados: filtra por nicho sem vazar atributos de veículos para turismo
    const adsHtml = renderToStaticMarkup(
      <BuilderViewportProvider viewport="desktop">
        <ClassifiedsComp
          id="ads1"
          data={{
            dataSource: "store_classifieds",
            nicheFilter: "tourism",
            ctaLabel: "Ver Pacote",
          }}
          classifieds={[
            {
              id: "ad-car",
              title: "Sedan 2024",
              category: "veiculos",
              price_cents: 12000000,
              specs: { year: 2024, km: 15000 },
            },
            {
              id: "ad-trip",
              title: "Expedição Serra Catarinense",
              category: "turismo",
              price_cents: 189000,
              specs: { duration: "4 diárias", departure: "Saída Garantida", km: 99999 },
            },
          ]}
        />
      </BuilderViewportProvider>,
    );
    expect(adsHtml).toContain("Expedição Serra Catarinense");
    expect(adsHtml).not.toContain("Sedan 2024");
    expect(adsHtml).toContain("4 diárias");
    expect(adsHtml).not.toContain("99999");

    // 2. Social: post puramente textual não injeta <img> quebrado nem Unsplash
    const socialHtml = renderToStaticMarkup(
      <BuilderViewportProvider viewport="mobile">
        <SocialComp
          id="soc1"
          data={{
            dataSource: "manual",
            mobileLayout: "stream",
            items: [
              {
                id: "p-1",
                authorName: "Padaria Central",
                authorHandle: "@padariacentral",
                isVerified: true,
                content: "Fornada de fermentação natural saindo agora.",
                mediaType: "none",
              },
            ],
          }}
        />
      </BuilderViewportProvider>,
    );
    expect(socialHtml).toContain("Fornada de fermentação natural saindo agora.");
    expect(socialHtml).not.toContain("<img");
    expect(socialHtml).not.toContain("images.unsplash.com");

    // 3. Ecossistema (Lojas): sem avaliações cadastradas exibe selo verificado honesto, zero estrelas falsas
    const storesHtml = renderToStaticMarkup(
      <BuilderViewportProvider viewport="desktop">
        <EcoComp
          id="eco1"
          data={{ moduleType: "stores", dataSource: "live" }}
          stores={[
            {
              id: "st-1",
              name: "Empório Vale",
              slug: "emporio-vale",
              category: "Mercado",
              city: "Chapecó",
              state: "SC",
              is_verified: true,
            },
          ]}
        />
      </BuilderViewportProvider>,
    );
    expect(storesHtml).toContain("Empório Vale");
    expect(storesHtml).toContain("Verificada");
    expect(storesHtml).not.toContain("5.0");
    expect(storesHtml).not.toContain("4.9");
  });

  it.each([
    "template_waesy_super_vitrine",
    "template_ifood_delivery_vitrine",
    "template_classifieds_portal_vitrine",
    "template_social_creator_store",
  ])("materializa, audita sem erros bloqueantes e renderiza em SSR mobile/desktop o modelo %s", (templateId) => {
    const studioManifest = getStudioTemplate(templateId);
    expect(studioManifest).toBeDefined();

    const auditResult = auditStudioTemplate(studioManifest!);
    expect(getPublicationBlockingFindings(auditResult)).toEqual([]);

    const base = createEmptyOmniPage("vitrine-teste", "Vitrine Teste", "storefront");
    const page = applyTemplateToPage(base, templateId);
    const parsed = OmniPageDocumentSchema.safeParse(page);
    expect(parsed.success).toBe(true);

    const sampleProducts = [
      { id: "p-1", title: "Combo Especial", slug: "combo-especial", price_cents: 5990 },
    ];

    const mobileMarkup = renderToStaticMarkup(
      <BuilderViewportProvider viewport="mobile">
        <OmniPageRenderer document={page} products={sampleProducts} />
      </BuilderViewportProvider>,
    );
    const desktopMarkup = renderToStaticMarkup(
      <BuilderViewportProvider viewport="desktop">
        <OmniPageRenderer document={page} products={sampleProducts} />
      </BuilderViewportProvider>,
    );

    expect(mobileMarkup.length).toBeGreaterThan(200);
    expect(desktopMarkup.length).toBeGreaterThan(200);
    expect(mobileMarkup).not.toContain("images.unsplash.com");
    expect(desktopMarkup).not.toContain("images.unsplash.com");
  });
});
