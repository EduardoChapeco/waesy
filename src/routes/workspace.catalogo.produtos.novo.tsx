import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { toast } from "sonner";
import {
 ArrowLeft,
 CheckCircle2,
 Plus,
 ImagePlus,
 Eye,
 ShoppingBag,
 Globe,
 Download,
 Package,
 Tag,
 DollarSign,
 SlidersHorizontal,
 Truck,
 ShieldCheck,
 Loader2,
 Box,
 Plane,
 Sparkles,
 Search,
 Store,
} from "lucide-react";

import { TravelPackageForm } from "@/components/commerce/travel/travel-package-form";
import { TravelPackageDetailView } from "@/components/commerce/travel/travel-package-detail-view";
import { ConvenienceShowcaseView } from "@/components/classifieds/convenience-showcase-view";
import type { TravelPackageData } from "@/types/travel-package";

import { PageHeader } from "@/components/commerce/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyField } from "@/components/ui/currency-field";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { MediaUploader } from "@/components/ui/media-uploader";
import { VariantMatrixGrid, type RawVariant } from "@/components/admin/catalog/variant-matrix-grid";
import {
 Sheet,
 SheetContent,
 SheetHeader,
 SheetTitle,
 SheetDescription,
 SheetFooter,
} from "@/components/ui/sheet";
import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
 DialogDescription,
 DialogFooter,
} from "@/components/ui/dialog";
import {
 createProduct,
 createCategory,
 listCategories,
 listProductTypes,
 listOptionGroups,
} from "@/services/admin-catalog.functions";
import { ProductModifiersCard } from "@/components/admin/catalog/product-modifiers-card";
import { ProductBomCard, type BomItem } from "@/components/admin/catalog/product-bom-card";
import {
 ProductFoodSpecsCard,
 type FoodSpecsData,
} from "@/components/admin/catalog/product-food-specs-card";
import { importProductFromUrl, importFullCatalogMenu } from "@/services/api-orchestrator.functions";
import { getNicheCatalogContext } from "@/lib/catalog-niche-context";
import { getNicheSemantics } from "@/lib/niche-semantics";
import { getStoreSettings } from "@/services/store.functions";
import { MasterCatalogSearchDialog } from "@/components/admin/catalog/master-catalog-search-dialog";
import type { MasterProductRecord } from "@/lib/data/master-products-catalog";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/workspace/catalogo/produtos/novo")({
 head: () => ({ meta: [{ title: "Criar Novo Produto | Workspace Waesy" }] }),
 loader: async () => {
 try {
 const [catsRes, typesRes, groupsRes, storeRes] = await Promise.all([
 listCategories().catch(() => []),
 listProductTypes().catch(() => []),
 listOptionGroups().catch(() => []),
 getStoreSettings().catch(() => null),
 ]);
 return {
 categories: catsRes || [],
 productTypes: typesRes || [],
 optionGroupsList: groupsRes || [],
 store: storeRes,
 };
 } catch (e) {
 console.warn("[workspace.catalogo.produtos.novo] Falha no loader, usando fallback:", e);
 return {
 categories: [],
 productTypes: [],
 optionGroupsList: [],
 store: null,
 };
 }
 },
 component: UnifiedNewProductPage,
});

function slugify(text: string) {
 return text
 .toLowerCase()
 .normalize("NFD")
 .replace(/[\u0300-\u036f]/g, "")
 .replace(/[^a-z0-9]+/g, "-")
 .replace(/(^-|-$)+/g, "");
}

export function UnifiedNewProductPage() {
 const { categories, productTypes, optionGroupsList, store } = ((Route.useLoaderData?.() as any) || {});
 const navigate = useNavigate();

 const [categoriesList, setCategoriesList] = useState<any[]>(categories || []);
 const [isQuickCategoryOpen, setIsQuickCategoryOpen] = useState(false);
 const [quickCategoryName, setQuickCategoryName] = useState("");
 const [isCreatingCategory, setIsCreatingCategory] = useState(false);

 const handleQuickCreateCategory = async () => {
 if (!quickCategoryName.trim()) {
 toast.error("Informe o nome da categoria / tipo de destino.");
 return;
 }
 setIsCreatingCategory(true);
 try {
 const slug = slugify(quickCategoryName.trim());
 const newCat = await createCategory({
 data: {
 name: quickCategoryName.trim(),
 slug,
 },
 });
 setCategoriesList((prev) => [...prev, newCat]);
 setValue("category_id", newCat.id);
 setIsQuickCategoryOpen(false);
 setQuickCategoryName("");
 toast.success(`${nicheCtx.categoryLabel} "${newCat.name}" cadastrada com sucesso!`);
 } catch (err: any) {
 toast.error(err?.message || "Erro ao criar categoria.");
 } finally {
 setIsCreatingCategory(false);
 }
 };

 const semantics = getNicheSemantics(store);
 const nicheCtx = getNicheCatalogContext(store);

 const [activeTab, setActiveTab] = useState("basico");
 const [isSubmitting, setIsSubmitting] = useState(false);

 // Mídias
 const [images, setImages] = useState<string[]>([]);
 const [activePreviewImage, setActivePreviewImage] = useState(0);

 // Grupos de Opções / Adicionais gerenciados e selecionados
 const [optionGroups, setOptionGroups] = useState<any[]>(optionGroupsList || []);
 const [selectedOptionGroupIds, setSelectedOptionGroupIds] = useState<string[]>([]);

  // Especificações Gastronômicas & Padrão iFood / Varejo
  const [bomItems, setBomItems] = useState<BomItem[]>([]);
  const [foodSpecs, setFoodSpecs] = useState<FoodSpecsData>({
    dietaryRestrictions: [],
    beverageTags: [],
    servesCount: "1 pessoa",
    portionWeight: "",
    portionUnit: "g",
    preparationTimeMinutes: 15,
    barcodeEan: "",
    isFreshPricingActive: false,
    freshPricingMode: "unit",
    avgPieceWeightGrams: undefined,
    pricePerKgCents: undefined,
    ripenessEnabled: false,
    ripenessStages: ["Verde / Para amadurecer", "De vez / Firme", "Maduro / No ponto", "Bem maduro / Consumo hoje"],
    progressiveDiscounts: [],
  });

  const isTourismStore =
    semantics.nicheId === "tourism" ||
    Boolean(nicheCtx.isTourismBusiness) ||
    store?.segment === "tourism_agency" ||
    store?.type === "tourism_agency" ||
    store?.settings?.segment === "tourism_agency";

  const isGroceryStore =
    semantics.nicheId === "supermarket" ||
    semantics.nicheId === "convenience" ||
    semantics.nicheId === "grocery" ||
    Boolean((nicheCtx as any).isSupermarketBusiness) ||
    store?.segment === "supermarket" ||
    store?.segment === "grocery" ||
    store?.segment === "convenience" ||
    store?.type === "supermarket" ||
    store?.type === "grocery" ||
    store?.type === "convenience" ||
    store?.settings?.segment === "supermarket" ||
    store?.settings?.segment === "grocery" ||
    store?.settings?.segment === "convenience";

  const [showcaseMode, setShowcaseMode] = useState<"standard" | "travel" | "grocery">(
    isTourismStore ? "travel" : isGroceryStore ? "grocery" : "standard"
  );
  const isTravelPackageMode = showcaseMode === "travel";
  const isGroceryMode = showcaseMode === "grocery";
  const [previewDevice, setPreviewDevice] = useState<"mobile" | "desktop">("mobile");

 const [travelData, setTravelData] = useState<Partial<TravelPackageData>>({
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
 });

 // Modal: Importador Inteligente por URL
 const [isImportModalOpen, setIsImportModalOpen] = useState(false);
 const [importUrl, setImportUrl] = useState("");
 const [importTone, setImportTone] = useState<"profissional" | "persuasivo" | "tecnico" | "minimalista">("profissional");
 const [isImporting, setIsImporting] = useState(false);
 const [variantsMatrix, setVariantsMatrix] = useState<RawVariant[]>([]);

 // Catálogo Mestre Central & Inteligência Fiscal (Reforma Tributária 2026)
 const [isMasterCatalogOpen, setIsMasterCatalogOpen] = useState(false);
 const [fiscalData, setFiscalData] = useState({
 ncm_code: "",
 cest_code: "",
 ibs_rate: 15.5,
 cbs_rate: 8.8,
 cfop_default: "5.102",
 tax_regime: "padrao_bens_servicos",
 });

 const handleSelectMasterProduct = (p: MasterProductRecord) => {
 setValue("title", p.name);
 setValue("slug", slugify(p.name));
 setValue("brand", p.brand_name);
 setValue("short_description", p.description);
 setValue("description", p.description);
 setValue("price_cents", p.suggested_price_cents);
 setValue("sku", p.barcode_ean);
 setValue("selling_unit", p.unit_of_measure as any);
 if (p.image_urls?.[0]) {
 setImages([p.image_urls[0]]);
 }
 setFiscalData({
 ncm_code: p.ncm_code,
 cest_code: p.cest_code || "",
 ibs_rate: p.ibs_rate,
 cbs_rate: p.cbs_rate,
 cfop_default: p.cfop_default,
 tax_regime: p.tax_tribute_group,
 });
 toast.success(`"${p.name}" importado do Catálogo Central com parâmetros fiscais!`);
 };

 const [isAddDimensionOpen, setIsAddDimensionOpen] = useState(false);
 const [newDimensionName, setNewDimensionName] = useState("");
 const [newDimensionValue, setNewDimensionValue] = useState("");

 const handleAddDimensionSubmit = () => {
 if (!newDimensionName.trim() || !newDimensionValue.trim()) {
 toast.error("Preencha o nome da dimensão e o primeiro valor.");
 return;
 }
 const dim = newDimensionName.trim();
 const val = newDimensionValue.trim();
 setVariantsMatrix((prev) => {
 if (prev.length === 0) {
 return [
 {
 sku: `${formValues.slug || "prod"}-${val.toLowerCase().replace(/\s+/g, "-")}`,
 attributes: { [dim]: val },
 stock: formValues.stock || 10,
 price_override_cents: null,
 },
 ];
 }
 return prev.map((v) => ({
 ...v,
 attributes: { ...v.attributes, [dim]: v.attributes[dim] || val },
 }));
 });
 setIsAddDimensionOpen(false);
 setNewDimensionName("");
 setNewDimensionValue("");
 toast.success(`Dimensão "${dim}" configurada com sucesso!`);
 };

 // React Hook Form
 const {
 register,
 handleSubmit,
 setValue,
 watch,
 control,
 formState: { errors },
 } = useForm({
 defaultValues: {
 title: "",
 slug: "",
 short_description: "",
 description: "",
 price_cents: 0,
 compare_at_cents: 0,
 cost_cents: 0,
 category_id: "",
 type_id: "",
 brand: "",
 sku: "",
 selling_unit: "un",
 stock: 10,
 show_stock_publicly: false,
 is_physical: true,
 weight_kg: 0.5,
 width_cm: 15,
 height_cm: 10,
 length_cm: 20,
 preparation_time_days: 0,
 status: "published" as "published" | "draft" | "archived",
 },
 });

 const formValues = watch();

 // Cálculo de Margem e Lucro
 const grossProfitCents = Math.max(0, (formValues.price_cents || 0) - (formValues.cost_cents || 0));
 const marginPercent =
 formValues.price_cents > 0
 ? Math.round((grossProfitCents / formValues.price_cents) * 100)
 : 0;

 // Auto-gerar slug a partir do título
 const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
 const val = e.target.value;
 setValue("title", val);
 setValue("slug", slugify(val));
 };

 const onSubmit = async (data: any) => {
 if (!data.title.trim()) {
 toast.error("O nome do produto é obrigatório.");
 return;
 }

 if (data.price_cents <= 0) {
 toast.error("Informe um preço de venda válido maior que zero.");
 return;
 }

 setIsSubmitting(true);
 try {
 const generatedSlug = data.slug.trim() || slugify(data.title);
 const categoryIds = data.category_id ? [data.category_id] : [];

 const variantsPayload =
 variantsMatrix.length > 0
 ? variantsMatrix.map((v, idx) => ({
 sku: String(v.sku || `${generatedSlug}-var-${idx + 1}`),
 attributes: (v.attributes || {}) as Record<string, unknown>,
 stock: Number(v.stock ?? 10),
 price_override_cents:
 v.price_override_cents != null && Number(v.price_override_cents) > 0
 ? Number(v.price_override_cents)
 : null,
 image_url: v.image_url || null,
 }))
 : [
 {
 sku: String(data.sku || `${generatedSlug}-default`),
 attributes: {},
 stock: Number(data.stock || 10),
 price_override_cents: null,
 image_url: images[0] || null,
 },
 ];

 await createProduct({
 data: {
 title: data.title.trim(),
 slug: generatedSlug,
 description: data.description || null,
 short_description: data.short_description || null,
 status: data.status || "published",
 brand: data.brand || null,
 ean: foodSpecs.barcodeEan?.trim() || data.ean || null,
 price_cents: data.price_cents,
 compare_at_cents: data.compare_at_cents > 0 ? data.compare_at_cents : null,
 cost_cents: data.cost_cents > 0 ? data.cost_cents : null,
 type_id: data.type_id || null,
 is_physical: isTravelPackageMode ? false : data.is_physical,
 weight_kg: isTravelPackageMode ? null : data.weight_kg ? Number(data.weight_kg) : null,
 width_cm: isTravelPackageMode ? null : data.width_cm ? Number(data.width_cm) : null,
 height_cm: isTravelPackageMode ? null : data.height_cm ? Number(data.height_cm) : null,
 length_cm: isTravelPackageMode ? null : data.length_cm ? Number(data.length_cm) : null,
 preparation_time_days: data.preparation_time_days
 ? Number(data.preparation_time_days)
 : null,
 show_stock_publicly: data.show_stock_publicly ?? false,
 media_urls: images,
 category_ids: categoryIds,
 option_group_ids: selectedOptionGroupIds.length > 0 ? selectedOptionGroupIds : undefined,
 variants: variantsPayload,
 attributes: {
 template_style: isGroceryMode ? "conveniencia" : isTravelPackageMode ? "editorial" : "standard",
 templateStyle: isGroceryMode ? "conveniencia" : isTravelPackageMode ? "editorial" : "standard",
 ...(isTravelPackageMode ? { travel: travelData } : {}),
 bill_of_materials: bomItems,
 food_specs: {
 dietary_restrictions: foodSpecs.dietaryRestrictions,
 beverage_tags: foodSpecs.beverageTags,
 serves_count: foodSpecs.servesCount,
 portion_weight: foodSpecs.portionWeight,
 portion_unit: foodSpecs.portionUnit,
 preparation_time_minutes: foodSpecs.preparationTimeMinutes,
 pos_code: foodSpecs.posCode,
 barcode_ean: foodSpecs.barcodeEan,
 is_fresh_pricing_active: foodSpecs.isFreshPricingActive,
 fresh_pricing_mode: foodSpecs.freshPricingMode,
 avg_piece_weight_grams: foodSpecs.avgPieceWeightGrams,
 price_per_kg_cents: foodSpecs.pricePerKgCents,
 ripeness_enabled: foodSpecs.ripenessEnabled,
 ripeness_stages: foodSpecs.ripenessStages,
 progressive_discounts: foodSpecs.progressiveDiscounts,
 },
 fiscal: fiscalData,
 },
 },
 });

 toast.success(`${nicheCtx.entityName} cadastrado com sucesso no catálogo!`);
 navigate({ to: "/workspace/catalogo/produtos" });
 } catch (err: any) {
 toast.error(err?.message || "Erro ao salvar o produto.");
 } finally {
 setIsSubmitting(false);
 }
 };

 const handleImportProduct = async () => {
 if (!importUrl.trim()) {
 toast.error("Informe a URL do produto para importar.");
 return;
 }
 setIsImporting(true);
 try {
 const imported = await importProductFromUrl({
 data: { url: importUrl.trim(), tone: importTone },
 });
 if (imported) {
 if (imported.title) {
 setValue("title", imported.title);
 setValue("slug", slugify(imported.title));
 }
 if (imported.description) setValue("description", imported.description);
 if (imported.price_cents) setValue("price_cents", imported.price_cents);
 if (imported.brand) setValue("brand", imported.brand);
 const importedImages = (imported as any).media_urls || (imported as any).images;
 if (Array.isArray(importedImages) && importedImages.length > 0) {
 setImages(importedImages);
 }
 toast.success("Informações do produto importadas com IA!");
 setIsImportModalOpen(false);
 }
 } catch (err: any) {
 toast.error(err?.message || "Erro ao extrair produto via IA.");
 } finally {
 setIsImporting(false);
 }
 };

 return (
 <div className="w-full max-w-7xl mx-auto px-0 sm:px-0 space-y-6 pb-20 animate-in fade-in duration-200">
 {/* ── Top Header Limpo ── */}
 <PageHeader
 eyebrow="Catálogo"
 title={`Criar Novo ${nicheCtx.entityName}`}
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
 <span>Catálogo Mestre</span>
 </Button>
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={() => setIsImportModalOpen(true)}
 className="rounded-xl text-xs font-bold gap-1.5"
 >
 <Globe className="size-3.5 text-primary" />
 <span>Importar por Link</span>
 </Button>
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={() => setIsImportModalOpen(true)}
 className="rounded-xl text-xs font-bold gap-1.5 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 cursor-pointer hidden sm:flex"
 title="Copiar catálogo completo de loja antiga"
 >
 <Store className="size-3.5" />
 <span>Copiar Loja Antiga</span>
 </Button>
 <Button variant="outline" asChild size="sm" className="rounded-xl text-xs font-bold">
 <Link to="/workspace/catalogo/produtos">
 <ArrowLeft className="mr-1.5 size-3.5" />
 Voltar
 </Link>
 </Button>
 <Button
 onClick={handleSubmit(onSubmit)}
 disabled={isSubmitting}
 size="sm"
 className="rounded-xl text-xs font-bold bg-primary text-primary-foreground gap-1.5"
 >
 {isSubmitting ? (
 <>
 <Loader2 className="size-3.5 animate-spin" />
 <span>Publicando...</span>
 </>
 ) : (
 <>
 <CheckCircle2 className="size-3.5" />
 <span>Publicar {nicheCtx.entityName}</span>
 </>
 )}
 </Button>
 </div>
 }
 />

 {/* ── Dialog: Cadastro Rápido de Categoria / Tipo de Destino ── */}
 <Dialog open={isQuickCategoryOpen} onOpenChange={setIsQuickCategoryOpen}>
 <DialogContent className="sm:max-w-md rounded-2xl">
 <DialogHeader>
 <DialogTitle className="text-sm font-bold">
 Nova {nicheCtx.categoryLabel}
 </DialogTitle>
 <DialogDescription className="text-xs text-muted-foreground">
 Cadastre rapidamente uma nova categoria ou tipo de destino diretamente no catálogo.
 </DialogDescription>
 </DialogHeader>
 <div className="space-y-3 py-2">
 <div className="space-y-1">
 <Label className="text-xs font-medium">Nome</Label>
 <Input
 value={quickCategoryName}
 onChange={(e) => setQuickCategoryName(e.target.value)}
 placeholder="Ex: Resorts All Inclusive, Ecoturismo, Nordeste, Internacional"
 className="h-10 text-xs rounded-xl bg-background"
 disabled={isCreatingCategory}
 onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleQuickCreateCategory())}
 />
 </div>
 </div>
 <DialogFooter className="gap-2 sm:gap-0">
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={() => setIsQuickCategoryOpen(false)}
 disabled={isCreatingCategory}
 className="rounded-xl text-xs"
 >
 Cancelar
 </Button>
 <Button
 type="button"
 size="sm"
 onClick={handleQuickCreateCategory}
 disabled={isCreatingCategory || !quickCategoryName.trim()}
 className="rounded-xl text-xs font-bold bg-primary text-primary-foreground"
 >
 {isCreatingCategory ? "Criando..." : "Salvar & Selecionar"}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {/* ── Dialog: Catálogo Mestre de Produtos & Parâmetros Fiscais ── */}
 <MasterCatalogSearchDialog
 open={isMasterCatalogOpen}
 onOpenChange={setIsMasterCatalogOpen}
 onSelectProduct={handleSelectMasterProduct}
 />

 {/* ── Sheet Lateral: Importador Inteligente por URL ── */}
 <Sheet open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
 <SheetContent side="right" size="wide" className="w-full max-sm:!max-w-full max-sm:!w-screen sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw] flex flex-col p-0 gap-0 overflow-hidden bg-card border-l border-border">
 <SheetHeader className="p-6 pb-4 border-b border-border/80 bg-muted/20">
 <SheetTitle className="text-base font-bold flex items-center gap-2">
 <Globe className="size-4 text-primary" />
 <span>Importar {nicheCtx.entityName} por Link</span>
 </SheetTitle>
 <SheetDescription className="text-xs text-muted-foreground mt-0.5">
 Cole o link de uma página da web ou catálogo online para preencher as informações automaticamente.
 </SheetDescription>
 </SheetHeader>

 <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-4">
 <div className="space-y-1.5">
 <Label className="text-xs font-bold">Link da Página ou Catálogo Online</Label>
 <Input
 value={importUrl}
 onChange={(e) => setImportUrl(e.target.value)}
 placeholder="https://exemplo.com.br/item"
 className="h-10 text-xs rounded-xl"
 disabled={isImporting}
 />
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-bold">Tom da Descrição</Label>
 <Select
 value={importTone}
 onValueChange={(v: any) => setImportTone(v)}
 disabled={isImporting}
 >
 <SelectTrigger className="h-10 text-xs rounded-xl">
 <SelectValue placeholder="Selecione o tom" />
 </SelectTrigger>
 <SelectContent className="rounded-2xl">
 <SelectItem value="profissional">Profissional & Elegante</SelectItem>
 <SelectItem value="persuasivo">Persuasivo & Vendedor (Copywriting)</SelectItem>
 <SelectItem value="tecnico">Técnico & Detalhado (Especificações)</SelectItem>
 <SelectItem value="minimalista">Minimalista & Direto ao Ponto</SelectItem>
 </SelectContent>
 </Select>
 </div>
 </div>

 <SheetFooter className="p-4 border-t border-border/80 bg-muted/10 gap-2 sm:gap-0">
 <Button
 variant="outline"
 onClick={() => setIsImportModalOpen(false)}
 disabled={isImporting}
 className="rounded-xl text-xs h-10"
 >
 Cancelar
 </Button>
 <Button
 onClick={handleImportProduct}
 disabled={isImporting || !importUrl.trim()}
 className="rounded-xl font-bold text-xs gap-1.5 h-10 bg-primary text-primary-foreground"
 >
 {isImporting ? (
 <>
 <Loader2 className="size-3.5 animate-spin" />
 <span>Processando com IA...</span>
 </>
 ) : (
 <>
 <Download className="size-3.5" />
 <span>Extrair & Preencher</span>
 </>
 )}
 </Button>
 </SheetFooter>
 </SheetContent>
 </Sheet>

 {/* ── Grid Principal: Formulário por Abas (5/12) + Preview Real da Vitrine (7/12) ── */}
 <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
 {/* COLUNA ESQUERDA: FORMULÁRIO ERGONÔMICO (5 COLUNAS) */}
 <div className="lg:col-span-5 space-y-4">
 <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
 <TabsList className="flex items-center gap-1 overflow-x-auto no-scrollbar bg-muted/60 p-1 rounded-2xl h-10 mb-4">
 <TabsTrigger value="basico" className="rounded-xl text-xs font-bold whitespace-nowrap shrink-0 px-3">
 Básico
 </TabsTrigger>
 <TabsTrigger value="preco" className="rounded-xl text-xs font-bold whitespace-nowrap shrink-0 px-3">
 Preço
 </TabsTrigger>
 <TabsTrigger value="fiscal" className="rounded-xl text-xs font-bold whitespace-nowrap shrink-0 px-3">
 Fiscal & Tributos
 </TabsTrigger>
 {nicheCtx.isFoodBusiness && (
 <TabsTrigger value="cardapio" className="rounded-xl text-xs font-bold whitespace-nowrap shrink-0 px-3">
 Cardápio
 </TabsTrigger>
 )}
 <TabsTrigger value="midias" className="rounded-xl text-xs font-bold whitespace-nowrap shrink-0 px-3">
 Fotos
 </TabsTrigger>
 {nicheCtx.isFoodBusiness && (
 <TabsTrigger value="insumos" className="rounded-xl text-xs font-bold whitespace-nowrap shrink-0 px-3">
 Insumos / BOM
 </TabsTrigger>
 )}
 <TabsTrigger value="opcoes" className="rounded-xl text-xs font-bold whitespace-nowrap shrink-0 px-3">
 Opções
 </TabsTrigger>
 </TabsList>

 {/* ── SELETOR DE MODO DE VITRINE / PUBLICAÇÃO ── */}
 <div className="p-3.5 rounded-2xl bg-card border border-border/70 flex items-center justify-between gap-3 shadow-2xs">
 <div className="flex items-center gap-2.5">
 <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
 {showcaseMode === "travel" ? (
 <Plane className="size-4" />
 ) : showcaseMode === "grocery" ? (
 <Package className="size-4" />
 ) : (
 <ShoppingBag className="size-4" />
 )}
 </div>
 <div>
 <span className="text-xs font-bold text-foreground">Modelo de Vitrine</span>
 <p className="text-[10px] text-muted-foreground">
 {showcaseMode === "travel"
 ? "Pacote Turístico / Roteiro Completo (com itinerário, saídas e inclusões)"
 : showcaseMode === "grocery"
 ? "Mercado & Perecíveis (com frescor, maturação, temperatura e tabela nutricional)"
 : "E-commerce & Varejo Geral (grade de estoque, variações e especificações)"}
 </p>
 </div>
 </div>

 <div className="flex items-center gap-1.5 shrink-0">
 <Button
 type="button"
 size="sm"
 variant={showcaseMode === "standard" ? "default" : "outline"}
 onClick={() => {
 setShowcaseMode("standard");
 setValue("is_physical", true);
 }}
 className="rounded-xl text-xs font-semibold h-8 cursor-pointer"
 >
 Padrão
 </Button>
 <Button
 type="button"
 size="sm"
 variant={showcaseMode === "grocery" ? "default" : "outline"}
 onClick={() => {
 setShowcaseMode("grocery");
 setValue("is_physical", true);
 }}
 className="rounded-xl text-xs font-semibold h-8 cursor-pointer"
 >
 Mercado
 </Button>
 {(isTourismStore || showcaseMode === "travel") && (
 <Button
 type="button"
 size="sm"
 variant={showcaseMode === "travel" ? "default" : "outline"}
 onClick={() => {
 setShowcaseMode("travel");
 setValue("is_physical", false);
 }}
 className="rounded-xl text-xs font-semibold h-8 cursor-pointer"
 >
 Turismo
 </Button>
 )}
 </div>
 </div>

 {/* ── ABA 1: INFORMAÇÕES BÁSICAS ── */}
 <TabsContent value="basico" className="space-y-4 m-0">
 {/* Formulário Especializado de Pacotes de Viagem */}
 {isTravelPackageMode && (
 <TravelPackageForm
 value={travelData}
 onChange={setTravelData}
 priceCents={formValues.price_cents}
 />
 )}

 <div className="bg-card rounded-2xl p-5 space-y-4 border border-border/60">
 <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
 <Tag className="size-4 text-primary" />
 <span>Identificação do {nicheCtx.entityName}</span>
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-medium text-foreground">{nicheCtx.nameLabel}</Label>
 <Input
 value={formValues.title}
 onChange={handleTitleChange}
 placeholder={nicheCtx.namePlaceholder}
 className="h-10 rounded-xl text-xs bg-background"
 />
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-1.5">
 <div className="flex items-center justify-between">
 <Label className="text-xs font-medium text-foreground">{nicheCtx.categoryLabel}</Label>
 <button
 type="button"
 onClick={() => setIsQuickCategoryOpen(true)}
 className="text-[11px] text-primary hover:underline font-semibold cursor-pointer"
 >
 + Criar Rápido
 </button>
 </div>
 <Select
 value={formValues.category_id}
 onValueChange={(val) => setValue("category_id", val)}
 >
 <SelectTrigger className="h-10 rounded-xl text-xs bg-background">
 <SelectValue placeholder="Selecione..." />
 </SelectTrigger>
 <SelectContent>
 {categoriesList.map((cat: any) => (
 <SelectItem key={cat.id} value={cat.id}>
 {cat.name}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-medium text-foreground">{nicheCtx.brandLabel}</Label>
 <Input
 {...register("brand")}
 placeholder={nicheCtx.brandPlaceholder}
 className="h-10 rounded-xl text-xs bg-background"
 />
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-1.5">
 <Label className="text-xs font-medium text-foreground">Slug URL</Label>
 <Input
 {...register("slug")}
 placeholder="slug-do-item"
 className="h-10 rounded-xl text-xs bg-background font-mono"
 />
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-medium text-foreground">Unidade de Venda</Label>
 <Select
 value={formValues.selling_unit}
 onValueChange={(val) => setValue("selling_unit", val)}
 >
 <SelectTrigger className="h-10 rounded-xl text-xs bg-background font-mono">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="un">Unidade (un)</SelectItem>
 <SelectItem value="kg">Quilo (kg)</SelectItem>
 <SelectItem value="g">Grama (g)</SelectItem>
 <SelectItem value="l">Litro (l)</SelectItem>
 <SelectItem value="ml">Mililitro (ml)</SelectItem>
 <SelectItem value="cx">Caixa (cx)</SelectItem>
 <SelectItem value="fd">Fardo (fd)</SelectItem>
 </SelectContent>
 </Select>
 </div>
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-medium text-foreground">{nicheCtx.shortDescLabel}</Label>
 <Input
 {...register("short_description")}
 placeholder={nicheCtx.shortDescPlaceholder}
 className="h-10 rounded-xl text-xs bg-background"
 />
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-medium text-foreground">{nicheCtx.descLabel}</Label>
 <Textarea
 {...register("description")}
 rows={4}
 placeholder={nicheCtx.descPlaceholder}
 className="rounded-xl text-xs bg-background"
 />
 </div>
 </div>

 {/* Logística & Frete (Apenas para produtos físicos) */}
 {!isTravelPackageMode && (
 <div className="bg-card rounded-2xl p-5 space-y-4 border border-border/60">
 <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
 <Truck className="size-4 text-primary" />
 <span>Logística & Frete</span>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-1.5">
 <Label className="text-xs font-medium text-foreground">Peso (kg)</Label>
 <Input
 {...register("weight_kg")}
 type="number"
 step="0.01"
 placeholder="0.5"
 className="h-10 rounded-xl text-xs bg-background font-mono"
 />
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-medium text-foreground">Prazo de Envio (dias)</Label>
 <Input
 {...register("preparation_time_days")}
 type="number"
 placeholder="1"
 className="h-10 rounded-xl text-xs bg-background font-mono"
 />
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
 <div className="space-y-1.5">
 <Label className="text-xs font-medium text-foreground">Largura (cm)</Label>
 <Input
 {...register("width_cm")}
 type="number"
 placeholder="15"
 className="h-10 rounded-xl text-xs bg-background font-mono"
 />
 </div>
 <div className="space-y-1.5">
 <Label className="text-xs font-medium text-foreground">Altura (cm)</Label>
 <Input
 {...register("height_cm")}
 type="number"
 placeholder="10"
 className="h-10 rounded-xl text-xs bg-background font-mono"
 />
 </div>
 <div className="space-y-1.5">
 <Label className="text-xs font-medium text-foreground">Comprimento (cm)</Label>
 <Input
 {...register("length_cm")}
 type="number"
 placeholder="20"
 className="h-10 rounded-xl text-xs bg-background font-mono"
 />
 </div>
 </div>
 </div>
 )}
 </TabsContent>

 {/* ── ABA 2: PREÇO & ESTOQUE ── */}
 <TabsContent value="preco" className="space-y-4 m-0">
 <div className="bg-card rounded-2xl p-5 space-y-4 border border-border/60">
 <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
 <DollarSign className="size-4 text-primary" />
 <span>Precificação & Margens</span>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-1.5">
 <Label className="text-xs font-medium text-foreground">Preço de Venda (R$) *</Label>
 <Controller
 control={control}
 name="price_cents"
 render={({ field }) => (
 <CurrencyField
 value={field.value}
 onChange={field.onChange}
 className="h-10 rounded-xl text-xs bg-background font-mono font-bold"
 />
 )}
 />
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-medium text-muted-foreground">Preço De (Comparativo)</Label>
 <Controller
 control={control}
 name="compare_at_cents"
 render={({ field }) => (
 <CurrencyField
 value={field.value}
 onChange={field.onChange}
 className="h-10 rounded-xl text-xs bg-background font-mono"
 />
 )}
 />
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-1.5">
 <Label className="text-xs font-medium text-muted-foreground">Preço de Custo (R$)</Label>
 <Controller
 control={control}
 name="cost_cents"
 render={({ field }) => (
 <CurrencyField
 value={field.value}
 onChange={field.onChange}
 className="h-10 rounded-xl text-xs bg-background font-mono"
 />
 )}
 />
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-medium text-foreground">Status do Produto</Label>
 <Select
 value={formValues.status}
 onValueChange={(val: any) => setValue("status", val)}
 >
 <SelectTrigger className="h-10 rounded-xl text-xs bg-background">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="published">Publicado (Visível)</SelectItem>
 <SelectItem value="draft">Rascunho (Oculto)</SelectItem>
 <SelectItem value="archived">Arquivado</SelectItem>
 </SelectContent>
 </Select>
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-1.5">
 <Label className="text-xs font-medium text-foreground">Estoque Inicial</Label>
 <Input
 type="number"
 {...register("stock", { valueAsNumber: true })}
 placeholder="10"
 className="h-10 rounded-xl text-xs bg-background font-mono"
 />
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-medium text-foreground">{nicheCtx.skuLabel}</Label>
 <Input
 {...register("sku")}
 placeholder={nicheCtx.skuPlaceholder}
 className="h-10 rounded-xl text-xs bg-background font-mono"
 />
 </div>
 </div>

 {/* Toggle de Visibilidade de Estoque */}
 <Controller
 control={control}
 name="show_stock_publicly"
 render={({ field }) => (
 <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/20 border border-border/50">
 <div className="space-y-0.5">
 <p className="text-xs font-medium text-foreground">Exibir disponibilidade na vitrine</p>
 <p className="text-[11px] text-muted-foreground leading-tight">
 Quando ativo, clientes veem o indicador de estoque ou esgotado.
 </p>
 </div>
 <Switch
 id="new_show_stock_publicly"
 checked={field.value ?? false}
 onCheckedChange={field.onChange}
 />
 </div>
 )}
 />
 </div>

 {/* Card de Variações & Grade ERP Combinatória */}
 <div className="bg-card rounded-2xl p-5 space-y-4 border border-border/60">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
 <Box className="size-4 text-primary" />
 <span>{nicheCtx.variationsSectionTitle}</span>
 </div>
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={() => setIsAddDimensionOpen(true)}
 className="h-8 rounded-xl text-xs font-bold gap-1.5"
 >
 <Plus className="size-3.5" />
 <span>{nicheCtx.addVariationBtnText}</span>
 </Button>
 </div>

 {variantsMatrix.length > 0 ? (
 <div className="space-y-2">
 <p className="text-xs text-muted-foreground">
 {variantsMatrix.length} variação(ões) configurada(s). Edite estoque individual, código e preços diretamente na grade:
 </p>
 <VariantMatrixGrid
 variants={variantsMatrix}
 onChange={setVariantsMatrix}
 basePriceCents={formValues.price_cents || 0}
 />
 </div>
 ) : (
 <div className="p-6 text-center rounded-xl border border-dashed border-border/70 space-y-2">
 <p className="text-xs text-muted-foreground">
 Este {nicheCtx.entityName.toLowerCase()} atualmente é simples (sem variações de tamanho, porção ou atributos).
 </p>
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={() => setIsAddDimensionOpen(true)}
 className="rounded-xl text-xs font-bold"
 >
 <Plus className="size-3.5 mr-1" /> {nicheCtx.addVariationBtnText}
 </Button>
 </div>
 )}
 </div>

 {/* Card de Adicionais & Modificadores (Grupos de Complementos Reutilizáveis) */}
 <ProductModifiersCard
 groups={optionGroups}
 selectedGroupIds={selectedOptionGroupIds}
 onSelectedGroupsChange={setSelectedOptionGroupIds}
 onGroupsListChange={setOptionGroups}
 />
 </TabsContent>

 {/* ── ABA: FISCAL & REFORMA TRIBUTÁRIA 2026 (IBS / CBS) ── */}
 <TabsContent value="fiscal" className="space-y-4 m-0">
 <div className="bg-card rounded-2xl p-5 space-y-4 border border-border/60">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
 <ShieldCheck className="size-4 text-primary" />
 <span>Classificação Fiscal & Reforma Tributária 2026</span>
 </div>
 <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20 font-semibold">
 IBS / CBS
 </Badge>
 </div>

 <div className="p-3.5 rounded-xl bg-muted/20 border border-border/50 text-xs text-muted-foreground flex items-center justify-between gap-3">
 <span>Importe produtos com NCM, CEST e alíquotas já cadastrados pela Receita Federal:</span>
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={() => setIsMasterCatalogOpen(true)}
 className="h-7 text-[11px] font-bold gap-1 rounded-lg border-primary/30 text-primary cursor-pointer"
 >
 <Sparkles className="size-3" />
 <span>Buscar no Catálogo Mestre</span>
 </Button>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-1.5">
 <Label className="text-xs font-medium text-foreground">Código NCM (8 Dígitos) *</Label>
 <Input
 value={fiscalData.ncm_code}
 onChange={(e) => setFiscalData({ ...fiscalData, ncm_code: e.target.value })}
 placeholder="Ex: 1006.30.21"
 className="h-10 rounded-xl text-xs bg-background font-mono font-semibold"
 />
 <p className="text-[10px] text-muted-foreground">Nomenclatura Comum do Mercosul oficial</p>
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-medium text-foreground">Código CEST</Label>
 <Input
 value={fiscalData.cest_code}
 onChange={(e) => setFiscalData({ ...fiscalData, cest_code: e.target.value })}
 placeholder="Ex: 17.001.00"
 className="h-10 rounded-xl text-xs bg-background font-mono"
 />
 <p className="text-[10px] text-muted-foreground">Código Especificador da Substituição Tributária</p>
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
 <div className="space-y-1.5">
 <Label className="text-xs font-medium text-foreground">CFOP Padrão</Label>
 <Input
 value={fiscalData.cfop_default}
 onChange={(e) => setFiscalData({ ...fiscalData, cfop_default: e.target.value })}
 placeholder="5.102"
 className="h-10 rounded-xl text-xs bg-background font-mono"
 />
 <p className="text-[10px] text-muted-foreground">5.102 (venda) ou 5.405 (substituição)</p>
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-medium text-foreground">Alíquota IBS Estimada (%)</Label>
 <Input
 type="number"
 step="0.1"
 value={fiscalData.ibs_rate}
 onChange={(e) => setFiscalData({ ...fiscalData, ibs_rate: Number(e.target.value) })}
 className="h-10 rounded-xl text-xs bg-background font-mono font-bold"
 />
 <p className="text-[10px] text-muted-foreground">Imposto sobre Bens e Serviços (Estados/Municípios)</p>
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-medium text-foreground">Alíquota CBS Estimada (%)</Label>
 <Input
 type="number"
 step="0.1"
 value={fiscalData.cbs_rate}
 onChange={(e) => setFiscalData({ ...fiscalData, cbs_rate: Number(e.target.value) })}
 className="h-10 rounded-xl text-xs bg-background font-mono font-bold"
 />
 <p className="text-[10px] text-muted-foreground">Contribuição sobre Bens e Serviços (Federal)</p>
 </div>
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-medium text-foreground">Enquadramento Tributário / Isenção</Label>
 <Select
 value={fiscalData.tax_regime}
 onValueChange={(val) => setFiscalData({ ...fiscalData, tax_regime: val })}
 >
 <SelectTrigger className="h-10 rounded-xl text-xs bg-background">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="padrao_bens_servicos">Padrão — Bens e Serviços (Tributação Integral)</SelectItem>
 <SelectItem value="isento_cesta_basica">Cesta Básica Nacional (Alíquota Zero IBS/CBS)</SelectItem>
 <SelectItem value="reducao_60">Regime Diferenciado (Redução de 60% na Alíquota)</SelectItem>
 <SelectItem value="imposto_seletivo">Sujeito a Imposto Seletivo (Bebidas Alcoólicas / Fumo)</SelectItem>
 <SelectItem value="substituicao_tributaria">Substituição Tributária (ICMS-ST Retido)</SelectItem>
 </SelectContent>
 </Select>
 </div>
 </div>
 </TabsContent>

 {/* ── ABA: ESPECIFICAÇÕES GASTRONÔMICAS (EXCLUSIVO GASTRONOMIA) ── */}
 {nicheCtx.isFoodBusiness && (
 <TabsContent value="cardapio" className="space-y-4 m-0">
 <ProductFoodSpecsCard
 value={foodSpecs}
 onChange={setFoodSpecs}
 />
 </TabsContent>
 )}

 {/* ── ABA 3: FOTOS & MÍDIAS ── */}
 <TabsContent value="midias" className="space-y-4 m-0">
 <div className="bg-card rounded-2xl p-5 space-y-3 border border-border/60">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
 <ImagePlus className="size-4 text-primary" />
 <span>Galeria de Imagens</span>
 </div>
 <span className="text-[11px] font-mono text-muted-foreground">
 {images.length} foto(s)
 </span>
 </div>

 <MediaUploader
 value={images}
 onChange={setImages}
 bucket="cms-media"
 folder="products"
 aspect={1}
 enableCrop={true}
 lockAspect={true}
 maxFiles={8}
 />
 </div>
 </TabsContent>

 {/* ── ABA: FICHA TÉCNICA, INSUMOS & PRODUTO COMPOSTO (BOM) ── */}
 {nicheCtx.isFoodBusiness && (
 <TabsContent value="insumos" className="space-y-4 m-0">
 <ProductBomCard
 initialItems={bomItems}
 productPriceCents={formValues.price_cents || 0}
 onApplyCostToProduct={(calculatedCostCents) => {
 setValue("cost_cents", calculatedCostCents);
 toast.success(`Custo calculado de ${(calculatedCostCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} aplicado ao produto!`);
 }}
 onItemsChange={setBomItems}
 />
 </TabsContent>
 )}

 {/* ── ABA 4: ADICIONAIS & MODIFICADORES ── */}
 <TabsContent value="opcoes" className="space-y-4 m-0">
 <ProductModifiersCard
 groups={optionGroups}
 selectedGroupIds={selectedOptionGroupIds}
 onSelectedGroupsChange={setSelectedOptionGroupIds}
 onGroupsListChange={setOptionGroups}
 />
 </TabsContent>
 </Tabs>
 </div>

 {/* COLUNA DIREITA: PREVIEW REAL DA VITRINE (7 COLUNAS STICKY) */}
 <div className="lg:col-span-7 lg:sticky lg:top-24">
 <div className="bg-card rounded-2xl overflow-hidden border border-border/80 shadow-md">
 {/* Header do Mockup com Seletor de Dispositivo */}
 <div className="bg-muted/40 px-4 py-2.5 border-b flex items-center justify-between gap-2">
 <div className="flex items-center gap-2 min-w-0">
 <Eye className="size-4 text-primary shrink-0" />
 <span className="text-xs font-bold text-foreground truncate">
 Prévia ({isTravelPackageMode ? "Pacote Turístico" : isGroceryMode ? "Mercado & Perecíveis" : "E-commerce Padrão"})
 </span>
 </div>

 <div className="flex items-center bg-muted/80 p-0.5 rounded-xl text-[11px] font-semibold shrink-0">
 <button
 type="button"
 onClick={() => setPreviewDevice("mobile")}
 className={cn(
 "px-2.5 py-1 rounded-lg transition-colors cursor-pointer",
 previewDevice === "mobile"
 ? "bg-card text-foreground font-bold shadow-xs"
 : "text-muted-foreground hover:text-foreground"
 )}
 >
 Mobile (390px)
 </button>
 <button
 type="button"
 onClick={() => setPreviewDevice("desktop")}
 className={cn(
 "px-2.5 py-1 rounded-lg transition-colors cursor-pointer",
 previewDevice === "desktop"
 ? "bg-card text-foreground font-bold shadow-xs"
 : "text-muted-foreground hover:text-foreground"
 )}
 >
 Desktop
 </button>
 </div>
 </div>

 {/* Renderização Condicional: Pacote de Viagem vs Mercado & Conveniência vs E-commerce Comum */}
 {isTravelPackageMode ? (
 <div className={cn(
 "overflow-y-auto no-scrollbar transition-all duration-300",
 previewDevice === "mobile"
 ? "max-w-[390px] mx-auto my-3 border border-border/80 rounded-3xl p-1 bg-background shadow-lg max-h-[750px]"
 : "max-h-[85vh] p-3"
 )}>
 <TravelPackageDetailView
 packageData={travelData}
 productTitle={formValues.title || travelData.destination?.name || "Pacote de Viagem"}
 priceCents={formValues.price_cents || 425000}
 compareAtCents={formValues.compare_at_cents}
 coverImageUrl={images[0]}
 mediaUrls={images}
 storeName={store?.name}
 storePhone={store?.phone || store?.settings?.whatsapp}
 isInteractivePreview={true}
 />
 </div>
 ) : (
 /* Corpo do Mockup Fiel ao E-commerce */
 <div className="p-6 space-y-6">
 {/* Galeria de Fotos */}
 <div className="space-y-3">
 <div className="aspect-[4/3] rounded-2xl bg-muted/40 overflow-hidden relative border flex items-center justify-center">
 {images.length > 0 && images[activePreviewImage] ? (
 <img
 src={images[activePreviewImage]}
 alt={formValues.title}
 className="size-full object-contain p-2"
 />
 ) : (
 <div className="flex flex-col items-center gap-2 text-muted-foreground/60">
 <Package className="size-12 stroke-[1.2]" />
 <span className="text-xs">Sem foto de capa</span>
 </div>
 )}
 {formValues.status !== "published" && (
 <Badge variant="secondary" className="absolute top-3 left-3 text-[10px] font-bold">
 Rascunho (Oculto)
 </Badge>
 )}
 </div>

 {images.length > 1 && (
 <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 ">
 {images.map((img, idx) => (
 <button
 key={idx}
 type="button"
 onClick={() => setActivePreviewImage(idx)}
 className={`size-14 rounded-xl border-2 overflow-hidden shrink-0 transition-all ${
 activePreviewImage === idx
 ? "border-primary ring-2 ring-primary/20 scale-105"
 : "border-border/60 opacity-70 hover:opacity-100"
 }`}
 >
 <img src={img} alt="" className="size-full object-cover" />
 </button>
 ))}
 </div>
 )}
 </div>

 {/* Informações Comerciais */}
 <div className="space-y-4">
 <div className="space-y-1">
 <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
 {formValues.brand || store?.name || "Loja Parceira"}
 </span>
 <h2 className="text-xl font-black text-foreground leading-tight">
 {formValues.title || "Nome do Produto em Destaque"}
 </h2>
 {formValues.short_description && (
 <p className="text-xs text-muted-foreground">
 {formValues.short_description}
 </p>
 )}
 </div>

 {/* Bloco de Preços */}
 <div className="p-4 rounded-2xl bg-muted/30 border border-border/40 space-y-1">
 {formValues.compare_at_cents > formValues.price_cents && (
 <span className="text-xs text-muted-foreground line-through block font-mono">
 {formatMoney(formValues.compare_at_cents)}
 </span>
 )}
 <div className="text-2xl font-black text-foreground font-mono">
 {formatMoney(formValues.price_cents || 0)}
 <span className="text-xs text-muted-foreground font-normal ml-1">
 /{formValues.selling_unit}
 </span>
 </div>
 <p className="text-[11px] text-muted-foreground">
 Em até 12x de {formatMoney(Math.round((formValues.price_cents || 0) / 12))} sem juros
 </p>
 </div>

 {/* Selo de Estoque */}
 <div className="flex items-center gap-2 text-xs">
 {formValues.stock > 0 ? (
 <>
 <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
 <span className="text-muted-foreground font-medium">
 Disponível em estoque ({formValues.stock} unidades)
 </span>
 </>
 ) : (
 <>
 <span className="size-2 rounded-full bg-destructive" />
 <span className="text-destructive font-medium">Esgotado no momento</span>
 </>
 )}
 </div>

 {/* Botões de Ação da Vitrine */}
 <div className="space-y-2 pt-2">
 <Button className="w-full h-11 rounded-xl font-bold bg-primary text-primary-foreground gap-2">
 <ShoppingBag className="size-4" />
 <span>Adicionar ao Carrinho</span>
 </Button>
 <Button variant="outline" className="w-full h-11 rounded-xl font-bold">
 Comprar Agora
 </Button>
 </div>

 {/* Benefícios & Frete */}
 <div className="pt-3 border-t space-y-2 text-xs text-muted-foreground">
 <div className="flex items-center gap-2">
 <Truck className="size-4 text-primary" />
 <span>Entrega rápida em toda a região</span>
 </div>
 <div className="flex items-center gap-2">
 <ShieldCheck className="size-4 text-primary" />
 <span>Garantia de autenticidade e compra protegida</span>
 </div>
 </div>

 {/* Bloco de Análise Financeira (Margem / Lucro) */}
 <div className="p-4 rounded-2xl bg-muted/20 border border-border/50 flex items-center justify-between">
 <div>
 <span className="text-[10px] font-bold text-muted-foreground uppercase">
 Lucro Bruto Estimado
 </span>
 <div className="text-sm font-black font-mono text-emerald-600">
 {formatMoney(grossProfitCents)}
 </div>
 </div>
 <div className="text-right">
 <span className="text-[10px] font-bold text-muted-foreground uppercase">
 Margem de Contribuição
 </span>
 <div className="text-sm font-black font-mono text-foreground">
 {marginPercent}%
 </div>
 </div>
 </div>
 </div>

 {/* Adicionais & Modificadores Ativos no Preview */}
 {selectedOptionGroupIds.length > 0 && (
 <div className="pt-4 border-t space-y-3">
 <div className="flex items-center justify-between">
 <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
 <SlidersHorizontal className="size-3.5 text-primary" />
 <span>Opções & Personalização</span>
 </h3>
 <Badge variant="outline" className="text-[10px]">
 {selectedOptionGroupIds.length} grupo(s)
 </Badge>
 </div>
 <div className="space-y-2">
 {optionGroups
 .filter((g) => selectedOptionGroupIds.includes(g.id))
 .map((grp) => (
 <div
 key={grp.id}
 className="p-3 rounded-xl bg-muted/20 border border-border/60 space-y-1.5"
 >
 <div className="flex items-center justify-between text-xs">
 <span className="font-bold text-foreground">
 {grp.display_name || grp.internal_name}
 </span>
 <Badge
 variant={grp.is_required ? "default" : "secondary"}
 className={cn(
 "text-[9px] h-4 font-semibold",
 grp.is_required ? "bg-amber-600 text-white" : "",
 )}
 >
 {grp.is_required ? "Obrigatório" : "Opcional"}
 </Badge>
 </div>
 <div className="flex flex-wrap gap-1.5 pt-0.5">
 {(grp.values || []).map((val: any) => (
 <span
 key={val.id || val.label}
 className="inline-flex items-center gap-1 text-[10px] bg-card border border-border/80 px-2 py-0.5 rounded-md text-foreground font-medium"
 >
 <span>{val.label}</span>
 {val.price_modifier_cents > 0 && (
 <span className="text-primary font-bold">
 +{formatMoney(val.price_modifier_cents)}
 </span>
 )}
 </span>
 ))}
 </div>
 </div>
 ))}
 </div>
 </div>
 )}

 {/* Descrição na Prévia */}
 {formValues.description && (
 <div className="pt-4 border-t space-y-2">
 <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
 Sobre o Produto
 </h3>
 <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
 {formValues.description}
 </p>
 </div>
 )}
 </div>
 )}
 </div>
 </div>
 </div>

 {/* ── SHEET LATERAL: NOVA DIMENSÃO / PROPRIEDADE DE VARIAÇÃO (ELIMINANDO DIALOG POPUP) ── */}
 <Sheet open={isAddDimensionOpen} onOpenChange={setIsAddDimensionOpen}>
 <SheetContent
 side="right" size="wide" className="w-full max-sm:!max-w-full max-sm:!w-screen sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw] max-sm:!h-[100dvh] max-sm:!inset-0 max-sm:!rounded-none border-l p-0 overflow-y-auto no-scrollbar bg-card flex flex-col justify-between"
 >
 <div className="p-6 space-y-4">
 <SheetHeader className="pb-2 text-left">
 <SheetTitle className="text-base font-bold flex items-center gap-2">
 <Box className="size-4 text-primary" />
 <span>{nicheCtx.addDimensionDialogTitle}</span>
 </SheetTitle>
 <SheetDescription className="text-xs text-muted-foreground">
 {nicheCtx.addDimensionDialogDesc}
 </SheetDescription>
 </SheetHeader>

 {/* Chips de Sugestão Rápida para o Nicho */}
 {nicheCtx.suggestedDimensionChips && nicheCtx.suggestedDimensionChips.length > 0 && (
 <div className="flex flex-wrap items-center gap-1.5 pt-1">
 <span className="text-[10px] uppercase font-bold text-muted-foreground mr-1">
 Sugestões:
 </span>
 {nicheCtx.suggestedDimensionChips.map((chip) => (
 <button
 key={chip.name}
 type="button"
 onClick={() => {
 setNewDimensionName(chip.name);
 if (!newDimensionValue) setNewDimensionValue(chip.firstValue);
 }}
 className="text-[11px] px-2.5 py-1 rounded-lg border border-border/70 bg-muted/40 hover:bg-primary/10 hover:border-primary/50 text-foreground transition-all cursor-pointer font-medium"
 >
 + {chip.name}
 </button>
 ))}
 </div>
 )}

 <div className="space-y-4 py-2">
 <div className="space-y-1.5">
 <Label className="text-xs font-bold text-foreground">
 {nicheCtx.dimensionNameLabel} *
 </Label>
 <Input
 value={newDimensionName}
 onChange={(e) => setNewDimensionName(e.target.value)}
 placeholder={nicheCtx.dimensionNamePlaceholder}
 className="h-10 rounded-xl text-xs bg-background"
 autoFocus
 />
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-bold text-foreground">
 {nicheCtx.dimensionValueLabel} *
 </Label>
 <Input
 value={newDimensionValue}
 onChange={(e) => setNewDimensionValue(e.target.value)}
 placeholder={nicheCtx.dimensionValuePlaceholder}
 className="h-10 rounded-xl text-xs bg-background"
 onKeyDown={(e) => {
 if (e.key === "Enter") handleAddDimensionSubmit();
 }}
 />
 <p className="text-[11px] text-muted-foreground">
 Você poderá adicionar mais opções na tabela de grade a seguir.
 </p>
 </div>
 </div>
 </div>

 <div className="p-6 border-t border-border/60 bg-muted/20 flex items-center justify-end gap-2">
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={() => setIsAddDimensionOpen(false)}
 className="rounded-xl text-xs font-semibold cursor-pointer h-10 px-4"
 >
 Cancelar
 </Button>
 <Button
 type="button"
 size="sm"
 onClick={handleAddDimensionSubmit}
 disabled={!newDimensionName.trim() || !newDimensionValue.trim()}
 className="rounded-xl text-xs font-bold bg-primary text-primary-foreground gap-1.5 cursor-pointer h-10 px-5"
 >
 <Plus className="size-3.5" />
 <span>Adicionar à Grade</span>
 </Button>
 </div>
 </SheetContent>
 </Sheet>
 </div>
 );
}
