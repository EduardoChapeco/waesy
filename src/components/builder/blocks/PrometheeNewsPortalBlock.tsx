import React from "react";
import type {
  BaseSiteBlockProps,
  PrometheeNewsArticleItem,
  PrometheeNewsPortalBlockData,
} from "@/types/omni-builder";
import { getSectionStyle } from "../utils";
import { PrometheePortalProvider } from "@/components/news/promethee-portal-store";
import { PrometheeNewsHeaderBlock, PrometheeWireframeDomeLogo } from "./PrometheeNewsHeaderBlock";
import { PrometheeNewsNavBlock } from "./PrometheeNewsNavBlock";
import { PrometheeNewsBreakingBlock } from "./PrometheeNewsBreakingBlock";
import { PrometheeNewsFeedBlock } from "./PrometheeNewsFeedBlock";
import { PrometheeNewsArticleReaderBlock } from "./PrometheeNewsArticleReaderBlock";
import { PrometheeNewsFooterBlock } from "./PrometheeNewsFooterBlock";

export { PrometheeWireframeDomeLogo };

export interface PrometheeNewsPortalBlockProps extends BaseSiteBlockProps {
  data: PrometheeNewsPortalBlockData;
  isEditing?: boolean;
  products?: any[];
  newsArticles?: any[];
  sponsors?: any[];
}

export function PrometheeNewsPortalBlock({
  id,
  className = "",
  styling,
  data,
  isEditing = false,
  products = [],
  newsArticles = [],
  sponsors = [],
}: PrometheeNewsPortalBlockProps) {
  const sectionStyle = getSectionStyle({
    ...styling,
    paddingY: styling?.paddingY || "none",
  });

  const effectiveArticles =
    Array.isArray(data?.articles) && data.articles.length > 0
      ? data.articles
      : Array.isArray(newsArticles) && newsArticles.length > 0
        ? newsArticles
        : [];

  const masthead = data?.mastheadTitle || "Waesy News";

  return (
    <PrometheePortalProvider initialCity="Todas as Cidades">
      <div
        id={id}
        style={sectionStyle.style}
        className={`light bg-background text-foreground ${sectionStyle.className} ${className}`}
      >
        <PrometheeNewsHeaderBlock
          id={`${id}-header`}
          isEditing={isEditing}
          data={{
            mastheadTitle: masthead,
            logoStyle: (data?.logoStyle as any) || "promethee_dome",
            logoUrl: data?.logoUrl || "",
            showCityFilter: true,
            allCitiesLabel: "Todas as Cidades",
            cities: data?.cities || [],
            showSearch: true,
            showUrgentBell: true,
            actionLabel: "",
            actionHref: "",
          }}
        />

        <PrometheeNewsNavBlock
          id={`${id}-nav`}
          isEditing={isEditing}
          data={{
            allowCitizenPosts: data?.allowCitizenPosts !== false,
            showSavedTab: true,
            categories:
              Array.isArray(data?.categories) && data.categories.length > 0
                ? data.categories
                : [
                    "Para você",
                    "Urgente",
                    "Política",
                    "Segurança",
                    "Economia",
                    "Esportes",
                    "Tecnologia",
                    "Cultura",
                  ],
          }}
        />

        {data?.showBreakingCarousel !== false && (
          <PrometheeNewsBreakingBlock
            id={`${id}-breaking`}
            isEditing={isEditing}
            products={products}
            newsArticles={newsArticles}
            data={{
              sectionTitle: data?.breakingSectionTitle || "Plantão Regional",
              badgeLabel: "BREAKING NEWS",
              maxItems: 6,
              articlePageHref: "",
              articles: effectiveArticles,
            }}
          />
        )}

        <PrometheeNewsFeedBlock
          id={`${id}-feed`}
          isEditing={isEditing}
          products={products}
          newsArticles={newsArticles}
          sponsors={sponsors}
          data={{
            sectionTitle: (data as any)?.feedSectionTitle || "Destaques",
            layoutMode: (data as any)?.layoutMode || "feed_stream",
            dataSource: data?.dataSource || "approved_mined_AND_custom",
            maxItems: 12,
            readMoreLabel: (data as any)?.readMoreLabel || "Ler mais",
            articlePageHref: "",
            showInFeedAd: true,
            articles: effectiveArticles,
          }}
        />

        <PrometheeNewsArticleReaderBlock
          id={`${id}-reader`}
          isEditing={isEditing}
          products={products}
          newsArticles={newsArticles}
          sponsors={sponsors}
          data={{
            backLabel: "Voltar",
            backHref: "",
            showExecutiveSummary: true,
            showComments: true,
            showInArticleAd: true,
          }}
        />

        <PrometheeNewsFooterBlock
          id={`${id}-footer`}
          isEditing={isEditing}
          data={{
            brandName: masthead,
            tagline: data?.mastheadSubtitle || "Jornalismo regional independente",
            links: [
              { id: "f1", label: "Início", href: "#" },
              { id: "f2", label: "Anuncie", href: "#contato" },
            ],
            showWaesySignature: true,
          }}
        />
      </div>
    </PrometheePortalProvider>
  );
}
