import { createFileRoute } from "@tanstack/react-router";
import { listPublicArticles, type NewsArticleDTO } from "@/services/news.functions";
import { ValeNewsPortal } from "@/components/news/vale-news-portal";

export const Route = createFileRoute("/valeagoranews")({
  head: () => ({
    meta: [
      { title: "Vale Agora News | Jornalismo Regional Independente" },
      {
        name: "description",
        content: "Acompanhe as últimas notícias, trânsito na Dutra, plantão policial, economia e acontecimentos do Vale do Paraíba e Litoral Norte.",
      },
    ],
  }),
  loader: async () => {
    try {
      const articles = await listPublicArticles({ data: { limit: 30 } }).catch(() => []);
      return { articles: (articles || []) as NewsArticleDTO[] };
    } catch {
      return { articles: [] as NewsArticleDTO[] };
    }
  },
  component: ValeAgoraNewsPage,
});

function ValeAgoraNewsPage() {
  const { articles } = Route.useLoaderData() as { articles: NewsArticleDTO[] };
  return <ValeNewsPortal initialArticles={articles} />;
}
