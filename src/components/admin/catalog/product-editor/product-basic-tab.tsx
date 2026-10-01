import * as React from "react";
import { Tag, Truck } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TravelPackageForm } from "@/components/commerce/travel/travel-package-form";
import type { TravelPackageData } from "@/types/travel-package";

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
  onOpenQuickCategory: () => void;
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
  onOpenQuickCategory,
}: ProductBasicTabProps) {
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

      {/* Identificação do Produto */}
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
            <Label className="text-xs font-medium text-foreground">{nicheCtx.brandLabel}</Label>
            <Input
              {...register("brand")}
              placeholder={nicheCtx.brandPlaceholder}
              className="h-11 rounded-lg text-xs bg-background"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

      {/* Logística & Frete (Apenas para produtos físicos) */}
      {!isTravelPackageMode && (
        <div className="bg-card rounded-lg p-6 space-y-4 border border-border">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
            <Truck className="size-4 text-primary" />
            <span>Logística e Frete</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-foreground">Peso (kg)</Label>
              <Input
                {...register("weight_kg")}
                type="number"
                step="0.01"
                placeholder="0.5"
                className="h-11 rounded-lg text-xs bg-background font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-foreground">Prazo de Envio (dias)</Label>
              <Input
                {...register("preparation_time_days")}
                type="number"
                placeholder="1"
                className="h-11 rounded-lg text-xs bg-background font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-foreground">Largura (cm)</Label>
              <Input
                {...register("width_cm")}
                type="number"
                placeholder="15"
                className="h-11 rounded-lg text-xs bg-background font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-foreground">Altura (cm)</Label>
              <Input
                {...register("height_cm")}
                type="number"
                placeholder="10"
                className="h-11 rounded-lg text-xs bg-background font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-foreground">Comprimento (cm)</Label>
              <Input
                {...register("length_cm")}
                type="number"
                placeholder="20"
                className="h-11 rounded-lg text-xs bg-background font-mono"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
