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
  FileText,
} from "lucide-react";
import { formatMoney } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface ConveniencePreviewData {
  title: string;
  description?: string;
  priceCents?: number;
  images: string[];
  locationName?: string;
  whatsapp?: string;
  storeName?: string;
  storeSlug?: string;
  storeLogo?: string;
  volume?: string;
  unitType?: string; // "un" | "kg" | "g" | "L" | "ml" | "fardo" | "bandeja" | "pct"
  estimatedWeightPerUnit?: string; // ex: "~1.2kg"
  department?: string; // ex: "Açougue & Carnes", "Bebidas", "Hortifrúti"
  subCategory?: string; // ex: "Bovinos (Bifes)", "Cervejas"
  temperature?: "gelada" | "ambiente" | "congelado" | "resfriado" | "fresco" | "none" | string;
  isAlcoholic?: boolean;
  containsGluten?: boolean;
  containsLactose?: boolean;
  isOrganic?: boolean;
  brand?: string;
  barcodeEan?: string;
  ingredients?: string;
  nutritionalInfo?: string;
  prepOptions?: string[]; // ex: ["Bife fino", "Moído"]
  deliveryEstimate?: string;
  deliveryFeeCents?: number;
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
  const [selectedPrepOption, setSelectedPrepOption] = useState<string>("");

  // Estado do Checkout / Order Drawer
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [orderDeliveryMode, setOrderDeliveryMode] = useState<"immediate" | "scheduled" | "pickup">("immediate");
  const [orderScheduledWindow, setOrderScheduledWindow] = useState("today-afternoon");
  const [orderAddress, setOrderAddress] = useState("");
  const [orderPaymentMethod, setOrderPaymentMethod] = useState<"pix" | "card" | "cash">("pix");
  const [cashChangeFor, setCashChangeFor] = useState("");

  // Unificação de dados (Produção vs Prévia no Editor)
  const isPreview = !classified && !!previewData;
  const attrs = classified?.attributes || {};

  const title = previewData?.title || classified?.title || "Produto de Mercado / Conveniência";
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

  const storeName =
    previewData?.storeName ||
    classified?.store_name ||
    classified?.store?.name ||
    classified?.storeName ||
    "Loja Parceira";

  const storeSlug =
    previewData?.storeSlug ||
    classified?.store_slug ||
    classified?.store?.slug ||
    "";

  // Atributos de Varejo Alimentar / Supermercado / Açougue / Bebidas
  const volume = previewData?.volume || attrs.volume || attrs.specification_volume || "";
  const unitType = previewData?.unitType || attrs.unit_type || attrs.unit || (volume ? "" : "un");
  const estimatedWeightPerUnit = previewData?.estimatedWeightPerUnit || attrs.estimated_weight_per_unit || "";
  const department = previewData?.department || attrs.grocery_department || attrs.department || "Mercado & Conveniência";
  const subCategory = previewData?.subCategory || attrs.sub_category || attrs.subCategory || "";
  const temperature = previewData?.temperature || attrs.temperature || attrs.storage_temp || "ambiente";
  const isAlcoholic =
    previewData?.isAlcoholic !== undefined
      ? previewData.isAlcoholic
      : !!(attrs.is_alcoholic || attrs.contains_alcohol);
  const containsGluten =
    previewData?.containsGluten !== undefined
      ? previewData.containsGluten
      : attrs.contains_gluten;
  const containsLactose =
    previewData?.containsLactose !== undefined
      ? previewData.containsLactose
      : attrs.contains_lactose;
  const isOrganic =
    previewData?.isOrganic !== undefined
      ? previewData.isOrganic
      : !!attrs.is_organic;
  const brand = previewData?.brand || attrs.brand || attrs.manufacturer || "";
  const barcodeEan = previewData?.barcodeEan || attrs.barcode_ean || attrs.ean || "";
  const ingredients = previewData?.ingredients || attrs.ingredients || "";
  const prepOptions: string[] =
    previewData?.prepOptions ||
    (Array.isArray(attrs.prep_options) ? attrs.prep_options : []);

  // Frete & Logística
  const deliveryEstimate =
    previewData?.deliveryEstimate ||
    attrs.delivery_estimate ||
    "30 a 45 min";
  const deliveryFeeCents =
    previewData?.deliveryFeeCents !== undefined
      ? previewData.deliveryFeeCents
      : Number(attrs.delivery_fee_cents) || 500;
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

  // Frete final no modal de pedido
  const currentDeliveryFeeCents = orderDeliveryMode === "pickup" ? 0 : deliveryFeeCents;
  const currentOrderSubtotal = orderPaymentMethod === "pix" ? pixSubtotalCents : subtotalCents;
  const grandTotalCents = currentOrderSubtotal + currentDeliveryFeeCents;

  const installmentCents =
    maxInstallments >= 2 && effectivePriceCents > 0
      ? Math.round(effectivePriceCents / maxInstallments)
      : 0;

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

  const handleDirectWhatsApp = () => {
    if (isPreview) {
      toast.info("Esta é uma prévia ao vivo. O botão enviará o pedido para o comerciante.");
      return;
    }
    if (!cleanPhone) {
      toast.error("Comerciante sem WhatsApp cadastrado.");
      return;
    }

    const prepText = selectedPrepOption ? `\nOpção de Corte/Preparo: *${selectedPrepOption}*` : "";
    const msg = encodeURIComponent(
      `Olá, ${storeName}! Gostaria de pedir *${quantity}x ${title}* (${formatMoney(subtotalCents)})${prepText}\n` +
      `Local: ${locationName}\n` +
      `Poderiam me confirmar a disponibilidade para entrega?`
    );
    window.open(`https://wa.me/${cleanPhone.startsWith("55") ? cleanPhone : "55" + cleanPhone}?text=${msg}`, "_blank");
  };

  const handleConfirmOrder = () => {
    if (isPreview) {
      toast.info("Esta é uma prévia ao vivo do checkout. Pedido simulado com sucesso!");
      setIsOrderModalOpen(false);
      return;
    }

    if (orderDeliveryMode !== "pickup" && !orderAddress.trim()) {
      toast.error("Por favor, informe seu endereço de entrega.");
      return;
    }

    const selectedWindowObj = SCHEDULE_WINDOWS.find((w) => w.id === orderScheduledWindow);
    const deliveryText =
      orderDeliveryMode === "immediate"
        ? "🛵 Despacho Sob Demanda via MotoLink (30 a 45 min)"
        : orderDeliveryMode === "scheduled"
        ? `📅 Entrega Agendada: ${selectedWindowObj?.label || "Janela programada"}`
        : "🏬 Retirada Presencial no Balcão da Loja (R$ 0,00)";

    const paymentText =
      orderPaymentMethod === "pix"
        ? `📱 Pix à Vista (${pixDiscountPercent > 0 ? pixDiscountPercent + "% OFF" : "Normal"})`
        : orderPaymentMethod === "card"
        ? "💳 Cartão de Crédito/Débito na Entrega (levar maquininha)"
        : `💵 Dinheiro em Espécie${cashChangeFor ? ` (Troco para R$ ${cashChangeFor})` : " (Valor exato)"}`;

    const prepText = selectedPrepOption ? `\n• Preparo/Corte: *${selectedPrepOption}*` : "";
    const addressText = orderDeliveryMode !== "pickup" ? `\n• Endereço: *${orderAddress}*` : "";

    if (cleanPhone) {
      const msg = encodeURIComponent(
        `🛍️ *NOVO PEDIDO DE CONVENIÊNCIA / MERCADO*\n` +
        `Loja: *${storeName}*\n\n` +
        `• Item: *${quantity}x ${title}*\n` +
        `• Subtotal Itens: ${formatMoney(orderPaymentMethod === "pix" ? pixSubtotalCents : subtotalCents)}${prepText}\n` +
        `• Modalidade: ${deliveryText}\n` +
        `• Taxa de Entrega: ${formatMoney(currentDeliveryFeeCents)}${addressText}\n` +
        `• Forma de Pagamento: ${paymentText}\n\n` +
        `💰 *TOTAL DO PEDIDO: ${formatMoney(grandTotalCents)}*\n\n` +
        `Por favor, confirmem o recebimento do pedido!`
      );
      window.open(`https://wa.me/${cleanPhone.startsWith("55") ? cleanPhone : "55" + cleanPhone}?text=${msg}`, "_blank");
      setIsOrderModalOpen(false);
      toast.success("Pedido gerado! Redirecionando para o WhatsApp do lojista...");
    } else {
      setIsOrderModalOpen(false);
      toast.success("Pedido confirmado com sucesso!");
    }
  };

  const unitSuffix = volume ? volume : unitType === "kg" ? "kg" : unitType === "g" ? "g" : unitType === "L" ? "L" : unitType !== "un" ? unitType : "";

  // Componente Reutilizável: Metadados Textuais Sutis (Sem Badges Chunky, Sem Neon, Sem Emojis)
  const SubtleProductTags = () => (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap pt-0.5">
      {unitSuffix && <span className="font-semibold text-foreground/90">{unitSuffix}</span>}
      {temperature === "gelada" && (
        <>
          <span className="text-border">•</span>
          <span className="text-sky-600 dark:text-sky-400 font-medium">Gelada</span>
        </>
      )}
      {temperature === "resfriado" && (
        <>
          <span className="text-border">•</span>
          <span className="text-amber-600 dark:text-amber-400 font-medium">Resfriado</span>
        </>
      )}
      {temperature === "congelado" && (
        <>
          <span className="text-border">•</span>
          <span className="text-blue-600 dark:text-blue-400 font-medium">Congelado</span>
        </>
      )}
      {readyDelivery && (
        <>
          <span className="text-border">•</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-medium">Pronta Entrega</span>
        </>
      )}
      {isAlcoholic && (
        <>
          <span className="text-border">•</span>
          <span className="text-rose-600 dark:text-rose-400 font-semibold">+18 anos</span>
        </>
      )}
      {isOrganic && (
        <>
          <span className="text-border">•</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-medium">Orgânico</span>
        </>
      )}
    </div>
  );

  // Componente Reutilizável: Bloco de Preço e Condições de Pagamento
  const PricingBlock = () => (
    <div className="p-4 rounded-2xl bg-card border border-border/60 shadow-2xs space-y-2.5">
      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <div>
          <span className="text-2xl sm:text-3xl font-black text-foreground font-mono tracking-tight">
            {priceCents > 0 ? formatMoney(priceCents) : "Preço sob consulta"}
          </span>
          {unitSuffix && (
            <span className="text-xs text-muted-foreground ml-1 font-mono">
              / {unitSuffix}
            </span>
          )}
        </div>

        {acceptsPix && pixDiscountPercent > 0 && priceCents > 0 && (
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
            {pixDiscountPercent}% OFF no Pix
          </span>
        )}
      </div>

      {acceptsPix && pixDiscountPercent > 0 && priceCents > 0 && (
        <div className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
          <QrCode className="size-3.5" />
          <span>
            Sai por <strong>{formatMoney(pixPriceCents)}</strong> à vista no Pix
          </span>
        </div>
      )}

      <div className="pt-2 border-t border-border/40 text-xs text-muted-foreground space-y-1">
        {acceptsCard && (
          <div className="flex items-center gap-1.5">
            <CreditCard className="size-3.5 text-primary shrink-0" />
            <span>
              {maxInstallments === 1 ? (
                <span>Pagamento <strong>à vista</strong> no cartão</span>
              ) : (
                <span>
                  ou até <strong>{maxInstallments}x de {formatMoney(installmentCents)}</strong>{" "}
                  {cardInterestFree ? "(sem juros)" : ""}
                </span>
              )}
            </span>
          </div>
        )}

        {acceptsCash && (
          <div className="flex items-center gap-1.5 text-[11px]">
            <Banknote className="size-3.5 text-muted-foreground shrink-0" />
            <span>Aceita dinheiro em espécie com troco</span>
          </div>
        )}
      </div>
    </div>
  );

  // Componente Reutilizável: Linha Compacta de Entrega
  const DeliveryEstimateLine = () => (
    <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/60 text-xs">
      <div className="flex items-center gap-2 text-foreground min-w-0">
        <Truck className="size-4 text-primary shrink-0" />
        <div className="truncate">
          <span className="font-semibold">Entrega local</span>
          <span className="text-muted-foreground ml-1">a partir de {formatMoney(deliveryFeeCents)}</span>
          <span className="text-muted-foreground text-[11px] block">• Estimativa {deliveryEstimate}</span>
        </div>
      </div>
      <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md shrink-0">
        Retirada grátis
      </span>
    </div>
  );

  return (
    <div className="w-full bg-background text-foreground antialiased pb-28 sm:pb-16">
      {/* Top Header com Botão de Voltar, Compartilhar e Botão Leve de Editar (Sem faixa amarela invasiva!) */}
      <header className="sticky top-0 z-30 bg-background/85 backdrop-blur-md border-b border-border/40 px-3 sm:px-6 h-12 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          {!isPreview ? (
            <Button asChild variant="ghost" size="icon" className="size-8 rounded-full shrink-0">
              <Link to="/mercado">
                <ArrowLeft className="size-4" />
                <span className="sr-only">Voltar ao Mercado</span>
              </Link>
            </Button>
          ) : (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-primary shrink-0">
              <Zap className="size-3.5" />
              <span>Prévia Mercado</span>
            </div>
          )}
          <span className="text-xs font-medium text-muted-foreground truncate flex items-center gap-1">
            <MapPin className="size-3 text-muted-foreground/80 shrink-0" />
            <span className="truncate">{locationName}</span>
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Botão de Edição Leve e Discreto (Substitui a faixa amarela invasiva anterior!) */}
          {isOwner && onEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={onEdit}
              className="h-8 px-2.5 rounded-full text-xs font-medium text-muted-foreground hover:text-foreground gap-1.5 border-border/60 bg-background/60 hover:bg-muted cursor-pointer"
            >
              <Edit3 className="size-3.5" />
              <span className="hidden sm:inline">Editar</span>
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={handleShare}
            className="size-8 rounded-full text-muted-foreground hover:text-foreground cursor-pointer"
            title="Compartilhar Produto"
          >
            <Share2 className="size-4" />
          </Button>
        </div>
      </header>

      {/* Container Principal: Desktop em 2 Colunas | Mobile em Ordem Sequencial Natural */}
      <main className="max-w-5xl mx-auto px-0 sm:px-6 pt-0 sm:pt-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-0 sm:gap-8 items-start">
          
          {/* ═══════════════════════════════════════════════════════════════════
              COLUNA 1 (ESQUERDA - MD: 7 COLUNAS):
              1. FOTO PRINCIPAL LIMPA (SEM BADGES NEON, SEM EMOJIS, FULL-BLEED NO MOBILE)
              2. MINIATURAS
              [NO MOBILE: HEADER DO PRODUTO + PREÇO AQUI LOGO APÓS A FOTO]
              3. DETALHES DO PRODUTO (DESCRIÇÃO)
              4. ESPECIFICAÇÕES TÉCNICAS E ATRIBUTOS
             ═══════════════════════════════════════════════════════════════════ */}
          <div className="md:col-span-7 space-y-4 sm:space-y-6">
            
            {/* Box da Foto: Grande, sem container sufocante, limpo */}
            <div className="space-y-2 sm:space-y-3">
              <div className="relative aspect-square sm:aspect-4/3 w-full rounded-none sm:rounded-2xl overflow-hidden bg-muted/15 border-b sm:border border-border/50 flex items-center justify-center shadow-none sm:shadow-2xs group">
                {images.length > 0 ? (
                  <img
                    src={images[activePhotoIdx] || images[0]}
                    alt={title}
                    className="w-full h-full object-contain p-2 sm:p-6 transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground p-8 text-center">
                    <ShoppingBag className="size-12 stroke-[1.2] text-primary/40" />
                    <p className="text-xs">Foto do produto</p>
                  </div>
                )}
              </div>

              {/* Galeria de Miniaturas (se houver mais de 1 foto) */}
              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto no-scrollbar px-3 sm:px-0 pb-1">
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
            </div>

            {/* ═════════════════════════════════════════════════════════════════
                BLOCO DE CABEÇALHO DO PRODUTO NO MOBILE (MD:HIDDEN)
                Aparece imediatamente abaixo da foto no smartphone!
               ═════════════════════════════════════════════════════════════════ */}
            <div className="md:hidden px-3.5 space-y-3.5">
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
                  <span className="font-semibold text-foreground/90">{storeName}</span>
                  <span>•</span>
                  <span>{department}</span>
                </div>

                <h1 className="text-xl font-black text-foreground tracking-tight leading-tight">
                  {title}
                </h1>

                {/* Tags Sutis Textuais abaixo do título (Sem neon, sem badges) */}
                <SubtleProductTags />
              </div>

              {/* Bloco de Preço no Mobile */}
              <PricingBlock />

              {/* Linha Compacta de Entrega no Mobile */}
              <DeliveryEstimateLine />

              {/* Seletor de Opções de Preparo / Corte se configurado */}
              {prepOptions && prepOptions.length > 0 && (
                <div className="p-3 rounded-2xl bg-card border border-border/60 shadow-2xs space-y-1.5">
                  <Label className="text-xs font-bold text-foreground block">
                    Opção de Corte / Preparo:
                  </Label>
                  <div className="flex flex-wrap gap-1.5">
                    {prepOptions.map((opt) => {
                      const isSelected = selectedPrepOption === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setSelectedPrepOption(isSelected ? "" : opt)}
                          className={cn(
                            "px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer",
                            isSelected
                              ? "bg-primary text-primary-foreground border-primary font-bold shadow-xs"
                              : "bg-background text-muted-foreground border-border/70 hover:text-foreground hover:bg-muted/40"
                          )}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* ─────────────────────────────────────────────────────────────
                SEÇÃO: DETALHES DO PRODUTO (DESCRIÇÃO SEMPRE ABAIXO DA FOTO)
               ───────────────────────────────────────────────────────────── */}
            {description && (
              <div className="mx-3.5 sm:mx-0 p-4 sm:p-6 rounded-2xl bg-card border border-border/60 shadow-2xs space-y-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                  <FileText className="size-4 text-primary" />
                  <span>Detalhes do Produto</span>
                </h2>
                <div className="text-sm text-foreground/85 leading-relaxed whitespace-pre-wrap">
                  {description}
                </div>
              </div>
            )}

            {/* ─────────────────────────────────────────────────────────────
                SEÇÃO: ESPECIFICAÇÕES TÉCNICAS E TABELA DE ATRIBUTOS
               ───────────────────────────────────────────────────────────── */}
            <div className="mx-3.5 sm:mx-0 p-4 sm:p-6 rounded-2xl bg-card border border-border/60 shadow-2xs space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                <CheckCircle2 className="size-4 text-primary" />
                <span>Especificações & Características</span>
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                {brand && (
                  <div className="p-3 rounded-xl border border-border/50 bg-muted/20 space-y-0.5">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Marca</span>
                    <p className="font-semibold text-foreground truncate">{brand}</p>
                  </div>
                )}

                <div className="p-3 rounded-xl border border-border/50 bg-muted/20 space-y-0.5">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Departamento</span>
                  <p className="font-semibold text-foreground truncate">{department}</p>
                </div>

                {unitSuffix && (
                  <div className="p-3 rounded-xl border border-border/50 bg-muted/20 space-y-0.5">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Conteúdo / Peso</span>
                    <p className="font-semibold text-foreground truncate font-mono">{unitSuffix}</p>
                  </div>
                )}

                {estimatedWeightPerUnit && (
                  <div className="p-3 rounded-xl border border-border/50 bg-muted/20 space-y-0.5">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Peso Aprox. Peça</span>
                    <p className="font-semibold text-foreground truncate font-mono">{estimatedWeightPerUnit}</p>
                  </div>
                )}

                <div className="p-3 rounded-xl border border-border/50 bg-muted/20 space-y-0.5">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Conservação</span>
                  <p className="font-semibold text-foreground capitalize">
                    {temperature === "gelada"
                      ? "Gelada / Imediata"
                      : temperature === "resfriado"
                      ? "Resfriado (0° a 4°C)"
                      : temperature === "congelado"
                      ? "Congelado (-18°C)"
                      : "Ambiente / Seco"}
                  </p>
                </div>

                <div className="p-3 rounded-xl border border-border/50 bg-muted/20 space-y-0.5">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Disponibilidade</span>
                  <p className="font-semibold text-foreground">
                    {readyDelivery ? "Em estoque para envio" : "Sob encomenda"}
                  </p>
                </div>

                {barcodeEan && (
                  <div className="p-3 rounded-xl border border-border/50 bg-muted/20 space-y-0.5">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Código EAN</span>
                    <p className="font-semibold text-foreground font-mono truncate">{barcodeEan}</p>
                  </div>
                )}

                {containsGluten !== undefined && (
                  <div className="p-3 rounded-xl border border-border/50 bg-muted/20 space-y-0.5">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Glúten</span>
                    <p className="font-semibold text-foreground">
                      {containsGluten ? "Contém Glúten" : "Sem Glúten"}
                    </p>
                  </div>
                )}

                {containsLactose !== undefined && (
                  <div className="p-3 rounded-xl border border-border/50 bg-muted/20 space-y-0.5">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Lactose</span>
                    <p className="font-semibold text-foreground">
                      {containsLactose ? "Contém Lactose" : "Sem Lactose"}
                    </p>
                  </div>
                )}
              </div>

              {ingredients && (
                <div className="pt-2 border-t border-border/40 space-y-1">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Ingredientes / Composição:</span>
                  <p className="text-xs text-foreground/80 leading-relaxed">{ingredients}</p>
                </div>
              )}
            </div>

            {/* Aviso Legal Regulatório */}
            {isAlcoholic && (
              <div className="mx-3.5 sm:mx-0 p-3.5 rounded-xl border border-rose-500/20 bg-rose-500/5 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-400">
                <Info className="size-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Aviso Regulatório — Venda Restrita</p>
                  <p className="text-[11px] opacity-90 leading-relaxed">
                    Venda e consumo proibidos para menores de 18 anos. Beba com moderação. Se beber, não dirija.
                  </p>
                </div>
              </div>
            )}

            {/* Card da Loja no Mobile */}
            <div className="md:hidden mx-3.5 p-3.5 rounded-2xl border border-border/60 bg-muted/15 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                    <Store className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">{storeName}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{locationName}</p>
                  </div>
                </div>

                {storeSlug && !isPreview && (
                  <Button asChild variant="ghost" size="sm" className="h-7 text-[11px] text-primary hover:text-primary gap-1">
                    <Link to={`/loja/${storeSlug}`}>
                      <span>Ver Loja</span>
                      <ExternalLink className="size-3" />
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════
              COLUNA 2 (DIREITA - APENAS DESKTOP: MD:BLOCK):
              1. BREADCRUMBS & MARCA
              2. TÍTULO DO PRODUTO
              3. TAGS SUTIS TEXTUAIS
              4. BLOCO DE PREÇO & PIX / PARCELAMENTO
              5. LINHA DISCRETA DE ENTREGA (1 LINHA COMPACTA)
              6. SELETOR DE PREPARO/CORTE (SE HOUVER)
              7. QUANTIDADE & SUBTOTAL
              8. BOTÃO PEDIR AGORA (ABRE O CHECKOUT DRAWER)
              9. CARD DA LOJA
             ═══════════════════════════════════════════════════════════════════ */}
          <div className="hidden md:block md:col-span-5 space-y-4 md:sticky md:top-16">
            
            {/* Header de Categoria / Loja */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
                <span className="font-semibold text-foreground/90">{storeName}</span>
                <span>•</span>
                <span>{department}</span>
              </div>

              <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight leading-tight">
                {title}
              </h1>

              {/* Tags Sutis Textuais abaixo do título no desktop */}
              <SubtleProductTags />
            </div>

            {/* Bloco de Preço no Desktop */}
            <PricingBlock />

            {/* Linha Compacta de Entrega no Desktop */}
            <DeliveryEstimateLine />

            {/* Seletor de Opções de Preparo / Corte (Açougue / Padaria) se configurado */}
            {prepOptions && prepOptions.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-card border border-border/60 shadow-2xs space-y-2">
                <Label className="text-xs font-bold text-foreground block">
                  Opção de Corte / Preparo:
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {prepOptions.map((opt) => {
                    const isSelected = selectedPrepOption === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setSelectedPrepOption(isSelected ? "" : opt)}
                        className={cn(
                          "px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer",
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary font-bold shadow-xs"
                            : "bg-background text-muted-foreground border-border/70 hover:text-foreground hover:bg-muted/40"
                        )}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Seletor de Quantidade & Ações de Compra */}
            <div className="p-4 rounded-2xl bg-card border border-border/60 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-foreground block">Quantidade</span>
                  <span className="text-[11px] text-muted-foreground">Adicione ao seu pedido</span>
                </div>

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

              {priceCents > 0 && (
                <div className="pt-2 border-t border-border/40 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Subtotal ({quantity} {quantity === 1 ? "un" : "itens"}):</span>
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

              <div className="space-y-2 pt-1">
                <Button
                  onClick={() => setIsOrderModalOpen(true)}
                  className="w-full h-12 rounded-xl text-xs sm:text-sm font-bold gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md cursor-pointer transition-all active:scale-[0.99]"
                >
                  <ShoppingBag className="size-4" />
                  <span>
                    Pedir Agora · {priceCents > 0 ? formatMoney(subtotalCents) : "Fazer Pedido"}
                  </span>
                </Button>

                {cleanPhone && (
                  <Button
                    onClick={handleDirectWhatsApp}
                    variant="outline"
                    className="w-full h-10 rounded-xl text-xs font-semibold gap-1.5 border-border/70 hover:bg-muted/40 text-foreground cursor-pointer"
                  >
                    <MessageCircle className="size-3.5 text-emerald-600" />
                    <span>Pedir via WhatsApp Direto</span>
                  </Button>
                )}
              </div>
            </div>

            {/* Card Resumo da Loja no Desktop */}
            <div className="p-3.5 rounded-2xl border border-border/60 bg-muted/15 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                    <Store className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">{storeName}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{locationName}</p>
                  </div>
                </div>

                {storeSlug && !isPreview && (
                  <Button asChild variant="ghost" size="sm" className="h-7 text-[11px] text-primary hover:text-primary gap-1">
                    <Link to={`/loja/${storeSlug}`}>
                      <span>Ver Loja</span>
                      <ExternalLink className="size-3" />
                    </Link>
                  </Button>
                )}
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* ═══════════════════════════════════════════════════════════════════════
          FLOATING BOTTOM BAR NO MOBILE (THUMB ZONE ERGONOMICS)
         ═══════════════════════════════════════════════════════════════════════ */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-background/95 backdrop-blur-md border-t border-border/60 p-3 shadow-lg flex items-center gap-3">
        <div className="flex items-center border border-border/70 rounded-xl bg-card p-0.5 shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={quantity <= 1}
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="size-8 rounded-lg text-muted-foreground disabled:opacity-30"
          >
            <Minus className="size-3.5" />
          </Button>
          <span className="w-6 text-center text-xs font-black font-mono">
            {quantity}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setQuantity((q) => q + 1)}
            className="size-8 rounded-lg text-muted-foreground"
          >
            <Plus className="size-3.5" />
          </Button>
        </div>

        <div className="min-w-0 flex-1">
          <span className="text-[10px] text-muted-foreground block font-medium truncate">
            Total ({quantity} un)
          </span>
          <span className="text-sm font-black font-mono text-foreground truncate block">
            {priceCents > 0 ? formatMoney(subtotalCents) : "Sob Consulta"}
          </span>
        </div>

        <Button
          onClick={() => setIsOrderModalOpen(true)}
          className="h-11 px-4 rounded-xl text-xs font-bold gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700 shadow-md cursor-pointer shrink-0"
        >
          <ShoppingBag className="size-4" />
          <span>Pedir Agora</span>
        </Button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL / SHEET DE FINALIZAÇÃO DE PEDIDO (CHECKOUT DE CONVENIÊNCIA)
         ═══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={isOrderModalOpen} onOpenChange={setIsOrderModalOpen}>
        <DialogContent className="max-w-lg p-0 overflow-hidden rounded-2xl sm:rounded-3xl border border-border">
          <DialogHeader className="p-4 sm:p-5 border-b border-border/50 bg-muted/20">
            <DialogTitle className="text-base sm:text-lg font-black text-foreground flex items-center gap-2">
              <ShoppingBag className="size-5 text-primary" />
              <span>Finalizar Pedido</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Revise o item, selecione o tipo de recebimento e finalize com a loja.
            </DialogDescription>
          </DialogHeader>

          <div className="p-4 sm:p-5 space-y-4 max-h-[75vh] overflow-y-auto">
            {/* Resumo do Item */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/60">
              {images[0] ? (
                <img src={images[0]} alt={title} className="size-14 rounded-lg object-contain bg-muted/30 p-1 border shrink-0" />
              ) : (
                <div className="size-14 rounded-lg bg-muted/40 flex items-center justify-center shrink-0">
                  <ShoppingBag className="size-6 text-muted-foreground/50" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-foreground truncate">{title}</p>
                <p className="text-[11px] text-muted-foreground">
                  {quantity}x de {formatMoney(effectivePriceCents)} {unitSuffix ? `(${unitSuffix})` : ""}
                </p>
                {selectedPrepOption && (
                  <p className="text-[10px] text-primary font-medium mt-0.5">
                    Preparo: {selectedPrepOption}
                  </p>
                )}
              </div>
              <span className="text-xs font-black font-mono text-foreground shrink-0">
                {formatMoney(subtotalCents)}
              </span>
            </div>

            {/* Opções de Recebimento */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-foreground flex items-center justify-between">
                <span>Forma de Recebimento</span>
                <span className="text-[11px] font-medium text-muted-foreground">
                  {orderDeliveryMode === "pickup" ? "Sem taxa de frete" : `Taxa: ${formatMoney(deliveryFeeCents)}`}
                </span>
              </Label>

              <div className="grid grid-cols-3 gap-1.5 p-1 bg-muted/30 rounded-xl border border-border/50">
                <button
                  type="button"
                  onClick={() => setOrderDeliveryMode("immediate")}
                  className={cn(
                    "py-2 px-1 text-center rounded-lg font-semibold text-xs transition-all cursor-pointer",
                    orderDeliveryMode === "immediate"
                      ? "bg-background text-foreground shadow-2xs font-bold ring-1 ring-border/80"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Sob Demanda
                </button>
                <button
                  type="button"
                  onClick={() => setOrderDeliveryMode("scheduled")}
                  className={cn(
                    "py-2 px-1 text-center rounded-lg font-semibold text-xs transition-all cursor-pointer",
                    orderDeliveryMode === "scheduled"
                      ? "bg-background text-foreground shadow-2xs font-bold ring-1 ring-border/80"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Agendar
                </button>
                <button
                  type="button"
                  onClick={() => setOrderDeliveryMode("pickup")}
                  className={cn(
                    "py-2 px-1 text-center rounded-lg font-semibold text-xs transition-all cursor-pointer",
                    orderDeliveryMode === "pickup"
                      ? "bg-background text-foreground shadow-2xs font-bold ring-1 ring-border/80"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Retirar
                </button>
              </div>

              {orderDeliveryMode === "immediate" && (
                <div className="p-3 rounded-xl bg-muted/20 border border-border/40 text-xs space-y-1">
                  <p className="font-semibold text-foreground flex items-center gap-1.5">
                    <Clock3 className="size-3.5 text-primary" />
                    <span>Despacho Sob Demanda via MotoLink</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    A loja prepara o pedido e aloca o entregador autônomo assim que confirmado ({deliveryEstimate}).
                  </p>
                </div>
              )}

              {orderDeliveryMode === "scheduled" && (
                <div className="p-3 rounded-xl bg-muted/20 border border-border/40 space-y-2">
                  <Label className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                    <Calendar className="size-3.5 text-primary" />
                    <span>Selecione o Melhor Horário</span>
                  </Label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {SCHEDULE_WINDOWS.map((win) => (
                      <button
                        key={win.id}
                        type="button"
                        onClick={() => setOrderScheduledWindow(win.id)}
                        className={cn(
                          "p-2 rounded-lg text-xs font-medium border text-left cursor-pointer transition-all",
                          orderScheduledWindow === win.id
                            ? "bg-primary/10 border-primary text-primary font-bold"
                            : "bg-background border-border/60 text-foreground/80 hover:bg-muted/40"
                        )}
                      >
                        {win.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {orderDeliveryMode === "pickup" && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs space-y-1 text-emerald-800 dark:text-emerald-300">
                  <p className="font-semibold flex items-center gap-1.5">
                    <Store className="size-3.5" />
                    <span>Retirada no Balcão da Loja (Taxa Grátis)</span>
                  </p>
                  <p className="text-[11px] opacity-90">
                    O pedido fica reservado para você retirar em: <strong>{locationName}</strong>.
                  </p>
                </div>
              )}

              {orderDeliveryMode !== "pickup" && (
                <div className="space-y-1.5 pt-1">
                  <Label className="text-xs font-semibold text-foreground">
                    Endereço de Entrega & Referência *
                  </Label>
                  <Input
                    value={orderAddress}
                    onChange={(e) => setOrderAddress(e.target.value)}
                    placeholder="Rua, número, bairro e ponto de referência"
                    className="h-11 rounded-xl text-xs bg-background"
                  />
                </div>
              )}
            </div>

            {/* Forma de Pagamento */}
            <div className="space-y-2 pt-1">
              <Label className="text-xs font-bold text-foreground">
                Forma de Pagamento
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {acceptsPix && (
                  <button
                    type="button"
                    onClick={() => setOrderPaymentMethod("pix")}
                    className={cn(
                      "p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 min-h-[58px]",
                      orderPaymentMethod === "pix"
                        ? "border-emerald-600 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold"
                        : "border-border/60 bg-background text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <QrCode className="size-4" />
                    <span className="text-xs">Pix</span>
                    {pixDiscountPercent > 0 && (
                      <span className="text-[9px] font-bold text-emerald-600 bg-emerald-500/20 px-1 rounded">
                        -{pixDiscountPercent}%
                      </span>
                    )}
                  </button>
                )}

                {acceptsCard && (
                  <button
                    type="button"
                    onClick={() => setOrderPaymentMethod("card")}
                    className={cn(
                      "p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 min-h-[58px]",
                      orderPaymentMethod === "card"
                        ? "border-primary bg-primary/10 text-primary font-bold"
                        : "border-border/60 bg-background text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <CreditCard className="size-4" />
                    <span className="text-xs">Cartão</span>
                    <span className="text-[9px] text-muted-foreground">Na entrega</span>
                  </button>
                )}

                {acceptsCash && (
                  <button
                    type="button"
                    onClick={() => setOrderPaymentMethod("cash")}
                    className={cn(
                      "p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 min-h-[58px]",
                      orderPaymentMethod === "cash"
                        ? "border-amber-600 bg-amber-500/10 text-amber-700 dark:text-amber-300 font-bold"
                        : "border-border/60 bg-background text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Banknote className="size-4" />
                    <span className="text-xs">Dinheiro</span>
                    <span className="text-[9px] text-muted-foreground">Espécie</span>
                  </button>
                )}
              </div>

              {orderPaymentMethod === "cash" && (
                <div className="space-y-1 pt-1">
                  <Label className="text-[11px] text-muted-foreground">
                    Precisa de troco para quanto? (Opcional)
                  </Label>
                  <Input
                    value={cashChangeFor}
                    onChange={(e) => setCashChangeFor(e.target.value)}
                    placeholder="Ex: R$ 50 ou R$ 100"
                    className="h-10 rounded-xl text-xs bg-background"
                  />
                </div>
              )}
            </div>

            {/* Discriminativo Financeiro */}
            <div className="p-3 rounded-xl bg-muted/30 border border-border/50 space-y-1.5 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal dos Itens:</span>
                <span className="font-mono font-medium">{formatMoney(subtotalCents)}</span>
              </div>
              {orderPaymentMethod === "pix" && pixDiscountPercent > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium">
                  <span>Desconto no Pix ({pixDiscountPercent}%):</span>
                  <span className="font-mono">-{formatMoney(subtotalCents - pixSubtotalCents)}</span>
                </div>
              )}
              <div className="flex justify-between text-muted-foreground">
                <span>Taxa de Entrega:</span>
                <span className="font-mono font-medium">
                  {orderDeliveryMode === "pickup" ? "Grátis (R$ 0,00)" : formatMoney(deliveryFeeCents)}
                </span>
              </div>
              <div className="pt-1.5 border-t border-border/50 flex justify-between items-baseline text-sm font-bold text-foreground">
                <span>Total a Pagar:</span>
                <span className="text-base font-black font-mono text-emerald-600 dark:text-emerald-400">
                  {formatMoney(grandTotalCents)}
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-5 border-t border-border/50 bg-card flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setIsOrderModalOpen(false)}
              className="h-11 rounded-xl text-xs font-semibold"
            >
              Voltar
            </Button>
            <Button
              onClick={handleConfirmOrder}
              className="flex-1 h-11 rounded-xl text-xs sm:text-sm font-bold gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md cursor-pointer"
            >
              <ShoppingBag className="size-4" />
              <span>Confirmar Pedido · {formatMoney(grandTotalCents)}</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
