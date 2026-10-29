import { resolveActiveCity } from "@/lib/city-helper";
import { createFileRoute } from "@tanstack/react-router";
import { listPublicArticles, listPublicNewsSponsors, type NewsArticleDTO, type SponsorDTO } from "@/services/news.functions";
import { listActiveBanners, type BannerDTO } from "@/services/banner.functions";
import { WaesyNewsPortal } from "@/components/news/waesy-news-portal";

export const Route = createFileRoute("/_store/noticias/")({
  head: () => ({
    meta: [
      { title: "Notícias e Jornalismo Regional | Waesy" },
      {
        name: "description",
        content: "Portal editorial com jornalismo regional apurado, cobertura de cidades, telemetria e estúdio de posts.",
      },
      { property: "og:title", content: "Notícias e Jornalismo Regional | Waesy" },
      {
        property: "og:description",
        content: "Portal editorial com jornalismo regional apurado, cobertura de cidades, telemetria e estúdio de posts.",
      },
      { property: "og:image", content: "/brand-logo.png" },
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
