/**
 * OmniPageRenderer.tsx — Renderizador Público Ultraleve & SSR-Ready
 * Isolação estrita: Não carrega nenhuma dependência ou código do Editor.
 * Lê o JSONB canônico e renderiza o HTML/CSS exato.
 */

import React from "react";
import { OmniPageDocument } from "./types";
import { getSiteBlockByIdStrict } from "./registry";
import { BuilderAssetCredits } from "./BuilderAssetCredits";
import { BlockErrorBoundary } from "./BlockErrorBoundary";
import { submitOmniPageLeadFn } from "@/services/builder.functions";
import { PrometheePortalProvider } from "@/components/news/promethee-portal-store";

export interface OmniPageRendererProps {
  document: OmniPageDocument;
  className?: string;
  products?: any[];
  categories?: any[];
  collections?: any[];
  storeData?: any;
  classifieds?: any[];
  posts?: any[];
  flyers?: any[];
  events?: any[];
  jobs?: any[];
  stores?: any[];
  banners?: any[];
  hotpages?: any[];
  newsArticles?: any[];
  sponsors?: any[];
  onAddToCart?: (productId: string) => void;
}

export const OmniPageRenderer: React.FC<OmniPageRendererProps> = ({
  document,
  className = "",
  products = [],
  categories = [],
  collections = [],
  storeData = null,
  classifieds = [],
  posts = [],
  flyers = [],
  events = [],
  jobs = [],
  stores = [],
  banners = [],
  hotpages = [],
  newsArticles = [],
  sponsors = [],
  onAddToCart,
}) => {
  if (!document || !document.blocks || !Array.isArray(document.blocks) || document.blocks.length === 0) {
    return null;
  }

  const pageThemeStyle: React.CSSProperties = {
    backgroundColor: document.theme?.backgroundColor,
    color: document.theme?.textColor,
    fontFamily: document.theme?.fontFamily,
  };

  const getAnimationClass = (anim?: string) => {
    switch (anim) {
      case "fade":
        return "motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300";
      case "slide-up":
        return "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-8 motion-safe:duration-300";
      case "zoom-in":
        return "motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-300";
      case "stagger":
        return "motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300";
      default:
        return "";
    }
  };

  const hasModularPrometheeBlocks = document.blocks.some(
    (b) => !b.isHidden && b.type.startsWith("news_promethee_") && b.type !== "news_promethee_portal",
  );

  const renderedContent = (
    <div
      style={pageThemeStyle}
      className={`min-h-dvh w-full flex flex-col overflow-x-hidden bg-background text-foreground ${className}`}
    >
      {document.blocks.map((block) => {
        if (block.isHidden) return null;

        const def = getSiteBlockByIdStrict(block.type);
        if (!def) {
          if (import.meta.env?.DEV) {
            console.warn(`[OmniPageRenderer] Bloco não registrado ignorado: ${block.type}`);
          }
          return null;
        }
        const Component = def.component as any;
        const animClass = getAnimationClass(block.styling?.scrollAnimation);

        const handleBlockLeadSubmit = async (payload: {
          name: string;
          phone?: string;
          email?: string;
          message?: string;
          destination?: string;
          metadata?: Record<string, any>;
        }) => {
          return submitOmniPageLeadFn({
            data: {
              storeId: storeData?.id || null,
              storeSlug: storeData?.slug || null,
              pageSlug: document.slug || null,
              blockId: block.id,
              blockType: block.type,
              name: payload.name,
              phone: payload.phone || null,
              email: payload.email || null,
              message: payload.message || null,
              destination: payload.destination || null,
              metadata: payload.metadata || {},
            },
          });
        };

        return (
          <div
            key={block.id}
            id={block.sectionAnchorId}
            className={animClass ? `w-full ${animClass}` : "w-full"}
          >
            <BlockErrorBoundary
              blockId={block.id}
              blockType={block.type}
            >
              <Component
                id={block.id}
                data={block.config}
                styling={block.styling}
                products={products}
                categories={categories}
                collections={collections}
                storeData={storeData}
                classifieds={classifieds}
                posts={posts}
                flyers={flyers}
                events={events}
                jobs={jobs}
                stores={stores}
                banners={banners}
                hotpages={hotpages}
                newsArticles={newsArticles}
                sponsors={sponsors}
                onAddToCart={onAddToCart}
                pageSlug={document.slug}
                onLeadSubmit={handleBlockLeadSubmit}
              />
            </BlockErrorBoundary>
            <BuilderAssetCredits assets={block.assetRefs} />
          </div>
        );
      })}
    </div>
  );

  if (hasModularPrometheeBlocks) {
    return (
      <PrometheePortalProvider initialCity="Todas as Cidades">
        {renderedContent}
      </PrometheePortalProvider>
    );
  }

  return renderedContent;
};
