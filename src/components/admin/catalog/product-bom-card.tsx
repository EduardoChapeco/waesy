import { useState, useMemo } from "react";
import { Boxes, Plus, Trash2, Package, Sliders, DollarSign, TrendingUp, Percent, CheckCircle2, Layers, Utensils, Box } from 'lucide-react';
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatMoney } from "@/lib/money";

export interface BomItem {
 id: string;
 name: string;
 type: "ingredient" | "packaging" | "labor" | "other";
 quantity: number;
 unit: "un" | "g" | "kg" | "ml" | "l" | "unidade";
 unitCostCents: number;
}

interface ProductBomCardProps {
 initialItems?: BomItem[];
 productPriceCents: number;
 onApplyCostToProduct: (calculatedCostCents: number) => void;
 onItemsChange: (items: BomItem[]) => void;
}

export function ProductBomCard({
 initialItems = [],
 productPriceCents = 0,
 onApplyCostToProduct,
 onItemsChange,
}: ProductBomCardProps) {
 const [items, setItems] = useState<BomItem[]>(initialItems);

 // Form State para adicionar item rápido
 const [newItemName, setNewItemName] = useState("");
 const [newItemType, setNewItemType] = useState<"ingredient" | "packaging" | "labor" | "other">(
 "ingredient",
 );
 const [newItemQty, setNewItemQty] = useState<string>("1");
 const [newItemUnit, setNewItemUnit] = useState<"un" | "g" | "kg" | "ml" | "l" | "unidade">("un");
 const [newItemCost, setNewItemCost] = useState<string>("");

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
 };

 const updated = [...items, newItem];
 setItems(updated);
 onItemsChange(updated);

 // Reset Form
 setNewItemName("");
 setNewItemQty("1");
 setNewItemCost("");
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
 <span>Ficha Técnica e Composição de Insumos</span>
 <Badge variant="outline" className="text-[10px] font-mono uppercase">
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
 className="rounded-lg text-xs font-bold h-9 bg-primary/5 hover:bg-primary/10 text-primary border-primary/20 gap-2"
 >
 <CheckCircle2 className="size-3.5" />
 <span>Aplicar Custo ({formatMoney(summary.totalCostCents)})</span>
 </Button>
 </div>
 </div>
 </CardHeader>

 <CardContent className="p-6 space-y-6">
 {/* ── Métricas de Custo & Margem ── */}
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-lg bg-muted/30 border border-border/50">
 <div className="space-y-1">
 <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
 Custo Total Composto
 </span>
 <p className="text-base font-extrabold font-mono text-foreground">
 {formatMoney(summary.totalCostCents)}
 </p>
 </div>

 <div className="space-y-1">
 <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
 Preço de Venda
 </span>
 <p className="text-base font-extrabold font-mono text-foreground">
 {formatMoney(productPriceCents)}
 </p>
 </div>

 <div className="space-y-1">
 <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
 Lucro Bruto Unitário
 </span>
 <p className="text-base font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
 {formatMoney(summary.grossMarginCents)}
 </p>
 </div>

 <div className="space-y-1">
 <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
 Margem / Markup
 </span>
 <div className="flex items-center gap-1 text-sm font-bold text-foreground">
 <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs font-mono">
 {summary.grossMarginPercent}% Margem
 </Badge>
 </div>
 </div>
 </div>

 {/* ── Formulário Rápido de Adição ── */}
 <form
 onSubmit={handleAddItem}
 className="p-4 rounded-lg bg-background border border-border/70 space-y-3"
 >
 <span className="text-xs font-bold text-foreground block">
 Adicionar Novo Componente / Insumo
 </span>
 <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
 <div className="sm:col-span-4 space-y-1">
 <Label className="text-[11px] font-bold">Nome do Insumo / Embalagem</Label>
 <Input
 value={newItemName}
 onChange={(e) => setNewItemName(e.target.value)}
 placeholder="Ex: Pão Australiano, Caixa Kraft 20cm"
 className="h-9 text-xs rounded-lg font-medium"
 />
 </div>

 <div className="sm:col-span-2 space-y-1">
 <Label className="text-[11px] font-bold">Tipo</Label>
 <Select
 value={newItemType}
 onValueChange={(v: any) => setNewItemType(v)}
 >
 <SelectTrigger className="h-9 text-xs rounded-lg">
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
 <Label className="text-[11px] font-bold">Quantidade</Label>
 <Input
 type="number"
 step="0.01"
 min="0.001"
 value={newItemQty}
 onChange={(e) => setNewItemQty(e.target.value)}
 className="h-9 text-xs rounded-lg font-mono"
 />
 </div>

 <div className="sm:col-span-2 space-y-1">
 <Label className="text-[11px] font-bold">Custo Unit. (R$)</Label>
 <Input
 type="number"
 step="0.01"
 value={newItemCost}
 onChange={(e) => setNewItemCost(e.target.value)}
 placeholder="0,00"
 className="h-9 text-xs rounded-lg font-mono"
 />
 </div>

 <div className="sm:col-span-2">
 <Button
 type="submit"
 className="w-full h-9 rounded-lg text-xs font-bold bg-primary text-primary-foreground gap-1"
 >
 <Plus className="size-3.5" />
 <span>Incluir</span>
 </Button>
 </div>
 </div>
 </form>

 {/* ── Tabela de Componentes Cadastrados ── */}
 {items.length === 0 ? (
 <div className="p-8 text-center border border-dashed border-border rounded-lg bg-muted/10 space-y-2">
 <Boxes className="size-7 text-muted-foreground mx-auto" />
 <p className="text-xs font-bold text-foreground">Nenhum insumo vinculado</p>
 <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
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
 <Package className="size-3.5" />
 ) : (
 <Utensils className="size-3.5" />
 )}
 </div>
 <div className="min-w-0">
 <p className="font-bold text-foreground truncate">{item.name}</p>
 <span className="text-[10px] text-muted-foreground capitalize">
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
 className="size-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
 >
 <Trash2 className="size-3.5" />
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
