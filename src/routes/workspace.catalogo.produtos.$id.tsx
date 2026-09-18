import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState, useMemo, useEffect, Fragment } from "react";
import { useForm, Controller } from "react-hook-form";
import { toast } from "sonner";
import {
 ArrowLeft,
 ArrowRight,
 Plus,
 ImagePlus,
 X,
 Loader2,
 Trash2,
 Eye,
 ShoppingBag,
 CreditCard,
 Utensils,
 Percent,
 TrendingUp,
 Package,
 CheckCircle2,
 Settings,
 LayoutList,
 Box,
 ChevronDown,
 ChevronUp,
 SlidersHorizontal,
 Truck,
 ShieldCheck,
 Globe,
 Tag,
 DollarSign,
 Boxes,
 Plane,
 Layers,
 Sparkles,
} from "lucide-react";

import { MasterCatalogSearchDialog } from "@/components/admin/catalog/master-catalog-search-dialog";
import type { MasterProductRecord } from "@/lib/data/master-products-catalog";

import { TravelPackageForm } from "@/components/commerce/travel/travel-package-form";
import { TravelPackageDetailView } from "@/components/commerce/travel/travel-package-detail-view";
import type { TravelPackageData } from "@/types/travel-package";

import { ProductEditorLayout } from "@/components/admin/product-editor/product-editor-layout";
import { VariantOptionsBuilder } from "@/components/admin/product-editor/variant-options-builder";
import { VariantMatrixGrid, type RawVariant } from "@/components/admin/catalog/variant-matrix-grid";
import { ProductModifiersCard } from "@/components/admin/catalog/product-modifiers-card";
import { ProductBomCard, type BomItem } from "@/components/admin/catalog/product-bom-card";
import {
 ProductFoodSpecsCard,
 type FoodSpecsData,
} from "@/components/admin/catalog/product-food-specs-card";
import { PageHeader } from "@/components/commerce/page-header";
import { PriceDisplay } from "@/components/commerce/price-display";
import {
 Accordion,
 AccordionContent,
 AccordionItem,
 AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyField } from "@/components/ui/currency-field";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "@/components/ui/image-upload";
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
 Sheet,
 SheetContent,
 SheetDescription,
 SheetFooter,
 SheetHeader,
 SheetTitle,
 SheetTrigger,
} from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";

import {
 getProductById,
 updateProduct,
 upsertProductVariant,
 batchUpsertVariantMatrix,
 deleteProductMedia,
 addProductMediaLink,
 updateProductMediaMetadata,
 reorderProductMedia,
 listCategories,
 createCategory,
 listProductTypes,
 listOptionGroups,
} from "@/services/admin-catalog.functions";
import { getStoreSettings } from "@/services/store.functions";
import { getNicheCatalogContext } from "@/lib/catalog-niche-context";
import { getNicheSemantics } from "@/lib/niche-semantics";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/workspace/catalogo/produtos/$id")({
 head: () => ({ meta: [{ title: "Editor Avançado de Produto | Workspace Waesy" }] }),
 loader: async ({ params }) => {
 try {
 const [product, catsRes, typesRes, groupsRes, storeRes] = await Promise.all([
 getProductById({ data: { id: params.id } }).catch(() => null),
 listCategories().catch(() => []),
 listProductTypes().catch(() => []),
 listOptionGroups().catch(() => []),
 getStoreSettings().catch(() => null),
 ]);
 return {
 product: product || null,
 categories: catsRes || [],
 productTypes: typesRes || [],
 optionGroupsList: groupsRes || [],
 store: storeRes,
 };
 } catch {
 return {
 product: null,
 categories: [],
 productTypes: [],
 optionGroupsList: [],
 store: null,
 };
 }
 },
 component: EditProductPage,
});

function EditProductPage() {
 const { product, categories, productTypes, optionGroupsList, store } = ((Route.useLoaderData?.() as any) || {});
 const router = useRouter();

 const semantics = getNicheSemantics(store);
 const nicheCtx = getNicheCatalogContext(store);

 // Estado para Live Preview na barra lateral
 const [liveTitle, setLiveTitle] = useState(product?.title || "");
 const [liveDescription, setLiveDescription] = useState(product?.description || "");
 const [liveBrand, setLiveBrand] = useState(product?.brand || "");
 const [livePriceCents, setLivePriceCents] = useState(product?.price_cents || 0);
 const [liveCompareCents, setLiveCompareCents] = useState(product?.compare_at_cents || null);
 const [liveCostCents, setLiveCostCents] = useState(product?.cost_cents || null);
 const [liveStatus, setLiveStatus] = useState(product?.status || "draft");

 // Grupos de Opções / Adicionais selecionados
 const [optionGroups, setOptionGroups] = useState<any[]>(optionGroupsList || []);
 const initialSelectedGroups = useMemo(() => {
 return (product?.product_option_groups || []).map((g: any) => g.option_group_id || g.option_groups?.id).filter(Boolean);
 }, [product?.product_option_groups]);
 const [selectedOptionGroupIds, setSelectedOptionGroupIds] = useState<string[]>(initialSelectedGroups);

 // Foto de capa principal
 const coverImage = product?.product_media?.[0]?.url;

 // Cálculo da Margem de Lucro e Lucro Bruto
 const profitMarginPercent = useMemo(() => {
 if (!livePriceCents || !liveCostCents || livePriceCents <= 0) return null;
 const profit = livePriceCents - liveCostCents;
 return Math.round((profit / livePriceCents) * 100);
 }, [livePriceCents, liveCostCents]);

 const grossProfitCents = useMemo(() => {
 if (!livePriceCents || !liveCostCents) return 0;
 return Math.max(0, livePriceCents - liveCostCents);
 }, [livePriceCents, liveCostCents]);

 // Ficha Técnica & Insumos Composição
 const initialBom = useMemo(() => ((product?.attributes as any)?.bill_of_materials as BomItem[]) || [], [product]);
 const [bomItems, setBomItems] = useState<BomItem[]>(initialBom);

 const handleBomItemsChange = async (newItems: BomItem[]) => {
 setBomItems(newItems);
 if (!product) return;
 try {
 await updateProduct({
 data: {
 id: product.id,
 attributes: {
 ...(product.attributes || {}),
 bill_of_materials: newItems,
 },
 },
 });
 toast.success("Ficha técnica salva com sucesso!");
 } catch {
 toast.error("Erro ao salvar composição de insumos.");
 }
 };

 const initialFoodSpecs: FoodSpecsData = useMemo(() => {
 const attrs = (product?.attributes as any) || {};
 const specs = attrs.food_specs || attrs;
 return {
 dietaryRestrictions: specs.dietary_restrictions || specs.dietaryRestrictions || [],
 beverageTags: specs.beverage_tags || specs.beverageTags || [],
 servesCount: specs.serves_count || specs.servesCount || "1 pessoa",
 portionWeight: specs.portion_weight || specs.portionWeight || "",
 portionUnit: specs.portion_unit || specs.portionUnit || "g",
 preparationTimeMinutes: product?.preparation_time_days || specs.preparation_time_minutes || specs.preparationTimeMinutes || 15,
 posCode: specs.pos_code || specs.posCode || product?.sku || "",
 };
 }, [product]);

 const [foodSpecs, setFoodSpecs] = useState<FoodSpecsData>(initialFoodSpecs);

 // ── Catálogo Mestre Central & Inteligência Fiscal (Reforma Tributária 2026) ──
 const [isMasterCatalogOpen, setIsMasterCatalogOpen] = useState(false);

 const handleSelectMasterProduct = async (p: MasterProductRecord) => {
 if (!product) return;
 setLiveTitle(p.name);
 setLiveDescription(p.description);
 setLiveBrand(p.brand_name);
 setLivePriceCents(p.suggested_price_cents);
 try {
 await updateProduct({
 data: {
 id: product.id,
 title: p.name,
 description: p.description,
 brand: p.brand_name,
 price_cents: p.suggested_price_cents,
 ean: p.barcode_ean || product.ean,
 attributes: {
 ...(product.attributes || {}),
 ncm_code: p.ncm_code,
 cest_code: p.cest_code,
 ibs_rate: p.ibs_rate,
 cbs_rate: p.cbs_rate,
 cfop_default: p.cfop_default,
 tax_regime: p.tax_regime,
 master_catalog_id: p.id,
 },
 },
 });
 toast.success(`"${p.name}" sincronizado com sucesso do Catálogo Central (NCM ${p.ncm_code})!`);
 router.invalidate();
 } catch (err: any) {
 toast.error("Erro ao sincronizar com catálogo central: " + (err?.message || "Tente novamente."));
 }
 };

 const handleFoodSpecsChange = async (newSpecs: FoodSpecsData) => {
 setFoodSpecs(newSpecs);
 try {
 await updateProduct({
 data: {
 id: product.id,
 preparation_time_days: newSpecs.preparationTimeMinutes,
 attributes: {
 ...(product.attributes || {}),
 dietary_restrictions: newSpecs.dietaryRestrictions,
 beverage_tags: newSpecs.beverageTags,
 serves_count: newSpecs.servesCount,
 portion_weight: newSpecs.portionWeight,
 portion_unit: newSpecs.portionUnit,
 preparation_time_minutes: newSpecs.preparationTimeMinutes,
 pos_code: newSpecs.posCode,
 },
 },
 });
 toast.success("Especificações atualizadas com sucesso!");
 } catch {
 toast.error("Erro ao salvar especificações.");
 }
 };

 const isTourismStore =
 semantics.nicheId === "tourism" ||
 Boolean(nicheCtx.isTourismBusiness) ||
 store?.segment === "tourism_agency" ||
 store?.type === "tourism_agency" ||
 store?.settings?.segment === "tourism_agency" ||
 Boolean((product?.attributes as any)?.travel);

 const [isTravelPackageMode, setIsTravelPackageMode] = useState<boolean>(
 Boolean((product?.attributes as any)?.travel) || isTourismStore
 );

 const initialTravelData: Partial<TravelPackageData> = useMemo(() => {
 const saved = (product?.attributes as any)?.travel;
 if (saved) return saved;
 return {
 destination: {
 name: "",
 region: "",
 country: "Brasil",
 flight_summary: "",
 },
 resort: {
 name: "",
 meal_plan: "Café da Manhã",
 duration_text: "",
 guests_text: "",
 badges: [],
 bio_bullets: [],
 },
 inclusions: [],
 itinerary_days: [],
 };
 }, [product]);

 const [travelData, setTravelData] = useState<Partial<TravelPackageData>>(initialTravelData);

 const handleTravelDataChange = async (newTravel: Partial<TravelPackageData>) => {
 setTravelData(newTravel);
 try {
 await updateProduct({
 data: {
 id: product.id,
 is_physical: isTravelPackageMode ? false : undefined,
 attributes: {
 ...(product.attributes || {}),
 travel: newTravel,
 },
 },
 });
 } catch (e) {
 console.warn("[EditProductPage] Falha ao atualizar dados de viagem:", e);
 }
 };

 const handleApplyCostToProduct = async (calculatedCostCents: number) => {
 setLiveCostCents(calculatedCostCents);
 try {
 await updateProduct({
 data: {
 id: product.id,
 cost_cents: calculatedCostCents,
 },
 });
 router.invalidate();
 } catch {
 toast.error("Erro ao aplicar custo da ficha técnica ao produto.");
 }
 };

 // Atualiza a sincronização de grupos de opções no produto
 const handleSelectedGroupsChange = async (newSelectedIds: string[]) => {
 setSelectedOptionGroupIds(newSelectedIds);
 try {
 await updateProduct({
 data: {
 id: product.id,
 option_group_ids: newSelectedIds,
 },
 });
 router.invalidate();
 toast.success("Vínculo de adicionais atualizado no produto!");
 } catch {
 toast.error("Erro ao salvar adicionais vinculados.");
 }
 };

 if (!product) {
 return (
 <div className="w-full max-w-7xl mx-auto px-0 sm:px-0 space-y-6 pb-20 animate-in fade-in duration-200">
 <div className="flex items-center gap-3">
 <Button asChild variant="outline" size="sm" className="rounded-xl text-xs font-bold">
 <Link to="/workspace/catalogo/produtos">
 <ArrowLeft className="mr-2 size-3.5" />
 Voltar ao Catálogo
 </Link>
 </Button>
 </div>
 <div className="p-12 text-center border-0 rounded-2xl bg-card">
 <h2 className="text-base font-bold text-foreground">{nicheCtx.entityName} não encontrado</h2>
 <p className="text-xs text-muted-foreground mt-1">
 O {nicheCtx.entityName.toLowerCase()} solicitado não existe ou foi removido do catálogo.
 </p>
 <Button asChild className="mt-4 rounded-xl text-xs font-bold bg-primary text-primary-foreground w-full" size="sm">
 <Link to="/workspace/catalogo/produtos">Ir para Lista de {nicheCtx.entityNamePlural}</Link>
 </Button>
 </div>
 </div>
 );
 }

 return (
 <div className="space-y-0 sm:space-y-6">
 <div className="px-3 sm:px-0 pt-4 sm:pt-0">
 <PageHeader
 eyebrow={`Catálogo / ${nicheCtx.entityName}`}
 title={liveTitle || `Editar ${nicheCtx.entityName}`}
 actions={
 <div className="flex items-center gap-2">
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={() => setIsMasterCatalogOpen(true)}
 className="rounded-xl text-xs font-bold gap-1.5 border-primary/30 text-primary hover:bg-primary/5 cursor-pointer"
 >
 <Sparkles className="size-3.5" />
 <span>Sincronizar Catálogo Central</span>
 </Button>
 <Button variant="outline" asChild size="sm">
 <Link to="/workspace/catalogo/produtos">
 <ArrowLeft className="mr-1.5 size-4" />
 Voltar ao Catálogo
 </Link>
 </Button>
 <Button variant="outline" asChild size="sm">
 <Link to={`/produto/${product.slug}` as never} target="_blank">
 <Eye className="mr-1.5 size-4" />
 Ver na Vitrine
 </Link>
 </Button>
 </div>
 }
 />

 <ProductEditorLayout
 preview={
 isTravelPackageMode ? (
 <div className="w-full max-w-[380px] rounded-2xl border border-border/80 bg-background overflow-hidden shadow-md max-h-[750px] overflow-y-auto no-scrollbar">
 <TravelPackageDetailView
 packageData={travelData}
 productTitle={liveTitle || travelData.destination?.name || "Pacote de Viagem"}
 priceCents={livePriceCents}
 compareAtCents={liveCompareCents}
 coverImageUrl={coverImage}
 mediaUrls={(product.product_media || []).map((m: any) => m.url)}
 storeName={store?.name}
 storePhone={store?.phone || store?.settings?.whatsapp}
 isInteractivePreview={true}
 />
 </div>
 ) : (
 <div className="space-y-4">
 {/* Mockup Fiel de Celular (The Truthful Preview) */}
 <div className="w-full max-w-[340px] rounded-[2.5rem] border-[4px] border-border bg-background overflow-hidden relative h-[680px] flex flex-col">
 {/* Notch */}
 <div className="absolute top-0 inset-x-0 h-5 bg-border rounded-b-xl w-32 z-10 mx-auto" />

 <div className="flex-1 overflow-y-auto no-scrollbar pt-8 pb-12 flex flex-col">
 <div className="relative aspect-[4/5] bg-muted/30 overflow-hidden w-full flex items-center justify-center">
 {coverImage ? (
 <img src={coverImage} alt={liveTitle} className="w-full h-full object-cover" />
 ) : (
 <div className="flex flex-col items-center gap-2 text-muted-foreground">
 <Package className="size-10 stroke-1" />
 <span className="text-xs">Sem foto de capa</span>
 </div>
 )}
 {/* Floating Status Badge */}
 <div className="absolute top-4 left-4 z-10">
 <Badge
 variant={liveStatus === "published" ? "default" : "secondary"}
 className="bg-background text-foreground text-[10px]"
 >
 {liveStatus === "published"
 ? "Publicado"
 : liveStatus === "archived"
 ? "Arquivado"
 : "Rascunho"}
 </Badge>
 </div>
 </div>

 <div className="p-4 space-y-4 flex-1">
 <div>
 {liveBrand && (
 <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block mb-1">
 {liveBrand}
 </span>
 )}
 <h3 className="font-bold text-base leading-tight">{liveTitle || `Nome do ${nicheCtx.entityName}`}</h3>
 </div>

 {/* Preço Principal */}
 <div className="flex items-baseline gap-2">
 <span className="text-xl font-bold text-primary font-mono">
 {formatMoney(livePriceCents)}
 </span>
 {liveCompareCents && liveCompareCents > livePriceCents && (
 <span className="text-xs text-muted-foreground line-through font-mono">
 {formatMoney(liveCompareCents)}
 </span>
 )}
 </div>

 {/* Descrição Curta */}
 {liveDescription && (
 <div className="pt-2 border-t">
 <h4 className="text-[11px] font-bold text-muted-foreground uppercase mb-1">
 Sobre o {nicheCtx.entityName}
 </h4>
 <p className="text-xs text-muted-foreground line-clamp-4 leading-relaxed whitespace-pre-wrap">
 {liveDescription}
 </p>
 </div>
 )}
 </div>
 </div>
 </div>

 {profitMarginPercent !== null && (
 <div className="text-center">
 <Badge
 variant="outline"
 className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 px-3 py-1 text-xs gap-1.5 font-mono"
 >
 <TrendingUp className="size-3.5" /> Margem Estimada: {profitMarginPercent}%
 </Badge>
 </div>
 )}
 </div>
 )
 }
 sections={[
 ...(isTravelPackageMode
 ? [{ id: "turismo", label: "Pacote de Viagem & Roteiro", icon: <Plane className="size-4" /> }]
 : []),
 { id: "geral", label: "Informações Básicas", icon: <Box className="size-4" /> },
 ...(nicheCtx.isFoodBusiness
 ? [{ id: "especificacoes", label: "Cardápio & Restrições", icon: <Utensils className="size-4" /> }]
 : []),
 { id: "midias", label: "Galeria de Fotos", icon: <ImagePlus className="size-4" /> },
 { id: "variantes", label: nicheCtx.variationsSectionTitle, icon: <LayoutList className="size-4" /> },
 { id: "opcoes", label: "Adicionais & Opções", icon: <SlidersHorizontal className="size-4" /> },
 ...(nicheCtx.isFoodBusiness
 ? [{ id: "ficha-tecnica", label: "Ficha Técnica & Insumos", icon: <Boxes className="size-4" /> }]
 : []),
 ]}
 >
 {/* ── SELETOR DE MODO PARA AGÊNCIAS DE TURISMO ── */}
 {isTourismStore && (
 <div className="p-3.5 rounded-2xl bg-card border border-border/70 flex items-center justify-between gap-3 shadow-2xs mb-6">
 <div className="flex items-center gap-2.5">
 <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
 <Plane className="size-4" />
 </div>
 <div>
 <span className="text-xs font-bold text-foreground">Modo de Publicação</span>
 <p className="text-[10px] text-muted-foreground">
 {isTravelPackageMode
 ? "Pacote Turístico / Roteiro Completo (sem frete físico, com itinerário e inclusões)"
 : "Produto Físico / Souvenir / Mala (com frete e logística tradicional)"}
 </p>
 </div>
 </div>

 <div className="flex items-center gap-1.5 shrink-0">
 <Button
 type="button"
 size="sm"
 variant={isTravelPackageMode ? "default" : "outline"}
 onClick={() => setIsTravelPackageMode(true)}
 className="rounded-xl text-xs font-semibold h-8 cursor-pointer"
 >
 Pacote Turístico
 </Button>
 <Button
 type="button"
 size="sm"
 variant={!isTravelPackageMode ? "default" : "outline"}
 onClick={() => setIsTravelPackageMode(false)}
 className="rounded-xl text-xs font-semibold h-8 cursor-pointer"
 >
 Produto Físico
 </Button>
 </div>
 </div>
 )}

 {/* ── SEÇÃO: PACOTE DE VIAGEM & ROTEIRO ── */}
 {isTravelPackageMode && (
 <div id="turismo" className="scroll-mt-32 mb-8">
 <TravelPackageForm
 value={travelData}
 onChange={handleTravelDataChange}
 priceCents={livePriceCents}
 />
 </div>
 )}

 {/* ── SEÇÃO 1: INFORMAÇÕES BÁSICAS & COMERCIAIS ── */}
 <div id="geral" className="scroll-mt-32">
 <GeneralForm
 product={product}
 categories={categories}
 productTypes={productTypes}
 nicheCtx={nicheCtx}
 onTitleChange={setLiveTitle}
 onDescriptionChange={setLiveDescription}
 onBrandChange={setLiveBrand}
 onPriceChange={setLivePriceCents}
 onCompareChange={setLiveCompareCents}
 onCostChange={setLiveCostCents}
 onStatusChange={setLiveStatus}
 />
 </div>

 {/* ── SEÇÃO: ESPECIFICAÇÕES DO CARDÁPIO & RESTRIÇÕES (EXCLUSIVO GASTRONOMIA) ── */}
 {nicheCtx.isFoodBusiness && (
 <div id="especificacoes" className="scroll-mt-32 pt-12 border-t">
 <ProductFoodSpecsCard
 value={foodSpecs}
 onChange={handleFoodSpecsChange}
 />
 </div>
 )}

 {/* ── SEÇÃO 2: GALERIA DE MÍDIAS & FOTOS ── */}
 <div id="midias" className="scroll-mt-32 pt-12 border-t">
 <div className="mb-6">
 <h2 className="text-xl font-bold flex items-center gap-2">
 <ImagePlus className="size-5 text-primary" /> Galeria de Fotos
 </h2>
 <p className="text-sm text-muted-foreground">
 Arraste para reordenar, gerencie fotos e vídeos e vincule imagens a variações específicas.
 </p>
 </div>
 <MediaManager product={product} />
 </div>

 {/* ── SEÇÃO 3: ESTOQUE & MATRIZ DE VARIAÇÕES 2D ── */}
 <div id="variantes" className="scroll-mt-32 pt-12 border-t">
 <div className="mb-6">
 <h2 className="text-xl font-bold flex items-center gap-2">
 <LayoutList className="size-5 text-primary" /> {nicheCtx.variationsSectionTitle}
 </h2>
 <p className="text-sm text-muted-foreground">
 Gerencie o saldo em estoque granular, variações de tamanho, porção, códigos, preços sobrepostos e fotos específicas.
 </p>
 </div>
 <VariantsManager product={product} />
 </div>

 {/* ── SEÇÃO 4: ADICIONAIS & MODIFICADORES ── */}
 <div id="opcoes" className="scroll-mt-32 pt-12 border-t">
 <div className="mb-6">
 <h2 className="text-xl font-bold flex items-center gap-2">
 <SlidersHorizontal className="size-5 text-primary" /> Adicionais & Modificadores
 </h2>
 <p className="text-sm text-muted-foreground">
 Grupos de complementos que o cliente escolhe ao adicionar ao carrinho (ex: ponto da carne, extras, passeios opcionais).
 </p>
 </div>
 <ProductModifiersCard
 groups={optionGroups}
 selectedGroupIds={selectedOptionGroupIds}
 onSelectedGroupsChange={handleSelectedGroupsChange}
 onGroupsListChange={setOptionGroups}
 />
 </div>

 {/* ── SEÇÃO 5: FICHA TÉCNICA & ESTOQUE COMPOSTO (EXCLUSIVO GASTRONOMIA) ── */}
 {(nicheCtx.isFoodBusiness || bomItems.length > 0) && (
 <div id="ficha-tecnica" className="scroll-mt-32 pt-12 border-t">
 <ProductBomCard
 initialItems={bomItems}
 productPriceCents={livePriceCents}
 onApplyCostToProduct={handleApplyCostToProduct}
 onItemsChange={handleBomItemsChange}
 />
 </div>
 )}
        </ProductEditorLayout>

        <MasterCatalogSearchDialog
          open={isMasterCatalogOpen}
          onOpenChange={setIsMasterCatalogOpen}
          onSelectProduct={handleSelectMasterProduct}
        />
      </div>
 </div>
 );
}

function GeneralForm({
 product,
 categories,
 productTypes,
 nicheCtx,
 onTitleChange,
 onDescriptionChange,
 onBrandChange,
 onPriceChange,
 onCompareChange,
 onCostChange,
 onStatusChange,
}: {
 product: any;
 categories: any[];
 productTypes: any[];
 nicheCtx: any;
 onTitleChange: (v: string) => void;
 onDescriptionChange: (v: string) => void;
 onBrandChange: (v: string) => void;
 onPriceChange: (v: number) => void;
 onCompareChange: (v: number | null) => void;
 onCostChange: (v: number | null) => void;
 onStatusChange: (v: string) => void;
}) {
 const router = useRouter();
 const [isSubmitting, setIsSubmitting] = useState(false);
 const initialCategoryId = product.product_categories?.[0]?.category_id || "";
 const [selectedCategory, setSelectedCategory] = useState<string>(initialCategoryId);

 // Category Modal State
 const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
 const [newCategoryName, setNewCategoryName] = useState("");
 const [isCreatingCategory, setIsCreatingCategory] = useState(false);

 const {
 register,
 handleSubmit,
 setValue,
 watch,
 control,
 formState: { errors },
 } = useForm({
 defaultValues: {
 title: product.title,
 description: product.description || "",
 brand: product.brand || "",
 price_cents: product.price_cents || 0,
 compare_at_cents: product.compare_at_cents || undefined,
 cost_cents: product.cost_cents || undefined,
 status: product.status,
 short_description: product.short_description || "",
 manufacturer: product.manufacturer || "",
 ean: product.ean || "",
 meta_title: product.meta_title || "",
 meta_description: product.meta_description || "",
 is_physical: product.is_physical !== false,
 weight_kg: product.weight_kg || "",
 width_cm: product.width_cm || "",
 height_cm: product.height_cm || "",
 length_cm: product.length_cm || "",
 preparation_time_days: product.preparation_time_days || 0,
 preparation_time_minutes: (product as any).preparation_time_minutes || "",
 type_id: product.type_id || "none",
 show_stock_publicly: product.show_stock_publicly ?? false,
 attributes: product.attributes || {},
 },
 });

 const watchTitle = watch("title");
 const watchDescription = watch("description");
 const watchBrand = watch("brand");
 const watchPrice = watch("price_cents");
 const watchCompare = watch("compare_at_cents");
 const watchCost = watch("cost_cents");
 const watchStatus = watch("status");
 const watchTypeId = watch("type_id");
 const selectedProductType = useMemo(() => {
 return productTypes.find((t) => t.id === watchTypeId);
 }, [watchTypeId, productTypes]);

 // Re-emite atualizações para a prévia lateral
 useEffect(() => {
 onTitleChange(watchTitle);
 }, [watchTitle, onTitleChange]);

 useEffect(() => {
 onDescriptionChange(watchDescription);
 }, [watchDescription, onDescriptionChange]);

 useEffect(() => {
 onBrandChange(watchBrand);
 }, [watchBrand, onBrandChange]);

 useEffect(() => {
 const val = typeof watchPrice === "number" ? watchPrice : parseInt(String(watchPrice || "").replace(/\D/g, ""), 10);
 onPriceChange(isNaN(val) ? 0 : val);
 }, [watchPrice, onPriceChange]);

 useEffect(() => {
 if (watchCompare === undefined || watchCompare === null || watchCompare === ("" as any)) {
 return onCompareChange(null);
 }
 const val = typeof watchCompare === "number" ? watchCompare : parseInt(String(watchCompare).replace(/\D/g, ""), 10);
 onCompareChange(isNaN(val) ? null : val);
 }, [watchCompare, onCompareChange]);

 useEffect(() => {
 if (watchCost === undefined || watchCost === null || watchCost === ("" as any)) {
 return onCostChange(null);
 }
 const val = typeof watchCost === "number" ? watchCost : parseInt(String(watchCost).replace(/\D/g, ""), 10);
 onCostChange(isNaN(val) ? null : val);
 }, [watchCost, onCostChange]);

 useEffect(() => {
 onStatusChange(watchStatus);
 }, [watchStatus, onStatusChange]);

 const onSubmit = async (values: any) => {
 setIsSubmitting(true);
 try {
 const price_cents = typeof values.price_cents === "number"
 ? values.price_cents
 : parseInt(String(values.price_cents || "").replace(/\D/g, ""), 10) || 0;
 const compare_at_cents = values.compare_at_cents !== undefined && values.compare_at_cents !== null && values.compare_at_cents !== ""
 ? (typeof values.compare_at_cents === "number"
 ? values.compare_at_cents
 : parseInt(String(values.compare_at_cents).replace(/\D/g, ""), 10) || null)
 : null;
 const cost_cents = values.cost_cents !== undefined && values.cost_cents !== null && values.cost_cents !== ""
 ? (typeof values.cost_cents === "number"
 ? values.cost_cents
 : parseInt(String(values.cost_cents).replace(/\D/g, ""), 10) || null)
 : null;

 const res = await updateProduct({
 data: {
 id: product.id,
 title: values.title,
 description: values.description || null,
 brand: values.brand,
 status: values.status,
 price_cents,
 compare_at_cents,
 cost_cents,
 short_description: values.short_description || null,
 manufacturer: values.manufacturer || null,
 ean: values.ean || null,
 meta_title: values.meta_title || null,
 meta_description: values.meta_description || null,
 is_physical: values.is_physical,
 weight_kg: values.weight_kg ? parseFloat(values.weight_kg) : null,
 width_cm: values.width_cm ? parseFloat(values.width_cm) : null,
 height_cm: values.height_cm ? parseFloat(values.height_cm) : null,
 length_cm: values.length_cm ? parseFloat(values.length_cm) : null,
 preparation_time_days: values.preparation_time_days
 ? parseInt(values.preparation_time_days, 10)
 : 0,
 preparation_time_minutes: values.preparation_time_minutes
 ? parseInt(values.preparation_time_minutes, 10)
 : null,
 show_stock_publicly: values.show_stock_publicly ?? false,
 category_ids: selectedCategory && selectedCategory !== "none" ? [selectedCategory] : [],
 type_id: values.type_id !== "none" ? values.type_id : null,
 attributes: values.attributes,
 },
 });

 if (res) {
 toast.success(`${nicheCtx.entityName} atualizado com sucesso!`);
 await router.invalidate();
 } else {
 toast.error(`Erro ao atualizar ${nicheCtx.entityName.toLowerCase()}`);
 }
 } catch (e: any) {
 toast.error(e?.message || "Erro inesperado ao salvar alterações");
 } finally {
 setIsSubmitting(false);
 }
 };

 const handleCreateCategory = async () => {
 if (!newCategoryName.trim()) return;
 setIsCreatingCategory(true);
 try {
 const slug = newCategoryName
 .toLowerCase()
 .normalize("NFD")
 .replace(/[\u0300-\u036f]/g, "")
 .replace(/[^a-z0-9]+/g, "-")
 .replace(/(^-|-$)+/g, "");
 const res = await createCategory({
 data: {
 name: newCategoryName,
 slug,
 status: "active",
 },
 });
 if (res) {
 toast.success("Categoria criada com sucesso!");
 categories.push(res);
 setSelectedCategory(res.id);
 setIsCategoryModalOpen(false);
 setNewCategoryName("");
 } else {
 toast.error("Erro ao criar categoria");
 }
 } catch {
 toast.error("Erro inesperado");
 } finally {
 setIsCreatingCategory(false);
 }
 };

 return (
 <form onSubmit={handleSubmit(onSubmit)} className="space-y-10">
 <div>
 <div className="mb-4">
 <h3 className="text-lg font-bold text-foreground">Informações de Identificação</h3>
 <p className="text-sm text-muted-foreground">
 Defina o título, detalhes e descrição para a vitrine.
 </p>
 </div>
 <div className="space-y-4">
 <div className="space-y-2">
 <Label>{nicheCtx.nameLabel}</Label>
 <Input {...register("title", { required: "Obrigatório" })} placeholder={nicheCtx.namePlaceholder} />
 {errors.title && <span className="text-xs text-destructive">Campo obrigatório</span>}
 </div>
 <div className="space-y-2">
 <Label>{nicheCtx.descLabel}</Label>
 <Textarea
 {...register("description")}
 rows={5}
 placeholder={nicheCtx.descPlaceholder}
 />
 </div>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div className="space-y-2">
 <Label>{nicheCtx.brandLabel}</Label>
 <Input {...register("brand")} placeholder={nicheCtx.brandPlaceholder} />
 </div>
 <div className="space-y-2">
 <div className="flex justify-between items-center">
 <Label>{nicheCtx.categoryLabel}</Label>
 <Sheet open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
 <SheetTrigger asChild>
 <button
 type="button"
 className="text-xs text-primary hover:underline font-medium"
 >
 + Nova Categoria
 </button>
 </SheetTrigger>
 <SheetContent side="right">
 <SheetHeader>
 <SheetTitle>Criar Nova Categoria</SheetTitle>
 <SheetDescription>
 Crie uma nova categoria para agrupar {nicheCtx.entityNamePlural.toLowerCase()} na vitrine.
 </SheetDescription>
 </SheetHeader>
 <div className="space-y-4 py-4">
 <div className="space-y-2">
 <Label>Nome da Categoria</Label>
 <Input
 value={newCategoryName}
 onChange={(e) => setNewCategoryName(e.target.value)}
 placeholder="Ex: Lançamentos"
 autoFocus
 />
 </div>
 </div>
 <SheetFooter>
 <Button variant="outline" onClick={() => setIsCategoryModalOpen(false)}>
 Cancelar
 </Button>
 <Button
 type="button"
 onClick={handleCreateCategory}
 disabled={isCreatingCategory || !newCategoryName.trim()}
 >
 {isCreatingCategory ? "Criando..." : "Criar Categoria"}
 </Button>
 </SheetFooter>
 </SheetContent>
 </Sheet>
 </div>
 <Select value={selectedCategory} onValueChange={setSelectedCategory}>
 <SelectTrigger>
 <SelectValue placeholder="Selecione uma categoria..." />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="none">Sem categoria</SelectItem>
 {categories.map((c: any) => (
 <SelectItem key={c.id} value={c.id}>
 {c.name}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 </div>
 </div>
 </div>

 <div className="pt-6 border-t">
 <div className="mb-4">
 <h3 className="text-lg font-bold text-foreground">Precificação & Lucratividade</h3>
 <p className="text-sm text-muted-foreground">
 Valores em Reais (R$). Cálculos de margem de lucro acontecem em tempo real.
 </p>
 </div>
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
 <div className="space-y-2">
 <Label>Preço de Venda (R$) *</Label>
 <Controller
 name="price_cents"
 control={control}
 rules={{ required: true }}
 render={({ field }) => (
 <CurrencyField
 value={field.value}
 onChange={field.onChange}
 placeholder="0,00"
 className="h-10"
 />
 )}
 />
 </div>
 <div className="space-y-2">
 <Label>Preço Comparativo De (R$)</Label>
 <Controller
 name="compare_at_cents"
 control={control}
 render={({ field }) => (
 <CurrencyField
 value={field.value}
 onChange={field.onChange}
 placeholder="0,00"
 className="h-10"
 />
 )}
 />
 </div>
 <div className="space-y-2">
 <Label>Custo por Item (R$)</Label>
 <Controller
 name="cost_cents"
 control={control}
 render={({ field }) => (
 <CurrencyField
 value={field.value}
 onChange={field.onChange}
 placeholder="0,00"
 className="h-10"
 />
 )}
 />
 </div>
 </div>
 </div>

 <div className="pt-6 border-t">
 <div className="mb-4">
 <h3 className="text-lg font-bold text-foreground">Publicação & Status</h3>
 </div>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div className="space-y-2">
 <Label>Status de Visibilidade</Label>
 <Select defaultValue={product.status} onValueChange={(val) => setValue("status", val)}>
 <SelectTrigger>
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="draft">Rascunho (Oculto)</SelectItem>
 <SelectItem value="published">Publicado (Visível na Vitrine)</SelectItem>
 <SelectItem value="archived">Arquivado (Inativo)</SelectItem>
 </SelectContent>
 </Select>
 </div>

 <div className="space-y-2">
 <Label>Visibilidade de Estoque</Label>
 <Controller
 control={control}
 name="show_stock_publicly"
 render={({ field }) => (
 <div className="flex items-center justify-between gap-3 h-10 px-3 rounded-md border border-input bg-background">
 <span className="text-sm text-muted-foreground">
 Exibir disponibilidade na vitrine
 </span>
 <Switch
 id="edit_show_stock_publicly"
 checked={field.value ?? false}
 onCheckedChange={field.onChange}
 />
 </div>
 )}
 />
 </div>
 </div>
 </div>

 <div className="pt-6 border-t">
 <div className="mb-4">
 <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
 <LayoutList className="size-5 text-primary" />
 Ficha Técnica Dinâmica (Tipo de Produto)
 </h3>
 <p className="text-sm text-muted-foreground">
 Defina um tipo de produto para renderizar campos específicos (ex: Material, Voltagem, Indicação) de acordo com o seu nicho.
 </p>
 </div>
 <div className="space-y-6">
 <div className="space-y-2">
 <Label>Tipo de Produto</Label>
 <Select value={watchTypeId} onValueChange={(val) => setValue("type_id", val)}>
 <SelectTrigger>
 <SelectValue placeholder="Produto Genérico" />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="none">Produto Genérico</SelectItem>
 {productTypes.map((t: any) => (
 <SelectItem key={t.id} value={t.id}>
 {t.name}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 {selectedProductType &&
 selectedProductType.field_schema &&
 selectedProductType.field_schema.length > 0 && (
 <div className="pt-4 border-t space-y-4">
 <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
 Campos de {selectedProductType.name}
 </h4>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 {selectedProductType.field_schema.map((field: any, idx: number) => {
 const fieldKey = `attributes.${field.name}`;
 return (
 <div key={idx} className="space-y-2">
 <Label className="flex items-center gap-1">
 {field.name}
 {field.required && <span className="text-destructive">*</span>}
 </Label>

 {field.kind === "text" && (
 <Input
 {...register(fieldKey as any, { required: field.required })}
 placeholder="Ex: Algodão, Madeira..."
 />
 )}

 {field.kind === "number" && (
 <Input
 type="number"
 step="any"
 {...register(fieldKey as any, { required: field.required })}
 placeholder="0"
 />
 )}

 {field.kind === "boolean" && (
 <div className="flex items-center h-10 space-x-2">
 <Checkbox
 id={fieldKey}
 checked={watch(fieldKey as any) === true}
 onCheckedChange={(checked: boolean) =>
 setValue(fieldKey as any, checked === true)
 }
 />
 <label
 htmlFor={fieldKey}
 className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
 >
 Sim, possui {field.name.toLowerCase()}
 </label>
 </div>
 )}

 {(field.kind === "select_single" || field.kind === "option_group") && (
 <Select
 value={watch(fieldKey as any) || ""}
 onValueChange={(val) => setValue(fieldKey as any, val)}
 >
 <SelectTrigger>
 <SelectValue placeholder="Selecione..." />
 </SelectTrigger>
 <SelectContent>
 {field.options?.map((opt: string, i: number) => (
 <SelectItem key={i} value={opt}>
 {opt}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 )}
 </div>
 );
 })}
 </div>
 </div>
 )}
 </div>
 </div>

 <div className="pt-6 border-t">
 <div className="mb-4">
 <h3 className="text-lg font-bold text-foreground">Logística Avançada & Dimensões</h3>
 <p className="text-sm text-muted-foreground">
 Necessário para cálculo de frete, entregas e prazos.
 </p>
 </div>
 <div className="space-y-4">
 <div className="flex items-center space-x-2">
 <input
 type="checkbox"
 id="is_physical"
 {...register("is_physical")}
 className="size-4 rounded border-gray-300 text-primary focus:ring-primary"
 />
 <Label htmlFor="is_physical" className="text-sm font-semibold">
 Este é um produto físico que requer frete / entrega
 </Label>
 </div>
 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
 <div className="space-y-2">
 <Label>Peso (kg)</Label>
 <Input
 {...register("weight_kg")}
 type="number"
 step="0.001"
 placeholder="Ex: 0.500"
 />
 </div>
 <div className="space-y-2">
 <Label>Largura (cm)</Label>
 <Input {...register("width_cm")} type="number" step="0.01" placeholder="Ex: 20" />
 </div>
 <div className="space-y-2">
 <Label>Altura (cm)</Label>
 <Input {...register("height_cm")} type="number" step="0.01" placeholder="Ex: 15" />
 </div>
 <div className="space-y-2">
 <Label>Comprimento (cm)</Label>
 <Input {...register("length_cm")} type="number" step="0.01" placeholder="Ex: 30" />
 </div>
 </div>
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <div className="space-y-2">
 <Label>
 {nicheCtx.isTourismBusiness
 ? "Duração da Viagem (dias)"
 : "Prazo de Preparação / Produção (dias)"}
 </Label>
 <Input {...register("preparation_time_days")} type="number" placeholder="Ex: 0" />
 </div>
 {nicheCtx.isFoodBusiness && (
 <div className="space-y-2">
 <Label>Preparo Imediato / Cozinha (minutos)</Label>
 <Input {...register("preparation_time_minutes")} type="number" placeholder="Ex: 25" />
 </div>
 )}
 {nicheCtx.isServiceBusiness && (
 <div className="space-y-2">
 <Label>Duração do Atendimento (minutos)</Label>
 <Input {...register("preparation_time_minutes")} type="number" placeholder="Ex: 45" />
 </div>
 )}
 <div className="space-y-2">
 <Label>Origem de Envio</Label>
 <Select
 defaultValue={(product.attributes as any)?.origin || "national"}
 onValueChange={async (val) => {
 const currentAttr = (product.attributes as any) || {};
 const newAttr = { ...currentAttr, origin: val };
 await updateProduct({ data: { id: product.id, attributes: newAttr } });
 toast.success("Origem atualizada com sucesso!");
 }}
 >
 <SelectTrigger>
 <SelectValue placeholder="Selecione a origem..." />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="national">Nacional (Brasil)</SelectItem>
 <SelectItem value="international">Internacional (Importação)</SelectItem>
 </SelectContent>
 </Select>
 </div>
 </div>
 </div>
 </div>

 <div className="pt-6 border-t">
 <div className="mb-4">
 <h3 className="text-lg font-bold text-foreground">Identificadores & SEO</h3>
 <p className="text-sm text-muted-foreground">
 Otimização para busca no Google e conformidade fiscal/EAN.
 </p>
 </div>
 <div className="space-y-4">
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div className="space-y-2">
 <Label>Fabricante / Marca do Fornecedor</Label>
 <Input {...register("manufacturer")} placeholder="Ex: Nike S.A." />
 </div>
 <div className="space-y-2">
 <Label>Código EAN / GTIN</Label>
 <Input {...register("ean")} placeholder="Ex: 7891234567890" maxLength={14} />
 </div>
 </div>
 <div className="space-y-2">
 <Label>Resumo Curto (Short Description)</Label>
 <Textarea
 {...register("short_description")}
 placeholder="Visualização rápida do produto..."
 className="min-h-16"
 />
 </div>
 <div className="space-y-2">
 <Label>Meta Title (SEO)</Label>
 <Input {...register("meta_title")} />
 </div>
 <div className="space-y-2">
 <Label>Meta Description (SEO)</Label>
 <Textarea {...register("meta_description")} className="min-h-16" />
 </div>
 </div>
 </div>

 <div className="pt-6 border-t hidden md:flex justify-end">
 <Button
 type="submit"
 disabled={isSubmitting}
 className="rounded-xl px-8 h-12 text-sm font-bold bg-primary text-primary-foreground gap-2 cursor-pointer"
 >
 {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
 Salvar Alterações
 </Button>
 </div>

 {/* Sticky Bottom Bar (Mobile Only) */}
 <div className="fixed bottom-[60px] sm:bottom-0 inset-x-0 p-3 bg-background/90 backdrop-blur border-t z-50 md:hidden flex shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
 <Button
 type="submit"
 disabled={isSubmitting}
 className="w-full rounded-2xl h-14 text-sm font-bold bg-primary text-primary-foreground gap-2 shadow-lg"
 >
 {isSubmitting ? <Loader2 className="size-5 animate-spin" /> : <CheckCircle2 className="size-5" />}
 Salvar {nicheCtx.entityName}
 </Button>
 </div>
 </form>
 );
}

function VariantsManager({ product }: { product: any }) {
 const router = useRouter();
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [variants, setVariants] = useState<RawVariant[]>(() => {
 return (product.product_variants || []).map((v: any) => ({
 id: v.id,
 sku: v.sku,
 ean: v.ean,
 attributes: v.attributes || {},
 stock: v.stock_on_hand ?? v.stock ?? 0,
 price_override_cents: v.price_override_cents,
 cost_cents: v.cost_cents,
 weight_kg: v.weight_kg,
 image_url: v.image_url,
 status: v.status || "active",
 allow_backorder: v.allow_backorder,
 backorder_lead_time_days: v.backorder_lead_time_days,
 requires_payment_for_backorder: v.requires_payment_for_backorder,
 }));
 });

 const handleSaveMatrix = async () => {
 setIsSubmitting(true);
 try {
 await batchUpsertVariantMatrix({
 data: {
 product_id: product.id,
 matrix: variants,
 },
 });
 toast.success("Matriz de variações salva com sucesso!");
 router.invalidate();
 } catch (e: unknown) {
 toast.error((e instanceof Error ? e.message : String(e)) || "Erro ao salvar matriz");
 } finally {
 setIsSubmitting(false);
 }
 };

 return (
 <div className="space-y-6">
 <Accordion type="single" collapsible className="w-full">
 <AccordionItem value="builder" className="bg-card rounded-2xl px-5 border border-border/80">
 <AccordionTrigger className="hover:no-underline text-sm font-bold">
 <div className="flex items-center gap-2">
 <Layers className="size-4 text-primary" />
 <span>Gerador em Lote de Opções (Tamanhos, Cores, Voltagens)</span>
 </div>
 </AccordionTrigger>
 <AccordionContent className="pt-4 pb-6">
 <div className="mb-4 p-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded-xl text-xs">
 <strong>Dica de Uso:</strong> Use o gerador para criar combinações em lote (ex: Tamanhos P, M, G combinados com Cores Preto, Branco).
 </div>
 <VariantOptionsBuilder product={product} />
 </AccordionContent>
 </AccordionItem>
 </Accordion>

 <div className="pt-6 border-t">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
 <div>
 <h3 className="text-base font-bold text-foreground flex items-center gap-2">
 <LayoutList className="size-4.5 text-primary" />
 Matriz de Variações e Saldo de Estoque
 </h3>
 <p className="text-xs text-muted-foreground">
 Ajuste atributos, estoque, preços específicos e SKUs diretamente na tabela 2D.
 </p>
 </div>
 <Button onClick={handleSaveMatrix} disabled={isSubmitting} size="sm" className="font-bold gap-2">
 {isSubmitting ? (
 <Loader2 className="size-4 animate-spin" />
 ) : (
 <Settings className="size-4" />
 )}
 Salvar Matriz
 </Button>
 </div>
 <div>
 <VariantMatrixGrid
 variants={variants}
 onChange={setVariants}
 basePriceCents={product.price_cents || 0}
 />
 </div>
 </div>
 </div>
 );
}

function MediaManager({ product }: { product: any }) {
 const router = useRouter();
 const [isAdding, setIsAdding] = useState(false);
 const [editingMedia, setEditingMedia] = useState<any | null>(null);
 const [isSavingMetadata, setIsSavingMetadata] = useState(false);

 const handleAddImage = async (url: string) => {
 if (!url) return;
 setIsAdding(true);
 try {
 const res = await addProductMediaLink({ data: { product_id: product.id, url } });
 if (res) {
 toast.success("Imagem vinculada e salva na galeria!");
 router.invalidate();
 } else {
 toast.error("Erro ao salvar imagem.");
 }
 } catch {
 toast.error("Erro inesperado ao salvar imagem.");
 } finally {
 setIsAdding(false);
 }
 };

 const handleDelete = async (mediaId: string, mediaUrl: string) => {
 try {
 await deleteProductMedia({ data: { id: mediaId, url: mediaUrl } });
 toast.success("Mídia removida.");
 router.invalidate();
 } catch {
 toast.error("Erro ao deletar mídia");
 }
 };

 const handleMove = async (index: number, direction: "left" | "right") => {
 const list = [...(product.product_media || [])];
 if (direction === "left" && index === 0) return;
 if (direction === "right" && index === list.length - 1) return;

 const targetIdx = direction === "left" ? index - 1 : index + 1;
 const temp = list[index];
 list[index] = list[targetIdx];
 list[targetIdx] = temp;

 const mediaOrders = list.map((item, idx) => ({
 id: item.id,
 sort_order: idx,
 }));

 try {
 await reorderProductMedia({ data: { mediaOrders } });
 toast.success("Ordenação de fotos atualizada!");
 router.invalidate();
 } catch {
 toast.error("Erro ao reordenar mídias.");
 }
 };

 const handleSaveMetadata = async (e: React.FormEvent<HTMLFormElement>) => {
 e.preventDefault();
 if (!editingMedia) return;

 setIsSavingMetadata(true);
 const formData = new FormData(e.currentTarget);
 const alt = formData.get("alt") as string;
 const media_type = formData.get("media_type") as "image" | "video";
 const variant_id = (formData.get("variant_id") as string) || null;

 try {
 await updateProductMediaMetadata({
 data: {
 id: editingMedia.id,
 alt: alt || null,
 media_type,
 variant_id: variant_id === "none" ? null : variant_id,
 },
 });

 toast.success("Metadados atualizados com sucesso!");
 setEditingMedia(null);
 router.invalidate();
 } catch {
 toast.error("Erro ao atualizar metadados.");
 } finally {
 setIsSavingMetadata(false);
 }
 };

 return (
 <div>
 <div className="mb-4">
 <h3 className="text-base font-bold text-foreground">Galeria de Fotos do Produto</h3>
 <p className="text-xs text-muted-foreground">
 Fotos em alta qualidade aumentam a conversão de vendas. Limite de 5MB por arquivo.
 </p>
 </div>
 <div className="space-y-6">
 <div className="space-y-2">
 <Label className="text-xs font-semibold">Fazer Upload de Nova Imagem</Label>
 <div className="max-w-md">
 <ImageUpload onChange={handleAddImage} bucket="product-media" />
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t">
 {product.product_media
 ?.sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
 .map((m: any, idx: number) => {
 const matchedVariant = product.product_variants?.find(
 (v: any) => v.id === m.variant_id,
 );
 const variantText = matchedVariant ? `Variação: ${matchedVariant.sku}` : "Uso Geral";

 return (
 <div
 key={m.id || idx}
 className="relative group border border-border/80 overflow-hidden bg-card rounded-2xl flex flex-col justify-between"
 >
 <div className="relative aspect-[4/3] bg-muted/40 overflow-hidden flex items-center justify-center">
 {m.media_type === "video" ? (
 <video
 src={m.url}
 className="size-full object-cover"
 controls={false}
 muted
 />
 ) : (
 <img src={m.url} alt={m.alt || ""} className="size-full object-cover" />
 )}
 {idx === 0 && (
 <Badge className="absolute top-2 left-2 text-[10px] font-bold" variant="default">
 Capa
 </Badge>
 )}
 {m.media_type === "video" && (
 <Badge className="absolute top-2 right-12 text-[10px] bg-destructive text-white border-none">
 Vídeo
 </Badge>
 )}
 <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
 <Button
 type="button"
 variant="secondary"
 size="icon"
 className="size-8 rounded-lg"
 onClick={() => setEditingMedia(m)}
 >
 <Settings className="size-4" />
 </Button>
 <Button
 type="button"
 variant="destructive"
 size="icon"
 className="size-8 rounded-lg"
 onClick={() => handleDelete(m.id, m.url)}
 >
 <Trash2 className="size-4" />
 </Button>
 </div>
 </div>
 <div className="p-3 space-y-1 bg-background/50">
 <p className="text-[11px] font-semibold text-primary truncate">{variantText}</p>
 <p className="text-[10px] text-muted-foreground truncate italic">
 {m.alt ? `"${m.alt}"` : "Sem legenda"}
 </p>
 <div className="flex items-center justify-between pt-2">
 <Button
 type="button"
 variant="outline"
 size="icon"
 className="size-7 rounded-lg"
 disabled={idx === 0}
 onClick={() => handleMove(idx, "left")}
 >
 <ArrowLeft className="size-3.5" />
 </Button>
 <span className="text-[10px] text-muted-foreground font-mono">
 Pos: {idx + 1}
 </span>
 <Button
 type="button"
 variant="outline"
 size="icon"
 className="size-7 rounded-lg"
 disabled={idx === (product.product_media?.length || 0) - 1}
 onClick={() => handleMove(idx, "right")}
 >
 <ArrowRight className="size-3.5" />
 </Button>
 </div>
 </div>
 </div>
 );
 })}
 </div>
 </div>

 <Sheet open={!!editingMedia} onOpenChange={(open) => !open && setEditingMedia(null)}>
 {editingMedia && (
 <SheetContent side="right">
 <SheetHeader>
 <SheetTitle>Editar Detalhes da Mídia</SheetTitle>
 <SheetDescription>
 Adicione legendas de acessibilidade ou vincule esta imagem a uma variante específica.
 </SheetDescription>
 </SheetHeader>
 <form onSubmit={handleSaveMetadata} className="space-y-4 pt-4">
 <div className="space-y-2">
 <Label>Legenda / Texto Alternativo (Acessibilidade)</Label>
 <Input
 name="alt"
 defaultValue={editingMedia.alt || ""}
 placeholder="Ex: Tênis vermelho de couro sob luz natural"
 />
 </div>

 <div className="space-y-2">
 <Label>Tipo de Mídia</Label>
 <Select name="media_type" defaultValue={editingMedia.media_type || "image"}>
 <SelectTrigger>
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="image">Imagem</SelectItem>
 <SelectItem value="video">Vídeo</SelectItem>
 </SelectContent>
 </Select>
 </div>

 <div className="space-y-2">
 <Label>Vincular à Variante Específica</Label>
 <Select name="variant_id" defaultValue={editingMedia.variant_id || "none"}>
 <SelectTrigger>
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="none">Uso Geral (Vitrine Principal)</SelectItem>
 {product.product_variants?.map((v: any) => {
 const attrsText = Object.entries(v.attributes || {})
 .map(([k, val]) => `${k}: ${val}`)
 .join(", ");
 return (
 <SelectItem key={v.id} value={v.id}>
 {v.sku} {attrsText ? `(${attrsText})` : ""}
 </SelectItem>
 );
 })}
 </SelectContent>
 </Select>
 </div>

 <SheetFooter className="pt-4">
 <Button type="button" variant="outline" onClick={() => setEditingMedia(null)}>
 Cancelar
 </Button>
 <Button type="submit" disabled={isSavingMetadata}>
 {isSavingMetadata ? "Salvando..." : "Salvar Alterações"}
 </Button>
 </SheetFooter>
 </form>
 </SheetContent>
 )}
 </Sheet>
 </div>
 );
}
