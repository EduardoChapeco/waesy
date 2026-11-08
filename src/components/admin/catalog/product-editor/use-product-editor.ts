import { useState, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { extractErrorMessage } from "@/lib/utils";
import { getClientActiveTenant } from "@/lib/context-auth";
import { createProduct, createCategory, createStoreBrand } from "@/services/admin-catalog.functions";
import { importProductFromUrl } from "@/services/api-orchestrator.functions";
import type { MasterProductRecord } from "@/lib/data/master-products-catalog";
import type { RawVariant } from "@/components/admin/catalog/variant-matrix-grid";
import { calculateMatrixPricingAndStock } from "@/lib/catalog-channel-integrations";
import type { BomItem } from "@/components/admin/catalog/product-bom-card";
import type { FoodSpecsData } from "@/components/admin/catalog/product-food-specs-card";
import type { TravelPackageData } from "@/types/travel-package";
import type { FiscalData } from "./product-fiscal-tab";
import type { NicheAttributesData } from "./product-specs-tab";
import type { ProductLogisticsMetadata } from "./product-packaging-selector";

export function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export function useProductEditor(
  initialCategories: any[],
  initialOptionGroups: any[],
  store: any,
  nicheCtx: any,
  semantics: any,
  initialBrands: string[] = []
) {
  const navigate = useNavigate();

  const getEffectiveStoreId = (): string | undefined => {
    if (store?.id) return store.id;
    if (store?.store_id) return store.store_id;
    if (typeof window !== "undefined") {
      const qStore = new URLSearchParams(window.location.search).get("storeId");
      if (qStore && qStore.trim()) return qStore.trim();
      const cTenant = getClientActiveTenant();
      if (cTenant && cTenant.trim()) return cTenant.trim();
      const storedId = window.localStorage.getItem("waesy_active_store_id") || window.localStorage.getItem("active_store_id");
      if (storedId && storedId.trim()) return storedId.trim();
    }
    return undefined;
  };

  const [categoriesList, setCategoriesList] = useState<any[]>(initialCategories || []);
  const [isQuickCategoryOpen, setIsQuickCategoryOpen] = useState(false);
  const [quickCategoryName, setQuickCategoryName] = useState("");
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);

  const [brandsList, setBrandsList] = useState<string[]>(initialBrands || []);
  const [isQuickBrandOpen, setIsQuickBrandOpen] = useState(false);
  const [quickBrandName, setQuickBrandName] = useState("");
  const [isCreatingBrand, setIsCreatingBrand] = useState(false);
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

  const isGastronomyStore =
    semantics?.nicheId === "gastronomy" ||
    Boolean(nicheCtx?.isFoodBusiness) ||
    store?.segment === "gastronomy" ||
    store?.segment === "restaurant" ||
    store?.segment === "food";

  const [showcaseMode, setShowcaseModeState] = useState<"standard" | "travel" | "grocery" | "restaurant">(
    isTourismStore ? "travel" : isGroceryStore ? "grocery" : isGastronomyStore ? "restaurant" : "standard"
  );
  const isTravelPackageMode = showcaseMode === "travel";
  const isGroceryMode = showcaseMode === "grocery";
  const isRestaurantMode = showcaseMode === "restaurant";

  // Conceito do item em gastronomia: preparado na cozinha vs pronto/industrializado
  const [foodItemConcept, setFoodItemConcept] = useState<"prepared" | "ready">("prepared");

  const [activeTab, setActiveTab] = useState(isTourismStore ? "roteiro" : "basico");

  const setShowcaseMode = (mode: "standard" | "travel" | "grocery" | "restaurant") => {
    setShowcaseModeState(mode);
    if (mode === "travel") {
      setActiveTab("roteiro");
    } else {
      setActiveTab("basico");
    }
  };

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

  const [nicheAttributes, setNicheAttributes] = useState<NicheAttributesData>({});
  const [logisticsData, setLogisticsData] = useState<ProductLogisticsMetadata>({
    packaging_type: isGroceryStore || nicheCtx?.isFoodBusiness ? "thermal_bag" : "box",
    packaging_preset_id: isGroceryStore || nicheCtx?.isFoodBusiness ? "bag_kraft" : "box_m",
    fragile: false,
    stackable: true,
    thermal_control: "ambient",
    aisle_location: "",
    picking_notes: "",
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
      payment_mode: "inherit" as "inherit" | "custom",
      allow_coupons: true,
      allow_pix: true,
      allow_credit_card: true,
      allow_cash_on_delivery: true,
      max_installments: 12,
      allow_delivery: true,
      allow_takeaway: true,
      allow_dine_in: false,
      visibility_channel: "marketplace_and_store" as "marketplace_and_store" | "store_only" | "vip_only" | "direct_link",
      offer_valid_from: "",
      offer_valid_until: "",
      channel_ifood: false,
      channel_mercadolivre: false,
      channel_google_merchant: false,
      channel_meta_instagram: false,
      seo_title: "",
      seo_description: "",
      webmcp_ai_discoverable: true,
    },
  });

  const formValues = form.watch();

  // Cálculo reativo de menor preço, maior preço e estoque físico total da matriz 2D (DEC-433)
  const matrixStats = useMemo(() => {
    if (!variantsMatrix || variantsMatrix.length === 0) {
      return { minPrice: null, maxPrice: null, totalStock: null, hasRange: false };
    }
    const basePrice = Number(formValues.price_cents || 0);
    let minP = Infinity;
    let maxP = -Infinity;
    let totalStock = 0;

    for (const v of variantsMatrix) {
      const effectivePrice =
        v.price_override_cents != null && Number(v.price_override_cents) > 0
          ? Number(v.price_override_cents)
          : basePrice;
      if (effectivePrice > 0 && effectivePrice < minP) minP = effectivePrice;
      if (effectivePrice > maxP) maxP = effectivePrice;
      totalStock += Number(v.stock || 0);
    }

    const resolvedMin = minP === Infinity ? basePrice : minP;
    const resolvedMax = maxP === -Infinity ? basePrice : maxP;

    return {
      minPrice: resolvedMin,
      maxPrice: resolvedMax,
      totalStock,
      hasRange: resolvedMin !== resolvedMax && resolvedMin > 0 && resolvedMax > 0,
    };
  }, [variantsMatrix, formValues.price_cents]);

  // Sincroniza estoque pai automaticamente com a soma da matriz de variantes (Governança física estrita)
  useEffect(() => {
    if (variantsMatrix.length > 0 && matrixStats.totalStock !== null) {
      if (form.getValues("stock") !== matrixStats.totalStock) {
        form.setValue("stock", matrixStats.totalStock);
      }
    }
  }, [variantsMatrix.length, matrixStats.totalStock, form]);

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
      const newCat = await createCategory({
        data: {
          name: quickCategoryName.trim(),
          slug,
          store_id: getEffectiveStoreId(),
        },
      });
      setCategoriesList((prev) => [...prev, newCat]);
      form.setValue("category_id", newCat.id);
      setIsQuickCategoryOpen(false);
      setQuickCategoryName("");
      toast.success(`${nicheCtx.categoryLabel} cadastrada com sucesso!`);
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, "Erro ao criar categoria."));
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const handleQuickCreateBrand = async () => {
    if (!quickBrandName.trim()) {
      toast.error("Informe o nome da marca.");
      return;
    }
    setIsCreatingBrand(true);
    try {
      const clean = quickBrandName.trim();
      const res = await createStoreBrand({
        data: {
          name: clean,
          store_id: getEffectiveStoreId(),
        },
      });
      const createdName = res?.name || clean;
      setBrandsList((prev) =>
        prev.includes(createdName)
          ? prev
          : [...prev, createdName].sort((a, b) =>
              a.localeCompare(b, "pt-BR", { sensitivity: "base" }),
            ),
      );
      form.setValue("brand", createdName);
      setIsQuickBrandOpen(false);
      setQuickBrandName("");
      toast.success(`${nicheCtx.brandLabel || "Marca"} cadastrada com sucesso!`);
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, "Erro ao criar marca."));
    } finally {
      setIsCreatingBrand(false);
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
            wholesale_price_cents: v.wholesale_price_cents != null && Number(v.wholesale_price_cents) > 0 ? Number(v.wholesale_price_cents) : null,
            image_url: v.image_url || null,
          }))
        : [{ sku: String(data.sku || `${generatedSlug}-default`), attributes: {}, stock: Number(data.stock || 10), price_override_cents: null, image_url: images[0] || null }];

      const matrixPricing = calculateMatrixPricingAndStock(
        Number(data.price_cents || 0),
        Number(data.stock || 0),
        variantsMatrix
      );
      const effectiveMinPrice = matrixPricing.minPriceCents;

      const variantImages = variantsMatrix
        .map((v) => v.image_url?.trim())
        .filter((url): url is string => Boolean(url));
      const uniqueVariantImages = Array.from(new Set(variantImages));
      const effectiveMediaUrls = images.length > 0 ? images : uniqueVariantImages;

      const commercialRules = {
        payment_mode: data.payment_mode || "inherit",
        allow_pix: data.allow_pix ?? true,
        allow_credit_card: data.allow_credit_card ?? true,
        allow_cash_on_delivery: data.allow_cash_on_delivery ?? true,
        max_installments: Number(data.max_installments || 12),
        allow_delivery: data.allow_delivery ?? true,
        allow_takeaway: data.allow_takeaway ?? true,
        allow_dine_in: data.allow_dine_in ?? false,
        visibility_channel: data.visibility_channel || "marketplace_and_store",
        allow_coupons: data.allow_coupons ?? true,
        offer_valid_from: data.offer_valid_from || null,
        offer_valid_until: data.offer_valid_until || null,
        channels: {
          ifood: Boolean(data.channel_ifood),
          mercadolivre: Boolean(data.channel_mercadolivre),
          google_merchant: Boolean(data.channel_google_merchant),
          meta_instagram: Boolean(data.channel_meta_instagram),
        },
        webmcp_ai_discoverable: data.webmcp_ai_discoverable ?? true,
      };

      const effectiveEntryPriceCents =
        variantsMatrix.length > 0 && matrixStats.minPrice !== null && matrixStats.minPrice > 0
          ? Math.min(Number(data.price_cents || 0), matrixStats.minPrice) || matrixStats.minPrice
          : Number(data.price_cents || 0);

      await createProduct({
        data: {
          store_id: getEffectiveStoreId(),
          title: data.title.trim(),
          slug: generatedSlug,
          description: data.description || null,
          short_description: data.short_description || null,
          meta_title: data.seo_title || null,
          meta_description: data.seo_description || null,
          status: data.status || "published",
          brand: data.brand || null,
          ean: foodSpecs.barcodeEan?.trim() || data.ean || null,
          price_cents: effectiveEntryPriceCents,
          compare_at_cents: data.compare_at_cents > 0 ? data.compare_at_cents : null,
          cost_cents: data.cost_cents > 0 ? data.cost_cents : null,
          type_id: data.type_id || null,
          is_physical: isTravelPackageMode ? false : data.is_physical,
          weight_kg: isTravelPackageMode ? null : data.weight_kg ? Number(data.weight_kg) : null,
          width_cm: isTravelPackageMode ? null : data.width_cm ? Number(data.width_cm) : null,
          height_cm: isTravelPackageMode ? null : data.height_cm ? Number(data.height_cm) : null,
          length_cm: isTravelPackageMode ? null : data.length_cm ? Number(data.length_cm) : null,
          preparation_time_days: data.preparation_time_days ? Number(data.preparation_time_days) : null,
          preparation_time_minutes: foodSpecs.preparationTimeMinutes ? Number(foodSpecs.preparationTimeMinutes) : null,
          show_stock_publicly: data.show_stock_publicly ?? false,
          media_urls: effectiveMediaUrls,
          category_ids: data.category_id ? [data.category_id] : [],
          option_group_ids: selectedOptionGroupIds.length > 0 ? selectedOptionGroupIds : undefined,
          variants: variantsPayload,
          attributes: {
            template_style: isGroceryMode ? "conveniencia" : isTravelPackageMode ? "editorial" : "standard",
            ...(isTravelPackageMode ? { travel: travelData } : {}),
            bill_of_materials: bomItems,
            food_specs: foodSpecs,
            fiscal: fiscalData,
            commercial_rules: commercialRules,
            ...nicheAttributes,
            logistics: logisticsData,
            weight_kg: isTravelPackageMode ? null : data.weight_kg ? Number(data.weight_kg) : null,
            dimensions: isTravelPackageMode
              ? null
              : `${Number(data.length_cm) || 0} x ${Number(data.width_cm) || 0} x ${Number(data.height_cm) || 0} cm`,
          },
        },
      });
      toast.success(`${nicheCtx.entityName} cadastrado com sucesso!`);
      navigate({ to: "/workspace/catalogo/produtos" });
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, "Erro ao salvar produto."));
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
            wholesale_price_cents: v.wholesale_price_cents != null && Number(v.wholesale_price_cents) > 0 ? Number(v.wholesale_price_cents) : null,
            image_url: v.image_url || null,
          }))
        : [{ sku: String(data.sku || `${generatedSlug}-default`), attributes: {}, stock: Number(data.stock || 10), price_override_cents: null, image_url: images[0] || null }];

      const matrixPricing = calculateMatrixPricingAndStock(
        Number(data.price_cents || 0),
        Number(data.stock || 0),
        variantsMatrix
      );
      const effectiveMinPrice = matrixPricing.minPriceCents;

      const variantImages = variantsMatrix
        .map((v) => v.image_url?.trim())
        .filter((url): url is string => Boolean(url));
      const uniqueVariantImages = Array.from(new Set(variantImages));
      const effectiveMediaUrls = images.length > 0 ? images : uniqueVariantImages;

      const commercialRules = {
        payment_mode: data.payment_mode || "inherit",
        allow_pix: data.allow_pix ?? true,
        allow_credit_card: data.allow_credit_card ?? true,
        allow_cash_on_delivery: data.allow_cash_on_delivery ?? true,
        max_installments: Number(data.max_installments || 12),
        allow_delivery: data.allow_delivery ?? true,
        allow_takeaway: data.allow_takeaway ?? true,
        allow_dine_in: data.allow_dine_in ?? false,
        visibility_channel: data.visibility_channel || "marketplace_and_store",
        allow_coupons: data.allow_coupons ?? true,
        offer_valid_from: data.offer_valid_from || null,
        offer_valid_until: data.offer_valid_until || null,
        channels: {
          ifood: Boolean(data.channel_ifood),
          mercadolivre: Boolean(data.channel_mercadolivre),
          google_merchant: Boolean(data.channel_google_merchant),
          meta_instagram: Boolean(data.channel_meta_instagram),
        },
        webmcp_ai_discoverable: data.webmcp_ai_discoverable ?? true,
      };

      const effectiveDraftEntryPriceCents =
        variantsMatrix.length > 0 && matrixStats.minPrice !== null && matrixStats.minPrice > 0
          ? Math.min(Number(data.price_cents || 0), matrixStats.minPrice) || matrixStats.minPrice
          : Number(data.price_cents || 0);

      await createProduct({
        data: {
          store_id: getEffectiveStoreId(),
          title: data.title.trim(),
          slug: generatedSlug,
          description: data.description || null,
          short_description: data.short_description || null,
          meta_title: data.seo_title || null,
          meta_description: data.seo_description || null,
          status: "draft",
          brand: data.brand || null,
          ean: foodSpecs.barcodeEan?.trim() || (data as any).ean || null,
          price_cents: effectiveDraftEntryPriceCents,
          compare_at_cents: data.compare_at_cents && data.compare_at_cents > 0 ? data.compare_at_cents : null,
          cost_cents: data.cost_cents && data.cost_cents > 0 ? data.cost_cents : null,
          type_id: data.type_id || null,
          is_physical: isTravelPackageMode ? false : data.is_physical,
          weight_kg: isTravelPackageMode ? null : data.weight_kg ? Number(data.weight_kg) : null,
          width_cm: isTravelPackageMode ? null : data.width_cm ? Number(data.width_cm) : null,
          height_cm: isTravelPackageMode ? null : data.height_cm ? Number(data.height_cm) : null,
          length_cm: isTravelPackageMode ? null : data.length_cm ? Number(data.length_cm) : null,
          preparation_time_days: data.preparation_time_days ? Number(data.preparation_time_days) : null,
          preparation_time_minutes: foodSpecs.preparationTimeMinutes ? Number(foodSpecs.preparationTimeMinutes) : null,
          show_stock_publicly: data.show_stock_publicly ?? false,
          media_urls: effectiveMediaUrls,
          category_ids: data.category_id ? [data.category_id] : [],
          option_group_ids: selectedOptionGroupIds.length > 0 ? selectedOptionGroupIds : undefined,
          variants: variantsPayload,
          attributes: {
            template_style: isGroceryMode ? "conveniencia" : isTravelPackageMode ? "editorial" : "standard",
            ...(isTravelPackageMode ? { travel: travelData } : {}),
            bill_of_materials: bomItems,
            food_specs: foodSpecs,
            fiscal: fiscalData,
            commercial_rules: commercialRules,
            ...nicheAttributes,
            logistics: logisticsData,
            weight_kg: isTravelPackageMode ? null : data.weight_kg ? Number(data.weight_kg) : null,
            dimensions: isTravelPackageMode
              ? null
              : `${Number(data.length_cm) || 0} x ${Number(data.width_cm) || 0} x ${Number(data.height_cm) || 0} cm`,
          },
        },
      });
      toast.success(`Rascunho de ${nicheCtx.entityName} salvo com sucesso!`);
      navigate({ to: "/workspace/catalogo/produtos" });
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, "Erro ao salvar rascunho."));
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
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, "Erro ao importar via IA."));
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
    brandsList,
    setBrandsList,
    isQuickBrandOpen,
    setIsQuickBrandOpen,
    quickBrandName,
    setQuickBrandName,
    isCreatingBrand,
    handleQuickCreateBrand,
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
    isRestaurantMode,
    isTourismStore,
    isGroceryStore,
    isGastronomyStore,
    foodItemConcept,
    setFoodItemConcept,
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
    matrixStats,
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
    nicheAttributes,
    setNicheAttributes,
    logisticsData,
    setLogisticsData,
    handleTitleChange,
    handleSelectMasterProduct,
    handleAddDimensionSubmit,
    onSaveDraft,
    onSubmit,
    isWholesaleEnabled: Boolean(
      store?.wholesale_enabled ||
      store?.settings?.wholesale_enabled ||
      store?.settings?.wholesale_mode ||
      store?.settings?.b2b_enabled ||
      (Array.isArray(store?.settings?.enabled_modules) && store.settings.enabled_modules.includes("wholesale"))
    ),
  };
}
