import { BadgePercent, Plus, Store as StoreIcon, Trash2, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CurrencyField } from "@/components/ui/currency-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  CANONICAL_BAKERY_PREP_OPTIONS,
  CANONICAL_GROCERY_DEPARTMENTS,
  CANONICAL_MEAT_CUT_OPTIONS,
  CANONICAL_STORAGE_TEMPERATURES,
  CANONICAL_UNIT_TYPES,
  type ProgressiveDiscountTier,
} from "@/lib/classifieds/canonical-taxonomy";
import { cn } from "@/lib/utils";

export interface ClassifiedGrocerySectionProps {
  groceryDepartment: string;
  onGroceryDepartmentChange: (v: string) => void;
  grocerySubCategory: string;
  onGrocerySubCategoryChange: (v: string) => void;
  groceryUnitType: string;
  onGroceryUnitTypeChange: (v: string) => void;
  groceryEstimatedWeightPerUnit: string;
  onGroceryEstimatedWeightPerUnitChange: (v: string) => void;
  groceryPrepOptions: string[];
  onGroceryPrepOptionsChange: (v: string[]) => void;
  groceryBrand: string;
  onGroceryBrandChange: (v: string) => void;
  groceryBarcodeEan: string;
  onGroceryBarcodeEanChange: (v: string) => void;
  groceryTemperature: string;
  onGroceryTemperatureChange: (v: string) => void;
  groceryIsAlcoholic: boolean;
  onGroceryIsAlcoholicChange: (v: boolean) => void;
  groceryContainsGluten: boolean | null;
  onGroceryContainsGlutenChange: (v: boolean | null) => void;
  groceryContainsLactose: boolean | null;
  onGroceryContainsLactoseChange: (v: boolean | null) => void;
  groceryIsOrganic: boolean;
  onGroceryIsOrganicChange: (v: boolean) => void;
  groceryIngredients: string;
  onGroceryIngredientsChange: (v: string) => void;
  groceryDeliveryEstimate: string;
  onGroceryDeliveryEstimateChange: (v: string) => void;
  groceryDeliveryFeeCents: number;
  onGroceryDeliveryFeeCentsChange: (v: number) => void;
  grocerySupportsFreshPricing: boolean;
  onGrocerySupportsFreshPricingChange: (v: boolean) => void;
  groceryDefaultPricingMode: "unit" | "weight";
  onGroceryDefaultPricingModeChange: (v: "unit" | "weight") => void;
  groceryAvgPieceWeightGrams: number;
  onGroceryAvgPieceWeightGramsChange: (v: number) => void;
  groceryPricePerKgCents: number;
  onGroceryPricePerKgCentsChange: (v: number) => void;
  groceryRipenessEnabled: boolean;
  onGroceryRipenessEnabledChange: (v: boolean) => void;
  groceryProgressiveDiscountsEnabled: boolean;
  onGroceryProgressiveDiscountsEnabledChange: (v: boolean) => void;
  groceryDiscountTiers: ProgressiveDiscountTier[];
  onGroceryDiscountTiersChange: (tiers: ProgressiveDiscountTier[]) => void;
  groceryOrderBumpEnabled: boolean;
  onGroceryOrderBumpEnabledChange: (v: boolean) => void;
  groceryOrderBumpTitle: string;
  onGroceryOrderBumpTitleChange: (v: string) => void;
  groceryOrderBumpBadge: string;
  onGroceryOrderBumpBadgeChange: (v: string) => void;
  groceryOrderBumpSpecialPriceCents: number;
  onGroceryOrderBumpSpecialPriceCentsChange: (v: number) => void;
  groceryOrderBumpOriginalPriceCents: number;
  onGroceryOrderBumpOriginalPriceCentsChange: (v: number) => void;
}

export function ClassifiedGrocerySection({
  groceryDepartment,
  onGroceryDepartmentChange,
  grocerySubCategory,
  onGrocerySubCategoryChange,
  groceryUnitType,
  onGroceryUnitTypeChange,
  groceryEstimatedWeightPerUnit,
  onGroceryEstimatedWeightPerUnitChange,
  groceryPrepOptions,
  onGroceryPrepOptionsChange,
  groceryBrand,
  onGroceryBrandChange,
  groceryBarcodeEan,
  onGroceryBarcodeEanChange,
  groceryTemperature,
  onGroceryTemperatureChange,
  groceryIsAlcoholic,
  onGroceryIsAlcoholicChange,
  groceryContainsGluten,
  onGroceryContainsGlutenChange,
  groceryContainsLactose,
  onGroceryContainsLactoseChange,
  groceryIsOrganic,
  onGroceryIsOrganicChange,
  groceryIngredients,
  onGroceryIngredientsChange,
  groceryDeliveryEstimate,
  onGroceryDeliveryEstimateChange,
  groceryDeliveryFeeCents,
  onGroceryDeliveryFeeCentsChange,
  grocerySupportsFreshPricing,
  onGrocerySupportsFreshPricingChange,
  groceryDefaultPricingMode,
  onGroceryDefaultPricingModeChange,
  groceryAvgPieceWeightGrams,
  onGroceryAvgPieceWeightGramsChange,
  groceryPricePerKgCents,
  onGroceryPricePerKgCentsChange,
  groceryRipenessEnabled,
  onGroceryRipenessEnabledChange,
  groceryProgressiveDiscountsEnabled,
  onGroceryProgressiveDiscountsEnabledChange,
  groceryDiscountTiers,
  onGroceryDiscountTiersChange,
  groceryOrderBumpEnabled,
  onGroceryOrderBumpEnabledChange,
  groceryOrderBumpTitle,
  onGroceryOrderBumpTitleChange,
  groceryOrderBumpBadge,
  onGroceryOrderBumpBadgeChange,
  groceryOrderBumpSpecialPriceCents,
  onGroceryOrderBumpSpecialPriceCentsChange,
  groceryOrderBumpOriginalPriceCents,
  onGroceryOrderBumpOriginalPriceCentsChange,
}: ClassifiedGrocerySectionProps) {
  const currentDept = CANONICAL_GROCERY_DEPARTMENTS.find((d) => d.id === groceryDepartment);

  return (
    <div className="bg-card rounded-lg p-4 sm:p-5 space-y-5 border border-border/60">
      <div className="flex items-center justify-between pb-2 border-b border-border/40">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
          <StoreIcon className="size-4 text-primary" />
          <span>Parâmetros de Mercado</span>
        </div>
        <Badge
          variant="outline"
          className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
        >
          Varejo Alimentar
        </Badge>
      </div>

      {/* Departamento */}
      <div className="space-y-2">
        <Label className="text-xs text-foreground font-semibold flex items-center justify-between">
          <span>Departamento do Produto *</span>
          <span className="text-xs text-muted-foreground font-normal">Selecione para ajustar atributos</span>
        </Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {CANONICAL_GROCERY_DEPARTMENTS.map((dept) => {
            const isSelected = groceryDepartment === dept.id;
            return (
              <button
                key={dept.id}
                type="button"
                onClick={() => {
                  onGroceryDepartmentChange(dept.id);
                  if (dept.defaultTemperature) {
                    onGroceryTemperatureChange(dept.defaultTemperature);
                  }
                  if (dept.subCategories.length > 0) {
                    onGrocerySubCategoryChange(dept.subCategories[0]);
                  }
                }}
                className={cn(
                  "p-2 rounded-lg text-xs font-medium text-left border cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors flex flex-col gap-1 min-h-11",
                  isSelected
                    ? "bg-primary text-primary-foreground border-primary font-bold"
                    : "bg-background text-foreground/80 border-border/70 hover:bg-muted/30",
                )}
              >
                <span className="truncate">{dept.label}</span>
                <span className={cn("text-xs truncate", isSelected ? "text-primary-foreground/80" : "text-muted-foreground")}>
                  {dept.badge}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sub-categoria */}
      {currentDept && currentDept.subCategories.length > 0 && (
        <div className="space-y-2 p-3 rounded-lg bg-muted/20 border border-border/40">
          <Label className="text-xs font-semibold text-foreground">Sub-categoria em {currentDept.label}:</Label>
          <div className="flex flex-wrap gap-2 pt-1">
            {currentDept.subCategories.map((sub) => {
              const isSelected = grocerySubCategory === sub;
              return (
                <button
                  key={sub}
                  type="button"
                  onClick={() => onGrocerySubCategoryChange(sub)}
                  className={cn(
                    "px-3 py-1 min-h-11 rounded-lg text-xs font-medium border cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors",
                    isSelected
                      ? "bg-primary/15 border-primary text-primary font-bold"
                      : "bg-background border-border/60 text-foreground/80 hover:bg-muted/40",
                  )}
                >
                  {sub}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Unidade de Medida & Fracionamento */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        <div className="space-y-2">
          <Label className="text-xs text-foreground font-semibold">Unidade de Medida / Precificação *</Label>
          <div className="flex flex-wrap gap-1">
            {CANONICAL_UNIT_TYPES.map((u) => {
              const isSelected = groceryUnitType === u.id;
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => onGroceryUnitTypeChange(u.id)}
                  className={cn(
                    "px-2 py-1 min-h-11 rounded-lg text-xs font-medium border cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors",
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary font-bold"
                      : "bg-background text-foreground/80 border-border/60 hover:bg-muted/40",
                  )}
                >
                  {u.label}
                </button>
              );
            })}
          </div>
        </div>

        {(groceryUnitType === "kg" ||
          groceryUnitType === "g" ||
          groceryDepartment === "acougue_carnes" ||
          groceryDepartment === "hortifruti") && (
          <div className="space-y-2">
            <Label className="text-xs text-foreground font-semibold">Peso Médio Estimado por Peça (Opcional)</Label>
            <Input
              value={groceryEstimatedWeightPerUnit}
              onChange={(e) => onGroceryEstimatedWeightPerUnitChange(e.target.value)}
              placeholder="Ex: ~1.2kg por peça ou ~500g a bandeja"
              className="h-11 rounded-lg text-xs bg-background"
            />
          </div>
        )}
      </div>

      {/* Opções de Corte / Manipulação */}
      {(groceryDepartment === "acougue_carnes" ||
        groceryDepartment === "padaria_confeitaria" ||
        groceryDepartment === "frios_laticinios") && (
        <div className="space-y-2 p-4 rounded-lg border border-border/50 bg-muted/15">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold text-foreground">Opções de Corte / Preparo para o Cliente</Label>
            <span className="text-xs text-muted-foreground">{groceryPrepOptions.length} selecionada(s)</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {(groceryDepartment === "acougue_carnes" ? CANONICAL_MEAT_CUT_OPTIONS : CANONICAL_BAKERY_PREP_OPTIONS).map(
              (opt) => {
                const isSelected = groceryPrepOptions.includes(opt);
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        onGroceryPrepOptionsChange(groceryPrepOptions.filter((o) => o !== opt));
                      } else {
                        onGroceryPrepOptionsChange([...groceryPrepOptions, opt]);
                      }
                    }}
                    className={cn(
                      "px-3 py-2 min-h-11 rounded-lg text-xs font-medium border cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors",
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary font-bold"
                        : "bg-background text-muted-foreground border-border/60 hover:text-foreground hover:bg-muted/40",
                    )}
                  >
                    {opt}
                  </button>
                );
              },
            )}
          </div>
        </div>
      )}

      {/* Marca & EAN */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-xs text-foreground font-semibold">Marca / Fabricante</Label>
          <Input
            value={groceryBrand}
            onChange={(e) => onGroceryBrandChange(e.target.value)}
            placeholder="Ex: Ambev, Nestlé, Seara, Friboi, Wickbold..."
            className="h-11 rounded-lg text-xs bg-background"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-foreground font-semibold">Código de Barras (EAN / GTIN)</Label>
          <Input
            value={groceryBarcodeEan}
            onChange={(e) => onGroceryBarcodeEanChange(e.target.value)}
            placeholder="Ex: 7891991010832 (Opcional)"
            className="h-11 rounded-lg text-xs bg-background font-mono"
          />
        </div>
      </div>

      {/* Conservação / Temperatura */}
      <div className="space-y-2">
        <Label className="text-xs text-foreground font-semibold">Conservação / Temperatura</Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {CANONICAL_STORAGE_TEMPERATURES.map((temp) => {
            const isSelected = groceryTemperature === temp.id;
            return (
              <button
                key={temp.id}
                type="button"
                onClick={() => onGroceryTemperatureChange(temp.id)}
                className={cn(
                  "p-2 rounded-lg border text-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary text-xs flex items-center justify-center gap-2 min-h-11",
                  isSelected
                    ? "border-primary bg-primary/10 text-primary font-bold"
                    : "border-border/60 bg-background text-muted-foreground hover:text-foreground",
                )}
              >
                <span>{temp.icon}</span>
                <span className="truncate">{temp.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selos de Saúde, Alérgenos & Restrições */}
      <div className="p-4 rounded-lg border border-border/50 bg-muted/20 space-y-3">
        <Label className="text-xs font-semibold text-foreground block">Selos de Saúde, Alérgenos e Restrições</Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            type="button"
            onClick={() => onGroceryIsAlcoholicChange(!groceryIsAlcoholic)}
            className={cn(
              "flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary min-h-11 text-left",
              groceryIsAlcoholic
                ? "border-rose-500 bg-rose-500/10 text-rose-700 dark:text-rose-300 font-bold"
                : "border-border/60 bg-background text-muted-foreground",
            )}
          >
            <Checkbox checked={groceryIsAlcoholic} />
            <span>Alcoólico (+18)</span>
          </button>

          <button
            type="button"
            onClick={() => onGroceryContainsGlutenChange(groceryContainsGluten === false ? true : false)}
            className={cn(
              "flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary min-h-11 text-left",
              groceryContainsGluten === false
                ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold"
                : "border-border/60 bg-background text-muted-foreground",
            )}
          >
            <Checkbox checked={groceryContainsGluten === false} />
            <span>Sem Glúten</span>
          </button>

          <button
            type="button"
            onClick={() => onGroceryContainsLactoseChange(groceryContainsLactose === false ? true : false)}
            className={cn(
              "flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary min-h-11 text-left",
              groceryContainsLactose === false
                ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold"
                : "border-border/60 bg-background text-muted-foreground",
            )}
          >
            <Checkbox checked={groceryContainsLactose === false} />
            <span>Sem Lactose</span>
          </button>

          <button
            type="button"
            onClick={() => onGroceryIsOrganicChange(!groceryIsOrganic)}
            className={cn(
              "flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary min-h-11 text-left",
              groceryIsOrganic
                ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold"
                : "border-border/60 bg-background text-muted-foreground",
            )}
          >
            <Checkbox checked={groceryIsOrganic} />
            <span>Orgânico</span>
          </button>
        </div>
      </div>

      {/* Ingredientes */}
      <div className="space-y-2">
        <Label className="text-xs text-foreground font-semibold">Ingredientes / Informações do Rótulo (Opcional)</Label>
        <Textarea
          value={groceryIngredients}
          onChange={(e) => onGroceryIngredientsChange(e.target.value)}
          placeholder="Ex: Malte, lúpulo, água mineral e levedura. Alérgicos: contém derivados de cevada."
          className="text-xs bg-background min-h-16 rounded-lg"
        />
      </div>

      {/* Entrega Local */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        <div className="space-y-2">
          <Label className="text-xs text-foreground font-semibold">Tempo Estimado de Entrega</Label>
          <Input
            value={groceryDeliveryEstimate}
            onChange={(e) => onGroceryDeliveryEstimateChange(e.target.value)}
            placeholder="Ex: 30 a 45 min"
            className="h-11 rounded-lg text-xs bg-background"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-foreground font-semibold">Taxa Inicial de Entrega (R$)</Label>
          <CurrencyField
            value={groceryDeliveryFeeCents}
            onChange={(val) => onGroceryDeliveryFeeCentsChange(val ?? 0)}
            className="h-11 rounded-lg text-xs bg-background"
          />
        </div>
      </div>

      {/* Produtos Frescos */}
      <div className="p-4 rounded-lg border border-border/50 bg-muted/15 space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label className="text-xs font-bold text-foreground">
              Hortifrúti e Produtos Frescos (Peso Variável / Maturação)
            </Label>
            <p className="text-xs text-muted-foreground">
              Permite ao cliente alternar entre compra por unidade ou peso e escolher o nível de maturação.
            </p>
          </div>
          <Switch checked={grocerySupportsFreshPricing} onCheckedChange={onGrocerySupportsFreshPricingChange} />
        </div>

        {grocerySupportsFreshPricing && (
          <div className="space-y-3 pt-2 border-t border-border/40">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label className="text-xs text-foreground font-medium">Modo Padrão de Venda</Label>
                <Select
                  value={groceryDefaultPricingMode}
                  onValueChange={(v) => onGroceryDefaultPricingModeChange(v as "unit" | "weight")}
                >
                  <SelectTrigger className="h-11 rounded-lg text-xs bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unit">Por Unidade (Padrão)</SelectItem>
                    <SelectItem value="weight">Por Peso (Quilo / kg)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-foreground font-medium">Peso Médio da Peça (g)</Label>
                <Input
                  type="number"
                  value={groceryAvgPieceWeightGrams || ""}
                  onChange={(e) => onGroceryAvgPieceWeightGramsChange(Number(e.target.value) || 0)}
                  placeholder="Ex: 500"
                  className="h-11 rounded-lg text-xs bg-background font-mono"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-foreground font-medium">Preço por Quilo (R$/kg)</Label>
                <CurrencyField
                  value={groceryPricePerKgCents}
                  onChange={(val) => onGroceryPricePerKgCentsChange(val ?? 0)}
                  className="h-11 rounded-lg text-xs bg-background font-mono"
                />
              </div>
            </div>

            <div className="p-3 rounded-lg border border-border/40 bg-background/50 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-foreground">Habilitar Escolha de Ponto de Maturação</Label>
                <Switch checked={groceryRipenessEnabled} onCheckedChange={onGroceryRipenessEnabledChange} />
              </div>
              {groceryRipenessEnabled && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-center text-xs">
                  <div className="p-2 rounded-lg border border-border/50 bg-muted/20">
                    <p className="font-bold text-foreground">Menos maduro</p>
                    <p className="text-xs text-muted-foreground">Mais firme / consumo na semana</p>
                  </div>
                  <div className="p-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10">
                    <p className="font-bold text-emerald-700 dark:text-emerald-300">Maduro</p>
                    <p className="text-xs text-muted-foreground">Ponto ideal / consumo em 1-2 dias</p>
                  </div>
                  <div className="p-2 rounded-lg border border-border/50 bg-muted/20">
                    <p className="font-bold text-foreground">Mais maduro</p>
                    <p className="text-xs text-muted-foreground">Bem maduro / consumo imediato</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Desconto Progressivo */}
      <div className="p-4 rounded-lg border border-border/50 bg-muted/15 space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label className="text-xs font-bold text-foreground flex items-center gap-2">
              <BadgePercent className="size-4 text-emerald-600 dark:text-emerald-400" />
              <span>Desconto Progressivo (Compre Mais, Pague Menos)</span>
            </Label>
            <p className="text-xs text-muted-foreground">
              Incentive pedidos maiores com checklist de faixas de desconto que se ativam dinamicamente.
            </p>
          </div>
          <Switch
            checked={groceryProgressiveDiscountsEnabled}
            onCheckedChange={onGroceryProgressiveDiscountsEnabledChange}
          />
        </div>

        {groceryProgressiveDiscountsEnabled && (
          <div className="space-y-2 pt-2 border-t border-border/40">
            {groceryDiscountTiers.map((tier, idx) => (
              <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-background border border-border/50">
                <div className="w-24 space-y-1">
                  <span className="text-xs text-muted-foreground block">Mínimo (un)</span>
                  <Input
                    type="number"
                    min={2}
                    value={tier.min_quantity}
                    onChange={(e) => {
                      const val = Math.max(2, Number(e.target.value) || 2);
                      const updated = [...groceryDiscountTiers];
                      updated[idx] = { ...updated[idx], min_quantity: val };
                      onGroceryDiscountTiersChange(updated);
                    }}
                    className="h-11 min-h-11 rounded-lg text-xs bg-muted/20 font-mono"
                  />
                </div>

                <div className="w-36 space-y-1">
                  <span className="text-xs text-muted-foreground block">Tipo</span>
                  <Select
                    value={tier.discount_type}
                    onValueChange={(v) => {
                      const updated = [...groceryDiscountTiers];
                      updated[idx] = { ...updated[idx], discount_type: v as "percentage" | "fixed_cents" };
                      onGroceryDiscountTiersChange(updated);
                    }}
                  >
                    <SelectTrigger className="h-11 min-h-11 rounded-lg text-xs bg-muted/20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Porcentagem (%)</SelectItem>
                      <SelectItem value="fixed_cents">Valor Fixo (R$)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex-1 space-y-1">
                  <span className="text-xs text-muted-foreground block">
                    {tier.discount_type === "percentage" ? "Desconto (%)" : "Desconto (R$)"}
                  </span>
                  {tier.discount_type === "percentage" ? (
                    <Input
                      type="number"
                      min={1}
                      max={90}
                      value={tier.discount_value}
                      onChange={(e) => {
                        const val = Number(e.target.value) || 0;
                        const updated = [...groceryDiscountTiers];
                        updated[idx] = { ...updated[idx], discount_value: val };
                        onGroceryDiscountTiersChange(updated);
                      }}
                      placeholder="10"
                      className="h-11 min-h-11 rounded-lg text-xs bg-muted/20 font-mono"
                    />
                  ) : (
                    <CurrencyField
                      value={tier.discount_value}
                      onChange={(val) => {
                        const updated = [...groceryDiscountTiers];
                        updated[idx] = { ...updated[idx], discount_value: val ?? 0 };
                        onGroceryDiscountTiersChange(updated);
                      }}
                      className="h-11 min-h-11 rounded-lg text-xs bg-muted/20 font-mono"
                    />
                  )}
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    onGroceryDiscountTiersChange(groceryDiscountTiers.filter((_, i) => i !== idx));
                  }}
                  className="size-11 min-h-11 min-w-11 rounded-lg text-muted-foreground hover:text-destructive shrink-0 mt-3"
                  title="Remover faixa"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}

            {groceryDiscountTiers.length < 4 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const lastTier = groceryDiscountTiers[groceryDiscountTiers.length - 1];
                  const nextMin = lastTier ? lastTier.min_quantity + 1 : 2;
                  onGroceryDiscountTiersChange([
                    ...groceryDiscountTiers,
                    { min_quantity: nextMin, discount_type: "percentage", discount_value: 15 },
                  ]);
                }}
                className="w-full h-11 min-h-11 rounded-lg text-xs font-semibold gap-2 border-dashed cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Plus className="size-4" />
                <span>Adicionar Nova Faixa de Desconto</span>
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Oferta Relâmpago / Order Bump */}
      <div className="p-4 rounded-lg border border-border/50 bg-muted/15 space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label className="text-xs font-bold text-foreground flex items-center gap-2">
              <Zap className="size-4 text-warning-strong fill-warning" />
              <span>Oferta Relâmpago no Checkout (Order Bump / Venda Cruzada)</span>
            </Label>
            <p className="text-xs text-muted-foreground">
              Exibe um card de produto complementar com desconto rápido antes de finalizar o pedido.
            </p>
          </div>
          <Switch checked={groceryOrderBumpEnabled} onCheckedChange={onGroceryOrderBumpEnabledChange} />
        </div>

        {groceryOrderBumpEnabled && (
          <div className="space-y-3 pt-2 border-t border-border/40">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs text-foreground font-medium">Nome do Produto em Oferta *</Label>
                <Input
                  value={groceryOrderBumpTitle}
                  onChange={(e) => onGroceryOrderBumpTitleChange(e.target.value)}
                  placeholder="Ex: Pizza Calabresa Artesanal ou Maçã Gala 1kg"
                  className="h-11 rounded-lg text-xs bg-background"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-foreground font-medium">Selo / Chamada</Label>
                <Input
                  value={groceryOrderBumpBadge}
                  onChange={(e) => onGroceryOrderBumpBadgeChange(e.target.value)}
                  placeholder="Ex: Oferta Relâmpago ou Aproveite Também"
                  className="h-11 rounded-lg text-xs bg-background"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs text-foreground font-medium">Preço Promocional Especial (R$) *</Label>
                <CurrencyField
                  value={groceryOrderBumpSpecialPriceCents}
                  onChange={(val) => onGroceryOrderBumpSpecialPriceCentsChange(val ?? 0)}
                  className="h-11 rounded-lg text-xs bg-background font-mono"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-foreground font-medium">Preço Original Riscado (R$)</Label>
                <CurrencyField
                  value={groceryOrderBumpOriginalPriceCents}
                  onChange={(val) => onGroceryOrderBumpOriginalPriceCentsChange(val ?? 0)}
                  className="h-11 rounded-lg text-xs bg-background font-mono"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
