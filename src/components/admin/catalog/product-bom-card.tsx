import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Boxes, Plus, Trash2, Package, Sliders, DollarSign, TrendingUp, Percent, CheckCircle2, Layers, Utensils, Box, AlertTriangle, ChefHat } from 'lucide-react';
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatMoney } from "@/lib/money";
import { listSupplies, listRecipes } from "@/services/gastronomy-supplies.functions";

export interface BomItem {
 id: string;
 name: string;
 type: "ingredient" | "packaging" | "labor" | "other";
 quantity: number;
 unit: "un" | "g" | "kg" | "ml" | "l" | "unidade";
 unitCostCents: number;
 supplyId?: string;
 recipeId?: string;
 modifierOptionId?: string;
 modifierOptionLabel?: string;
 isPrimaryGargalo?: boolean;
}

interface ProductBomCardProps {
 initialItems?: BomItem[];
 productPriceCents: number;
 onApplyCostToProduct: (calculatedCostCents: number) => void;
 onItemsChange: (items: BomItem[]) => void;
 productId?: string;
 optionGroups?: any[];
 selectedOptionGroupIds?: string[];
}

export function ProductBomCard({
 initialItems = [],
 productPriceCents = 0,
 onApplyCostToProduct,
 onItemsChange,
 productId,
 optionGroups = [],
 selectedOptionGroupIds = [],
}: ProductBomCardProps) {
 const [items, setItems] = useState<BomItem[]>(initialItems);

 // Carrega catálogo de insumos e sub-receitas cadastrados na loja
 const { data: storeSupplies = [], isLoading: isLoadingSupplies } = useQuery({
   queryKey: ["store-supplies-active"],
   queryFn: () => listSupplies({}),
 });

 const { data: storeRecipes = [], isLoading: isLoadingRecipes } = useQuery({
   queryKey: ["store-recipes-sub"],
   queryFn: () => listRecipes({ data: { type: "sub_recipe" } } as any),
 });

 // Form State para adicionar item rápido
 const [newItemName, setNewItemName] = useState("");
 const [newItemType, setNewItemType] = useState<"ingredient" | "packaging" | "labor" | "other">(
 "ingredient",
 );
 const [newItemQty, setNewItemQty] = useState<string>("1");
 const [newItemUnit, setNewItemUnit] = useState<"un" | "g" | "kg" | "ml" | "l" | "unidade">("un");
 const [newItemCost, setNewItemCost] = useState<string>("");
 const [selectedSupplyId, setSelectedSupplyId] = useState<string | null>(null);
 const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
 const [selectedModifierKey, setSelectedModifierKey] = useState<string>("base");
 const [isPrimaryGargalo, setIsPrimaryGargalo] = useState<boolean>(true);

 const availableModifierOptions = useMemo(() => {
   const groups = Array.isArray(optionGroups) ? optionGroups : [];
   const activeGroups =
     selectedOptionGroupIds.length > 0
       ? groups.filter((g: any) => selectedOptionGroupIds.includes(g.id))
       : groups;
   const flat: { id: string; label: string }[] = [];
   for (const g of activeGroups) {
     const vals = g.option_values || g.values || [];
     for (const v of vals) {
       if (v?.id && v?.label) {
         flat.push({ id: String(v.id), label: `${g.name}: ${v.label}` });
       }
     }
   }
   return flat;
 }, [optionGroups, selectedOptionGroupIds]);

 // Cálculo de gargalo de produção (Estoque Máximo Produzível deste produto)
 const bottleneckAnalysis = useMemo(() => {
   if (items.length === 0 || !Array.isArray(storeSupplies) || storeSupplies.length === 0) return null;

   let minProducible = Infinity;
   let bottleneckItem: { name: string; needed: number; stock: number; unit: string } | null = null;

   for (const item of items) {
     const matchedSupply = (storeSupplies as any[]).find(
       (s: any) => (item.supplyId && s.id === item.supplyId) || s.name.toLowerCase() === item.name.toLowerCase(),
     );

     if (matchedSupply) {
       const stock = Number(matchedSupply.stock_on_hand || 0);
       const needed = Number(item.quantity || 1);
       const producible = needed > 0 ? Math.floor(stock / needed) : Infinity;

       if (producible < minProducible) {
         minProducible = producible;
         bottleneckItem = {
           name: matchedSupply.name,
           needed,
           stock,
           unit: matchedSupply.unit,
         };
       }
     }
   }

   if (minProducible === Infinity) return null;

   return {
     maxProducible: minProducible,
     isZero: minProducible <= 0,
     bottleneck: bottleneckItem,
   };
 }, [items, storeSupplies]);

 const handleSelectCatalogItem = (val: string) => {
   if (!val) return;
   if (val.startsWith("supply:")) {
     const id = val.replace("supply:", "");
     const s = (storeSupplies as any[]).find((x: any) => x.id === id);
     if (s) {
       setNewItemName(s.name);
       setNewItemType(s.category === "packaging" ? "packaging" : "ingredient");
       setNewItemUnit(s.unit as any);
       setNewItemCost((Number(s.cost_cents_per_unit || 0) / 100).toFixed(2));
       setSelectedSupplyId(s.id);
       setSelectedRecipeId(null);
 setSelectedModifierKey("base");
 setIsPrimaryGargalo(true);
  setSelectedModifierKey("base");
  setIsPrimaryGargalo(true);
     }
   } else if (val.startsWith("recipe:")) {
     const id = val.replace("recipe:", "");
     const r = (storeRecipes as any[]).find((x: any) => x.id === id);
     if (r) {
       setNewItemName(r.name);
       setNewItemType("ingredient");
       setNewItemUnit((r.yield_unit || "un") as any);
       setNewItemCost((Number(r.cost_cents_per_yield_unit || 0) / 100).toFixed(2));
       setSelectedRecipeId(r.id);
       setSelectedSupplyId(null);
     }
   }
 };

 // Cálculos da Ficha Técnica
 const summary = useMemo(() => {
 let totalCostCents = 0;
 let ingredientsCostCents = 0;
 let packagingCostCents = 0;

 for (const item of items) {
 const itemTotal = Math.round((item.quantity || 0) * (item.unitCostCents || 0));
 totalCostCents += itemTotal;
 if (item.type === "ingredient") ingredientsCostCents += itemTotal;
 else if (item.type === "packaging") packagingCostCents += itemTotal;
 }

 const grossMarginCents = Math.max(0, productPriceCents - totalCostCents);
 const grossMarginPercent =
 productPriceCents > 0
 ? Math.round((grossMarginCents / productPriceCents) * 100)
 : 0;

 const markup =
 totalCostCents > 0
 ? ((productPriceCents / totalCostCents) * 100 - 100).toFixed(0)
 : "0";

 return {
 totalCostCents,
 ingredientsCostCents,
 packagingCostCents,
 grossMarginCents,
 grossMarginPercent,
 markup,
 };
 }, [items, productPriceCents]);

 const handleAddItem = (e: React.FormEvent) => {
 e.preventDefault();
 if (!newItemName.trim()) {
 toast.error("Informe o nome do insumo ou embalagem.");
 return;
 }

 const qty = parseFloat(newItemQty);
 if (isNaN(qty) || qty <= 0) {
 toast.error("Informe uma quantidade válida.");
 return;
 }

 const costNum = parseFloat(newItemCost.replace(",", "."));
 const costCents = isNaN(costNum) ? 0 : Math.round(costNum * 100);

 const newItem: BomItem = {
 id: Math.random().toString(36).substring(2, 9),
 name: newItemName.trim(),
 type: newItemType,
 quantity: qty,
 unit: newItemUnit,
 unitCostCents: costCents,
 supplyId: selectedSupplyId || undefined,
 recipeId: selectedRecipeId || undefined,
 modifierOptionId:
   selectedModifierKey !== "base" ? selectedModifierKey.split("::")[0] : undefined,
 modifierOptionLabel:
   selectedModifierKey !== "base" ? selectedModifierKey.split("::")[1] : undefined,
 isPrimaryGargalo,
 };

 const updated = [...items, newItem];
 setItems(updated);
 onItemsChange(updated);

 // Reset Form
 setNewItemName("");
 setNewItemQty("1");
 setNewItemCost("");
 setSelectedSupplyId(null);
 setSelectedRecipeId(null);
 setSelectedModifierKey("base");
 setIsPrimaryGargalo(true);
 toast.success("Insumo adicionado à ficha técnica!");
 };

 const handleRemoveItem = (id: string) => {
 const updated = items.filter((i) => i.id !== id);
 setItems(updated);
 onItemsChange(updated);
 };

 const handleApplyCost = () => {
 onApplyCostToProduct(summary.totalCostCents);
 toast.success(
 `Custo do produto atualizado para ${formatMoney(summary.totalCostCents)} com base na Ficha Técnica!`,
 );
 };

 return (
 <Card className="rounded-lg border border-border/80 shadow-xs overflow-hidden">
 <CardHeader className="p-6 bg-muted/20 border-b border-border/60">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
 <div className="space-y-1">
 <CardTitle className="text-base font-bold flex items-center gap-2">
 <Boxes className="size-4 text-primary" />
 <span>Ficha Técnica e Insumos</span>
 <Badge variant="outline" className="text-2xs font-mono uppercase">
 Estoque Composto
 </Badge>
 </CardTitle>
 <CardDescription className="text-xs">
 Cadastre a receita, ingredientes, embalagens e insumos consumidos na produção para calcular o custo real e a margem bruta.
 </CardDescription>
 </div>

 <div className="flex items-center gap-2">
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={handleApplyCost}
 disabled={items.length === 0}
 className="rounded-lg text-xs font-bold h-11 px-4 bg-primary/5 hover:bg-primary/10 text-primary border-primary/20 gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
 >
 <CheckCircle2 className="size-4" />
 <span>Aplicar Custo ({formatMoney(summary.totalCostCents)})</span>
 </Button>
 </div>
 </div>
 </CardHeader>

 <CardContent className="p-6 space-y-6">
 {/* ── Métricas de Custo & Margem ── */}
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-lg bg-muted/30 border border-border/50">
 <div className="space-y-1">
 <span className="text-2xs font-bold uppercase tracking-wider text-muted-foreground">
 Custo Total Composto
 </span>
 <p className="text-base font-extrabold font-mono text-foreground">
 {formatMoney(summary.totalCostCents)}
 </p>
 </div>

 <div className="space-y-1">
 <span className="text-2xs font-bold uppercase tracking-wider text-muted-foreground">
 Preço de Venda
 </span>
 <p className="text-base font-extrabold font-mono text-foreground">
 {formatMoney(productPriceCents)}
 </p>
 </div>

 <div className="space-y-1">
 <span className="text-2xs font-bold uppercase tracking-wider text-muted-foreground">
 Lucro Bruto Unitário
 </span>
 <p className="text-base font-extrabold font-mono text-foreground">
 {formatMoney(summary.grossMarginCents)}
 </p>
 </div>

 <div className="space-y-1">
 <span className="text-2xs font-bold uppercase tracking-wider text-muted-foreground">
 Margem / Markup
 </span>
 <div className="flex items-center gap-1 text-sm font-bold text-foreground">
 <Badge variant="secondary" className="text-xs font-mono">
 {summary.grossMarginPercent}% Margem
 </Badge>
 </div>
 </div>
 </div>

 {/* ── Gargalo de Produção & Estoque Máximo Produzível ── */}
 {bottleneckAnalysis && (
 <div className="p-4 rounded-lg border border-border/80 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
 <div className="flex items-center gap-3">
 <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
 {bottleneckAnalysis.isZero ? <AlertTriangle className="size-5 text-destructive" /> : <Boxes className="size-5" />}
 </div>
 <div>
 <div className="flex items-center gap-2">
 <span className="text-2xs font-bold uppercase tracking-wider text-muted-foreground">
 Capacidade Máxima Produzível
 </span>
 {bottleneckAnalysis.isZero ? (
 <Badge variant="destructive" className="text-2xs font-bold uppercase">
 Esgotado por Insumo
 </Badge>
 ) : (
 <Badge variant="outline" className="text-2xs font-mono">
 Estoque Composto
 </Badge>
 )}
 </div>
 <p className="text-xs font-semibold text-foreground mt-1">
 {bottleneckAnalysis.isZero ? (
 <span className="text-destructive">Item indisponível: um dos insumos essenciais está esgotado no estoque.</span>
 ) : (
 <span>Estoque disponível para produzir até <strong className="font-mono text-sm text-foreground">{bottleneckAnalysis.maxProducible}</strong> unidades deste prato.</span>
 )}
 </p>
 </div>
 </div>

 {bottleneckAnalysis.bottleneck && (
 <div className="text-left sm:text-right shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-border/60">
 <span className="text-2xs text-muted-foreground block">Insumo Gargalo / Limitante:</span>
 <span className="text-xs font-bold font-mono text-foreground">
 {bottleneckAnalysis.bottleneck.name} ({bottleneckAnalysis.bottleneck.stock} {bottleneckAnalysis.bottleneck.unit} restantes)
 </span>
 </div>
 )}
 </div>
 )}

 {/* ── Formulário Rápido de Adição ── */}
 <form
 onSubmit={handleAddItem}
 className="p-4 rounded-lg bg-background border border-border/70 space-y-3"
 >
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
 <span className="text-xs font-bold text-foreground block">
 Adicionar Componente / Insumo
 </span>
 {(storeSupplies.length > 0 || storeRecipes.length > 0) && (
 <div className="w-full sm:w-72">
 <Select onValueChange={handleSelectCatalogItem}>
 <SelectTrigger className="h-11 min-h-11 text-xs rounded-lg border-border/80">
 <SelectValue placeholder="Importar da Despensa ou Receita..." />
 </SelectTrigger>
 <SelectContent className="rounded-lg max-h-60">
 {storeSupplies.length > 0 && (
 <>
 <div className="px-2 py-1 text-2xs font-bold text-muted-foreground uppercase">Insumos da Despensa</div>
 {(storeSupplies as any[]).map((s: any) => (
 <SelectItem key={`sup-${s.id}`} value={`supply:${s.id}`} className="text-xs">
 {s.name} ({s.stock_on_hand} {s.unit} • {formatMoney(s.cost_cents_per_unit)})
 </SelectItem>
 ))}
 </>
 )}
 {storeRecipes.length > 0 && (
 <>
 <div className="px-2 py-1 text-2xs font-bold text-muted-foreground uppercase mt-2">Sub-Receitas da Cozinha</div>
 {(storeRecipes as any[]).map((r: any) => (
 <SelectItem key={`rec-${r.id}`} value={`recipe:${r.id}`} className="text-xs">
 [Receita] {r.name} (Rende {r.yield_quantity} {r.yield_unit})
 </SelectItem>
 ))}
 </>
 )}
 </SelectContent>
 </Select>
 </div>
 )}
 </div>
 <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
 <div className="sm:col-span-4 space-y-1">
 <Label className="text-2xs font-bold">Nome do Insumo / Embalagem</Label>
 <Input
 value={newItemName}
 onChange={(e) => setNewItemName(e.target.value)}
 placeholder="Ex: Pão Australiano, Caixa Kraft 20cm"
 className="h-11 text-xs rounded-lg font-medium"
 />
 </div>

 <div className="sm:col-span-2 space-y-1">
 <Label className="text-2xs font-bold">Tipo</Label>
 <Select
 value={newItemType}
 onValueChange={(v: any) => setNewItemType(v)}
 >
 <SelectTrigger className="h-11 text-xs rounded-lg">
 <SelectValue />
 </SelectTrigger>
 <SelectContent className="rounded-lg">
 <SelectItem value="ingredient">Ingrediente</SelectItem>
 <SelectItem value="packaging">Embalagem</SelectItem>
 <SelectItem value="labor">Mão de Obra</SelectItem>
 <SelectItem value="other">Outro</SelectItem>
 </SelectContent>
 </Select>
 </div>

 <div className="sm:col-span-2 space-y-1">
 <Label className="text-2xs font-bold">Quantidade</Label>
 <Input
 type="number"
 step="0.01"
 min="0.001"
 value={newItemQty}
 onChange={(e) => setNewItemQty(e.target.value)}
 className="h-11 text-xs rounded-lg font-mono"
 />
 </div>

 <div className="sm:col-span-2 space-y-1">
 <Label className="text-2xs font-bold">Custo Unit. (R$)</Label>
 <Input
 type="number"
 step="0.01"
 value={newItemCost}
 onChange={(e) => setNewItemCost(e.target.value)}
 placeholder="0,00"
 className="h-11 text-xs rounded-lg font-mono"
 />
 </div>

 <div className="sm:col-span-2">
 <Button
 type="submit"
 className="w-full h-11 rounded-lg text-xs font-bold bg-primary text-primary-foreground gap-1 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
 >
 <Plus className="size-4" />
 <span>Incluir</span>
 </Button>
 </div>
 </div>
 <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2 border-t border-border/50 items-center">
   <div className="sm:col-span-7 space-y-1">
     <Label className="text-2xs font-bold">
       Escopo do Consumo (Base do Produto vs Sabor / Adicional Específico)
     </Label>
     <Select value={selectedModifierKey} onValueChange={setSelectedModifierKey}>
       <SelectTrigger className="h-11 min-h-11 text-xs rounded-lg">
         <SelectValue />
       </SelectTrigger>
       <SelectContent className="rounded-lg max-h-60">
         <SelectItem value="base" className="text-xs font-semibold">
           Produto Base (Abate em toda venda deste item)
         </SelectItem>
         {availableModifierOptions.map((opt) => (
           <SelectItem
             key={`mod-opt-${opt.id}`}
             value={`${opt.id}::${opt.label}`}
             className="text-xs"
           >
             Sabor / Opção: {opt.label}
           </SelectItem>
         ))}
       </SelectContent>
     </Select>
   </div>
   <div className="sm:col-span-5 flex items-center gap-2 pt-4">
     <button
       type="button"
       onClick={() => setIsPrimaryGargalo((prev) => !prev)}
       className={`h-11 min-h-11 px-3 rounded-lg border text-2xs font-bold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
         isPrimaryGargalo
           ? "bg-primary/10 text-primary border-primary/40"
           : "bg-muted/30 text-muted-foreground border-border"
       }`}
     >
       {isPrimaryGargalo
         ? "Gargalo Ativo: Pausa produto se zerar"
         : "Opcional Secundário: Não pausa produto"}
     </button>
   </div>
 </div>
 </form>

 {/* ── Tabela de Componentes Cadastrados ── */}
 {items.length === 0 ? (
 <div className="p-8 text-center border border-dashed border-border rounded-lg bg-muted/10 space-y-2">
 <Boxes className="size-7 text-muted-foreground mx-auto" />
 <p className="text-xs font-bold text-foreground">Nenhum insumo vinculado</p>
 <p className="text-2xs text-muted-foreground max-w-sm mx-auto">
 Adicione os ingredientes, temperos e embalagens para ter controle de custo e baixa automática na retaguarda.
 </p>
 </div>
 ) : (
 <div className="space-y-2">
 <div className="border border-border/70 rounded-lg overflow-hidden divide-y divide-border/60">
 {items.map((item) => {
 const subtotal = Math.round(item.quantity * item.unitCostCents);
 return (
 <div
 key={item.id}
 className="p-4 flex items-center justify-between gap-3 text-xs hover:bg-muted/20 transition-colors"
 >
 <div className="flex items-center gap-3 min-w-0">
 <div className="size-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
 {item.type === "packaging" ? (
 <Package className="size-4" />
 ) : (
 <Utensils className="size-4" />
 )}
 </div>
 <div className="min-w-0">
 <div className="flex flex-wrap items-center gap-2">
   <p className="font-bold text-foreground truncate">{item.name}</p>
   {item.modifierOptionLabel && (
     <Badge variant="secondary" className="text-3xs font-mono">
       Sabor/Opção: {item.modifierOptionLabel}
     </Badge>
   )}
   {item.isPrimaryGargalo !== false && (
     <Badge variant="outline" className="text-3xs font-mono">
       Gargalo Auto-Pause
     </Badge>
   )}
 </div>
 <span className="text-2xs text-muted-foreground capitalize">
 {item.type === "packaging" ? "Embalagem" : "Ingrediente"} • {item.quantity}{" "}
 {item.unit} x {formatMoney(item.unitCostCents)}
 </span>
 </div>
 </div>

 <div className="flex items-center gap-3 shrink-0">
 <span className="font-mono font-bold text-foreground">
 {formatMoney(subtotal)}
 </span>
 <Button
 type="button"
 variant="ghost"
 size="icon"
 onClick={() => handleRemoveItem(item.id)}
  className="size-11 min-h-11 min-w-11 flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
 >
 <Trash2 className="size-4" />
 </Button>
 </div>
 </div>
 );
 })}
 </div>
 </div>
 )}
 </CardContent>
 </Card>
 );
}
