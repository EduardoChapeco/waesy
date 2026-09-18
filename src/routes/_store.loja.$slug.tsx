/**
 * _store.loja.$slug.tsx — Rota Canônica da Loja / Vitrine Comercial (/loja/:slug)
 * Design Padrão Apple HIG, integrado com CanonicalStoreProfileView e Proteção por Senha.
 */

import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LockKey } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { getPublicStoreProfile, getStorePublicCatalog } from "@/services/catalog.functions";
import { listPublicJobs } from "@/services/jobs.functions";
import { getPublicExperienceDocumentBySlug } from "@/services/builder.functions";
import { listHotpages } from "@/services/hotpage.functions";
import { listActiveBanners } from "@/services/banner.functions";
import { getIdentity } from "@/services/identity.functions";
import { getMuralFeed, getCompanyEmployerStats } from "@/services/social.functions";
import { listStorePublicReviews } from "@/services/cms.functions";
import { listStorePublicSponsors } from "@/services/news.functions";
import { listActiveStoreFlyers } from "@/services/store-flyers.functions";
import { CanonicalStoreProfileView } from "@/components/commerce/canonical-store-profile-view";
import { UnconfiguredState } from "@/components/state/states";

export const Route = createFileRoute("/_store/loja/$slug")({
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
        ? `${profile.name} — Vitrine & Cardápio Oficial | Waesy`
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

  loader: async ({ params }) => {
    try {
      const targetStore = params.slug;

      const [
        profile,
        docRes,
        catalogRes,
        jobsRes,
        hotpagesRes,
        bannersRes,
        flyersRes,
        postsRes,
        reviewsRes,
        sponsorsRes,
        employerStatsRes,
        identityRes,
      ] = await Promise.all([
        getPublicStoreProfile({ data: { storeId: targetStore } }).catch(() => null),
        getPublicExperienceDocumentBySlug({
          data: { slug: "home", document_type: "storefront", storeId: targetStore },
        }).catch(() => null),
        getStorePublicCatalog({ data: { storeId: targetStore } }).catch(() => null),
        listPublicJobs({ data: {} as any }).catch(() => []),
        listHotpages({ data: { module: "home" } as any }).catch(() => []),
        listActiveBanners({ data: { storeId: targetStore } }).catch(() => []),
        listActiveStoreFlyers({ data: { storeSlug: targetStore } }).catch(() => []),
        getMuralFeed({ data: { store_id: targetStore } }).catch(() => []),
        listStorePublicReviews({ data: { storeId: targetStore } }).catch(() => []),
        listStorePublicSponsors({ data: { storeId: targetStore } }).catch(() => []),
        getCompanyEmployerStats({ data: { storeId: targetStore } }).catch(() => null),
        getIdentity().catch(() => null),
      ]);

      return {
        profile,
        experienceDoc: (docRes as any)?.data?.document || (docRes as any)?.document || null,
        catalog: catalogRes?.products || [],
        categories: catalogRes?.categories || [],
        jobs: jobsRes || [],
        hotpages: hotpagesRes || [],
        banners: bannersRes || [],
        flyers: flyersRes || [],
        posts: postsRes || [],
        reviews: reviewsRes || [],
        sponsors: sponsorsRes || [],
        employerStats: employerStatsRes,
        identity: identityRes,
        slug: params.slug,
      };
    } catch (err) {
      console.error("[loader:_store.loja.$slug] Unhandled loader error:", err);
      return {
        profile: null,
        experienceDoc: null,
        catalog: [],
        categories: [],
        jobs: [],
        hotpages: [],
        banners: [],
        flyers: [],
        posts: [],
        reviews: [],
        sponsors: [],
        employerStats: null,
        identity: null,
        slug: params.slug,
      };
    }
  },

  component: StoreSlugCanonicalPage,
});

function StoreSlugCanonicalPage() {
  const data = Route.useLoaderData() as any;
  const navigate = useNavigate();
  const [isUnlocked, setIsUnlocked] = useState<boolean | null>(null);

  const profile = data?.profile;
  const slug = data?.slug;

  // Verificação de Acesso Privado por Senha
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (profile?.access_type === "password_protected") {
      const token = window.sessionStorage.getItem(`store_unlocked_${slug}`);
      if (!token) {
        setIsUnlocked(false);
        navigate({ to: "/loja/$slug/senha", params: { slug } });
      } else {
        setIsUnlocked(true);
      }
    } else {
      setIsUnlocked(true);
    }
  }, [profile?.access_type, slug, navigate]);

  if (!profile) {
    return (
      <div className="py-20 max-w-lg mx-auto px-4 text-center space-y-4">
        <UnconfiguredState
          title="Empresa Não Encontrada"
          description="A loja ou vitrine que você está procurando não existe ou teve seu endereço alterado."
        />
        <Button asChild variant="outline" className="rounded-xl font-bold text-xs">
          <Link to="/">← Voltar para o Início</Link>
        </Button>
      </div>
    );
  }

  // Se a loja for privada e ainda não tiver desbloqueado, renderiza aviso com link direto
  if (profile.access_type === "password_protected" && isUnlocked === false) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4 py-16 text-center">
        <div className="max-w-sm w-full space-y-4">
          <div className="size-16 rounded-3xl bg-muted/60 border border-border/80 flex items-center justify-center mx-auto text-primary">
            <LockKey size={30} weight="duotone" />
          </div>
          <h2 className="text-lg font-bold text-foreground">Acesso Restrito por Senha</h2>
          <p className="text-xs text-muted-foreground">
            Esta vitrine é privada e requer a senha fornecida pelo lojista.
          </p>
          <Button asChild className="w-full h-11 rounded-xl font-bold text-xs">
            <Link to="/loja/$slug/senha" params={{ slug }}>
              Digitar Senha de Acesso
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <CanonicalStoreProfileView
      store={profile}
      catalog={data.catalog}
      categories={data.categories}
      banners={data.banners}
      flyers={data.flyers}
      hotpages={data.hotpages}
      jobs={data.jobs}
      posts={data.posts}
      reviews={data.reviews}
      sponsors={data.sponsors}
      employerStats={data.employerStats}
      builderTree={data.experienceDoc?.nodes || null}
      isOwner={Boolean(
        data.identity?.id &&
        (data.identity?.store_id === profile.id ||
         data.identity?.id === profile.owner_id ||
         data.identity?.id === profile.user_id ||
         data.identity?.role === "admin" ||
         data.identity?.role === "platform_admin")
      )}
      source="storefront"
    />
  );
}
