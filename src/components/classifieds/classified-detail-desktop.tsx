import React, { useState, useMemo } from "react";
import { Link } from "@tanstack/react-router";
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
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/money";
import { formatRelativeTime } from "@/lib/datetime";
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

export function ClassifiedDetailDesktop({
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
  const [activeImage, setActiveImage] = useState(0);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "specs" | "seller" | "map">("overview");

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

  // Features list
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
    if (attrs.property_type) list.push({ label: "Tipo de Imóvel", value: attrs.property_type });
    if (attrs.area_sqm) list.push({ label: "Área Útil", value: `${attrs.area_sqm} m²` });
    if (attrs.bedrooms) list.push({ label: "Quartos", value: String(attrs.bedrooms) });
    if (attrs.bathrooms) list.push({ label: "Banheiros", value: String(attrs.bathrooms) });
    if (attrs.garage_spots) list.push({ label: "Vagas", value: String(attrs.garage_spots) });
    if (attrs.delivery_available) list.push({ label: "Envio / Entrega", value: "Disponível para todo o Brasil" });
    if (attrs.warranty) list.push({ label: "Garantia", value: attrs.warranty });
    return list;
  }, [classified, attrs]);

  return (
    <div className="w-full min-h-screen bg-background text-foreground pb-16">
      {/* ── BREADCRUMBS & TOP BAR ACTIONS (Desktop) ── */}
      <div className="w-full max-w-7xl mx-auto px-6 pt-5 pb-4 flex items-center justify-between gap-4">
        {/* Breadcrumb Limpo */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link to="/classificados" className="hover:text-foreground transition-colors">
            Classificados
          </Link>
          <span>/</span>
          <span className="text-foreground/80 font-medium">{niche.label}</span>
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
              className="h-10 px-3.5 rounded-xl text-xs font-semibold border-border/70 bg-card hover:bg-muted/50 text-foreground flex items-center gap-1.5 cursor-pointer active:scale-98"
            >
              <Smartphone className="size-4 text-primary" />
              <span>Guia Digital 9:16</span>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            className="h-10 px-3.5 rounded-xl text-xs font-semibold border-border/70 bg-card hover:bg-muted/50 text-foreground flex items-center gap-1.5 cursor-pointer"
          >
            <Share2 className="size-4" />
            <span>Compartilhar</span>
          </Button>

          <FavoriteButton
            itemId={classified.id}
            itemType="classified"
            className="size-10 rounded-xl border border-border/70 bg-card hover:bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-foreground"
          />

          {isOwner && onEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={onEdit}
              className="h-10 px-3 rounded-xl border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200 text-xs font-bold flex items-center gap-1.5"
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
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-100">
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
          <div className="w-full aspect-[21/9] max-h-[420px] rounded-2xl bg-muted/20 border border-border/40 flex flex-col items-center justify-center text-muted-foreground gap-2">
            <Package className="size-12 stroke-[1.5]" />
            <span className="text-sm">Nenhuma foto cadastrada para este anúncio</span>
          </div>
        ) : images.length === 1 ? (
          <div className="w-full aspect-[16/9] max-h-[480px] rounded-2xl overflow-hidden bg-muted/20 border border-border/40 relative group">
            <img
              src={images[0]}
              alt={classified.title}
              className="size-full object-cover cursor-pointer group-hover:scale-[1.01] transition-transform duration-300"
              onClick={() => setFullscreenImage(images[0])}
            />
            <button
              type="button"
              onClick={() => setFullscreenImage(images[0])}
              className="absolute bottom-4 right-4 px-3.5 py-2 rounded-xl bg-background/90 hover:bg-background text-foreground text-xs font-semibold border border-border/60 flex items-center gap-1.5 transition-all shadow-sm"
            >
              <Maximize2 className="size-4" />
              <span>Ver em tela cheia</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-3 aspect-[16/9] max-h-[500px] rounded-2xl overflow-hidden border border-border/40 bg-muted/20 relative group">
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
                  className="absolute bottom-4 right-4 px-3.5 py-2 rounded-xl bg-background/95 border border-border/50 text-foreground text-xs font-semibold flex items-center gap-1.5 shadow-md hover:bg-background cursor-pointer active:scale-95"
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
                {niche.label}
              </Badge>
              {classified.condition && (
                <Badge variant="secondary" className="text-xs font-medium">
                  {classified.condition === "new" ? "Novo na Caixa" : classified.condition === "refurbished" ? "Revisado" : "Usado"}
                </Badge>
              )}
              {attrs.delivery_available && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-md">
                  <Truck className="size-3.5" /> Envio Disponível
                </span>
              )}
            </div>

            <h1 className="text-2xl lg:text-3xl font-extrabold text-foreground tracking-tight leading-tight">
              {classified.title}
            </h1>

            <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
              <div className="flex items-center gap-1.5">
                <MapPin className="size-3.5 text-muted-foreground/80" />
                <span>{locationText}</span>
              </div>
              {classified.created_at && (
                <div className="flex items-center gap-1.5">
                  <Clock className="size-3.5 text-muted-foreground/80" />
                  <span>Publicado {formatRelativeTime(classified.created_at)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Grid de Especificações Rápidas */}
          {featureList.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-bold text-foreground">Especificações em Destaque</h2>
              <div className="grid grid-cols-3 gap-3">
                {featureList.map((item, idx) => (
                  <div key={idx} className="rounded-xl border border-border/50 bg-card p-3 space-y-1">
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

          {/* Descrição Detalhada */}
          {classified.content && (
            <div className="space-y-3 pt-2">
              <h2 className="text-sm font-bold text-foreground">Descrição do Anúncio</h2>
              <div className="rounded-2xl border border-border/50 bg-card p-5 text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
                {classified.content}
              </div>
            </div>
          )}

          {/* Card do Anunciante Desktop */}
          <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-4">
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
                <div className="space-y-0.5">
                  <span className="text-base font-bold text-foreground block">
                    {classified.store_name || author?.full_name || "Anunciante Comunitário"}
                  </span>
                  <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                    <ShieldCheck className="size-4 shrink-0" />
                    <span>Perfil Verificado Waesy & Identidade Auditada</span>
                  </div>
                </div>
              </div>

              {cleanPhone && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleWhatsApp}
                  className="h-10 px-4 rounded-xl border-emerald-500/40 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 text-xs font-bold flex items-center gap-2 cursor-pointer"
                >
                  <MessageCircle className="size-4 text-emerald-500" />
                  <span>Conversar no WhatsApp</span>
                </Button>
              )}
            </div>
          </div>

          {/* Localização e Mapa Desktop */}
          {!classified.hide_location && !attrs.hide_location && classified.location_lat && classified.location_lng && (
            <div className="space-y-3 pt-2">
              <h2 className="text-sm font-bold text-foreground">Localização no Mapa</h2>
              <div className="rounded-2xl border border-border/50 overflow-hidden h-64 bg-muted/20">
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
          <div className="sticky top-20 rounded-2xl border border-border/60 bg-card p-6 shadow-sm space-y-6">
            {/* Bloco de Preço */}
            <div className="space-y-1.5 pb-4 border-b border-border/50">
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
                    <div className="flex items-baseline gap-1.5">
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
              <div className="flex flex-wrap gap-1.5 pt-2">
                {acceptsPix && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                    <QrCode className="size-3.5 text-emerald-600" />
                    PIX {pixDiscountPercent > 0 ? `(${pixDiscountPercent}% off)` : "à vista"}
                  </span>
                )}
                {acceptsCard && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-300">
                    <CreditCard className="size-3.5 text-blue-600" />
                    Cartão até {maxInstallments}x
                  </span>
                )}
                {acceptsBoleto && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-muted text-foreground">
                    <Receipt className="size-3.5 text-muted-foreground" />
                    Boleto
                  </span>
                )}
              </div>
            </div>

            {/* CTAs de Conversão Direta */}
            <div className="space-y-3">
              <Button
                type="button"
                onClick={primaryCta.action}
                disabled={isBooking || isBuyingDirect || isDownloadingDigital}
                className="h-12 w-full rounded-xl text-sm font-bold bg-primary text-primary-foreground shadow-sm hover:opacity-95 active:scale-[0.99] transition-all cursor-pointer"
              >
                {primaryCta.label}
              </Button>

              {onOpenProposalModal && !isDonation && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onOpenProposalModal}
                  className="h-11 w-full rounded-xl text-xs font-semibold border-border/70 text-foreground hover:bg-muted/40"
                >
                  Enviar Proposta / Negociar
                </Button>
              )}

              {cleanPhone && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleWhatsApp}
                  className="h-11 w-full rounded-xl text-xs font-bold border-emerald-500/40 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 flex items-center justify-center gap-2"
                >
                  <MessageCircle className="size-4 text-emerald-600" />
                  <span>Chamar Vendedor no WhatsApp</span>
                </Button>
              )}
            </div>

            {/* Garantias e Segurança Waesy */}
            <div className="space-y-2 pt-2 border-t border-border/50 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-primary shrink-0" />
                <span>Negociação protegida pela plataforma Waesy</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                <span>Identidade do anunciante validada</span>
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
    </div>
  );
}
