import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ImageOff, ShoppingBag, ChevronRight, Star, Truck, ShieldCheck, Check, HelpCircle, MapPin, RotateCcw, BadgePercent, Play, MessageCircle, Mail, User, Info, Loader2, Layers, ChevronRight as ChevronIcon, ShieldAlert, Users, Scale, Clock, BellRing, Package, Minus, Plus } from 'lucide-react';
import { TagFraudDialog } from "@/components/commerce/tag-fraud-dialog";
import { ProductWaitlistSheet } from "@/components/commerce/product-waitlist-sheet";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageSkeleton } from "@/components/state/loading";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { EmptyState, ErrorState } from "@/components/state/states";
import { PriceDisplay } from "@/components/commerce/price-display";
import { getProductBySlug } from "@/services/product.functions";
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
    const mediaUrls = (product.images || []).map((img: any) => (typeof img === "string" ? img : img.url)).filter(Boolean);

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
          brand: product.brand,
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
 toast.error(
 error instanceof Error
 ? error.message
 : "Erro ao adicionar ao carrinho.",
 );
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

  return (
    <div className="w-full max-w-6xl mx-auto px-0 sm:px-4 md:px-6 py-0 sm:py-4 pb-28 lg:pb-12 space-y-6">
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

      {/* Breadcrumb — Alinhado com padding sutil no mobile */}
      <nav
        aria-label="Navegação estrutural"
        className="px-4 sm:px-0 flex items-center gap-1.5 text-xs text-muted-foreground font-medium overflow-x-auto no-scrollbar py-2"
      >
        <Link to="/" className="hover:text-foreground shrink-0">
          Início
        </Link>
        <ChevronRight className="size-3 shrink-0" aria-hidden />
        <Link to="/mercado" className="hover:text-foreground shrink-0">
          Catálogo
        </Link>
        {product.categories && product.categories.length > 0 && (
          <>
            <ChevronRight className="size-3 shrink-0" aria-hidden />
            <Link
              to="/mercado"
              search={{ categoria: product.categories[0].slug }}
              className="hover:text-foreground truncate max-w-[140px] shrink-0"
            >
              {product.categories[0].name}
            </Link>
          </>
        )}
        <ChevronRight className="size-3 shrink-0" aria-hidden />
        <span className="text-foreground font-semibold truncate max-w-[180px] sm:max-w-xs">{product.title}</span>
      </nav>

      {/* Grid Principal Split 12 Colunas (7 cols conteúdo à esquerda / 5 cols sticky à direita) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-start">
        
        {/* ======================================================== */}
        {/* COLUNA ESQUERDA (7 Colunas): Mídia, Specs, Sobre, Avaliações */}
        {/* ======================================================== */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Mídia & Galeria (Edge-to-Edge no Mobile, Galeria no Desktop) */}
          <div className="w-full flex flex-col sm:flex-row gap-3 items-start">
            {/* Strip vertical de miniaturas no desktop */}
            {product.media.length > 1 && (
              <div className="hidden sm:flex flex-col gap-2 w-16 shrink-0 max-h-[500px] overflow-y-auto no-scrollbar pr-0.5">
                {product.media.map((m: ProductMediaDTO) => {
                  const isVideo = m.mediaType === "video";
                  const active = activeMedia?.id === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setActiveMedia(m)}
                      className={cn(
                        "relative aspect-square w-14 shrink-0 rounded-xl overflow-hidden border transition-all duration-200 cursor-pointer",
                        active
                          ? "border-primary ring-2 ring-primary/20 scale-[1.03]"
                          : "border-border/60 hover:border-primary/50 bg-secondary"
                      )}
                    >
                      {isVideo ? (
                        <div className="relative size-full bg-black/20 flex items-center justify-center">
                          <Play className="size-4 text-white fill-white relative z-10" />
                          {m.url.includes("youtube.com") || m.url.includes("youtu.be") ? (
                            <img
                              src={`https://img.youtube.com/vi/${parseYoutubeId(m.url)}/hqdefault.jpg`}
                              alt="Video thumbnail"
                              className="absolute size-full object-cover opacity-60"
                            />
                          ) : (
                            <ImageOff className="size-4 text-white opacity-40" />
                          )}
                        </div>
                      ) : (
                        <img
                          src={m.url}
                          alt={m.alt ?? ""}
                          loading="lazy"
                          className="size-full object-cover"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Viewport Principal */}
            <div className="flex-1 w-full relative">
              <div className="relative w-full aspect-square sm:aspect-[4/3] md:aspect-square overflow-hidden bg-secondary rounded-none sm:rounded-2xl border-y sm:border border-border/50">
                {activeMedia ? (
                  activeMedia.mediaType === "video" ? (
                    parseYoutubeId(activeMedia.url) ? (
                      <iframe
                        src={`https://www.youtube.com/embed/${parseYoutubeId(activeMedia.url)}?autoplay=1`}
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="absolute size-full"
                        title="Product Video View"
                      />
                    ) : (
                      <video
                        src={activeMedia.url}
                        controls
                        autoPlay
                        className="absolute size-full object-contain"
                      />
                    )
                  ) : (
                    <img
                      src={activeMedia.url}
                      alt={activeMedia.alt ?? product.title}
                      loading="eager"
                      className="size-full object-cover"
                    />
                  )
                ) : (
                  <div className="grid size-full place-items-center text-muted-foreground">
                    <ImageOff className="size-16 stroke-1" aria-hidden />
                  </div>
                )}

                {/* Pill contador de fotos no Mobile */}
                {product.media.length > 1 && (
                  <div className="sm:hidden absolute bottom-3 right-3 bg-background/90 backdrop-blur-md text-foreground text-[11px] font-mono font-bold px-2.5 py-1 rounded-full border border-border/40 shadow-xs">
                    {product.media.findIndex((m: any) => m.id === activeMedia?.id) + 1 || 1} / {product.media.length}
                  </div>
                )}
              </div>

              {/* Miniaturas horizontais no Mobile (scroll suave sem quebra) */}
              {product.media.length > 1 && (
                <div className="sm:hidden flex items-center gap-2 overflow-x-auto no-scrollbar px-3 py-2">
                  {product.media.map((m: ProductMediaDTO) => {
                    const active = activeMedia?.id === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setActiveMedia(m)}
                        className={cn(
                          "relative size-12 shrink-0 rounded-lg overflow-hidden border transition-all cursor-pointer",
                          active
                            ? "border-primary ring-2 ring-primary/20 scale-105"
                            : "border-border/60 opacity-70"
                        )}
                      >
                        <img src={m.url} alt="" className="size-full object-cover" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── BLOCO MOBILE-FIRST: Título, Preço e Seletores na leitura do fluxo ── */}
          <div className="block lg:hidden px-4 sm:px-0 space-y-4">
            <div className="space-y-1.5">
              {product.brand && (
                <span className="text-xs font-bold tracking-wider uppercase text-primary">
                  {product.brand}
                </span>
              )}
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground leading-snug">
                {product.title}
              </h1>

              {/* Preço Autorizado com Desconto */}
              <div className="flex items-baseline gap-3 pt-1">
                <PriceDisplay
                  amountCents={currentPriceCents}
                  compareAtCents={product.compareAtCents}
                  size="lg"
                />
                {product.compareAtCents && product.compareAtCents > product.priceCents && (
                  <span className="text-xs font-bold text-destructive">
                    {Math.round(((product.compareAtCents - product.priceCents) / product.compareAtCents) * 100)}% OFF
                  </span>
                )}
              </div>
            </div>

            {/* Disponibilidade / Esgotado */}
            {product.showStockPublicly && allOutOfStock && (
              <span className="text-xs font-bold text-destructive">
                Sem estoque disponível
              </span>
            )}

            {/* Seletores de Atributos (Cores e Tamanhos) no Mobile */}
            {attributeKeys.length > 0 && (
              <div className="space-y-4 pt-3 border-t border-border/50">
                {attributeKeys.map((key: string) => {
                  const values: string[] = Array.from(
                    new Set(
                      product.variants
                        .map((v: VariantDTO) => v.attributes[key])
                        .filter((val): val is string => typeof val === "string")
                    )
                  );
                  const isColor = key.toLowerCase() === "cor" || key.toLowerCase() === "color";
                  const isSize = key.toLowerCase() === "tamanho" || key.toLowerCase() === "size";

                  return (
                    <div key={key} className="space-y-2">
                      <div className="flex justify-between items-center text-xs font-medium text-foreground">
                        <span className="capitalize">
                          {key}: <strong className="text-foreground">{selectedAttributes[key]}</strong>
                        </span>
                        {isSize && !isFoodOrPerishable && (
                          <button
                            type="button"
                            onClick={() => setSizeGuideOpen(true)}
                            className="text-xs text-primary hover:underline font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Info className="size-3.5" />
                            Guia de tamanhos
                          </button>
                        )}
                      </div>

                      {isColor ? (
                        <div className="flex flex-wrap gap-2.5">
                          {values.map((val: string) => {
                            const isSelected = selectedAttributes[key] === val;
                            const colorHex = getColorHex(val);
                            return (
                              <button
                                key={val}
                                type="button"
                                title={val}
                                onClick={() => setSelectedAttributes((prev) => ({ ...prev, [key]: val }))}
                                className={cn(
                                  "group relative size-8 rounded-full border transition-all cursor-pointer",
                                  isSelected
                                    ? "ring-2 ring-primary ring-offset-2 border-primary scale-110"
                                    : "border-border/80 hover:scale-105"
                                )}
                                style={{ backgroundColor: colorHex }}
                              >
                                {val.toLowerCase() === "branco" && (
                                  <span className="absolute inset-0 rounded-full border border-black/10" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {values.map((val: string) => {
                            const isSelected = selectedAttributes[key] === val;
                            const hypotheticVariant = product.variants.find((v: VariantDTO) => {
                              const testAttrs = { ...selectedAttributes, [key]: val };
                              return Object.entries(testAttrs).every(([tk, tv]) => v.attributes[tk] === tv);
                            });
                            const isOptionOutOfStock = hypotheticVariant && hypotheticVariant.availableQty <= 0;

                            return (
                              <button
                                key={val}
                                type="button"
                                disabled={isOptionOutOfStock && !hypotheticVariant?.allowBackorder}
                                onClick={() => setSelectedAttributes((prev) => ({ ...prev, [key]: val }))}
                                className={cn(
                                  "min-h-10 border px-3.5 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer",
                                  isSelected
                                    ? "border-primary bg-primary text-primary-foreground font-bold shadow-xs"
                                    : isOptionOutOfStock && !hypotheticVariant?.allowBackorder
                                    ? "border-dashed border-border/40 text-muted-foreground/40 bg-muted/20 cursor-not-allowed line-through opacity-50"
                                    : "border-border/80 bg-card text-foreground hover:border-primary/60"
                                )}
                              >
                                {val}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Option Groups (Adicionais) no Mobile */}
            {product.optionGroups && product.optionGroups.length > 0 && (
              <div className="space-y-4 pt-3 border-t border-border/50">
                {product.optionGroups.map((og: any) => {
                  const isMultiple = og.selectionType === "multiple";
                  const selection = selectedOptions[og.id] || (isMultiple ? [] : "");

                  const handleOptionToggle = (valId: string) => {
                    setSelectedOptions((prev) => {
                      const current = prev[og.id];
                      if (isMultiple) {
                        const currentArray = Array.isArray(current) ? current : [];
                        if (currentArray.includes(valId)) {
                          return { ...prev, [og.id]: currentArray.filter((id) => id !== valId) };
                        } else {
                          if (og.maxSelections > 0 && currentArray.length >= og.maxSelections) return prev;
                          return { ...prev, [og.id]: [...currentArray, valId] };
                        }
                      } else {
                        if (current === valId && !og.isRequired) return { ...prev, [og.id]: "" };
                        return { ...prev, [og.id]: valId };
                      }
                    });
                  };

                  return (
                    <div key={og.id} className="space-y-2.5">
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-xs font-bold text-foreground">{og.displayName}</p>
                          {og.isRequired && (
                            <p className="text-[10px] uppercase text-primary tracking-wider font-bold">Obrigatório</p>
                          )}
                        </div>
                        <span className="text-[11px] text-muted-foreground font-medium">
                          {isMultiple ? `Até ${og.maxSelections} opções` : "Escolha 1"}
                        </span>
                      </div>
                      <div className="flex flex-col gap-2">
                        {og.values.map((val: any) => {
                          const isSelected = isMultiple
                            ? Array.isArray(selection) && selection.includes(val.id)
                            : selection === val.id;

                          return (
                            <button
                              key={val.id}
                              type="button"
                              onClick={() => handleOptionToggle(val.id)}
                              className={cn(
                                "flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer gap-3",
                                isSelected
                                  ? "border-primary bg-primary/5 ring-1 ring-primary/40"
                                  : "border-border/70 bg-card hover:bg-muted/20"
                              )}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div
                                  className={cn(
                                    "flex items-center justify-center border transition-all shrink-0",
                                    isMultiple ? "size-4 rounded-md" : "size-4 rounded-full",
                                    isSelected
                                      ? "bg-primary border-primary text-primary-foreground"
                                      : "border-muted-foreground/40 bg-background"
                                  )}
                                >
                                  {isSelected && (
                                    isMultiple ? <Check className="size-2.5 stroke-[3]" /> : <span className="size-1.5 bg-primary-foreground rounded-full" />
                                  )}
                                </div>
                                <span className="text-xs font-semibold text-foreground truncate">{val.label}</span>
                              </div>
                              <span className="text-xs font-bold text-foreground font-mono shrink-0">
                                {val.priceModifierCents > 0
                                  ? `+ ${formatMoney(val.priceModifierCents)}`
                                  : "Incluso"}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Ficha Técnica Gastronômica (Cardápio / Padrão iFood) ── */}
          {((product as any).attributes?.dietary_restrictions?.length > 0 ||
            (product as any).attributes?.serves_count ||
            (product as any).attributes?.portion_weight ||
            (product as any).preparationTimeDays ||
            (product as any).attributes?.preparation_time_minutes) && (
            <div className="p-4 sm:p-5 rounded-none sm:rounded-2xl bg-card border-y sm:border border-border/60 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                <Layers className="size-4 text-primary" />
                <span>Especificações do Cardápio</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {(product as any).attributes?.serves_count && (
                  <Badge variant="outline" className="text-xs font-medium bg-muted/30 border-border/60 gap-1.5 py-1 px-3 rounded-lg">
                    <Users className="size-3.5 text-muted-foreground" />
                    <span>Serve {(product as any).attributes.serves_count}</span>
                  </Badge>
                )}
                {(product as any).attributes?.portion_weight && (
                  <Badge variant="outline" className="text-xs font-medium bg-muted/30 border-border/60 gap-1.5 py-1 px-3 rounded-lg">
                    <Scale className="size-3.5 text-muted-foreground" />
                    <span>{(product as any).attributes.portion_weight} {(product as any).attributes?.portion_unit || "g"}</span>
                  </Badge>
                )}
                {((product as any).preparationTimeDays || (product as any).attributes?.preparation_time_minutes) && (
                  <Badge variant="outline" className="text-xs font-medium bg-muted/30 border-border/60 gap-1.5 py-1 px-3 rounded-lg">
                    <Clock className="size-3.5 text-muted-foreground" />
                    <span>{(product as any).preparationTimeDays || (product as any).attributes?.preparation_time_minutes} minutos de preparo</span>
                  </Badge>
                )}
                {((product as any).attributes?.dietary_restrictions || []).map((diet: string) => (
                  <Badge
                    key={diet}
                    variant="secondary"
                    className="text-xs font-bold bg-primary/10 text-primary border border-primary/20 capitalize py-1 px-3 rounded-lg"
                  >
                    {diet.replace("_", " ")}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* ── Ficha Técnica Logística & Dimensões (Mobg Modular) ── */}
          {((product as any).weightKg || (product as any).weight_kg ||
            (product as any).widthCm || (product as any).width_cm ||
            (product as any).heightCm || (product as any).height_cm ||
            (product as any).lengthCm || (product as any).length_cm ||
            (product as any).ean || (product as any).sku ||
            (product as any).manufacturer) && (
            <div className="p-4 sm:p-5 rounded-none sm:rounded-2xl bg-card border-y sm:border border-border/60 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                <Package className="size-4 text-primary" />
                <span>Especificações Técnicas & Dimensões</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {((product as any).widthCm || (product as any).width_cm ||
                  (product as any).heightCm || (product as any).height_cm ||
                  (product as any).lengthCm || (product as any).length_cm) && (
                  <div className="p-3 rounded-xl bg-muted/30 border border-border/40">
                    <span className="text-[10px] text-muted-foreground block font-medium">Dimensões (C x L x A)</span>
                    <span className="font-bold text-foreground font-mono mt-0.5 block">
                      {(product as any).lengthCm || (product as any).length_cm || 0} x {(product as any).widthCm || (product as any).width_cm || 0} x {(product as any).heightCm || (product as any).height_cm || 0} cm
                    </span>
                  </div>
                )}
                {((product as any).weightKg || (product as any).weight_kg) && (
                  <div className="p-3 rounded-xl bg-muted/30 border border-border/40">
                    <span className="text-[10px] text-muted-foreground block font-medium">Peso Líquido</span>
                    <span className="font-bold text-foreground font-mono mt-0.5 block">
                      {(product as any).weightKg || (product as any).weight_kg} kg
                    </span>
                  </div>
                )}
                {(product as any).manufacturer && (
                  <div className="p-3 rounded-xl bg-muted/30 border border-border/40">
                    <span className="text-[10px] text-muted-foreground block font-medium">Fabricante / Marca</span>
                    <span className="font-bold text-foreground truncate mt-0.5 block">
                      {(product as any).manufacturer}
                    </span>
                  </div>
                )}
                {((product as any).ean || (product as any).sku) && (
                  <div className="p-3 rounded-xl bg-muted/30 border border-border/40">
                    <span className="text-[10px] text-muted-foreground block font-medium">
                      {(product as any).ean ? "Código de Barras (EAN)" : "Código SKU"}
                    </span>
                    <span className="font-bold text-foreground font-mono truncate mt-0.5 block">
                      {(product as any).ean || (product as any).sku}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Descrição Canônica "Sobre o Produto" ── */}
          {product.description && (
            <div className="p-4 sm:p-5 rounded-none sm:rounded-2xl bg-card border-y sm:border border-border/60 space-y-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Sobre o Produto
              </h2>
              <p className="text-xs sm:text-sm text-foreground/85 leading-relaxed whitespace-pre-wrap">
                {product.description}
              </p>
            </div>
          )}

          {/* ── Ficha Técnica Dinâmica (Atributos Customizados do CMS) ── */}
          {product.attributes && Object.keys(product.attributes).length > 0 && (
            <div className="p-4 sm:p-5 rounded-none sm:rounded-2xl bg-card border-y sm:border border-border/60 space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Características & Detalhes
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {Object.entries(product.attributes).map(([key, value]) => {
                  if (value === null || value === "" || value === false) return null;
                  return (
                    <div key={key} className="p-2.5 rounded-xl bg-muted/20 border border-border/40 flex items-center justify-between gap-2">
                      <span className="text-muted-foreground capitalize font-medium">{key}</span>
                      <span className="font-bold text-foreground">{value === true ? "Sim" : String(value)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── BLOCO MOBILE-ONLY: Frete e Loja no fluxo antes das avaliações ── */}
          <div className="block lg:hidden space-y-4">
            {/* Modalidades de Envio e Simulação */}
            <div className="p-4 rounded-none sm:rounded-2xl bg-card border-y sm:border border-border/60 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-foreground">
                <div className="flex items-center gap-2">
                  <Truck className="size-4 text-primary" />
                  <span>Frete & Formas de Entrega</span>
                </div>
                {storeLocation && (
                  <span className="text-[10px] text-muted-foreground font-mono">{storeLocation}</span>
                )}
              </div>
              <form onSubmit={handleCalculateShipping} className="flex gap-2">
                <Input
                  placeholder="Digite seu CEP (Ex: 89801-000)"
                  value={zipcode}
                  onChange={(e) => setZipcode(e.target.value)}
                  className="h-11 text-xs rounded-xl bg-muted/30"
                />
                <Button type="submit" className="h-11 font-bold px-4 rounded-xl shrink-0 cursor-pointer" disabled={loadingShipping}>
                  {loadingShipping ? <Loader2 className="size-4 animate-spin" /> : "Calcular"}
                </Button>
              </form>
              {shippingRates !== null && (
                <div className="space-y-1.5 pt-1">
                  {shippingRates.length > 0 ? (
                    shippingRates.map((rate, idx) => (
                      <div key={rate.id || idx} className="flex justify-between items-center text-xs p-2.5 rounded-xl border border-border/50 bg-muted/20">
                        <div>
                          <p className="font-bold text-foreground">{rate.service_name || rate.name || rate.provider}</p>
                          <p className="text-[10px] text-muted-foreground">Prazo: {rate.estimated_days} dias úteis</p>
                        </div>
                        <span className="font-bold text-foreground font-mono">
                          {rate.price_cents === 0 ? <span className="text-emerald-600">Grátis</span> : formatMoney(rate.price_cents)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground">Frete sob cotação direta com o vendedor.</p>
                  )}
                </div>
              )}
            </div>

            {/* Card Loja Vendedora */}
            <div className="p-4 rounded-none sm:rounded-2xl bg-card border-y sm:border border-border/60 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center font-black text-xs text-primary shrink-0">
                  {(product as any).store?.name?.slice(0, 2).toUpperCase() || "LJ"}
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground font-mono">Vendido por</span>
                  <Link
                    to="/perfil-da-loja"
                    search={{ storeId: product.store_id || (product as any).store?.id }}
                    className="text-xs font-bold text-foreground hover:text-primary transition-colors truncate block"
                  >
                    {(product as any).store?.name || "Loja Parceira"}
                  </Link>
                </div>
              </div>
              <Button asChild variant="outline" size="sm" className="h-8 text-xs font-bold rounded-xl shrink-0">
                <Link to="/perfil-da-loja" search={{ storeId: product.store_id || (product as any).store?.id }}>
                  Ver Loja
                </Link>
              </Button>
            </div>
          </div>

          {/* ── Avaliações Reais dos Clientes (Design Limpo em Card Integrado) ── */}
          <div className="p-5 sm:p-6 rounded-none sm:rounded-2xl bg-card border-y sm:border border-border/60 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/40">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <MessageCircle className="size-4 text-primary" />
                  <span>Avaliações dos Clientes</span>
                </h3>
                <p className="text-xs text-muted-foreground">
                  Baseado em {reviewStats.total_reviews} {reviewStats.total_reviews === 1 ? "avaliação" : "avaliações"} de compradores reais.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-2xl sm:text-3xl font-bold font-mono text-foreground">
                  {reviewStats.average_rating > 0 ? reviewStats.average_rating.toFixed(1) : "5.0"}
                </div>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={cn(
                        "size-4",
                        star <= Math.round(reviewStats.average_rating || 5)
                          ? "fill-amber-400 text-amber-500"
                          : "text-muted-foreground/30"
                      )}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Lista de Avaliações */}
            {reviewsList.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                Nenhuma avaliação publicada ainda. Seja o primeiro a avaliar após receber seu pedido!
              </div>
            ) : (
              <div className="space-y-3">
                {reviewsList.map((review: any) => (
                  <div key={review.id} className="p-3.5 rounded-xl bg-muted/20 border border-border/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="size-6 rounded-full bg-secondary flex items-center justify-center text-[10px] font-black uppercase text-foreground">
                          {review.userName.slice(0, 2)}
                        </span>
                        <span className="text-xs font-bold text-foreground">{review.userName}</span>
                        <Badge variant="outline" className="text-[9px] text-emerald-600 bg-emerald-500/10 border-emerald-500/20 py-0 px-1.5 rounded">
                          Verificado
                        </Badge>
                      </div>
                      <span className="text-[10px] text-muted-foreground font-mono">{formatDate(review.createdAt)}</span>
                    </div>
                    {review.comment && (
                      <p className="text-xs text-foreground/85 leading-relaxed">"{review.comment}"</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Builder Complementar (se houver) */}
          {(() => {
            const filteredNodes = (templateTree || []).filter((n: any) => {
              const type = (n?.type || n?.component || n?.name || "").toLowerCase();
              return !type.includes("description") && !type.includes("descrição") && !type.includes("product-info") && !type.includes("header");
            });
            if (!filteredNodes.length) return null;
            return (
              <div className="w-full bg-card sm:rounded-2xl overflow-hidden mt-6">
                <ExperienceRenderer nodes={filteredNodes} transientData={{ product }} />
              </div>
            );
          })()}
        </div>

        {/* ======================================================== */}
        {/* COLUNA DIREITA (5 Colunas - STICKY TOP-24): Compra & Loja */}
        {/* ======================================================== */}
        <div className="hidden lg:flex lg:col-span-5 lg:sticky lg:top-24 flex-col gap-4">
          
          {/* Card Principal de Compra Desktop */}
          <div className="p-6 rounded-2xl border border-border/60 bg-card shadow-xs space-y-5">
            <div className="space-y-1.5">
              {product.brand && (
                <span className="text-xs font-bold tracking-wider uppercase text-primary">
                  {product.brand}
                </span>
              )}
              <h1 className="text-2xl font-bold tracking-tight text-foreground leading-snug">
                {product.title}
              </h1>

              {/* Preço Desktop */}
              <div className="flex items-baseline gap-3 pt-1">
                <PriceDisplay
                  amountCents={currentPriceCents}
                  compareAtCents={product.compareAtCents}
                  size="lg"
                />
                {product.compareAtCents && product.compareAtCents > product.priceCents && (
                  <span className="text-xs font-bold text-destructive">
                    {Math.round(((product.compareAtCents - product.priceCents) / product.compareAtCents) * 100)}% OFF
                  </span>
                )}
              </div>
            </div>

            {/* Disponibilidade / Esgotado */}
            {product.showStockPublicly && allOutOfStock && (
              <span className="text-xs font-bold text-destructive">
                Sem estoque disponível
              </span>
            )}

            {/* Seletores de Atributos (Cores e Tamanhos) */}
            {attributeKeys.length > 0 && (
              <div className="space-y-4 pt-3 border-t border-border/50">
                {attributeKeys.map((key: string) => {
                  const values: string[] = Array.from(
                    new Set(
                      product.variants
                        .map((v: VariantDTO) => v.attributes[key])
                        .filter((val): val is string => typeof val === "string")
                    )
                  );
                  const isColor = key.toLowerCase() === "cor" || key.toLowerCase() === "color";
                  const isSize = key.toLowerCase() === "tamanho" || key.toLowerCase() === "size";

                  return (
                    <div key={key} className="space-y-2">
                      <div className="flex justify-between items-center text-xs font-medium text-foreground">
                        <span className="capitalize">
                          {key}: <strong className="text-foreground">{selectedAttributes[key]}</strong>
                        </span>
                        {isSize && !isFoodOrPerishable && (
                          <button
                            type="button"
                            onClick={() => setSizeGuideOpen(true)}
                            className="text-xs text-primary hover:underline font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Info className="size-3.5" />
                            Guia de tamanhos
                          </button>
                        )}
                      </div>

                      {isColor ? (
                        <div className="flex flex-wrap gap-2.5">
                          {values.map((val: string) => {
                            const isSelected = selectedAttributes[key] === val;
                            const colorHex = getColorHex(val);
                            return (
                              <button
                                key={val}
                                type="button"
                                title={val}
                                onClick={() => setSelectedAttributes((prev) => ({ ...prev, [key]: val }))}
                                className={cn(
                                  "group relative size-8 rounded-full border transition-all cursor-pointer",
                                  isSelected
                                    ? "ring-2 ring-primary ring-offset-2 border-primary scale-110"
                                    : "border-border/80 hover:scale-105"
                                )}
                                style={{ backgroundColor: colorHex }}
                              >
                                {val.toLowerCase() === "branco" && (
                                  <span className="absolute inset-0 rounded-full border border-black/10" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {values.map((val: string) => {
                            const isSelected = selectedAttributes[key] === val;
                            const hypotheticVariant = product.variants.find((v: VariantDTO) => {
                              const testAttrs = { ...selectedAttributes, [key]: val };
                              return Object.entries(testAttrs).every(([tk, tv]) => v.attributes[tk] === tv);
                            });
                            const isOptionOutOfStock = hypotheticVariant && hypotheticVariant.availableQty <= 0;

                            return (
                              <button
                                key={val}
                                type="button"
                                disabled={isOptionOutOfStock && !hypotheticVariant?.allowBackorder}
                                onClick={() => setSelectedAttributes((prev) => ({ ...prev, [key]: val }))}
                                className={cn(
                                  "min-h-10 border px-3.5 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer",
                                  isSelected
                                    ? "border-primary bg-primary text-primary-foreground font-bold shadow-xs"
                                    : isOptionOutOfStock && !hypotheticVariant?.allowBackorder
                                    ? "border-dashed border-border/40 text-muted-foreground/40 bg-muted/20 cursor-not-allowed line-through opacity-50"
                                    : "border-border/80 bg-card text-foreground hover:border-primary/60"
                                )}
                              >
                                {val}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Option Groups (Adicionais) */}
            {product.optionGroups && product.optionGroups.length > 0 && (
              <div className="space-y-4 pt-3 border-t border-border/50">
                {product.optionGroups.map((og: any) => {
                  const isMultiple = og.selectionType === "multiple";
                  const selection = selectedOptions[og.id] || (isMultiple ? [] : "");

                  const handleOptionToggle = (valId: string) => {
                    setSelectedOptions((prev) => {
                      const current = prev[og.id];
                      if (isMultiple) {
                        const currentArray = Array.isArray(current) ? current : [];
                        if (currentArray.includes(valId)) {
                          return { ...prev, [og.id]: currentArray.filter((id) => id !== valId) };
                        } else {
                          if (og.maxSelections > 0 && currentArray.length >= og.maxSelections) return prev;
                          return { ...prev, [og.id]: [...currentArray, valId] };
                        }
                      } else {
                        if (current === valId && !og.isRequired) return { ...prev, [og.id]: "" };
                        return { ...prev, [og.id]: valId };
                      }
                    });
                  };

                  return (
                    <div key={og.id} className="space-y-2.5">
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-xs font-bold text-foreground">{og.displayName}</p>
                          {og.isRequired && (
                            <p className="text-[10px] uppercase text-primary tracking-wider font-bold">Obrigatório</p>
                          )}
                        </div>
                        <span className="text-[11px] text-muted-foreground font-medium">
                          {isMultiple ? `Até ${og.maxSelections} opções` : "Escolha 1"}
                        </span>
                      </div>
                      <div className="flex flex-col gap-2">
                        {og.values.map((val: any) => {
                          const isSelected = isMultiple
                            ? Array.isArray(selection) && selection.includes(val.id)
                            : selection === val.id;

                          return (
                            <button
                              key={val.id}
                              type="button"
                              onClick={() => handleOptionToggle(val.id)}
                              className={cn(
                                "flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer gap-3",
                                isSelected
                                  ? "border-primary bg-primary/5 ring-1 ring-primary/40"
                                  : "border-border/70 bg-card hover:bg-muted/20"
                              )}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div
                                  className={cn(
                                    "flex items-center justify-center border transition-all shrink-0",
                                    isMultiple ? "size-4 rounded-md" : "size-4 rounded-full",
                                    isSelected
                                      ? "bg-primary border-primary text-primary-foreground"
                                      : "border-muted-foreground/40 bg-background"
                                  )}
                                >
                                  {isSelected && (
                                    isMultiple ? <Check className="size-2.5 stroke-[3]" /> : <span className="size-1.5 bg-primary-foreground rounded-full" />
                                  )}
                                </div>
                                <span className="text-xs font-semibold text-foreground truncate">{val.label}</span>
                              </div>
                              <span className="text-xs font-bold text-foreground font-mono shrink-0">
                                {val.priceModifierCents > 0
                                  ? `+ ${formatMoney(val.priceModifierCents)}`
                                  : "Incluso"}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Ação de Compra Desktop (Quantidade + Botão Adicionar) */}
            <div className="space-y-3 pt-3 border-t border-border/50">
              {(() => {
                const isBackorder = selectedVariant && selectedVariant.availableQty <= 0 && selectedVariant.allowBackorder;
                const variantHardBlocked = selectedVariant && selectedVariant.availableQty <= 0 && !selectedVariant.allowBackorder;

                if ((allOutOfStock || variantHardBlocked) && !isBackorder) {
                  return (
                    <div className="space-y-2">
                      <Button
                        type="button"
                        size="lg"
                        className="w-full font-bold text-xs uppercase rounded-xl h-12 bg-muted text-foreground border border-border/80 hover:bg-muted/80 gap-2 cursor-pointer"
                        onClick={() => setIsWaitlistOpen(true)}
                      >
                        <BellRing className="size-4 text-primary" />
                        <span>Avise-me quando chegar</span>
                      </Button>
                      <p className="text-[11px] text-muted-foreground text-center">
                        Este item está esgotado. Entre na lista de espera.
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-3">
                      {/* Seletor de Quantidade Desktop */}
                      <div className="flex items-center rounded-xl border border-border/70 bg-secondary/50 h-12 px-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                          className="size-9 flex items-center justify-center font-bold text-sm text-foreground hover:bg-muted rounded-lg active:scale-90 transition-all cursor-pointer"
                          aria-label="Diminuir"
                        >
                          <Minus className="size-4" />
                        </button>
                        <span className="w-8 text-center font-bold text-sm text-foreground font-mono">
                          {quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => setQuantity((prev) => prev + 1)}
                          className="size-9 flex items-center justify-center font-bold text-sm text-foreground hover:bg-muted rounded-lg active:scale-90 transition-all cursor-pointer"
                          aria-label="Aumentar"
                        >
                          <Plus className="size-4" />
                        </button>
                      </div>

                      {/* Botão Primário Adicionar */}
                      <Button
                        size="lg"
                        className={cn(
                          "flex-1 font-bold text-sm uppercase rounded-xl h-12 transition-all cursor-pointer gap-2",
                          isBackorder ? "bg-foreground text-background" : "bg-primary text-primary-foreground hover:bg-primary/90"
                        )}
                        onClick={handleAddToCart}
                        disabled={Boolean(isAdding)}
                      >
                        <ShoppingBag className="size-4" />
                        {isAdding ? "Adicionando..." : isBackorder ? "Encomendar" : "Adicionar ao carrinho"}
                      </Button>
                    </div>

                    {isBackorder && (
                      <p className="text-[11px] text-muted-foreground bg-muted/30 p-2.5 rounded-xl border border-dashed text-center">
                        🚚 Produto sob encomenda. Prazo adicional estimado:{""}
                        <strong> {selectedVariant.backorderLeadTimeDays || 7} dias úteis</strong>.
                      </p>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Simulação de Frete Desktop */}
            <div className="pt-3 border-t border-border/50 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-foreground">
                <div className="flex items-center gap-2">
                  <Truck className="size-4 text-primary" />
                  <span>Calcular Frete & Prazo</span>
                </div>
                {storeLocation && (
                  <span className="text-[10px] text-muted-foreground font-mono">{storeLocation}</span>
                )}
              </div>
              <form onSubmit={handleCalculateShipping} className="flex gap-2">
                <Input
                  placeholder="Digite seu CEP"
                  value={zipcode}
                  onChange={(e) => setZipcode(e.target.value)}
                  className="h-10 text-xs rounded-xl bg-muted/30"
                />
                <Button type="submit" size="sm" className="h-10 font-bold px-4 rounded-xl shrink-0 cursor-pointer" disabled={loadingShipping}>
                  {loadingShipping ? <Loader2 className="size-4 animate-spin" /> : "Calcular"}
                </Button>
              </form>
              {shippingRates !== null && (
                <div className="space-y-1.5 pt-1">
                  {shippingRates.length > 0 ? (
                    shippingRates.map((rate, idx) => (
                      <div key={rate.id || idx} className="flex justify-between items-center text-xs p-2.5 rounded-xl border border-border/50 bg-muted/20">
                        <div>
                          <p className="font-bold text-foreground">{rate.service_name || rate.name || rate.provider}</p>
                          <p className="text-[10px] text-muted-foreground">Prazo: {rate.estimated_days} dias úteis</p>
                        </div>
                        <span className="font-bold text-foreground font-mono">
                          {rate.price_cents === 0 ? <span className="text-emerald-600">Grátis</span> : formatMoney(rate.price_cents)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground">Frete sob cotação direta com o vendedor.</p>
                  )}
                </div>
              )}
            </div>

            {/* Selos de Confiança Desktop */}
            <div className="pt-3 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground font-medium">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="size-3.5 text-emerald-500" />
                  Pagamento Seguro
                </span>
                <span className="flex items-center gap-1">
                  <ShieldCheck className="size-3.5 text-emerald-500" />
                  Proteção Waesy
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsReportModalOpen(true)}
                className="flex items-center gap-1 hover:text-destructive transition-colors text-[10px] cursor-pointer"
              >
                <ShieldAlert className="size-3 text-destructive" />
                Reportar oferta
              </button>
            </div>
          </div>

          {/* Card Sobre a Loja Desktop */}
          <div className="p-5 rounded-2xl border border-border/60 bg-card shadow-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="size-11 rounded-xl bg-primary/10 flex items-center justify-center font-black text-sm text-primary shrink-0 border border-primary/20">
                {(product as any).store?.name?.slice(0, 2).toUpperCase() || "LJ"}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-xs text-foreground truncate">
                    {(product as any).store?.name || product.brand || "Loja Parceira"}
                  </h3>
                  <Badge variant="outline" className="text-[9px] bg-primary/10 text-primary border-primary/20 py-0 px-1.5 rounded">
                    Oficial
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                  {(product as any).store?.city ? `${(product as any).store.city} - ${(product as any).store.state || "SC"}` : "Loja Verificada Waesy"}
                </p>
              </div>
            </div>

            <Button
              size="sm"
              variant={isFollowingStore ? "secondary" : "outline"}
              className="text-xs font-bold rounded-xl h-9 shrink-0 cursor-pointer"
              onClick={handleToggleFollow}
            >
              {isFollowingStore ? "Seguindo" : "+ Seguir"}
            </Button>
          </div>
        </div>

      </div>

      {/* ── Mobile Sticky Buy Bar (Thumb Zone) ── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border/60 shadow-lg px-3.5 py-2.5 flex items-center justify-between gap-3 select-none pb-safe">
        {/* Seletor de Quantidade Mobile */}
        <div className="flex items-center rounded-xl bg-secondary/80 border border-border/60 h-11 px-1 shrink-0">
          <button
            type="button"
            onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
            className="size-8 flex items-center justify-center font-black text-sm text-foreground hover:bg-muted rounded-lg active:scale-90 transition-all cursor-pointer"
            aria-label="Diminuir"
          >
            <Minus className="size-3.5" />
          </button>
          <span className="w-7 text-center font-bold text-xs text-foreground font-mono">
            {quantity}
          </span>
          <button
            type="button"
            onClick={() => setQuantity((prev) => prev + 1)}
            className="size-8 flex items-center justify-center font-black text-sm text-foreground hover:bg-muted rounded-lg active:scale-90 transition-all cursor-pointer"
            aria-label="Aumentar"
          >
            <Plus className="size-3.5" />
          </button>
        </div>

        {/* Botão de Compra com Preço Total Multiplicado */}
        {Boolean(allOutOfStock) || Boolean(selectedVariant && selectedVariant.availableQty <= 0 && !selectedVariant.allowBackorder) ? (
          <Button
            size="lg"
            className="flex-1 rounded-xl font-bold text-xs h-11 px-3 bg-muted text-foreground border border-border/80 flex items-center justify-center gap-1.5 cursor-pointer"
            onClick={() => setIsWaitlistOpen(true)}
          >
            <BellRing className="size-3.5 text-primary shrink-0" />
            <span>Avise-me quando chegar</span>
          </Button>
        ) : (
          <Button
            size="lg"
            className="flex-1 rounded-xl font-bold text-xs h-11 px-4 bg-primary text-primary-foreground flex items-center justify-between cursor-pointer active:scale-98 transition-all shadow-sm"
            onClick={handleAddToCart}
            disabled={Boolean(isAdding)}
          >
            <span>
              {isAdding
                ? "Adicionando..."
                : selectedVariant && selectedVariant.availableQty <= 0 && selectedVariant.allowBackorder
                ? "Encomendar"
                : "Adicionar"}
            </span>
            <span className="font-mono font-black text-xs">
              {formatMoney((currentPriceCents || 0) * (quantity || 1))}
            </span>
          </Button>
        )}
      </div>

      {/* Sheets & Modais */}
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
    </div>
  );

}
