import React, { useState, useMemo } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Share2, MapPin, Check, ShieldCheck, Tag, Clock, User, ChevronLeft, ChevronRight, Maximize2, X, Phone, MessageCircle, Package, Truck, CreditCard, QrCode, Receipt, FileSpreadsheet, CheckCircle2, Edit3, Smartphone, ExternalLink, ShieldAlert, Coins, TrendingUp, Banknote, FileCheck, Download, AlertCircle, Eye, Building, Car, Hotel, Briefcase, HelpCircle, Lock, FileText, Landmark, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/money";
import { formatRelativeTime } from "@/lib/datetime";
import { trackAndOpenWhatsApp } from "@/lib/whatsapp";
import { FavoriteButton } from "@/components/common/favorite-button";
import { MapLibreCanvas } from "@/components/mobility/maplibre-canvas";
import { resolveClassifiedNiche, getClassifiedPrimaryCtaLabel, isClassifiedConversational, getClassifiedPaymentMethods } from "@/lib/classifieds/semantics";
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
}: UniversalClassifiedShowcaseProps) {
  const [activeImage, setActiveImage] = useState(0);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "specs" | "payments" | "seller" | "map">("overview");
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

  const handleStartNativeChat = async () => {
    setIsStartingChat(true);
    try {
      const res = await startCustomerChatThread({
        data: {
          storeId: classified.store_id || classified.storeId || undefined,
          recipientProfileId: classified.author_profile_id || undefined,
          subject: classified.title,
          initialMessage: `Olá, tenho interesse no anúncio: ${classified.title}`,
        },
      });
      if (res?.threadId) {
        toast.success("Conversa aberta com sucesso!");
        navigate({ to: `/conta/conversas/${res.threadId}` });
      } else {
        throw new Error("Falha ao abrir conversa.");
      }
    } catch (err: any) {
      if (cleanPhone) {
        handleWhatsApp();
      } else {
        toast.info("Identifique-se para enviar mensagem ao anunciante.");
        navigate({
          to: "/entrar",
          search: { returnUrl: `/classificados/${classified.id}` },
        });
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

  // Formas de pagamento
  const acceptsPix = attrs.accepts_pix !== false;
  const pixDiscountPercent = Number(attrs.pix_discount_percent) || 0;
  const acceptsCard = attrs.accepts_card !== false;
  const cardInterestFree = Boolean(attrs.card_interest_free);
  const acceptsBoleto = Boolean(attrs.accepts_boleto);

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

  return (
    <div className="w-full min-h-[100dvh] bg-background text-foreground pb-16">
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
          <span className="text-foreground truncate max-w-xs font-semibold">{classified.title}</span>
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

      {/* ── MODO PROPRIETÁRIO (Banner Desktop) ── */}
      {isOwner && (
        <div className="w-full max-w-7xl mx-auto px-6 mb-4">
          <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-100">
            <div className="flex items-center gap-2 font-medium">
              <span className="size-2 rounded-full bg-amber-500 shrink-0" />
              <span><strong>Modo Proprietário Ativo:</strong> Você está visualizando seu anúncio como os compradores o veem.</span>
            </div>
            {onEdit && (
              <button
                type="button"
                onClick={onEdit}
                className="font-bold underline hover:no-underline cursor-pointer"
              >
                Editar anúncio
              </button>
            )}
          </div>
        </div>
      )}

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
              className="size-full object-cover cursor-pointer group-hover:scale-[1.01] transition-transform duration-300"
              onClick={() => setFullscreenImage(images[0])}
            />
            <button
              type="button"
              onClick={() => setFullscreenImage(images[0])}
              className="absolute bottom-4 right-4 px-4 py-2 rounded-lg bg-background/90 hover:bg-background text-foreground text-xs font-semibold border border-border/60 flex items-center gap-2 transition-all shadow-sm"
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
                className="size-full object-cover cursor-pointer hover:scale-[1.01] transition-transform duration-300"
                onClick={() => setFullscreenImage(images[0])}
              />
            </div>
            {/* Fotos Secundárias (4 colunas) */}
            <div className="col-span-4 grid grid-rows-2 gap-3 h-full">
              <div className="relative overflow-hidden bg-muted/30 h-full">
                <img
                  src={images[1] || images[0]}
                  alt=""
                  className="size-full object-cover cursor-pointer hover:scale-[1.01] transition-transform duration-300"
                  onClick={() => setFullscreenImage(images[1] || images[0])}
                />
              </div>
              <div className="relative overflow-hidden bg-muted/30 h-full">
                <img
                  src={images[2] || images[0]}
                  alt=""
                  className="size-full object-cover cursor-pointer hover:scale-[1.01] transition-transform duration-300"
                  onClick={() => setFullscreenImage(images[2] || images[0])}
                />
                <button
                  type="button"
                  onClick={() => setFullscreenImage(images[0])}
                  className="absolute bottom-4 right-4 px-4 py-2 rounded-lg bg-background/95 border border-border/50 text-foreground text-xs font-semibold flex items-center gap-2 shadow-md hover:bg-background cursor-pointer active:scale-95"
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
              {classified.condition && (
                <Badge variant="secondary" className="text-xs font-medium">
                  {classified.condition === "new" ? "Novo na Caixa" : classified.condition === "refurbished" ? "Revisado" : "Usado"}
                </Badge>
              )}
              {attrs.delivery_available && (
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

          {/* Navegação por Abas (Modo Tabs) */}
          {displayMode === "tabs" && (
            <div className="flex items-center gap-1 border-b border-border/60 pb-2 overflow-x-auto no-scrollbar">
              {[
                { id: "overview", label: "Visão Geral" },
                { id: "specs", label: "Especificações" },
                { id: "payments", label: "Pagamento & Financiamento" },
                { id: "seller", label: "Anunciante" },
                ...(!classified.hide_location && !attrs.hide_location && classified.location_lat && classified.location_lng ? [{ id: "map", label: "Localização" }] : []),
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(t.id as any)}
                  className={cn(
                    "px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer",
                    activeTab === t.id
                      ? "bg-primary text-primary-foreground font-bold shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}

          {/* Destaque Visual por Modelo Canônico */}
          {(displayMode === "continuous_list" || activeTab === "overview") && (
            <>
              {templateStyle === "automotivo" && (
                <div className="rounded-lg border border-border/60 bg-muted/20 p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Ano / Modelo</span>
                    <span className="text-sm font-bold text-foreground">{attrs.year_fab || attrs.year_model ? `${attrs.year_fab || ""}/${attrs.year_model || ""}` : "Ano sob consulta"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Quilometragem</span>
                    <span className="text-sm font-bold text-foreground">{attrs.mileage_km != null ? `${Number(attrs.mileage_km).toLocaleString("pt-BR")} km` : "Não informada"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Câmbio</span>
                    <span className="text-sm font-bold text-foreground">{attrs.transmission || "Manual"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Combustível</span>
                    <span className="text-sm font-bold text-foreground">{attrs.fuel_type || "Flex"}</span>
                  </div>
                </div>
              )}

              {templateStyle === "imobiliario" && (
                <div className="rounded-lg border border-border/60 bg-muted/20 p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Área Útil</span>
                    <span className="text-sm font-bold text-foreground">{attrs.area_sqm ? `${attrs.area_sqm} m²` : "Consulte"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Quartos / Suítes</span>
                    <span className="text-sm font-bold text-foreground">{attrs.bedrooms || 0} qtos {attrs.suites ? `(${attrs.suites} suítes)` : ""}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Vagas</span>
                    <span className="text-sm font-bold text-foreground">{attrs.parking_spots || 0} vagas</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Condomínio</span>
                    <span className="text-sm font-bold text-foreground">{attrs.condo_cents ? formatMoney(attrs.condo_cents) : "Incluso/Isento"}</span>
                  </div>
                </div>
              )}

              {templateStyle === "resort_hotel" && (
                <div className="rounded-lg border border-border/60 bg-muted/20 p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Capacidade</span>
                    <span className="text-sm font-bold text-foreground">{attrs.max_guests || attrs.guests_text || "Consulte"} hóspedes</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Regime / Refeição</span>
                    <span className="text-sm font-bold text-foreground">{attrs.meal_plan || "Café da Manhã"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Check-in</span>
                    <span className="text-sm font-bold text-foreground">{attrs.checkin_time || "A partir das 14h"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Taxa de Limpeza</span>
                    <span className="text-sm font-bold text-foreground">{attrs.cleaning_fee_cents ? formatMoney(attrs.cleaning_fee_cents) : "Isenta"}</span>
                  </div>
                </div>
              )}

              {templateStyle === "servicos_agenda" && (
                <div className="rounded-lg border border-border/60 bg-muted/20 p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Duração</span>
                    <span className="text-sm font-bold text-foreground">{attrs.service_duration_minutes ? `${attrs.service_duration_minutes} min` : "Sob demanda"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Modalidade</span>
                    <span className="text-sm font-bold text-foreground">{attrs.modality === "remote" ? "Online / Remoto" : "Presencial"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Agendamento</span>
                    <span className="text-sm font-bold text-foreground">{attrs.booking_enabled ? "Ativo" : "Sob Consulta"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Região</span>
                    <span className="text-sm font-bold text-foreground">{attrs.service_area || "Atendimento Local"}</span>
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

          {/* Ficha Técnica & Especificações Canônicas */}
          {(displayMode === "continuous_list" || activeTab === "specs") && (
            <div className="space-y-4">
              <NicheSpecificationsDisplay
                attributes={{
                  ...(classified.attributes || {}),
                  brand: classified.brand || classified.attributes?.brand,
                  model: classified.model || classified.attributes?.model,
                  condition: classified.condition || classified.attributes?.condition,
                }}
                title="Especificações"
              />

              {/* Destaques Complementares Resolvidos se não houver atributos estruturados */}
              {featureList.length > 0 && (!classified.attributes || Object.keys(classified.attributes).length === 0) && (
                <div className="space-y-3">
                  <h2 className="text-sm font-bold text-foreground">Especificações em Destaque</h2>
                  <div className="grid grid-cols-3 gap-3">
                    {featureList.map((item, idx) => (
                      <div key={idx} className="rounded-lg border border-border/50 bg-card p-3 space-y-1">
                        <span className="text-[11px] text-muted-foreground uppercase font-medium block">
                          {item.label}
                        </span>
                        <span className="text-sm font-bold text-foreground truncate block">
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Aba: Pagamentos & Financiamento */}
          {(displayMode === "continuous_list" || activeTab === "payments") && (
            <div className="rounded-lg border border-border/60 bg-card p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-border/40 pb-3">
                <div className="flex items-center gap-2">
                  <CreditCard className="size-4 text-primary" />
                  <h2 className="text-sm font-bold text-foreground">Pagamento & Financiamento</h2>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono">Condições Comerciais</Badge>
              </div>

              {/* Formas aceitas */}
              <div className="space-y-3">
                <span className="text-xs font-semibold text-foreground block">Meios de Pagamento Aceitos</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {acceptsPix && (
                    <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                        <QrCode className="size-3.5" />
                        <span>PIX</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {pixDiscountPercent > 0 ? `${pixDiscountPercent}% de desconto imediato` : "Aprovação instantânea"}
                      </p>
                    </div>
                  )}

                  {acceptsCard && (
                    <div className="p-3 rounded-lg border border-blue-500/30 bg-blue-500/5 space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-blue-700 dark:text-blue-400">
                        <CreditCard className="size-3.5" />
                        <span>Cartão de Crédito</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Até {maxInstallments}x {cardInterestFree ? "sem juros" : "no cartão"}
                      </p>
                    </div>
                  )}

                  {acceptsBoleto && (
                    <div className="p-3 rounded-lg border border-border/60 bg-muted/20 space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                        <Receipt className="size-3.5 text-muted-foreground" />
                        <span>Boleto Bancário</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {attrs.boleto_due_days ? `Vencimento em ${attrs.boleto_due_days} dias` : "À vista sob consulta"}
                      </p>
                    </div>
                  )}

                  {acceptsCarne && (
                    <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/5 space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400">
                        <FileSpreadsheet className="size-3.5" />
                        <span>Carnê Digital</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Até {attrs.max_carne_installments || 12}x facilitado
                      </p>
                    </div>
                  )}

                  {acceptsFinancing && (
                    <div className="p-3 rounded-lg border border-purple-500/30 bg-purple-500/5 space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-purple-700 dark:text-purple-400">
                        <Landmark className="size-3.5" />
                        <span>Financiamento</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {attrs.financing_notes || "Bancos parceiros / cartas contempladas"}
                      </p>
                    </div>
                  )}

                  {acceptsTrade && (
                    <div className="p-3 rounded-lg border border-border/60 bg-muted/20 space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                        <RefreshCw className="size-3.5 text-muted-foreground" />
                        <span>Aceita Troca / Permuta</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
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
                  <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                    <span>1x (à vista)</span>
                    <span>{Math.min(24, Math.max(1, maxInstallments))}x</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Card do Anunciante Desktop */}
          {(displayMode === "continuous_list" || activeTab === "seller") && (
            <div className="rounded-lg border border-border/60 bg-card p-5 space-y-4">
              <h2 className="text-sm font-bold text-foreground">Sobre o Anunciante</h2>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="size-14 rounded-full bg-muted flex items-center justify-center font-bold text-muted-foreground text-lg overflow-hidden border border-border/50 shrink-0">
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
                      <span>Perfil Verificado</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleStartNativeChat}
                    disabled={isStartingChat}
                    className="h-10 px-4 rounded-lg border-primary/30 text-primary bg-primary/10 hover:bg-primary/20 text-xs font-bold flex items-center gap-2 cursor-pointer"
                  >
                    <MessageCircle className="size-4 text-primary" />
                    <span>{isStartingChat ? "Abrindo..." : "Conversar no App"}</span>
                  </Button>

                  {cleanPhone && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleWhatsApp}
                      className="h-10 px-4 rounded-lg border-emerald-500/40 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 text-xs font-bold flex items-center gap-2 cursor-pointer"
                    >
                      <Phone className="size-4 text-emerald-500" />
                      <span>WhatsApp</span>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Localização e Mapa Desktop */}
          {(displayMode === "continuous_list" || activeTab === "map") && !classified.hide_location && !attrs.hide_location && classified.location_lat && classified.location_lng && (
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
              <div className="flex flex-wrap gap-2 pt-2">
                {acceptsPix && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-md text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                    <QrCode className="size-3.5 text-emerald-600" />
                    PIX {pixDiscountPercent > 0 ? `(${pixDiscountPercent}% off)` : "à vista"}
                  </span>
                )}
                {acceptsCard && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-md text-[11px] font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-300">
                    <CreditCard className="size-3.5 text-blue-600" />
                    Cartão até {maxInstallments}x
                  </span>
                )}
                {acceptsBoleto && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-md text-[11px] font-semibold bg-muted text-foreground">
                    <Receipt className="size-3.5 text-muted-foreground" />
                    Boleto
                  </span>
                )}
              </div>
            </div>

            {/* CTAs de Conversão Direta */}
            <div className="space-y-3">
              {(classified.lead_form || classified.form_id || attrs?.inquiry_config?.enabled) && (
                <Button
                  type="button"
                  onClick={() => setIsLeadFormModalOpen(true)}
                  className="h-12 w-full rounded-lg text-sm font-bold bg-primary text-primary-foreground shadow-sm hover:opacity-95 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2"
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
                  "h-12 w-full rounded-lg text-sm font-bold shadow-sm hover:opacity-95 active:scale-[0.99] transition-all cursor-pointer",
                  classified.lead_form || classified.form_id
                    ? "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    : "bg-primary text-primary-foreground"
                )}
              >
                {primaryCta.label}
              </Button>

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

              {onOpenProposalModal && !isDonation && (
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
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 select-none animate-in fade-in duration-200"
          onClick={() => setFullscreenImage(null)}
        >
          <button
            type="button"
            onClick={() => setFullscreenImage(null)}
            className="absolute top-4 right-4 z-10 size-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
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
              className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <img
              src={fullscreenImage}
              alt="Tela cheia"
              className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg"
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
          currentProfile={currentProfile || null}
          classifiedId={classified.id}
          classifiedTitle={classified.title}
          isOpen={isLeadFormModalOpen}
          onOpenChange={setIsLeadFormModalOpen}
          onStartSdrChat={() => {
            if (onOpenCompanion) {
              onOpenCompanion();
            } else {
              handleStartNativeChat();
            }
          }}
        />
      )}
    </div>
  );
}
