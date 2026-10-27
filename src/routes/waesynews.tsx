import { createFileRoute } from "@tanstack/react-router";
import {
  listPublicArticles,
  listPublicNewsSponsors,
  type NewsArticleDTO,
  type SponsorDTO,
} from "@/services/news.functions";
import { WaesyNewsPortal } from "@/components/news/vale-news-portal";

export const Route = createFileRoute("/waesynews")({
  loader: async () => {
    try {
      const [articles, sponsors] = await Promise.all([
        listPublicArticles({ data: { limit: 30, regionHint: "vale_do_paraiba" } }).catch(() => []),
        listPublicNewsSponsors({ data: { limit: 6 } }).catch(() => []),
      ]);
      return {
        articles: (articles || []) as NewsArticleDTO[],
        sponsors: (sponsors || []) as SponsorDTO[],
      };
    } catch {
      return {
        articles: [] as NewsArticleDTO[],
        sponsors: [] as SponsorDTO[],
      };
    }
  },
  head: ({ loaderData }) => {
    const lead = loaderData?.articles?.[0];
    const ogImage = lead?.cover_media_url || "/brand-logo.png";
    return {
      meta: [
        { title: "Waesynews | Portal Editorial Regional" },
        {
          name: "description",
          content:
            "Portal editorial jornalístico com cobertura regional, Ad Server nativo, telemetria IAB e construtor visual Omni Builder.",
        },
        { property: "og:title", content: "Waesynews — Portal Regional" },
        {
          property: "og:description",
          content:
            lead?.title ||
            "Cobertura editorial regional independente com estúdio de posts e transparência de publicidade.",
        },
        { property: "og:image", content: ogImage },
      ],
    };
  },
  component: WaesyNewsPage,
});

function WaesyNewsPage() {
  const { articles, sponsors } = Route.useLoaderData() as {
    articles: NewsArticleDTO[];
    sponsors: SponsorDTO[];
  };
  return <WaesyNewsPortal initialArticles={articles} initialSponsors={sponsors} />;
}
