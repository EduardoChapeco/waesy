import React from "react";
import {
  Layers,
  Leaf,
  Apple,
  Users,
  Scale,
  Clock,
  ShieldCheck,
  Tag,
  Check,
  Barcode,
  Sparkles,
  Percent,
  Plus,
  Trash2,
} from 'lucide-react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface ProgressiveDiscountRule {
  minQuantity: number;
  discountPercentage: number;
}

export interface FoodSpecsData {
  dietaryRestrictions: string[]; // ["vegano", "sem_gluten", ...]
  beverageTags: string[]; // ["gelada", "alcoolica", ...]
  servesCount?: string; // "1 pessoa", "2 pessoas", "3-4 pessoas", "familia"
  portionWeight?: string; // "750"
  portionUnit?: string; // "g", "kg", "ml", "L", "un", "fatias"
  preparationTimeMinutes?: number; // 20
  posCode?: string; // "XGAHTQ"
  spiceLevel?: "none" | "mild" | "medium" | "hot";

  // ── Novos Campos Varejo / Supermercado / Conveniência / Hortifrúti (iFood / Osuper) ──
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
    <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-6 shadow-xs">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-3 border-b border-border/40 pb-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Layers className="size-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">Especificações de Varejo, Alimentação & Hortifrúti</h3>
            <Badge variant="outline" className="text-[10px] font-bold bg-primary/10 text-primary border-none">
              Padrão iFood / Osuper
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Campos canônicos para supermercados, conveniências, hortifrútis e gastronomia.
          </p>
        </div>
      </div>

      {/* ── 1. Código EAN-13 & Código de Integração PDV ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <Barcode className="size-3.5 text-primary" />
            <span>Código de Barras (EAN-13 / GTIN)</span>
          </Label>
          <Input
            placeholder="Ex: 7891000100103"
            value={value.barcodeEan || ""}
            onChange={(e) => onChange({ ...value, barcodeEan: e.target.value.trim() })}
            className="h-9 text-xs rounded-xl font-mono"
            maxLength={14}
          />
          <p className="text-[11px] text-muted-foreground">
            Usado para busca instantânea por leitor de código de barras no PDV e conferência.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <Tag className="size-3.5 text-muted-foreground" />
            <span>Código de Integração / PDV (SKU)</span>
          </Label>
          <Input
            placeholder="Ex: XGAHTQ ou PRD-01"
            value={value.posCode || ""}
            onChange={(e) => onChange({ ...value, posCode: e.target.value.toUpperCase() })}
            className="h-9 text-xs rounded-xl font-mono uppercase"
          />
          <p className="text-[11px] text-muted-foreground">
            Código interno do ERP/Frente de caixa para conciliação automática de vendas.
          </p>
        </div>
      </div>

      {/* ── 2. Hortifrúti, Carnes & Produtos Pesáveis (A Granel / Peso Variável) ── */}
      <div className="pt-3 border-t border-border/40 space-y-4">
        <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/30 border border-border/50">
          <div className="space-y-0.5">
            <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Scale className="size-3.5 text-primary" />
              <span>Produto Pesável / Hortifrúti / Açougue</span>
            </Label>
            <p className="text-[11px] text-muted-foreground">
              Ative se o produto é vendido a peso variável (ex: frutas, legumes, queijos, carnes frescas).
            </p>
          </div>
          <Switch
            checked={Boolean(value.isFreshPricingActive)}
            onCheckedChange={(checked) => onChange({ ...value, isFreshPricingActive: checked })}
          />
        </div>

        {value.isFreshPricingActive && (
          <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-4 animate-in fade-in duration-150">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Modo de Venda no Catálogo</Label>
                <Select
                  value={value.freshPricingMode || "unit"}
                  onValueChange={(val: "unit" | "weight") => onChange({ ...value, freshPricingMode: val })}
                >
                  <SelectTrigger className="h-9 rounded-xl text-xs bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl text-xs">
                    <SelectItem value="unit">Por Unidade (com peso médio aproximado)</SelectItem>
                    <SelectItem value="weight">Direto por Peso (R$ por Kg)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  Peso Médio Unitário Aproximado (gramas)
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
                    className="h-9 text-xs rounded-xl bg-background pr-10"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-bold">
                    g / un
                  </span>
                </div>
              </div>
            </div>

            {/* Ponto de Maturação */}
            <div className="pt-2 border-t border-border/30 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Apple className="size-3.5 text-primary" />
                  <span>Escolha do Ponto de Maturação pelo Cliente</span>
                </Label>
                <Switch
                  checked={Boolean(value.ripenessEnabled)}
                  onCheckedChange={(checked) => onChange({ ...value, ripenessEnabled: checked })}
                />
              </div>

              {value.ripenessEnabled && (
                <div className="space-y-1.5 pt-1">
                  <p className="text-[11px] text-muted-foreground">
                    Selecione quais opções estarão disponíveis para o cliente marcar no checkout:
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
                            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer",
                            isSelected
                              ? "bg-primary text-primary-foreground border-primary font-bold shadow-xs"
                              : "bg-background text-muted-foreground border-border/70 hover:border-foreground/30 hover:text-foreground"
                          )}
                        >
                          <span>{opt}</span>
                          {isSelected && <Check className="size-3 ml-0.5" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── 3. Descontos Progressivos / Varejo e Atacado (Pague Menos por Volume) ── */}
      <div className="pt-3 border-t border-border/40 space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Percent className="size-3.5 text-primary" />
              <span>Desconto Progressivo por Volume (Pague Menos)</span>
            </Label>
            <p className="text-[11px] text-muted-foreground">
              Incentive compras maiores (ex: A partir de 3 unidades, 10% OFF).
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddDiscountRule}
            className="h-8 rounded-xl text-xs font-bold gap-1 cursor-pointer"
          >
            <Plus className="size-3" />
            <span>Adicionar Faixa</span>
          </Button>
        </div>

        {discounts.length > 0 ? (
          <div className="space-y-2">
            {discounts.map((rule, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 p-2.5 rounded-xl border border-border/60 bg-muted/20"
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
                    className="h-8 w-20 rounded-lg text-xs bg-background text-center font-bold"
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
                    className="h-8 w-20 rounded-lg text-xs bg-background text-center font-bold"
                  />
                  <span className="font-bold text-primary">% de desconto</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveDiscountRule(idx)}
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive cursor-pointer"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground italic">
            Nenhuma faixa de desconto por volume configurada.
          </p>
        )}
      </div>

      {/* ── 4. Restrições Alimentares ── */}
      <div className="space-y-2.5 pt-3 border-t border-border/40">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-bold text-foreground uppercase tracking-wider text-[11px]">
            Restrições Alimentares
          </Label>
          <span className="text-[10px] text-muted-foreground">Selecione todas que se aplicam</span>
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
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer",
                  isSelected
                    ? "bg-primary text-primary-foreground border-primary font-bold shadow-xs"
                    : "bg-muted/40 text-muted-foreground border-border/70 hover:border-foreground/30 hover:text-foreground"
                )}
              >
                <Icon className="size-3.5" />
                <span>{item.label}</span>
                {isSelected && <Check className="size-3 ml-0.5" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 5. Em Caso de Bebidas ── */}
      <div className="space-y-2.5 pt-2 border-t border-border/40">
        <Label className="text-xs font-bold text-foreground uppercase tracking-wider text-[11px]">
          Classificação para Bebidas
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
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer",
                  isSelected
                    ? "bg-foreground text-background border-foreground font-bold shadow-xs"
                    : "bg-muted/40 text-muted-foreground border-border/70 hover:border-foreground/30 hover:text-foreground"
                )}
              >
                <span>{item.label}</span>
                {isSelected && <Check className="size-3 ml-0.5" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 6. Tamanho do Item, Porção & Tempo de Preparo ── */}
      <div className="pt-2 border-t border-border/40 space-y-4">
        <Label className="text-xs font-bold text-foreground uppercase tracking-wider text-[11px]">
          Tamanho do Item & Porção da Refeição
        </Label>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Serve Até */}
          <div className="sm:col-span-4 space-y-1.5">
            <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Users className="size-3.5 text-muted-foreground" />
              <span>Serve até</span>
            </Label>
            <Select
              value={value.servesCount || "1 pessoa"}
              onValueChange={(val) => onChange({ ...value, servesCount: val })}
            >
              <SelectTrigger className="h-9 rounded-xl text-xs">
                <SelectValue placeholder="Selecione a porção" />
              </SelectTrigger>
              <SelectContent className="rounded-xl text-xs">
                <SelectItem value="1 pessoa">1 pessoa (Individual)</SelectItem>
                <SelectItem value="2 pessoas">2 pessoas</SelectItem>
                <SelectItem value="3-4 pessoas">3 a 4 pessoas</SelectItem>
                <SelectItem value="familia">Família (5+ pessoas)</SelectItem>
                <SelectItem value="petisco">Porção / Petisco para compartilhar</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Peso / Volume */}
          <div className="sm:col-span-4 space-y-1.5">
            <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Scale className="size-3.5 text-muted-foreground" />
              <span>Peso / Volume</span>
            </Label>
            <div className="flex items-center gap-1.5">
              <Input
                type="number"
                placeholder="Ex: 750"
                value={value.portionWeight || ""}
                onChange={(e) => onChange({ ...value, portionWeight: e.target.value })}
                className="h-9 text-xs rounded-xl flex-1"
              />
              <Select
                value={value.portionUnit || "g"}
                onValueChange={(val) => onChange({ ...value, portionUnit: val })}
              >
                <SelectTrigger className="h-9 w-20 rounded-xl text-xs shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl text-xs">
                  <SelectItem value="g">g</SelectItem>
                  <SelectItem value="kg">kg</SelectItem>
                  <SelectItem value="ml">ml</SelectItem>
                  <SelectItem value="L">L</SelectItem>
                  <SelectItem value="un">un</SelectItem>
                  <SelectItem value="fatias">fatias</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tempo de Preparo Próprio do Item */}
          <div className="sm:col-span-4 space-y-1.5">
            <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Clock className="size-3.5 text-muted-foreground" />
              <span>Preparo deste item</span>
            </Label>
            <div className="relative">
              <Input
                type="number"
                placeholder="Minutos (ex: 25)"
                value={value.preparationTimeMinutes ?? ""}
                onChange={(e) =>
                  onChange({
                    ...value,
                    preparationTimeMinutes: e.target.value ? parseInt(e.target.value, 10) : undefined,
                  })
                }
                className="h-9 text-xs rounded-xl pr-10"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-bold">
                min
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Aviso de Transparência */}
      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-300 leading-snug">
        Lembre-se: Você é legalmente responsável pela veracidade dos ingredientes e restrições alimentares declaradas, garantindo segurança aos clientes com alergias alimentares.
      </div>
    </div>
  );
}
