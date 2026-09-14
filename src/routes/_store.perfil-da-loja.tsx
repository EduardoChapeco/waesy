/**
 * _store.perfil-da-loja.tsx — Página Oficial da Loja / Empresa no Marketplace
 * Utiliza a visão canônica unificada com abas especializadas (Vitrine, Sobre, Posts, Vagas, Avaliações, Patrocinadores).
 */

import { createFileRoute } from "@tanstack/react-router";
import { getPublicStoreProfile, getStorePublicCatalog } from "@/services/catalog.functions";
import { listPublicJobs } from "@/services/jobs.functions";
import { getPublicExperienceDocumentBySlug } from "@/services/builder.functions";
import { listHotpages } from "@/services/hotpage.functions";
import { listActiveBanners } from "@/services/banner.functions";
import { getIdentity } from "@/services/identity.functions";
import { getMuralFeed, getCompanyEmployerStats } from "@/services/social.functions";
import { listStorePublicReviews } from "@/services/cms.functions";
import { listStorePublicSponsors } from "@/services/news.functions";
import { CanonicalStoreProfileView } from "@/components/commerce/canonical-store-profile-view";
import { UnconfiguredState } from "@/components/state/states";

export const Route = createFileRoute("/_store/perfil-da-loja")({
  validateSearch: (
    search: Record<string, unknown>
  ): { storeId?: string; slug?: string; aba?: string; origem?: string; mesa?: string } => {
    return {
      storeId: typeof search.storeId === "string" ? search.storeId : undefined,
      slug: typeof search.slug === "string" ? search.slug : undefined,
      aba: typeof search.aba === "string" ? search.aba : undefined,
      origem: typeof search.origem === "string" ? search.origem : undefined,
      mesa: typeof search.mesa === "string" ? search.mesa : undefined,
    };
  },
  head: ({ loaderData }: any) => {
    const profile = loaderData?.profile;
    const storeName = profile?.name || "Loja Oficial";
    const storeLogo =
      profile?.settings?.logoUrl ||
      profile?.settings?.logo_url ||
      profile?.logoUrl ||
      "/icons/icon-192x192.png";
    const primaryColor =
      profile?.settings?.primaryColor || profile?.settings?.primary_color || "#09090b";

    return {
      title: profile?.name
        ? `${profile.name} — Loja & Cardápio Oficial | Waesy`
        : "Página Oficial da Loja | Waesy",
      meta: [
        {
          name: "description",
          content:
            profile?.description ||
            "Catálogo de produtos, cardápio, horários de funcionamento e canais oficiais de atendimento.",
        },
        { name: "theme-color", content: primaryColor },
        { name: "apple-mobile-web-app-title", content: storeName },
        { name: "apple-mobile-web-app-capable", content: "yes" },
        { name: "mobile-web-app-capable", content: "yes" },
        { property: "og:title", content: `${storeName} — Loja Oficial` },
        { property: "og:image", content: storeLogo },
      ],
      links: [
        {
          rel: "manifest",
          href: profile?.id
            ? `/api/pwa/manifest.json?storeId=${profile.id}`
            : "/manifest.json",
        },
        {
          rel: "apple-touch-icon",
          href: storeLogo,
        },
      ],
    };
  },

  loader: async ({ location }) => {
    try {
      const search = (location.search || {}) as any;
      const targetStore = search.storeId || search.slug;

      const [
        profile,
        docRes,
        catalogRes,
        jobsRes,
        hotpagesRes,
        bannersRes,
        postsRes,
        reviewsRes,
        sponsorsRes,
        employerStatsRes,
        identityRes,
      ] = await Promise.all([
        getPublicStoreProfile({ data: targetStore ? { storeId: targetStore } : undefined }).catch(
          () => null
        ),
        getPublicExperienceDocumentBySlug({
          data: { slug: "home", document_type: "storefront", storeId: targetStore },
        }).catch(() => null),
        getStorePublicCatalog({ data: targetStore ? { storeId: targetStore } : undefined }).catch(
          () => null
        ),
        listPublicJobs({ data: {} }).catch(() => null),
        listHotpages({ data: { module: "home" } }).catch(() => []),
        listActiveBanners({ data: { placement: "store" } }).catch(() => []),
        targetStore
          ? getMuralFeed({ data: { store_id: targetStore, limit: 12 } }).catch(() => null)
          : Promise.resolve(null),
        targetStore
          ? listStorePublicReviews({ data: { storeId: targetStore } }).catch(() => [])
          : Promise.resolve([]),
        targetStore
          ? listStorePublicSponsors({ data: { storeId: targetStore } }).catch(() => [])
          : Promise.resolve([]),
        targetStore
          ? getCompanyEmployerStats({ data: { storeId: targetStore } }).catch(() => null)
          : Promise.resolve(null),
        getIdentity().catch(() => null),
      ]);

      const rawJobs = Array.isArray(jobsRes) ? jobsRes : (jobsRes as any)?.jobs || [];
      const storeJobs = rawJobs.filter((j: any) => {
        if (!profile?.id) return false;
        return (
          j.store_id === profile.id ||
          j.company_name?.toLowerCase() === profile.name?.toLowerCase()
        );
      });

      const storePosts = (postsRes as any)?.items || [];

      const isOwner = Boolean(
        (identityRes as any)?.id &&
        ((profile as any)?.owner_id === (identityRes as any).id ||
         (profile as any)?.user_id === (identityRes as any).id ||
         (identityRes as any).store_id === profile?.id ||
         (identityRes as any).role === "admin")
      );

      return {
        profile,
        catalog: catalogRes?.products || [],
        categories: catalogRes?.categories || [],
        jobs: storeJobs,
        hotpages: Array.isArray(hotpagesRes) ? hotpagesRes : [],
        banners: Array.isArray(bannersRes) ? bannersRes : [],
        posts: storePosts,
        reviews: Array.isArray(reviewsRes) ? reviewsRes : [],
        sponsors: Array.isArray(sponsorsRes) ? sponsorsRes : [],
        employerStats: employerStatsRes || null,
        isOwner,
        builderTree:
          docRes?.status === "ok" && (docRes.data as any).tree?.length > 0
            ? (docRes.data as any).tree
            : null,
      };
    } catch (err) {
      console.error("[loader:_store.perfil-da-loja] Unhandled error:", err);
      return {
        profile: null,
        catalog: null,
        categories: null,
        jobs: null,
        hotpages: null,
        banners: null,
        posts: null,
        reviews: null,
        sponsors: null,
        employerStats: null,
        builderTree: null,
      };
    }
  },

  component: StorePerfilPage,
});

function StorePerfilPage() {
  const {
    profile,
    catalog,
    categories,
    jobs,
    hotpages,
    banners,
    posts,
    reviews,
    sponsors,
    employerStats,
    builderTree,
    isOwner,
  } = ((Route.useLoaderData?.() as any) || {});

  const search = Route.useSearch();

  if (!profile || ("status" in profile && (profile as any).status === "unconfigured")) {
    return (
      <div className="mx-auto max-w-screen-xl px-4 py-12 md:px-6">
        <UnconfiguredState title="Loja não encontrada ou em configuração" />
      </div>
    );
  }

  return (
    <CanonicalStoreProfileView
      store={profile}
      catalog={catalog}
      categories={categories}
      banners={banners}
      hotpages={hotpages}
      jobs={jobs}
      posts={posts}
      reviews={reviews}
      sponsors={sponsors}
      employerStats={employerStats}
      builderTree={builderTree}
      initialTab={search.aba || "vitrine"}
      isOwner={isOwner ?? false}
      source="storefront"
      backUrl="/"
      backLabel="Início"
    />
  );
}
