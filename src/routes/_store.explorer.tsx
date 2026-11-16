import { createFileRoute } from "@tanstack/react-router";
import { CommunityMarketplaceExperience } from "@/components/home/CommunityMarketplaceExperience";
import { loadCommunityHomeData } from "@/lib/community-home-loader";

export const Route = createFileRoute("/_store/explorer")({
  head: () => ({
    meta: [
      { title: "Waesy Explorer — Vitrine Comunitária, Lojas e Serviços" },
      {
        name: "description",
        content:
          "Explore empresas verificadas, ofertas locais, classificados regionais, empregos, eventos e notícias da sua cidade.",
      },
    ],
    links: [{ rel: "canonical", href: "https://waesy.com.br/explorer" }],
  }),
  loader: async ({ location }) => loadCommunityHomeData(location.search),
  component: ExplorerHomePage,
});

export function ExplorerHomePage() {
  const data = (Route.useLoaderData?.() as any) || {};
  return <CommunityMarketplaceExperience data={data} />;
}
