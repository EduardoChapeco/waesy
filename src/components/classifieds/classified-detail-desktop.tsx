import React, { useState, useMemo, useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Share2, MapPin, Check, ShieldCheck, Tag, Clock, User, ChevronLeft, ChevronRight, Maximize2, X, Phone, MessageCircle, Package, Truck, CreditCard, QrCode, Receipt, FileSpreadsheet, CheckCircle2, Edit3, Smartphone, ExternalLink, ShieldAlert, Coins, TrendingUp, Banknote, FileCheck, Download, AlertCircle, Eye, Building, Car, Hotel, Briefcase, HelpCircle, Lock, FileText, Landmark, RefreshCw, Star, Utensils, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/money";
import { formatRelativeTime } from "@/lib/datetime";
import { trackAndOpenWhatsApp } from "@/lib/whatsapp";
import { FavoriteButton } from "@/components/common/favorite-button";
import { MapLibreCanvas } from "@/components/mobility/maplibre-canvas";
import { resolveClassifiedNiche, getClassifiedPrimaryCtaLabel, isClassifiedConversational, getClassifiedPaymentMethods, isNichePaymentApplicable, getNicheTabLabels } from "@/lib/classifieds/semantics";
import { resolveClassifiedDetailedSpecs } from "@/lib/classifieds/canonical-specs-resolver";
import { NicheSpecificationsDisplay } from "@/components/common/niche-specifications-display";
import { LeadFormModal } from "@/components/leads/lead-form-modal";
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

export function ClassifiedDetailDesktop({
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
  const [activeImage, setActiveImage] = useState(0);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "media" | "seller">("overview");
  const [simulatedInstallments, setSimulatedInstallments] = useState<number>(12);
  const [isLeadFormModalOpen, setIsLeadFormModalOpen] = useState(false);
  const navigate = useNavigate();
  const { refreshCart, setIsCartOpen } = useCartContext();
  const [isStartingChat, setIsStartingChat] = useState(false);
  const [isAddingCart, setIsAddingCart] = useState(false);

  const isConversational = useMemo(() => isClassifiedConversational(classified), [classified]);
  const paymentMethodsList = useMemo(() => getClassifiedPaymentMethods(classified), [classified]);

  const displayMode = (classified.attributes?.display_mode as string) || "tabs";
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
        toast.success("Conversa aberta com sucesso!");
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
      (classified.attributes?.template_style as string) === "resort_hotel" ||
      Boolean(attrs.lodgings)
    );
  }, [niche, classified.attributes, attrs]);

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

  // Formas de pagamento
  const isPaymentAllowed = isNichePaymentApplicable(classified);
  const acceptsPix = isPaymentAllowed && (attrs.accepts_pix !== false && (attrs.accepts_pix === true || paymentMethodsList.some((p) => p.id === "pix")));
  const pixDiscountPercent = Number(attrs.pix_discount_percent) || 0;
  const acceptsCard = isPaymentAllowed && (attrs.accepts_card === true || paymentMethodsList.some((p) => p.id === "card"));
  const cardInterestFree = Boolean(attrs.card_interest_free);
  const acceptsBoleto = isPaymentAllowed && Boolean(attrs.accepts_boleto);
  const acceptsCarne = isPaymentAllowed && Boolean(attrs.accepts_carne);
  const acceptsFinancing = isPaymentAllowed && Boolean(attrs.accepts_financing);
  const acceptsTrade = isPaymentAllowed && Boolean(attrs.accepts_trade);

  // Vendedor
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
        // cancelado
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
        label: "Solicitar Doação Gratuita",
        action: () => {
          if (cleanPhone) handleWhatsApp();
          else if (onOpenProposalModal) onOpenProposalModal();
          else toast.info("Entre em contato com o doador para combinar a retirada gratuita.");
        },
      };
    }
    if (isInvestmentOpportunity) {
      return {
        label: "Apresentar Proposta de Investimento",
        action: () => {
          if (cleanPhone) handleWhatsApp();
          else if (onOpenProposalModal) onOpenProposalModal();
        },
      };
    }
    if (niche.id === "hospitality_stay" || niche.id === "travel") {
      return {
        label: getClassifiedPrimaryCtaLabel(classified),
        action: () => onOpenBookingModal?.(),
      };
    }
    if (classified.digital_file_url || classified.category === "digital") {
      return {
        label: isDownloadingDigital ? "Baixando..." : "Baixar Arquivo Digital",
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
    // Protocolo V140: Se for anúncio conversacional (Classificados / Serviços),
    // o botão de Comprar DESAPARECE e o CTA primário vira Enviar Mensagem.
    if (isConversational) {
      return {
        label: isStartingChat ? "Iniciando Chat..." : "Enviar Mensagem",
        action: handleStartNativeChat,
      };
    }
    // Se for Produto / E-commerce transacional:
    return {
      label: isAddingCart ? "Adicionando..." : "Adicionar ao Carrinho",
      action: handleAddClassifiedToCart,
    };
  }, [isDonation, isInvestmentOpportunity, niche, classified, onOpenBookingModal, onOpenApplyModal, onDownloadDigital, isDownloadingDigital, cleanPhone, isConversational, isStartingChat, isAddingCart]);

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

  // Features list canônica resolvida para todos os 15 nichos
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
        ? classified.content.length > 220
          ? `${classified.content.slice(0, 220)}...`
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
      lodgingPhotos.push(...images.slice(1, 6));
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
      data-render-mode="desktop-native"
      className="w-full min-h-[100dvh] bg-background text-foreground pb-16"
    >
      {/* ── BREADCRUMBS & TOP BAR ACTIONS (Desktop) ── */}
      <div className="w-full max-w-7xl mx-auto px-6 pt-5 pb-4 flex items-center justify-between gap-4">
        {/* Breadcrumb Limpo */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link to="/classificados" className="hover:text-foreground transition-colors">
            Classificados
          </Link>
          <span>/</span>
          <span className="text-foreground/80 font-medium">{niche.shortLabel || niche.title}</span>
          <span>/</span>
          <span className="text-foreground break-words text-wrap font-semibold">{classified.title}</span>
        </div>

        {/* Ações Desktop */}
        <div className="flex items-center gap-2">
          {onOpenCompanion && (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenCompanion}
              className="h-10 px-4 rounded-lg text-xs font-semibold border-border/70 bg-card hover:bg-muted/50 text-foreground flex items-center gap-2 cursor-pointer active:scale-98"
            >
              <Smartphone className="size-4 text-primary" />
              <span>Guia Digital</span>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            className="h-10 px-4 rounded-lg text-xs font-semibold border-border/70 bg-card hover:bg-muted/50 text-foreground flex items-center gap-2 cursor-pointer"
          >
            <Share2 className="size-4" />
            <span>Compartilhar</span>
          </Button>

          <FavoriteButton
            itemId={classified.id}
            itemType="classified"
            className="size-10 rounded-lg border border-border/70 bg-card hover:bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-foreground"
          />

          {isOwner && onEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={onEdit}
              className="h-10 px-3 rounded-lg border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200 text-xs font-bold flex items-center gap-2"
            >
              <Edit3 className="size-3.5 text-amber-600" />
              <span>Editar Anúncio</span>
            </Button>
          )}
        </div>
      </div>

      {/* ── MOSAICO BENTO DE MÍDIA (Desktop Airbnb Layout) ── */}
      <div className="w-full max-w-7xl mx-auto px-6 mb-8">
        {images.length === 0 ? (
          <div className="w-full aspect-[21/9] max-h-[420px] rounded-lg bg-muted/20 border border-border/40 flex flex-col items-center justify-center text-muted-foreground gap-2">
            <Package className="size-12 stroke-[1.5]" />
            <span className="text-sm">Nenhuma foto cadastrada para este anúncio</span>
          </div>
        ) : images.length === 1 ? (
          <div className="w-full aspect-[16/9] max-h-[480px] rounded-lg overflow-hidden bg-muted/20 border border-border/40 relative group">
            <img
    src={images[0]}
    alt={classified.title}
    tabIndex={0}
    role="button"
    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFullscreenImage(images[0]); } }}
    className="size-full object-cover cursor-pointer group-hover:scale-[1.01] transition-transform duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    onClick={() => setFullscreenImage(images[0])}
  />
  <button
    type="button"
    onClick={() => setFullscreenImage(images[0])}
    className="absolute bottom-4 right-4 px-4 py-2 rounded-lg bg-background/90 hover:bg-background text-foreground text-xs font-semibold border border-border/60 flex items-center gap-2 transition-colors duration-200 shadow-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
  >
              <Maximize2 className="size-4" />
              <span>Ver em tela cheia</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-3 aspect-[16/9] max-h-[500px] rounded-lg overflow-hidden border border-border/40 bg-muted/20 relative group">
            {/* Foto Principal Hero (8 colunas) */}
            <div className="col-span-8 relative overflow-hidden bg-muted/30 h-full">
              <img
    src={images[0]}
    alt={classified.title}
    tabIndex={0}
    role="button"
    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFullscreenImage(images[0]); } }}
    className="size-full object-cover cursor-pointer hover:scale-[1.01] transition-transform duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    onClick={() => setFullscreenImage(images[0])}
  />
            </div>
            {/* Fotos Secundárias (4 colunas) */}
            <div className="col-span-4 grid grid-rows-2 gap-3 h-full">
              <div className="relative overflow-hidden bg-muted/30 h-full">
                <img
    src={images[1] || images[0]}
    alt=""
    tabIndex={0}
    role="button"
    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFullscreenImage(images[1] || images[0]); } }}
    className="size-full object-cover cursor-pointer hover:scale-[1.01] transition-transform duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    onClick={() => setFullscreenImage(images[1] || images[0])}
  />
              </div>
              <div className="relative overflow-hidden bg-muted/30 h-full">
                <img
    src={images[2] || images[0]}
    alt=""
    tabIndex={0}
    role="button"
    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFullscreenImage(images[2] || images[0]); } }}
    className="size-full object-cover cursor-pointer hover:scale-[1.01] transition-transform duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    onClick={() => setFullscreenImage(images[2] || images[0])}
  />
  <button
    type="button"
    onClick={() => setFullscreenImage(images[0])}
    className="absolute bottom-4 right-4 px-4 py-2 rounded-lg bg-background/95 border border-border/50 text-foreground text-xs font-semibold flex items-center gap-2 shadow-md hover:bg-background cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
  >
                  <Maximize2 className="size-3.5" />
                  <span>Ver todas ({images.length})</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── SPLIT-SCREEN GRID (Desktop 2-Column: 7 cols esquerda + 5 cols direita) ── */}
      <div className="w-full max-w-7xl mx-auto px-6 grid grid-cols-12 gap-8 items-start">
        {/* ══ COLUNA ESQUERDA: Detalhes, Especificações, Vendedor, Mapa (7 Colunas) ══ */}
        <div className="col-span-7 space-y-6">
          {/* Cabeçalho do Anúncio */}
          <div className="space-y-2 pb-4 border-b border-border/50">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="text-xs font-bold text-primary border-primary/30 bg-primary/10">
                {niche.shortLabel || niche.title}
              </Badge>
              <Badge variant="secondary" data-template-badge={templateStyle} className="text-xs font-semibold">
                {templateStyle === "automotivo"
                  ? "Showroom Automotivo"
                  : templateStyle === "imobiliario"
                  ? "Ficha Patrimonial"
                  : templateStyle === "resort_hotel"
                  ? "Estadia & Hospitalidade"
                  : templateStyle === "servicos_agenda"
                  ? "Agenda & Serviços"
                  : templateStyle === "editorial"
                  ? "Dossiê Editorial"
                  : "Vitrine Padrão"}
              </Badge>
              {classified.condition && !["hospitality_stay", "real_estate_sale", "real_estate_rent", "service", "job", "event", "travel", "digital", "subscription", "business"].includes(niche.id) && (
                <Badge variant="secondary" className="text-xs font-medium">
                  {classified.condition === "new" ? "Novo na Caixa" : classified.condition === "refurbished" ? "Revisado" : "Usado"}
                </Badge>
              )}
              {attrs.delivery_available && niche.showDeliveryBadges && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-md">
                  <Truck className="size-3.5" /> Envio Disponível
                </span>
              )}
            </div>

            <h1 className="text-2xl lg:text-3xl font-extrabold text-foreground tracking-tight leading-tight">
              {classified.title}
            </h1>

            <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
              <div className="flex items-center gap-2">
                <MapPin className="size-3.5 text-muted-foreground/80" />
                <span>{locationText}</span>
              </div>
              {classified.created_at && (
                <div className="flex items-center gap-2">
                  <Clock className="size-3.5 text-muted-foreground/80" />
                  <span>Publicado {formatRelativeTime(classified.created_at)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Navegação por Abas em Linha Única */}
          <div className="tab-list flex flex-nowrap overflow-x-auto no-scrollbar gap-1 border-b border-border/40 pb-px whitespace-nowrap">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={activeTab === t.id}
                onClick={() => setActiveTab(t.id)}
                className={cn(
                  "h-11 min-h-11 px-4 text-xs font-semibold rounded-t-lg transition-colors border-b-2 flex items-center justify-center shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  activeTab === t.id
                    ? "border-primary text-primary font-bold bg-primary/5"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Destaque Visual por Modelo Canônico */}
          {(displayMode === "continuous_list" || activeTab === "overview") && (
            <>
              {/* Strip Canônico do Template Selecionado (Desktop Native) */}
              {templateStyle === "automotivo" && (
                <div data-template-strip="automotivo" className="rounded-lg border border-border/70 bg-muted/20 p-5 space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <Car className="size-4 text-primary" />
                      <span className="text-xs font-bold uppercase tracking-wider text-foreground">Showroom Automotivo & Telemetria</span>
                    </div>
                    <Badge variant="outline" className="text-xs font-semibold border-primary/30 text-primary">Vistoria & Procedência</Badge>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                    <div className="rounded-lg bg-card border border-border/50 p-3">
                      <span className="text-xs text-muted-foreground block">Ano / Modelo</span>
                      <span className="text-sm font-bold text-foreground break-words">{attrs.year || attrs.year_model || "Consulte"}</span>
                    </div>
                    <div className="rounded-lg bg-card border border-border/50 p-3">
                      <span className="text-xs text-muted-foreground block">Quilometragem</span>
                      <span className="text-sm font-bold text-foreground break-words">{attrs.mileage || attrs.mileage_km ? `${attrs.mileage || attrs.mileage_km} km` : "Consulte"}</span>
                    </div>
                    <div className="rounded-lg bg-card border border-border/50 p-3">
                      <span className="text-xs text-muted-foreground block">Câmbio</span>
                      <span className="text-sm font-bold text-foreground break-words">{attrs.transmission || "Original"}</span>
                    </div>
                    <div className="rounded-lg bg-card border border-border/50 p-3">
                      <span className="text-xs text-muted-foreground block">Combustível</span>
                      <span className="text-sm font-bold text-foreground break-words">{attrs.fuel || "Flex"}</span>
                    </div>
                  </div>
                </div>
              )}

              {templateStyle === "resort_hotel" && (
                <div data-template-strip="resort_hotel" className="rounded-lg border border-border/70 bg-muted/20 p-5 flex items-center justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Hotel className="size-4 text-primary" />
                      <span className="text-xs font-bold text-foreground block">Estadia, Check-in & Hospitalidade</span>
                    </div>
                    <p className="text-xs text-muted-foreground break-words">
                      Check-in: {attrs.checkin_time || "14:00"} • Check-out: {attrs.checkout_time || "12:00"} {attrs.max_guests ? `• Até ${attrs.max_guests} hóspedes` : ""}
                    </p>
                  </div>
                  {onOpenBookingModal && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onOpenBookingModal()}
                      className="h-11 min-h-11 px-4 text-xs font-bold rounded-lg border-primary/40 text-primary hover:bg-primary/10 shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      Consultar Datas
                    </Button>
                  )}
                </div>
              )}

              {templateStyle === "servicos_agenda" && (
                <div data-template-strip="servicos_agenda" className="rounded-lg border border-border/70 bg-muted/20 p-5 flex items-center justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Briefcase className="size-4 text-primary" />
                      <span className="text-xs font-bold text-foreground block">Agenda Profissional & Escopo de Atendimento</span>
                    </div>
                    <p className="text-xs text-muted-foreground break-words">
                      Modalidade: {attrs.modality === "online" ? "Remoto / Online" : attrs.modality === "domicilio" ? "Em Domicílio" : "Presencial"} {attrs.availability ? `• ${attrs.availability}` : ""}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleStartNativeChat("Olá, gostaria de consultar disponibilidade na agenda.")}
                    className="h-11 min-h-11 px-4 text-xs font-bold rounded-lg border-primary/40 text-primary hover:bg-primary/10 shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    Agendar Horário
                  </Button>
                </div>
              )}

              {templateStyle === "editorial" && (
                <div data-template-strip="editorial" className="rounded-lg border border-primary/25 bg-primary/5 p-5 space-y-2">
                  <div className="flex items-center gap-2">
                    <Compass className="size-4 text-primary" />
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">Dossiê Curatorial Editorial</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed break-words">
                    Apresentação expandida com narrativa completa, especificações verificadas e atendimento direto com o anunciante.
                  </p>
                </div>
              )}

              {/* Ações Comerciais Específicas: Propostas, Troca e Visitas */}
              {templateStyle === "automotivo" && (attrs.accepts_trade || attrs.accepts_financing || attrs.negotiable) && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-5 flex items-center justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <span className="text-xs font-bold text-foreground block">Condições Especiais de Negociação</span>
                    <p className="text-xs text-muted-foreground">
                      {attrs.accepts_trade ? "Aceita veículo na troca como parte do pagamento." : "Simulação de financiamento e propostas comerciais disponíveis."}
                    </p>
                  </div>
                  {onOpenProposalModal && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={onOpenProposalModal}
                      className="h-11 min-h-11 px-4 text-xs font-bold rounded-lg border-primary/40 text-primary hover:bg-primary/10 shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      Enviar Proposta / Troca
                    </Button>
                  )}
                </div>
              )}

              {templateStyle === "imobiliario" && (
                <div className="rounded-lg border border-border/60 bg-muted/20 p-5 flex items-center justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <span className="text-xs font-bold text-foreground block">Agendamento de Visita Presencial</span>
                    <p className="text-xs text-muted-foreground">Conheça o imóvel presencialmente ou solicite um tour com o anunciante.</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleStartNativeChat("Olá, gostaria de agendar uma visita para este imóvel.")}
                    className="h-11 min-h-11 px-4 text-xs font-bold rounded-lg border-primary/40 text-primary hover:bg-primary/10 shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    Agendar Visita
                  </Button>
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

              {isTravelOrHospitality && (
                <div className="space-y-4">
                  {/* ── CARD 1: Destino & Localização ── */}
                  <div className="rounded-lg border border-border/60 bg-card p-5 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                      <MapPin className="size-4 text-primary shrink-0" />
                      <span className="uppercase tracking-wider">Destino & Localização</span>
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-foreground">
                        {travelDetails.destinationTitle}
                      </h3>
                      <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                        {travelDetails.destinationDescription}
                      </p>
                    </div>
                    {/* Mapa Integrado */}
                    {classified.location_lat && classified.location_lng && !classified.hide_location && !attrs.hide_location ? (
                      <div className="rounded-lg border border-border/50 overflow-hidden h-52 bg-muted/20">
                        <MapLibreCanvas
                          initialCenter={[classified.location_lng, classified.location_lat]}
                          initialZoom={14}
                          className="size-full"
                        />
                      </div>
                    ) : (
                      <div className="rounded-lg border border-border/40 bg-muted/20 p-4 flex items-center gap-3">
                        <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <MapPin className="size-5" />
                        </div>
                        <div className="min-w-0 text-xs">
                          <span className="font-bold text-foreground block break-words text-wrap">{locationText}</span>
                          <span className="text-muted-foreground">Localização turística confirmada da viagem</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ── CARD 2: Hospedagem & Hotel ── */}
                  <div className="rounded-lg border border-border/60 bg-card p-5 space-y-4">
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
                      <h4 className="text-base font-bold text-foreground">{travelDetails.hotelName}</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                        {travelDetails.hotelSummary}
                      </p>
                    </div>

                    {/* Carrossel / Galeria Limpa de Fotos da Hospedagem */}
                    {travelDetails.hotelPhotos.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-xs text-muted-foreground block font-medium">Fotos da Acomodação</span>
                        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1 snap-x">
                          {travelDetails.hotelPhotos.map((photo, pIdx) => (
                            <button
                              key={pIdx}
                              type="button"
                              onClick={() => setFullscreenImage(photo)}
                              className="w-48 aspect-video shrink-0 snap-start rounded-lg overflow-hidden bg-muted/30 border border-border/40 relative cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
                          Comodidades Principais da Hospedagem
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

                    {/* Endereço & Horários de Check-in */}
                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/40 text-xs">
                      <div>
                        <span className="text-muted-foreground block">Horário de Check-in</span>
                        <span className="font-bold text-foreground font-mono">{travelDetails.hotelCheckin}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Horário de Check-out</span>
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
                  <div className="rounded-lg border border-border/60 bg-card p-5 space-y-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                      <Package className="size-4 text-primary shrink-0" />
                      <span className="uppercase tracking-wider">O Que Inclui o Pacote</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Item 1: Alimentação */}
                      <div className="p-3 rounded-lg bg-muted/20 border border-border/40 flex items-start gap-3">
                        <div className="size-9 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-1">
                          <Utensils className="size-4" />
                        </div>
                        <div className="min-w-0 text-xs leading-snug space-y-1">
                          <span className="font-bold text-foreground block">Alimentação & Refeições</span>
                          <span className="text-muted-foreground">{travelDetails.packageMealPlan}</span>
                        </div>
                      </div>

                      {/* Item 2: Traslados */}
                      <div className="p-3 rounded-lg bg-muted/20 border border-border/40 flex items-start gap-3">
                        <div className="size-9 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-1">
                          <Truck className="size-4" />
                        </div>
                        <div className="min-w-0 text-xs leading-snug space-y-1">
                          <span className="font-bold text-foreground block">Traslados & Transporte</span>
                          <span className="text-muted-foreground">{travelDetails.packageTransfer}</span>
                        </div>
                      </div>

                      {/* Item 3: Passeios */}
                      <div className="p-3 rounded-lg bg-muted/20 border border-border/40 flex items-start gap-3">
                        <div className="size-9 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-1">
                          <Compass className="size-4" />
                        </div>
                        <div className="min-w-0 text-xs leading-snug space-y-1">
                          <span className="font-bold text-foreground block">Passeios & Experiências</span>
                          <span className="text-muted-foreground">{travelDetails.packageTours}</span>
                        </div>
                      </div>

                      {/* Item 4: Suporte e Seguro */}
                      <div className="p-3 rounded-lg bg-muted/20 border border-border/40 flex items-start gap-3">
                        <div className="size-9 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-1">
                          <ShieldCheck className="size-4" />
                        </div>
                        <div className="min-w-0 text-xs leading-snug space-y-1">
                          <span className="font-bold text-foreground block">Seguro & Assistência</span>
                          <span className="text-muted-foreground">Assistência especializada e seguro viagem durante todo o roteiro.</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {templateStyle === "servicos_agenda" && (
                <div className="space-y-4">
                  <div className="rounded-lg border border-border/60 bg-muted/20 p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <span className="text-xs uppercase font-semibold text-muted-foreground block">Duração</span>
                      <span className="text-sm font-bold text-foreground">{attrs.service_duration_minutes ? `${attrs.service_duration_minutes} min` : "Sob demanda"}</span>
                    </div>
                    <div>
                      <span className="text-xs uppercase font-semibold text-muted-foreground block">Modalidade</span>
                      <span className="text-sm font-bold text-foreground">{attrs.modality === "remote" ? "Online / Remoto" : "Presencial"}</span>
                    </div>
                    <div>
                      <span className="text-xs uppercase font-semibold text-muted-foreground block">Agendamento</span>
                      <span className="text-sm font-bold text-foreground">{attrs.booking_enabled ? "Ativo" : "Sob Consulta"}</span>
                    </div>
                    <div>
                      <span className="text-xs uppercase font-semibold text-muted-foreground block">Região</span>
                      <span className="text-sm font-bold text-foreground">{attrs.service_area || "Atendimento Local"}</span>
                    </div>
                  </div>

                  {/* Informações Profissionais */}
                  {(attrs.professional_council || attrs.specialty) && (
                    <div className="rounded-lg border border-border/50 bg-card p-4 space-y-1">
                      <span className="text-xs uppercase font-bold text-muted-foreground tracking-wider block">
                        Credenciamento Profissional
                      </span>
                      <p className="text-xs text-foreground font-medium">
                        {attrs.specialty ? `${attrs.specialty}` : ""}
                        {attrs.specialty && attrs.professional_council ? " · " : ""}
                        {attrs.professional_council ? `Registro: ${attrs.professional_council}` : ""}
                      </p>
                    </div>
                  )}

                  {/* Agendamento de Horário */}
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-foreground block">Agendamento Online</span>
                      <p className="text-xs text-muted-foreground">Consulte a grade de atendimento e reserve seu horário com o profissional.</p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleStartNativeChat("Olá, gostaria de consultar a disponibilidade de horários para este atendimento.")}
                      className="h-11 min-h-11 px-4 text-xs font-bold rounded-lg bg-primary text-primary-foreground shadow-xs shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      Consultar Agenda
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Descrição Detalhada */}
          {(displayMode === "continuous_list" || activeTab === "overview") && classified.content && (
            <div className="space-y-3 pt-2">
              <h2 className="text-sm font-bold text-foreground">Descrição do Anúncio</h2>
              <div className="rounded-lg border border-border/50 bg-card p-5 text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
                {classified.content}
              </div>
            </div>
          )}


          {/* Pagamentos & Financiamento */}
          {(displayMode === "continuous_list" || activeTab === "overview") && isPaymentAllowed && (acceptsPix || acceptsCard || acceptsBoleto || acceptsCarne || paymentMethodsList.length > 0) && (
            <div className="rounded-lg border border-border/60 bg-card p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-border/40 pb-3">
                <div className="flex items-center gap-2">
                  <CreditCard className="size-4 text-primary" />
                  <h2 className="text-sm font-bold text-foreground">Pagamento & Financiamento</h2>
                </div>
              </div>

              {/* Formas aceitas */}
              <div className="space-y-3">
                <span className="text-xs font-semibold text-foreground block">Meios de Pagamento Aceitos</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {acceptsPix && (
                    <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 space-y-1">
                      <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                        <QrCode className="size-3.5" />
                        <span>PIX</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {pixDiscountPercent > 0 ? `${pixDiscountPercent}% de desconto imediato` : "Aprovação instantânea"}
                      </p>
                    </div>
                  )}

                  {acceptsCard && (
                    <div className="p-3 rounded-lg border border-blue-500/30 bg-blue-500/5 space-y-1">
                      <div className="flex items-center gap-2 text-xs font-bold text-blue-700 dark:text-blue-400">
                        <CreditCard className="size-3.5" />
                        <span>Cartão de Crédito</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Até {maxInstallments}x {cardInterestFree ? "sem juros" : "no cartão"}
                      </p>
                    </div>
                  )}

                  {acceptsBoleto && (
                    <div className="p-3 rounded-lg border border-border/60 bg-muted/20 space-y-1">
                      <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                        <Receipt className="size-3.5 text-muted-foreground" />
                        <span>Boleto Bancário</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {attrs.boleto_due_days ? `Vencimento em ${attrs.boleto_due_days} dias` : "À vista sob consulta"}
                      </p>
                    </div>
                  )}

                  {acceptsCarne && (
                    <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/5 space-y-1">
                      <div className="flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-400">
                        <FileSpreadsheet className="size-3.5" />
                        <span>Carnê Digital</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Até {attrs.max_carne_installments || 12}x facilitado
                      </p>
                    </div>
                  )}

                  {acceptsFinancing && (
                    <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 space-y-1">
                      <div className="flex items-center gap-2 text-xs font-bold text-primary">
                        <Landmark className="size-3.5" />
                        <span>Financiamento</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {attrs.financing_notes || "Bancos parceiros / cartas contempladas"}
                      </p>
                    </div>
                  )}

                  {acceptsTrade && (
                    <div className="p-3 rounded-lg border border-border/60 bg-muted/20 space-y-1">
                      <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                        <RefreshCw className="size-3.5 text-muted-foreground" />
                        <span>Aceita Troca / Permuta</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {attrs.trade_notes || "Propostas sujeitas a avaliação"}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Simulador Interativo de Parcelamento */}
              {priceCents > 0 && acceptsCard && (
                <div className="pt-3 border-t border-border/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">Simulador de Parcelas no Cartão</span>
                    <span className="text-xs font-mono font-bold text-primary">{simulatedInstallments}x de {formatMoney(Math.round(priceCents / simulatedInstallments))}</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={Math.min(24, Math.max(1, maxInstallments))}
                    step={1}
                    value={simulatedInstallments}
                    onChange={(e) => setSimulatedInstallments(Number(e.target.value))}
                    className="w-full h-2 rounded-full accent-primary cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground font-mono">
                    <span>1x (à vista)</span>
                    <span>{Math.min(24, Math.max(1, maxInstallments))}x</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Aba: Fotos & Mídia Desktop */}
          {activeTab === "media" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <h2 className="text-sm font-bold text-foreground">Fotos e Mídia do Anúncio ({images.length})</h2>
              {images.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {images.map((imgUrl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setFullscreenImage(imgUrl)}
                      className="aspect-square rounded-lg overflow-hidden border border-border/50 bg-muted/20 relative group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      aria-label={`Ver imagem ${idx + 1} em tela cheia`}
                    >
                      {isVideoUrl(imgUrl) ? (
                        <video src={imgUrl} className="size-full object-cover" />
                      ) : (
                        <img
                          src={imgUrl}
                          alt={`${classified.title} - ${idx + 1}`}
                          className="size-full object-cover group-hover:scale-105 transition-transform"
                        />
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-8 rounded-lg border border-border/50 bg-muted/20 text-center text-xs text-muted-foreground">
                  Nenhuma foto adicional cadastrada.
                </div>
              )}
            </div>
          )}

          {/* Card do Anunciante Desktop */}
          {(displayMode === "continuous_list" || activeTab === "seller") && (
            <div className="space-y-6">
              <div className="rounded-lg border border-border/60 bg-card p-5 space-y-4">
                <h2 className="text-sm font-bold text-foreground">Sobre o Anunciante</h2>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="size-14 rounded-lg bg-muted flex items-center justify-center font-bold text-muted-foreground text-lg overflow-hidden border border-border/50 shrink-0">
                      {author?.avatar_url ? (
                        <img src={author.avatar_url} alt="" className="size-full object-cover" />
                      ) : (
                        <span>{(author?.full_name || classified.store_name || "A").charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="space-y-1">
                      <span className="text-base font-bold text-foreground block">
                        {classified.store_name || author?.full_name || "Anunciante Comunitário"}
                      </span>
                      <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
                        <ShieldCheck className="size-4 shrink-0" />
                        <span>Perfil Verificado na Comunidade</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleStartNativeChat}
                      disabled={isStartingChat}
                      className="h-11 min-h-11 px-4 rounded-lg border-primary/30 text-primary bg-primary/10 hover:bg-primary/20 text-xs font-bold flex items-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <MessageCircle className="size-4 text-primary" />
                      <span>{isStartingChat ? "Abrindo..." : "Conversar no App"}</span>
                    </Button>

                    {cleanPhone && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleWhatsApp}
                        className="h-11 min-h-11 px-4 rounded-lg border-emerald-500/40 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 text-xs font-bold flex items-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <Phone className="size-4 text-emerald-500" />
                        <span>WhatsApp</span>
                      </Button>
                    )}
                  </div>
                </div>

                {/* Métricas de Atendimento e Avaliação */}
                <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-muted/30 border border-border/40 text-xs">
                  <div className="flex items-center gap-2">
                    <Clock className="size-4 text-primary shrink-0" />
                    <div>
                      <span className="text-muted-foreground block font-medium">Tempo médio de resposta</span>
                      <span className="font-semibold text-foreground">~15 minutos</span>
                    </div>
                  </div>
                  {classified.rating && Number(classified.rating) > 0 ? (
                    <div className="flex items-center gap-2">
                      <Star className="size-4 text-amber-500 fill-amber-500 shrink-0" />
                      <div>
                        <span className="text-muted-foreground block font-medium">Avaliação da Empresa</span>
                        <span className="font-semibold text-foreground">
                          {Number(classified.rating).toFixed(1)} ★ {classified.review_count ? `(${classified.review_count} avaliações)` : ""}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <div>
                        <span className="text-muted-foreground block font-medium">Procedência</span>
                        <span className="font-semibold text-foreground">Anunciante Verificado na Comunidade</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Grade de Anúncios Similares / Relacionados */}
              {similarAds && similarAds.length > 0 && (
                <div className="rounded-lg border border-border/60 bg-card p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-foreground">Anúncios Similares / Relacionados</h3>
                      <p className="text-xs text-muted-foreground">Outras ofertas ativas deste anunciante e categoria</p>
                    </div>
                    <span className="text-xs text-muted-foreground font-mono">
                      {similarAds.length} {similarAds.length === 1 ? "item" : "itens"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {similarAds.map((sim: any) => {
                      const simImg = sim.images?.[0] || sim.media?.[0] || null;
                      return (
                        <Link
                          key={sim.id}
                          to="/classificados/$id"
                          params={{ id: sim.id }}
                          className="rounded-lg border border-border/50 bg-muted/10 overflow-hidden hover:border-primary/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary group block"
                        >
                          <div className="aspect-4/3 w-full bg-muted/30 relative overflow-hidden">
                            {simImg ? (
                              <img src={simImg} alt={sim.title} className="size-full object-cover group-hover:scale-105 transition-transform" />
                            ) : (
                              <div className="size-full flex items-center justify-center text-muted-foreground/40">
                                <Package className="size-6" />
                              </div>
                            )}
                          </div>
                          <div className="p-3 space-y-1">
                            <p className="text-xs font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                              {sim.title}
                            </p>
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
            </div>
          )}

          {/* Localização e Mapa Desktop */}
          {(displayMode === "continuous_list" || activeTab === "overview") && !classified.hide_location && !attrs.hide_location && classified.location_lat && classified.location_lng && (
            <div className="space-y-3 pt-2">
              <h2 className="text-sm font-bold text-foreground">Localização no Mapa</h2>
              <div className="rounded-lg border border-border/50 overflow-hidden h-64 bg-muted/20">
                <MapLibreCanvas
                  initialCenter={[classified.location_lng, classified.location_lat]}
                  initialZoom={14}
                  className="size-full"
                />
              </div>
            </div>
          )}
        </div>

        {/* ══ COLUNA DIREITA: Card Sticky de Preço & Conversão (5 Colunas) ══ */}
        <div className="col-span-5">
          <div className="sticky top-20 rounded-lg border border-border/60 bg-card p-6 shadow-sm space-y-6">
            {/* Bloco de Preço */}
            <div className="space-y-2 pb-4 border-b border-border/50">
              {isDonation ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-3xl font-extrabold text-emerald-600 font-mono">
                      Gratuito (R$ 0)
                    </span>
                    <Badge variant="outline" className="text-xs font-bold text-emerald-600 border-none bg-emerald-500/10">
                      Doação
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Item disponibilizado sem custos para a comunidade local.
                  </p>
                </div>
              ) : isInvestmentOpportunity ? (
                <div className="space-y-1">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                    Aporte Solicitado
                  </span>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-3xl font-extrabold text-foreground font-mono">
                      {targetInvestment > 0 ? formatMoney(targetInvestment) : (priceCents > 0 ? formatMoney(priceCents) : "A combinar")}
                    </span>
                    {offeredEquity && (
                      <Badge variant="outline" className="text-xs font-semibold text-primary bg-primary/10">
                        {offeredEquity}
                      </Badge>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold text-foreground font-mono">
                        {priceCents > 0 ? formatMoney(priceCents) : "Sob Consulta"}
                      </span>
                      {niche.priceSuffix && (
                        <span className="text-sm font-normal text-muted-foreground">
                          {niche.priceSuffix}
                        </span>
                      )}
                    </div>
                    {classified?.negotiable !== false && priceCents > 0 && (
                      <Badge variant="outline" className="text-xs font-medium text-muted-foreground border-none bg-muted/40">
                        Aceita Proposta
                      </Badge>
                    )}
                  </div>

                  {priceCents > 0 && maxInstallments > 1 && acceptsCard && (
                    <p className="text-xs text-muted-foreground font-mono">
                      ou até {maxInstallments}x de {formatMoney(installmentCents)} {cardInterestFree ? "sem juros" : ""}
                    </p>
                  )}
                </div>
              )}

              {/* Formas de Pagamento Rápidas */}
              {isPaymentAllowed && displayMode === "tabs" && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {acceptsPix && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-md text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                      <QrCode className="size-3.5 text-emerald-600" />
                      PIX {pixDiscountPercent > 0 ? `(${pixDiscountPercent}% off)` : "à vista"}
                    </span>
                  )}
                  {acceptsCard && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-md text-xs font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-300">
                      <CreditCard className="size-3.5 text-blue-600" />
                      Cartão até {maxInstallments}x
                    </span>
                  )}
                  {acceptsBoleto && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-md text-xs font-semibold bg-muted text-foreground">
                      <Receipt className="size-3.5 text-muted-foreground" />
                      Boleto
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* CTAs de Conversão Direta */}
            <div className="space-y-3">
              {(classified.lead_form || classified.form_id || attrs?.inquiry_config?.enabled) && (
                <Button
                  type="button"
                  onClick={() => setIsLeadFormModalOpen(true)}
                  className="h-12 w-full rounded-lg text-sm font-bold bg-primary text-primary-foreground shadow-sm hover:opacity-95 active:scale-[0.99] transition-transform duration-200 cursor-pointer flex items-center justify-center gap-2"
                >
                  <FileText className="size-4" />
                  <span>{attrs?.inquiry_config?.title || "Tenho Interesse neste Anúncio"}</span>
                </Button>
              )}

              <Button
                type="button"
                onClick={primaryCta.action}
                disabled={isBooking || isBuyingDirect || isDownloadingDigital}
                className={cn(
                  "h-12 w-full rounded-lg text-sm font-bold shadow-sm hover:opacity-95 active:scale-[0.99] transition-transform duration-200 cursor-pointer",
                  classified.lead_form || classified.form_id
                    ? "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    : "bg-primary text-primary-foreground"
                )}
              >
                {primaryCta.label}
              </Button>

              {!isConversational && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleStartNativeChat}
                  disabled={isStartingChat}
                  className="h-11 w-full rounded-lg text-xs font-bold border-primary/30 text-primary bg-primary/5 hover:bg-primary/15 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <MessageCircle className="size-4 text-primary" />
                  <span>{isStartingChat ? "Iniciando Chat..." : "Conversar no App"}</span>
                </Button>
              )}

              {onOpenProposalModal && !isDonation && niche.id !== "job" && classified.category !== "job" && niche.id !== "event" && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onOpenProposalModal}
                  className="h-11 w-full rounded-lg text-xs font-semibold border-border/70 text-foreground hover:bg-muted/40 cursor-pointer"
                >
                  Enviar Proposta
                </Button>
              )}

              {cleanPhone && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleWhatsApp}
                  className="h-11 w-full rounded-lg text-xs font-bold border-emerald-500/40 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Phone className="size-4 text-emerald-600" />
                  <span>WhatsApp</span>
                </Button>
              )}
            </div>

            {/* Garantias e Segurança Waesy */}
            <div className="space-y-2 pt-2 border-t border-border/50 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-primary shrink-0" />
                <span>Negociação Segura</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                <span>Identidade Validada</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── LIGHTBOX MODAL ── */}
      {fullscreenImage && (
        <div
    className="fixed inset-0 z-50 bg-foreground/95 flex items-center justify-center p-4 select-none animate-in fade-in duration-200 focus-visible:outline-none"
    onClick={() => setFullscreenImage(null)}
  >
          <button
            type="button"
            onClick={() => setFullscreenImage(null)}
            className="absolute top-4 right-4 z-10 size-10 rounded-lg bg-muted/80 hover:bg-muted text-foreground flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Fechar tela cheia"
          >
            <X className="size-6" />
          </button>
          {isVideoUrl(fullscreenImage) ? (
            <video
    src={fullscreenImage}
    controls
    playsInline
    autoPlay
    className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg focus-visible:outline-none"
    onClick={(e) => e.stopPropagation()}
  />
          ) : (
            <img
    src={fullscreenImage}
    alt="Tela cheia"
    className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg focus-visible:outline-none"
    onClick={(e) => e.stopPropagation()}
  />
          )}
        </div>
      )}

      {/* ── Modal Universal de Captura de Leads (Lojas Oficiais e Anúncios Civis) ── */}
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
