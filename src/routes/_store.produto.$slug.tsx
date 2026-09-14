import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ImageOff, ShoppingBag, ChevronRight, Star, Truck, ShieldCheck, Check, HelpCircle, MapPin, RotateCcw, BadgePercent, Play, MessageCircle, Mail, User, Info, Loader2, Layers, ChevronRight as ChevronIcon, ShieldAlert, Users, Scale, Clock, BellRing } from 'lucide-react';
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
import { calculateShipping } from "@/services/shipping.functions";
import { formatMoney } from "@/lib/money";
import { getPublicExperienceDocumentBySlug } from "@/services/builder.functions";
import { addToCart } from "@/services/cart.functions";
import { useCartContext } from "@/lib/cart-context";
import { ProductTelemetry, trackAddToCartEvent } from "@/components/commerce/product-telemetry";
import { toast } from "sonner";
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
 const [productRes, templateRes] = await Promise.all([
 getProductBySlug({ data: { slug: params.slug } }),
 getPublicExperienceDocumentBySlug({
 data: { slug: "default-product-template", document_type: "product_template" },
 }),
 ]);
      return {
        productResult: productRes,
        templateTree: (templateRes as any)?.tree || [],
      };
    } catch (err) {
      console.error("[loader:_store.produto.$slug] Unhandled loader error:", err);
      return {
        productResult: null,
        templateTree: [],
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

 const isTravelPackage = Boolean(
 product.attributes?.travel ||
 (product as any).category?.slug?.includes("turismo") ||
 (product as any).category?.slug?.includes("viag") ||
 (product as any).category?.name?.toLowerCase().includes("turismo") ||
 (product as any).category?.name?.toLowerCase().includes("viagem") ||
 (product as any).category?.name?.toLowerCase().includes("resort")
 );

 if (isTravelPackage) {
 return (
 <TravelPackageDetailView
 packageData={product.attributes?.travel}
 productTitle={product.title}
 priceCents={product.priceCents || 0}
 compareAtCents={product.compareAtCents}
 coverImageUrl={
 product.media?.find((m: any) => m.mediaType === "image")?.url ||
 product.media?.[0]?.url ||
 null
 }
 mediaUrls={
 product.media?.filter((m: any) => m.mediaType === "image")?.map((m: any) => m.url) || []
 }
 storeName={product.store?.name || "Excelência Tour"}
 storePhone={product.store?.phone || "49991448651"}
 />
 );
 }

 return <ProductContent product={product} templateTree={templateTree} />;
}

function ProductContent({
 product: rawProduct,
 templateTree,
}: {
 product: ProductDetailDTO;
 templateTree?: any[];
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

 // Feedback imediato com animação e abertura da gaveta
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
        categoryName="Turismo & Viagens"
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
 Turismo & Viagens
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
 />
 </div>
 );
 }

  return (
    <div className="w-full space-y-8">
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
      {/* Breadcrumb */}
 <nav
 aria-label="Navegação estrutural"
 className="mb-6 flex items-center gap-2 text-xs text-muted-foreground font-medium"
 >
 <Link to="/" className="hover:text-foreground">
 Início
 </Link>
 <ChevronRight className="size-3" aria-hidden />
 <Link to="/mercado" className="hover:text-foreground">
 Catálogo
 </Link>
 {product.categories && product.categories.length > 0 && (
 <>
 <ChevronRight className="size-3" aria-hidden />
 <Link
 to="/mercado"
 search={{ categoria: product.categories[0].slug }}
 className="hover:text-foreground truncate max-w-[150px]"
 >
 {product.categories[0].name}
 </Link>
 </>
 )}
 <ChevronRight className="size-3" aria-hidden />
 <span className="text-foreground font-bold truncate max-w-[200px]">{product.title}</span>
 </nav>

 {/* Product Workspace Split */}
 <div className="grid gap-8 md:grid-cols-12 lg:gap-14">
 {/* LADO ESQUERDO: Media Switcher com strip vertical sem scrollbar feia */}
 <div className="md:col-span-6 flex flex-col sm:flex-row gap-3.5 items-start">
 {/* Strip vertical esquerdo de thumbnails (apenas se houver mais de 1 mídia) */}
 {product.media.length > 1 && (
 <div className="hidden sm:flex flex-col gap-2 w-16 shrink-0 max-h-[480px] overflow-y-auto no-scrollbar pr-0.5">
 {product.media.map((m: ProductMediaDTO) => {
 const isVideo = m.mediaType === "video";
 const active = activeMedia?.id === m.id;
 return (
 <button
 key={m.id}
 onClick={() => setActiveMedia(m)}
 className={`relative aspect-square w-14 shrink-0 rounded-xl overflow-hidden border transition-all duration-200 ${
 active
 ? "border-primary ring-2 ring-primary/20 scale-[1.03]"
 : "border-border/60 hover:border-primary/50 bg-secondary"
 }`}
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

 {/* Main Screen Viewport */}
 <div className="flex-1 w-full space-y-4">
 <Surface
 variant="default"
 padding="none"
 className="w-full relative aspect-square overflow-hidden bg-secondary rounded-2xl "
 >
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
 ></iframe>
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
 className="size-full object-cover hover:scale-105 transition-transform duration-500"
 />
 )
 ) : (
 <div className="grid size-full place-items-center text-muted-foreground">
 <ImageOff className="size-16 stroke-1" aria-hidden />
 </div>
 )}
 </Surface>
 </div>
 </div>

 {/* LADO DIREITO: Info & Atributos Customizados */}
 <div className="md:col-span-6 flex flex-col gap-6 text-left">
 <div className="space-y-2">
 {product.brand && (
 <span className="text-xs font-bold tracking-wider uppercase text-primary bg-primary/10 px-2 py-0.5 rounded">
 {product.brand}
 </span>
 )}
 <h1 className="font-zine text-4xl font-bold leading-none tracking-tighter uppercase text-foreground sm:text-6xl mb-2">
 {product.title}
 </h1>

 {/* Preços Autorizados pelo Servidor com Badges de Desconto */}
 <div className="flex items-baseline gap-3 pt-2">
 <PriceDisplay
 amountCents={currentPriceCents}
 compareAtCents={product.compareAtCents}
 size="lg"
 />
 {product.compareAtCents && product.compareAtCents > product.priceCents && (
 <Badge
 variant="outline"
 className="bg-destructive/10 text-destructive border-destructive/20 text-xs font-bold px-2 py-0.5"
 >
 Estimado -
 {Math.round(
 ((product.compareAtCents - product.priceCents) / product.compareAtCents) * 100,
 )}
 %
 </Badge>
 )}
 </div>

 {/* Descrição Única e Canônica do Produto (Foto > Título > Preço > Descrição) */}
 {product.description && (
 <div className="p-4 rounded-2xl bg-card space-y-1.5 mt-3 border border-border/60">
 <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
 Sobre o Produto
 </h3>
 <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
 {product.description}
 </p>
 </div>
 )}

 {/* Especificações Gastronômicas & Padrão iFood */}
 {((product as any).attributes?.dietary_restrictions?.length > 0 ||
 (product as any).attributes?.serves_count ||
 (product as any).attributes?.portion_weight ||
 (product as any).preparationTimeDays ||
 (product as any).attributes?.preparation_time_minutes) && (
 <div className="p-4 rounded-2xl bg-muted/20 border border-border/50 space-y-3 mt-3">
 <div className="flex items-center gap-2 text-xs font-bold text-foreground">
 <Layers className="size-3.5 text-primary" />
 <span>Especificações do Cardápio</span>
 </div>

 <div className="flex flex-wrap items-center gap-2">
 {/* Serve Até */}
 {(product as any).attributes?.serves_count && (
 <Badge variant="outline" className="text-xs font-medium bg-background gap-1 py-1 px-2.5">
 <Users className="size-3.5 text-muted-foreground" />
 <span>Serve {(product as any).attributes.serves_count}</span>
 </Badge>
 )}

 {/* Peso / Volume */}
 {(product as any).attributes?.portion_weight && (
 <Badge variant="outline" className="text-xs font-medium bg-background gap-1 py-1 px-2.5">
 <Scale className="size-3.5 text-muted-foreground" />
 <span>
 {(product as any).attributes.portion_weight}{" "}
 {(product as any).attributes?.portion_unit || "g"}
 </span>
 </Badge>
 )}

 {/* Tempo de Preparo */}
 {((product as any).preparationTimeDays ||
 (product as any).attributes?.preparation_time_minutes) && (
 <Badge variant="outline" className="text-xs font-medium bg-background gap-1 py-1 px-2.5">
 <Clock className="size-3.5 text-muted-foreground" />
 <span>
 {(product as any).preparationTimeDays ||
 (product as any).attributes?.preparation_time_minutes}{" "}
 minutos de preparo
 </span>
 </Badge>
 )}

 {/* Restrições Alimentares */}
 {((product as any).attributes?.dietary_restrictions || []).map((diet: string) => (
 <Badge
 key={diet}
 variant="secondary"
 className="text-xs font-bold bg-primary/10 text-primary border-primary/20 capitalize py-1 px-2.5"
 >
 {diet.replace("_", " ")}
 </Badge>
 ))}
 </div>
 </div>
 )}
 </div>


 {/* Disponibilidade — visível somente quando a loja optar por exibir estoque */}
 {product.showStockPublicly && allOutOfStock && (
 <Badge variant="destructive" className="w-fit text-xs font-bold py-1 px-3">
 Sem estoque disponível
 </Badge>
 )}


 {/* Selectores de Atributos Customizados */}
 {attributeKeys.length > 0 && (
 <div className="space-y-5 border-t py-5">
 {attributeKeys.map((key: string) => {
 const values: string[] = Array.from(
 new Set(
 product.variants
 .map((v: VariantDTO) => v.attributes[key])
 .filter((val): val is string => typeof val === "string"),
 ),
 );

 const isColor = key.toLowerCase() === "cor" || key.toLowerCase() === "color";
 const isSize = key.toLowerCase() === "tamanho" || key.toLowerCase() === "size";

 return (
 <div key={key} className="space-y-2.5">
 <div className="flex justify-between items-center text-sm font-medium text-foreground">
 <span className="capitalize">
 {key}:{""}
 <span className="text-muted-foreground font-normal">
 {selectedAttributes[key]}
 </span>
 </span>

 {/* Guia de tamanhos link (apenas para moda/calçados, nunca para comida) */}
 {isSize && !isFoodOrPerishable && (
 <button
 type="button"
 onClick={() => setSizeGuideOpen(true)}
 className="text-xs text-primary hover:underline font-bold flex items-center gap-1"
 >
 <Info className="size-3.5" />
 Guia de tamanhos
 </button>
 )}
 </div>

 {/* Renderizador de Cores (Color Swatches) */}
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
 onClick={() =>
 setSelectedAttributes((prev) => ({ ...prev, [key]: val }))
 }
 className={`group relative w-8 h-8 rounded-full border transition-all duration-200 ${isSelected ? "ring-2 ring-primary ring-offset-2 border-primary scale-110" : "border-border/80 hover:scale-105"}`}
 style={{ backgroundColor: colorHex }}
 >
 {val.toLowerCase() === "branco" && (
 <span className="absolute inset-0 rounded-full border border-black/10" />
 )}
 <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block bg-black text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap z-20">
 {val}
 </span>
 </button>
 );
 })}
 </div>
 ) : (
 /* Renderizador de Tamanhos ou Outros Atributos */
 <div className="flex flex-wrap gap-2">
 {values.map((val: string) => {
 const isSelected = selectedAttributes[key] === val;

 // Check if this specific option is in stock by finding the variant matching selectedAttributes but with this value
 const hypotheticVariant = product.variants.find((v: VariantDTO) => {
 const testAttrs = { ...selectedAttributes, [key]: val };
 return Object.entries(testAttrs).every(
 ([tk, tv]) => v.attributes[tk] === tv,
 );
 });
 const isOptionOutOfStock =
 hypotheticVariant && hypotheticVariant.availableQty <= 0;

 return (
 <button
 key={val}
 type="button"
 disabled={isOptionOutOfStock && !hypotheticVariant?.allowBackorder}
 onClick={() =>
 setSelectedAttributes((prev) => ({ ...prev, [key]: val }))
 }
 className={`min-h-10 border px-4 py-2.5 text-xs font-semibold tracking-wide transition-all duration-150 ${isSelected ? "border-primary bg-primary text-primary-foreground font-bold scale-[1.02]" : isOptionOutOfStock && !hypotheticVariant?.allowBackorder ? "border-dashed border-border/40 text-muted-foreground/40 bg-muted/20 cursor-not-allowed line-through opacity-50" : "border-border bg-card text-foreground hover:border-primary hover:text-primary"}`}
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

 {/* Configuração de Adicionais / Opções (Option Groups) */}
 {product.optionGroups && product.optionGroups.length > 0 && (
 <div className="space-y-5 pb-5">
 {product.optionGroups.map((og: any) => {
 const isMultiple = og.selectionType === "multiple";
 const selection = selectedOptions[og.id] || (isMultiple ? [] : "");

 // Helper para atualizar as seleções
 const handleOptionToggle = (valId: string) => {
 setSelectedOptions((prev) => {
 const current = prev[og.id];
 if (isMultiple) {
 const currentArray = Array.isArray(current) ? current : [];
 if (currentArray.includes(valId)) {
 return { ...prev, [og.id]: currentArray.filter((id) => id !== valId) };
 } else {
 // Respeita maxSelections
 if (og.maxSelections > 0 && currentArray.length >= og.maxSelections) {
 return prev;
 }
 return { ...prev, [og.id]: [...currentArray, valId] };
 }
 } else {
 // Radio / Single behavior
 if (current === valId && !og.isRequired) {
 return { ...prev, [og.id]: "" }; // Permite desmarcar se não for obrigatório
 }
 return { ...prev, [og.id]: valId };
 }
 });
 };

 return (
 <div key={og.id} className="space-y-3">
 <div className="flex justify-between items-end">
 <div>
 <p className="text-sm font-semibold text-foreground">{og.displayName}</p>
 {og.isRequired && (
 <p className="text-[10px] uppercase text-primary tracking-wider font-bold">
 Obrigatório
 </p>
 )}
 </div>
 <span className="text-xs text-muted-foreground font-medium">
 {isMultiple ? `Até ${og.maxSelections} opções` : "Escolha 1 opção"}
 </span>
 </div>
 <div className="flex flex-col gap-2.5">
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
 "flex items-center justify-between p-3 rounded-2xl border text-left transition-all cursor-pointer gap-3",
 isSelected
 ? "border-primary bg-primary/5 ring-1 ring-primary/40"
 : "border-border/70 bg-card hover:border-border hover:bg-muted/20"
 )}
 >
 <div className="flex items-center gap-3 min-w-0">
 {/* Foto do Adicional (iFood / AmoOfertas) */}
 {val.imageUrl && (
 <div className="size-12 rounded-xl overflow-hidden shrink-0 border border-border/60 bg-muted">
 <img
 src={val.imageUrl}
 alt={val.label}
 className="size-full object-cover"
 />
 </div>
 )}

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
 isMultiple ? (
 <Check className="size-2.5 stroke-[3]" />
 ) : (
 <span className="size-1.5 bg-primary-foreground rounded-full" />
 )
 )}
 </div>
 <div className="min-w-0">
 <span className="text-xs font-bold text-foreground block truncate">
 {val.label}
 </span>
 {val.description && (
 <span className="text-[11px] text-muted-foreground block truncate">
 {val.description}
 </span>
 )}
 </div>
 </div>
 </div>

 {/* Preço do Adicional */}
 <div className="shrink-0 text-right">
 {val.priceModifierCents > 0 ? (
 <span className="text-xs font-bold text-foreground font-mono">
 +
 {(val.priceModifierCents / 100).toLocaleString("pt-BR", {
 style: "currency",
 currency: "BRL",
 })}
 </span>
 ) : (
 <span className="text-[11px] font-semibold text-muted-foreground">
 Incluso
 </span>
 )}
 </div>
 </button>
 );
 })}
 </div>
 </div>
 );
 })}
 </div>
 )}

 {/* Modalidades Reais de Envio e Localização do Estoque */}
 {isInternational ? (
 <div className="p-3.5 rounded-2xl border border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20 text-xs space-y-1">
 <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300">
 <Info className="size-4 shrink-0" />
 <span>Produto com Envio Internacional</span>
 </div>
 <p className="text-[11px] text-muted-foreground leading-relaxed">
 Item importado sujeito à fiscalização aduaneira e eventuais tributos federais e estaduais conforme legislação vigente.
 </p>
 </div>
 ) : storeLocation ? (
 <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-muted/40 text-xs font-semibold text-foreground">
 <MapPin className="size-4 text-primary shrink-0" />
 <span>Envio a partir de <strong>{storeLocation}</strong></span>
 </div>
 ) : null}

 {/* Simulação de Frete e Prazos Reais */}
 <Surface variant="default" padding="sm" className="space-y-4 rounded-2xl border border-border/40">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2 text-xs font-bold text-foreground">
 <Truck className="size-4 text-primary" />
 <span>Frete & Formas de Entrega</span>
 </div>
 {storeLocation && (
 <span className="text-[10px] text-muted-foreground font-mono">
 {storeLocation}
 </span>
 )}
 </div>

 <form onSubmit={handleCalculateShipping} className="flex gap-2">
 <Input
 placeholder="Digite seu CEP (Ex: 89801-000)"
 value={zipcode}
 onChange={(e) => setZipcode(e.target.value)}
 className="h-11 text-sm bg-muted/40 rounded-xl"
 />
 <Button
 type="submit"
 className="h-11 font-bold px-5 rounded-xl cursor-pointer shrink-0"
 disabled={loadingShipping}
 >
 {loadingShipping ? <Loader2 className="size-4 animate-spin" /> : "Calcular"}
 </Button>
 </form>

 {shippingRates !== null ? (
 shippingRates.length > 0 ? (
 <div className="space-y-2 pt-1">
 {shippingRates.map((rate, idx) => (
 <div
 key={rate.id || idx}
 className="flex justify-between items-center text-xs p-3 rounded-2xl border border-border/60 bg-muted/20"
 >
 <div>
 <p className="font-bold text-foreground">{rate.service_name || rate.name || rate.provider}</p>
 <p className="text-[10px] text-muted-foreground">
 {rate.provider ? `${rate.provider} • ` : ""}Prazo estimado: {rate.estimated_days} {rate.estimated_days === 1 ? "dia útil" : "dias úteis"}
 </p>
 </div>
 <span className="font-extrabold text-foreground">
 {rate.price_cents === 0 ? (
 <span className="text-emerald-600 dark:text-emerald-400 font-bold">Grátis</span>
 ) : (
 formatMoney(rate.price_cents)
 )}
 </span>
 </div>
 ))}
 </div>
 ) : (
 /* Estado Transparente: Sem Tabela de CEP Automatizada */
 <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/40 space-y-2.5 text-xs">
 <div className="flex items-start gap-2 text-foreground font-semibold">
 <Info className="size-4 text-primary shrink-0 mt-0.5" />
 <span>Frete sob Cotação Direta / A Combinar</span>
 </div>
 <p className="text-[11px] text-muted-foreground leading-relaxed">
 Esta loja não possui tabela automatizada para o CEP informado. Você pode combinar a entrega diretamente com o vendedor ou solicitar retirada no local.
 </p>
 {storePhone && (
 <Button
 asChild
 variant="outline"
 className="w-full h-10 sm:h-11 rounded-xl text-xs font-bold gap-2 cursor-pointer bg-background hover:bg-muted/50 border-border/80"
 >
 <a
 href={`https://wa.me/${storePhone.replace(/\D/g, "")}?text=${encodeURIComponent(
 `Olá! Gostaria de cotar o valor do frete para o produto "${product.title}" para o CEP ${zipcode}.`
 )}`}
 target="_blank"
 rel="noopener noreferrer"
 >
 <MessageCircle className="size-4 text-emerald-500" />
 <span>Solicitar Cotação no WhatsApp</span>
 </a>
 </Button>
 )}
 </div>
 )
 ) : (
 /* Política Real e Transparente da Loja */
 <div className="space-y-3 pt-1 text-xs">
 <div className="flex items-start gap-2.5">
 <Check className="size-4 text-primary shrink-0 mt-0.5" />
 <div>
 <p className="font-bold text-foreground">
 Entrega Direta & Retirada em Balcão
 </p>
 <p className="text-[10px] text-muted-foreground leading-normal">
 Métodos de entrega, taxas locais e opções de retirada calculados oficialmente no checkout ou combinados diretamente com o vendedor.
 </p>
 </div>
 </div>
 <div className="flex items-start gap-2.5 pt-1">
 <RotateCcw className="size-4 text-primary shrink-0 mt-0.5" />
 <p className="text-muted-foreground leading-normal text-[11px]">
 {isFoodOrPerishable
 ? "Garantia de preparo fresco e seguro. Entrega com controle térmico e higiene rigorosa para consumo imediato."
 : "Garantia de conformidade Waesy. Trocas ou devoluções em até 7 dias úteis após o recebimento conforme o CDC."}
 </p>
 </div>
 </div>
 )}

 {/* ── Loja Vendedora & Link Institucional Real ── */}
 <div className="p-4 rounded-2xl bg-card flex items-center justify-between gap-3 ">
 <div className="flex items-center gap-3 min-w-0">
 <div className="size-11 rounded-xl bg-muted overflow-hidden shrink-0 flex items-center justify-center">
 {(product as any).store?.logo_url ? (
 <img src={(product as any).store.logo_url} alt={(product as any).store.name} className="size-full object-cover" />
 ) : (
 <span className="font-black text-xs text-primary">{(product as any).store?.name?.slice(0, 2).toUpperCase() || "LJ"}</span>
 )}
 </div>
 <div className="min-w-0">
 <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono">Vendido e entregue por</p>
 <Link
 to="/perfil-da-loja"
 search={{ storeId: product.store_id || (product as any).store?.id }}
 className="text-sm font-bold text-foreground hover:text-primary transition-colors truncate block"
 >
 {(product as any).store?.name || "Loja Parceira Waesy"}
 </Link>
 {(product as any).store?.city && (
 <p className="text-[11px] text-muted-foreground truncate">
 {(product as any).store.city} - {(product as any).store.state || "SC"}
 </p>
 )}
 </div>
 </div>
 <Button asChild variant="outline" size="sm" className="rounded-xl text-xs font-bold shrink-0">
 <Link to="/perfil-da-loja" search={{ storeId: product.store_id || (product as any).store?.id }}>
 Ver Loja
 </Link>
 </Button>
 </div>

 {/* Selos de Confiança & Botão de Denúncia de Ofertas */}
 <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 pt-3 text-[10px] text-muted-foreground font-semibold">
 <div className="flex items-center gap-3">
 <span className="flex items-center gap-1.5">
 <ShieldCheck className="size-3.5 text-success fill-success/10" />
 Pagamento Seguro
 </span>
 <span className="flex items-center gap-1.5">
 <ShieldCheck className="size-3.5 text-success fill-success/10" />
 Proteção Waesy
 </span>
 </div>

 <button
 type="button"
 onClick={() => setIsReportModalOpen(true)}
 className="flex items-center gap-1 text-muted-foreground/80 hover:text-destructive transition-colors text-[10px] font-medium cursor-pointer"
 title="Reportar divergência de preços, frete indevido ou promoção não cumprida"
 >
 <ShieldAlert className="size-3 text-destructive" />
 <span>Reportar oferta</span>
 </button>
 </div>
 </Surface>

 {/* Modal de Auditoria e Denúncia Anti-Fraude */}
 <TagFraudDialog
 isOpen={isReportModalOpen}
 onClose={() => setIsReportModalOpen(false)}
 productId={product.id}
 storeId={product.storeId || "store-default"}
 productTitle={product.title}
 />

 {/* Add to cart / Encomendar */}
 <div className="space-y-3">
 {(() => {
 const isBackorder =
 selectedVariant &&
 selectedVariant.availableQty <= 0 &&
 selectedVariant.allowBackorder;
 const variantHardBlocked =
 selectedVariant &&
 selectedVariant.availableQty <= 0 &&
 !selectedVariant.allowBackorder;

 if ((allOutOfStock || variantHardBlocked) && !isBackorder) {
 return (
 <div className="space-y-2">
 <Button
 type="button"
 size="lg"
 className="w-full font-bold text-xs sm:text-sm uppercase rounded-xl h-13 bg-muted text-foreground border border-border/80 hover:bg-muted/80 gap-2 cursor-pointer shadow-xs"
 onClick={() => setIsWaitlistOpen(true)}
 >
 <BellRing className="size-4 text-primary" />
 <span>Avise-me quando chegar (Lista de Espera)</span>
 </Button>
 <p className="text-[11px] text-muted-foreground text-center">
 Este item está esgotado. Deixe seu contato para ser avisado primeiro assim que reposto.
 </p>
 </div>
 );
 }

 return (
 <>
 <Button
 size="lg"
 className={`w-full font-bold text-base uppercase rounded-xl h-13 transition-all duration-200 border border-transparent ${isBackorder ? "bg-foreground text-background" : "bg-primary text-primary-foreground"}`}
 onClick={handleAddToCart}
 disabled={Boolean(isAdding)}
 >
 <ShoppingBag className="size-5 mr-2" aria-hidden />
 {isAdding
 ? "Adicionando..."
 : isBackorder
 ? "Encomendar"
 : "Adicionar ao carrinho"}
 </Button>

 {isBackorder &&
 selectedVariant.backorderLeadTimeDays != null &&
 selectedVariant.backorderLeadTimeDays > 0 && (
 <p className="text-[11px] text-muted-foreground bg-muted/40 p-2.5 rounded border border-dashed text-center">
 🚚 Produto sob encomenda. Prazo adicional estimado:{""}
 <strong>{selectedVariant.backorderLeadTimeDays} dias úteis</strong> além do
 frete normal.
 </p>
 )}

 {isBackorder && !selectedVariant?.backorderLeadTimeDays && (
 <p className="text-[11px] text-muted-foreground bg-muted/40 p-2.5 rounded border border-dashed text-center">
 🚚 Produto sob encomenda. Consulte-nos para confirmar o prazo.
 </p>
 )}
 </>
 );
 })()}
 </div>

 {/* Card"Sobre a Loja" */}
 <Surface variant="default" padding="sm" className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <div className="size-11 rounded bg-primary/10 flex items-center justify-center font-bold text-primary text-lg overflow-hidden border border-primary/20">
 {product.brand ? product.brand.substring(0, 2).toUpperCase() : "J"}
 </div>
 <div>
 <div className="flex items-center gap-1.5">
 <h3 className="font-bold text-sm text-foreground">{product.brand || "Waesy"}</h3>
 <Badge className="bg-primary/15 text-primary hover:bg-primary/20 text-[9px] px-1.5 py-0">
 Marca Oficial
 </Badge>
 </div>
 <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium mt-1">
 {reviewStats.total_reviews > 0 ? (
 <span>
 ★ {reviewStats.average_rating.toFixed(1)} ({reviewStats.total_reviews}
 {""}
 avaliações)
 </span>
 ) : (
 <span>Sem avaliações ainda</span>
 )}
 </div>
 </div>
 </div>

 <Button
 size="sm"
 variant={isFollowingStore ? "secondary" : "outline"}
 className="text-xs font-bold cursor-pointer"
 onClick={handleToggleFollow}
 >
 {isFollowingStore ? "Seguindo" : "+ Seguir"}
 </Button>
 </Surface>

 {/* Ficha Técnica Dinâmica (Product Type Attributes) */}
 {product.attributes && Object.keys(product.attributes).length > 0 && (
 <div className=" pt-5 space-y-3">
 <h2 className="text-sm font-bold text-muted-foreground">Ficha Técnica</h2>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
 {Object.entries(product.attributes).map(([key, value]) => {
 // Ignora campos vazios ou booleanos falsos da renderização visual
 if (value === null || value === "" || value === false) return null;
 return (
 <div
 key={key}
 className="flex flex-col text-sm pb-1.5"
 >
 <span className="text-muted-foreground capitalize text-[11px] font-bold tracking-wide">
 {key}
 </span>
 <span className="font-medium text-foreground text-sm">
 {value === true ? "Sim" : String(value)}
 </span>
 </div>
 );
 })}
 </div>
 </div>
 )}
 </div>
 </div>

 {/* Seção de Comentários e Avaliações Reais dos Clientes */}
 <div className=" bg-secondary py-16 text-foreground">
 <div className="mx-auto max-w-screen-xl px-4 md:px-6">
 <div className="grid gap-10 md:grid-cols-12">
 {/* Esquerda: Média Geral das Notas & Selo de Integridade */}
 <div className="md:col-span-4 space-y-6 text-left">
 <h2 className="text-3xl sm:text-4xl font-zine font-bold uppercase tracking-tight flex items-center gap-2.5 text-foreground">
 <MessageCircle className="size-7 sm:size-8 text-primary" strokeWidth={2.5} />
 Avaliações
 </h2>

 <div className="flex items-baseline gap-2 bg-card rounded-2xl p-4 ">
 <span className="text-5xl font-zine font-bold text-foreground">
 {reviewStats.average_rating > 0 ? reviewStats.average_rating.toFixed(1) : "5.0"}
 </span>
 <span className="text-lg font-bold text-muted-foreground">/ 5.0</span>
 </div>

 <div className="flex items-center gap-1">
 {[1, 2, 3, 4, 5].map((star) => (
 <Star
 key={star}
 strokeWidth={star <= Math.round(reviewStats.average_rating || 5) ? 2 : 1.5}
 className={`size-5 ${
 star <= Math.round(reviewStats.average_rating || 5)
 ? "fill-amber-400 text-amber-500"
 : "text-border"
 }`}
 />
 ))}
 </div>

 <p className="text-xs text-muted-foreground font-medium max-w-xs leading-relaxed">
 Baseado em <strong className="text-foreground font-bold">{reviewStats.total_reviews}</strong>{" "}
 {reviewStats.total_reviews === 1 ? "avaliação" : "avaliações"} de compradores reais.
 </p>

 {/* Selo de Confiabilidade & Informação de Compra Verificada */}
 <div className=" p-4.5 rounded-2xl bg-card space-y-3 ">
 <div className="flex items-center gap-2 text-foreground">
 <ShieldCheck className="size-5 text-success shrink-0" />
 <h3 className="font-bold text-xs">
 Avaliações 100% Verificadas
 </h3>
 </div>
 <p className="text-[11px] text-muted-foreground leading-relaxed">
 Para garantir total integridade e evitar avaliações fraudulentas, somente clientes com compra entregue podem avaliar este produto diretamente pelo histórico de pedidos.
 </p>
 <div className="pt-2 ">
 <Button
 asChild
 variant="outline"
 size="sm"
 className="w-full text-xs font-bold rounded-xl h-8.5 border-border hover:bg-muted"
 >
 <Link to="/conta/pedidos">
 Ver Meus Pedidos
 </Link>
 </Button>
 </div>
 </div>
 </div>

 {/* Direita: Lista de Comentários */}
 <div className="md:col-span-8 flex flex-col gap-6 mt-8 md:mt-0">
 {reviewsList.length === 0 ? (
 <div className="p-10 border-0 bg-background flex flex-col items-center justify-center text-center gap-4">
 <MessageCircle className="size-12 text-foreground/40" />
 <div>
 <h4 className="font-semibold text-2xl font-black">Nenhuma avaliação ainda</h4>
 <p className="text-sm text-foreground/70 max-w-sm mt-2 font-medium">
 Seja o primeiro a compartilhar o que você achou deste produto.
 </p>
 </div>
 </div>
 ) : (
 reviewsList.map((review: any) => (
 <div key={review.id} className=" bg-background p-5 space-y-3">
 <div className="flex items-center justify-between pb-3 mb-2">
 <div className="flex items-center gap-3">
 <div className="size-10 rounded-xl bg-secondary flex items-center justify-center text-foreground font-black text-sm uppercase">
 {review.userName.substring(0, 2)}
 </div>
 <div>
 <p className="text-base font-bold text-foreground flex items-center gap-2">
 {review.userName}
 <span className="bg-success text-white text-[10px] uppercase font-black tracking-wider px-2 py-0.5 ">
 Verificado
 </span>
 </p>
 <p className="text-xs text-foreground/60 font-mono mt-0.5 font-bold">
 {formatDate(review.createdAt)}
 </p>
 </div>
 </div>
 <div className="flex items-center gap-1">
 {[1, 2, 3, 4, 5].map((star) => (
 <Star
 key={star}
 strokeWidth={star <= review.rating ? 2 : 1.5}
 className={`size-5 ${star <= review.rating ? "fill-poster-red text-primary" : "text-foreground/20"}`}
 />
 ))}
 </div>
 </div>
 {review.comment && (
 <p className="text-base font-medium text-foreground leading-relaxed">
 "{review.comment}"
 </p>
 )}
 </div>
 ))
 )}
 </div>
 </div>
 </div>
 </div>

 <SizeGuideSheet open={sizeGuideOpen} onOpenChange={setSizeGuideOpen} />

 {/* ZONA DO BUILDER: Seções Complementares (Sem duplicação de título/descrição já renderizados) */}
 {(() => {
 const filteredNodes = (templateTree || []).filter((n: any) => {
 const type = (n?.type || n?.component || n?.name || "").toLowerCase();
 return !type.includes("description") && !type.includes("descrição") && !type.includes("product-info") && !type.includes("header");
 });
 if (!filteredNodes.length) return null;
 return (
 <div className="w-full bg-card rounded-2xl overflow-hidden mt-8">
 <ExperienceRenderer nodes={filteredNodes} transientData={{ product }} />
 </div>
 );
 })()}

 {/* ── Mobile Sticky Buy Bar (Padrão iFood / E-commerce Fluido) ── */}
 <div className="md:hidden fixed bottom-16 left-0 right-0 z-30 bg-card/95 backdrop-blur-md border-t border-border/60 shadow-lg px-3 py-2.5 flex items-center justify-between gap-3 select-none">
 {/* Contador de Quantidade [- 1 +] */}
 <div className="flex items-center rounded-xl bg-secondary h-11 px-1 shrink-0">
 <button
 type="button"
 onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
 className="size-8 flex items-center justify-center font-black text-sm text-foreground hover:bg-muted rounded-lg active:scale-90 transition-all cursor-pointer"
 aria-label="Diminuir quantidade"
 >
 -
 </button>
 <span className="w-7 text-center font-bold text-xs text-foreground font-mono">
 {quantity}
 </span>
 <button
 type="button"
 onClick={() => setQuantity((prev) => prev + 1)}
 className="size-8 flex items-center justify-center font-black text-sm text-foreground hover:bg-muted rounded-lg active:scale-90 transition-all cursor-pointer"
 aria-label="Aumentar quantidade"
 >
 +
 </button>
 </div>

 {/* Botão de Ação com Preço Total Multiplicado */}
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
 className="flex-1 rounded-xl font-bold text-xs h-11 px-4 bg-primary text-primary-foreground flex items-center justify-between cursor-pointer active:scale-98 transition-all"
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
 {formatMoney(currentPriceCents * (quantity || 1))}
 </span>
 </Button>
 )}
 </div>

 {/* Sheet de Entrada na Lista de Espera */}
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
