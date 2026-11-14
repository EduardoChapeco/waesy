import React from "react";
import { Layers, Leaf, Apple, Users, Scale, Clock, ShieldCheck, Tag, Check, Barcode, Star, Percent, Plus, Trash2, UtensilsCrossed, Wine, Package } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface ProgressiveDiscountRule {
  minQuantity: number;
  discountPercentage: number;
}

export type FoodItemClassification = "prepared_dish" | "ready_product" | "fresh_weighed";

export interface FoodSpecsData {
  itemClassification?: FoodItemClassification;
  dietaryRestrictions: string[]; // ["vegano", "sem_gluten", ...]
  beverageTags: string[]; // ["gelada", "alcoolica", ...]
  servesCount?: string; // "1 pessoa", "2 pessoas", "3-4 pessoas", "familia"
  portionWeight?: string; // "750"
  portionUnit?: string; // "g", "kg", "ml", "L", "un", "fatias"
  preparationTimeMinutes?: number; // 20
  kitchenStation?: "geral" | "chapa" | "forno" | "bebidas" | "sobremesas";
  posCode?: string; // "XGAHTQ"
  spiceLevel?: "none" | "mild" | "medium" | "hot";

  // ── Novos Campos Varejo / Supermercado / Conveniência / Hortifrúti (Padrão Varejo Digital) ──
  barcodeEan?: string;
  isFreshPricingActive?: boolean;
  freshPricingMode?: "unit" | "weight";
  avgPieceWeightGrams?: number;
  pricePerKgCents?: number;
  ripenessEnabled?: boolean;
  ripenessStages?: string[];
  progressiveDiscounts?: ProgressiveDiscountRule[];
}

const DIETARY_OPTIONS = [
  { id: "vegano", label: "Vegano", icon: Leaf },
  { id: "vegetariano", label: "Vegetariano", icon: Leaf },
  { id: "organico", label: "Orgânico", icon: Apple },
  { id: "sem_acucar", label: "Sem açúcar", icon: Layers },
  { id: "sem_lactose", label: "Sem lactose", icon: ShieldCheck },
  { id: "sem_gluten", label: "Sem glúten", icon: ShieldCheck },
  { id: "artesanal", label: "Produção Artesanal", icon: Layers },
];

const BEVERAGE_OPTIONS = [
  { id: "gelada", label: "Bebida gelada" },
  { id: "alcoolica", label: "Bebida alcoólica" },
  { id: "natural", label: "Natural / Sem álcool" },
  { id: "zero", label: "Zero Caloria" },
];

const DEFAULT_RIPENESS_OPTIONS = [
  "Verde / Para amadurecer",
  "De vez / Firme",
  "Maduro / No ponto",
  "Bem maduro / Consumo hoje",
];

interface ProductFoodSpecsCardProps {
  value: FoodSpecsData;
  onChange: (value: FoodSpecsData) => void;
  isFoodNiche?: boolean;
}

export function ProductFoodSpecsCard({
  value,
  onChange,
  isFoodNiche = true,
}: ProductFoodSpecsCardProps) {
  const dietary = value.dietaryRestrictions || [];
  const beverages = value.beverageTags || [];
  const ripenessStages = value.ripenessStages || DEFAULT_RIPENESS_OPTIONS;
  const discounts = value.progressiveDiscounts || [];

  const classification: FoodItemClassification =
    value.itemClassification ||
    (value.isFreshPricingActive
      ? "fresh_weighed"
      : value.beverageTags?.length > 0 || (value.barcodeEan && (!value.preparationTimeMinutes || value.preparationTimeMinutes === 0))
      ? "ready_product"
      : "prepared_dish");

  const toggleDietary = (id: string) => {
    const next = dietary.includes(id) ? dietary.filter((d) => d !== id) : [...dietary, id];
    onChange({ ...value, dietaryRestrictions: next });
  };

  const toggleBeverage = (id: string) => {
    const next = beverages.includes(id) ? beverages.filter((b) => b !== id) : [...beverages, id];
    onChange({ ...value, beverageTags: next });
  };

  const toggleRipenessStage = (stage: string) => {
    const next = ripenessStages.includes(stage)
      ? ripenessStages.filter((s) => s !== stage)
      : [...ripenessStages, stage];
    onChange({ ...value, ripenessStages: next });
  };

  const handleAddDiscountRule = () => {
    const nextQty = discounts.length > 0 ? (discounts[discounts.length - 1].minQuantity || 1) + 2 : 3;
    const nextPct = discounts.length > 0 ? (discounts[discounts.length - 1].discountPercentage || 0) + 5 : 5;
    onChange({
      ...value,
      progressiveDiscounts: [...discounts, { minQuantity: nextQty, discountPercentage: nextPct }],
    });
  };

  const handleUpdateDiscountRule = (index: number, field: "minQuantity" | "discountPercentage", val: number) => {
    const updated = [...discounts];
    updated[index] = { ...updated[index], [field]: val };
    onChange({ ...value, progressiveDiscounts: updated });
  };

  const handleRemoveDiscountRule = (index: number) => {
    onChange({
      ...value,
      progressiveDiscounts: discounts.filter((_, idx) => idx !== index),
    });
  };

  return (
    <div className="rounded-lg border border-border/60 bg-card p-5 space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Layers className="size-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground line-clamp-2 text-anti-truncate">Especificações de Varejo</h3>
            <Badge variant="outline" className="text-2xs font-bold bg-muted text-foreground border-border">
              Padrão Varejo
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Campos canônicos para restaurantes, lanchonetes, conveniências, hortifrútis e supermercados.
          </p>
        </div>
      </div>

      {/* ── Seletor Canônico de Classificação (Padrão iFood / ERP Integrado) ── */}
      <div className="space-y-2">
        <Label className="text-xs font-bold text-foreground">Como este item é comercializado?</Label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Button
            type="button"
            variant={classification === "prepared_dish" ? "default" : "outline"}
            onClick={() => {
              onChange({
                ...value,
                itemClassification: "prepared_dish",
                isFreshPricingActive: false,
                preparationTimeMinutes: value.preparationTimeMinutes && value.preparationTimeMinutes > 0 ? value.preparationTimeMinutes : 20,
              });
            }}
            className="h-11 min-h-11 rounded-lg text-xs font-bold gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <UtensilsCrossed className="size-4 shrink-0" />
            <span className="truncate">Prato Preparado / Cozinha</span>
          </Button>

          <Button
            type="button"
            variant={classification === "ready_product" ? "default" : "outline"}
            onClick={() => {
              onChange({
                ...value,
                itemClassification: "ready_product",
                isFreshPricingActive: false,
                preparationTimeMinutes: 0,
              });
            }}
            className="h-11 min-h-11 rounded-lg text-xs font-bold gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <Wine className="size-4 shrink-0" />
            <span className="truncate">Produto Pronto / Bebida</span>
          </Button>

          <Button
            type="button"
            variant={classification === "fresh_weighed" ? "default" : "outline"}
            onClick={() => {
              onChange({
                ...value,
                itemClassification: "fresh_weighed",
                isFreshPricingActive: true,
                freshPricingMode: value.freshPricingMode || "weight",
              });
            }}
            className="h-11 min-h-11 rounded-lg text-xs font-bold gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <Scale className="size-4 shrink-0" />
            <span className="truncate">Item Pesável / Balança</span>
          </Button>
        </div>
      </div>

      {/* ── 1. Modo Prato Preparado / Feito na Cozinha (Padrão iFood / KDS) ── */}
      {classification === "prepared_dish" && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Tamanho do Item, Porção & Tempo de Preparo */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-foreground uppercase tracking-wider text-2xs">
                Tamanho da Refeição & Tempo de Cozinha
              </Label>
              <Badge variant="outline" className="text-2xs font-bold bg-primary/10 text-primary border-none">
                Enviado ao KDS
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              {/* Serve Até */}
              <div className="sm:col-span-4 space-y-2">
                <Label className="text-xs font-semibold text-foreground flex items-center gap-2">
                  <Users className="size-3.5 text-muted-foreground" />
                  <span>Serve até</span>
                </Label>
                <Select
                  value={value.servesCount || "1 pessoa"}
                  onValueChange={(val) => onChange({ ...value, servesCount: val })}
                >
                  <SelectTrigger className="h-11 rounded-lg text-xs">
                    <SelectValue placeholder="Selecione a porção" />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg text-xs">
                    <SelectItem value="1 pessoa">1 pessoa (Individual)</SelectItem>
                    <SelectItem value="2 pessoas">2 pessoas</SelectItem>
                    <SelectItem value="3-4 pessoas">3 a 4 pessoas</SelectItem>
                    <SelectItem value="familia">Família (5+ pessoas)</SelectItem>
                    <SelectItem value="petisco">Porção para compartilhar</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Peso / Volume */}
              <div className="sm:col-span-4 space-y-2">
                <Label className="text-xs font-semibold text-foreground flex items-center gap-2">
                  <Scale className="size-3.5 text-muted-foreground" />
                  <span>Peso Estimado</span>
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    placeholder="Ex: 450"
                    value={value.portionWeight || ""}
                    onChange={(e) => onChange({ ...value, portionWeight: e.target.value })}
                    className="h-11 text-xs rounded-lg flex-1"
                  />
                  <Select
                    value={value.portionUnit || "g"}
                    onValueChange={(val) => onChange({ ...value, portionUnit: val })}
                  >
                    <SelectTrigger className="h-11 w-20 rounded-lg text-xs shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg text-xs">
                      <SelectItem value="g">g</SelectItem>
                      <SelectItem value="kg">kg</SelectItem>
                      <SelectItem value="ml">ml</SelectItem>
                      <SelectItem value="un">un</SelectItem>
                      <SelectItem value="fatias">fatias</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Tempo de Preparo na Cozinha */}
              <div className="sm:col-span-2 space-y-2">
                <Label className="text-xs font-semibold text-foreground flex items-center gap-2">
                  <Clock className="size-3.5 text-primary" />
                  <span>Tempo SLA</span>
                </Label>
                <div className="relative">
                  <Input
                    type="number"
                    placeholder="Min (20)"
                    value={value.preparationTimeMinutes ?? 20}
                    onChange={(e) =>
                      onChange({
                        ...value,
                        preparationTimeMinutes: e.target.value ? parseInt(e.target.value, 10) : undefined,
                      })
                    }
                    className="h-11 text-xs rounded-lg pr-10"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-2xs text-muted-foreground font-bold">
                    min
                  </span>
                </div>
              </div>

              {/* Praça / Setor de Produção da Cozinha */}
              <div className="sm:col-span-2 space-y-2">
                <Label className="text-xs font-semibold text-foreground flex items-center gap-2">
                  <UtensilsCrossed className="size-3.5 text-muted-foreground" />
                  <span>Praça KDS</span>
                </Label>
                <Select
                  value={value.kitchenStation || "geral"}
                  onValueChange={(val: any) => onChange({ ...value, kitchenStation: val })}
                >
                  <SelectTrigger className="h-11 rounded-lg text-xs">
                    <SelectValue placeholder="Praça de Produção" />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg text-xs">
                    <SelectItem value="geral">Geral / Montagem</SelectItem>
                    <SelectItem value="chapa">Chapa / Grelhados</SelectItem>
                    <SelectItem value="forno">Forno / Pizzaria</SelectItem>
                    <SelectItem value="bebidas">Bar & Bebidas</SelectItem>
                    <SelectItem value="sobremesas">Sobremesas / Café</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Código PDV & SKU da Cozinha */}
          <div className="pt-2 border-t border-border/40 space-y-2">
            <Label className="text-xs font-bold text-foreground flex items-center gap-2">
              <Tag className="size-3.5 text-muted-foreground" />
              <span>Código Interno de Atendimento / PDV</span>
            </Label>
            <Input
              placeholder="Ex: BURGER-01 ou PIZZA-CALAB"
              value={value.posCode || ""}
              onChange={(e) => onChange({ ...value, posCode: e.target.value.toUpperCase() })}
              className="h-11 text-xs rounded-lg font-mono uppercase"
            />
          </div>

          {/* Restrições Alimentares */}
          <div className="space-y-3 pt-2 border-t border-border/40">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-foreground uppercase tracking-wider text-2xs">
                Restrições & Características
              </Label>
              <span className="text-2xs text-muted-foreground">Exibido aos clientes na vitrine</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {DIETARY_OPTIONS.map((item) => {
                const isSelected = dietary.includes(item.id);
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleDietary(item.id)}
                    className={cn(
                      "inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-colors duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none min-h-11",
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary font-bold shadow-xs"
                        : "bg-muted/40 text-muted-foreground border-border/70 hover:border-foreground/30 hover:text-foreground"
                    )}
                  >
                    <Icon className="size-3.5" />
                    <span>{item.label}</span>
                    {isSelected && <Check className="size-3 ml-1" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── 2. Modo Produto Pronto / Bebida Industrializada ── */}
      {classification === "ready_product" && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* EAN & SKU */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-foreground flex items-center gap-2">
                <Barcode className="size-3.5 text-primary" />
                <span>Código de Barras (EAN-13 / GTIN)</span>
              </Label>
              <Input
                placeholder="Ex: 7894900011517"
                value={value.barcodeEan || ""}
                onChange={(e) => onChange({ ...value, barcodeEan: e.target.value.trim() })}
                className="h-11 text-xs rounded-lg font-mono"
                maxLength={14}
              />
              <p className="text-2xs text-muted-foreground">
                Permite bipar no caixa e auto-completar preço/descrição.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-foreground flex items-center gap-2">
                <Tag className="size-3.5 text-muted-foreground" />
                <span>Código de Integração / PDV (SKU)</span>
              </Label>
              <Input
                placeholder="Ex: BEB-COCA-LATA"
                value={value.posCode || ""}
                onChange={(e) => onChange({ ...value, posCode: e.target.value.toUpperCase() })}
                className="h-11 text-xs rounded-lg font-mono uppercase"
              />
              <p className="text-2xs text-muted-foreground">
                Identificador do estoque e leitor de retaguarda.
              </p>
            </div>
          </div>

          {/* Volume da Embalagem */}
          <div className="space-y-2 pt-2 border-t border-border/40">
            <Label className="text-xs font-semibold text-foreground flex items-center gap-2">
              <Scale className="size-3.5 text-muted-foreground" />
              <span>Volume / Peso da Embalagem</span>
            </Label>
            <div className="flex items-center gap-2 max-w-sm">
              <Input
                type="number"
                placeholder="Ex: 350"
                value={value.portionWeight || ""}
                onChange={(e) => onChange({ ...value, portionWeight: e.target.value })}
                className="h-11 text-xs rounded-lg flex-1"
              />
              <Select
                value={value.portionUnit || "ml"}
                onValueChange={(val) => onChange({ ...value, portionUnit: val })}
              >
                <SelectTrigger className="h-11 w-24 rounded-lg text-xs shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-lg text-xs">
                  <SelectItem value="ml">ml</SelectItem>
                  <SelectItem value="L">L</SelectItem>
                  <SelectItem value="g">g</SelectItem>
                  <SelectItem value="kg">kg</SelectItem>
                  <SelectItem value="un">un</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Classificação de Bebidas */}
          <div className="space-y-3 pt-2 border-t border-border/40">
            <Label className="text-xs font-bold text-foreground uppercase tracking-wider text-2xs">
              Classificação da Bebida / Produto
            </Label>
            <div className="flex flex-wrap gap-2">
              {BEVERAGE_OPTIONS.map((item) => {
                const isSelected = beverages.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleBeverage(item.id)}
                    className={cn(
                      "inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-colors duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none min-h-11",
                      isSelected
                        ? "bg-foreground text-background border-foreground font-bold shadow-xs"
                        : "bg-muted/40 text-muted-foreground border-border/70 hover:border-foreground/30 hover:text-foreground"
                    )}
                  >
                    <span>{item.label}</span>
                    {isSelected && <Check className="size-3 ml-1" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Desconto Progressivo por Volume */}
          <div className="pt-2 border-t border-border/40 space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-foreground flex items-center gap-2">
                  <Percent className="size-3.5 text-primary" />
                  <span>Desconto por Quantidade (Pague Menos)</span>
                </Label>
                <p className="text-2xs text-muted-foreground">
                  Incentive pacotes maiores (ex: A partir de 3 latas, 10% OFF).
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddDiscountRule}
                className="h-11 min-h-11 px-3 rounded-lg text-xs font-bold gap-1 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <Plus className="size-3" />
                <span>Adicionar Faixa</span>
              </Button>
            </div>

            {discounts.length > 0 && (
              <div className="space-y-2">
                {discounts.map((rule, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-muted/20"
                  >
                    <div className="flex-1 flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground whitespace-nowrap">A partir de</span>
                      <Input
                        type="number"
                        min={2}
                        value={rule.minQuantity}
                        onChange={(e) =>
                          handleUpdateDiscountRule(idx, "minQuantity", parseInt(e.target.value, 10) || 1)
                        }
                        className="h-11 w-20 rounded-lg text-xs bg-background text-center font-bold"
                      />
                      <span className="text-muted-foreground">unidades:</span>
                      <Input
                        type="number"
                        min={1}
                        max={99}
                        value={rule.discountPercentage}
                        onChange={(e) =>
                          handleUpdateDiscountRule(idx, "discountPercentage", parseInt(e.target.value, 10) || 0)
                        }
                        className="h-11 w-20 rounded-lg text-xs bg-background text-center font-bold"
                      />
                      <span className="font-bold text-primary">% de desconto</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveDiscountRule(idx)}
                      className="size-11 min-h-11 min-w-11 p-0 flex items-center justify-center text-muted-foreground hover:text-destructive cursor-pointer rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs text-foreground flex items-center gap-2">
            <Clock className="size-4 text-primary shrink-0" />
            <span>Expedição direta: este produto tem tempo de preparo zero e é despachado imediatamente.</span>
          </div>
        </div>
      )}

      {/* ── 3. Modo Hortifrúti / Açougue / Item Pesável ── */}
      {classification === "fresh_weighed" && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-foreground">Modo de Precificação no Catálogo</Label>
              <Select
                value={value.freshPricingMode || "weight"}
                onValueChange={(val: "unit" | "weight") => onChange({ ...value, freshPricingMode: val })}
              >
                <SelectTrigger className="h-11 rounded-lg text-xs bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-lg text-xs">
                  <SelectItem value="weight">Direto por Peso (R$ por Kg)</SelectItem>
                  <SelectItem value="unit">Por Unidade (com peso médio aproximado)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-foreground">
                Peso Médio Unitário Estimado (gramas)
              </Label>
              <div className="relative">
                <Input
                  type="number"
                  placeholder="Ex: 180"
                  value={value.avgPieceWeightGrams ?? ""}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      avgPieceWeightGrams: e.target.value ? parseInt(e.target.value, 10) : undefined,
                    })
                  }
                  className="h-11 text-xs rounded-lg bg-background pr-10"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-2xs text-muted-foreground font-bold">
                  g / un
                </span>
              </div>
            </div>
          </div>

          {/* Código EAN ou PLU de Balança */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/40">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-foreground flex items-center gap-2">
                <Barcode className="size-3.5 text-primary" />
                <span>Código PLU de Balança ou EAN-13</span>
              </Label>
              <Input
                placeholder="Ex: 4011 (PLU Banana)"
                value={value.barcodeEan || ""}
                onChange={(e) => onChange({ ...value, barcodeEan: e.target.value.trim() })}
                className="h-11 text-xs rounded-lg font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-foreground flex items-center gap-2">
                <Tag className="size-3.5 text-muted-foreground" />
                <span>Código Interno (SKU)</span>
              </Label>
              <Input
                placeholder="Ex: HORT-BANANA-PRATA"
                value={value.posCode || ""}
                onChange={(e) => onChange({ ...value, posCode: e.target.value.toUpperCase() })}
                className="h-11 text-xs rounded-lg font-mono uppercase"
              />
            </div>
          </div>

          {/* Ponto de Maturação */}
          <div className="pt-2 border-t border-border/40 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-foreground flex items-center gap-2">
                <Apple className="size-3.5 text-primary" />
                <span>Escolha do Ponto de Maturação pelo Cliente</span>
              </Label>
              <Switch
                checked={Boolean(value.ripenessEnabled)}
                onCheckedChange={(checked) => onChange({ ...value, ripenessEnabled: checked })}
              />
            </div>

            {value.ripenessEnabled && (
              <div className="space-y-2 pt-1">
                <p className="text-2xs text-muted-foreground">
                  Selecione as opções que o cliente poderá escolher ao adicionar à sacola:
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {DEFAULT_RIPENESS_OPTIONS.map((opt) => {
                    const isSelected = ripenessStages.includes(opt);
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => toggleRipenessStage(opt)}
                        className={cn(
                          "inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-colors duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none min-h-11",
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary font-bold shadow-xs"
                            : "bg-background text-muted-foreground border-border/70 hover:border-foreground/30 hover:text-foreground"
                        )}
                      >
                        <span>{opt}</span>
                        {isSelected && <Check className="size-3 ml-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Aviso de Transparência */}
      <div className="p-3 rounded-lg bg-warning/10 border border-warning/20 text-2xs text-warning-strong leading-snug">
        Lembre-se: Você é legalmente responsável pela veracidade dos ingredientes e especificações declaradas, garantindo segurança aos clientes com alergias ou restrições alimentares.
      </div>
    </div>
  );
}
