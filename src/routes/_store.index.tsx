import { createFileRoute } from "@tanstack/react-router";
import { resolveActiveCity } from "@/lib/city-helper";

import { listActiveBanners } from "@/services/banner.functions";
import { listEditorialHotpages } from "@/services/hotpage.functions";
import { getMarketplaceFeed, type FlashOfferDTO } from "@/services/marketplace.functions";
import { listUnifiedListings } from "@/services/unified-listing.functions";
import type { UnifiedListing } from "@/types/unified-ad-engine";
import { getPublicDirectory } from "@/services/directory.functions";
import { getPublicClassifieds } from "@/services/classifieds.functions";
import { listPublicJobs } from "@/services/jobs.functions";
import { getPublicEvents } from "@/services/events.functions";
import { listPublicArticles } from "@/services/news.functions";
import { getMuralFeed, type MuralFeedResponse } from "@/services/social.functions";
import { getAllPublicConcursos } from "@/services/invite.functions";
import { getUserSession } from "@/services/auth.functions";
import { CommunityMarketplaceExperience } from "@/components/home/CommunityMarketplaceExperience";
import { WaesySalesLanding } from "@/components/landing/waesy-sales-landing";
import { VerticalLandingView } from "@/components/landing/vertical-landing-view";
import { resolveSubsystemBySlug } from "@/lib/vertical-subsystems";
import { getPublicEcosystemSubsystemsFn } from "@/services/vertical-subsystems.functions";
import {
  getHostVerticalSubsystemLandingFn,
  getPublicVerticalLandingFn,
} from "@/services/vertical-landings.functions";
import { resolveSurfacePageExperienceDocument } from "@/services/surface-cms.functions";
import {
  listPublicHomePageSections,
  getUnifiedShowcasePosts,
} from "@/services/admin-home-cms.functions";
import { useEffectiveViewport } from "@/design-system/vitrine";
import { logSystemError } from "@/services/telemetry.functions";

function traceHomeQuery<T>(
  contractName: string,
  promise: Promise<T>,
  fallback: T,
  errors: Array<{ contract: string; message: string }>,
): Promise<T> {
  return promise.catch((err: any) => {
    const message = err instanceof Error ? err.message : String(err || "Unknown home loader error");
    errors.push({ contract: contractName, message });
    console.error(`[loader:_store.index] Falha em ${contractName}:`, message);
    return fallback;
  });
}

export const Route = createFileRoute("/_store/")({
  staleTime: 15_000,
  head: () => ({
    meta: [
      {
        title:
          "Waesy Local Marketplace — Vitrine da Cidade, Comércio, Serviços, Notícias e Agentes IA",
      },
      {
        name: "description",
        content:
          "Waesy Local Marketplace: ecossistema integrado de comércio local, empresas verificadas com CNPJ, portal de notícias, classificados, vagas de emprego, eventos, receitas e protocolo WebMCP.",
      },
      {
        property: "og:title",
        content:
          "Waesy Local Marketplace — Vitrine da Cidade, Comércio, Serviços, Notícias e Agentes IA",
      },
      {
        property: "og:description",
        content:
          "Encontre empresas verificadas, ofertas locais, notícias da região, classificados, receitas, eventos e APIs abertas WebMCP no Waesy Local Marketplace.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://waesy.com.br/" },
      { property: "og:image", content: "https://waesy.com.br/pwa-512x512.png" },
      { name: "geo.region", content: "BR-SC" },
      { name: "geo.placename", content: "São Miguel do Oeste, Chapecó e Região" },
      { name: "robots", content: "index, follow, max-image-preview:large, max-snippet:-1" },
    ],
    links: [
      { rel: "canonical", href: "https://waesy.com.br/" },
      { rel: "alternate", type: "text/markdown", href: "https://waesy.com.br/llms.txt" },
    ],
  }),
  loader: async ({ location }) => {
    const loaderErrors: Array<{ contract: string; message: string }> = [];
    try {
      const filteredCity = resolveActiveCity(location.search as any);

      const [
        banners,
        middleBanners,
        footerBanners,
        editorialHotpages,
        marketplaceFeed,
        placesListings,
        classifieds,
        jobs,
        events,
        newsArticles,
        feedResponse,
        concursos,
        workspaceListings,
        homeSections,
        showcasePosts,
        session,
        surfaceExperience,
        ecosystemConfig,
        rootLanding,
        hostVertical,
      ] = await Promise.all([
        traceHomeQuery("banner.home", listActiveBanners({ data: { placement: "home", city: filteredCity } }), [], loaderErrors),
        traceHomeQuery("banner.home_middle", listActiveBanners({ data: { placement: "home_middle", city: filteredCity } }), [], loaderErrors),
        traceHomeQuery("banner.home_footer", listActiveBanners({ data: { placement: "home_footer", city: filteredCity } }), [], loaderErrors),
        traceHomeQuery("hotpage.editorial", listEditorialHotpages({ data: { module: "home" } }), [], loaderErrors),
        traceHomeQuery("marketplace.getMarketplaceFeed", getMarketplaceFeed(), { sections: [], allProducts: [] }, loaderErrors),
        traceHomeQuery("directory.getPublicDirectory", getPublicDirectory({ data: { limit: 12, city: filteredCity } }), [], loaderErrors),
        traceHomeQuery("classifieds.getPublicClassifieds", getPublicClassifieds({ data: { limit: 12, city: filteredCity } }), [], loaderErrors),
        traceHomeQuery("jobs.listPublicJobs", listPublicJobs({ data: { limit: 8, city: filteredCity } }), [], loaderErrors),
        traceHomeQuery("events.getPublicEvents", getPublicEvents({ data: { limit: 8, city: filteredCity } }), [], loaderErrors),
        traceHomeQuery("news.listPublicArticles", listPublicArticles({ data: { limit: 6, city: filteredCity } }), [], loaderErrors),
        traceHomeQuery(
          "social.getMuralFeed",
          getMuralFeed({ data: { limit: 8 } }),
          { items: [], hasMore: false, nextCursor: null },
          loaderErrors,
        ),
        traceHomeQuery("invite.getAllPublicConcursos", getAllPublicConcursos({ data: { filter: "all" } }), [], loaderErrors),
        traceHomeQuery("unifiedListing.workspace", listUnifiedListings({ data: { origin: "workspace", limit: 36 } }), [], loaderErrors),
        traceHomeQuery("cms.listPublicHomePageSections", listPublicHomePageSections({ data: { city: filteredCity } }), [], loaderErrors),
        traceHomeQuery("surfaceCms.getUnifiedShowcasePosts", getUnifiedShowcasePosts({ data: { limit: 12, city: filteredCity } }), [], loaderErrors),
        traceHomeQuery("auth.getUserSession", getUserSession(), null, loaderErrors),
        traceHomeQuery(
          "surfaceCms.resolveSurfacePageExperienceDocument",
          resolveSurfacePageExperienceDocument({ data: { surfaceSlug: "home", city: filteredCity } }),
          { mode: "canonical_cms" as const, documentId: null, document: null, liveData: null },
          loaderErrors,
        ),
        traceHomeQuery("vertical.getPublicEcosystemSubsystemsFn", getPublicEcosystemSubsystemsFn(), null, loaderErrors),
        traceHomeQuery("vertical.getPublicVerticalLandingFn", getPublicVerticalLandingFn({ data: { slug: "waesy" } }), null, loaderErrors),
        traceHomeQuery("vertical.getHostVerticalSubsystemLandingFn", getHostVerticalSubsystemLandingFn(), null, loaderErrors),
      ]);
      if (loaderErrors.length > 0) {
        logSystemError({
          data: {
            severity: "WARN",
            subsystem: "store_home_loader",
            route: "/",
            message: `${loaderErrors.length} contrato(s) falharam na carga da página inicial`,
            error_payload: {
              page_url: "/",
              contract_name: loaderErrors.map((e) => e.contract).join(","),
              city: filteredCity || null,
              failures: loaderErrors,
            },
          },
        }).catch(() => {});
      }

      const directWorkspaceProducts =
        !workspaceListings || workspaceListings.length === 0
          ? []
          : workspaceListings.map((item: UnifiedListing) => {
        const origPrice = item.compare_at_cents || item.price_cents;
        const price = item.price_cents;
        const discount = origPrice > price ? Math.round(((origPrice - price) / origPrice) * 100) : 0;
        return {
          id: item.id,
          title: item.title,
          slug: item.slug || item.id,
          store_id: item.store_id,
          store_name: item.store_name || "Loja Credenciada",
          price_cents: price,
          original_price_cents: origPrice,
          discount_percent: discount,
          mechanic_label: discount > 0 ? `${discount}% OFF` : "Verificado",
          cover_image: item.cover_url || item.media_urls?.[0] || "",
          selling_unit: item.selling_unit || "un",
          in_stock: item.is_unlimited_stock || (item.stock_quantity ?? 1) > 0,
          has_flash_offer: discount > 0,
        };
      });

      const combinedMap = new Map<string, any>();
      for (const p of directWorkspaceProducts) {
        if (p.id) combinedMap.set(p.id, p);
      }
      for (const p of (marketplaceFeed?.allProducts || [])) {
        if (p.id && !combinedMap.has(p.id)) combinedMap.set(p.id, p);
      }

      return {
        banners: banners || [],
        middleBanners: middleBanners || [],
        footerBanners: footerBanners || [],
        editorialHotpages: editorialHotpages || [],
        marketplaceProducts: Array.from(combinedMap.values()) as FlashOfferDTO[],
        placesListings: placesListings || [],
        classifieds: classifieds || [],
        jobs: jobs || [],
        events: events || [],
        newsArticles: newsArticles || [],
        feedPosts: (feedResponse as MuralFeedResponse)?.items || [],
        concursos: concursos || [],
        homeSections: homeSections || [],
        showcasePosts: showcasePosts || [],
        session: session || null,
        surfaceExperience: surfaceExperience || null,
        ecosystemConfig: ecosystemConfig || null,
        rootLanding: rootLanding || null,
        hostVertical: hostVertical || null,
        forceVitrineMode: Boolean(
          (location.search as any)?.vitrine === "1" ||
            (location.search as any)?.vitrine === "true",
        ),
        activeCity: filteredCity,
        loaderErrors,
      };
    } catch (err: any) {
      const message = err instanceof Error ? err.message : String(err || "Unknown home loader error");
      console.error("[loader:_store.index] Unhandled loader error:", err);
      logSystemError({
        data: {
          severity: "ERROR",
          subsystem: "store_home_loader",
          route: "/",
          message,
          error_payload: { page_url: "/", contract_name: "_store.index.loader" },
        },
      }).catch(() => {});
      return {
        banners: [],
        middleBanners: [],
        footerBanners: [],
        editorialHotpages: [],
        marketplaceProducts: [],
        placesListings: [],
        classifieds: [],
        jobs: [],
        events: [],
        newsArticles: [],
        feedPosts: [],
        concursos: [],
        ecosystemConfig: null,
        forceVitrineMode: false,
        loaderErrors: [{ contract: "_store.index.loader", message }],
      };
    }
  },
  component: VitrineHome,
});

export function VitrineHome() {
  const { isCompact } = useEffectiveViewport();
  const data = (Route.useLoaderData?.() as any) || {};
  const {
    marketplaceProducts = [],
    placesListings = [],
    classifieds = [],
    newsArticles = [],
  } = data;

  const showSalesLanding =
    data?.surfaceExperience?.mode !== "omni_published" &&
    !data?.forceVitrineMode &&
    (data?.ecosystemConfig?.rootExperienceMode || "landing_vendas") === "landing_vendas";

  if (data?.hostVertical?.landing && !data?.forceVitrineMode) {
    return (
      <VerticalLandingView
        landing={data.hostVertical.landing}
        subsystem={resolveSubsystemBySlug(data.hostVertical.subsystemId)}
      />
    );
  }

  return (
    <div
      data-viewport={isCompact ? "compact" : "expanded"}
      className={isCompact ? "space-y-4" : "space-y-6"}
    >
      {showSalesLanding ? (
        <WaesySalesLanding
          subsystems={data?.ecosystemConfig?.subsystems || []}
          rootLanding={data?.rootLanding || null}
          marketplaceProducts={marketplaceProducts}
          places={placesListings}
          classifieds={classifieds}
          news={newsArticles}
        />
      ) : (
        <CommunityMarketplaceExperience data={data} />
      )}

      <footer
        aria-label="Diretório Institucional, SEO, GEO e Portal de Desenvolvedores Waesy"
        className="mx-auto max-w-7xl border-t border-border px-4 py-8 text-xs text-muted-foreground"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-foreground">Waesy Local Marketplace</h2>
            <p className="leading-relaxed">
              Ecossistema integrado de comércio, serviços, diretório empresarial com CNPJ validado,
              portal de notícias e descoberta local para consumidores e agentes de IA.
            </p>
          </div>
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-foreground">Canais Públicos Indexados</h2>
            <ul className="space-y-2">
              <li><a href="/diretorio" className="hover:text-foreground underline-offset-4 hover:underline">Diretório de Empresas e CNPJ</a></li>
              <li><a href="/noticias" className="hover:text-foreground underline-offset-4 hover:underline">Portal de Notícias Regionais</a></li>
              <li><a href="/classificados" className="hover:text-foreground underline-offset-4 hover:underline">Classificados e Ofertas</a></li>
              <li><a href="/eventos" className="hover:text-foreground underline-offset-4 hover:underline">Agenda de Eventos</a></li>
              <li><a href="/receitas" className="hover:text-foreground underline-offset-4 hover:underline">Receitas da Comunidade</a></li>
              <li><a href="/empregos" className="hover:text-foreground underline-offset-4 hover:underline">Vagas de Emprego</a></li>
            </ul>
          </div>
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-foreground">Desenvolvedores e Agentes IA</h2>
            <ul className="space-y-2">
              <li><a href="/developers" className="hover:text-foreground underline-offset-4 hover:underline">Portal de Desenvolvedores (/developers)</a></li>
              <li><a href="/docs" className="hover:text-foreground underline-offset-4 hover:underline">Documentação da API (/docs)</a></li>
              <li><a href="/api/openapi.json" className="hover:text-foreground underline-offset-4 hover:underline">Especificação OpenAPI 3.1</a></li>
              <li><a href="/.well-known/mcp.json" className="hover:text-foreground underline-offset-4 hover:underline">Manifesto MCP (.well-known/mcp.json)</a></li>
              <li><a href="/api/webmcp.json" className="hover:text-foreground underline-offset-4 hover:underline">Catálogo WebMCP (/api/webmcp.json)</a></li>
              <li><a href="/llms.txt" className="hover:text-foreground underline-offset-4 hover:underline">Instruções LLMs (/llms.txt)</a></li>
            </ul>
          </div>
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-foreground">Institucional e Confiança</h2>
            <ul className="space-y-2">
              <li><a href="/about" className="hover:text-foreground underline-offset-4 hover:underline">Sobre a Waesy (/about)</a></li>
              <li><a href="/contact" className="hover:text-foreground underline-offset-4 hover:underline">Contato e Suporte (/contact)</a></li>
              <li><a href="/privacy" className="hover:text-foreground underline-offset-4 hover:underline">Política de Privacidade e LGPD (/privacy)</a></li>
              <li><a href="/sitemap.xml" className="hover:text-foreground underline-offset-4 hover:underline">Mapa do Site (/sitemap.xml)</a></li>
              <li><a href="/sitemap-news.xml" className="hover:text-foreground underline-offset-4 hover:underline">Sitemap de Notícias (/sitemap-news.xml)</a></li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}
