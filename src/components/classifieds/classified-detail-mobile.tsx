import React, { useState, useMemo } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Share2, MapPin, Check, ShieldCheck, Tag, Clock, User, ChevronLeft, ChevronRight, Maximize2, X, Phone, MessageCircle, Package, Truck, CreditCard, QrCode, Receipt, FileSpreadsheet, CheckCircle2, Edit3, Smartphone, ExternalLink, ShieldAlert, Coins, TrendingUp, Banknote, FileCheck, Download, AlertCircle, Eye, Building, Car, Hotel, Briefcase, HelpCircle, FileText, Landmark, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/money";
import { trackAndOpenWhatsApp } from "@/lib/whatsapp";
import { FavoriteButton } from "@/components/common/favorite-button";
import { NativeBackButton } from "@/components/navigation";
import { MapLibreCanvas } from "@/components/mobility/maplibre-canvas";
import { resolveClassifiedNiche, getClassifiedPrimaryCtaLabel, isClassifiedConversational, getClassifiedPaymentMethods, isNichePaymentApplicable } from "@/lib/classifieds/semantics";
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
}: UniversalClassifiedShowcaseProps) {
  const navigate = useNavigate();
  const [activeImage, setActiveImage] = useState(0);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "specs" | "payments" | "seller" | "map">("overview");
  const [simulatedInstallments, setSimulatedInstallments] = useState<number>(12);
  const [isLeadFormModalOpen, setIsLeadFormModalOpen] = useState(false);
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

  const priceCents = Number(classified.price_cents || 0);
  const maxInstallments = Math.max(1, Number(attrs.max_installments) || 1);
  const installmentCents = Math.round(priceCents / maxInstallments);

  const isDonation = classified.category === "donation" || attrs.is_free_donation === true;
  const isInvestmentOpportunity = attrs.is_business_sale === true || attrs.deal_type === "investment_round";
  const targetInvestment = attrs.target_investment_cents || 0;
  const offeredEquity = attrs.offered_equity_percent ? `${attrs.offered_equity_percent}%` : null;

  // Condições comerciais
  const isPaymentAllowed = isNichePaymentApplicable(classified);
  const acceptsPix = isPaymentAllowed && (attrs.accepts_pix !== false && (attrs.accepts_pix === true || paymentMethodsList.some((p) => p.id === "pix")));
  const pixDiscountPercent = Number(attrs.pix_discount_percent) || 0;
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
    if (niche.id === "hospitality_stay" || niche.id === "travel") {
      return {
        label: getClassifiedPrimaryCtaLabel(classified),
        action: () => onOpenBookingModal?.(),
      };
    }
    if (classified.digital_file_url || classified.category === "digital") {
      return {
        label: isDownloadingDigital ? "Baixando..." : "Baixar Arquivo",
        action: () => onDownloadDigital?.(),
      };
    }
    if (classified.category === "job") {
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
        label: isStartingChat ? "Iniciando..." : "Enviar Mensagem",
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

  // Tech / Feature cards canônicos resolvidos para todos os 15 nichos
  const featureList = useMemo(() => resolveClassifiedDetailedSpecs(classified), [classified]);

  return (
    <div className="w-full min-h-[100dvh] bg-background text-foreground pb-28 select-none">
      {/* ── 1. HERO DE MÍDIA NATIVO EDGE-TO-EDGE COM SNAP SCROLL (Instagram/ML Style) ── */}
      <div className="relative w-full aspect-[4/3] bg-muted/30 overflow-hidden">
        {images.length > 0 ? (
          <>
            <div
              className="flex w-full h-full overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar"
              onScroll={(e) => {
                const target = e.currentTarget;
                if (target.clientWidth > 0) {
                  const idx = Math.round(target.scrollLeft / target.clientWidth);
                  if (idx !== activeImage && idx >= 0 && idx < images.length) {
                    setActiveImage(idx);
                  }
                }
              }}
            >
              {images.map((imgUrl, idx) => (
                <div
                  key={idx}
                  className="w-full h-full shrink-0 snap-center relative"
                >
                  {isVideoUrl(imgUrl) ? (
                    <video
                      src={imgUrl}
                      controls
                      playsInline
                      className="size-full object-contain bg-black"
                    />
                  ) : (
                    <div className="relative size-full overflow-hidden flex items-center justify-center">
                      <img
                        src={imgUrl}
                        alt=""
                        aria-hidden="true"
                        className="absolute inset-0 size-full object-cover blur-2xl opacity-35 scale-110 pointer-events-none select-none"
                      />
                      <img
                        src={imgUrl}
                        alt={`${classified.title} - foto ${idx + 1}`}
                        className="relative size-full object-contain cursor-pointer select-none"
                        onClick={() => setFullscreenImage(imgUrl)}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Indicador de Dots / Paginação Silenciosa */}
            {images.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1 rounded-full bg-black/50 backdrop-blur-md z-10 pointer-events-none">
                {images.map((_, idx) => (
                  <span
                    key={idx}
                    className={`h-1.5 rounded-full transition-all duration-200 ${
                      activeImage === idx
                        ? "w-4 bg-white"
                        : "w-1.5 bg-white/40"
                    }`}
                  />
                ))}
              </div>
            )}

            {/* Contador Numérico Discreto no Canto */}
            {images.length > 1 && (
              <div className="absolute bottom-3 right-3 px-2 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-xs font-mono font-medium pointer-events-none z-10">
                {activeImage + 1}/{images.length}
              </div>
            )}
          </>
        ) : (
          <div className="size-full flex flex-col items-center justify-center text-muted-foreground gap-2">
            <Package className="size-12 stroke-[1.5]" />
            <span className="text-xs">Sem fotos cadastradas</span>
          </div>
        )}

        {/* ── BOTÃO FLUTUANTE VOLTAR (Nativo iOS/Android - Canto Superior Esquerdo) ── */}
        <NativeBackButton
          variant="floating"
          fallbackHref="/classificados"
          className="absolute top-3 left-3 z-20"
        />

        {/* ── AÇÕES FLUTUANTES (Canto Superior Direito: Compartilhar & Favoritar - 44px Apple HIG) ── */}
        <div className="absolute top-3 right-3 flex items-center gap-2 z-20">
          {onOpenCompanion && (
            <button
              type="button"
              onClick={onOpenCompanion}
              className="size-11 rounded-full bg-black/50 backdrop-blur-md text-white border border-white/20 flex items-center justify-center shadow-md active:scale-95 transition-transform cursor-pointer"
              title="Guia Digital 9:16"
              aria-label="Guia Digital"
            >
              <Smartphone className="size-5 text-primary" />
            </button>
          )}

          <button
            type="button"
            onClick={handleShare}
            className="size-11 rounded-full bg-black/50 backdrop-blur-md text-white border border-white/20 flex items-center justify-center shadow-md active:scale-95 transition-transform cursor-pointer"
            aria-label="Compartilhar anúncio"
          >
            <Share2 className="size-5" />
          </button>

          <div className="size-11 rounded-full bg-black/50 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-md">
            <FavoriteButton
              itemId={classified.id}
              itemType="classified"
              className="size-9 text-white hover:text-white"
            />
          </div>
        </div>
      </div>

      {/* ── MODO PROPRIETÁRIO DISCRETO (Se logado como autor/admin) ── */}
      {isOwner && (
        <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-amber-800 dark:text-amber-200">
            <span className="size-2 rounded-full bg-amber-500 shrink-0" />
            <span className="font-semibold">Modo Proprietário</span>
          </div>
          {onEdit && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onEdit}
              className="h-7 text-xs px-3 rounded-lg border-amber-500/40 text-amber-900 dark:text-amber-100 hover:bg-amber-500/20 font-bold"
            >
              <Edit3 className="size-3 mr-1" /> Editar
            </Button>
          )}
        </div>
      )}

      {/* ── 2. CONTEÚDO PRINCIPAL (Padrão WhatsApp / Mobile App Native List) ── */}
      <div className="px-4 pt-4 space-y-5">
        {/* Preço & Badges */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-xs font-semibold text-primary border-primary/30 bg-primary/10">
              {niche.shortLabel || niche.title}
            </Badge>
            {classified.condition && (
              <Badge variant="secondary" className="text-xs font-medium">
                {classified.condition === "new" ? "Novo" : classified.condition === "refurbished" ? "Revisado" : "Usado"}
              </Badge>
            )}
            {attrs.delivery_available && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md">
                <Truck className="size-3" /> Entrega
              </span>
            )}
          </div>

          {/* Preço em destaque mobile */}
          <div className="pt-1">
            {isDonation ? (
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-emerald-600 font-mono">Gratuito</span>
                <span className="text-xs text-muted-foreground">Doação sem custo</span>
              </div>
            ) : isInvestmentOpportunity ? (
              <div className="space-y-1">
                <span className="text-xs uppercase font-bold text-muted-foreground tracking-wider block">Aporte Solicitado</span>
                <span className="text-2xl font-extrabold text-foreground font-mono">
                  {targetInvestment > 0 ? formatMoney(targetInvestment) : (priceCents > 0 ? formatMoney(priceCents) : "A combinar")}
                </span>
                {offeredEquity && <span className="text-xs text-primary font-semibold block">{offeredEquity} de participação</span>}
              </div>
            ) : (
              <div className="space-y-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-extrabold text-foreground font-mono">
                    {priceCents > 0 ? formatMoney(priceCents) : "Consulte o anunciante"}
                  </span>
                  {niche.priceSuffix && (
                    <span className="text-xs text-muted-foreground font-normal">{niche.priceSuffix}</span>
                  )}
                </div>
                {priceCents > 0 && maxInstallments > 1 && acceptsCard && (
                  <p className="text-xs text-muted-foreground font-mono">
                    ou até {maxInstallments}x de {formatMoney(installmentCents)} {cardInterestFree ? "sem juros" : ""}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Título do Anúncio */}
          <h1 className="text-lg sm:text-xl font-bold text-foreground leading-snug pt-1">
            {classified.title}
          </h1>

          {/* Localização & Timestamp */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground pt-1">
            <MapPin className="size-3.5 shrink-0 text-muted-foreground/70" />
            <span className="truncate">{locationText}</span>
          </div>
        </div>

        {/* ── 3. CARD DO VENDEDOR / ANUNCIANTE ── */}
        <div className="rounded-lg border border-border/60 bg-card p-4 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-11 rounded-full bg-muted flex items-center justify-center font-bold text-muted-foreground text-sm overflow-hidden shrink-0 border border-border/40">
              {author?.avatar_url ? (
                <img src={author.avatar_url} alt="" className="size-full object-cover" />
              ) : (
                <span>{(author?.full_name || classified.store_name || "A").charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-foreground truncate">
                {classified.store_name || author?.full_name || "Anunciante Comunitário"}
              </span>
              <div className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="size-3 shrink-0" />
                <span>Perfil Verificado Waesy</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleStartNativeChat}
              disabled={isStartingChat}
              className="h-9 px-2.5 rounded-lg border-primary/30 text-primary bg-primary/10 text-xs font-bold shrink-0 flex items-center gap-1.5 active:scale-95"
            >
              <MessageCircle className="size-3.5 text-primary" />
              <span>{isStartingChat ? "..." : "Chat"}</span>
            </Button>

            {cleanPhone && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleWhatsApp}
                className="h-9 px-2.5 rounded-lg border-emerald-500/40 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 text-xs font-bold shrink-0 flex items-center gap-1.5 active:scale-95"
              >
                <Phone className="size-3.5 text-emerald-500" />
                <span>WhatsApp</span>
              </Button>
            )}
          </div>
        </div>

        {/* ── Banner de Formulário de Leads (Loja Oficial e Anúncio Civil) ── */}
        {(classified?.lead_form || classified?.form_id || attrs?.inquiry_config?.enabled) && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3.5 space-y-2">
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
              className="w-full h-11 rounded-lg text-xs font-bold bg-primary text-primary-foreground shadow-sm active:scale-95 cursor-pointer"
            >
              Tenho Interesse / Preencher
            </Button>
          </div>
        )}

        {/* ── Seletor de Abas Mobile (Modo Tabs) ── */}
        {displayMode === "tabs" && (
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
            {[
              { id: "overview", label: "Visão Geral" },
              { id: "specs", label: "Specs" },
              ...(isPaymentAllowed && paymentMethodsList.length > 0 ? [{ id: "payments", label: "Pagamento" }] : []),
              { id: "seller", label: "Vendedor" },
              ...(!classified.hide_location && !attrs.hide_location && classified.location_lat && classified.location_lng ? [{ id: "map", label: "Mapa" }] : []),
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id as any)}
                className={cn(
                  "px-3 py-1.5 text-xs font-semibold rounded-lg shrink-0 transition-colors cursor-pointer",
                  activeTab === t.id
                    ? "bg-primary text-primary-foreground font-bold shadow-xs"
                    : "text-muted-foreground bg-muted/40 hover:bg-muted"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        {/* ── Destaque Visual por Modelo Canônico ── */}
        {(displayMode === "continuous_list" || activeTab === "overview") && (
          <>
            {templateStyle === "automotivo" && (
              <div className="space-y-3">
                <div className="rounded-lg border border-border/60 bg-muted/20 p-3 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-xs uppercase font-semibold text-muted-foreground block">Ano/Mod</span>
                    <span className="font-bold text-foreground">{attrs.year_fab || attrs.year_model ? `${attrs.year_fab || ""}/${attrs.year_model || ""}` : "Consulte"}</span>
                  </div>
                  <div>
                    <span className="text-xs uppercase font-semibold text-muted-foreground block">KM</span>
                    <span className="font-bold text-foreground">{attrs.mileage_km != null ? `${Number(attrs.mileage_km).toLocaleString("pt-BR")} km` : "Consulte"}</span>
                  </div>
                  <div>
                    <span className="text-xs uppercase font-semibold text-muted-foreground block">Câmbio</span>
                    <span className="font-bold text-foreground">{attrs.transmission || "Manual"}</span>
                  </div>
                  <div>
                    <span className="text-xs uppercase font-semibold text-muted-foreground block">Combustível</span>
                    <span className="font-bold text-foreground">{attrs.fuel_type || "Flex"}</span>
                  </div>
                </div>

                {Array.isArray(attrs.features) && attrs.features.length > 0 && (
                  <div className="rounded-lg border border-border/50 bg-card p-3 space-y-2">
                    <span className="text-xs uppercase font-bold text-muted-foreground tracking-wider block">
                      Opcionais & Equipamentos
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {attrs.features.map((feat: string, idx: number) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-semibold bg-muted/60 text-foreground border border-border/50"
                        >
                          <Check className="size-3 text-primary shrink-0" />
                          <span>{feat}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {(attrs.accepts_trade || attrs.accepts_financing || attrs.negotiable) && onOpenProposalModal && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onOpenProposalModal}
                    className="w-full h-11 min-h-11 text-xs font-bold rounded-lg border-primary/30 text-primary bg-primary/5 hover:bg-primary/10 active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    Enviar Proposta / Veículo na Troca
                  </Button>
                )}
              </div>
            )}

            {templateStyle === "imobiliario" && (
              <div className="space-y-3">
                <div className="rounded-lg border border-border/60 bg-muted/20 p-3 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-xs uppercase font-semibold text-muted-foreground block">Área Útil</span>
                    <span className="font-bold text-foreground">{attrs.area_sqm ? `${attrs.area_sqm} m²` : "Consulte"}</span>
                  </div>
                  <div>
                    <span className="text-xs uppercase font-semibold text-muted-foreground block">Quartos</span>
                    <span className="font-bold text-foreground">{attrs.bedrooms || 0} qtos {attrs.suites ? `(${attrs.suites} suítes)` : ""}</span>
                  </div>
                  <div>
                    <span className="text-xs uppercase font-semibold text-muted-foreground block">Vagas</span>
                    <span className="font-bold text-foreground">{attrs.parking_spots || 0} vagas</span>
                  </div>
                  <div>
                    <span className="text-xs uppercase font-semibold text-muted-foreground block">Condomínio</span>
                    <span className="font-bold text-foreground">{attrs.condo_cents ? formatMoney(attrs.condo_cents) : "Isento"}</span>
                  </div>
                </div>

                {Array.isArray(attrs.amenities) && attrs.amenities.length > 0 && (
                  <div className="rounded-lg border border-border/50 bg-card p-3 space-y-2">
                    <span className="text-xs uppercase font-bold text-muted-foreground tracking-wider block">
                      Comodidades do Imóvel & Condomínio
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {attrs.amenities.map((amenity: string, idx: number) => (
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

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleStartNativeChat("Olá, gostaria de agendar uma visita para este imóvel.")}
                  className="w-full h-11 min-h-11 text-xs font-bold rounded-lg border-primary/30 text-primary bg-primary/5 hover:bg-primary/10 active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  Agendar Visita ao Imóvel
                </Button>
              </div>
            )}

            {templateStyle === "resort_hotel" && (
              <div className="space-y-3">
                <div className="rounded-lg border border-border/60 bg-muted/20 p-3 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-xs uppercase font-semibold text-muted-foreground block">Hóspedes</span>
                    <span className="font-bold text-foreground">{attrs.max_guests || attrs.guests_text || "Consulte"} máx</span>
                  </div>
                  <div>
                    <span className="text-xs uppercase font-semibold text-muted-foreground block">Refeição</span>
                    <span className="font-bold text-foreground">{attrs.meal_plan || "Café Incluso"}</span>
                  </div>
                  <div>
                    <span className="text-xs uppercase font-semibold text-muted-foreground block">Check-in</span>
                    <span className="font-bold text-foreground">{attrs.checkin_time || "14h"}</span>
                  </div>
                  <div>
                    <span className="text-xs uppercase font-semibold text-muted-foreground block">Taxa Limpeza</span>
                    <span className="font-bold text-foreground">{attrs.cleaning_fee_cents ? formatMoney(attrs.cleaning_fee_cents) : "Isenta"}</span>
                  </div>
                </div>

                {Array.isArray(attrs.amenities) && attrs.amenities.length > 0 && (
                  <div className="rounded-lg border border-border/50 bg-card p-3 space-y-2">
                    <span className="text-xs uppercase font-bold text-muted-foreground tracking-wider block">
                      Estrutura da Acomodação
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {attrs.amenities.map((amenity: string, idx: number) => (
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

                {onOpenBookingModal && (
                  <Button
                    type="button"
                    onClick={() => onOpenBookingModal()}
                    className="w-full h-11 min-h-11 text-xs font-bold rounded-lg bg-primary text-primary-foreground shadow-xs active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    Consultar Calendário & Reservar
                  </Button>
                )}

                {/* Detalhes de Hospedagens Combinadas Mobile */}
                {Array.isArray(attrs.lodgings) && attrs.lodgings.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-border/40">
                    <span className="text-xs uppercase font-bold text-muted-foreground tracking-wider block">
                      Acomodações Selecionadas ({attrs.lodgings.length})
                    </span>
                    <div className="space-y-2">
                      {attrs.lodgings.map((lodging: any, lIdx: number) => (
                        <div key={lodging.id || lIdx} className="p-3 rounded-lg border border-border/60 bg-card space-y-2">
                          <div className="flex items-center justify-between">
                            <h5 className="font-bold text-xs text-foreground truncate">{lodging.name}</h5>
                            {lodging.stars ? (
                              <span className="text-xs font-bold text-amber-600 dark:text-amber-400">{lodging.stars} estrelas</span>
                            ) : null}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{lodging.city || lodging.address || "Localização privilegiada"}</p>
                          <div className="text-xs flex justify-between pt-1 border-t border-border/30 text-muted-foreground">
                            <span>Regime: <strong className="text-foreground">{lodging.regime || "Café"}</strong></span>
                            <span>Check-in: <strong className="text-foreground font-mono">{lodging.checkin_time || "14:00"}</strong></span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {templateStyle === "servicos_agenda" && (
              <div className="space-y-3">
                <div className="rounded-lg border border-border/60 bg-muted/20 p-3 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-xs uppercase font-semibold text-muted-foreground block">Duração</span>
                    <span className="font-bold text-foreground">{attrs.service_duration_minutes ? `${attrs.service_duration_minutes} min` : "Sob demanda"}</span>
                  </div>
                  <div>
                    <span className="text-xs uppercase font-semibold text-muted-foreground block">Modalidade</span>
                    <span className="font-bold text-foreground">{attrs.modality === "remote" ? "Online" : "Presencial"}</span>
                  </div>
                  <div>
                    <span className="text-xs uppercase font-semibold text-muted-foreground block">Agenda</span>
                    <span className="font-bold text-foreground">{attrs.booking_enabled ? "Ativo" : "Sob Consulta"}</span>
                  </div>
                  <div>
                    <span className="text-xs uppercase font-semibold text-muted-foreground block">Região</span>
                    <span className="font-bold text-foreground">{attrs.service_area || "Local"}</span>
                  </div>
                </div>

                {(attrs.professional_council || attrs.specialty) && (
                  <div className="rounded-lg border border-border/50 bg-card p-3 space-y-1">
                    <span className="text-xs uppercase font-bold text-muted-foreground tracking-wider block">
                      Credenciamento
                    </span>
                    <p className="text-xs text-foreground font-medium">
                      {attrs.specialty ? `${attrs.specialty}` : ""}
                      {attrs.specialty && attrs.professional_council ? " · " : ""}
                      {attrs.professional_council ? `Registro: ${attrs.professional_council}` : ""}
                    </p>
                  </div>
                )}

                <Button
                  type="button"
                  onClick={() => handleStartNativeChat("Olá, gostaria de consultar a disponibilidade de horários para este atendimento.")}
                  className="w-full h-11 min-h-11 text-xs font-bold rounded-lg bg-primary text-primary-foreground shadow-xs active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  Consultar Agenda & Horários
                </Button>
              </div>
            )}
          </>
        )}

        {/* ── 4. CARDS DE CARACTERÍSTICAS TÉCNICAS (Bento Grid Mobile) ── */}
        {(displayMode === "continuous_list" || activeTab === "specs") && (
          <div className="space-y-3">
            <NicheSpecificationsDisplay
              items={featureList}
              title="Especificações"
            />
          </div>
        )}

        {/* ── 5. DESCRIÇÃO NATIVA COM EXPANSOR ── */}
        {(displayMode === "continuous_list" || activeTab === "overview") && classified.content && (
          <div className="space-y-2">
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Descrição
            </h2>
            <div className="rounded-lg border border-border/50 bg-card p-4 space-y-2 text-xs text-foreground/90 leading-relaxed">
              <p className={isDescExpanded ? "whitespace-pre-line" : "whitespace-pre-line line-clamp-4"}>
                {classified.content}
              </p>
              {classified.content.length > 200 && (
                <button
                  type="button"
                  onClick={() => setIsDescExpanded(!isDescExpanded)}
                  className="text-xs font-bold text-primary hover:underline cursor-pointer block pt-1"
                >
                  {isDescExpanded ? "Ver menos" : "Ler descrição completa"}
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── 5.1 FORMAS ACEITAS & SIMULADOR DE FINANCIAMENTO ── */}
        {(displayMode === "continuous_list" || activeTab === "payments") && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Pagamento & Financiamento
              </h2>
              <span className="text-xs text-muted-foreground font-mono">Condições</span>
            </div>
            <div className="rounded-lg border border-border/50 bg-card p-4 space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {paymentMethodsList.map((pm) => (
                  <span
                    key={pm.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-muted/60 text-foreground border border-border/50"
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
                    className="w-full h-2 rounded-full accent-primary cursor-pointer"
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

        {/* ── 6. LOCALIZAÇÃO E MAPA (Se não for oculto e possuir lat/lng) ── */}
        {(displayMode === "continuous_list" || activeTab === "map") && !classified.hide_location && !attrs.hide_location && classified.location_lat && classified.location_lng && (
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

        {/* ── 7. COMPROMISSO DE SEGURANÇA ── */}
        <div className="rounded-lg border border-border/40 bg-muted/20 p-3 flex items-start gap-3 text-muted-foreground">
          <ShieldCheck className="size-4 text-primary shrink-0 mt-1" />
          <div className="text-xs leading-snug space-y-1">
            <span className="font-semibold text-foreground block">Dica de Segurança</span>
            <span>Nunca faça transferências antecipadas fora da plataforma. Prefira locais públicos para entregas.</span>
          </div>
        </div>
      </div>

      {/* ── 8. STICKY BOTTOM ACTION BAR (Native-First: Nielsen Norman & Apple HIG) ── */}
      {/* Utiliza pb-[calc(0.75rem+env(safe-area-inset-bottom))] e mobile-nav-hide-on-keyboard */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-t border-border/50 px-4 py-3 pb-[calc(0.65rem+env(safe-area-inset-bottom))] flex items-center justify-between gap-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] mobile-nav-hide-on-keyboard">
        {/* Preço / Condição */}
        <div className="flex flex-col min-w-0">
          {isDonation ? (
            <div className="flex items-center gap-2">
              <span className="text-base font-extrabold text-emerald-600 font-mono">Gratuito</span>
              <Badge variant="outline" className="text-xs font-bold text-emerald-600 border-emerald-500/30 bg-emerald-500/10">
                Doação
              </Badge>
            </div>
          ) : isInvestmentOpportunity ? (
            <div className="flex flex-col">
              <span className="text-xs uppercase font-bold text-muted-foreground tracking-wider">Aporte</span>
              <span className="text-base font-extrabold text-foreground font-mono">
                {targetInvestment > 0 ? formatMoney(targetInvestment) : "A combinar"}
              </span>
            </div>
          ) : (
            <div className="flex flex-col">
              <div className="flex items-baseline gap-1">
                <span className="text-base sm:text-lg font-extrabold text-foreground font-mono">
                  {priceCents > 0 ? formatMoney(priceCents) : "Sob Consulta"}
                </span>
                {niche.priceSuffix && (
                  <span className="text-xs text-muted-foreground shrink-0">{niche.priceSuffix}</span>
                )}
              </div>
              {priceCents > 0 && maxInstallments > 1 && (
                <span className="text-xs text-muted-foreground font-mono">
                  até {maxInstallments}x de {formatMoney(installmentCents)}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Botões de Ação Direta (44px touch target) */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleStartNativeChat}
            disabled={isStartingChat}
            className="h-11 w-11 p-0 rounded-lg border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 active:scale-95 transition-transform"
            aria-label="Conversar no Chat do App"
          >
            <MessageCircle className="size-5" />
          </Button>

          {cleanPhone && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleWhatsApp}
              className="h-11 w-11 p-0 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 active:scale-95 transition-transform"
              aria-label="Chamar no WhatsApp"
            >
              <Phone className="size-5" />
            </Button>
          )}

          <Button
            type="button"
            onClick={primaryCta.action}
            disabled={isBooking || isBuyingDirect || isDownloadingDigital}
            className="h-11 px-5 rounded-lg font-bold text-xs sm:text-sm bg-primary text-primary-foreground shadow-sm hover:opacity-90 active:scale-95 transition-transform cursor-pointer"
          >
            {primaryCta.label}
          </Button>
        </div>
      </div>

      {/* ── 9. MODAL LIGHTBOX DE IMAGEM EM TELA CHEIA ── */}
      {fullscreenImage && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-2 select-none animate-in fade-in duration-150"
          onClick={() => setFullscreenImage(null)}
        >
          <button
            type="button"
            onClick={() => setFullscreenImage(null)}
            className="absolute top-4 right-4 z-10 size-11 rounded-full bg-white/20 text-white flex items-center justify-center active:scale-95 transition-transform"
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
              className="max-h-[90vh] max-w-[95vw] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <img
              src={fullscreenImage}
              alt="Tela cheia"
              className="max-h-[90vh] max-w-[95vw] object-contain rounded-lg"
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
