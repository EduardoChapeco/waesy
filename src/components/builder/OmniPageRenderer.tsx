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
import {
  getBlockDeviceVisibilityClass,
  getDocumentThemeCanvasStyle,
  isBlockVisibleForCity,
  isBlockWithinSchedule,
  resolveBlockBoundData,
} from "@/lib/builder/block-data-resolver";

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
  activeCity?: string | null;
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
  activeCity = null,
  onAddToCart,
}) => {
  if (!document || !document.blocks || !Array.isArray(document.blocks) || document.blocks.length === 0) {
    return null;
  }

  const pageThemeStyle = getDocumentThemeCanvasStyle(document.theme);

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
        if (block.isHidden || block.is_visible === false) return null;
        if (!isBlockWithinSchedule(block)) return null;
        if (!isBlockVisibleForCity(block, activeCity)) return null;

        const visibilityClass = getBlockDeviceVisibilityClass(block);
        if (visibilityClass === "hidden") return null;

        const def = getSiteBlockByIdStrict(block.type);
        if (!def) {
          if (import.meta.env?.DEV) {
            console.warn(`[OmniPageRenderer] Bloco não registrado ignorado: ${block.type}`);
          }
          return null;
        }
        const Component = def.component as any;
        const animClass = getAnimationClass(block.styling?.scrollAnimation);
        const wrapperClasses = ["w-full", visibilityClass, animClass].filter(Boolean).join(" ");
        const wrapperStyle: React.CSSProperties | undefined =
          typeof block.styling?.animationDelayMs === "number" && block.styling.animationDelayMs > 0
            ? { animationDelay: `${block.styling.animationDelayMs}ms` }
            : undefined;

        const boundDatasets = resolveBlockBoundData(
          block,
          {
            products,
            categories,
            collections,
            classifieds,
            posts,
            flyers,
            events,
            jobs,
            stores,
            banners,
            hotpages,
            newsArticles,
            sponsors,
          },
          {
            activeCity,
            storeId: storeData?.id || document.store_id || null,
          },
        );

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
              storeId: storeData?.id || document.store_id || null,
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
            style={wrapperStyle}
            className={wrapperClasses}
          >
            <BlockErrorBoundary
              blockId={block.id}
              blockType={block.type}
            >
              <Component
                id={block.id}
                data={block.config}
                styling={block.styling}
                products={boundDatasets.products}
                categories={boundDatasets.categories}
                collections={boundDatasets.collections}
                storeData={storeData}
                classifieds={boundDatasets.classifieds}
                posts={boundDatasets.posts}
                flyers={boundDatasets.flyers}
                events={boundDatasets.events}
                jobs={boundDatasets.jobs}
                stores={boundDatasets.stores}
                banners={boundDatasets.banners}
                hotpages={boundDatasets.hotpages}
                newsArticles={boundDatasets.newsArticles}
                sponsors={boundDatasets.sponsors}
                onAddToCart={onAddToCart}
                pageSlug={document.slug}
                onLeadSubmit={handleBlockLeadSubmit}
                activeSubstate={block.activeSubstate}
                isEditing={false}
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
