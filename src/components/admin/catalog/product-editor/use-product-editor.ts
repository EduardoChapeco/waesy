import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { createProduct, createCategory } from "@/services/admin-catalog.functions";
import { importProductFromUrl } from "@/services/api-orchestrator.functions";
import type { MasterProductRecord } from "@/lib/data/master-products-catalog";
import type { RawVariant } from "@/components/admin/catalog/variant-matrix-grid";
import type { BomItem } from "@/components/admin/catalog/product-bom-card";
import type { FoodSpecsData } from "@/components/admin/catalog/product-food-specs-card";
import type { TravelPackageData } from "@/types/travel-package";
import type { FiscalData } from "./product-fiscal-tab";

export function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export function useProductEditor(initialCategories: any[], initialOptionGroups: any[], store: any, nicheCtx: any, semantics: any) {
  const navigate = useNavigate();

  const [categoriesList, setCategoriesList] = useState<any[]>(initialCategories || []);
  const [isQuickCategoryOpen, setIsQuickCategoryOpen] = useState(false);
  const [quickCategoryName, setQuickCategoryName] = useState("");
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);

  const [activeTab, setActiveTab] = useState("basico");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [activePreviewImage, setActivePreviewImage] = useState(0);

  const [optionGroups, setOptionGroups] = useState<any[]>(initialOptionGroups || []);
  const [selectedOptionGroupIds, setSelectedOptionGroupIds] = useState<string[]>([]);

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
    ripenessEnabled: false,
    ripenessStages: ["Verde", "Firme", "Maduro", "Consumo hoje"],
    progressiveDiscounts: [],
  });

  const isTourismStore =
    semantics?.nicheId === "tourism" ||
    Boolean(nicheCtx?.isTourismBusiness) ||
    store?.segment === "tourism_agency";

  const isGroceryStore =
    semantics?.nicheId === "supermarket" ||
    semantics?.nicheId === "convenience" ||
    semantics?.nicheId === "grocery";

  const [showcaseMode, setShowcaseMode] = useState<"standard" | "travel" | "grocery">(
    isTourismStore ? "travel" : isGroceryStore ? "grocery" : "standard"
  );
  const isTravelPackageMode = showcaseMode === "travel";
  const isGroceryMode = showcaseMode === "grocery";

  const [travelData, setTravelData] = useState<Partial<TravelPackageData>>({
    destination: { name: "", region: "", country: "Brasil", flight_summary: "" },
    resort: { name: "", meal_plan: "Café da Manhã", duration_text: "", guests_text: "", badges: [], bio_bullets: [] },
    inclusions: [],
    itinerary_days: [],
  });

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [importTone, setImportTone] = useState<"profissional" | "persuasivo" | "tecnico" | "minimalista">("profissional");
  const [isImporting, setIsImporting] = useState(false);
  const [variantsMatrix, setVariantsMatrix] = useState<RawVariant[]>([]);

  const [isMasterCatalogOpen, setIsMasterCatalogOpen] = useState(false);
  const [fiscalData, setFiscalData] = useState<FiscalData>({
    ncm_code: "",
    cest_code: "",
    ibs_rate: 15.5,
    cbs_rate: 8.8,
    cfop_default: "5.102",
    tax_regime: "padrao_bens_servicos",
  });

  const [isAddDimensionOpen, setIsAddDimensionOpen] = useState(false);
  const [newDimensionName, setNewDimensionName] = useState("");
  const [newDimensionValue, setNewDimensionValue] = useState("");

  const form = useForm({
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

  const formValues = form.watch();

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    form.setValue("title", val);
    form.setValue("slug", slugify(val));
  };

  const handleQuickCreateCategory = async () => {
    if ((!quickCategoryName.trim())) {
      toast.error("Informe o nome da categoria.");
      return;
    }
    setIsCreatingCategory(true);
    try {
      const slug = slugify(quickCategoryName.trim());
      const newCat = await createCategory({ data: { name: quickCategoryName.trim(), slug } });
      setCategoriesList((prev) => [...prev, newCat]);
      form.setValue("category_id", newCat.id);
      setIsQuickCategoryOpen(false);
      setQuickCategoryName("");
      toast.success(`${nicheCtx.categoryLabel} cadastrada com sucesso!`);
    } catch (err: any) {
      toast.error(err?.message || "Erro ao criar categoria.");
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const handleSelectMasterProduct = (p: MasterProductRecord) => {
    form.setValue("title", p.name);
    form.setValue("slug", slugify(p.name));
    form.setValue("brand", p.brand_name);
    form.setValue("short_description", p.description);
    form.setValue("description", p.description);
    form.setValue("price_cents", p.suggested_price_cents);
    form.setValue("sku", p.barcode_ean);
    form.setValue("selling_unit", p.unit_of_measure as any);
    if (p.image_urls?.[0]) setImages([p.image_urls[0]]);
    setFiscalData({
      ncm_code: p.ncm_code,
      cest_code: p.cest_code || "",
      ibs_rate: p.ibs_rate,
      cbs_rate: p.cbs_rate,
      cfop_default: p.cfop_default,
      tax_regime: p.tax_tribute_group,
    });
    toast.success(`"${p.name}" importado do Catálogo Central!`);
  };

  const handleAddDimensionSubmit = () => {
    if ((!newDimensionName.trim()) || (!newDimensionValue.trim())) {
      toast.error("Preencha o nome da dimensão e o valor.");
      return;
    }
    const dim = newDimensionName.trim();
    const val = newDimensionValue.trim();
    setVariantsMatrix((prev) => {
      if (prev.length === 0) {
        return [{ sku: `${formValues.slug || "prod"}-${val.toLowerCase().replace(/\s+/g, "-")}`, attributes: { [dim]: val }, stock: formValues.stock || 10, price_override_cents: null }];
      }
      return prev.map((v) => ({ ...v, attributes: { ...v.attributes, [dim]: v.attributes[dim] || val } }));
    });
    setIsAddDimensionOpen(false);
    setNewDimensionName("");
    setNewDimensionValue("");
    toast.success(`Dimensão "${dim}" adicionada!`);
  };

  const onSubmit = async (data: any) => {
    if ((!data.title.trim())) {
      toast.error("O nome do produto é obrigatório.");
      return;
    }
    if (data.price_cents <= 0) {
      toast.error("Informe um preço de venda maior que zero.");
      return;
    }
    setIsSubmitting(true);
    try {
      const generatedSlug = data.slug.trim() || slugify(data.title);
      const variantsPayload = variantsMatrix.length > 0
        ? variantsMatrix.map((v, idx) => ({
            sku: String(v.sku || `${generatedSlug}-var-${idx + 1}`),
            attributes: (v.attributes || {}) as Record<string, unknown>,
            stock: Number(v.stock ?? 10),
            price_override_cents: v.price_override_cents != null && Number(v.price_override_cents) > 0 ? Number(v.price_override_cents) : null,
            image_url: v.image_url || null,
          }))
        : [{ sku: String(data.sku || `${generatedSlug}-default`), attributes: {}, stock: Number(data.stock || 10), price_override_cents: null, image_url: images[0] || null }];

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
          preparation_time_days: data.preparation_time_days ? Number(data.preparation_time_days) : null,
          show_stock_publicly: data.show_stock_publicly ?? false,
          media_urls: images,
          category_ids: data.category_id ? [data.category_id] : [],
          option_group_ids: selectedOptionGroupIds.length > 0 ? selectedOptionGroupIds : undefined,
          variants: variantsPayload,
          attributes: {
            template_style: isGroceryMode ? "conveniencia" : isTravelPackageMode ? "editorial" : "standard",
            ...(isTravelPackageMode ? { travel: travelData } : {}),
            bill_of_materials: bomItems,
            food_specs: foodSpecs,
            fiscal: fiscalData,
          },
        },
      });
      toast.success(`${nicheCtx.entityName} cadastrado com sucesso!`);
      navigate({ to: "/workspace/catalogo/produtos" });
    } catch (err: any) {
      toast.error(err?.message || "Erro ao salvar produto.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSaveDraft = async () => {
    const data = form.getValues();
    if (Boolean(data.title?.trim()) === false) {
      toast.error("Informe ao menos o nome para salvar o rascunho.");
      return;
    }
    setIsSubmitting(true);
    try {
      const generatedSlug = data.slug?.trim() || slugify(data.title || "rascunho");
      const variantsPayload = variantsMatrix.length > 0
        ? variantsMatrix.map((v, idx) => ({
            sku: String(v.sku || `${generatedSlug}-var-${idx + 1}`),
            attributes: (v.attributes || {}) as Record<string, unknown>,
            stock: Number(v.stock ?? 10),
            price_override_cents: v.price_override_cents != null && Number(v.price_override_cents) > 0 ? Number(v.price_override_cents) : null,
            image_url: v.image_url || null,
          }))
        : [{ sku: String(data.sku || `${generatedSlug}-default`), attributes: {}, stock: Number(data.stock || 10), price_override_cents: null, image_url: images[0] || null }];

      await createProduct({
        data: {
          title: data.title.trim(),
          slug: generatedSlug,
          description: data.description || null,
          short_description: data.short_description || null,
          status: "draft",
          brand: data.brand || null,
          ean: foodSpecs.barcodeEan?.trim() || (data as any).ean || null,
          price_cents: Number(data.price_cents || 0),
          compare_at_cents: data.compare_at_cents && data.compare_at_cents > 0 ? data.compare_at_cents : null,
          cost_cents: data.cost_cents && data.cost_cents > 0 ? data.cost_cents : null,
          type_id: data.type_id || null,
          is_physical: isTravelPackageMode ? false : data.is_physical,
          weight_kg: isTravelPackageMode ? null : data.weight_kg ? Number(data.weight_kg) : null,
          width_cm: isTravelPackageMode ? null : data.width_cm ? Number(data.width_cm) : null,
          height_cm: isTravelPackageMode ? null : data.height_cm ? Number(data.height_cm) : null,
          length_cm: isTravelPackageMode ? null : data.length_cm ? Number(data.length_cm) : null,
          preparation_time_days: data.preparation_time_days ? Number(data.preparation_time_days) : null,
          show_stock_publicly: data.show_stock_publicly ?? false,
          media_urls: images,
          category_ids: data.category_id ? [data.category_id] : [],
          option_group_ids: selectedOptionGroupIds.length > 0 ? selectedOptionGroupIds : undefined,
          variants: variantsPayload,
          attributes: {
            template_style: isGroceryMode ? "conveniencia" : isTravelPackageMode ? "editorial" : "standard",
            ...(isTravelPackageMode ? { travel: travelData } : {}),
            bill_of_materials: bomItems,
            food_specs: foodSpecs,
            fiscal: fiscalData,
          },
        },
      });
      toast.success(`Rascunho de ${nicheCtx.entityName} salvo com sucesso!`);
      navigate({ to: "/workspace/catalogo/produtos" });
    } catch (err: any) {
      toast.error(err?.message || "Erro ao salvar rascunho.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImportProduct = async () => {
    if (Boolean(importUrl?.trim()) === false) return;
    setIsImporting(true);
    try {
      const imported = await importProductFromUrl({ data: { url: importUrl.trim(), tone: importTone } });
      if (imported) {
        if (imported.title) {
          form.setValue("title", imported.title);
          form.setValue("slug", slugify(imported.title));
        }
        if (imported.description) form.setValue("description", imported.description);
        if (imported.price_cents) form.setValue("price_cents", imported.price_cents);
        if (imported.brand) form.setValue("brand", imported.brand);
        const importedImages = (imported as any).media_urls || (imported as any).images;
        if (Array.isArray(importedImages) && importedImages.length > 0) setImages(importedImages);
        toast.success("Produto importado com IA!");
        setIsImportModalOpen(false);
      }
    } catch (err: any) {
      toast.error(err?.message || "Erro ao importar via IA.");
    } finally {
      setIsImporting(false);
    }
  };

  return {
    form,
    formValues,
    categoriesList,
    isQuickCategoryOpen,
    setIsQuickCategoryOpen,
    quickCategoryName,
    setQuickCategoryName,
    isCreatingCategory,
    handleQuickCreateCategory,
    activeTab,
    setActiveTab,
    isSubmitting,
    images,
    setImages,
    activePreviewImage,
    setActivePreviewImage,
    optionGroups,
    setOptionGroups,
    selectedOptionGroupIds,
    setSelectedOptionGroupIds,
    bomItems,
    setBomItems,
    foodSpecs,
    setFoodSpecs,
    showcaseMode,
    setShowcaseMode,
    isTravelPackageMode,
    isGroceryMode,
    isTourismStore,
    isGroceryStore,
    travelData,
    setTravelData,
    isImportModalOpen,
    setIsImportModalOpen,
    importUrl,
    setImportUrl,
    importTone,
    setImportTone,
    isImporting,
    handleImportProduct,
    variantsMatrix,
    setVariantsMatrix,
    isMasterCatalogOpen,
    setIsMasterCatalogOpen,
    fiscalData,
    setFiscalData,
    isAddDimensionOpen,
    setIsAddDimensionOpen,
    newDimensionName,
    setNewDimensionName,
    newDimensionValue,
    setNewDimensionValue,
    handleTitleChange,
    handleSelectMasterProduct,
    handleAddDimensionSubmit,
    onSaveDraft,
    onSubmit,
  };
}
