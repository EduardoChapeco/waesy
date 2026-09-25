import React, { useState, useMemo } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Share2,
  MapPin,
  Check,
  ShieldCheck,
  Tag,
  Clock,
  User,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  X,
  Phone,
  MessageCircle,
  Package,
  Truck,
  CreditCard,
  QrCode,
  Receipt,
  FileSpreadsheet,
  CheckCircle2,
  Edit3,
  Smartphone,
  ExternalLink,
  ShieldAlert,
  Coins,
  TrendingUp,
  Banknote,
  FileCheck,
  Download,
  AlertCircle,
  Eye,
  Building,
  Car,
  Hotel,
  Briefcase,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/money";
import { trackAndOpenWhatsApp } from "@/lib/whatsapp";
import { FavoriteButton } from "@/components/common/favorite-button";
import { MapLibreCanvas } from "@/components/mobility/maplibre-canvas";
import { resolveClassifiedNiche, getClassifiedPrimaryCtaLabel } from "@/lib/classifieds/semantics";
import { toast } from "sonner";
import type { UniversalClassifiedShowcaseProps } from "./universal-classified-showcase";

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
  const maxInstallments = Math.max(1, Number(attrs.max_installments) || 12);
  const installmentCents = Math.round(priceCents / maxInstallments);

  const isDonation = classified.category === "donation" || attrs.is_free_donation === true;
  const isInvestmentOpportunity = attrs.is_business_sale === true || attrs.deal_type === "investment_round";
  const targetInvestment = attrs.target_investment_cents || 0;
  const offeredEquity = attrs.offered_equity_percent ? `${attrs.offered_equity_percent}%` : null;

  // Condições comerciais
  const acceptsPix = attrs.accepts_pix !== false;
  const pixDiscountPercent = Number(attrs.pix_discount_percent) || 0;
  const acceptsCard = attrs.accepts_card !== false;
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
      text: `Olá! Vi seu anúncio "${classified.title}" no Waesy e gostaria de mais informações.`,
      storeId: classified.store_id || classified.storeId || author?.id,
      productId: classified.id,
      leadType: "classified_inquiry",
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
    if (onDirectBuy && priceCents > 0) {
      return {
        label: isBuyingDirect ? "Processando..." : "Comprar Agora",
        action: () => onDirectBuy?.(),
      };
    }
    return {
      label: "Fazer Proposta",
      action: () => onOpenProposalModal?.(),
    };
  }, [isDonation, isInvestmentOpportunity, niche, classified, onOpenBookingModal, onOpenProposalModal, onDirectBuy, onDownloadDigital, isBuyingDirect, isDownloadingDigital, priceCents, cleanPhone]);

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

  // Tech / Feature cards
  const featureList = useMemo(() => {
    const list: Array<{ label: string; value: string }> = [];
    if (classified.condition) {
      list.push({
        label: "Condição",
        value: classified.condition === "new" ? "Novo na Caixa" : classified.condition === "refurbished" ? "Revisado" : "Usado",
      });
    }
    if (attrs.brand) list.push({ label: "Marca", value: attrs.brand });
    if (attrs.model) list.push({ label: "Modelo", value: attrs.model });
    if (attrs.year) list.push({ label: "Ano", value: String(attrs.year) });
    if (attrs.mileage) list.push({ label: "Km", value: `${attrs.mileage.toLocaleString()} km` });
    if (attrs.property_type) list.push({ label: "Tipo", value: attrs.property_type });
    if (attrs.area_sqm) list.push({ label: "Área", value: `${attrs.area_sqm} m²` });
    if (attrs.bedrooms) list.push({ label: "Quartos", value: String(attrs.bedrooms) });
    if (attrs.delivery_available) list.push({ label: "Entrega", value: "Disponível" });
    if (attrs.warranty) list.push({ label: "Garantia", value: attrs.warranty });
    return list;
  }, [classified, attrs]);

  return (
    <div className="w-full min-h-screen bg-background text-foreground pb-28 select-none">
      {/* ── 1. HERO DE MÍDIA NATIVO EDGE-TO-EDGE (Sem margens, toca no topo absoluto) ── */}
      <div className="relative w-full aspect-[4/3] bg-muted/30 overflow-hidden">
        {images.length > 0 ? (
          <>
            {isVideoUrl(images[activeImage]) ? (
              <video
                src={images[activeImage]}
                controls
                playsInline
                className="size-full object-contain bg-black"
              />
            ) : (
              <img
                src={images[activeImage]}
                alt={classified.title}
                className="size-full object-cover cursor-pointer"
                onClick={() => setFullscreenImage(images[activeImage])}
              />
            )}

            {/* Contador de Fotos */}
            {images.length > 1 && (
              <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[11px] font-mono font-medium pointer-events-none">
                {activeImage + 1} / {images.length}
              </div>
            )}

            {/* Controles de Próxima/Anterior em Toque */}
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setActiveImage((prev) => (prev > 0 ? prev - 1 : images.length - 1))}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 size-8 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center active:scale-90 transition-transform"
                  aria-label="Foto anterior"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveImage((prev) => (prev < images.length - 1 ? prev + 1 : 0))}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 size-8 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center active:scale-90 transition-transform"
                  aria-label="Próxima foto"
                >
                  <ChevronRight className="size-4" />
                </button>
              </>
            )}
          </>
        ) : (
          <div className="size-full flex flex-col items-center justify-center text-muted-foreground gap-2">
            <Package className="size-12 stroke-[1.5]" />
            <span className="text-xs">Sem fotos cadastradas</span>
          </div>
        )}

        {/* ── BOTÃO FLUTUANTE VOLTAR (Nativo iOS/Android - Canto Superior Esquerdo) ── */}
        <button
          type="button"
          onClick={() => {
            if (window.history.length > 1) {
              window.history.back();
            } else {
              navigate({ to: "/classificados" });
            }
          }}
          className="absolute top-3 left-3 size-10 rounded-full bg-black/50 backdrop-blur-md text-white border border-white/20 flex items-center justify-center z-20 shadow-md active:scale-95 transition-transform cursor-pointer"
          aria-label="Voltar aos anúncios"
        >
          <ArrowLeft className="size-5" />
        </button>

        {/* ── AÇÕES FLUTUANTES (Canto Superior Direito: Compartilhar & Favoritar) ── */}
        <div className="absolute top-3 right-3 flex items-center gap-2 z-20">
          {onOpenCompanion && (
            <button
              type="button"
              onClick={onOpenCompanion}
              className="size-10 rounded-full bg-black/50 backdrop-blur-md text-white border border-white/20 flex items-center justify-center shadow-md active:scale-95 transition-transform cursor-pointer"
              title="Guia Digital 9:16"
              aria-label="Guia Digital"
            >
              <Smartphone className="size-4 text-primary" />
            </button>
          )}

          <button
            type="button"
            onClick={handleShare}
            className="size-10 rounded-full bg-black/50 backdrop-blur-md text-white border border-white/20 flex items-center justify-center shadow-md active:scale-95 transition-transform cursor-pointer"
            aria-label="Compartilhar anúncio"
          >
            <Share2 className="size-4" />
          </button>

          <div className="size-10 rounded-full bg-black/50 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-md">
            <FavoriteButton
              itemId={classified.id}
              itemType="classified"
              className="size-8 text-white hover:text-white"
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
              className="h-7 text-xs px-2.5 rounded-lg border-amber-500/40 text-amber-900 dark:text-amber-100 hover:bg-amber-500/20 font-bold"
            >
              <Edit3 className="size-3 mr-1" /> Editar
            </Button>
          )}
        </div>
      )}

      {/* ── 2. CONTEÚDO PRINCIPAL (Padrão WhatsApp / Mobile App Native List) ── */}
      <div className="px-4 pt-4 space-y-5">
        {/* Preço & Badges */}
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className="text-[10px] font-semibold text-primary border-primary/30 bg-primary/10">
              {niche.label}
            </Badge>
            {classified.condition && (
              <Badge variant="secondary" className="text-[10px] font-medium">
                {classified.condition === "new" ? "Novo" : classified.condition === "refurbished" ? "Revisado" : "Usado"}
              </Badge>
            )}
            {attrs.delivery_available && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
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
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Aporte Solicitado</span>
                <span className="text-2xl font-extrabold text-foreground font-mono">
                  {targetInvestment > 0 ? formatMoney(targetInvestment) : (priceCents > 0 ? formatMoney(priceCents) : "A combinar")}
                </span>
                {offeredEquity && <span className="text-xs text-primary font-semibold block">{offeredEquity} de participação</span>}
              </div>
            ) : (
              <div className="space-y-0.5">
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
          <div className="flex items-center gap-1 text-xs text-muted-foreground pt-0.5">
            <MapPin className="size-3.5 shrink-0 text-muted-foreground/70" />
            <span className="truncate">{locationText}</span>
          </div>
        </div>

        {/* ── 3. CARD DO VENDEDOR / ANUNCIANTE ── */}
        <div className="rounded-2xl border border-border/60 bg-card p-3.5 flex items-center justify-between gap-3 shadow-xs">
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
              <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="size-3 shrink-0" />
                <span>Perfil Verificado Waesy</span>
              </div>
            </div>
          </div>

          {cleanPhone && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleWhatsApp}
              className="h-9 px-3 rounded-xl border-emerald-500/40 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 text-xs font-bold shrink-0 flex items-center gap-1.5 active:scale-95"
            >
              <MessageCircle className="size-3.5 text-emerald-500" />
              <span>Conversar</span>
            </Button>
          )}
        </div>

        {/* ── 4. CARDS DE CARACTERÍSTICAS TÉCNICAS (Bento Grid Mobile) ── */}
        {featureList.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Especificações
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {featureList.map((item, idx) => (
                <div key={idx} className="rounded-xl border border-border/50 bg-card p-2.5 space-y-0.5">
                  <span className="text-[10px] text-muted-foreground uppercase font-medium block">
                    {item.label}
                  </span>
                  <span className="text-xs font-semibold text-foreground truncate block">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 5. DESCRIÇÃO NATIVA COM EXPANSOR ── */}
        {classified.content && (
          <div className="space-y-2">
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Descrição
            </h2>
            <div className="rounded-2xl border border-border/50 bg-card p-3.5 space-y-2 text-xs text-foreground/90 leading-relaxed">
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

        {/* ── 6. LOCALIZAÇÃO E MAPA (Se não for oculto e possuir lat/lng) ── */}
        {!classified.hide_location && !attrs.hide_location && classified.location_lat && classified.location_lng && (
          <div className="space-y-2">
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Localização Aproximada
            </h2>
            <div className="rounded-2xl border border-border/50 overflow-hidden h-44 bg-muted/20">
              <MapLibreCanvas
                initialCenter={[classified.location_lng, classified.location_lat]}
                initialZoom={14}
                className="size-full"
              />
            </div>
          </div>
        )}

        {/* ── 7. COMPROMISSO DE SEGURANÇA ── */}
        <div className="rounded-xl border border-border/40 bg-muted/20 p-3 flex items-start gap-2.5 text-muted-foreground">
          <ShieldCheck className="size-4 text-primary shrink-0 mt-0.5" />
          <div className="text-[11px] leading-snug space-y-0.5">
            <span className="font-semibold text-foreground block">Dica de Segurança</span>
            <span>Nunca faça transferências antecipadas fora da plataforma. Prefira locais públicos para entregas.</span>
          </div>
        </div>
      </div>

      {/* ── 8. STICKY BOTTOM ACTION BAR (Native-First: Nielsen Norman & Apple HIG) ── */}
      {/* Utiliza pb-[calc(0.75rem+env(safe-area-inset-bottom))] e mobile-nav-hide-on-keyboard */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-t border-border/50 px-4 py-2.5 pb-[calc(0.65rem+env(safe-area-inset-bottom))] flex items-center justify-between gap-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] mobile-nav-hide-on-keyboard">
        {/* Preço / Condição */}
        <div className="flex flex-col min-w-0">
          {isDonation ? (
            <div className="flex items-center gap-1.5">
              <span className="text-base font-extrabold text-emerald-600 font-mono">Gratuito</span>
              <Badge variant="outline" className="text-[9px] font-bold text-emerald-600 border-emerald-500/30 bg-emerald-500/10">
                Doação
              </Badge>
            </div>
          ) : isInvestmentOpportunity ? (
            <div className="flex flex-col">
              <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider">Aporte</span>
              <span className="text-base font-extrabold text-foreground font-mono truncate">
                {targetInvestment > 0 ? formatMoney(targetInvestment) : "A combinar"}
              </span>
            </div>
          ) : (
            <div className="flex flex-col">
              <div className="flex items-baseline gap-1">
                <span className="text-base sm:text-lg font-extrabold text-foreground font-mono truncate">
                  {priceCents > 0 ? formatMoney(priceCents) : "Sob Consulta"}
                </span>
                {niche.priceSuffix && (
                  <span className="text-[10px] text-muted-foreground shrink-0">{niche.priceSuffix}</span>
                )}
              </div>
              {priceCents > 0 && maxInstallments > 1 && (
                <span className="text-[10px] text-muted-foreground font-mono truncate">
                  até {maxInstallments}x de {formatMoney(installmentCents)}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Botões de Ação Direta (44px touch target) */}
        <div className="flex items-center gap-2 shrink-0">
          {cleanPhone && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleWhatsApp}
              className="h-11 w-11 p-0 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 active:scale-95 transition-transform"
              aria-label="Chamar no WhatsApp"
            >
              <MessageCircle className="size-5" />
            </Button>
          )}

          <Button
            type="button"
            onClick={primaryCta.action}
            disabled={isBooking || isBuyingDirect || isDownloadingDigital}
            className="h-11 px-5 rounded-xl font-bold text-xs sm:text-sm bg-primary text-primary-foreground shadow-sm hover:opacity-90 active:scale-95 transition-transform cursor-pointer"
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
            className="absolute top-4 right-4 z-10 size-10 rounded-full bg-white/20 text-white flex items-center justify-center"
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
    </div>
  );
}
