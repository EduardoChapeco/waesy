/**
 * _store.diretorio.$id.tsx — Perfil Comercial da Empresa no Guia & Diretório Local
 * Unificado no Padrão Canônico Apple HIG (Idêntico ao Perfil de Membro com Abas Ricas de Loja, Sobre, Posts, Vagas e Avaliações).
 */

import { createFileRoute, Link } from "@tanstack/react-router";
import { Compass, ArrowLeft } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { getPublicDirectoryById } from "@/services/directory.functions";
import { getStorePublicCatalog } from "@/services/catalog.functions";
import { listPublicJobs } from "@/services/jobs.functions";
import { listHotpages } from "@/services/hotpage.functions";
import { listActiveBanners } from "@/services/banner.functions";
import { getIdentity } from "@/services/identity.functions";
import { getMuralFeed, getCompanyEmployerStats } from "@/services/social.functions";
import { listStorePublicReviews } from "@/services/cms.functions";
import { listStoreDealReviews } from "@/services/deal-reviews.functions";
import { listStorePublicSponsors } from "@/services/news.functions";
import { getPublicClassifieds } from "@/services/classifieds.functions";
import { getStoreConcursos } from "@/services/invite.functions";
import { getStorePublicProfileWithSections } from "@/services/store.functions";
import { CanonicalStoreProfileView } from "@/components/commerce/canonical-store-profile-view";

export const Route = createFileRoute("/_store/diretorio/$id")({
  head: ({ loaderData }: any) => ({
    meta: [
      {
        title: loaderData?.listing
          ? `${loaderData.listing.business_name || loaderData.listing.name} — Perfil Institucional | Waesy`
          : "Perfil Institucional | Waesy",
      },
      {
        name: "description",
        content: loaderData?.listing
          ? `${(loaderData.listing.description || "").slice(0, 160)}...`
          : "Conheça horários, especialidades, endereço e solicite atendimento.",
      },
    ],
  }),
  loader: async ({ params }) => {
    try {
      const listing = await getPublicDirectoryById({ data: { listingId: params.id } }).catch(
        () => null
      );

      if (!listing) {
        return {
          listing: null,
          catalog: [],
          categories: [],
          jobs: [],
          hotpages: [],
          banners: [],
          posts: [],
          reviews: [],
          sponsors: [],
        };
      }

      const targetStore = listing.store_id || listing.id;

      const [
        catalogRes,
        jobsRes,
        hotpagesRes,
        bannersRes,
        postsRes,
        reviewsRes,
        dealReviewsRes,
        sponsorsRes,
        classifiedsRes,
        concursosRes,
        employerStatsRes,
        storeProfileRes,
        identityRes,
      ] = await Promise.all([
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
          ? listStoreDealReviews({ data: { storeId: targetStore } }).catch(() => ({ reviews: [] }))
          : Promise.resolve({ reviews: [] }),
        targetStore
          ? listStorePublicSponsors({ data: { storeId: targetStore } }).catch(() => [])
          : Promise.resolve([]),
        targetStore
          ? getPublicClassifieds({ data: { storeId: targetStore, limit: 30 } }).catch(() => null)
          : Promise.resolve(null),
        targetStore
          ? getStoreConcursos({ data: { storeId: targetStore } }).catch(() => [])
          : Promise.resolve([]),
        targetStore
          ? getCompanyEmployerStats({ data: { storeId: targetStore, companyName: listing.business_name || (listing as any).name || "" } }).catch(() => null)
          : Promise.resolve(null),
        targetStore
          ? getStorePublicProfileWithSections({ data: { store_id: targetStore } }).catch(() => null)
          : Promise.resolve(null),
        getIdentity().catch(() => null),
      ]);

      const rawJobs = Array.isArray(jobsRes) ? jobsRes : (jobsRes as any)?.jobs || [];
      const storeJobs = rawJobs.filter((j: any) => {
        if (!targetStore) return false;
        return (
          j.store_id === targetStore ||
          j.company_name?.toLowerCase() === (listing.business_name || (listing as any).name)?.toLowerCase()
        );
      });

      const storePosts = (postsRes as any)?.items || [];
      const rawClassifieds = (classifiedsRes as any)?.items || [];
      const classifiedProducts = rawClassifieds.map((item: any) => ({
        id: item.id,
        name: item.title,
        title: item.title,
        description: item.content,
        content: item.content,
        price_cents: item.price_cents,
        price: item.price_cents ? item.price_cents / 100 : 0,
        image_url: item.media?.[0] || item.images?.[0] || null,
        images: item.media || item.images || [],
        category: item.category,
        is_classified: true,
      }));

      const finalCatalog = (catalogRes?.products && catalogRes.products.length > 0)
        ? catalogRes.products
        : classifiedProducts;

      // Unificar avaliações legadas e avaliações auditadas de deals
      const publicReviews = Array.isArray(reviewsRes) ? reviewsRes : [];
      const dealReviews = ((dealReviewsRes as any)?.reviews || []).map((dr: any) => ({
        id: dr.id,
        rating: dr.rating,
        comment: dr.comment,
        created_at: dr.created_at,
        reviewer_name: dr.reviewer?.full_name || "Comprador Verificado",
        product_name: dr.classified?.title || "Pacote / Serviço Verificado",
        is_verified: true,
      }));

      const combinedReviews = [...dealReviews, ...publicReviews];
      const isOwner = Boolean(
        (identityRes as any)?.id &&
        ((listing as any).owner_id === (identityRes as any).id ||
         (listing as any).user_id === (identityRes as any).id ||
         (identityRes as any).store_id === targetStore ||
         (identityRes as any).role === "admin")
      );

      return {
        listing,
        sections: (storeProfileRes as any)?.sections || [],
        catalog: finalCatalog,
        categories: catalogRes?.categories || [],
        jobs: storeJobs,
        hotpages: Array.isArray(hotpagesRes) ? hotpagesRes : [],
        banners: Array.isArray(bannersRes) ? bannersRes : [],
        posts: storePosts,
        reviews: combinedReviews,
        sponsors: Array.isArray(sponsorsRes) ? sponsorsRes : [],
        concursos: Array.isArray(concursosRes) ? concursosRes : [],
        employerStats: employerStatsRes || null,
        isOwner,
      };
    } catch (err) {
      console.error("[loader:_store.diretorio.$id] Unhandled error:", err);
      return {
        listing: null,
        catalog: [],
        categories: [],
        jobs: [],
        hotpages: [],
        banners: [],
        posts: [],
        reviews: [],
        sponsors: [],
        concursos: [],
      };
    }
  },
  component: CanonicalDirectoryDetailPage,
});

function CanonicalDirectoryDetailPage() {
  const data = Route.useLoaderData();
  const listing = data?.listing ?? null;
  const catalog = data?.catalog ?? [];
  const categories = data?.categories ?? [];
  const jobs = data?.jobs ?? [];
  const hotpages = data?.hotpages ?? [];
  const banners = data?.banners ?? [];
  const posts = data?.posts ?? [];
  const reviews = data?.reviews ?? [];
  const sponsors = data?.sponsors ?? [];
  const concursos = data?.concursos ?? [];
  const sections = data?.sections ?? [];
  const employerStats = data?.employerStats ?? null;
  const isOwner = data?.isOwner ?? false;

  if (!listing) {
    return (
      <div className="w-full max-w-3xl mx-auto py-24 text-center space-y-4">
        <Compass size={48} className="text-muted-foreground/40 mx-auto" />
        <h1 className="text-xl font-bold text-foreground">
          Cadastro Não Encontrado
        </h1>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Este cadastro pode ter sido alterado ou desativado temporariamente.
        </p>
        <Button asChild className="rounded-xl font-bold">
          <Link to="/diretorio">
            <ArrowLeft size={16} weight="bold" className="mr-2" />
            Voltar para o Guia Local
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <CanonicalStoreProfileView
      store={listing}
      sections={sections}
      catalog={catalog}
      categories={categories}
      banners={banners}
      hotpages={hotpages}
      jobs={jobs}
      posts={posts}
      reviews={reviews}
      sponsors={sponsors}
      concursos={concursos}
      employerStats={employerStats}
      isOwner={isOwner}
      source="directory"
      backUrl="/diretorio"
      backLabel="Guia & Diretório"
    />
  );
}
