import { createFileRoute, isRedirect } from "@tanstack/react-router";
import { EditorialShowcaseView } from "@/components/classifieds/editorial-showcase-view";
import { UniversalClassifiedShowcase } from "@/components/classifieds/universal-classified-showcase";
import { ConvenienceShowcaseView } from "@/components/classifieds/convenience-showcase-view";
import { ProductTelemetry } from "@/components/commerce/product-telemetry";
import { AiSdrChat } from "@/components/commerce/ai-sdr-chat";
import { getPublicClassifiedById } from "@/services/classifieds.functions";
import { getProfile } from "@/services/auth.functions";
import {
  ClassifiedStatusBanners,
  ClassifiedSimilarAdsGrid,
  ClassifiedEmptyState,
  ClassifiedDetailErrorState,
  ClassifiedDetailDialogs,
  buildClassifiedHead,
  useClassifiedDetail,
} from "@/components/classifieds/detail";
import { ActionAuthGuardModal } from "@/components/common/action-auth-guard-modal";
import { useActionAuthGuard } from "@/hooks/use-action-auth-guard";

export const Route = createFileRoute("/_store/classificados/$id")({
  head: buildClassifiedHead,

  loader: async ({
    params,
  }): Promise<{
    classified: any;
    status: "active" | "sold" | "paused" | "reserved" | "archived" | "not_found" | "invalid_id" | "error";
    isOwner: boolean;
    canManage: boolean;
    viewerContext: string;
    currentProfile: any;
    similarAds: any[];
    errorMessage?: string;
  }> => {
    try {
      const [result, profileRes] = await Promise.all([
        (getPublicClassifiedById({ data: params.id } as any) as Promise<any>).catch((err) => ({
          classified: null,
          status: "error" as const,
          errorMessage: err?.message || "Falha de conexão com o servidor.",
          isOwner: false,
          canManage: false,
          viewerContext: "anonymous",
          similarAds: [],
        })),
        getProfile().catch(() => null),
      ]);
      return {
        classified: result?.classified || null,
        status: (result?.status ?? "not_found") as any,
        isOwner: result?.isOwner || false,
        canManage: result?.canManage || false,
        viewerContext: result?.viewerContext || "anonymous",
        currentProfile: profileRes || null,
        similarAds: result?.similarAds || [],
        errorMessage: result?.errorMessage,
      };
    } catch (err: any) {
      return {
        classified: null,
        status: "error",
        isOwner: false,
        canManage: false,
        viewerContext: "anonymous",
        currentProfile: null,
        similarAds: [],
        errorMessage: err?.message || "Erro inesperado ao buscar anúncio.",
      };
    }
  },
  component: ClassifiedDetailPage,
  errorComponent: ClassifiedDetailError,
});

function ClassifiedDetailError({ error }: { error: Error }) {
  if (isRedirect(error)) {
    throw error;
  }
  return <ClassifiedDetailErrorState error={error} />;
}

function ClassifiedDetailPage() {
  const {
    classified,
    status = "active",
    isOwner = false,
    canManage = false,
    viewerContext = "anonymous",
    currentProfile,
    similarAds = [],
    errorMessage,
  } = (Route.useLoaderData?.() as any) || {};

  if (status === "error") {
    return <ClassifiedDetailErrorState errorMessage={errorMessage} />;
  }

  if (!classified || status === "not_found" || status === "invalid_id") {
    return <ClassifiedEmptyState status={status} similarAds={similarAds} />;
  }

  const { requireAuth, modalProps } = useActionAuthGuard();

  const detail = useClassifiedDetail({
    classified,
    status,
    isOwner,
    canManage,
    viewerContext,
    currentProfile,
  });

  const dialogs = (
    <ClassifiedDetailDialogs
      classified={classified}
      detail={detail}
      viewerContext={viewerContext}
      currentProfile={currentProfile}
    />
  );

  if (detail.isConvenienceProduct) {
    return (
      <>
        <ProductTelemetry
          storeId={classified?.store_id || classified?.storeId}
          productId={classified?.id}
          title={classified?.title || "Produto de Conveniência"}
          description={classified?.content}
          priceCents={classified?.price_cents || 0}
          currency="BRL"
          imageUrl={classified?.images?.[0]}
          brandName={classified?.store_name || "Comunidade Waesy"}
          categoryName="Conveniência"
          sku={classified?.id}
          inStock={detail.isAvailableToOrder}
        />
        <ConvenienceShowcaseView
          classified={classified}
          isOwner={detail.effectiveIsOwner}
          onEdit={detail.handleEdit}
        />
        {dialogs}
        {classified?.ai_agent_enabled && (
          <AiSdrChat
            classifiedId={classified.id}
            storeName={classified.store_name || undefined}
            sellerName={classified.profiles?.full_name || classified.author_profile?.full_name || undefined}
            storeId={classified.store_id || undefined}
            sellerProfileId={classified.author_profile_id || undefined}
          />
        )}
      </>
    );
  }

  if (
    detail.niche?.id === "travel" ||
    classified?.category === "travel" ||
    classified?.category === "viagem" ||
    classified?.category === "tourism" ||
    classified?.attributes?.template_style === "editorial" ||
    classified?.attributes?.template_style === "immersive" ||
    classified?.attributes?.template_style === "instagram" ||
    classified?.attributes?.template_style === "instagram_resort"
  ) {
    return (
      <>
        <ProductTelemetry
          storeId={classified?.store_id || classified?.storeId}
          productId={classified?.id}
          title={classified?.title || "Anúncio"}
          description={classified?.content}
          priceCents={classified?.price_cents || 0}
          currency="BRL"
          imageUrl={classified?.images?.[0]}
          brandName={classified?.store_name || "Comunidade Waesy"}
          categoryName={classified?.category || "Turismo"}
          sku={classified?.id}
          inStock={detail.isAvailableToOrder}
        />
        <EditorialShowcaseView
          classified={classified}
          isOwner={detail.effectiveIsOwner}
          onOpenBookingModal={(dep) => {
            requireAuth({
              actionContext: "Efetuar reserva para este pacote de viagem",
              onSuccess: () => {
                if (dep) detail.setSelectedDeparture(dep);
                detail.setBookingOpen(true);
              },
            });
          }}
          onOpenProposalModal={() => {
            requireAuth({
              actionContext: "Enviar proposta para este anúncio",
              onSuccess: () => detail.setProposalOpen(true),
            });
          }}
          onEditClassified={detail.handleEdit}
        />
        {dialogs}
        <ActionAuthGuardModal {...modalProps} />
        {classified?.ai_agent_enabled && (
          <AiSdrChat
            classifiedId={classified.id}
            storeName={classified.store_name || undefined}
            sellerName={classified.profiles?.full_name || classified.author_profile?.full_name || undefined}
            storeId={classified.store_id || undefined}
            sellerProfileId={classified.author_profile_id || undefined}
          />
        )}
      </>
    );
  }

  return (
    <>
      <ProductTelemetry
        storeId={classified?.store_id || classified?.storeId}
        productId={classified?.id}
        title={classified?.title || "Anúncio"}
        description={classified?.content}
        priceCents={classified?.price_cents || 0}
        currency="BRL"
        imageUrl={classified?.images?.[0]}
        brandName={classified?.store_name || "Comunidade Waesy"}
        categoryName={classified?.category || "Classificados"}
        sku={classified?.id}
        inStock={detail.isAvailableToOrder}
      />
      <ClassifiedStatusBanners
        status={status}
        isOfferExpired={detail.isOfferExpired}
        isOfferLimitReached={detail.isOfferLimitReached}
      />
      <UniversalClassifiedShowcase
        classified={classified}
        isOwner={detail.effectiveIsOwner}
        canManage={detail.effectiveIsOwner || canManage}
        viewerContext={viewerContext}
        currentProfile={currentProfile}
        onOpenBookingModal={(payload) => {
          requireAuth({
            actionContext: "Efetuar reserva para este anúncio",
            onSuccess: () => {
              if (payload) {
                if (payload.checkIn) detail.setCheckInDate(payload.checkIn);
                if (payload.checkOut) detail.setCheckOutDate(payload.checkOut);
                if (payload.guests) detail.setBookingGuests(payload.guests);
                if (payload.departure_date || payload.id) detail.setSelectedDeparture(payload);
              }
              detail.setBookingOpen(true);
            },
          });
        }}
        onOpenProposalModal={() => {
          requireAuth({
            actionContext: "Enviar proposta para este anúncio",
            onSuccess: () => detail.setProposalOpen(true),
          });
        }}
        onOpenApplyModal={() => {
          requireAuth({
            actionContext: "Candidatar-se a esta oportunidade",
            onSuccess: () => detail.setApplyModalOpen(true),
          });
        }}
        onDirectBuy={() => {
          requireAuth({
            actionContext: "Comprar produto diretamente",
            onSuccess: () => detail.handleDirectBuy(),
          });
        }}
        onDownloadDigital={() => {
          requireAuth({
            actionContext: "Baixar conteúdo digital exclusivo",
            onSuccess: () => detail.handleDownloadDigitalFile(),
          });
        }}
        onOpenCompanion={() => detail.setCompanionModalOpen(true)}
        onEdit={detail.handleEdit}
        isBooking={detail.isBooking}
        isBuyingDirect={detail.isBuyingDirect}
        isDownloadingDigital={detail.isDownloadingDigital}
      />
      {dialogs}
      <ActionAuthGuardModal {...modalProps} />
      <ClassifiedSimilarAdsGrid similarAds={similarAds} />
      {classified?.ai_agent_enabled && (
        <AiSdrChat
          classifiedId={classified.id}
          storeName={classified.store_name || undefined}
          sellerName={classified.profiles?.full_name || classified.author_profile?.full_name || undefined}
          storeId={classified.store_id || undefined}
          sellerProfileId={classified.author_profile_id || undefined}
        />
      )}
    </>
  );
}
