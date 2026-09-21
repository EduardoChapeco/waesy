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
  Flame,
  Apple,
  Croissant,
  Milk,
  Wine,
  Snowflake,
  FileText,
  Tag,
  Scale,
  Barcode,
  HelpCircle,
  X,
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

  // Atributos Especializados de Varejo Alimentar / Supermercado / Açougue / Bebidas
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
      : Number(attrs.delivery_fee_cents) || 500; // R$ 5,00 padrão
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

  // Parcelamento no cartão
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

  // Texto formatado de unidade/volume para exibir no preço
  const unitSuffix = volume ? volume : unitType === "kg" ? "kg" : unitType === "g" ? "g" : unitType === "L" ? "L" : unitType !== "un" ? unitType : "";

  return (
    <div className="w-full bg-background text-foreground antialiased pb-28 sm:pb-16">
      {/* Banner de Modo Proprietário */}
      {isOwner && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 flex items-center justify-between text-xs text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="font-semibold">Modo Proprietário · Produto de Mercado & Conveniência</span>
          </div>
          {onEdit && (
            <Button
              size="sm"
              variant="outline"
              onClick={onEdit}
              className="h-7 text-xs gap-1 rounded-lg border-amber-500/30 bg-background/80 hover:bg-amber-500/15 cursor-pointer"
            >
              <Edit3 className="size-3" />
              <span>Editar Produto</span>
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
                <span className="sr-only">Voltar ao Mercado</span>
              </Link>
            </Button>
          ) : (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
              <Zap className="size-3.5" />
              <span>Prévia Mercado & Conveniência</span>
            </div>
          )}
          <span className="text-xs font-medium text-muted-foreground truncate max-w-[200px] sm:max-w-xs flex items-center gap-1">
            <MapPin className="size-3 text-muted-foreground/80 shrink-0" />
            <span className="truncate">{locationName}</span>
          </span>
        </div>

        <div className="flex items-center gap-1">
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
      <main className="max-w-5xl mx-auto px-3 sm:px-6 pt-4 sm:pt-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          
          {/* ═══════════════════════════════════════════════════════════════════
              COLUNA 1 (ESQUERDA - MD: 7 COLUNAS):
              1. FOTO PRINCIPAL & BADGES
              2. MINIATURAS
              3. DETALHES DO PRODUTO (SEMPRE ABAIXO DA FOTO)
              4. ESPECIFICAÇÕES TÉCNICAS E ATRIBUTOS DE MERCADO
             ═══════════════════════════════════════════════════════════════════ */}
          <div className="md:col-span-7 space-y-6">
            
            {/* Box da Foto */}
            <div className="space-y-3">
              <div className="relative aspect-square sm:aspect-4/3 w-full rounded-2xl overflow-hidden bg-muted/30 border border-border/60 flex items-center justify-center shadow-2xs group">
                {images.length > 0 ? (
                  <img
                    src={images[activePhotoIdx] || images[0]}
                    alt={title}
                    className="w-full h-full object-contain p-4 sm:p-6 transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground p-8 text-center">
                    <ShoppingBag className="size-12 stroke-[1.2] text-primary/40" />
                    <p className="text-xs">Foto do produto</p>
                  </div>
                )}

                {/* Badges Flutuantes Superiores Esquerdos */}
                <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 pointer-events-none">
                  {unitSuffix && (
                    <Badge className="bg-background/90 text-foreground backdrop-blur-md border border-border/70 text-[11px] font-bold px-2 py-0.5 shadow-2xs">
                      {unitSuffix}
                    </Badge>
                  )}
                  {temperature === "gelada" && (
                    <Badge className="bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 backdrop-blur-md border border-cyan-500/30 text-[10px] font-bold px-2 py-0.5">
                      🧊 Gelada
                    </Badge>
                  )}
                  {temperature === "resfriado" && (
                    <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 backdrop-blur-md border border-amber-500/30 text-[10px] font-bold px-2 py-0.5">
                      🥩 Resfriado
                    </Badge>
                  )}
                  {temperature === "congelado" && (
                    <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 backdrop-blur-md border border-blue-500/30 text-[10px] font-bold px-2 py-0.5">
                      ❄️ Congelado
                    </Badge>
                  )}
                  {isOrganic && (
                    <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 backdrop-blur-md border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5">
                      🌱 Orgânico
                    </Badge>
                  )}
                </div>

                {/* Badges Flutuantes Superiores Direitos */}
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
            </div>

            {/* ─────────────────────────────────────────────────────────────
                SEÇÃO: DETALHES DO PRODUTO (SEMPRE ABAIXO DA FOTO)
               ───────────────────────────────────────────────────────────── */}
            {description && (
              <div className="p-4 sm:p-6 rounded-2xl bg-card border border-border/60 shadow-2xs space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                  <FileText className="size-4 text-primary" />
                  <span>Detalhes do Produto</span>
                </h3>
                <div className="text-sm text-foreground/85 leading-relaxed whitespace-pre-wrap">
                  {description}
                </div>
              </div>
            )}

            {/* ─────────────────────────────────────────────────────────────
                SEÇÃO: ESPECIFICAÇÕES TÉCNICAS E TABELA DE ATRIBUTOS
               ───────────────────────────────────────────────────────────── */}
            <div className="p-4 sm:p-6 rounded-2xl bg-card border border-border/60 shadow-2xs space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                <CheckCircle2 className="size-4 text-primary" />
                <span>Especificações & Características</span>
              </h3>

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
                      ? "🧊 Gelada / Imediata"
                      : temperature === "resfriado"
                      ? "🥩 Resfriado (0° a 4°C)"
                      : temperature === "congelado"
                      ? "❄️ Congelado (-18°C)"
                      : "☀️ Ambiente / Seco"}
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
                      {containsGluten ? "Contém Glúten" : "Sem Glúten (Gluten-Free)"}
                    </p>
                  </div>
                )}

                {containsLactose !== undefined && (
                  <div className="p-3 rounded-xl border border-border/50 bg-muted/20 space-y-0.5">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Lactose</span>
                    <p className="font-semibold text-foreground">
                      {containsLactose ? "Contém Lactose" : "Sem Lactose (Zero Lactose)"}
                    </p>
                  </div>
                )}
              </div>

              {/* Ingredientes adicionais se preenchido */}
              {ingredients && (
                <div className="pt-2 border-t border-border/40 space-y-1">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Ingredientes / Composição:</span>
                  <p className="text-xs text-foreground/80 leading-relaxed">{ingredients}</p>
                </div>
              )}
            </div>

            {/* Aviso Legal Alcoólico */}
            {isAlcoholic && (
              <div className="p-3.5 rounded-xl border border-rose-500/20 bg-rose-500/5 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-400">
                <Info className="size-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Aviso Regulatório — Venda Restrita</p>
                  <p className="text-[11px] opacity-90 leading-relaxed">
                    Venda e consumo proibidos para menores de 18 anos (Lei 8.069/1990). Beba com moderação. Se beber, não dirija.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* ═══════════════════════════════════════════════════════════════════
              COLUNA 2 (DIREITA - MD: 5 COLUNAS):
              1. BREADCRUMBS & MARCA
              2. TÍTULO DO PRODUTO
              3. BLOCO DE PREÇO & PIX / PARCELAMENTO
              4. LINHA DISCRETA DE ENTREGA (1 LINHA COMPACTA)
              5. SELETOR DE PREPARO/CORTE (SE HOUVER)
              6. QUANTIDADE & SUBTOTAL
              7. BOTÃO PEDIR AGORA (ABRE O CHECKOUT DRAWER)
              8. CARD DA LOJA
             ═══════════════════════════════════════════════════════════════════ */}
          <div className="md:col-span-5 space-y-4 md:sticky md:top-16">
            
            {/* Header de Categoria / Loja */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
                <span className="font-semibold text-foreground/90">{storeName}</span>
                <span>•</span>
                <span>{department}</span>
                {unitSuffix && (
                  <>
                    <span>•</span>
                    <span className="font-mono">{unitSuffix}</span>
                  </>
                )}
              </div>

              <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight leading-tight">
                {title}
              </h1>

              {isAlcoholic && (
                <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                  <Info className="size-3" />
                  <span>Venda proibida para menores de 18 anos.</span>
                </p>
              )}
            </div>

            {/* Bloco de Preço & Condições de Pagamento */}
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

                {/* Badge Desconto Pix */}
                {acceptsPix && pixDiscountPercent > 0 && priceCents > 0 && (
                  <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-xs font-bold px-2 py-0.5 gap-1">
                    <BadgePercent className="size-3.5" />
                    <span>{pixDiscountPercent}% OFF no Pix</span>
                  </Badge>
                )}
              </div>

              {/* Preço com Desconto Pix */}
              {acceptsPix && pixDiscountPercent > 0 && priceCents > 0 && (
                <div className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                  <QrCode className="size-3.5" />
                  <span>
                    Sai por <strong>{formatMoney(pixPriceCents)}</strong> à vista no Pix
                  </span>
                </div>
              )}

              {/* Condições de Cartão & Espécie */}
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

            {/* ─────────────────────────────────────────────────────────────
                LINHA COMPACTA E DISCRETA DE ENTREGA (PADRÃO IFOOD / MERCADO)
                Nunca mais um card gigante com abas tomando espaço aqui!
               ───────────────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/60 text-xs">
              <div className="flex items-center gap-2 text-foreground min-w-0">
                <Truck className="size-4 text-primary shrink-0" />
                <div className="truncate">
                  <span className="font-semibold">Entrega local</span>
                  <span className="text-muted-foreground ml-1">a partir de {formatMoney(deliveryFeeCents)}</span>
                  <span className="text-muted-foreground text-[11px] block">• Estimativa {deliveryEstimate}</span>
                </div>
              </div>
              <Badge variant="outline" className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10 shrink-0">
                Retirada grátis
              </Badge>
            </div>

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

              {/* Botões de Ação Imediata */}
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

            {/* Card Resumo da Loja / Vendedor */}
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
          Alvo mínimo de 44px, seletor compacto e botão direto
         ═══════════════════════════════════════════════════════════════════════ */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-background/95 backdrop-blur-md border-t border-border/60 p-3 shadow-lg flex items-center gap-3">
        {/* Seletor Compacto no Mobile */}
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
          Abre ao clicar em "Pedir Agora" com todas as opções e totalização
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

              {/* Detalhes da Modalidade */}
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

              {/* Endereço de Entrega se não for retirada */}
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

          {/* Rodapé do Modal */}
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
