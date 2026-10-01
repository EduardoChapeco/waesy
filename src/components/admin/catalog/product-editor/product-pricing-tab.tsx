import * as React from "react";
import { Controller } from "react-hook-form";
import { DollarSign, Box, Plus } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CurrencyField } from "@/components/ui/currency-field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { VariantMatrixGrid, type RawVariant } from "@/components/admin/catalog/variant-matrix-grid";
import { ProductModifiersCard } from "@/components/admin/catalog/product-modifiers-card";

export interface ProductPricingTabProps {
  control: any;
  register: any;
  setValue: any;
  formValues: any;
  nicheCtx: any;
  variantsMatrix: RawVariant[];
  onVariantsMatrixChange: (matrix: RawVariant[]) => void;
  onOpenAddDimension: () => void;
  optionGroups: any[];
  selectedOptionGroupIds: string[];
  onSelectedGroupIdsChange: (ids: string[]) => void;
  onOptionGroupsChange: (groups: any[]) => void;
}

export function ProductPricingTab({
  control,
  register,
  setValue,
  formValues,
  nicheCtx,
  variantsMatrix,
  onVariantsMatrixChange,
  onOpenAddDimension,
  optionGroups,
  selectedOptionGroupIds,
  onSelectedGroupIdsChange,
  onOptionGroupsChange,
}: ProductPricingTabProps) {
  return (
    <div className="space-y-4">
      {/* Precificação e Margens */}
      <div className="bg-card rounded-lg p-6 space-y-4 border border-border">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
          <DollarSign className="size-4 text-primary" />
          <span>Precificação e Margens</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-foreground">Preço de Venda (R$) *</Label>
            <Controller
              control={control}
              name="price_cents"
              render={({ field }) => (
                <CurrencyField
                  value={field.value}
                  onChange={field.onChange}
                  className="h-11 rounded-lg text-xs bg-background font-mono font-bold"
                />
              )}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">Preço De (Comparativo)</Label>
            <Controller
              control={control}
              name="compare_at_cents"
              render={({ field }) => (
                <CurrencyField
                  value={field.value}
                  onChange={field.onChange}
                  className="h-11 rounded-lg text-xs bg-background font-mono"
                />
              )}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">Preço de Custo (R$)</Label>
            <Controller
              control={control}
              name="cost_cents"
              render={({ field }) => (
                <CurrencyField
                  value={field.value}
                  onChange={field.onChange}
                  className="h-11 rounded-lg text-xs bg-background font-mono"
                />
              )}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-foreground">Status do Produto</Label>
            <Select
              value={formValues.status}
              onValueChange={(val: any) => setValue("status", val)}
            >
              <SelectTrigger className="h-11 rounded-lg text-xs bg-background">
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-foreground">Estoque Inicial</Label>
            <Input
              type="number"
              {...register("stock", { valueAsNumber: true })}
              placeholder="10"
              className="h-11 rounded-lg text-xs bg-background font-mono"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-foreground">{nicheCtx.skuLabel}</Label>
            <Input
              {...register("sku")}
              placeholder={nicheCtx.skuPlaceholder}
              className="h-11 rounded-lg text-xs bg-background font-mono"
            />
          </div>
        </div>

        {/* Toggle de Visibilidade de Estoque */}
        <Controller
          control={control}
          name="show_stock_publicly"
          render={({ field }) => (
            <div className="flex items-center justify-between gap-4 p-4 rounded-lg bg-muted/20 border border-border/50">
              <div className="space-y-1">
                <p className="text-xs font-medium text-foreground">Exibir disponibilidade na vitrine</p>
                <p className="text-xs text-muted-foreground leading-tight">
                  Quando ativo, clientes veem o indicador de estoque ou esgotado.
                </p>
              </div>
              <Switch
                id="pricing_show_stock_publicly"
                checked={field.value ?? false}
                onCheckedChange={field.onChange}
              />
            </div>
          )}
        />
      </div>

      {/* Card de Variações */}
      <div className="bg-card rounded-lg p-6 space-y-4 border border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
            <Box className="size-4 text-primary" />
            <span>{nicheCtx.variationsSectionTitle}</span>
          </div>
          <Button /* focus-visible: */
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenAddDimension} /* focus-visible:ring-2 */
            className="h-11 rounded-lg text-xs font-bold gap-2 px-4 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <Plus className="size-4" />
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
              onChange={onVariantsMatrixChange}
              basePriceCents={formValues.price_cents || 0}
            />
          </div>
        ) : (
          <div className="p-6 text-center rounded-lg border border-dashed border-border space-y-2">
            <p className="text-xs text-muted-foreground">
              Este {nicheCtx.entityName.toLowerCase()} atualmente é simples (sem variações de tamanho, porção ou atributos).
            </p>
            <Button /* focus-visible: */
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenAddDimension} /* focus-visible:ring-2 */
              className="rounded-lg text-xs font-bold h-11 px-4 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <Plus className="size-4 mr-1" /> {nicheCtx.addVariationBtnText}
            </Button>
          </div>
        )}
      </div>

      {/* Card de Adicionais & Modificadores */}
      <ProductModifiersCard
        groups={optionGroups}
        selectedGroupIds={selectedOptionGroupIds}
        onSelectedGroupsChange={onSelectedGroupIdsChange}
        onGroupsListChange={onOptionGroupsChange}
      />
    </div>
  );
}
