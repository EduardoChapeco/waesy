import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ImageOff, ShoppingBag, TrendingUp, ChevronRight, Star, Truck, ShieldCheck, Check, HelpCircle, MapPin, RotateCcw, BadgePercent, Play, MessageCircle, Mail, User, Info, Loader2, Layers, ChevronRight as ChevronIcon, ShieldAlert, Users, Scale, Clock, BellRing, Package, Minus, Plus } from 'lucide-react';
import { TagFraudDialog } from "@/components/commerce/tag-fraud-dialog";
import { useIsDesktop } from "@/hooks/use-mobile";
import { ProductDetailMobile, type ProductDetailViewProps } from "@/components/commerce/product-detail-mobile";
import { ProductDetailDesktop } from "@/components/commerce/product-detail-desktop";
import { ProductWaitlistSheet } from "@/components/commerce/product-waitlist-sheet";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageSkeleton } from "@/components/state/loading";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { EmptyState, ErrorState } from "@/components/state/states";
import { PriceDisplay } from "@/components/commerce/price-display";
import { getProductBySlug } from "@/services/product.functions";
import { getGlobalPriceBenchmarkFn } from "@/services/mining.functions";
import type { ProductDetailDTO, ProductMediaDTO, VariantDTO } from "@/types/catalog";
import { TravelPackageDetailView } from "@/components/commerce/travel/travel-package-detail-view";
import { ConvenienceShowcaseView } from "@/components/classifieds/convenience-showcase-view";
import type { DepartureOption } from "@/lib/classifieds/canonical-airports";
import { calculateShipping } from "@/services/shipping.functions";
import { formatMoney } from "@/lib/money";
import { getPublicExperienceDocumentBySlug } from "@/services/builder.functions";
import { addToCart } from "@/services/cart.functions";
import { getIdentity } from "@/services/identity.functions";
import { useCartContext } from "@/lib/cart-context";
import { ProductTelemetry, trackAddToCartEvent } from "@/components/commerce/product-telemetry";
import { toast } from "sonner";
import { humanizeErrorMessage } from "@/lib/humanize-error";
import { playMessageChime } from "@/lib/audio-chimes";

import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ExperienceRenderer } from "@/components/commerce/experience-renderer";
import {
 getProductReviewStats,
 getProductReviewsList,
 getStoreFollowStatus,
 toggleStoreFollow,
 submitProductReview,
} from "@/services/social.functions";
import {
 Sheet,
 SheetContent,
 SheetDescription,
 SheetHeader,
 SheetTitle,
} from "@/components/ui/sheet";
import { Surface } from "@/components/ui/surface";
import { formatDate, formatRelativeTime } from "@/lib/datetime";
import { cn } from "@/lib/utils";

const getColorHex = (name: string): string => {
 const colors: Record<string, string> = {
 preto: "#000000",
 black: "#000000",
 branco: "#ffffff",
 white: "#ffffff",
 vermelho: "#ef4444",
 red: "#ef4444",
 azul: "#3b82f6",
 blue: "#3b82f6",
 verde: "#22c55e",
 green: "#22c55e",
 rosa: "#ec4899",
 pink: "var(--color-primary)",
 amarelo: "#eab308",
 yellow: "#eab308",
 cinza: "#6b7280",
 gray: "#6b7280",
 grey: "#6b7280",
 marrom: "#78350f",
 brown: "#78350f",
 laranja: "#f97316",
 orange: "#f97316",
 roxo: "#a855f7",
 purple: "#a855f7",
 bege: "#f5f5dc",
 beige: "#f5f5dc",
 dourado: "#fbbf24",
 gold: "#fbbf24",
 prateado: "#9ca3af",
 silver: "#9ca3af",
 nude: "#e5c1a7",
 "rose ritual": "#d27d7d",
 "cutie pie": "#e29d95",
 "petal talk": "#f5c3c2",
 devoted: "#b5515c",
 lilás: "#dfc5fe",
 creme: "#fffdd0",
 };
 const clean = name.toLowerCase().trim();
 if (colors[clean]) return colors[clean];

 // Hash fallback
 let hash = 0;
 for (let i = 0; i < clean.length; i++) {
 hash = clean.charCodeAt(i) + ((hash << 5) - hash);
 }
 const c = (hash & 0x00ffffff).toString(16).toUpperCase();
 return "#" + "00000".substring(0, 6 - c.length) + c;
};

function SizeGuideSheet({
 open,
 onOpenChange,
}: {
 open: boolean;
 onOpenChange: (open: boolean) => void;
}) {
 return (
 <Sheet open={open} onOpenChange={onOpenChange}>
 <SheetContent className="max-w-md">
 <SheetHeader>
 <SheetTitle>Guia de Tamanhos (Padrão BR)</SheetTitle>
 <SheetDescription>
 Use a tabela abaixo para selecionar o tamanho ideal com base na medida do seu pé.
 </SheetDescription>
 </SheetHeader>
 <div className="mt-4 overflow-hidden border">
 <table className="w-full border-collapse text-left text-xs">
 <thead>
 <tr className="bg-muted">
 <th className="p-2.5 font-bold border-b">Tamanho BR</th>
 <th className="p-2.5 font-bold border-b">Comprimento do Pé (cm)</th>
 <th className="p-2.5 font-bold border-b">Tamanho EUA</th>
 </tr>
 </thead>
 <tbody>
 <tr className="border-b">
 <td className="p-2.5 font-medium">34</td>
 <td className="p-2.5 text-muted-foreground">22.5 cm</td>
 <td className="p-2.5">US 5</td>
 </tr>
 <tr className="border-b bg-muted/20">
 <td className="p-2.5 font-medium">35</td>
 <td className="p-2.5 text-muted-foreground">23.0 cm</td>
 <td className="p-2.5">US 5.5</td>
 </tr>
 <tr className="border-b">
 <td className="p-2.5 font-medium">36</td>
 <td className="p-2.5 text-muted-foreground">23.5 cm</td>
 <td className="p-2.5">US 6.5</td>
 </tr>
 <tr className="border-b bg-muted/20">
 <td className="p-2.5 font-medium">37</td>
 <td className="p-2.5 text-muted-foreground">24.0 cm</td>
 <td className="p-2.5">US 7</td>
 </tr>
 <tr className="border-b">
 <td className="p-2.5 font-medium">38</td>
 <td className="p-2.5 text-muted-foreground">25.0 cm</td>
 <td className="p-2.5">US 8</td>
 </tr>
 <tr className="border-b bg-muted/20">
 <td className="p-2.5 font-medium">39</td>
 <td className="p-2.5 text-muted-foreground">25.5 cm</td>
 <td className="p-2.5">US 8.5</td>
 </tr>
 <tr className="border-b">
 <td className="p-2.5 font-medium">40</td>
 <td className="p-2.5 text-muted-foreground">26.5 cm</td>
 <td className="p-2.5">US 9.5</td>
 </tr>
 </tbody>
 </table>
 </div>
 <p className="mt-2 text-[10px] text-muted-foreground leading-normal">
 * Dica: Se ficar entre dois tamanhos, recomendamos escolher a numeração maior para maior
 conforto.
 </p>
 </SheetContent>
 </Sheet>
 );
}

export const Route = createFileRoute("/_store/produto/$slug")({
 validateSearch: (search: Record<string, unknown>): { v?: string } => {
 return {
 v: search.v as string | undefined, // variant ID
 };
 },
 head: ({ loaderData }) => {
 const product = (loaderData as any)?.productResult as ProductDetailDTO;
 if (!product || !product.id) {
 return { meta: [{ title: "Produto" }] };
 }
 const title = product.seoTitle || `${product.title}`;
 const description =
 product.seoDescription ||
 (product.description
 ? product.description.replace(/<[^>]+>/g, "").slice(0, 155)
 : `Compre ${product.title} no Waesy. Frete rápido e parcelamento disponível.`);
 const coverUrl = product.media?.[0]?.url ?? null;
 const canonical = `${typeof window !== "undefined" ? window.location.origin : ""}/produto/${product.slug}`;

 return {
 meta: [
 { title },
 { name: "description", content: description },
 // Open Graph
 { property: "og:type", content: "product" },
 { property: "og:title", content: title },
 { property: "og:description", content: description },
 ...(coverUrl ? [{ property: "og:image", content: coverUrl }] : []),
 { property: "og:url", content: canonical },
 // Twitter Card
 { name: "twitter:card", content: coverUrl ? "summary_large_image" : "summary" },
 { name: "twitter:title", content: title },
 { name: "twitter:description", content: description },
 ...(coverUrl ? [{ name: "twitter:image", content: coverUrl }] : []),
 ],
 links: [{ rel: "canonical", href: canonical }],
 scripts: [
 {
 type: "application/ld+json",
 children: JSON.stringify({
 "@context": "https://schema.org",
 "@type": "Product",
 name: product.title,
 description:
 (
 product.shortDescription || (product.description || "").replace(/<[^>]+>/g, "")
 ).slice(0, 300) || undefined,
 image: product.media.filter((m: any) => m.mediaType === "image").map((m: any) => m.url),
 brand: product.brand ? { "@type": "Brand", name: product.brand } : undefined,
 sku: product.variants?.[0]?.sku,
 gtin: (product.variants?.[0]?.ean ?? product.ean) || undefined,
 offers: {
 "@type": "AggregateOffer",
 priceCurrency: "BRL",
 lowPrice: (
 (product.variants?.length > 0
 ? Math.min(...product.variants.map((v: any) => v.effectivePriceCents))
 : product.priceCents) / 100
 ).toFixed(2),
 offerCount: product.variants?.length || 1,
 availability: product.variants?.some((v: any) => v.availableQty > 0)
 ? "https://schema.org/InStock"
 : "https://schema.org/OutOfStock",
 seller: { "@type": "Organization", name: "Waesy" },
 },
 }),
 },
 ],
 };
 },
  loader: async ({ params }) => {
    try {
      const [productRes, templateRes, identityRes] = await Promise.all([
        getProductBySlug({ data: { slug: params.slug } }),
        getPublicExperienceDocumentBySlug({
          data: { slug: "default-product-template", document_type: "product_template" },
        }),
        getIdentity().catch(() => null),
      ]);
      return {
        productResult: productRes,
        templateTree: (templateRes as any)?.tree || [],
        identity: identityRes || null,
      };
    } catch (err) {
      console.error("[loader:_store.produto.$slug] Unhandled loader error:", err);
      return {
        productResult: null,
        templateTree: [],
        identity: null,
      };
    }
  },
  pendingComponent: PageSkeleton,
  component: ProductPage,
});

function ProductPage() {
  const loaderData = (Route.useLoaderData() as any) || {};
  const product = loaderData.productResult as ProductDetailDTO | null;
  const templateTree = (loaderData.templateTree || []) as any;
  const identity = loaderData.identity;
  const router = useRouter();

  if (!product || !product.id) {
    return (
      <div className="mx-auto max-w-screen-xl px-4 py-20 md:px-6">
        <EmptyState
          title="Produto não encontrado"
          action={
            <Button asChild>
              <Link to="/mercado">Ver catálogo</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const isOwner = Boolean(
    identity?.id &&
      ((product as any)?.store_id === identity.store_id ||
        (product as any)?.store?.id === identity.store_id ||
        (product as any)?.store?.owner_id === identity.id ||
        (product as any)?.store?.user_id === identity.id ||
        identity.role === "admin")
  );

  const isTravelPackage = Boolean(
    product.attributes?.travel ||
      (product as any).category?.slug?.includes("turismo") ||
      (product as any).category?.slug?.includes("viag") ||
      (product as any).category?.name?.toLowerCase().includes("turismo") ||
      (product as any).category?.name?.toLowerCase().includes("viagem") ||
      (product as any).category?.name?.toLowerCase().includes("resort")
  );

  if (isTravelPackage) {
    const travelData = product.attributes?.travel;
    const currentThumbnailUrl =
      product.media?.find((m: any) => m.mediaType === "image")?.url ||
      product.media?.[0]?.url ||
      null;
    const mediaUrls =
      product.media?.filter((m: any) => m.mediaType === "image")?.map((m: any) => m.url) || [];
    const storePhone =
      product.store?.phone ||
      product.store?.whatsapp ||
      (product as any)?.seller?.phone ||
      "49991448651";

    const { setIsCartOpen } = useCartContext();

    const handleTravelReserve = async (selectedDeparture?: DepartureOption) => {
      const targetVariantId = product.variants?.[0]?.id;
      if (targetVariantId && (product.priceCents || 0) > 0) {
        try {
          await addToCart({
            data: {
              variantId: targetVariantId,
              quantity: 1,
            },
          });
          toast.success("Pacote de viagem adicionado ao carrinho!");
          setIsCartOpen(true);
        } catch (err: any) {
          toast.error(err?.message || "Erro ao adicionar pacote ao carrinho.");
        }
      } else {
        const cleanPhone = storePhone ? storePhone.replace(/\D/g, "") : "49991448651";
        const depInfo = selectedDeparture && selectedDeparture.departure_date
          ? ` para a saída de ${new Date(selectedDeparture.departure_date + "T00:00:00").toLocaleDateString("pt-BR")}`
          : "";
        const msg = encodeURIComponent(`Olá! Tenho interesse no pacote *${product.title}*${depInfo}. Gostaria de confirmar disponibilidade e reserva!`);
        window.open(`https://wa.me/${cleanPhone}?text=${msg}`, "_blank");
      }
    };

    return (
      <TravelPackageDetailView
        packageData={travelData}
        productTitle={product.title}
        priceCents={product.priceCents || 0}
        compareAtCents={product.compareAtCents}
        coverImageUrl={currentThumbnailUrl}
        mediaUrls={mediaUrls}
        storeName={(product as any)?.store?.name}
        storePhone={storePhone}
        isOwner={isOwner}
        onReserveClick={handleTravelReserve}
        onEditClick={() =>
          router.navigate({
            to: "/workspace/catalogo/produtos/$id",
            params: { id: product.id },
          })
        }
      />
    );
  }

  const isConvenienceProduct = Boolean(
    (product?.attributes as any)?.template_style === "conveniencia" ||
    (product?.attributes as any)?.templateStyle === "conveniencia" ||
    (product as any)?.store?.segment === "supermarket" ||
    (product as any)?.store?.segment === "grocery" ||
    (product as any)?.store?.segment === "convenience" ||
    (product?.attributes as any)?.food_specs?.is_fresh_pricing_active
  );

  if (isConvenienceProduct) {
    const store = (product as any)?.store;
    const foodSpecs = (product?.attributes as any)?.food_specs || {};
    const mediaUrls =
      product.media?.filter((m: any) => m.mediaType === "image")?.map((m: any) => m.url) || [];
    const currentThumbnailUrl =
      mediaUrls[0] ||
      product.media?.[0]?.url ||
      null;
    const storePhone =
      store?.phone ||
      store?.whatsapp ||
      (product as any)?.seller?.phone ||
      "49991448651";

    return (
      <ConvenienceShowcaseView
        previewData={{
          title: product.title,
          description: product.description || undefined,
          priceCents: product.priceCents || 0,
          images: mediaUrls.length > 0 ? mediaUrls : currentThumbnailUrl ? [currentThumbnailUrl] : [],
          locationName: store?.city || "São Miguel do Oeste e Região",
          whatsapp: storePhone,
          storeName: store?.name || "Loja Oficial",
          storeSlug: store?.slug,
          storeLogo: store?.logo_url,
          volume: foodSpecs.portion_weight || undefined,
          unitType: foodSpecs.portion_unit || "un",
          estimatedWeightPerUnit: foodSpecs.portion_weight,
          department: (product as any)?.category?.name || "Mercado & Varejo",
          brand: product.brand || undefined,
          barcodeEan: product.ean || foodSpecs.barcode_ean,
          stockQty: 10,
          groceryFreshPricing: foodSpecs.is_fresh_pricing_active ? {
            supports_fresh_pricing: true,
            default_pricing_mode: foodSpecs.fresh_pricing_mode || "unit",
            avg_piece_weight_grams: foodSpecs.avg_piece_weight_grams || 500,
            price_per_kg_cents: foodSpecs.price_per_kg_cents || ((product.priceCents || 0) > 0 ? (product.priceCents || 0) * 2 : 990),
            price_per_unit_cents: product.priceCents || 0,
          } : undefined,
          groceryRipenessConfig: foodSpecs.ripeness_enabled ? {
            enabled: true,
            stages: foodSpecs.ripeness_stages || ["verde", "quase_maduro", "maduro", "passando"],
            default_stage: "maduro",
          } : undefined,
          progressiveDiscountTiers: foodSpecs.progressive_discounts && foodSpecs.progressive_discounts.length > 0
            ? foodSpecs.progressive_discounts.map((d: any) => ({
                min_quantity: d.min_qty || d.min_quantity || 2,
                discount_type: (d.type || d.discount_type || "percentage") as "percentage" | "fixed_cents",
                discount_value: d.value || d.discount_value || 10,
              }))
            : undefined,
        }}
        isOwner={isOwner}
        onEdit={() =>
          router.navigate({
            to: "/workspace/catalogo/produtos/$id",
            params: { id: product.id },
          })
        }
      />
    );
  }

  return <ProductContent product={product} templateTree={templateTree} isOwner={isOwner} />;
}

function ProductContent({
  product: rawProduct,
  templateTree,
  isOwner = false,
}: {
  product: ProductDetailDTO;
  templateTree?: any[];
  isOwner?: boolean;
}) {
  const coverImage: ProductMediaDTO | null = rawProduct.media[0] ?? null;

 // Sanitize variant attributes to avoid UI breakage due to trailing spaces in keys or values
 const product = useMemo(() => {
 const cleanVariants = rawProduct.variants.map((v: VariantDTO) => {
 const cleanAttrs: Record<string, string> = {};
 if (v.attributes) {
 Object.entries(v.attributes).forEach(([k, val]) => {
 cleanAttrs[k.trim()] = val != null ? String(val).trim() : "";
 });
 }
 return { ...v, attributes: cleanAttrs };
 });
 return { ...rawProduct, variants: cleanVariants };
 }, [rawProduct]);

 // Collect unique attribute keys across all variants.
 const attributeKeys: string[] = Array.from(
 new Set(product.variants.flatMap((v: VariantDTO) => Object.keys(v.attributes))),
 );

 // isFoodOrPerishable: detecta produtos gastronômicos ou perecíveis para adaptar políticas
 const isFoodOrPerishable = useMemo(() => {
 const text =
 `${product.title} ${product.brand || ""} ${product.categories?.map((c: any) => c.name || c.slug).join(" ") || ""}`.toLowerCase();
 return [
 "burger",
 "lanche",
 "hambúrguer",
 "café",
 "grãos",
 "comida",
 "artesanal",
 "queijo",
 "prato",
 "pizza",
 "doce",
 "gastronomia",
 "bebida",
 ].some((k) => text.includes(k));
 }, [product]);

 // allOutOfStock: product is truly unavailable only when ALL variants have no stock AND no backorder allowed
 const allOutOfStock =
 product.variants.length > 0 &&
 product.variants.every((v: VariantDTO) => v.availableQty <= 0 && !v.allowBackorder);

 const router = useRouter();

 const search = Route.useSearch();

 // Encontra a variação selecionada pela URL (BFF Catalog Explosion) ou fallback
 const initialVariant = useMemo(() => {
 if (search.v) {
 const match = product.variants.find((v: VariantDTO) => v.id === search.v);
 if (match) return match;
 }
 // Prefer variant with stock, then backorder-enabled, then first
 const hasStock = product.variants.filter((v: VariantDTO) => v.availableQty > 0);
 const hasBackorder = product.variants.filter(
 (v: VariantDTO) => v.availableQty <= 0 && v.allowBackorder,
 );
 return hasStock.length > 0
 ? hasStock[0]
 : hasBackorder.length > 0
 ? hasBackorder[0]
 : product.variants[0];
 }, [product.variants, search.v]);

 // Initialize selected attributes with the first variant's attributes
 const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>(
 initialVariant?.attributes || {},
 );

 // Initialize selected options (e.g. additional configurable groups)
 const [selectedOptions, setSelectedOptions] = useState<Record<string, string | string[]>>(() => {
 const initial: Record<string, string | string[]> = {};
 if (product.optionGroups) {
 product.optionGroups.forEach((og: any) => {
 const defaults = og.values.filter((v: any) => v.isDefault).map((v: any) => v.id);
 if (defaults.length > 0) {
 if (og.selectionType === "single") {
 initial[og.id] = defaults[0];
 } else {
 initial[og.id] = defaults;
 }
 }
 });
 }
 return initial;
 });

 const [quantity, setQuantity] = useState(1);
 const [isAdding, setIsAdding] = useState(false);
 const [isReportModalOpen, setIsReportModalOpen] = useState(false);
 const [activeMedia, setActiveMedia] = useState<ProductMediaDTO | null>(coverImage);
 const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
 const [isWaitlistOpen, setIsWaitlistOpen] = useState(false);
 const [zipcode, setZipcode] = useState("");
 const [shippingRates, setShippingRates] = useState<any[] | null>(null);
 const [loadingShipping, setLoadingShipping] = useState(false);
 const isInternational =
 (product as any)?.shipping_origin === "international" ||
 (product as any)?.attributes?.shipping_origin === "international";
 const storeLocation = (product as any)?.store
 ? [(product as any).store.city, (product as any).store.state].filter(Boolean).join(", ")
 : null;
 const storePhone =
 (product as any)?.store?.phone ||
 (product as any)?.store?.whatsapp ||
 (product as any)?.seller?.phone;

 // Social Stats Queries
 const { data: reviewStats } = useQuery({
 queryKey: ["reviewStats", product.id],
 queryFn: () => getProductReviewStats({ data: { productId: product.id } }),
 initialData: { average_rating: 0, total_reviews: 0 },
 });

 const { data: reviewsList, refetch: refetchReviews } = useQuery({
 queryKey: ["reviewsList", product.id],
 queryFn: () => getProductReviewsList({ data: { productId: product.id } }),
 initialData: [],
 });

 const targetStoreId = product.store_id || product.storeId || undefined;

 const { data: followStatus, refetch: refetchFollowStatus } = useQuery({
 queryKey: ["storeFollow", targetStoreId],
 queryFn: () => getStoreFollowStatus({ data: { storeId: targetStoreId } }),
 initialData: { following: false },
 enabled: Boolean(targetStoreId),
 });

 const [optimisticFollow, setOptimisticFollow] = useState<boolean | null>(null);
 const isFollowingStore = optimisticFollow !== null ? optimisticFollow : Boolean(followStatus?.following);

 // ── 1. Resolução da Variante Selecionada ──
 const selectedVariant = useMemo(() => {
 const attrKeys = Object.keys(selectedAttributes);
 if (attrKeys.length > 0) {
 const match = product.variants.find((v: VariantDTO) => {
 return attrKeys.every((k) => v.attributes?.[k] === selectedAttributes[k]);
 });
 if (match) return match;
 }
 return initialVariant || product.variants[0] || null;
 }, [product.variants, selectedAttributes, initialVariant]);

 // Sincroniza a variante com a URL para SEO e compartilhamento
 useEffect(() => {
 if (selectedVariant && selectedVariant.id !== (search as any)?.v) {
 router.navigate({
 search: { ...(search as any), v: selectedVariant.id } as any,
 replace: true,
 });
 }
 }, [selectedVariant]);

 const { refreshCart, setIsCartOpen, setCartData } = useCartContext();

 const handleAddToCart = async () => {
 const targetVariantId = selectedVariant?.id || product.variants?.[0]?.id;

 if (!targetVariantId && !product.id) {
 toast.error("Por favor, selecione um tamanho ou opção do produto.");
 return;
 }

 setIsAdding(true);
 try {
 const res = await addToCart({
 data: {
 variantId: targetVariantId || undefined,
 productId: product.id,
 quantity: quantity || 1,
 options: Object.keys(selectedOptions).length > 0 ? selectedOptions : undefined,
 },
 });

 if (!res || res.status === "error") {
 throw new Error(
 (res as any)?.message || "Falha ao adicionar ao carrinho. Verifique sua conexão ou tente novamente.",
 );
 }

 if (!(res as any).cart && (!(res as any).globalCarts || (res as any).globalCarts.length === 0)) {
 throw new Error("Falha ao sincronizar carrinho.");
 }

 setCartData(((res as any).cart || (res as any).globalCarts?.[0]) as any, (res as any).globalCarts as any);

  // Feedback imediato com som, animação e abertura da gaveta
  playMessageChime();
  toast.success("Adicionado ao carrinho com sucesso!");
  setIsCartOpen(true);

 // Omni-telemetria para Meta Pixel + CAPI + Google Ads
 trackAddToCartEvent({
 storeId: product.store_id || (product as any)?.storeId || (product as any)?.store?.id,
 productId: product.id,
 productTitle: product.title,
 priceCents: currentPriceCents || product.priceCents || 0,
 quantity: quantity || 1,
 });
 } catch (error: unknown) {
 console.error("[PDP] Erro ao adicionar ao carrinho:", error);
 toast.error(humanizeErrorMessage(error, "Não foi possível adicionar este item à sacola no momento. Tente novamente."));
 } finally {
 setIsAdding(false);
 }
 };

 const handleCalculateShipping = async (e: React.FormEvent) => {
 e.preventDefault();
 const clean = zipcode.replace(/\D/g, "");
 if (clean.length < 8) {
 toast.error("Digite um CEP válido com 8 dígitos.");
 return;
 }
 setLoadingShipping(true);
 try {
 const res = await calculateShipping({
 data: {
 zipcode: clean,
 productId: product.id,
 storeId: targetStoreId,
 },
 });
 if (res) {
 setShippingRates(res);
 if (res.length === 0) {
 toast.info("Nenhuma tabela automática para este CEP. Consulte cotação direta com a loja.");
 } else {
 toast.success("Frete calculado com sucesso!");
 }
 } else {
 setShippingRates([]);
 toast.error("Erro ao consultar frete.");
 }
 } catch (error) {
 setShippingRates([]);
 toast.error("Falha de rede ao consultar frete.");
 } finally {
 setLoadingShipping(false);
 }
 };

 // Avaliações públicas são somente leitura (escrita restrita a pedidos entregues)

 const handleToggleFollow = async () => {
 if (!targetStoreId) {
 toast.error("Identificador da loja não disponível.");
 return;
 }
 const previousState = isFollowingStore;
 const nextState = !previousState;
 setOptimisticFollow(nextState);
 try {
 const res = await toggleStoreFollow({
 data: { storeId: targetStoreId },
 });
 setOptimisticFollow(res.following);
 toast.success(
 res.following ? "Você agora está seguindo a loja!" : "Você deixou de seguir a loja.",
 );
 refetchFollowStatus();
 } catch (err: unknown) {
 setOptimisticFollow(previousState);
 const msg = err instanceof Error ? err.message : String(err);
 toast.error(
 msg.includes("login") || msg.includes("autenticado")
 ? "Faça login na sua conta para seguir esta loja."
 : (msg || "Erro ao atualizar status de seguidor da loja.")
 );
 }
 };

 const parseYoutubeId = (url: string) => {
 const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
 const match = url.match(regExp);
 return match && match[2].length === 11 ? match[2] : null;
 };

 const currentPriceCents = useMemo(() => {
 const base = selectedVariant ? selectedVariant.effectivePriceCents : product.priceCents;
 const optionsModifier = product.optionGroups?.reduce((acc: number, og: any) => {
 const selection = selectedOptions[og.id];
 if (!selection) return acc;
 if (Array.isArray(selection)) {
 return (
 acc +
 selection.reduce((subAcc: number, valId: string) => {
 const val = og.values.find((v: any) => v.id === valId);
 return subAcc + (val?.priceModifierCents || 0);
 }, 0)
 );
 } else {
 const val = og.values.find((v: any) => v.id === selection);
 return acc + (val?.priceModifierCents || 0);
 }
 }, 0) || 0;
 return base + optionsModifier;
 }, [selectedVariant, product.priceCents, product.optionGroups, selectedOptions]);

 const currentThumbnailUrl = activeMedia?.url || coverImage?.url || null;

 const isTravelProduct = Boolean(
 (product as any)?.attributes?.travel ||
 (product as any)?.metadata?.travel ||
 (product as any)?.metadata?.travel_package ||
 (product as any)?.product_type?.slug === "pacote-viagem" ||
 (product as any)?.product_type?.slug === "turismo" ||
 (product as any)?.store?.segment === "tourism_agency" ||
 (product as any)?.store?.type === "tourism_agency" ||
 (product as any)?.store?.settings?.segment === "tourism_agency" ||
 product.categories?.some((c: any) =>
 c.slug?.includes("viagem") || c.slug?.includes("turismo") || c.name?.toLowerCase().includes("pacote")
 )
 );

 if (isTravelProduct) {
 const travelData =
 (product as any)?.attributes?.travel ||
 (product as any)?.metadata?.travel_package ||
 (product as any)?.metadata?.travel ||
 {};
 const mediaUrls = product.media?.map((m: any) => m.url) || [];

 return (
 <div className="w-full">
      {/* Omni-telemetria para Meta Pixel + CAPI + Google Ads + Schema.org */}
      <ProductTelemetry
        storeId={product.store_id || (product as any)?.storeId || (product as any)?.store?.id}
        productId={product.id}
        title={product.title}
        description={product.description || (product as any)?.summary}
        priceCents={product.priceCents || 0}
        currency="BRL"
        imageUrl={currentThumbnailUrl || product.media?.[0]?.url}
        brandName={(product as any)?.store?.name || "Waesy"}
        categoryName="Turismo"
        sku={(product as any).sku || product.id}
        inStock={true}
      />
 {/* Breadcrumb */}
 <nav
 aria-label="Navegação estrutural"
 className="mb-4 flex items-center gap-2 text-xs text-muted-foreground font-medium px-4"
 >
 <Link to="/" className="hover:text-foreground">
 Início
 </Link>
 <ChevronRight className="size-3" aria-hidden />
 <Link to="/mercado" className="hover:text-foreground">
 Turismo
 </Link>
 <ChevronRight className="size-3" aria-hidden />
 <span className="text-foreground font-bold truncate max-w-[250px]">{product.title}</span>
 </nav>

 				<TravelPackageDetailView
					packageData={travelData}
					productTitle={product.title}
					priceCents={product.priceCents || 0}
					compareAtCents={product.compareAtCents}
					coverImageUrl={currentThumbnailUrl}
					mediaUrls={mediaUrls}
					storeName={(product as any)?.store?.name}
					storePhone={storePhone}
					isOwner={isOwner}
					onEditClick={() =>
						router.navigate({
							to: "/workspace/catalogo/produtos/$id",
							params: { id: product.id },
						})
					}
				/>
 </div>
 );
 }

  const isDesktop = useIsDesktop(1024);

  const viewProps: ProductDetailViewProps = {
    product,
    selectedVariant,
    selectedAttributes,
    setSelectedAttributes,
    attributeKeys,
    activeMedia,
    setActiveMedia,
    quantity,
    setQuantity,
    selectedOptions,
    setSelectedOptions,
    currentPriceCents: currentPriceCents || 0,
    allOutOfStock,
    handleAddToCart,
    isAdding,
    zipcode,
    setZipcode,
    handleCalculateShipping,
    shippingRates,
    loadingShipping,
    isFollowingStore,
    handleToggleFollow,
    isOwner,
    storeLocation,
    storePhone: (product as any)?.store?.phone || (product as any)?.store?.whatsapp,
    setSizeGuideOpen,
    setIsReportModalOpen,
    setIsWaitlistOpen,
  };

  return (
    <>
      {/* Omni-telemetria para Meta Pixel + CAPI + Google Ads + Schema.org */}
      <ProductTelemetry
        storeId={product.store_id || (product as any)?.storeId || (product as any)?.store?.id}
        productId={product.id}
        title={product.title}
        description={product.description || (product as any)?.summary}
        priceCents={currentPriceCents || product.priceCents || 0}
        currency="BRL"
        imageUrl={currentThumbnailUrl || product.media?.[0]?.url}
        brandName={(product as any)?.store?.name || "Waesy"}
        categoryName={product.categories?.[0]?.name || "Geral"}
        sku={selectedVariant?.sku || (product as any).sku || product.id}
        inStock={!allOutOfStock}
      />

      {isDesktop ? (
        <ProductDetailDesktop {...viewProps} />
      ) : (
        <ProductDetailMobile {...viewProps} />
      )}

      {/* Sheets & Modais Globais */}
      <SizeGuideSheet open={sizeGuideOpen} onOpenChange={setSizeGuideOpen} />

      <TagFraudDialog
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        productId={product.id}
        storeId={product.storeId || product.store_id || "store-default"}
        productTitle={product.title}
      />

      <ProductWaitlistSheet
        open={isWaitlistOpen}
        onOpenChange={setIsWaitlistOpen}
        product={{
          id: product.id,
          title: product.title,
          storeId: product.storeId || product.store_id || "",
          coverImageUrl: coverImage?.url || product.media?.[0]?.url,
        }}
        variant={selectedVariant}
      />
    </>
  );
}
