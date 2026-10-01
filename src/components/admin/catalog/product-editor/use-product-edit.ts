import { useState, useMemo } from "react";
import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import type { MasterProductRecord } from "@/lib/data/master-products-catalog";
import type { TravelPackageData } from "@/types/travel-package";
import type { BomItem } from "@/components/admin/catalog/product-bom-card";
import type { FoodSpecsData } from "@/components/admin/catalog/product-food-specs-card";
import { updateProduct } from "@/services/admin-catalog.functions";

export function useProductEdit(
  product: any,
  store: any,
  nicheCtx: any,
  semantics: any,
  optionGroupsList: any[]
) {
  const router = useRouter();

  const [liveTitle, setLiveTitle] = useState(product?.title || "");
  const [liveDescription, setLiveDescription] = useState(product?.description || "");
  const [liveBrand, setLiveBrand] = useState(product?.brand || "");
  const [livePriceCents, setLivePriceCents] = useState(product?.price_cents || 0);
  const [liveCompareCents, setLiveCompareCents] = useState(product?.compare_at_cents || null);
  const [, setLiveCostCents] = useState(product?.cost_cents || null);
  const [, setLiveStatus] = useState(product?.status || "draft");
  const [activePreviewImage, setActivePreviewImage] = useState(0);

  const [optionGroups, setOptionGroups] = useState<any[]>(optionGroupsList || []);
  const initialSelectedGroups = useMemo(() => {
    return (product?.product_option_groups || []).map((g: any) => g.option_group_id || g.option_groups?.id).filter(Boolean);
  }, [product?.product_option_groups]);
  const [selectedOptionGroupIds, setSelectedOptionGroupIds] = useState<string[]>(initialSelectedGroups);

  const initialBom = useMemo(() => ((product?.attributes as any)?.bill_of_materials as BomItem[]) || [], [product]);
  const [bomItems, setBomItems] = useState<BomItem[]>(initialBom);

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
      barcodeEan: specs.barcode_ean || specs.barcodeEan || product?.ean || "",
      isFreshPricingActive: Boolean(specs.is_fresh_pricing_active ?? specs.isFreshPricingActive),
      freshPricingMode: specs.fresh_pricing_mode || specs.freshPricingMode || "unit",
      avgPieceWeightGrams: specs.avg_piece_weight_grams || specs.avgPieceWeightGrams,
      pricePerKgCents: specs.price_per_kg_cents || specs.pricePerKgCents,
      ripenessEnabled: Boolean(specs.ripeness_enabled ?? specs.ripenessEnabled),
      ripenessStages: specs.ripeness_stages || specs.ripenessStages || ["Verde / Para amadurecer", "De vez / Firme", "Maduro / No ponto", "Bem maduro / Consumo hoje"],
      progressiveDiscounts: specs.progressive_discounts || specs.progressiveDiscounts || [],
    };
  }, [product]);

  const [foodSpecs, setFoodSpecs] = useState<FoodSpecsData>(initialFoodSpecs);
  const [isMasterCatalogOpen, setIsMasterCatalogOpen] = useState(false);

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

  const isGroceryStore =
    semantics.nicheId === "supermarket" ||
    semantics.nicheId === "convenience" ||
    semantics.nicheId === "grocery" ||
    store?.segment === "supermarket" ||
    store?.segment === "grocery" ||
    store?.segment === "convenience";

  const isGroceryMode = (!isTravelPackageMode) && isGroceryStore;

  const initialTravelData: Partial<TravelPackageData> = useMemo(() => {
    const saved = (product?.attributes as any)?.travel;
    if (saved) return saved;
    return {
      destination: { name: "", region: "", country: "Brasil", flight_summary: "" },
      resort: { name: "", meal_plan: "Café da Manhã", duration_text: "", guests_text: "", badges: [], bio_bullets: [] },
      inclusions: [],
      itinerary_days: [],
    };
  }, [product]);

  const [travelData, setTravelData] = useState<Partial<TravelPackageData>>(initialTravelData);

  const mediaUrls = useMemo(() => {
    return (product?.product_media || []).map((m: any) => m.url).filter(Boolean);
  }, [product?.product_media]);

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
            tax_regime: p.tax_tribute_group,
            master_catalog_id: p.barcode_ean,
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
          ean: newSpecs.barcodeEan?.trim() || product.ean,
          attributes: {
            ...(product.attributes || {}),
            dietary_restrictions: newSpecs.dietaryRestrictions,
            beverage_tags: newSpecs.beverageTags,
            serves_count: newSpecs.servesCount,
            portion_weight: newSpecs.portionWeight,
            portion_unit: newSpecs.portionUnit,
            preparation_time_minutes: newSpecs.preparationTimeMinutes,
            pos_code: newSpecs.posCode,
            barcode_ean: newSpecs.barcodeEan,
            is_fresh_pricing_active: newSpecs.isFreshPricingActive,
            fresh_pricing_mode: newSpecs.freshPricingMode,
            avg_piece_weight_grams: newSpecs.avgPieceWeightGrams,
            price_per_kg_cents: newSpecs.pricePerKgCents,
            ripeness_enabled: newSpecs.ripenessEnabled,
            ripeness_stages: newSpecs.ripenessStages,
            progressive_discounts: newSpecs.progressiveDiscounts,
          },
        },
      });
      toast.success("Especificações atualizadas com sucesso!");
    } catch {
      toast.error("Erro ao salvar especificações.");
    }
  };

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

  return {
    liveTitle,
    setLiveTitle,
    liveDescription,
    setLiveDescription,
    liveBrand,
    setLiveBrand,
    livePriceCents,
    setLivePriceCents,
    liveCompareCents,
    setLiveCompareCents,
    setLiveCostCents,
    setLiveStatus,
    activePreviewImage,
    setActivePreviewImage,
    optionGroups,
    setOptionGroups,
    selectedOptionGroupIds,
    handleSelectedGroupsChange,
    bomItems,
    handleBomItemsChange,
    handleApplyCostToProduct,
    foodSpecs,
    handleFoodSpecsChange,
    isMasterCatalogOpen,
    setIsMasterCatalogOpen,
    handleSelectMasterProduct,
    isTourismStore,
    isTravelPackageMode,
    setIsTravelPackageMode,
    isGroceryMode,
    travelData,
    handleTravelDataChange,
    mediaUrls,
  };
}
