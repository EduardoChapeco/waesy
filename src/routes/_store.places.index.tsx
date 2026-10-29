import { resolveActiveCity } from "@/lib/city-helper";
import { createFileRoute } from "@tanstack/react-router";
import { listHotpages } from "@/services/hotpage.functions";
import { listActiveBanners } from "@/services/banner.functions";
import { DirectoryPage } from "./_store.diretorio.index";
import { buildUniversalHead } from "@/lib/seo/universal-seo-head";

export const Route = createFileRoute("/_store/places/")({
  head: () =>
    buildUniversalHead({
      title: "Guia Oficial de Lugares e Empresas | Waesy Places",
      description:
        "O catálogo oficial de estabelecimentos, clínicas, comércios locais, oficinas e prestadores de serviços da cidade com avaliações, horários e contato direto.",
      path: "/places",
      ogType: "website",
      webmcpType: "places_index",
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: "Waesy Places",
        description: "Catálogo georreferenciado de locais, comércios e empresas da cidade.",
        url: "https://waesy.com.br/places",
      },
    }),
  loader: async ({ location }) => {
    const activeCity = resolveActiveCity(location?.search);
    try {
      const [banners, hotpages] = await Promise.all([
        listActiveBanners({ data: { placement: "diretorio", city: activeCity } }).catch(() => []),
        listHotpages({ data: { module: "diretorio" } }).catch(() => []),
      ]);
      return { banners: banners || [], hotpages: hotpages || [] };
    } catch (err) {
      console.error("[loader:_store.places.index] Unhandled error:", err);
      return { banners: [], hotpages: [] };
    }
  },
  component: DirectoryPage,
});
