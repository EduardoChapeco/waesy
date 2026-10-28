import React, { useState, useMemo, useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Share2, MapPin, Check, ShieldCheck, Package, Truck, MessageCircle, Phone, Edit3, Smartphone, X, FileText, Hotel, Star, Clock, Utensils, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/money";
import { trackAndOpenWhatsApp } from "@/lib/whatsapp";
import { FavoriteButton } from "@/components/common/favorite-button";
import { NativeBackButton } from "@/components/navigation";
import { MapLibreCanvas } from "@/components/mobility/maplibre-canvas";
import { resolveClassifiedNiche, getClassifiedPrimaryCtaLabel, isClassifiedConversational, getClassifiedPaymentMethods, isNichePaymentApplicable, getNicheTabLabels } from "@/lib/classifieds/semantics";
import { resolveClassifiedDetailedSpecs } from "@/lib/classifieds/canonical-specs-resolver";
import { NicheSpecificationsDisplay } from "@/components/common/niche-specifications-display";
import { LeadFormModal } from "@/components/leads/lead-form-modal";
import { ClassifiedFloatingActionBar } from "@/components/classifieds/classified-floating-action-bar";
import { startCustomerChatThread } from "@/services/chat.functions";
import { addToCart } from "@/services/cart.functions";
import { useCartContext } from "@/lib/cart-context";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { UniversalClassifiedShowcaseProps } from "@/types/unified-ad-engine";

function isVideoUrl(url?: string | null): boolean {
  if (!url) return false;
  const clean = url.split("?")[0].toLowerCase();
  return (
    clean.endsWith(".mp4") ||
    clean.endsWith(".webm") ||
    clean.endsWith(".mov") ||
    clean.includes("video")
  );
}

export function ClassifiedDetailMobile({
  classified,
  isOwner = false,
  canManage = false,
  viewerContext = "anonymous",
  currentProfile,
  onOpenBookingModal,
  onOpenProposalModal,
  onOpenApplyModal,
  onDirectBuy,
  onDownloadDigital,
  onEdit,
  onOpenCompanion,
  isBooking = false,
  isBuyingDirect = false,
  isDownloadingDigital = false,
  similarAds = [],
}: UniversalClassifiedShowcaseProps) {
  const navigate = useNavigate();
  const [activeImage, setActiveImage] = useState(0);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "media" | "seller">("overview");
  const [simulatedInstallments, setSimulatedInstallments] = useState<number>(12);
  const [isLeadFormModalOpen, setIsLeadFormModalOpen] = useState(false);
  const { refreshCart, setIsCartOpen } = useCartContext();
  const [isStartingChat, setIsStartingChat] = useState(false);
  const [isAddingCart, setIsAddingCart] = useState(false);

  const isConversational = useMemo(() => isClassifiedConversational(classified), [classified]);
  const paymentMethodsList = useMemo(() => getClassifiedPaymentMethods(classified), [classified]);

  const templateStyle = (classified.attributes?.template_style as string) || "standard";

  const isUuid = (str?: any): str is string =>
    typeof str === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

  const handleStartNativeChat = async (customInitialMessage?: string | React.MouseEvent) => {
    const initialMsg = typeof customInitialMessage === "string" ? customInitialMessage : undefined;
    setIsStartingChat(true);
    try {
      const validStoreId = isUuid(classified.store_id) ? classified.store_id : isUuid(classified.storeId) ? classified.storeId : undefined;
      const validAuthorId = isUuid(classified.author_profile_id) ? classified.author_profile_id : undefined;

      if (!validStoreId && !validAuthorId) {
        throw new Error("Anunciante não possui canal de chat ativo. Utilize o WhatsApp.");
      }

      const res = await startCustomerChatThread({
        data: {
          storeId: validStoreId,
          recipientProfileId: validAuthorId,
          subject: classified.title,
          initialMessage: initialMsg || `Olá, tenho interesse no anúncio: ${classified.title}`,
        },
      });
      if (res?.threadId) {
        toast.success("Conversa iniciada com sucesso!");
        navigate({ to: `/conta/conversas/${res.threadId}` });
      } else {
        throw new Error("Falha ao abrir conversa.");
      }
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg.includes("login") || msg.includes("Faça login") || msg.includes("autenticado") || msg.includes("Identifique-se")) {
        toast.info("Faça login para conversar no chat.");
        navigate({
          to: "/entrar",
          search: { returnUrl: `/classificados/${classified.id}` },
        });
      } else {
        toast.error(msg || "Não foi possível abrir o chat.");
      }
    } finally {
      setIsStartingChat(false);
    }
  };

  const handleAddClassifiedToCart = async () => {
    setIsAddingCart(true);
    try {
      await addToCart({
        data: {
          variantId: classified.id,
          quantity: 1,
        },
      });
      await refreshCart();
      setIsCartOpen(true);
      toast.success("Adicionado ao carrinho!");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao adicionar ao carrinho.");
    } finally {
      setIsAddingCart(false);
    }
  };

  const images: string[] = useMemo(() => {
    return (
      (Array.isArray(classified.images) && classified.images.length > 0 ? classified.images : null) ||
      (Array.isArray(classified.media) && classified.media.length > 0 ? classified.media : null) ||
      (Array.isArray(classified.media_urls) && classified.media_urls.length > 0 ? classified.media_urls : null) ||
      []
    );
  }, [classified]);

  const niche = useMemo(() => resolveClassifiedNiche(classified), [classified]);
  const attrs = classified.attributes || {};

  const isTravelOrHospitality = useMemo(() => {
    return (
      niche.id === "hospitality_stay" ||
      niche.id === "travel" ||
      templateStyle === "resort_hotel" ||
      Boolean(attrs.lodgings)
    );
  }, [niche, templateStyle, attrs]);

  const nicheTabLabels = useMemo(() => getNicheTabLabels(niche.id), [niche.id]);

  const tabs = useMemo(() => {
    const list: Array<{ id: "overview" | "media" | "seller"; label: string }> = [];
    list.push({
      id: "overview",
      label: isTravelOrHospitality && niche.id === "travel" ? "Infos do Pacote" : (nicheTabLabels.overviewTab || "Visão Geral"),
    });
    if (images.length > 1) {
      list.push({ id: "media", label: nicheTabLabels.mediaTab || "Fotos & Mídia" });
    }
    const author = classified.profiles as any;
    const hasSeller = Boolean(
      author?.name ||
      author?.full_name ||
      author?.phone ||
      classified.contact_whatsapp ||
      classified.whatsapp ||
      classified.store_id ||
      classified.storeId ||
      classified.user_id
    );
    if (hasSeller) {
      list.push({ id: "seller", label: nicheTabLabels.sellerTab || "Anunciante / Empresa" });
    }
    return list;
  }, [isTravelOrHospitality, niche.id, nicheTabLabels, images.length, classified]);

  useEffect(() => {
    if (tabs.length > 0 && !tabs.some((t) => t.id === activeTab)) {
      setActiveTab(tabs[0].id);
    }
  }, [tabs, activeTab]);

  const priceCents = Number(classified.price_cents || 0);
  const maxInstallments = Math.max(1, Number(attrs.max_installments) || 1);
  const installmentCents = Math.round(priceCents / maxInstallments);

  const isDonation = classified.category === "donation" || attrs.is_free_donation === true;
  const isInvestmentOpportunity = attrs.is_business_sale === true || attrs.deal_type === "investment_round";
  const targetInvestment = attrs.target_investment_cents || 0;
  const offeredEquity = attrs.offered_equity_percent ? `${attrs.offered_equity_percent}%` : null;

  // Condições comerciais
  const isPaymentAllowed = isNichePaymentApplicable(classified);
  const acceptsCard = isPaymentAllowed && (attrs.accepts_card === true || paymentMethodsList.some((p) => p.id === "card"));
  const cardInterestFree = Boolean(attrs.card_interest_free);

  // Vendedor e Contato
  const author = classified.profiles as any;
  const rawPhone = classified.contact_whatsapp || classified.whatsapp || author?.phone;
  const cleanPhone = rawPhone ? rawPhone.replace(/\D/g, "") : null;

  const handleWhatsApp = () => {
    if (!cleanPhone) {
      toast.error("Número de WhatsApp do vendedor não disponível.");
      return;
    }
    trackAndOpenWhatsApp({
      phone: cleanPhone,
      message: `Olá! Vi seu anúncio "${classified.title}" no Waesy e gostaria de mais informações.`,
      storeId: classified.store_id || classified.storeId || author?.id,
      entityId: classified.id,
      entityType: "classified",
      entityTitle: classified.title,
    });
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: classified.title,
          text: `Confira este anúncio no Waesy: ${classified.title}`,
          url,
        });
      } catch {
        // usuário cancelou
      }
    } else {
      navigator.clipboard.writeText(url);
      toast.success("Link copiado para a área de transferência!");
    }
  };

  // Primary CTA
  const primaryCta = useMemo(() => {
    if (isDonation) {
      return {
        label: "Solicitar Doação",
        action: () => {
          if (cleanPhone) handleWhatsApp();
          else if (onOpenProposalModal) onOpenProposalModal();
          else toast.info("Entre em contato com o doador para combinar a retirada gratuita.");
        },
      };
    }
    if (isInvestmentOpportunity) {
      return {
        label: "Proposta de Aporte",
        action: () => {
          if (cleanPhone) handleWhatsApp();
          else if (onOpenProposalModal) onOpenProposalModal();
        },
      };
    }
    if (isTravelOrHospitality) {
      return {
        label: getClassifiedPrimaryCtaLabel(classified) || "Consultar e Reservar",
        action: () => onOpenBookingModal?.(),
      };
    }
    if (classified.digital_file_url || classified.category === "digital") {
      return {
        label: isDownloadingDigital ? "Baixando..." : "Baixar Arquivo",
        action: () => onDownloadDigital?.(),
      };
    }
    if (niche.id === "job" || classified.category === "job") {
      return {
        label: "Candidatar-se à Vaga",
        action: () => {
          if (onOpenApplyModal) onOpenApplyModal();
          else if (cleanPhone) handleWhatsApp();
        },
      };
    }
    if (niche.id === "event" || classified.category === "event") {
      return {
        label: isAddingCart ? "Adicionando..." : "Garantir Ingresso",
        action: handleAddClassifiedToCart,
      };
    }
    if (niche.id === "agri") {
      return {
        label: "Agendar Vistoria",
        action: () => {
          if (cleanPhone) handleWhatsApp();
          else if (onOpenProposalModal) onOpenProposalModal();
          else handleStartNativeChat();
        },
      };
    }
    if (false) {
      return {
        label: "Candidatar-se à Vaga",
        action: () => {
          if (onOpenApplyModal) onOpenApplyModal();
          else if (cleanPhone) handleWhatsApp();
        },
      };
    }
    if (isConversational) {
      return {
        label: isStartingChat ? "Iniciando..." : "Enviar Mensagem",
        action: handleStartNativeChat,
      };
    }
    return {
      label: isAddingCart ? "Adicionando..." : "Adicionar ao Carrinho",
      action: handleAddClassifiedToCart,
    };
  }, [isDonation, isInvestmentOpportunity, isTravelOrHospitality, classified, onOpenBookingModal, onOpenApplyModal, onDownloadDigital, isDownloadingDigital, cleanPhone, isConversational, isStartingChat, isAddingCart]);

  const locationText = useMemo(() => {
    if (classified.hide_location || attrs.hide_location) {
      return "Localização preservada a pedido do anunciante";
    }
    return (
      classified.address ||
      classified.location_name ||
      [classified.neighborhood || attrs.neighborhood, classified.city || attrs.city, classified.state || attrs.state]
        .filter(Boolean)
        .join(", ") ||
      "Brasil"
    );
  }, [classified, attrs]);

  // Tech / Feature cards canônicos resolvidos para todos os nichos
  const featureList = useMemo(() => resolveClassifiedDetailedSpecs(classified), [classified]);

  const travelDetails = useMemo(() => {
    const lodgings = Array.isArray(attrs.lodgings) && attrs.lodgings.length > 0 ? attrs.lodgings : [];
    const firstLodging = lodgings[0] || {};

    const destinationTitle =
      attrs.destination ||
      classified.city ||
      classified.location_name ||
      classified.title;

    const destinationDescription =
      attrs.destination_summary ||
      (classified.content
        ? classified.content.length > 180
          ? `${classified.content.slice(0, 180)}...`
          : classified.content
        : "Destino turístico completo com excelente infraestrutura de lazer, gastronomia e passeios.");

    const hotelName =
      firstLodging.name ||
      attrs.hotel_name ||
      "Hotel & Resort Selecionado";

    const hotelSummary =
      firstLodging.description ||
      attrs.hotel_description ||
      "Acomodação confortável com infraestrutura completa e excelente localização para sua estadia.";

    const hotelStars = Number(firstLodging.stars || attrs.hotel_stars || 4);

    const lodgingPhotos: string[] = [];
    if (Array.isArray(firstLodging.images)) lodgingPhotos.push(...firstLodging.images);
    if (firstLodging.photo_url) lodgingPhotos.push(firstLodging.photo_url);
    if (lodgingPhotos.length === 0 && images.length > 1) {
      lodgingPhotos.push(...images.slice(1, 5));
    } else if (lodgingPhotos.length === 0 && images.length === 1) {
      lodgingPhotos.push(images[0]);
    }

    const hotelAmenities: string[] = (
      (Array.isArray(firstLodging.amenities) && firstLodging.amenities.length > 0
        ? firstLodging.amenities
        : null) ||
      (Array.isArray(attrs.hotel_amenities) && attrs.hotel_amenities.length > 0
        ? attrs.hotel_amenities
        : null) ||
      (Array.isArray(attrs.amenities) && attrs.amenities.length > 0
        ? attrs.amenities
        : null) ||
      ["Wi-Fi Grátis", "Ar-Condicionado", "Café da Manhã", "Piscina", "Estacionamento"]
    );

    const hotelCheckin = attrs.checkin_time || firstLodging.checkin_time || "A partir das 14:00";
    const hotelCheckout = attrs.checkout_time || firstLodging.checkout_time || "Até as 12:00";
    const hotelAddress = firstLodging.address || attrs.hotel_address || locationText;

    const packageMealPlan =
      attrs.meal_plan ||
      firstLodging.regime ||
      "Café da manhã incluso diariamente no restaurante do hotel.";

    const packageTransfer =
      attrs.has_transfer
        ? (attrs.transfer_vehicle ? `Traslado ${attrs.transfer_vehicle} in/out incluso aeroporto-hotel` : "Traslado in/out aeroporto incluso no pacote")
        : attrs.transfer_from
        ? `Traslado programado: ${attrs.transfer_from} para ${attrs.transfer_to || "destino"}`
        : "Traslado aeroporto / hotel incluso com motorista credenciado.";

    const packageTours =
      attrs.included_tours ||
      attrs.package_includes ||
      "Passeios aos principais pontos turísticos da região com guia credenciado.";

    return {
      destinationTitle,
      destinationDescription,
      hotelName,
      hotelSummary,
      hotelStars,
      hotelPhotos: lodgingPhotos,
      hotelAmenities,
      hotelCheckin,
      hotelCheckout,
      hotelAddress,
      packageMealPlan,
      packageTransfer,
      packageTours,
    };
  }, [attrs, classified, images, locationText]);

  return (
    <div
      data-active-template={templateStyle}
      data-active-niche={niche.id}
      data-render-mode="mobile-native"
      className="w-full min-h-screen bg-background text-foreground pb-32 pb-safe select-none"
    >
      {/* ── 1. HEADER PADRONIZADO FIXO NO TOPO COM FLEX ROW E BACK BUTTON ALINHADO ── */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/40 px-3 h-12 flex items-center justify-between">
        <NativeBackButton
          variant="default"
          fallbackHref="/classificados"
          className="size-11 min-h-11 min-w-11 -ml-1 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        />
        <div className="flex items-center gap-1">
          {(isOwner || canManage) && onEdit && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onEdit}
              className="h-11 min-h-11 px-3 text-xs font-semibold gap-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Editar anúncio"
            >
              <Edit3 className="size-4" />
              <span>Editar</span>
            </Button>
          )}
          {onOpenCompanion && (
            <button
              type="button"
              onClick={onOpenCompanion}
              className="size-11 min-h-11 min-w-11 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              title="Guia Digital 9:16"
              aria-label="Guia Digital"
            >
              <Smartphone className="size-5 text-primary" />
            </button>
          )}
          <button
            type="button"
            onClick={handleShare}
            className="size-11 min-h-11 min-w-11 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Compartilhar anúncio"
          >
            <Share2 className="size-5" />
          </button>
          <div className="size-11 min-h-11 min-w-11 flex items-center justify-center">
            <FavoriteButton
              itemId={classified.id}
              itemType="classified"
              className="size-11 min-h-11 min-w-11 text-muted-foreground hover:text-foreground"
            />
          </div>
        </div>
      </header>

      {/* ── 2. HERO DE MÍDIA NATIVO FULL BLEED NO MOBILE ── */}
      <div className="relative w-full aspect-[4/3] sm:aspect-video bg-muted/20 overflow-hidden">
        {images.length > 0 ? (
          <div className="relative size-full overflow-hidden flex items-center justify-center">
            {isVideoUrl(images[activeImage]) ? (
              <video
                src={images[activeImage]}
                controls
                playsInline
                className="size-full object-contain bg-neutral-950"
              />
            ) : (
              <>
                <img
                  src={images[activeImage]}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 size-full object-cover blur-2xl opacity-35 scale-110 pointer-events-none select-none"
                />
                <button
                  type="button"
                  onClick={() => setFullscreenImage(images[activeImage])}
                  className="relative size-full flex items-center justify-center cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  aria-label="Abrir imagem em tela cheia"
                >
                  <img
                    src={images[activeImage]}
                    alt={`${classified.title} - foto ${activeImage + 1}`}
                    className="size-full object-cover object-center pointer-events-none"
                  />
                </button>
              </>
            )}

            {/* Contador no Canto */}
            {images.length > 1 && (
              <div className="absolute bottom-3 right-3 px-2 py-1 rounded-md bg-neutral-950/70 backdrop-blur-md text-foreground text-xs font-mono font-medium pointer-events-none z-10">
                {activeImage + 1}/{images.length}
              </div>
            )}
          </div>
        ) : (
          <div className="size-full flex flex-col items-center justify-center text-muted-foreground gap-2">
            <Package className="size-12 stroke-1" />
            <span className="text-xs">Sem fotos cadastradas</span>
          </div>
        )}
      </div>

      {/* ── 2.1 MINIATURAS INICIANDO RENTE À MARGEM ESQUERDA (100% visíveis com px-4) ── */}
      {images.length > 1 && (
        <div className="px-4 py-2 flex gap-2 overflow-x-auto no-scrollbar w-full">
          {images.map((imgUrl, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setActiveImage(idx)}
              className={cn(
                "size-14 sm:size-16 rounded-lg overflow-hidden shrink-0 border cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                activeImage === idx
                  ? "border-primary ring-2 ring-primary/40"
                  : "border-border/60 hover:opacity-80"
              )}
              aria-label={`Selecionar foto ${idx + 1}`}
            >
              {isVideoUrl(imgUrl) ? (
                <div className="size-full bg-neutral-950 flex items-center justify-center text-foreground text-xs">
                  Vídeo
                </div>
              ) : (
                <img
                  src={imgUrl}
                  alt=""
                  className="size-full object-cover"
                />
              )}
            </button>
          ))}
        </div>
      )}

      {/* ── 3. ARQUITETURA DE ABAS EM LINHA ÚNICA (SEM QUEBRA) ── */}
      <div className="px-4 pt-3">
        <div
          role="tablist"
          aria-label="Seções do anúncio"
          className="tab-list flex flex-nowrap overflow-x-auto no-scrollbar gap-1 border-b border-border/40 pb-px whitespace-nowrap w-full"
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "h-11 min-h-11 px-3 flex-1 min-w-max text-xs font-semibold rounded-t-lg transition-colors border-b-2 flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  isActive
                    ? "border-primary text-primary font-bold bg-primary/5"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40"
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 4. CONTEÚDO PRINCIPAL DAS ABAS ── */}
      <div className="px-4 pt-4 space-y-5">
        {/* ABA 1: Visão Geral / Detalhes do Item / Infos do Pacote */}
        {activeTab === "overview" && (
          <div className="space-y-5 animate-in fade-in duration-150">
            {/* Preço & Badges */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="text-xs font-semibold text-primary border-primary/30 bg-primary/10">
                  {niche.shortLabel || niche.title}
                </Badge>
                {classified.condition && !["hospitality_stay", "real_estate_sale", "real_estate_rent", "service", "job", "event", "travel", "digital", "subscription", "business"].includes(niche.id) && (
                  <Badge variant="secondary" className="text-xs font-medium">
                    {classified.condition === "new" ? "Novo" : classified.condition === "refurbished" ? "Revisado" : "Usado"}
                  </Badge>
                )}
                {attrs.delivery_available && niche.showDeliveryBadges && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md">
                    <Truck className="size-3" /> Entrega
                  </span>
                )}
              </div>

              {/* Preço em destaque */}
              <div className="pt-1">
                {isDonation ? (
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-extrabold text-emerald-600 font-mono whitespace-nowrap tabular-nums">Gratuito</span>
                    <span className="text-xs text-muted-foreground">Doação sem custo</span>
                  </div>
                ) : isInvestmentOpportunity ? (
                  <div className="space-y-1">
                    <span className="text-xs uppercase font-bold text-muted-foreground tracking-wider block">Aporte Solicitado</span>
                    <span className="text-2xl font-extrabold text-foreground font-mono whitespace-nowrap tabular-nums">
                      {targetInvestment > 0 ? formatMoney(targetInvestment) : (priceCents > 0 ? formatMoney(priceCents) : "A combinar")}
                    </span>
                    {offeredEquity && <span className="text-xs text-primary font-semibold block">{offeredEquity} de participação</span>}
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl sm:text-3xl font-extrabold text-foreground font-mono whitespace-nowrap tabular-nums">
                        {priceCents > 0 ? formatMoney(priceCents) : "Consulte o anunciante"}
                      </span>
                      {niche.priceSuffix && (
                        <span className="text-xs text-muted-foreground font-normal whitespace-nowrap">{niche.priceSuffix}</span>
                      )}
                    </div>
                    {priceCents > 0 && maxInstallments > 1 && acceptsCard && (
                      <p className="text-xs text-muted-foreground font-mono whitespace-nowrap tabular-nums">
                        ou até {maxInstallments}x de {formatMoney(installmentCents)} {cardInterestFree ? "sem juros" : ""}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Título do Anúncio */}
              <h1 className="text-lg sm:text-xl font-black text-foreground leading-snug pt-1 break-words text-wrap w-full">
                {classified.title}
              </h1>

              {/* Localização */}
              <div className="flex items-center gap-1 text-xs text-muted-foreground pt-1">
                <MapPin className="size-3.5 shrink-0 text-muted-foreground/70" />
                <span className="break-words text-wrap">{locationText}</span>
              </div>
            </div>

            {/* Strip Canônico do Template Selecionado (Mobile Native) */}
            {templateStyle === "automotivo" && (
              <div data-template-strip="automotivo" className="rounded-lg border border-border/70 bg-muted/20 p-4 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-foreground block">Showroom Automotivo</span>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-card border border-border/50 p-3">
                    <span className="text-xs text-muted-foreground block">Ano</span>
                    <span className="text-xs font-bold text-foreground break-words">{attrs.year || attrs.year_model || "Consulte"}</span>
                  </div>
                  <div className="rounded-lg bg-card border border-border/50 p-3">
                    <span className="text-xs text-muted-foreground block">KM</span>
                    <span className="text-xs font-bold text-foreground break-words">{attrs.mileage || attrs.mileage_km ? `${attrs.mileage || attrs.mileage_km} km` : "Consulte"}</span>
                  </div>
                </div>
              </div>
            )}

            {templateStyle === "resort_hotel" && (
              <div data-template-strip="resort_hotel" className="rounded-lg border border-border/70 bg-muted/20 p-4 flex items-center justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <span className="text-xs font-bold text-foreground block break-words text-wrap">Estadia & Hospitalidade</span>
                  <p className="text-xs text-muted-foreground break-words text-wrap">
                    Check-in {attrs.checkin_time || "14:00"} • Check-out {attrs.checkout_time || "12:00"}
                  </p>
                </div>
              </div>
            )}

            {templateStyle === "servicos_agenda" && (
              <div data-template-strip="servicos_agenda" className="rounded-lg border border-border/70 bg-muted/20 p-4 flex items-center justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <span className="text-xs font-bold text-foreground block break-words text-wrap">Agenda & Atendimento</span>
                  <p className="text-xs text-muted-foreground break-words text-wrap">
                    Modalidade: {attrs.modality === "online" ? "Online" : attrs.modality === "domicilio" ? "Domicílio" : "Presencial"}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleStartNativeChat("Olá, gostaria de consultar disponibilidade na agenda.")}
                  className="h-11 min-h-11 px-3 text-xs font-bold rounded-lg border-primary/40 text-primary hover:bg-primary/10 shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  Agendar
                </Button>
              </div>
            )}

            {templateStyle === "editorial" && (
              <div data-template-strip="editorial" className="rounded-lg border border-primary/25 bg-primary/5 p-4 space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-primary block">Dossiê Editorial</span>
                <p className="text-xs text-muted-foreground break-words text-wrap">
                  Curadoria completa com especificações detalhadas e negociação verificada.
                </p>
              </div>
            )}

            {/* Negociação e Agendamento Específico por Nicho */}
            {templateStyle === "automotivo" && (attrs.accepts_trade || attrs.accepts_financing || attrs.negotiable) && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 flex items-center justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <span className="text-xs font-bold text-foreground block break-words text-wrap">Negociação & Troca</span>
                  <p className="text-xs text-muted-foreground break-words text-wrap">
                    {attrs.accepts_trade ? "Aceita veículo na troca como parte do pagamento." : "Propostas comerciais e financiamento sob consulta."}
                  </p>
                </div>
                {onOpenProposalModal && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onOpenProposalModal}
                    className="h-11 min-h-11 px-3 text-xs font-bold rounded-lg border-primary/40 text-primary hover:bg-primary/10 shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    Enviar Proposta
                  </Button>
                )}
              </div>
            )}

            {templateStyle === "imobiliario" && (
              <div className="rounded-lg border border-border/60 bg-muted/20 p-4 flex items-center justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <span className="text-xs font-bold text-foreground block break-words text-wrap">Agendar Visita</span>
                  <p className="text-xs text-muted-foreground break-words text-wrap">Conheça o imóvel presencialmente com o anunciante.</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleStartNativeChat("Olá, gostaria de agendar uma visita para este imóvel.")}
                  className="h-11 min-h-11 px-3 text-xs font-bold rounded-lg border-primary/40 text-primary hover:bg-primary/10 shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  Agendar
                </Button>
              </div>
            )}

            {isTravelOrHospitality && (
              <div className="space-y-4">
                {/* ── CARD 1: Destino & Localização ── */}
                <div className="border-t border-border/40 pt-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                    <MapPin className="size-4 text-primary shrink-0" />
                    <span className="uppercase tracking-wider">Destino & Localização</span>
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-foreground">
                      {travelDetails.destinationTitle}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                      {travelDetails.destinationDescription}
                    </p>
                  </div>
                  {/* Mapa Integrado */}
                  {classified.location_lat && classified.location_lng && !classified.hide_location && !attrs.hide_location ? (
                    <div className="rounded-lg border border-border/50 overflow-hidden h-44 bg-muted/20">
                      <MapLibreCanvas
                        initialCenter={[classified.location_lng, classified.location_lat]}
                        initialZoom={14}
                        className="size-full"
                      />
                    </div>
                  ) : (
                    <div className="rounded-lg border border-border/40 bg-muted/20 p-3 flex items-center gap-3">
                      <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <MapPin className="size-5" />
                      </div>
                      <div className="min-w-0 text-xs">
                        <span className="font-bold text-foreground block break-words text-wrap">{locationText}</span>
                        <span className="text-muted-foreground">Localização turística aproximada</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── CARD 2: Hospedagem & Hotel ── */}
                <div className="border-t border-border/40 pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                      <Hotel className="size-4 text-primary shrink-0" />
                      <span className="uppercase tracking-wider">Hospedagem & Hotel</span>
                    </div>
                    {travelDetails.hotelStars > 0 && (
                      <div className="flex items-center gap-1 text-amber-500 font-bold text-xs">
                        <Star className="size-3.5 fill-amber-500" />
                        <span>{travelDetails.hotelStars} estrelas</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-foreground">{travelDetails.hotelName}</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                      {travelDetails.hotelSummary}
                    </p>
                  </div>

                  {/* Carrossel Limpo de Fotos da Hospedagem */}
                  {travelDetails.hotelPhotos.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground block font-medium">Fotos da Acomodação</span>
                      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 snap-x">
                        {travelDetails.hotelPhotos.map((photo, pIdx) => (
                          <button
                            key={pIdx}
                            type="button"
                            onClick={() => setFullscreenImage(photo)}
                            className="w-40 aspect-video shrink-0 snap-start rounded-lg overflow-hidden bg-muted/30 border border-border/40 relative cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            aria-label={`Ver foto do hotel ${pIdx + 1}`}
                          >
                            <img src={photo} alt="" className="size-full object-cover group-hover:scale-105 transition-transform" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Comodidades do Hotel */}
                  {travelDetails.hotelAmenities.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <span className="text-xs font-semibold text-muted-foreground block">
                        Comodidades Principais
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {travelDetails.hotelAmenities.map((amenity: string, idx: number) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-semibold bg-muted/60 text-foreground border border-border/50"
                          >
                            <Check className="size-3 text-primary shrink-0" />
                            <span>{amenity}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Endereço & Check-in */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/40 text-xs">
                    <div>
                      <span className="text-muted-foreground block">Check-in</span>
                      <span className="font-bold text-foreground font-mono">{travelDetails.hotelCheckin}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Check-out</span>
                      <span className="font-bold text-foreground font-mono">{travelDetails.hotelCheckout}</span>
                    </div>
                    {travelDetails.hotelAddress && (
                      <div className="col-span-2 pt-1 text-muted-foreground flex items-center gap-2">
                        <MapPin className="size-3 text-primary shrink-0" />
                        <span className="break-words text-wrap">{travelDetails.hotelAddress}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── CARD 3: O que inclui o pacote ── */}
                <div className="border-t border-border/40 pt-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                    <Package className="size-4 text-primary shrink-0" />
                    <span className="uppercase tracking-wider">O Que Inclui o Pacote</span>
                  </div>

                  <div className="space-y-2">
                    {/* Item 1: Alimentação */}
                    <div className="p-3 rounded-lg bg-muted/20 border border-border/40 flex items-start gap-3">
                      <div className="size-8 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-1">
                        <Utensils className="size-4" />
                      </div>
                      <div className="min-w-0 text-xs leading-snug space-y-1">
                        <span className="font-bold text-foreground block">Alimentação & Refeições</span>
                        <span className="text-muted-foreground">{travelDetails.packageMealPlan}</span>
                      </div>
                    </div>

                    {/* Item 2: Traslados */}
                    <div className="p-3 rounded-lg bg-muted/20 border border-border/40 flex items-start gap-3">
                      <div className="size-8 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-1">
                        <Truck className="size-4" />
                      </div>
                      <div className="min-w-0 text-xs leading-snug space-y-1">
                        <span className="font-bold text-foreground block">Traslados & Transporte</span>
                        <span className="text-muted-foreground">{travelDetails.packageTransfer}</span>
                      </div>
                    </div>

                    {/* Item 3: Passeios */}
                    <div className="p-3 rounded-lg bg-muted/20 border border-border/40 flex items-start gap-3">
                      <div className="size-8 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-1">
                        <Compass className="size-4" />
                      </div>
                      <div className="min-w-0 text-xs leading-snug space-y-1">
                        <span className="font-bold text-foreground block">Passeios & Experiências</span>
                        <span className="text-muted-foreground">{travelDetails.packageTours}</span>
                      </div>
                    </div>

                    {/* Item 4: Suporte e Seguro */}
                    <div className="p-3 rounded-lg bg-muted/20 border border-border/40 flex items-start gap-3">
                      <div className="size-8 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-1">
                        <ShieldCheck className="size-4" />
                      </div>
                      <div className="min-w-0 text-xs leading-snug space-y-1">
                        <span className="font-bold text-foreground block">Seguro & Suporte</span>
                        <span className="text-muted-foreground">Assistência especializada e seguro viagem durante todo o período do pacote.</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Ficha Técnica & Especificações Canônicas em Cards Grandes Squircles */}
            {featureList.length > 0 && (
              <div className="space-y-4">
                <NicheSpecificationsDisplay
                  items={featureList}
                  title={isTravelOrHospitality ? "Destaques & Especificações do Pacote" : "Ficha Técnica & Especificações"}
                />
              </div>
            )}

            {/* Descrição Nativa com Expansor */}
            {classified.content && (
              <div className="space-y-2">
                <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Descrição
                </h2>
                <div className="border-t border-border/40 pt-4 space-y-2 text-sm sm:text-base text-foreground/90 leading-relaxed">
                  <p className={isDescExpanded ? "whitespace-pre-line" : "whitespace-pre-line line-clamp-4"}>
                    {classified.content}
                  </p>
                  {classified.content.length > 200 && (
                    <button
                      type="button"
                      onClick={() => setIsDescExpanded(!isDescExpanded)}
                      className="text-xs font-bold text-primary hover:underline cursor-pointer block pt-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                    >
                      {isDescExpanded ? "Ver menos" : "Ler descrição completa"}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Condições de Pagamento e Simulador */}
            {isPaymentAllowed && paymentMethodsList.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Pagamento & Financiamento
                  </h2>
                  <span className="text-xs text-muted-foreground font-mono">Condições</span>
                </div>
                <div className="border-t border-border/40 pt-4 space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {paymentMethodsList.map((pm) => (
                      <span
                        key={pm.id}
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-medium bg-muted/60 text-foreground border border-border/50"
                      >
                        <pm.icon className="size-3 text-primary shrink-0" />
                        <span>{pm.label}</span>
                        {pm.badge && (
                          <span className="text-xs font-mono text-muted-foreground">({pm.badge})</span>
                        )}
                      </span>
                    ))}
                  </div>

                  {/* Simulador Interativo Mobile */}
                  {priceCents > 0 && acceptsCard && (
                    <div className="pt-2 border-t border-border/40 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-foreground">Simular Parcelas</span>
                        <span className="font-bold text-primary font-mono">{simulatedInstallments}x de {formatMoney(Math.round(priceCents / simulatedInstallments))}</span>
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={Math.min(24, Math.max(1, maxInstallments))}
                        step={1}
                        value={simulatedInstallments}
                        onChange={(e) => setSimulatedInstallments(Number(e.target.value))}
                        className="w-full h-2 rounded-full accent-primary cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        aria-label="Simulador de parcelas"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground font-mono">
                        <span>1x</span>
                        <span>{Math.min(24, Math.max(1, maxInstallments))}x</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Localização e Mapa */}
            {!classified.hide_location && !attrs.hide_location && classified.location_lat && classified.location_lng && (
              <div className="space-y-2">
                <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Localização Aproximada
                </h2>
                <div className="rounded-lg border border-border/50 overflow-hidden h-44 bg-muted/20">
                  <MapLibreCanvas
                    initialCenter={[classified.location_lng, classified.location_lat]}
                    initialZoom={14}
                    className="size-full"
                  />
                </div>
              </div>
            )}

            {/* Dica de Segurança */}
            <div className="rounded-lg border border-border/40 bg-muted/20 p-3 flex items-start gap-3 text-muted-foreground">
              <ShieldCheck className="size-4 text-primary shrink-0 mt-1" />
              <div className="text-xs leading-snug space-y-1">
                <span className="font-semibold text-foreground block">Dica de Segurança</span>
                <span>Nunca faça transferências antecipadas fora da plataforma. Prefira locais públicos para entregas.</span>
              </div>
            </div>
          </div>
        )}

        {/* ABA 2: Fotos & Mídia (Galeria em Grid de 2 Colunas) */}
        {activeTab === "media" && (
          <div className="space-y-3 animate-in fade-in duration-150">
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Galeria ({images.length} {images.length === 1 ? "foto" : "fotos"})
            </h2>
            {images.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {images.map((imgUrl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setFullscreenImage(imgUrl)}
                    className="relative aspect-square rounded-lg overflow-hidden bg-muted/30 border border-border/40 cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    aria-label={`Ver foto ${idx + 1} em tela cheia`}
                  >
                    {isVideoUrl(imgUrl) ? (
                      <video src={imgUrl} className="size-full object-cover" />
                    ) : (
                      <img
                        src={imgUrl}
                        alt={`${classified.title} - foto ${idx + 1}`}
                        className="size-full object-cover group-hover:scale-105 transition-transform"
                      />
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-6 rounded-lg border border-border/50 bg-muted/20 text-center text-xs text-muted-foreground">
                Nenhuma foto cadastrada para este anúncio.
              </div>
            )}
          </div>
        )}

        {/* ABA 3: Anunciante / Empresa */}
        {activeTab === "seller" && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="border-t border-border/40 pt-4 space-y-4">
              <div className="flex items-center gap-3">
                <div className="size-12 rounded-lg bg-muted flex items-center justify-center font-bold text-muted-foreground text-sm overflow-hidden shrink-0 border border-border/40">
                  {author?.avatar_url ? (
                    <img src={author.avatar_url} alt="" className="size-full object-cover" />
                  ) : (
                    <span>{(author?.full_name || classified.store_name || "A").charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-bold text-foreground break-words text-wrap">
                    {classified.store_name || author?.full_name || "Anunciante Waesy"}
                  </span>
                  <div className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                    <ShieldCheck className="size-3.5 shrink-0" />
                    <span>Perfil Verificado na Comunidade</span>
                  </div>
                </div>
              </div>

              {/* Badges de Atendimento e Avaliação Canônica */}
              <div className="grid grid-cols-2 gap-2 p-3 rounded-lg bg-muted/30 border border-border/40 text-xs">
                <div className="flex items-center gap-2">
                  <Clock className="size-4 text-primary shrink-0" />
                  <div>
                    <span className="text-muted-foreground block text-xs font-medium">Tempo de resposta</span>
                    <span className="font-semibold text-foreground">~15 min</span>
                  </div>
                </div>
                {classified.rating && Number(classified.rating) > 0 ? (
                  <div className="flex items-center gap-2">
                    <Star className="size-4 text-amber-500 fill-amber-500 shrink-0" />
                    <div>
                      <span className="text-muted-foreground block text-xs font-medium">Avaliação</span>
                      <span className="font-semibold text-foreground">
                        {Number(classified.rating).toFixed(1)}  {classified.review_count ? `(${classified.review_count})` : ""}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <div>
                      <span className="text-muted-foreground block text-xs font-medium">Procedência</span>
                      <span className="font-semibold text-foreground">Anunciante Verificado</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/40">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleStartNativeChat()}
                  disabled={isStartingChat}
                  className="h-11 min-h-11 rounded-lg text-xs font-bold border-primary/30 text-primary bg-primary/5 hover:bg-primary/10 flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <MessageCircle className="size-4" />
                  <span>{isStartingChat ? "..." : "Chat Interno"}</span>
                </Button>
                {cleanPhone && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleWhatsApp}
                    className="h-11 min-h-11 rounded-lg text-xs font-bold border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10 flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <Phone className="size-4" />
                    <span>WhatsApp</span>
                  </Button>
                )}
              </div>
            </div>

            {/* Carrossel de Anúncios Similares / Relacionados */}
            {similarAds && similarAds.length > 0 && (
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Anúncios Similares / Relacionados
                  </h3>
                  <span className="text-xs text-muted-foreground font-mono">
                    {similarAds.length} {similarAds.length === 1 ? "item" : "itens"}
                  </span>
                </div>
                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 snap-x">
                  {similarAds.map((sim: any) => {
                    const simImg = sim.images?.[0] || sim.media?.[0] || null;
                    return (
                      <Link
                        key={sim.id}
                        to="/classificados/$id"
                        params={{ id: sim.id }}
                        className="w-44 shrink-0 snap-start rounded-lg border border-border/50 bg-card overflow-hidden hover:border-primary/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary block"
                      >
                        <div className="aspect-4/3 w-full bg-muted/30 relative overflow-hidden">
                          {simImg ? (
                            <img src={simImg} alt={sim.title} className="size-full object-cover" />
                          ) : (
                            <div className="size-full flex items-center justify-center text-muted-foreground/40">
                              <Package className="size-6" />
                            </div>
                          )}
                        </div>
                        <div className="p-3 space-y-1">
                          <p className="text-xs font-bold text-foreground line-clamp-1">{sim.title}</p>
                          <p className="text-xs font-bold text-primary font-mono">
                            {sim.price_cents > 0 ? formatMoney(sim.price_cents) : "Sob Consulta"}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Informações de Local e Atendimento */}
            <div className="rounded-lg border border-border/40 bg-muted/20 p-4 space-y-2 text-xs text-muted-foreground leading-relaxed">
              <span className="font-bold text-foreground block">Atendimento Direto</span>
              <p>
                Este anúncio é comercializado diretamente pelo anunciante verificado com apoio da plataforma Waesy para intermediação segura.
              </p>
              <div className="flex items-center gap-2 pt-1 text-foreground font-medium">
                <MapPin className="size-3.5 text-primary shrink-0" />
                <span className="break-words text-wrap">{locationText}</span>
              </div>
            </div>
          </div>
        )}

        {/* Banner de Formulário de Leads (se ativo) */}
        {(classified?.lead_form || classified?.form_id || attrs?.inquiry_config?.enabled) && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-primary">
              <FileText className="size-4 shrink-0" />
              <span>{attrs?.inquiry_config?.title || "Formulário de Contato & Cotação"}</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {attrs?.inquiry_config?.subtitle || "Envie suas preferências diretamente para a equipe ou vendedor deste anúncio."}
            </p>
            <Button
              type="button"
              onClick={() => setIsLeadFormModalOpen(true)}
              className="w-full h-11 min-h-11 rounded-lg text-xs font-bold bg-primary text-primary-foreground shadow-xs active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Tenho Interesse / Preencher
            </Button>
          </div>
        )}
      </div>

      {/* ── 5. BARRA DE AÇÃO FLUTUANTE NATIVA (PADRÃO APPLE HIG / 44PX / SEM WALLS) ── */}
      <ClassifiedFloatingActionBar
        priceCents={priceCents}
        priceDisplay={
          isDonation
            ? "Gratuito"
            : isInvestmentOpportunity
            ? targetInvestment > 0
              ? formatMoney(targetInvestment)
              : "A combinar"
            : priceCents > 0
            ? formatMoney(priceCents)
            : "Sob Consulta"
        }
        priceConditionLabel={
          isDonation
            ? "Doação"
            : isInvestmentOpportunity
            ? offeredEquity
              ? `${offeredEquity} equity`
              : "Aporte"
            : niche.priceSuffix || undefined
        }
        installmentsText={
          priceCents > 0 && maxInstallments > 1 && acceptsCard
            ? `até ${maxInstallments}x de ${formatMoney(installmentCents)}`
            : undefined
        }
        primaryActionLabel={primaryCta.label}
        onPrimaryAction={primaryCta.action}
        isPrimaryLoading={isBooking || isBuyingDirect || isDownloadingDigital}
        onStartChat={handleStartNativeChat}
        isChatLoading={isStartingChat}
        whatsappPhone={cleanPhone}
        classifiedId={classified.id}
        classifiedTitle={classified.title}
        classifiedImage={images[0] || null}
        storeId={classified.store_id || classified.storeId || author?.id}
        storeName={classified.store_name || author?.full_name}
        isReadyPackage={isTravelOrHospitality}
      />

      {/* ── 6. MODAL LIGHTBOX DE IMAGEM EM TELA CHEIA ── */}
      {fullscreenImage && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Imagem em tela cheia"
          className="fixed inset-0 z-50 bg-neutral-950/95 flex items-center justify-center p-2 select-none animate-in fade-in duration-150"
        >
          <button
            type="button"
            onClick={() => setFullscreenImage(null)}
            className="absolute top-4 right-4 z-10 size-11 min-h-11 min-w-11 rounded-lg bg-muted/80 text-foreground flex items-center justify-center active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
            aria-label="Fechar tela cheia"
          >
            <X className="size-6" />
          </button>
          <div className="relative max-h-screen max-w-full flex items-center justify-center">
            {isVideoUrl(fullscreenImage) ? (
              <video
                src={fullscreenImage}
                controls
                playsInline
                autoPlay
                className="max-h-screen max-w-full object-contain rounded-lg"
              />
            ) : (
              <img
                src={fullscreenImage}
                alt="Tela cheia"
                className="max-h-screen max-w-full object-contain rounded-lg"
              />
            )}
          </div>
        </div>
      )}

      {/* ── Modal Universal de Captura de Leads ── */}
      {(classified?.lead_form || classified?.form_id || attrs?.inquiry_config?.enabled) && (
        <LeadFormModal
          formSlug={classified.lead_form?.slug || null}
          formId={classified.form_id || null}
          initialForm={classified.lead_form || null}
          civilInquiryConfig={attrs?.inquiry_config || null}
          nicheId={niche.id}
          currentProfile={currentProfile || null}
          classifiedId={classified.id}
          classifiedTitle={classified.title}
          isOpen={isLeadFormModalOpen}
          onOpenChange={setIsLeadFormModalOpen}
          onStartSdrChat={(payload) => {
            const formattedAnswers = payload?.answers && Object.keys(payload.answers).length > 0
              ? `\n\nRespostas do Formulário:\n` + Object.entries(payload.answers).map(([k, v]) => `• ${v}`).join("\n")
              : "";
            const initialMsg = `Olá, tenho interesse no anúncio: ${classified.title}${formattedAnswers}`;
            if (onOpenCompanion) {
              onOpenCompanion();
            } else {
              handleStartNativeChat(initialMsg);
            }
          }}
        />
      )}
    </div>
  );
}
