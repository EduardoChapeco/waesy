import * as React from "react";
import { Tag } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TravelPackageForm } from "@/components/commerce/travel/travel-package-form";
import { SeoGeoOptimizationPanel } from "@/components/seo";
import type { TravelPackageData } from "@/types/travel-package";
import {
  ProductPackagingSelector,
  type ProductLogisticsMetadata,
} from "./product-packaging-selector";

export interface ProductBasicTabProps {
  isTravelPackageMode: boolean;
  travelData: Partial<TravelPackageData>;
  onTravelDataChange: React.Dispatch<React.SetStateAction<Partial<TravelPackageData>>>;
  priceCents: number;
  nicheCtx: any;
  formValues: any;
  register: any;
  setValue: any;
  onTitleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  categoriesList: any[];
  productTypes?: any[];
  logistics?: ProductLogisticsMetadata;
  onLogisticsChange?: (next: ProductLogisticsMetadata) => void;
  onOpenQuickCategory: () => void;
  brandsList?: string[];
  onOpenQuickBrand?: () => void;
}

export function ProductBasicTab({
  isTravelPackageMode,
  travelData,
  onTravelDataChange,
  priceCents,
  nicheCtx,
  formValues,
  register,
  setValue,
  onTitleChange,
  categoriesList,
  productTypes = [],
  logistics = {},
  onLogisticsChange,
  onOpenQuickCategory,
  brandsList = [],
  onOpenQuickBrand,
}: ProductBasicTabProps) {
  const showPhysicalPackaging =
    !isTravelPackageMode &&
    !nicheCtx?.isServiceBusiness &&
    !nicheCtx?.isRealEstateBusiness &&
    !nicheCtx?.isVehicleBusiness;
  return (
    <div className="space-y-4">
      {/* Formulário Especializado de Pacotes de Viagem */}
      {isTravelPackageMode && (
        <TravelPackageForm
          value={travelData}
          onChange={onTravelDataChange}
          priceCents={priceCents}
        />
      )}

      {/* Identificação do Produto (Apenas Varejo Não-Turismo) */}
      {!isTravelPackageMode && (
        <div className="bg-card rounded-lg p-6 space-y-4 border border-border">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
            <Tag className="size-4 text-primary" />
            <span>Identificação do {nicheCtx.entityName}</span>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-foreground">{nicheCtx.nameLabel}</Label>
            <Input
              value={formValues.title}
              onChange={onTitleChange}
              placeholder={nicheCtx.namePlaceholder}
              className="h-11 rounded-lg text-xs bg-background"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-foreground">{nicheCtx.categoryLabel}</Label>
                <button /* focus-visible: */
                  type="button"
                  onClick={onOpenQuickCategory} /* focus-visible:ring-2 */
                  className="text-xs text-primary hover:underline font-semibold cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none rounded-sm"
                >
                  + Criar Rápido
                </button>
              </div>
              <Select
                value={formValues.category_id}
                onValueChange={(val) => setValue("category_id", val)}
              >
                <SelectTrigger className="h-11 rounded-lg text-xs bg-background">
                  <SelectValue placeholder="Selecione a categoria..." />
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

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-foreground">{nicheCtx.brandLabel}</Label>
                {onOpenQuickBrand && (
                  <button
                    type="button"
                    onClick={onOpenQuickBrand}
                    className="text-xs text-primary hover:underline font-semibold cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none rounded-sm"
                  >
                    + Criar Rápido
                  </button>
                )}
              </div>
              <Select
                value={formValues.brand || ""}
                onValueChange={(val) => {
                  if (val === "__custom__") {
                    onOpenQuickBrand?.();
                  } else {
                    setValue("brand", val);
                  }
                }}
              >
                <SelectTrigger className="h-11 rounded-lg text-xs bg-background">
                  <SelectValue placeholder={nicheCtx.brandPlaceholder || "Selecione a marca..."} />
                </SelectTrigger>
                <SelectContent>
                  {brandsList && brandsList.length > 0 ? (
                    brandsList.map((brand: string) => (
                      <SelectItem key={brand} value={brand}>
                        {brand}
                      </SelectItem>
                    ))
                  ) : null}
                  {formValues.brand && (!brandsList || !brandsList.includes(formValues.brand)) && (
                    <SelectItem value={formValues.brand}>
                      {formValues.brand}
                    </SelectItem>
                  )}
                  {(!brandsList || brandsList.length === 0) && !formValues.brand && (
                    <div className="py-2 px-3 text-xs text-muted-foreground">
                      Nenhuma marca cadastrada
                    </div>
                  )}
                  {onOpenQuickBrand && (
                    <SelectItem value="__custom__" className="text-primary font-medium">
                      + Cadastrar nova marca...
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-foreground">Slug URL</Label>
              <Input
                {...register("slug")}
                placeholder="slug-do-item"
                className="h-11 rounded-lg text-xs bg-background font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-foreground">Unidade de Venda</Label>
              <Select
                value={formValues.selling_unit}
                onValueChange={(val) => setValue("selling_unit", val)}
              >
                <SelectTrigger className="h-11 rounded-lg text-xs bg-background font-mono">
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

            <div className="space-y-2">
              <Label className="text-xs font-medium text-foreground">Tipo de {nicheCtx.entityName}</Label>
              <Select
                value={formValues.type_id || "none"}
                onValueChange={(val) => setValue("type_id", val === "none" ? "" : val)}
              >
                <SelectTrigger className="h-11 rounded-lg text-xs bg-background">
                  <SelectValue placeholder="Padrão do Nicho" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Padrão do Segmento</SelectItem>
                  {productTypes.map((pt: any) => (
                    <SelectItem key={pt.id} value={pt.id}>
                      {pt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-foreground">{nicheCtx.shortDescLabel}</Label>
            <Input
              {...register("short_description")}
              placeholder={nicheCtx.shortDescPlaceholder}
              className="h-11 rounded-lg text-xs bg-background"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-foreground">{nicheCtx.descLabel}</Label>
            <Textarea
              {...register("description")}
              rows={4}
              placeholder={nicheCtx.descPlaceholder}
              className="rounded-lg text-xs bg-background"
            />
          </div>
        </div>
      )}

      {/* Embalagem Visual, Cubagem & Separação WMS (Para itens com logística física) */}
      {showPhysicalPackaging && (
        <ProductPackagingSelector
          weightKg={formValues.weight_kg}
          widthCm={formValues.width_cm}
          heightCm={formValues.height_cm}
          lengthCm={formValues.length_cm}
          preparationTimeDays={formValues.preparation_time_days}
          isPhysical={formValues.is_physical !== false}
          logistics={logistics}
          nicheCtx={nicheCtx}
          onChangeDimensions={(patch) => {
            if (patch.weight_kg !== undefined) setValue("weight_kg", patch.weight_kg);
            if (patch.width_cm !== undefined) setValue("width_cm", patch.width_cm);
            if (patch.height_cm !== undefined) setValue("height_cm", patch.height_cm);
            if (patch.length_cm !== undefined) setValue("length_cm", patch.length_cm);
            if (patch.preparation_time_days !== undefined) {
              setValue("preparation_time_days", patch.preparation_time_days);
            }
            if (patch.is_physical !== undefined) setValue("is_physical", patch.is_physical);
          }}
          onChangeLogistics={(next) => onLogisticsChange?.(next)}
        />
      )}

      {/* Otimização Universal de SEO, GEO e Agentes de IA */}
      <SeoGeoOptimizationPanel
        value={{
          seoTitle: formValues.seo_title || formValues.title || "",
          seoDescription: formValues.seo_description || formValues.description || "",
          keywords: Array.isArray(formValues.tags) ? formValues.tags : [],
          latitude: formValues.latitude,
          longitude: formValues.longitude,
          allowAiIndexing: formValues.allow_ai_indexing ?? true,
        }}
        onChange={(upd) => {
          if (upd.seoTitle !== undefined) setValue("seo_title", upd.seoTitle);
          if (upd.seoDescription !== undefined) setValue("seo_description", upd.seoDescription);
          if (upd.keywords !== undefined) setValue("tags", upd.keywords);
          if (upd.latitude !== undefined) setValue("latitude", upd.latitude);
          if (upd.longitude !== undefined) setValue("longitude", upd.longitude);
          if (upd.allowAiIndexing !== undefined) setValue("allow_ai_indexing", upd.allowAiIndexing);
        }}
        referenceTitle={formValues.title}
        referenceDescription={formValues.description}
      />
    </div>
  );
}
