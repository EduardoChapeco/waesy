import { createFileRoute, notFound, Link, isRedirect, isNotFound } from "@tanstack/react-router";
import { getPublicExperienceDocumentBySlug } from "@/services/builder.functions";
import { getNavigationMenus } from "@/services/cms.functions";
import { getPublicCmsCollectionsForStore } from "@/services/cms-collections.functions";
import { ExperienceRenderer } from "@/components/commerce/experience-renderer";
import { OmniPageRenderer } from "@/components/builder/OmniPageRenderer";
import { PublicFooter } from "@/components/commerce/public-footer";
import { Surface } from "@/components/ui/surface";
import { AlertCircle, Loader2, FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateOmniPageSeo } from "@/lib/builder/omni-page-seo";

export const Route = createFileRoute("/_store/paginas/$slug")({
  loader: async ({ params }) => {
    try {
      const [res, catalogRes, navigationMenus] = await Promise.all([
        getPublicExperienceDocumentBySlug({
          data: { slug: params.slug },
        }),
        import("@/services/catalog.functions")
          .then((m) => m.listPublishedProducts({ data: { limit: 20 } }))
          .catch(() => ({ status: "error", data: [] })),
        getNavigationMenus().catch(() => []),
      ]);

      if (res.status === "not_found" || res.status === "unconfigured") {
        throw notFound();
      }

      if (res.status !== "ok") {
        throw new Error("Erro ao carregar a página.");
      }

      const effectiveStoreId =
        (res.data as any)?.document?.store_id ||
        (res.data as any)?.storeData?.id ||
        null;
      const cmsCollections = effectiveStoreId
        ? await getPublicCmsCollectionsForStore({
            data: { storeId: String(effectiveStoreId) },
          }).catch(() => [])
        : [];

      const storeProducts =
        Array.isArray((res.data as any)?.products) && (res.data as any).products.length > 0 ? (res.data as any).products : null;
      const fallbackProducts =
        catalogRes?.status === "ok" && Array.isArray(catalogRes.data) ? catalogRes.data : [];
      const products = storeProducts ?? fallbackProducts;
      const categories = Array.isArray((res.data as any)?.categories) ? (res.data as any).categories : [];
      const storeData = (res.data as any)?.storeData ?? null;
      const newsArticles = Array.isArray((res.data as any)?.newsArticles)
        ? (res.data as any).newsArticles
        : [];
      const sponsors = Array.isArray((res.data as any)?.sponsors) ? (res.data as any).sponsors : [];
      const classifieds = Array.isArray((res.data as any)?.classifieds) ? (res.data as any).classifieds : [];
      const posts = Array.isArray((res.data as any)?.posts) ? (res.data as any).posts : [];
      const flyers = Array.isArray((res.data as any)?.flyers) ? (res.data as any).flyers : [];
      const events = Array.isArray((res.data as any)?.events) ? (res.data as any).events : [];
      const jobs = Array.isArray((res.data as any)?.jobs) ? (res.data as any).jobs : [];
      const stores = Array.isArray((res.data as any)?.stores) ? (res.data as any).stores : [];
      const banners = Array.isArray((res.data as any)?.banners) ? (res.data as any).banners : [];
      const hotpages = Array.isArray((res.data as any)?.hotpages) ? (res.data as any).hotpages : [];

      return {
        document: res.data.document,
        tree: res.data.tree,
        products,
        categories,
        storeData,
        newsArticles,
        sponsors,
        classifieds,
        posts,
        flyers,
        events,
        jobs,
        stores,
        banners,
        hotpages,
        navigationMenus: Array.isArray(navigationMenus) ? navigationMenus : [],
        cmsCollections: Array.isArray(cmsCollections) ? cmsCollections : [],
      };
    } catch (err) {
      if (isNotFound(err) || isRedirect(err)) {
        throw err;
      }
      console.error("[loader:_store.paginas.$slug] Unhandled error:", err);
      return {
        document: null,
        tree: null,
        products: [],
        categories: [],
        storeData: null,
        newsArticles: [],
        sponsors: [],
        classifieds: [],
        posts: [],
        flyers: [],
        events: [],
        jobs: [],
        stores: [],
        banners: [],
        hotpages: [],
        navigationMenus: [],
        cmsCollections: [],
      };
    }
  },
  head: ({ loaderData, params }) => {
    return generateOmniPageSeo({
      document: loaderData?.document,
      storeData: loaderData?.storeData,
      slug: params.slug,
    });
  },
  component: PublicPage,
  pendingComponent: () => (
    <div className="flex flex-col items-center justify-center min-h-dvh bg-background">
      <Loader2 className="size-10 animate-spin motion-reduce:animate-none text-foreground/30" />
      <p className="mt-4 font-mono text-sm text-foreground/60 uppercase">Carregando página...</p>
    </div>
  ),
  errorComponent: ({ error }) => {
    if (isRedirect(error)) {
      throw error;
    }
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh p-4 bg-background">
        <Surface variant="default" padding="lg" className="max-w-md w-full text-center">
          <AlertCircle className="size-12 text-destructive mx-auto mb-4" />
          <h2 className="font-semibold text-2xl mb-2 text-foreground">Erro no Carregamento</h2>
          <p className="font-sans text-muted-foreground mb-6">{error.message}</p>
          <Button asChild className="w-full h-11 min-h-11">
            <Link to="/">Voltar para o Início</Link>
          </Button>
        </Surface>
      </div>
    );
  },
  notFoundComponent: () => (
    <div className="flex flex-col items-center justify-center min-h-dvh p-4 bg-background">
      <Surface padding="lg" className="max-w-md w-full text-center">
        <FileQuestion className="size-12 text-foreground mx-auto mb-4 opacity-50" />
        <h2 className="font-semibold text-2xl mb-2">Página Vazia</h2>
        <p className="font-sans text-muted-foreground mb-6">
          A página que você tentou acessar não existe ou ainda não foi configurada.
        </p>
        <Button asChild className="w-full h-11 min-h-11">
          <Link to="/">Explorar Comunidade</Link>
        </Button>
      </Surface>
    </div>
  ),
});

function PublicPage() {
  const {
    document,
    tree,
    products,
    categories,
    storeData,
    newsArticles,
    sponsors,
    classifieds,
    posts,
    flyers,
    events,
    jobs,
    stores,
    banners,
    hotpages,
    navigationMenus,
    cmsCollections,
  } =
    (Route.useLoaderData?.() as any) || {};

  if (!document) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh p-4 bg-background">
        <Surface padding="lg" className="max-w-md w-full text-center">
          <FileQuestion className="size-12 text-foreground mx-auto mb-4 opacity-50" />
          <h2 className="font-semibold text-2xl mb-2">Página Indisponível</h2>
          <p className="font-sans text-muted-foreground mb-6">
            Não foi possível carregar o conteúdo desta página no momento.
          </p>
          <Button asChild className="w-full h-11 min-h-11">
            <Link to="/">Voltar ao Início</Link>
          </Button>
        </Surface>
      </div>
    );
  }

  // Public route strictly serves published or canonical pages (unpublished drafts are excluded)
  const omniDoc =
    document?.settings?.omni_page_published || document?.settings?.omni_page || null;

  const safeMenus = Array.isArray(navigationMenus) ? navigationMenus : [];
  const safeCmsCollections = Array.isArray(cmsCollections) ? cmsCollections : [];
  const hasFooterBlock = Boolean(
    omniDoc?.blocks?.some(
      (b: any) =>
        b?.type === "site_footer" ||
        b?.type === "news_promethee_footer",
    ),
  );
  const footerMenuRecord = safeMenus.find(
    (m: any) => m?.location === "footer_menu" || m?.handle === "footer_menu",
  );
  const footerMenuItems = Array.isArray(footerMenuRecord?.items) ? footerMenuRecord.items : [];

  if (
    omniDoc?.blocks &&
    Array.isArray(omniDoc.blocks) &&
    omniDoc.blocks.length > 0
  ) {
    return (
      <main className="w-full flex flex-col gap-0 min-h-dvh bg-background">
        <OmniPageRenderer
          document={omniDoc}
          products={products}
          categories={categories}
          storeData={storeData}
          newsArticles={newsArticles}
          sponsors={sponsors}
          classifieds={classifieds}
          posts={posts}
          flyers={flyers}
          events={events}
          jobs={jobs}
          stores={stores}
          banners={banners}
          hotpages={hotpages}
          navigationMenus={safeMenus}
          cmsCollections={safeCmsCollections}
        />
        {!hasFooterBlock && footerMenuItems.length > 0 ? (
          <PublicFooter menuItems={footerMenuItems} store={storeData} />
        ) : null}
      </main>
    );
  }

  return (
    <main className="w-full flex flex-col gap-0 min-h-dvh bg-background">
      <ExperienceRenderer nodes={tree} />
    </main>
  );
}
