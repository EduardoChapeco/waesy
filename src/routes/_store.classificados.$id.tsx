import React, { useState, useEffect } from "react";
import { createFileRoute, isRedirect } from "@tanstack/react-router";
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
  validateSearch: (search: Record<string, unknown>): { preview?: boolean } => ({
    preview: (search.preview === true || search.preview === "true") ? true : undefined,
  }),

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
    if (params.id === "preview-live") {
      const profile = await getProfile().catch(() => null);
      return {
        classified: null,
        status: "active",
        isOwner: true,
        canManage: true,
        viewerContext: "owner",
        currentProfile: profile || null,
        similarAds: [],
      };
    }
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

function ClassifiedDetailError({ error }: { error: unknown }) {
  if (isRedirect(error)) {
    throw error;
  }
  const normalizedError = error instanceof Error ? error : new Error(String(error));
  return <ClassifiedDetailErrorState error={normalizedError} />;
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

  const params = Route.useParams();
  const search = Route.useSearch() as any;
  const isPreviewMode = params.id === "preview-live" || search?.preview === true || search?.preview === "true";

  // Suporte a preview de rascunho em sessionStorage (GAP-01)
  const [previewClassified, setPreviewClassified] = useState<any>(null);

  useEffect(() => {
    if (isPreviewMode && typeof window !== "undefined") {
      try {
        const raw = sessionStorage.getItem("waesy_preview_payload");
        if (raw) {
          const parsed = JSON.parse(raw);
          setPreviewClassified(parsed);
        }
      } catch (err) {
        console.warn("[_store.classificados.$id] Falha ao carregar rascunho do preview:", err);
      }
    }
  }, [isPreviewMode]);

  const effectiveClassified = previewClassified || classified;

  if (status === "error" && !effectiveClassified) {
    return <ClassifiedDetailErrorState errorMessage={errorMessage} />;
  }

  if (!effectiveClassified) {
    if (isPreviewMode) {
      return (
        <div className="min-h-72 flex flex-col items-center justify-center p-6 text-center space-y-3">
          <p className="text-sm font-semibold text-muted-foreground">Carregando dados da prévia em tempo real...</p>
        </div>
      );
    }
    return <ClassifiedEmptyState status={status} similarAds={similarAds} />;
  }

  const { requireAuth, modalProps } = useActionAuthGuard();

  const detail = useClassifiedDetail({
    classified: effectiveClassified,
    status: isPreviewMode ? "active" : status,
    isOwner: isPreviewMode ? true : isOwner,
    canManage: isPreviewMode ? true : canManage,
    viewerContext: isPreviewMode ? "owner" : viewerContext,
    currentProfile,
  });

  const dialogs = (
    <ClassifiedDetailDialogs
      classified={effectiveClassified}
      detail={detail}
      viewerContext={viewerContext}
      currentProfile={currentProfile}
    />
  );

  if (detail.isConvenienceProduct) {
    return (
      <>
        {isPreviewMode && (
          <div className="w-full bg-primary/10 border-b border-primary/20 text-primary px-4 py-2 text-xs font-bold flex items-center justify-between">
            <span>Modo de Pré-Visualização (Rascunho não publicado)</span>
            <span className="text-xs opacity-80 font-normal">Dados do editor local</span>
          </div>
        )}
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
          onOpenBookingModal={() => detail.setBookingOpen(true)}
          onOpenProposalModal={() => {
            requireAuth({
              actionContext: "Enviar proposta para este produto",
              onSuccess: () => detail.setProposalOpen(true),
            });
          }}
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
        similarAds={similarAds}
        onOpenBookingModal={(payload) => {
          if (payload) {
            if (payload.checkIn) detail.setCheckInDate(payload.checkIn);
            if (payload.checkOut) detail.setCheckOutDate(payload.checkOut);
            if (payload.guests) detail.setBookingGuests(payload.guests);
            if (payload.departure_date || payload.id) detail.setSelectedDeparture(payload);
          }
          detail.setBookingOpen(true);
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
