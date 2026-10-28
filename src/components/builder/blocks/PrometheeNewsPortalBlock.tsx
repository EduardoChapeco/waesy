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

const DEFAULT_FALLBACK_ARTICLES: PrometheeNewsArticleItem[] = [
  {
    id: "prom_art_1",
    title: "Corredor tecnológico de São José dos Campos recebe novo centro aeroespacial",
    lead: "Investimento amplia a cadeia de fornecedores do Parque Tecnológico e abre vagas qualificadas para engenheiros e técnicos no Vale do Paraíba.",
    body: "O Parque Tecnológico de São José dos Campos confirmou a expansão de sua ala de sistemas autônomos e propulsão limpa.\n\nA operação prevê laboratórios integrados com universidades da região, acelerando a pesquisa aplicada na indústria local.",
    category: "Economia",
    city: "São José dos Campos",
    publishedAgo: "15min",
    readingTime: "4 min",
    author: "Redação Regional",
    imageUrl: "",
    imageAlt: "",
    isBreaking: true,
    likesCount: 42,
    commentsCount: 14,
  },
  {
    id: "prom_art_2",
    title: "Monitoramento viário reduz tempo de resposta entre Taubaté e Jacareí",
    lead: "Integração óptica entre centrais operacionais permite desvio preventivo de tráfego pesado e atendimento rápido em horários de pico.",
    body: "O protocolo integrado entre os centros operacionais das prefeituras do Vale reduziu o tempo médio de liberação de faixas urbanas.\n\nA leitura automatizada de fluxo emite alertas diretos para equipes de apoio nos principais acessos.",
    category: "Segurança",
    city: "Taubaté",
    publishedAgo: "32min",
    readingTime: "3 min",
    author: "Editoria Cidades",
    imageUrl: "",
    imageAlt: "",
    isBreaking: true,
    likesCount: 29,
    commentsCount: 12,
  },
  {
    id: "prom_art_3",
    title: "Circuito cultural movimenta a Serra da Mantiqueira e o Litoral Norte",
    lead: "Roteiros integrados entre Campos do Jordão, Pindamonhangaba e Caraguatatuba registram procura por gastronomia e eventos regionais.",
    body: "Produtores locais, restaurantes e pousadas estruturaram um calendário unificado de eventos culturais para os próximos meses.\n\nA iniciativa fortalece o turismo regional e valoriza ingredientes certificados da Mantiqueira e da costa caiçara.",
    category: "Cultura",
    city: "Campos do Jordão",
    publishedAgo: "1h",
    readingTime: "5 min",
    author: "Caderno Regional",
    imageUrl: "",
    imageAlt: "",
    isBreaking: false,
    likesCount: 64,
    commentsCount: 19,
  },
];

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

  const hasLiveItems =
    (Array.isArray(newsArticles) && newsArticles.length > 0) ||
    (Array.isArray(products) && products.length > 0) ||
    (Array.isArray(data?.articles) && data.articles.length > 0);

  const effectiveArticles =
    Array.isArray(data?.articles) && data.articles.length > 0
      ? data.articles
      : hasLiveItems
        ? []
        : DEFAULT_FALLBACK_ARTICLES;

  const masthead = data?.mastheadTitle || "Vale Agora News";

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
