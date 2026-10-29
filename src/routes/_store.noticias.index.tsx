import { resolveActiveCity } from "@/lib/city-helper";
import { createFileRoute } from "@tanstack/react-router";
import { listPublicArticles, listPublicNewsSponsors, type NewsArticleDTO, type SponsorDTO } from "@/services/news.functions";
import { listActiveBanners, type BannerDTO } from "@/services/banner.functions";
import { WaesyNewsPortal } from "@/components/news/waesy-news-portal";

export const Route = createFileRoute("/_store/noticias/")({
  head: () => ({
    meta: [
      { title: "Portal de Notícias e Jornalismo Regional | Waesy Local Marketplace" },
      {
        name: "description",
        content:
          "Portal editorial do Waesy Local Marketplace com jornalismo regional apurado, cobertura de cidades, economia local, eventos e utilidade pública.",
      },
      { property: "og:title", content: "Portal de Notícias e Jornalismo Regional | Waesy Local Marketplace" },
      {
        property: "og:description",
        content:
          "Jornalismo regional verificado, cobertura de cidades e notícias da comunidade no Waesy Local Marketplace.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://waesy.com.br/noticias" },
      { property: "og:image", content: "https://waesy.com.br/pwa-512x512.png" },
      { name: "geo.region", content: "BR-SC" },
      { name: "geo.placename", content: "São Miguel do Oeste, Chapecó e Região" },
      { name: "robots", content: "index, follow, max-image-preview:large, max-snippet:-1" },
    ],
    links: [
      { rel: "canonical", href: "https://waesy.com.br/noticias" },
      { rel: "alternate", type: "application/xml", href: "https://waesy.com.br/sitemap-news.xml" },
    ],
  }),
  loader: async ({ location }) => {
    const activeCity = resolveActiveCity(location?.search);
    try {
      const [articles, banners, sponsors] = await Promise.all([
        listPublicArticles({ data: { limit: 60, city: activeCity } }).catch(() => []),
        listActiveBanners({ data: { placement: "noticias", city: activeCity } }).catch(() => []),
        listPublicNewsSponsors({ data: { limit: 12 } }).catch(() => []),
      ]);
      return {
        articles: (articles || []) as NewsArticleDTO[],
        banners: (banners || []) as BannerDTO[],
        sponsors: (sponsors || []) as SponsorDTO[],
        activeCity: activeCity || "",
      };
    } catch (err) {
      console.error("[loader:_store.noticias.index] Unhandled error:", err);
      return { articles: [], banners: [], sponsors: [], activeCity: "" };
    }
  },
  component: NoticiasEditorialPage,
});

function NoticiasEditorialPage() {
  const {
    articles = [],
    banners = [],
    sponsors = [],
    activeCity = "",
  } = (Route.useLoaderData?.() as any) || {};

  return (
    <WaesyNewsPortal
      initialArticles={articles}
      initialSponsors={sponsors}
      initialBanners={banners}
      initialActiveCity={activeCity}
    />
  );
}

// Fim da página unificada de notícias
