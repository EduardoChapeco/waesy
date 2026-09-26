import React, { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { createQuickOrder } from "@/services/quick-order.functions";
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
  Scale,
  User,
  Building2,
  Loader2,
  Maximize2,
} from "lucide-react";
import { formatMoney } from "@/lib/money";
import { Button } from "@/components/ui/button";
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
import { getMyStoresList } from "@/services/store.functions";
import { linkClassifiedToStore } from "@/services/classifieds.functions";
import {
  GroceryFreshPricing,
  GroceryRipenessConfig,
  ProgressiveDiscountTier,
  OrderBumpOffer,
  RipenessStage,
  DEFAULT_RIPENESS_LABELS,
  calculateProgressiveDiscount,
} from "@/lib/classifieds/canonical-taxonomy";

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
  authorName?: string;
  authorAvatar?: string;
  authorId?: string;
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
  // FASE 1: Varejo Alimentar Pro
  groceryFreshPricing?: GroceryFreshPricing;
  groceryRipenessConfig?: GroceryRipenessConfig;
  progressiveDiscountTiers?: ProgressiveDiscountTier[];
  orderBumpOffer?: OrderBumpOffer;
}

interface ConvenienceShowcaseViewProps {
  classified?: any;
  previewData?: ConveniencePreviewData;
  isOwner?: boolean;
  onEdit?: () => void;
  onOpenBookingModal?: () => void;
  onOpenProposalModal?: () => void;
  previewDevice?: "mobile" | "desktop";
  compact?: boolean;
}

export function ConvenienceShowcaseView({
  classified,
  previewData,
  isOwner = false,
  onEdit,
  previewDevice,
  compact = false,
}: ConvenienceShowcaseViewProps) {
  const isForcedMobile = previewDevice === "mobile" || compact;
  const [quantity, setQuantity] = useState(1);
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [selectedPrepOption, setSelectedPrepOption] = useState<string>("");

  // Estado do Checkout / Order Drawer (Persistência Real no Supabase)
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [orderDeliveryMode, setOrderDeliveryMode] = useState<"immediate" | "scheduled" | "pickup">("immediate");
  const [orderScheduledWindow, setOrderScheduledWindow] = useState("today-afternoon");
  const [orderAddress, setOrderAddress] = useState("");
  const [orderPaymentMethod, setOrderPaymentMethod] = useState<"pix" | "card" | "cash">("pix");
  const [cashChangeFor, setCashChangeFor] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  // Carregar dados prévios do comprador para ergonomia de 3 toques
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const savedName = localStorage.getItem("waesy_customer_name");
        const savedPhone = localStorage.getItem("waesy_customer_phone");
        const savedAddress = localStorage.getItem("waesy_customer_address");
        if (savedName) setCustomerName(savedName);
        if (savedPhone) setCustomerPhone(savedPhone);
        if (savedAddress) setOrderAddress(savedAddress);
      } catch {}
    }
  }, []);

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

  // ── Identidade Dual Estrita (Perfil Pessoal vs Loja Oficial) ──
  const store = classified?.store;
  const authorProfile = classified?.profiles;
  const isCompany = Boolean(
    (classified?.store_id && (store?.id || classified?.store_name)) ||
    (previewData?.storeName && previewData?.storeSlug)
  );

  const advertiserName = isCompany
    ? (previewData?.storeName || store?.name || classified?.store_name || "Loja Oficial")
    : (previewData?.authorName || authorProfile?.full_name || classified?.contact_name || "Vendedor Particular");

  const advertiserAvatar = isCompany
    ? (previewData?.storeLogo || store?.logo_url || null)
    : (previewData?.authorAvatar || authorProfile?.avatar_url || null);

  const storeSlug =
    previewData?.storeSlug ||
    classified?.store_slug ||
    store?.slug ||
    "";

  const advertiserProfileUrl = isCompany
    ? (storeSlug ? `/loja/${storeSlug}` : store?.id ? `/perfil-da-loja?storeId=${store.id}` : null)
    : (authorProfile?.id ? `/membro/${authorProfile.id}` : previewData?.authorId ? `/membro/${previewData.authorId}` : null);

  const advertiserRoleLabel = isCompany ? "Loja Oficial" : "Vendedor Particular";

  // Estados para modal de vinculação rápida de loja no Workspace (Modo Proprietário)
  const [isLinkStoreModalOpen, setIsLinkStoreModalOpen] = useState(false);
  const [userStoresList, setUserStoresList] = useState<any[]>([]);
  const [isLoadingStores, setIsLoadingStores] = useState(false);
  const [isLinkingStore, setIsLinkingStore] = useState(false);

  const handleOpenLinkStoreModal = async () => {
    setIsLinkStoreModalOpen(true);
    setIsLoadingStores(true);
    try {
      const stores = await getMyStoresList();
      setUserStoresList(stores || []);
    } catch (err: any) {
      console.warn("Erro ao buscar lojas do usuário:", err);
      toast.error("Não foi possível carregar suas lojas.");
    } finally {
      setIsLoadingStores(false);
    }
  };

  const handleSelectStoreLink = async (targetStoreId: string | null) => {
    if (!classified?.id) return;
    setIsLinkingStore(true);
    try {
      await linkClassifiedToStore({
        data: {
          classifiedId: classified.id,
          storeId: targetStoreId,
        },
      });
      toast.success(
        targetStoreId
          ? "Anúncio vinculado à loja com sucesso!"
          : "Anúncio desvinculado e mantido no perfil pessoal!"
      );
      setIsLinkStoreModalOpen(false);
      if (typeof window !== "undefined") {
        window.location.reload();
      }
    } catch (err: any) {
      console.error("Erro ao vincular anúncio à loja:", err);
      toast.error(err?.message || "Erro ao vincular anúncio à loja.");
    } finally {
      setIsLinkingStore(false);
    }
  };

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
  // Taxa de entrega real: alimentada pelas colunas do anúncio e tabelas da empresa no banco
  const configuredDeliveryFee = attrs.delivery_fee_cents !== undefined && attrs.delivery_fee_cents !== null && attrs.delivery_fee_cents !== ""
    ? Number(attrs.delivery_fee_cents)
    : ((classified as any)?.store?.delivery_settings?.fixed_delivery_fee_cents ?? (classified as any)?.store?.fixed_delivery_fee_cents ?? 0);

  const deliveryFeeCents =
    previewData?.deliveryFeeCents !== undefined
      ? previewData.deliveryFeeCents
      : (isNaN(configuredDeliveryFee) ? 0 : configuredDeliveryFee);
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

  // ── Hortifrúti Fresco & Maturação (FASE 1) ──
  const isFreshPricingActive =
    previewData?.groceryFreshPricing?.supports_fresh_pricing ??
    attrs.grocery_fresh_pricing?.supports_fresh_pricing ??
    (department === "Hortifrúti & Feira" || attrs.grocery_department === "hortifruti");

  const freshPricingConfig: GroceryFreshPricing =
    previewData?.groceryFreshPricing ||
    attrs.grocery_fresh_pricing || {
      supports_fresh_pricing: isFreshPricingActive,
      default_pricing_mode: "unit",
      avg_piece_weight_grams: Number(attrs.avg_piece_weight_grams) || 500,
      price_per_kg_cents: Number(attrs.price_per_kg_cents) || (priceCents > 0 ? priceCents * 2 : 990),
      price_per_unit_cents: priceCents,
    };

  const isRipenessActive =
    previewData?.groceryRipenessConfig?.enabled ??
    attrs.grocery_ripeness_config?.enabled ??
    isFreshPricingActive;

  const ripenessConfig: GroceryRipenessConfig =
    previewData?.groceryRipenessConfig ||
    attrs.grocery_ripeness_config || {
      enabled: isRipenessActive,
      stages: ["menos_maduro", "maduro", "mais_maduro"],
      default_stage: "maduro",
    };

  const progressiveDiscountTiers: ProgressiveDiscountTier[] =
    previewData?.progressiveDiscountTiers ||
    attrs.progressive_discount_tiers ||
    (Array.isArray(attrs.discount_tiers) ? attrs.discount_tiers : []) ||
    [];

  const orderBumpOffer: OrderBumpOffer | undefined =
    previewData?.orderBumpOffer ||
    attrs.order_bump_offer ||
    (isFreshPricingActive
      ? {
          enabled: true,
          mode: "category_related",
          target_title: "Maçã Gala Selecionada (1kg)",
          original_price_cents: 1290,
          special_price_cents: 890,
          badge_text: "Oferta Relâmpago",
        }
      : undefined);

  // Estados Interativos de Varejo Alimentar Pro
  const [pricingMode, setPricingMode] = useState<"unit" | "weight">(
    freshPricingConfig.default_pricing_mode || "unit"
  );
  const [weightGrams, setWeightGrams] = useState<number>(
    freshPricingConfig.avg_piece_weight_grams || 500
  );
  const [selectedRipeness, setSelectedRipeness] = useState<RipenessStage>(
    ripenessConfig.default_stage || "maduro"
  );
  const [isOrderBumpAdded, setIsOrderBumpAdded] = useState(false);

  // Preço unitário base conforme o modo de precificação (Unidade vs Peso Fracionado)
  const baseUnitPriceCents =
    isFreshPricingActive && pricingMode === "weight"
      ? Math.round(((freshPricingConfig.price_per_kg_cents || priceCents * 2 || 990) * weightGrams) / 1000)
      : priceCents;

  // Cálculo de desconto progressivo (gamificação em tempo real com checkmark animado)
  const discountResult = calculateProgressiveDiscount(
    baseUnitPriceCents,
    quantity,
    progressiveDiscountTiers
  );

  const effectiveUnitPriceCents = discountResult.finalUnitPriceCents;
  const subtotalCents = discountResult.subtotalCents;

  const pixPriceCents =
    pixDiscountPercent > 0
      ? Math.round(effectiveUnitPriceCents * (1 - pixDiscountPercent / 100))
      : effectiveUnitPriceCents;
  const pixSubtotalCents =
    pixDiscountPercent > 0
      ? Math.round(subtotalCents * (1 - pixDiscountPercent / 100))
      : subtotalCents;

  const bumpPriceCents =
    isOrderBumpAdded && orderBumpOffer?.enabled
      ? orderBumpOffer.special_price_cents || 0
      : 0;

  // Frete final no modal de pedido
  const currentDeliveryFeeCents = orderDeliveryMode === "pickup" ? 0 : deliveryFeeCents;
  const currentOrderSubtotal =
    (orderPaymentMethod === "pix" ? pixSubtotalCents : subtotalCents) + bumpPriceCents;
  const grandTotalCents = currentOrderSubtotal + currentDeliveryFeeCents;

  const installmentCents =
    maxInstallments >= 2 && effectiveUnitPriceCents > 0
      ? Math.round(effectiveUnitPriceCents / maxInstallments)
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
      toast.info("Esta é uma prévia ao vivo do checkout.");
      return;
    }
    if (!cleanPhone) {
      toast.error("Comerciante sem WhatsApp cadastrado.");
      return;
    }
    setIsOrderModalOpen(true);
  };

  const handleConfirmOrder = async () => {
    if (isPreview) {
      toast.info("Esta é uma prévia ao vivo do checkout. Pedido simulado com sucesso!");
      setIsOrderModalOpen(false);
      return;
    }

    if (!customerName.trim()) {
      toast.error("Por favor, informe seu nome.");
      return;
    }

    const cleanCustPhone = customerPhone.replace(/\D/g, "");
    if (!cleanCustPhone || cleanCustPhone.length < 8) {
      toast.error("Por favor, informe um WhatsApp ou telefone válido.");
      return;
    }

    if (orderDeliveryMode !== "pickup" && !orderAddress.trim()) {
      toast.error("Por favor, informe seu endereço de entrega.");
      return;
    }

    // Salvar no localStorage para próximos pedidos (agilidade de 3 toques)
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("waesy_customer_name", customerName.trim());
        localStorage.setItem("waesy_customer_phone", customerPhone.trim());
        if (orderAddress.trim()) {
          localStorage.setItem("waesy_customer_address", orderAddress.trim());
        }
      } catch {}
    }

    setIsSubmittingOrder(true);
    try {
      const itemDetails = isFreshPricingActive
        ? (pricingMode === "weight" ? `${weightGrams >= 1000 ? `${(weightGrams / 1000).toFixed(1)}kg` : `${weightGrams}g`}` : `${quantity} un`)
        : undefined;

      const items = [
        {
          title,
          quantity,
          unitPriceCents: effectiveUnitPriceCents,
          totalCents: subtotalCents,
          imageUrl: images[0] || undefined,
          itemDetails,
          selectedOptions: selectedPrepOption || undefined,
          ripeness: isRipenessActive && selectedRipeness ? (DEFAULT_RIPENESS_LABELS[selectedRipeness]?.title || selectedRipeness) : undefined,
        },
      ];

      if (isOrderBumpAdded && orderBumpOffer?.enabled) {
        items.push({
          title: orderBumpOffer.target_title,
          quantity: 1,
          unitPriceCents: orderBumpOffer.special_price_cents || 0,
          totalCents: orderBumpOffer.special_price_cents || 0,
          imageUrl: orderBumpOffer.target_image_url || undefined,
          itemDetails: undefined,
          selectedOptions: undefined,
          ripeness: undefined,
        });
      }

      const res = await createQuickOrder({
        data: {
          storeId: classified?.store_id || previewData?.storeId || undefined,
          storeSlug: storeSlug || undefined,
          storeName: advertiserName,
          sellerPhone: cleanPhone,
          classifiedId: classified?.id || undefined,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          items,
          subtotalCents,
          deliveryFeeCents: currentDeliveryFeeCents,
          discountCents: discountResult.totalSavedCents || 0,
          grandTotalCents,
          deliveryMode: orderDeliveryMode,
          scheduledWindow: orderDeliveryMode === "scheduled" ? orderScheduledWindow : undefined,
          deliveryAddress: orderDeliveryMode !== "pickup" ? orderAddress.trim() : undefined,
          paymentMethod: orderPaymentMethod,
          cashChangeFor: orderPaymentMethod === "cash" && cashChangeFor ? cashChangeFor : undefined,
        },
      });

      if (res.status === "error" || !res.orderId) {
        toast.error(res.message || "Erro ao registrar o pedido no banco de dados.");
        return;
      }

      // Pedido registrado com sucesso absoluto no Supabase!
      toast.success(`Pedido #${res.shortId} registrado com sucesso!`);
      setIsOrderModalOpen(false);

      // Redireciona para o WhatsApp com mensagem humanizada sem jargões
      if (res.whatsappUrl) {
        window.open(res.whatsappUrl, "_blank");
      }
    } catch (err: unknown) {
      console.error("[convenience-showcase] Erro ao submeter pedido:", err);
      toast.error(err instanceof Error ? err.message : "Falha ao processar o pedido.");
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const unitSuffix = volume ? volume : unitType === "kg" ? "kg" : unitType === "g" ? "g" : unitType === "L" ? "L" : unitType !== "un" ? unitType : "";

  // Componente Reutilizável: Card do Anunciante com Isolamento Estrito (Pessoa vs Empresa)
  const AdvertiserCard = () => (
    <div className="p-3.5 rounded-2xl border border-border/60 bg-muted/15 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="size-9 rounded-full bg-background border border-border/60 overflow-hidden shrink-0 flex items-center justify-center">
            {advertiserAvatar ? (
              <img src={advertiserAvatar} alt={advertiserName} className="size-full object-cover" />
            ) : isCompany ? (
              <Store className="size-4 text-primary" />
            ) : (
              <User className="size-4 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <p className="text-xs font-bold text-foreground truncate">{advertiserName}</p>
              {isCompany ? (
                <span title="Loja Oficial Verificada" className="inline-flex shrink-0">
                  <CheckCircle2 className="size-3.5 text-blue-500" />
                </span>
              ) : (
                <span title="Anunciante Verificado" className="inline-flex shrink-0">
                  <ShieldCheck className="size-3.5 text-emerald-500" />
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground truncate">
              {isCompany ? "Loja Oficial" : "Vendedor Particular"} • {locationName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {advertiserProfileUrl && !isPreview && (
            <Button asChild variant="ghost" size="sm" className="h-7 px-2.5 text-[11px] text-foreground/80 hover:text-foreground gap-1">
              <Link to={advertiserProfileUrl}>
                <span>{isCompany ? "Ver Loja" : "Ver Perfil"}</span>
                <ExternalLink className="size-3" />
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Ação de Vinculação para o Dono do Anúncio (Owner Action) */}
      {isOwner && !isCompany && classified?.id && (
        <div className="pt-2 border-t border-border/40 flex items-center justify-between gap-2">
          <span className="text-[11px] text-muted-foreground">
            Anuncia como empresa?
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleOpenLinkStoreModal}
            className="h-6 px-2 text-[10px] font-semibold text-primary border-primary/30 bg-primary/5 hover:bg-primary/10 gap-1 rounded-lg cursor-pointer"
          >
            <Building2 className="size-3" />
            <span>Vincular a Loja</span>
          </Button>
        </div>
      )}
    </div>
  );

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

  // Componente Reutilizável: Bloco de Preço e Condições de Pagamento com Suporte a Desconto Progressivo
  const PricingBlock = () => (
    <div className="p-4 rounded-2xl bg-card border border-border/60 space-y-2.5">
      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <div>
          <div className="flex items-baseline gap-2">
            {discountResult.activeTier && (
              <span className="text-sm sm:text-base text-muted-foreground line-through font-mono">
                {formatMoney(baseUnitPriceCents)}
              </span>
            )}
            <span className="text-2xl sm:text-3xl font-black text-foreground font-mono tracking-tight">
              {effectiveUnitPriceCents > 0 ? formatMoney(effectiveUnitPriceCents) : "Preço sob consulta"}
            </span>
          </div>
          <span className="text-xs text-muted-foreground font-mono">
            {isFreshPricingActive && pricingMode === "weight"
              ? `/ ${weightGrams >= 1000 ? `${(weightGrams / 1000).toFixed(1)}kg` : `${weightGrams}g`}`
              : unitSuffix
              ? `/ ${unitSuffix}`
              : "/ un"}
          </span>
        </div>

        {discountResult.activeTier ? (
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
            {discountResult.activeTier.discount_type === "percentage"
              ? `${discountResult.activeTier.discount_value}% OFF`
              : `${formatMoney(discountResult.activeTier.discount_value)} OFF`}
          </span>
        ) : acceptsPix && pixDiscountPercent > 0 && effectiveUnitPriceCents > 0 ? (
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
            {pixDiscountPercent}% OFF no Pix
          </span>
        ) : null}
      </div>

      {acceptsPix && pixDiscountPercent > 0 && effectiveUnitPriceCents > 0 && (
        <div className="text-xs text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1.5">
          <span>
            Sai por <strong>{formatMoney(pixPriceCents)}</strong> à vista no Pix
          </span>
        </div>
      )}

      {discountResult.totalSavedCents > 0 && (
        <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
          Economia de <strong>{formatMoney(discountResult.totalSavedCents)}</strong> com desconto progressivo
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

  // Componente Reutilizável: Controles de Hortifrúti Fresco (Peso vs Unidade & Ponto de Maturação)
  const FreshProduceControls = () => {
    if (!isFreshPricingActive && !isRipenessActive) return null;

    return (
      <div className="p-3.5 rounded-2xl bg-card border border-border/60 space-y-3">
        {/* Toggle Unidade vs Peso */}
        {isFreshPricingActive && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Scale className="size-3.5 text-primary" />
                <span>Modo de Compra:</span>
              </span>
              {freshPricingConfig.avg_piece_weight_grams && (
                <span className="text-[11px] text-muted-foreground font-mono">
                  ~{freshPricingConfig.avg_piece_weight_grams}g / peça
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-muted/30 rounded-xl border border-border/50">
              <button
                type="button"
                onClick={() => setPricingMode("unit")}
                className={cn(
                  "py-2 px-3 text-center rounded-lg font-semibold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5",
                  pricingMode === "unit"
                    ? "bg-background text-foreground  font-bold ring-1 ring-border/80"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span>Por Unidade</span>
              </button>
              <button
                type="button"
                onClick={() => setPricingMode("weight")}
                className={cn(
                  "py-2 px-3 text-center rounded-lg font-semibold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5",
                  pricingMode === "weight"
                    ? "bg-background text-foreground  font-bold ring-1 ring-border/80"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span>Por Peso (kg)</span>
              </button>
            </div>

            {pricingMode === "weight" && (
              <div className="flex items-center justify-between p-2 rounded-xl bg-muted/20 border border-border/40 text-xs">
                <span className="text-muted-foreground">Gramas / Peso:</span>
                <div className="flex items-center gap-1.5">
                  {[250, 500, 1000, 1500].map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setWeightGrams(g)}
                      className={cn(
                        "px-2 py-1 rounded-lg text-xs font-mono font-medium border transition-all cursor-pointer",
                        weightGrams === g
                          ? "bg-primary text-primary-foreground border-primary font-bold "
                          : "bg-background text-muted-foreground border-border/60 hover:text-foreground"
                      )}
                    >
                      {g >= 1000 ? `${(g / 1000).toFixed(1)}kg` : `${g}g`}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Ponto de Maturação */}
        {isRipenessActive && (
          <div className="space-y-2 pt-1 border-t border-border/40">
            <span className="text-xs font-bold text-foreground block">
              Ponto de Maturação (Hortifrúti Fresco):
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              {(["menos_maduro", "maduro", "mais_maduro"] as RipenessStage[]).map((stage) => {
                const info = DEFAULT_RIPENESS_LABELS[stage];
                const isSelected = selectedRipeness === stage;
                return (
                  <button
                    key={stage}
                    type="button"
                    onClick={() => setSelectedRipeness(stage)}
                    className={cn(
                      "p-2.5 rounded-xl text-center border transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5",
                      isSelected
                        ? "border-primary bg-primary/10 text-primary font-bold  ring-1 ring-primary/30"
                        : "border-border/60 bg-background text-muted-foreground hover:text-foreground hover:bg-muted/30"
                    )}
                  >
                    <span className="text-xs">{info.title}</span>
                  </button>
                );
              })}
            </div>
            {selectedRipeness && (
              <p className="text-[11px] text-muted-foreground italic px-1">
                • {DEFAULT_RIPENESS_LABELS[selectedRipeness]?.desc}
              </p>
            )}
          </div>
        )}
      </div>
    );
  };

  // Componente Reutilizável: Gamificação de Desconto Progressivo (Checklist de Tiers)
  const ProgressiveDiscountCard = () => {
    if (!progressiveDiscountTiers || progressiveDiscountTiers.length === 0) return null;

    return (
      <div className="p-4 rounded-2xl bg-card border border-border/60 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <BadgePercent className="size-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-bold text-foreground">Desconto Progressivo</span>
          </div>
          {discountResult.activeTier ? (
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
              {discountResult.activeTier.discount_type === "percentage"
                ? `${discountResult.activeTier.discount_value}% OFF`
                : `${formatMoney(discountResult.activeTier.discount_value)} OFF`}
            </span>
          ) : (
            <span className="text-[11px] text-muted-foreground">Compre mais, pague menos</span>
          )}
        </div>

        <div className="space-y-1.5">
          {progressiveDiscountTiers.map((tier, idx) => {
            const isUnlocked = quantity >= tier.min_quantity;
            const discountLabel =
              tier.discount_type === "percentage"
                ? `${tier.discount_value}% OFF`
                : `${formatMoney(tier.discount_value)} OFF`;

            return (
              <div
                key={idx}
                className={cn(
                  "flex items-center justify-between p-2.5 rounded-xl border text-xs transition-all",
                  isUnlocked
                    ? "border-emerald-500/40 text-foreground font-semibold"
                    : "bg-muted/15 border-border/50 text-muted-foreground"
                )}
              >
                <div className="flex items-center gap-2">
                  {isUnlocked ? (
                    <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  ) : (
                    <div className="size-4 rounded-full border border-border/80 shrink-0" />
                  )}
                  <span>
                    Compre <strong>{tier.min_quantity}+ un</strong>: ganhe <strong>{discountLabel}</strong>
                  </span>
                </div>

                {isUnlocked ? (
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    Ativado
                  </span>
                ) : (
                  <span className="text-[11px] text-muted-foreground font-mono">
                    + {tier.min_quantity - quantity} un
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {discountResult.totalSavedCents > 0 && (
          <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center justify-between pt-1">
            <span>Economia no pedido:</span>
            <span className="font-mono font-bold">{formatMoney(discountResult.totalSavedCents)}</span>
          </div>
        )}
      </div>
    );
  };

  // Componente Reutilizável: Linha Compacta de Entrega
  const DeliveryEstimateLine = () => (
    <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/60 text-xs">
      <div className="flex items-center gap-2 text-foreground min-w-0">
        <Truck className="size-4 text-primary shrink-0" />
        <div className="truncate">
          <span className="font-semibold">Entrega local</span>
          <span className="text-muted-foreground ml-1">{deliveryFeeCents > 0 ? `a partir de ${formatMoney(deliveryFeeCents)}` : "Grátis / A combinar com a loja"}</span>
          <span className="text-muted-foreground text-[11px] block">• Estimativa {deliveryEstimate}</span>
        </div>
      </div>
      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
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
      <main className={cn(isForcedMobile ? "w-full max-w-full px-0 pt-0" : "max-w-5xl mx-auto px-0 sm:px-6 pt-0 sm:pt-6")}>
        <div className={cn(isForcedMobile ? "flex flex-col gap-3" : "grid grid-cols-1 md:grid-cols-12 gap-0 sm:gap-8 items-start")}>
          
          {/* ═══════════════════════════════════════════════════════════════════
              COLUNA 1 (ESQUERDA - MD: 7 COLUNAS / FULL NO MOBILE):
              1. FOTO PRINCIPAL LIMPA (SEM BADGES NEON, SEM EMOJIS, FULL-BLEED NO MOBILE)
              2. MINIATURAS
              [NO MOBILE: HEADER DO PRODUTO + PREÇO AQUI LOGO APÓS A FOTO]
              3. DETALHES DO PRODUTO (DESCRIÇÃO)
              4. ESPECIFICAÇÕES TÉCNICAS E ATRIBUTOS
             ═══════════════════════════════════════════════════════════════════ */}
          <div className={cn(isForcedMobile ? "w-full space-y-3.5" : "md:col-span-7 space-y-4 sm:space-y-6")}>
            
            {/* Box da Foto: Grande, full-bleed, limpo */}
            <div className="space-y-2 sm:space-y-3">
              <div
                className="relative aspect-square w-full rounded-none sm:rounded-2xl overflow-hidden bg-muted/20 border-b sm:border border-border/60 flex items-center justify-center shadow-none sm: group cursor-pointer"
                onClick={() => images.length > 0 && setFullscreenImage(images[activePhotoIdx] || images[0])}
              >
                {images.length > 0 ? (
                  <img
                    src={images[activePhotoIdx] || images[0]}
                    alt={title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground p-8 text-center">
                    <ShoppingBag className="size-12 stroke-[1.2] text-primary/40" />
                    <p className="text-xs">Foto do produto</p>
                  </div>
                )}
                {images.length > 0 && (
                  <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="px-2.5 py-1 rounded-xl bg-background/90 backdrop-blur-md text-[11px] font-semibold text-foreground border border-border/50 flex items-center gap-1.5">
                      <Maximize2 className="size-3.5" />
                      Expandir
                    </span>
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
                        "size-14 rounded-xl overflow-hidden border shrink-0 bg-muted/20 transition-all cursor-pointer",
                        activePhotoIdx === idx
                          ? "border-primary ring-2 ring-primary/20"
                          : "border-border/60 opacity-60 hover:opacity-100"
                      )}
                    >
                      <img src={img} alt={`Thumb ${idx}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ═════════════════════════════════════════════════════════════════
                BLOCO DE CABEÇALHO DO PRODUTO NO MOBILE (MD:HIDDEN OU FORCED MOBILE)
                Aparece imediatamente abaixo da foto no smartphone!
               ═════════════════════════════════════════════════════════════════ */}
            <div className={cn("px-3.5 space-y-3.5", isForcedMobile ? "block" : "md:hidden")}>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
                  <span className="font-semibold text-foreground/90">{advertiserName}</span>
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

              {/* Controles de Hortifrúti Fresco (Unidade vs Peso & Maturação) */}
              <FreshProduceControls />

              {/* Gamificação de Desconto Progressivo */}
              <ProgressiveDiscountCard />

              {/* Seletor de Opções de Preparo / Corte se configurado */}
              {prepOptions && prepOptions.length > 0 && (
                <div className="p-3 rounded-2xl bg-card border border-border/60 space-y-1.5">
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
                              ? "bg-primary text-primary-foreground border-primary font-bold "
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
              <div className="mx-3.5 sm:mx-0 p-4 sm:p-6 rounded-2xl bg-card border border-border/60 space-y-3">
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
            <div className="mx-3.5 sm:mx-0 p-4 sm:p-6 rounded-2xl bg-card border border-border/60 space-y-4">
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

            {/* Card do Anunciante / Loja no Mobile */}
            <div className="md:hidden mx-3.5">
              <AdvertiserCard />
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
          <div className={cn(isForcedMobile ? "hidden" : "hidden md:block md:col-span-5 space-y-4 md:sticky md:top-16")}>
            
            {/* Header de Categoria / Loja */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
                <span className="font-semibold text-foreground/90">{advertiserName}</span>
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

            {/* Controles de Hortifrúti Fresco (Unidade vs Peso & Maturação) */}
            <FreshProduceControls />

            {/* Gamificação de Desconto Progressivo */}
            <ProgressiveDiscountCard />

            {/* Seletor de Opções de Preparo / Corte (Açougue / Padaria) se configurado */}
            {prepOptions && prepOptions.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-card border border-border/60 space-y-2">
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
                            ? "bg-primary text-primary-foreground border-primary font-bold "
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
            <div className="p-4 rounded-2xl bg-card border border-border/60 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-foreground block">Quantidade</span>
                  <span className="text-[11px] text-muted-foreground">Adicione ao seu pedido</span>
                </div>

                <div className="flex items-center gap-2 border border-border/70 rounded-xl bg-background p-1">
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
                  className="w-full h-12 rounded-xl text-xs sm:text-sm font-bold gap-2 bg-foreground text-background hover:bg-foreground/90 cursor-pointer transition-all active:scale-[0.99]"
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

            {/* Card Resumo do Anunciante / Loja no Desktop */}
            <AdvertiserCard />

          </div>
        </div>
      </main>

      {/* ═══════════════════════════════════════════════════════════════════════
          FLOATING BOTTOM BAR NO MOBILE (THUMB ZONE ERGONOMICS)
         ═══════════════════════════════════════════════════════════════════════ */}
      <div className={cn(
        "z-40 bg-background/95 backdrop-blur-md border-t border-border/60 p-3  flex items-center gap-3",
        isForcedMobile || isPreview
          ? "sticky bottom-0 inset-x-0 block rounded-none sm:rounded-b-2xl"
          : "md:hidden fixed bottom-0 inset-x-0"
      )}>
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
          className="h-11 px-4 rounded-xl text-xs font-bold gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer shrink-0"
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
                <img src={images[0]} alt={title} className="size-14 rounded-lg aspect-square object-cover border shrink-0" />
              ) : (
                <div className="size-14 rounded-lg bg-muted/40 flex items-center justify-center shrink-0">
                  <ShoppingBag className="size-6 text-muted-foreground/50" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-foreground truncate">{title}</p>
                <p className="text-[11px] text-muted-foreground">
                  {quantity}x de {formatMoney(effectiveUnitPriceCents)} {unitSuffix ? `(${unitSuffix})` : ""}
                  {isFreshPricingActive && (
                    <span> • {pricingMode === "weight" ? `${weightGrams >= 1000 ? `${(weightGrams / 1000).toFixed(1)}kg` : `${weightGrams}g`}` : "Unidade"}</span>
                  )}
                </p>
                {isRipenessActive && selectedRipeness && (
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                    Maturação: {DEFAULT_RIPENESS_LABELS[selectedRipeness]?.title}
                  </p>
                )}
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

            {/* Identificação do Cliente */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3 rounded-xl bg-muted/20 border border-border/40">
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-foreground">
                  Seu Nome *
                </Label>
                <Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Como podemos te chamar?"
                  className="h-9 rounded-lg text-xs bg-background"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-foreground">
                  WhatsApp / Celular *
                </Label>
                <Input
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="(00) 00000-0000"
                  className="h-9 rounded-lg text-xs bg-background"
                />
              </div>
            </div>

            {/* Oferta Relâmpago (Order Bump / Cross-sell no Carrinho) */}
            {orderBumpOffer?.enabled && (
              <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400">
                    <Zap className="size-3.5 fill-amber-500 text-amber-500" />
                    <span>{orderBumpOffer.badge_text || "Oferta Relâmpago no Carrinho"}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">Adicione com 1 clique</span>
                </div>

                <div className="flex items-center justify-between gap-3 pt-0.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {orderBumpOffer.target_image_url ? (
                      <img
                        src={orderBumpOffer.target_image_url}
                        alt={orderBumpOffer.target_title}
                        className="size-10 rounded-lg object-contain bg-background p-1 border shrink-0"
                      />
                    ) : (
                      <div className="size-10 rounded-lg bg-background flex items-center justify-center border shrink-0 text-amber-600">
                        <Sparkles className="size-4" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">{orderBumpOffer.target_title}</p>
                      <div className="flex items-center gap-1.5 text-[11px] font-mono">
                        {orderBumpOffer.original_price_cents && (
                          <span className="line-through text-muted-foreground text-[10px]">
                            {formatMoney(orderBumpOffer.original_price_cents)}
                          </span>
                        )}
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {formatMoney(orderBumpOffer.special_price_cents || 0)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    variant={isOrderBumpAdded ? "default" : "outline"}
                    onClick={() => setIsOrderBumpAdded(!isOrderBumpAdded)}
                    className={cn(
                      "h-8 px-3 rounded-lg text-xs font-bold cursor-pointer shrink-0 transition-all",
                      isOrderBumpAdded
                        ? "bg-foreground text-background hover:bg-foreground/90"
                        : "border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10"
                    )}
                  >
                    {isOrderBumpAdded ? "✔ Adicionado" : "+ Adicionar"}
                  </Button>
                </div>
              </div>
            )}

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
                      ? "bg-background text-foreground  font-bold ring-1 ring-border/80"
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
                      ? "bg-background text-foreground  font-bold ring-1 ring-border/80"
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
                      ? "bg-background text-foreground  font-bold ring-1 ring-border/80"
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
              {isOrderBumpAdded && orderBumpOffer && (
                <div className="flex justify-between text-amber-700 dark:text-amber-400 font-medium">
                  <span className="truncate">Oferta Relâmpago ({orderBumpOffer.target_title}):</span>
                  <span className="font-mono font-bold">+{formatMoney(orderBumpOffer.special_price_cents || 0)}</span>
                </div>
              )}
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
              disabled={isSubmittingOrder}
              onClick={() => setIsOrderModalOpen(false)}
              className="h-11 rounded-xl text-xs font-semibold"
            >
              Voltar
            </Button>
            <Button
              onClick={handleConfirmOrder}
              disabled={isSubmittingOrder}
              className="flex-1 h-11 rounded-xl text-xs sm:text-sm font-bold gap-2 bg-foreground text-background hover:bg-foreground/90 cursor-pointer disabled:opacity-50"
            >
              {isSubmittingOrder ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Gravando Pedido...</span>
                </>
              ) : (
                <>
                  <ShoppingBag className="size-4" />
                  <span>Confirmar Pedido · {formatMoney(grandTotalCents)}</span>
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog para Vincular Anúncio a uma Loja do Workspace (Modo Proprietário) ── */}
      <Dialog open={isLinkStoreModalOpen} onOpenChange={setIsLinkStoreModalOpen}>
        <DialogContent className="sm:max-w-md sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Building2 className="size-4 text-primary" />
              <span>Vincular Anúncio ao Workspace</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Você pode transformar este anúncio em um anúncio oficial de uma das suas lojas cadastradas.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {isLoadingStores ? (
              <div className="flex items-center justify-center py-6 gap-2 text-xs text-muted-foreground">
                <Loader2 className="size-4 animate-spin text-primary" />
                <span>Buscando suas empresas...</span>
              </div>
            ) : userStoresList.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed text-center space-y-2">
                <Store className="size-8 mx-auto text-muted-foreground/50" />
                <p className="text-xs text-muted-foreground">
                  Você ainda não possui lojas cadastradas no Workspace.
                </p>
                <Button asChild size="sm" variant="outline" className="h-8 text-xs">
                  <Link to="/workspace">Criar ou Gerenciar Lojas</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {userStoresList.map((st: any) => {
                  const isCurrent = classified?.store_id === st.id;
                  return (
                    <div
                      key={st.id}
                      className={cn(
                        "p-3 rounded-xl border flex items-center justify-between gap-3 transition-colors",
                        isCurrent
                          ? "border-primary bg-primary/5"
                          : "border-border/70 hover:border-primary/40 bg-card"
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="size-8 rounded-lg bg-background border border-border/70 overflow-hidden flex items-center justify-center shrink-0">
                          {st.logo_url ? (
                            <img src={st.logo_url} alt={st.name} className="size-full object-cover" />
                          ) : (
                            <Store className="size-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-foreground truncate">{st.name}</p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {st.city ? `${st.city}${st.state ? ` - ${st.state}` : ""}` : "Loja Waesy"}
                          </p>
                        </div>
                      </div>

                      {isCurrent ? (
                        <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                          Vinculada
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          disabled={isLinkingStore}
                          onClick={() => handleSelectStoreLink(st.id)}
                          className="h-7 px-2.5 text-xs font-bold cursor-pointer"
                        >
                          {isLinkingStore ? <Loader2 className="size-3 animate-spin" /> : "Vincular"}
                        </Button>
                      )}
                    </div>
                  );
                })}

                {classified?.store_id && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={isLinkingStore}
                    onClick={() => handleSelectStoreLink(null)}
                    className="w-full h-8 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 cursor-pointer mt-1"
                  >
                    Desvincular loja (tornar anúncio de perfil pessoal)
                  </Button>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      {/* Modal de Foto em Tela Cheia (Lightbox) */}
      <Dialog open={!!fullscreenImage} onOpenChange={(open) => !open && setFullscreenImage(null)}>
        <DialogContent className="max-w-4xl p-2 bg-background/95 backdrop-blur-xl border-border/80 rounded-2xl overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Foto do Produto</DialogTitle>
          </DialogHeader>
          {fullscreenImage && (
            <div className="relative aspect-square sm:aspect-[4/3] w-full max-h-[85vh] rounded-xl overflow-hidden flex items-center justify-center bg-black/5">
              <img
                src={fullscreenImage}
                alt={title}
                className="w-full h-full object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
