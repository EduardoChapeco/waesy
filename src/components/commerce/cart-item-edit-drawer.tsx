import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, Plus, Minus, Check, Layers, Loader2, Package, SlidersHorizontal } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/money";
import { getProductBySlug } from "@/services/product.functions";
import { useCartContext } from "@/lib/cart-context";
import { cn } from "@/lib/utils";

interface CartItemEditDrawerProps {
 open: boolean;
 onOpenChange: (open: boolean) => void;
 item: {
 id: string;
 variantId: string;
 productId: string;
 productSlug: string;
 productTitle: string;
 coverUrl?: string | null;
 qty: number;
 priceCents: number;
 variantAttributes?: Record<string, string>;
 selectedOptions?: Record<string, string | string[]>;
 selectedOptionsLabels?: string[];
 } | null;
}

export function CartItemEditDrawer({
 open,
 onOpenChange,
 item,
}: CartItemEditDrawerProps) {
 const { updateItemOptions, isCartUpdating } = useCartContext();

 const [selectedVariantId, setSelectedVariantId] = useState<string>("");
 const [selectedOptions, setSelectedOptions] = useState<Record<string, string | string[]>>({});
 const [quantity, setQuantity] = useState<number>(1);

 // Fetch complete product details (variants, option groups, values)
 const { data: product, isLoading } = useQuery({
 queryKey: ["product-detail-for-cart-edit", item?.productSlug],
 queryFn: () => getProductBySlug({ data: { slug: item!.productSlug } }),
 enabled: Boolean(open && item?.productSlug),
 staleTime: 60_000,
 });

 // Sync initial state when item opens
 useEffect(() => {
 if (item) {
 setSelectedVariantId(item.variantId || "");
 setSelectedOptions(item.selectedOptions || {});
 setQuantity(item.qty || 1);
 }
 }, [item, open]);

 // If variant not yet selected and product loaded, default to item's variant or first variant
 useEffect(() => {
 if (product && !selectedVariantId) {
 const match = product.variants?.find((v) => v.id === item?.variantId);
 if (match) {
 setSelectedVariantId(match.id);
 } else if (product.variants?.[0]) {
 setSelectedVariantId(product.variants[0].id);
 }
 }
 }, [product, item, selectedVariantId]);

 const activeVariant = useMemo(() => {
 if (!product?.variants) return null;
 return product.variants.find((v) => v.id === selectedVariantId) || product.variants[0];
 }, [product, selectedVariantId]);

 // Calculate base price
 const basePriceCents = useMemo(() => {
 if (activeVariant?.effectivePriceCents) return activeVariant.effectivePriceCents;
 if (product?.priceCents) return product.priceCents;
 return item?.priceCents || 0;
 }, [activeVariant, product, item]);

 // Calculate modifier additional cents
 const modifiersExtraCents = useMemo(() => {
 if (!product?.optionGroups) return 0;
 let extra = 0;
 for (const group of product.optionGroups) {
 const val = selectedOptions[group.id];
 if (!val) continue;
 if (Array.isArray(val)) {
 for (const vId of val) {
 const matchedVal = group.values?.find((v: any) => v.id === vId);
 if (matchedVal?.priceModifierCents) {
 extra += matchedVal.priceModifierCents;
 }
 }
 } else {
 const matchedVal = group.values?.find((v: any) => v.id === val);
 if (matchedVal?.priceModifierCents) {
 extra += matchedVal.priceModifierCents;
 }
 }
 }
 return extra;
 }, [product, selectedOptions]);

 const unitTotalCents = basePriceCents + modifiersExtraCents;
 const grandTotalCents = unitTotalCents * quantity;

 // Option Toggling handlers
 const handleSelectSingleOption = (groupId: string, valueId: string) => {
 setSelectedOptions((prev) => {
 if (prev[groupId] === valueId) {
 // Toggle off if not required
 const next = { ...prev };
 delete next[groupId];
 return next;
 }
 return { ...prev, [groupId]: valueId };
 });
 };

 const handleToggleMultipleOption = (groupId: string, valueId: string, maxSelections?: number | null) => {
 setSelectedOptions((prev) => {
 const currentList = Array.isArray(prev[groupId]) ? (prev[groupId] as string[]) : [];
 if (currentList.includes(valueId)) {
 const nextList = currentList.filter((id) => id !== valueId);
 return { ...prev, [groupId]: nextList };
 } else {
 if (maxSelections && currentList.length >= maxSelections) {
 return prev; // Reached limit
 }
 return { ...prev, [groupId]: [...currentList, valueId] };
 }
 });
 };

 const handleSave = async () => {
 if (!item) return;
 await updateItemOptions(item.id, {
 variantId: selectedVariantId || undefined,
 options: selectedOptions,
 quantity,
 });
 onOpenChange(false);
 };

 if (!item) return null;

 return (
 <Sheet open={open} onOpenChange={onOpenChange}>
 <SheetContent
 side="right" size="wide" className="w-full sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw] flex flex-col p-0 bg-background max-sm:!inset-0 max-sm:!h-[100dvh] max-sm:!w-full max-sm:rounded-none max-sm:border-none"
 >
 {/* Cabeçalho Fixo */}
 <SheetHeader className="px-6 py-4 bg-card/60 backdrop-blur-md shrink-0">
 <div className="flex items-center gap-2">
 <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
 <SlidersHorizontal className="size-4" />
 </div>
 <div>
 <SheetTitle className="text-base font-bold text-foreground leading-tight">
 Editar Opções do Item
 </SheetTitle>
 <p className="text-xs text-muted-foreground">
 Ajuste variações, complementos ou quantidade
 </p>
 </div>
 </div>
 </SheetHeader>

 {/* Corpo com Scroll Suave */}
 <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 scrollbar-none">
 {/* Card Resumo do Produto com Foto Grande */}
 <div className="flex items-center gap-4 p-4 rounded-lg bg-card ">
 <div className="size-20 sm:size-24 rounded-lg overflow-hidden bg-muted/30 shrink-0 flex items-center justify-center">
 {item.coverUrl ? (
 <img
 src={item.coverUrl}
 alt={item.productTitle}
 className="size-full object-cover"
 />
 ) : (
 <Package className="size-8 text-muted-foreground" />
 )}
 </div>
 <div className="flex-1 min-w-0 space-y-1">
 <h3 className="text-sm font-bold text-foreground line-clamp-2 leading-tight">
 {item.productTitle}
 </h3>
 <p className="text-xs font-mono font-bold text-primary">
 {formatMoney(unitTotalCents)} / un
 </p>
 {activeVariant?.displayName && (
 <Badge variant="outline" className="text-[10px] font-medium">
 {activeVariant.displayName}
 </Badge>
 )}
 </div>
 </div>

 {isLoading ? (
 <div className="py-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
 <Loader2 className="size-6 animate-spin text-primary" />
 <span className="text-xs">Carregando complementos e variações...</span>
 </div>
 ) : (
 <>
 {/* ── 1. SELEÇÃO DE VARIANTES (Ex: Tamanhos, Cores) ── */}
 {product?.variants && product.variants.length > 1 && (
 <div className="space-y-3">
 <div className="flex items-center justify-between">
 <label className="text-xs font-bold text-foreground uppercase tracking-wider">
 Opção / Variação
 </label>
 <span className="text-[11px] text-muted-foreground">Obrigatório</span>
 </div>

 <div className="grid grid-cols-2 gap-2">
 {product.variants.map((v) => {
 const isSelected = v.id === selectedVariantId;
 const label =
 v.displayName ||
 Object.values(v.attributes || {}).join(" / ") ||
 v.sku;
 return (
 <button
 key={v.id}
 type="button"
 onClick={() => setSelectedVariantId(v.id)}
 className={cn(
 "p-3 rounded-lg border text-left transition-all flex flex-col justify-between cursor-pointer",
 isSelected
 ? "bg-primary/5 border-primary text-foreground "
 : "bg-card border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted/40",
 )}
 >
 <div className="flex items-center justify-between">
 <span className="text-xs font-bold text-foreground block">
 {label}
 </span>
 {isSelected && <Check className="size-3.5 text-primary shrink-0" />}
 </div>
 <span className="text-[11px] font-mono text-muted-foreground mt-1">
 {formatMoney(v.effectivePriceCents)}
 </span>
 </button>
 );
 })}
 </div>
 </div>
 )}

 {/* ── 2. SELEÇÃO DE GRUPOS DE ADICIONAIS / COMPLEMENTOS ── */}
 {product?.optionGroups && product.optionGroups.length > 0 && (
 <div className="space-y-6 pt-2">
 {product.optionGroups.map((group) => {
 const isSingle = group.selectionType === "single";
 const currentVal = selectedOptions[group.id];

 return (
 <div
 key={group.id}
 className="space-y-3 p-4 rounded-lg bg-card "
 >
 <div className="flex items-center justify-between pb-3">
 <div>
 <h4 className="text-xs font-bold text-foreground">
 {group.displayName}
 </h4>
 <p className="text-[10px] text-muted-foreground">
 {isSingle
 ? "Escolha 1 opção"
 : group.maxSelections
 ? `Escolha até ${group.maxSelections} opções`
 : "Escolha quantos quiser"}
 </p>
 </div>
 {group.isRequired && (
 <Badge variant="secondary" className="text-[9px] font-bold">
 Obrigatório
 </Badge>
 )}
 </div>

 <div className="space-y-2 pt-1">
 {group.values?.map((val: any) => {
 const isSelected = isSingle
 ? currentVal === val.id
 : Array.isArray(currentVal) && currentVal.includes(val.id);

 return (
 <button
 key={val.id}
 type="button"
 onClick={() =>
 isSingle
 ? handleSelectSingleOption(group.id, val.id)
 : handleToggleMultipleOption(group.id, val.id, group.maxSelections)
 }
 className={cn(
 "w-full px-4 py-3 rounded-lg border text-left transition-all flex items-center justify-between cursor-pointer",
 isSelected
 ? "bg-primary/5 border-primary/60 text-foreground"
 : "bg-background border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/30",
 )}
 >
 <div className="flex items-center gap-3">
 <div
 className={cn(
 "size-4 rounded flex items-center justify-center border transition-all",
 isSingle && "rounded-full",
 isSelected
 ? "bg-primary border-primary text-primary-foreground"
 : "border-muted-foreground/40 bg-card",
 )}
 >
 {isSelected && <Check className="size-2.5 stroke-[3]" />}
 </div>
 <span className="text-xs font-medium text-foreground">
 {val.label}
 </span>
 </div>

 {val.priceModifierCents > 0 ? (
 <span className="text-xs font-mono font-bold text-primary">
 +{formatMoney(val.priceModifierCents)}
 </span>
 ) : (
 <span className="text-[10px] text-muted-foreground">Grátis</span>
 )}
 </button>
 );
 })}
 </div>
 </div>
 );
 })}
 </div>
 )}

 {/* ── 3. CONTROLE DE QUANTIDADE ── */}
 <div className="flex items-center justify-between p-4 rounded-lg bg-card ">
 <div>
 <span className="text-xs font-bold text-foreground block">
 Quantidade
 </span>
 <span className="text-[11px] text-muted-foreground">
 Ajuste o número de unidades
 </span>
 </div>

 <div className="flex items-center rounded-lg bg-background p-1 ">
 <button
 type="button"
 onClick={() => setQuantity((q) => Math.max(1, q - 1))}
 disabled={quantity <= 1}
 className="size-8 rounded-lg flex items-center justify-center text-foreground hover:bg-muted active:scale-95 disabled:opacity-40 transition-all cursor-pointer"
 aria-label="Diminuir quantidade"
 >
 <Minus className="size-3.5" />
 </button>
 <span className="w-10 text-center text-sm font-mono font-bold text-foreground">
 {quantity}
 </span>
 <button
 type="button"
 onClick={() => setQuantity((q) => q + 1)}
 className="size-8 rounded-lg flex items-center justify-center text-foreground hover:bg-muted active:scale-95 transition-all cursor-pointer"
 aria-label="Aumentar quantidade"
 >
 <Plus className="size-3.5" />
 </button>
 </div>
 </div>
 </>
 )}
 </div>

 {/* Rodapé Fixo com Total e Ação */}
 <div className=" bg-card/90 backdrop-blur-md p-5 pb-safe space-y-3 shrink-0">
 <div className="flex items-center justify-between">
 <div>
 <span className="text-[11px] text-muted-foreground uppercase font-bold tracking-wider">
 Total Atualizado
 </span>
 <div className="text-xl font-black text-foreground font-mono">
 {formatMoney(grandTotalCents)}
 </div>
 </div>

 <Button
 variant="ghost"
 size="sm"
 onClick={() => onOpenChange(false)}
 className="text-xs text-muted-foreground hover:text-foreground"
 >
 Cancelar
 </Button>
 </div>

 <Button
 size="lg"
 onClick={handleSave}
 disabled={isCartUpdating || isLoading}
 className="w-full h-12 rounded-lg bg-foreground text-background font-bold text-sm hover:bg-foreground/90 transition-all cursor-pointer flex items-center justify-center gap-2"
 >
 {isCartUpdating ? (
 <>
 <Loader2 className="size-4 animate-spin" />
 <span>Atualizando carrinho...</span>
 </>
 ) : (
 <>
 <Check className="size-4" />
 <span>Salvar Alterações no Item</span>
 </>
 )}
 </Button>
 </div>
 </SheetContent>
 </Sheet>
 );
}
