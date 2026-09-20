import React, { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Share2,
  MapPin,
  Check,
  ShieldCheck,
  Clock,
  Phone,
  MessageCircle,
  Truck,
  Package,
  CreditCard,
  QrCode,
  Banknote,
  Minus,
  Plus,
  ShoppingBag,
  Zap,
  Sparkles,
  Info,
  BadgePercent,
  CheckCircle2,
  Store,
  ExternalLink,
  Edit3,
  Calendar,
  Clock3,
} from "lucide-react";
import { formatMoney } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface ConveniencePreviewData {
  title: string;
  description?: string;
  priceCents?: number;
  images: string[];
  locationName?: string;
  whatsapp?: string;
  volume?: string;
  temperature?: "gelada" | "ambiente" | "congelado" | "fresco" | "none" | string;
  isAlcoholic?: boolean;
  brand?: string;
  deliveryEstimate?: string;
  readyDelivery?: boolean;
  acceptsPix?: boolean;
  pixDiscountPercent?: number;
  acceptsCard?: boolean;
  maxInstallments?: number;
  cardInterestFree?: boolean;
  acceptsCash?: boolean;
  stockQty?: number;
}

interface ConvenienceShowcaseViewProps {
  classified?: any;
  previewData?: ConveniencePreviewData;
  isOwner?: boolean;
  onEdit?: () => void;
  onOpenBookingModal?: () => void;
  onOpenProposalModal?: () => void;
}

export function ConvenienceShowcaseView({
  classified,
  previewData,
  isOwner = false,
  onEdit,
}: ConvenienceShowcaseViewProps) {
  const [quantity, setQuantity] = useState(1);
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);

  // Unificação de dados (Produção vs Prévia no Editor)
  const isPreview = !classified && !!previewData;
  const attrs = classified?.attributes || {};

  const title = previewData?.title || classified?.title || "Produto de Conveniência";
  const description =
    previewData?.description ||
    classified?.content ||
    classified?.description ||
    "";
  const priceCents =
    previewData?.priceCents !== undefined
      ? previewData.priceCents
      : classified?.price_cents ?? 0;

  const images = (
    previewData?.images && previewData.images.length > 0
      ? previewData.images
      : (Array.isArray(classified?.images) && classified.images.length > 0
          ? classified.images
          : Array.isArray(classified?.media) && classified.media.length > 0
          ? classified.media
          : [])
  ) as string[];

  const locationName =
    previewData?.locationName ||
    classified?.location_name ||
    classified?.city ||
    "São Miguel do Oeste e Região";

  const rawPhone = previewData?.whatsapp || classified?.contact_whatsapp || classified?.whatsapp || "";
  const cleanPhone = rawPhone.replace(/\D/g, "");

  const volume = previewData?.volume || attrs.volume || attrs.specification_volume || "";
  const temperature =
    previewData?.temperature || attrs.temperature || attrs.storage_temp || "gelada";
  const isAlcoholic =
    previewData?.isAlcoholic !== undefined
      ? previewData.isAlcoholic
      : !!(attrs.is_alcoholic || attrs.contains_alcohol);
  const brand = previewData?.brand || attrs.brand || attrs.manufacturer || "";
  const deliveryEstimate =
    previewData?.deliveryEstimate ||
    attrs.delivery_estimate ||
    "Entrega expressa sob demanda (MotoLink)";
  const readyDelivery =
    previewData?.readyDelivery !== undefined
      ? previewData.readyDelivery
      : attrs.ready_delivery !== false;

  // Formas de Pagamento
  const acceptsPix =
    previewData?.acceptsPix !== undefined
      ? previewData.acceptsPix
      : attrs.accepts_pix !== false;
  const pixDiscountPercent =
    previewData?.pixDiscountPercent !== undefined
      ? previewData.pixDiscountPercent
      : Number(attrs.pix_discount_percent) || 0;
  const acceptsCard =
    previewData?.acceptsCard !== undefined
      ? previewData.acceptsCard
      : attrs.accepts_card !== false;
  const maxInstallments = Math.max(
    1,
    previewData?.maxInstallments !== undefined
      ? previewData.maxInstallments
      : Number(attrs.max_installments) || 1
  );
  const cardInterestFree =
    previewData?.cardInterestFree !== undefined
      ? previewData.cardInterestFree
      : attrs.card_interest_free !== false;
  const acceptsCash =
    previewData?.acceptsCash !== undefined
      ? previewData.acceptsCash
      : attrs.accepts_cash !== false;

  // Cálculos financeiros
  const effectivePriceCents = priceCents;
  const subtotalCents = effectivePriceCents * quantity;
  const pixPriceCents =
    pixDiscountPercent > 0
      ? Math.round(effectivePriceCents * (1 - pixDiscountPercent / 100))
      : effectivePriceCents;
  const pixSubtotalCents = pixPriceCents * quantity;

  // Parcelamento: se 1x, é à vista; se >= 2x, calcula parcela
  const installmentCents =
    maxInstallments >= 2 && effectivePriceCents > 0
      ? Math.round(effectivePriceCents / maxInstallments)
      : 0;

  // Modalidade de Entrega & Agendamento Real
  const [deliveryMode, setDeliveryMode] = useState<"immediate" | "scheduled" | "pickup">("immediate");
  const [scheduledWindow, setScheduledWindow] = useState<string>("today-afternoon");

  const SCHEDULE_WINDOWS = [
    { id: "today-afternoon", label: "Hoje (14h às 18h)" },
    { id: "today-evening", label: "Hoje (18h às 22h)" },
    { id: "tomorrow-morning", label: "Amanhã (09h às 12h)" },
    { id: "tomorrow-afternoon", label: "Amanhã (14h às 18h)" },
  ];

  const handleShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title,
          text: `Confira ${title} na Waesy`,
          url: window.location.href,
        });
      } catch {}
    } else {
      navigator.clipboard?.writeText(window.location.href);
      toast.success("Link copiado para a área de transferência!");
    }
  };

  const handleQuickOrder = () => {
    if (isPreview) {
      toast.info("Esta é uma prévia ao vivo. O botão abrirá o pedido ou checkout no anúncio publicado.");
      return;
    }

    const selectedWindowObj = SCHEDULE_WINDOWS.find((w) => w.id === scheduledWindow);
    const deliveryText =
      deliveryMode === "immediate"
        ? "Entrega expressa sob demanda (despacho após separação)"
        : deliveryMode === "scheduled"
        ? `Entrega Agendada: ${selectedWindowObj?.label || "Janela programada"}`
        : "Retirada direta no local (R$ 0,00)";

    if (cleanPhone) {
      const msg = encodeURIComponent(
        `Olá! Gostaria de pedir *${quantity}x ${title}*\n` +
        `Subtotal: ${formatMoney(subtotalCents)}\n` +
        `Modalidade de Entrega: ${deliveryText}\n` +
        `Endereço / Observação:\n` +
        `Forma de Pagamento Desejada: ${acceptsPix ? "Pix" : acceptsCard ? "Cartão" : "Dinheiro"}`
      );
      window.open(`https://wa.me/${cleanPhone.startsWith("55") ? cleanPhone : "55" + cleanPhone}?text=${msg}`, "_blank");
    } else {
      toast.success("Adicionado ao pedido!");
    }
  };

  return (
    <div className="w-full bg-background text-foreground antialiased pb-24">
      {/* Banner de Modo Proprietário */}
      {isOwner && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 flex items-center justify-between text-xs text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="font-semibold">Modo Proprietário · Produto de Conveniência</span>
          </div>
          {onEdit && (
            <Button
              size="sm"
              variant="outline"
              onClick={onEdit}
              className="h-7 text-xs gap-1 rounded-lg border-amber-500/30 bg-background/80 hover:bg-amber-500/15 cursor-pointer"
            >
              <Edit3 className="size-3" />
              <span>Editar</span>
            </Button>
          )}
        </div>
      )}

      {/* Top Header com Botão de Voltar e Compartilhar */}
      <header className="sticky top-0 z-30 bg-background/85 backdrop-blur-md border-b border-border/40 px-3 sm:px-6 h-12 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {!isPreview ? (
            <Button asChild variant="ghost" size="icon" className="size-8 rounded-full">
              <Link to="/mercado">
                <ArrowLeft className="size-4" />
                <span className="sr-only">Voltar</span>
              </Link>
            </Button>
          ) : (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
              <Zap className="size-3.5" />
              <span>Modo Conveniência</span>
            </div>
          )}
          <span className="text-xs font-medium text-muted-foreground truncate max-w-[200px] sm:max-w-xs">
            {locationName}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleShare}
            className="size-8 rounded-full text-muted-foreground hover:text-foreground"
            title="Compartilhar"
          >
            <Share2 className="size-4" />
          </Button>
        </div>
      </header>

      {/* Container Principal em 2 Colunas no Desktop / Fluxo Limpo no Mobile */}
      <main className="max-w-5xl mx-auto px-3 sm:px-6 pt-4 sm:pt-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          
          {/* Coluna Esquerda (MD: 6 Colunas) — Foto e Badges Imersivos */}
          <div className="md:col-span-6 space-y-3">
            <div className="relative aspect-square sm:aspect-4/3 w-full rounded-2xl overflow-hidden bg-muted/30 border border-border/60 flex items-center justify-center shadow-2xs group">
              {images.length > 0 ? (
                <img
                  src={images[activePhotoIdx] || images[0]}
                  alt={title}
                  className="w-full h-full object-contain p-4 transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground p-8 text-center">
                  <ShoppingBag className="size-12 stroke-[1.2] text-primary/40" />
                  <p className="text-xs">Foto do produto de conveniência</p>
                </div>
              )}

              {/* Badges Flutuantes Sobre a Foto */}
              <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 pointer-events-none">
                {volume && (
                  <Badge className="bg-background/90 text-foreground backdrop-blur-md border border-border/70 text-[11px] font-bold px-2 py-0.5 shadow-2xs">
                    {volume}
                  </Badge>
                )}
                {temperature === "gelada" && (
                  <Badge className="bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 backdrop-blur-md border border-cyan-500/30 text-[10px] font-bold px-2 py-0.5">
                    🧊 Gelada
                  </Badge>
                )}
                {temperature === "congelado" && (
                  <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 backdrop-blur-md border border-blue-500/30 text-[10px] font-bold px-2 py-0.5">
                    ❄️ Congelado
                  </Badge>
                )}
              </div>

              <div className="absolute top-3 right-3 flex flex-wrap gap-1.5 pointer-events-none">
                {isAlcoholic && (
                  <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-300 backdrop-blur-md border border-rose-500/30 text-[10px] font-bold px-2 py-0.5">
                    🔞 +18
                  </Badge>
                )}
                {readyDelivery && (
                  <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 backdrop-blur-md border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 flex items-center gap-1">
                    <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Pronta Entrega</span>
                  </Badge>
                )}
              </div>
            </div>

            {/* Galeria de Miniaturas (se houver mais de 1 foto) */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActivePhotoIdx(idx)}
                    className={cn(
                      "size-14 rounded-xl overflow-hidden border shrink-0 bg-muted/20 p-1 transition-all cursor-pointer",
                      activePhotoIdx === idx
                        ? "border-primary ring-2 ring-primary/20"
                        : "border-border/60 opacity-60 hover:opacity-100"
                    )}
                  >
                    <img src={img} alt={`Thumb ${idx}`} className="w-full h-full object-contain" />
                  </button>
                ))}
              </div>
            )}

            {/* Painel de Logística Real: Imediata vs Agendada vs Retirada */}
            <div className="p-3.5 sm:p-4 rounded-2xl border border-border/80 bg-card shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Truck className="size-3.5 text-primary" />
                  <span>Opções de Recebimento</span>
                </h4>
                <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                  {deliveryMode === "pickup" ? "Taxa R$ 0" : "Entrega Local"}
                </span>
              </div>

              {/* Seletor de Modalidade em Chips Táteis */}
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-muted/30 rounded-xl border border-border/50">
                <button
                  type="button"
                  onClick={() => setDeliveryMode("immediate")}
                  className={cn(
                    "py-2 px-1 text-center rounded-lg font-semibold text-[11px] transition-all cursor-pointer",
                    deliveryMode === "immediate"
                      ? "bg-background text-foreground shadow-2xs font-bold ring-1 ring-border/80"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Sob Demanda
                </button>
                <button
                  type="button"
                  onClick={() => setDeliveryMode("scheduled")}
                  className={cn(
                    "py-2 px-1 text-center rounded-lg font-semibold text-[11px] transition-all cursor-pointer",
                    deliveryMode === "scheduled"
                      ? "bg-background text-foreground shadow-2xs font-bold ring-1 ring-border/80"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Agendar
                </button>
                <button
                  type="button"
                  onClick={() => setDeliveryMode("pickup")}
                  className={cn(
                    "py-2 px-1 text-center rounded-lg font-semibold text-[11px] transition-all cursor-pointer",
                    deliveryMode === "pickup"
                      ? "bg-background text-foreground shadow-2xs font-bold ring-1 ring-border/80"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Retirar
                </button>
              </div>

              {/* Conteúdo Contextual da Modalidade */}
              {deliveryMode === "immediate" && (
                <div className="space-y-1.5 pt-1">
                  <p className="text-xs font-medium text-foreground flex items-center gap-1">
                    <Clock3 className="size-3 text-primary shrink-0" />
                    <span>Despacho sob demanda via MotoLink</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    A loja prepara o pedido e aloca o entregador autônomo assim que a solicitação for confirmada.
                  </p>
                </div>
              )}

              {deliveryMode === "scheduled" && (
                <div className="space-y-2 pt-1">
                  <p className="text-xs font-medium text-foreground flex items-center gap-1">
                    <Calendar className="size-3 text-primary shrink-0" />
                    <span>Escolha a janela de entrega</span>
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {SCHEDULE_WINDOWS.map((win) => (
                      <button
                        key={win.id}
                        type="button"
                        onClick={() => setScheduledWindow(win.id)}
                        className={cn(
                          "p-2 text-left rounded-xl border text-[11px] transition-all cursor-pointer",
                          scheduledWindow === win.id
                            ? "border-primary bg-primary/10 font-bold text-foreground ring-1 ring-primary/20"
                            : "border-border/60 bg-muted/10 text-muted-foreground hover:border-border"
                        )}
                      >
                        {win.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Ideal para compras programadas, bebidas geladas para o fim do dia ou feiras locais.
                  </p>
                </div>
              )}

              {deliveryMode === "pickup" && (
                <div className="space-y-1 pt-1">
                  <p className="text-xs font-medium text-foreground flex items-center gap-1">
                    <Package className="size-3 text-primary shrink-0" />
                    <span>Retirada sem custo adicional</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Combine o ponto e o horário de retirada diretamente com o estabelecimento após o pedido.
                  </p>
                </div>
              )}

              <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="size-3 text-emerald-600" />
                  Rastreamento GPS da entrega
                </span>
                <span>{locationName}</span>
              </div>
            </div>
          </div>

          {/* Coluna Direita (MD: 6 Colunas) — Detalhes, Preço, Quantidade e Pedido */}
          <div className="md:col-span-6 space-y-5">
            {/* Cabeçalho do Produto */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-medium">
                {brand && (
                  <>
                    <span className="text-foreground font-semibold">{brand}</span>
                    <span>·</span>
                  </>
                )}
                <span>Conveniência & Bebidas</span>
                {volume && (
                  <>
                    <span>·</span>
                    <span className="font-mono">{volume}</span>
                  </>
                )}
              </div>

              <h1 className="text-lg sm:text-2xl font-black text-foreground tracking-tight leading-snug">
                {title}
              </h1>

              {isAlcoholic && (
                <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1 pt-0.5">
                  <Info className="size-3 shrink-0" />
                  <span>Venda proibida para menores de 18 anos. Beba com moderação.</span>
                </p>
              )}
            </div>

            {/* Bloco de Preço & Economia */}
            <div className="p-4 rounded-2xl bg-card border border-border/60 shadow-2xs space-y-2">
              <div className="flex items-baseline justify-between flex-wrap gap-2">
                <div>
                  <span className="text-2xl sm:text-3xl font-black text-foreground font-mono">
                    {priceCents > 0 ? formatMoney(priceCents) : "Preço sob consulta"}
                  </span>
                  {volume && (
                    <span className="text-xs text-muted-foreground ml-1 font-mono">
                      / {volume}
                    </span>
                  )}
                </div>

                {/* Badge À vista no Pix com Desconto */}
                {acceptsPix && pixDiscountPercent > 0 && priceCents > 0 && (
                  <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-xs font-bold px-2 py-0.5 gap-1">
                    <BadgePercent className="size-3.5" />
                    <span>{pixDiscountPercent}% OFF no Pix</span>
                  </Badge>
                )}
              </div>

              {/* Preço com Desconto Pix se configurado */}
              {acceptsPix && pixDiscountPercent > 0 && priceCents > 0 && (
                <div className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                  <QrCode className="size-3.5" />
                  <span>
                    Sai por <strong>{formatMoney(pixPriceCents)}</strong> à vista no Pix
                  </span>
                </div>
              )}

              {/* Parcelamento no Cartão: Se 1x, NÃO exibe 1x. Só exibe se >= 2x! */}
              <div className="pt-2 border-t border-border/40 text-xs text-muted-foreground space-y-1">
                {acceptsCard && (
                  <div className="flex items-center gap-1.5">
                    <CreditCard className="size-3.5 text-primary shrink-0" />
                    <span>
                      {maxInstallments === 1 ? (
                        <span>Pagamento <strong>à vista</strong> no cartão de crédito/débito</span>
                      ) : (
                        <span>
                          ou em até <strong>{maxInstallments}x de {formatMoney(installmentCents)}</strong>{" "}
                          {cardInterestFree ? "(sem juros)" : ""}
                        </span>
                      )}
                    </span>
                  </div>
                )}

                {acceptsCash && (
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <Banknote className="size-3.5 text-muted-foreground shrink-0" />
                    <span>Aceita dinheiro em espécie na entrega ou retirada presencial</span>
                  </div>
                )}
              </div>
            </div>

            {/* Seletor de Quantidade & Ações Diretas */}
            <div className="p-4 rounded-2xl bg-card border border-border/60 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-foreground block">Quantidade</span>
                  <span className="text-[11px] text-muted-foreground">Selecione para pedir agora</span>
                </div>

                {/* Controle Tátil - 1 + (Apple HIG >= 44px) */}
                <div className="flex items-center gap-2 border border-border/70 rounded-xl bg-background p-1 shadow-2xs">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={quantity <= 1}
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="size-9 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer disabled:opacity-30"
                    aria-label="Diminuir quantidade"
                  >
                    <Minus className="size-4" />
                  </Button>
                  <span className="w-8 text-center text-sm font-black font-mono text-foreground">
                    {quantity}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setQuantity((q) => q + 1)}
                    className="size-9 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                    aria-label="Aumentar quantidade"
                  >
                    <Plus className="size-4" />
                  </Button>
                </div>
              </div>

              {/* Subtotal Dinâmico */}
              {priceCents > 0 && (
                <div className="pt-2 border-t border-border/40 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Subtotal ({quantity} {quantity === 1 ? "item" : "itens"}):</span>
                  <div className="text-right">
                    <span className="text-base font-black font-mono text-foreground">
                      {formatMoney(subtotalCents)}
                    </span>
                    {acceptsPix && pixDiscountPercent > 0 && (
                      <span className="block text-[11px] text-emerald-600 dark:text-emerald-400 font-mono font-medium">
                        ou {formatMoney(pixSubtotalCents)} no Pix
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Botões de Ação Imediata */}
              <div className="space-y-2 pt-1">
                <Button
                  onClick={handleQuickOrder}
                  className="w-full h-12 rounded-xl text-xs sm:text-sm font-bold gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md cursor-pointer transition-all active:scale-[0.99]"
                >
                  <ShoppingBag className="size-4" />
                  <span>
                    Pedir Agora · {priceCents > 0 ? formatMoney(subtotalCents) : "Fazer Pedido"}
                  </span>
                </Button>

                {cleanPhone && (
                  <Button
                    onClick={handleQuickOrder}
                    variant="outline"
                    className="w-full h-10 rounded-xl text-xs font-semibold gap-1.5 border-border/70 hover:bg-muted/40 text-foreground cursor-pointer"
                  >
                    <MessageCircle className="size-3.5 text-emerald-600" />
                    <span>Pedir via WhatsApp Direto</span>
                  </Button>
                )}
              </div>
            </div>

            {/* Descrição & Especificações */}
            {description && (
              <div className="space-y-2 p-4 rounded-2xl bg-card border border-border/60">
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Detalhes do Produto
                </h3>
                <p className="text-xs text-foreground/80 leading-relaxed whitespace-pre-wrap">
                  {description}
                </p>
              </div>
            )}

            {/* Tabela Resumo de Conveniência */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 rounded-xl border border-border/50 bg-muted/20 space-y-0.5">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Temperatura</span>
                <p className="font-semibold text-foreground capitalize">
                  {temperature === "gelada" ? "🧊 Pronta / Gelada" : temperature}
                </p>
              </div>
              <div className="p-3 rounded-xl border border-border/50 bg-muted/20 space-y-0.5">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Disponibilidade</span>
                <p className="font-semibold text-foreground">
                  {readyDelivery ? "Em estoque para envio" : "Sob encomenda"}
                </p>
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* Floating Bottom Bar no Mobile (Thumb Zone Ergonomics) */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-background/95 backdrop-blur-md border-t border-border/60 p-3 shadow-lg flex items-center gap-3">
        <div className="min-w-0">
          <span className="text-[10px] text-muted-foreground block font-medium">Total ({quantity} un)</span>
          <span className="text-base font-black font-mono text-foreground truncate block">
            {priceCents > 0 ? formatMoney(subtotalCents) : "Sob Consulta"}
          </span>
        </div>
        <Button
          onClick={handleQuickOrder}
          className="flex-1 h-12 rounded-xl text-xs font-bold gap-2 bg-emerald-600 text-white hover:bg-emerald-700 shadow-md cursor-pointer ml-auto"
        >
          <ShoppingBag className="size-4" />
          <span>Pedir Agora</span>
        </Button>
      </div>
    </div>
  );
}
