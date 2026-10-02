import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Plus, Minus, UtensilsCrossed, Send, Loader2 } from "lucide-react";
import { listAdminProducts } from "@/services/admin-catalog.functions";
import { addItemsToTableComanda } from "@/services/order.functions";
import { formatMoney } from "@/lib/money";
import { getNicheSemantics } from "@/lib/niche-semantics";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface QuickWaiterOrderModalProps {
 open: boolean;
 onOpenChange: (open: boolean) => void;
 tableNumber: string;
 orderId?: string;
 store?: any;
 onSuccess?: () => void;
}

interface DraftItem {
 product: any;
 variant: any;
 qty: number;
 notes?: string;
}

export function QuickWaiterOrderModal({
 open,
 onOpenChange,
 tableNumber,
 orderId,
 store,
 onSuccess,
}: QuickWaiterOrderModalProps) {
 const queryClient = useQueryClient();
 const semantics = getNicheSemantics(store);
 const [search, setSearch] = useState("");
 const [selectedCategory, setSelectedCategory] = useState<string>("all");
 const [draftItems, setDraftItems] = useState<Record<string, DraftItem>>({});

 const { data: catalog = [], isLoading } = useQuery({
 queryKey: ["admin-products-catalog"],
 queryFn: () => listAdminProducts(),
 enabled: open,
 staleTime: 60_000,
 });

 // Categorias extraídas dos produtos
 const categories = useMemo(() => {
 const set = new Set<string>();
 (catalog || []).forEach((p: any) => {
 if (p.category?.name) set.add(p.category.name);
 else if (p.category_name) set.add(p.category_name);
 });
 return Array.from(set);
 }, [catalog]);

 // Lista achatada de produtos ativos
 const flatProducts = useMemo(() => {
 const activeProds = (catalog || []).filter((p: any) => p.status !== "archived");
 return activeProds.filter((p: any) => {
 const matchCategory =
 selectedCategory === "all" ||
 p.category?.name === selectedCategory ||
 p.category_name === selectedCategory;

 if (!matchCategory) return false;

 if (!search.trim()) return true;
 const q = search.toLowerCase();
 return (
 p.title.toLowerCase().includes(q) ||
 (p.sku && p.sku.toLowerCase().includes(q))
 );
 });
 }, [catalog, search, selectedCategory]);

 const handleIncrement = (product: any) => {
 setDraftItems((prev) => {
 const current = prev[product.id];
 const nextQty = (current?.qty || 0) + 1;
 return {
 ...prev,
 [product.id]: {
 product,
 variant: product.variants?.[0] || { id: product.id, price_override_cents: product.price_cents },
 qty: nextQty,
 },
 };
 });
 };

 const handleDecrement = (productId: string) => {
 setDraftItems((prev) => {
 const current = prev[productId];
 if (!current) return prev;
 if (current.qty <= 1) {
 const next = { ...prev };
 delete next[productId];
 return next;
 }
 return {
 ...prev,
 [productId]: {
 ...current,
 qty: current.qty - 1,
 },
 };
 });
 };

 const totalItemsCount = useMemo(() => {
 return Object.values(draftItems).reduce((acc, it) => acc + it.qty, 0);
 }, [draftItems]);

 const totalDraftCents = useMemo(() => {
 return Object.values(draftItems).reduce((acc, it) => {
 const unitCents = it.variant?.price_override_cents ?? it.product.price_cents ?? 0;
 return acc + unitCents * it.qty;
 }, 0);
 }, [draftItems]);

 const sendMutation = useMutation({
 mutationFn: async () => {
 const itemsPayload = Object.values(draftItems).map((it) => {
 const unitCents = it.variant?.price_override_cents ?? it.product.price_cents ?? 0;
 return {
 productId: it.product.id,
 variantId: it.variant?.id && it.variant.id !== it.product.id ? it.variant.id : null,
 productTitle: it.product.title,
 qty: it.qty,
 unitPriceCents: unitCents,
 totalCents: unitCents * it.qty,
 selectedOptions: {},
 notes: it.notes || null,
 };
 });

 return await addItemsToTableComanda({
 data: {
 tableNumber,
 orderId,
 items: itemsPayload,
 },
 });
 },
 onSuccess: () => {
 toast.success(`Pedido da Mesa ${tableNumber} enviado para a cozinha!`);
 queryClient.invalidateQueries({ queryKey: ["salon-tables-overview"] });
 setDraftItems({});
 onOpenChange(false);
 onSuccess?.();
 },
 onError: (err: any) => {
 toast.error(err.message || "Erro ao disparar itens para a cozinha.");
 },
 });

 return (
 <Sheet open={open} onOpenChange={onOpenChange}>
 <SheetContent
 side="right" size="wide" className="sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw] md:max-w-3xl w-full max-sm:!h-[100dvh] max-sm:!inset-0 max-sm:!rounded-none border-l p-0 gap-0 overflow-hidden bg-card flex flex-col"
 >
 {/* Header */}
 <SheetHeader className="p-4 sm:p-5 border-b border-border/80 bg-muted/20 text-left">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
 <UtensilsCrossed className="size-4" />
 </div>
 <div>
 <SheetTitle className="text-base font-bold text-foreground flex items-center gap-2">
 <span>
 {semantics.isFoodBusiness
 ? `Comanda Rápida — Mesa ${tableNumber}`
 : `Atendimento Rápido — Ponto ${tableNumber}`}
 </span>
 <Badge variant="outline" className="text-[10px] font-mono">
 {semantics.isFoodBusiness ? "Salão & Cozinha" : "Balcão & Pedidos"}
 </Badge>
 </SheetTitle>
 <p className="text-xs text-muted-foreground">
 {semantics.isFoodBusiness
 ? "Lançamento tátil de pedidos com disparo instantâneo para produção"
 : "Lançamento rápido de itens diretamente para o pedido"}
 </p>
 </div>
 </div>
 </div>

 {/* Busca & Chips de Categoria */}
 <div className="mt-3 space-y-2">
 <div className="relative">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
 <Input
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 placeholder="Buscar produto por nome..."
 className="pl-9 h-9 text-xs rounded-lg bg-background"
 autoFocus
 />
 </div>

 {categories.length > 0 && (
 <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
 <button
 type="button"
 onClick={() => setSelectedCategory("all")}
 className={cn(
 "px-3 py-1 rounded-lg font-bold text-[11px] whitespace-nowrap transition-colors cursor-pointer",
 selectedCategory === "all"
 ? "bg-primary text-primary-foreground"
 : "bg-muted text-muted-foreground hover:text-foreground",
 )}
 >
 Todos
 </button>
 {categories.map((cat) => (
 <button
 key={cat}
 type="button"
 onClick={() => setSelectedCategory(cat)}
 className={cn(
 "px-3 py-1 rounded-lg font-bold text-[11px] whitespace-nowrap transition-colors cursor-pointer",
 selectedCategory === cat
 ? "bg-primary text-primary-foreground"
 : "bg-muted text-muted-foreground hover:text-foreground",
 )}
 >
 {cat}
 </button>
 ))}
 </div>
 )}
 </div>
 </SheetHeader>

 {/* Lista de Produtos */}
 <ScrollArea className="flex-1 p-4 max-h-[50vh]">
 {isLoading ? (
 <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
 <Loader2 className="size-6 animate-spin text-primary" />
 <span className="text-xs font-medium">Carregando cardápio...</span>
 </div>
 ) : flatProducts.length === 0 ? (
 <div className="text-center py-16 text-muted-foreground text-xs">
 Nenhum produto encontrado.
 </div>
 ) : (
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 {flatProducts.map((prod: any) => {
 const inDraft = draftItems[prod.id];
 const qty = inDraft?.qty || 0;
 const priceCents = prod.price_cents || 0;

 return (
 <div
 key={prod.id}
 className={cn(
 "p-3 rounded-lg border flex items-center justify-between gap-3 transition-all",
 qty > 0
 ? "border-primary/50 bg-primary/5 shadow-2xs"
 : "border-border/60 bg-card hover:border-border",
 )}
 >
 <div className="flex-1 min-w-0">
 <h4 className="font-bold text-xs text-foreground truncate">
 {prod.title}
 </h4>
 <span className="text-xs font-mono font-black text-primary">
 {formatMoney(priceCents)}
 </span>
 </div>

 {/* Stepper (+ / -) */}
 <div className="flex items-center gap-2 shrink-0">
 {qty > 0 ? (
 <>
 <Button
 type="button"
 size="icon"
 variant="outline"
 className="size-7 rounded-lg h-7 w-7"
 onClick={() => handleDecrement(prod.id)}
 >
 <Minus className="size-3" />
 </Button>
 <span className="size-6 font-mono font-black text-xs flex items-center justify-center text-foreground">
 {qty}
 </span>
 <Button
 type="button"
 size="icon"
 variant="default"
 className="size-7 rounded-lg h-7 w-7"
 onClick={() => handleIncrement(prod)}
 >
 <Plus className="size-3" />
 </Button>
 </>
 ) : (
 <Button
 type="button"
 size="sm"
 variant="secondary"
 className="h-7 px-2 text-xs font-bold rounded-lg gap-1 cursor-pointer"
 onClick={() => handleIncrement(prod)}
 >
 <Plus className="size-3" />
 <span>Adicionar</span>
 </Button>
 )}
 </div>
 </div>
 );
 })}
 </div>
 )}
 </ScrollArea>

 {/* Barra de Ação Inferior — Thumb Zone (44px min-height) */}
 <div className="p-4 border-t border-border/80 bg-card flex items-center justify-between gap-3 shrink-0">
 <div className="space-y-1">
 <span className="text-[10px] uppercase font-bold text-muted-foreground block">
 {totalItemsCount === 1 ? "1 item selecionado" : `${totalItemsCount} itens selecionados`}
 </span>
 <span className="text-lg font-mono font-black text-foreground">
 {formatMoney(totalDraftCents)}
 </span>
 </div>

 <div className="flex items-center gap-2">
 <Button
 type="button"
 variant="ghost"
 size="sm"
 onClick={() => onOpenChange(false)}
 className="rounded-lg text-xs font-semibold"
 >
 Cancelar
 </Button>
 <Button
 type="button"
 size="sm"
 disabled={totalItemsCount === 0 || sendMutation.isPending}
 onClick={() => sendMutation.mutate()}
 className="h-11 px-5 rounded-lg font-bold text-xs bg-primary text-primary-foreground gap-2 cursor-pointer shadow-sm"
 >
 {sendMutation.isPending ? (
 <Loader2 className="size-4 animate-spin" />
 ) : (
 <Send className="size-4" />
 )}
 <span>
 {semantics.isFoodBusiness
 ? "Disparar para a Cozinha"
 : "Lançar Itens no Pedido"}
 </span>
 </Button>
 </div>
 </div>
 </SheetContent>
 </Sheet>
 );
}
