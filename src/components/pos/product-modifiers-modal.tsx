import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
 Sheet,
 SheetContent,
 SheetHeader,
 SheetTitle,
 SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Utensils, Check, Plus, Loader2, AlertCircle, Compass, Layers, ShoppingBag } from 'lucide-react';
import { formatMoney } from "@/lib/money";
import { getModifiersByProduct } from "@/services/modifiers.functions";
import { getNicheSemantics } from "@/lib/niche-semantics";

export interface SelectedModifier {
 groupId: string;
 groupTitle: string;
 modifierId: string;
 title: string;
 priceDeltaCents: number;
}

export interface ProductModifiersModalProps {
  open?: boolean;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
  product: any;
  variant?: any;
  store?: any;
  onConfirm: (
    product: any,
    variant: any,
    selectedModifiers: SelectedModifier[],
    notes?: string,
  ) => void | Promise<void>;
}

export function ProductModifiersModal({
  open: openProp,
  isOpen,
  onOpenChange,
  onClose,
  product,
  variant,
  store,
  onConfirm,
}: ProductModifiersModalProps) {
  const open = openProp ?? isOpen ?? false;
  const setOpen = (val: boolean) => {
    onOpenChange?.(val);
    if (!val) onClose?.();
  };
  const [selectedModifiers, setSelectedModifiers] = useState<SelectedModifier[]>([]);
 const [notes, setNotes] = useState("");

 const semantics = useMemo(
 () => getNicheSemantics(store || product?.store),
 [store, product],
 );

 const IconComponent = useMemo(() => {
 if (semantics.nicheId === "tourism") return Compass;
 if (semantics.nicheId === "services") return Layers;
 if (semantics.nicheId === "retail") return ShoppingBag;
 if (semantics.nicheId === "gastronomy") return Utensils;
 return Layers;
 }, [semantics.nicheId]);

 const productId = product?.id;

 const { data: modifierGroups, isLoading } = useQuery({
 queryKey: ["product-modifiers", productId],
 queryFn: () => getModifiersByProduct({ data: productId }),
 enabled: !!productId && open,
 });

 // Reset state when modal opens with a new product
 useEffect(() => {
 if (open) {
 setSelectedModifiers([]);
 setNotes("");
 }
 }, [open, productId]);

 const basePriceCents = variant?.price_cents || product?.price_cents || 0;
 const modifiersTotalCents = selectedModifiers.reduce((acc, m) => acc + m.priceDeltaCents, 0);
 const finalUnitPriceCents = basePriceCents + modifiersTotalCents;

 const handleToggleModifier = (group: any, mod: any) => {
 const isSingleChoice = group.max_selections === 1;

 if (isSingleChoice) {
 // Remove any existing selection from this group and add new one
 const filtered = selectedModifiers.filter((m) => m.groupId !== group.id);
 setSelectedModifiers([
 ...filtered,
 {
 groupId: group.id,
 groupTitle: group.title,
 modifierId: mod.id,
 title: mod.title,
 priceDeltaCents: mod.price_delta_cents || 0,
 },
 ]);
 } else {
 // Multi choice
 const exists = selectedModifiers.some((m) => m.modifierId === mod.id);
 if (exists) {
 setSelectedModifiers(selectedModifiers.filter((m) => m.modifierId !== mod.id));
 } else {
 const currentCountInGroup = selectedModifiers.filter((m) => m.groupId === group.id).length;
 if (currentCountInGroup < group.max_selections) {
 setSelectedModifiers([
 ...selectedModifiers,
 {
 groupId: group.id,
 groupTitle: group.title,
 modifierId: mod.id,
 title: mod.title,
 priceDeltaCents: mod.price_delta_cents || 0,
 },
 ]);
 }
 }
 }
 };

 // Validation: Check required groups
 const isValid = (modifierGroups || []).every((group: any) => {
 if (!group.is_required && group.min_selections === 0) return true;
 const selectedInGroup = selectedModifiers.filter((m) => m.groupId === group.id).length;
 return selectedInGroup >= group.min_selections;
 });

 const handleConfirm = () => {
 if (!isValid) return;
 onConfirm(product, variant, selectedModifiers, notes.trim() || undefined);
 setOpen(false);
 };

 if (!product) return null;

 return (
 <Sheet open={open} onOpenChange={setOpen}>
 <SheetContent
 side="right" size="wide" className="sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw] md:max-w-xl w-full max-sm:!h-[100dvh] max-sm:!inset-0 max-sm:!rounded-none border-l p-0 overflow-hidden bg-card flex flex-col"
 >
 <SheetHeader className="p-4 sm:p-5 border-b border-border/80 bg-muted/20 text-left space-y-1">
 <div className="flex items-center gap-2">
 <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
 <IconComponent className="size-4" />
 </div>
 <div>
 <SheetTitle className="text-base font-bold text-foreground">
 {product.title || product.name}
 </SheetTitle>
 <SheetDescription className="text-xs text-muted-foreground">
 {semantics.modifierModalSubtitle}
 </SheetDescription>
 </div>
 </div>
 </SheetHeader>

 {isLoading ? (
 <div className="py-12 flex flex-col items-center justify-center gap-2 text-muted-foreground">
 <Loader2 className="size-6 animate-spin text-primary" />
 <p className="text-xs">Carregando complementos...</p>
 </div>
 ) : (
 <div className="overflow-y-auto no-scrollbar space-y-5 py-3 pr-1 my-2 flex-1">
 {modifierGroups && modifierGroups.length > 0 ? (
 modifierGroups.map((group: any) => {
 const countInGroup = selectedModifiers.filter((m) => m.groupId === group.id).length;
 const isGroupSatisfied = countInGroup >= group.min_selections;

 return (
 <div
 key={group.id}
 className="space-y-2.5 bg-muted/10 p-3.5 rounded-xl"
 >
 <div className="flex items-center justify-between">
 <div className="space-y-0.5">
 <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
 {group.title}
 {group.is_required && (
 <span className="text-[10px] font-bold text-destructive uppercase tracking-wider">
 • Obrigatório
 </span>
 )}
 </span>
 {group.description && (
 <p className="text-[11px] text-muted-foreground">{group.description}</p>
 )}
 </div>

 <span className="text-[10px] text-muted-foreground font-mono">
 {group.max_selections === 1 ? "Escolha 1" : `Até ${group.max_selections}`}
 </span>
 </div>

 <div className="space-y-2">
 {(group.modifiers || []).map((mod: any) => {
 const isSelected = selectedModifiers.some((m) => m.modifierId === mod.id);

 return (
 <button
 key={mod.id}
 type="button"
 onClick={() => handleToggleModifier(group, mod)}
 className={`w-full flex items-center justify-between min-h-[48px] px-3.5 py-3 rounded-xl text-sm transition-colors text-left border cursor-pointer ${
 isSelected
 ? "border-primary bg-primary/10 text-primary font-semibold shadow-2xs"
 : "border-border/70 bg-background hover:bg-muted/40 text-foreground"
 }`}
 >
 <span className="flex items-center gap-2.5">
 <span
 className={`size-5 rounded-md border flex items-center justify-center text-xs ${
 isSelected
 ? "bg-primary text-primary-foreground border-primary"
 : "border-border bg-background"
 }`}
 >
 {isSelected && <Check className="size-3.5 stroke-[3]" />}
 </span>
 <span className="font-medium text-sm text-foreground">{mod.title}</span>
 </span>

 <span className="font-mono text-xs sm:text-sm font-semibold text-muted-foreground">
 {mod.price_delta_cents > 0
 ? `+ ${formatMoney(mod.price_delta_cents)}`
 : "Grátis"}
 </span>
 </button>
 );
 })}
 </div>
 </div>
 );
 })
 ) : (
 <p className="text-sm text-muted-foreground text-center py-6">
 {semantics.modifierEmptyText}
 </p>
 )}

 {/* Observações Contextualizadas */}
 <div className="space-y-2 pt-1">
 <Label className="text-xs sm:text-sm font-semibold">{semantics.modifierNotesLabel}</Label>
 <Textarea
 value={notes}
 onChange={(e) => setNotes(e.target.value)}
 placeholder={semantics.modifierNotesPlaceholder}
 rows={3}
 className="rounded-xl text-sm bg-background resize-none min-h-[80px]"
 />
 </div>
 </div>
 )}

 <div className="p-4 sm:p-5 border-t border-border/80 bg-card flex items-center justify-between gap-3 shrink-0">
 <div className="space-y-0.5">
 <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
 Total Unitário
 </span>
 <span className="text-lg font-black text-foreground font-mono">
 {formatMoney(finalUnitPriceCents)}
 </span>
 </div>

 <div className="flex items-center gap-2">
 <Button
 type="button"
 variant="ghost"
 onClick={() => setOpen(false)}
 className="h-11 px-4 rounded-xl text-sm font-medium cursor-pointer"
 >
 Cancelar
 </Button>

 <Button
 type="button"
 onClick={handleConfirm}
 disabled={!isValid || isLoading}
 className="h-11 px-5 rounded-xl text-sm font-bold gap-2 bg-primary text-primary-foreground shadow-xs cursor-pointer"
 >
 <Plus className="size-4" />
 <span>Adicionar ao Pedido</span>
 </Button>
 </div>
 </div>
 </SheetContent>
 </Sheet>
 );
}
