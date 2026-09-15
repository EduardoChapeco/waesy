import { createFileRoute, useNavigate, Link, isRedirect, useRouter } from "@tanstack/react-router";
import { useState, useMemo, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
 ShoppingCart,
 Search,
 CreditCard,
 Banknote,
 QrCode,
 MonitorPause,
 X,
 Plus,
 Minus,
 Receipt,
 Percent,
 Utensils,
 Printer,
 Barcode,
 CheckCircle2,
 Maximize2,
 Minimize2,
 ExternalLink,
 Keyboard,
 User,
 Coffee,
 ShoppingBag,
 Clock,
 ArrowUpRight,
 ArrowDownLeft,
 Trash2,
 Layers,
 Image as ImageIcon,
 Share2,
 Loader2,
 ChefHat,
 Armchair,
 Users,
} from "lucide-react";
import { printThermalReceipt, type ThermalReceiptData } from "@/lib/thermal-printer";
import {
 getActiveRegister,
 openRegister,
 processPOSSale,
 addRegisterEntry,
} from "@/services/cash.functions";
import { listAdminProducts } from "@/services/admin-catalog.functions";
import { formatMoney } from "@/lib/money";
import { formatDateTime } from "@/lib/datetime";
import { parseCurrencyInputToCents } from "@/lib/cash";
import { addItemsToTableComanda } from "@/services/order.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
 Sheet,
 SheetContent,
 SheetHeader,
 SheetTitle,
 SheetDescription,
 SheetFooter,
} from "@/components/ui/sheet";
import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
 DialogDescription,
 DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
 ProductModifiersModal,
 type SelectedModifier,
} from "@/components/pos/product-modifiers-modal";
import { listPriceTables, type PriceTableDTO } from "@/services/price-tables.functions";
import { getStoreSettings } from "@/services/store.functions";
import { getNicheSemantics } from "@/lib/niche-semantics";

function QuickOpenRegisterInlineCard() {
 const router = useRouter();
 const [initialAmountStr, setInitialAmountStr] = useState("100,00");
 const [notes, setNotes] = useState("");
 const [isOpening, setIsOpening] = useState(false);

 const presets = ["0,00", "50,00", "100,00", "200,00"];

 const handleOpen = async (e: React.FormEvent) => {
 e.preventDefault();
 setIsOpening(true);
 try {
 const cleanNum = parseFloat(initialAmountStr.replace(/\./g, "").replace(",", ".")) || 0;
 const initialBalanceCents = Math.round(cleanNum * 100);

 await openRegister({
 data: {
 initialBalanceCents,
 notes: notes.trim() || "Abertura rápida no terminal PDV",
 },
 });

 toast.success("Caixa aberto com sucesso! Iniciando terminal...");
 await router.invalidate();
 } catch (err: any) {
 toast.error(err?.message || "Erro ao abrir o caixa.");
 } finally {
 setIsOpening(false);
 }
 };

 return (
 <div className="flex min-h-[80vh] items-center justify-center p-4 bg-muted/20 animate-in fade-in duration-200">
 <div className="w-full max-w-md p-6 bg-card rounded-2xl border border-border/80 shadow-xs space-y-5 text-center">
 <div className="size-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
 <Banknote className="size-7" />
 </div>
 <div className="space-y-1">
 <h2 className="text-xl font-bold text-foreground">Abertura de Caixa</h2>
 <p className="text-muted-foreground text-xs">
 Informe o fundo de troco inicial para liberar as vendas no PDV.
 </p>
 </div>

 <form onSubmit={handleOpen} className="space-y-4 text-left">
 <div className="space-y-1.5">
 <Label className="text-xs font-bold text-muted-foreground">Fundo de Troco Inicial (R$)</Label>
 <Input
 type="text"
 value={initialAmountStr}
 onChange={(e) => setInitialAmountStr(e.target.value)}
 placeholder="0,00"
 className="text-lg font-bold text-center h-12 rounded-xl"
 autoFocus
 />
 </div>

 <div className="flex items-center justify-center gap-2">
 {presets.map((val) => (
 <button
 key={val}
 type="button"
 onClick={() => setInitialAmountStr(val)}
 className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
 initialAmountStr === val
 ? "bg-primary text-primary-foreground border-primary"
 : "bg-muted/40 text-muted-foreground hover:text-foreground border-border/40"
 }`}
 >
 R$ {val}
 </button>
 ))}
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-bold text-muted-foreground">Observação (Opcional)</Label>
 <Input
 type="text"
 value={notes}
 onChange={(e) => setNotes(e.target.value)}
 placeholder="Ex: Turno da Tarde / Balcão 1"
 className="text-xs rounded-xl h-10"
 />
 </div>

 <Button
 type="submit"
 disabled={isOpening}
 className="w-full text-xs font-bold rounded-xl h-11 bg-primary text-primary-foreground gap-2 cursor-pointer"
 >
 {isOpening ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
 <span>{isOpening ? "Abrindo Turno..." : "Abrir Caixa & Iniciar Vendas"}</span>
 </Button>
 </form>
 </div>
 </div>
 );
}

export const Route = createFileRoute("/workspace/pdv/")({
 validateSearch: (search: Record<string, unknown>): { mesa?: string; orderId?: string } => ({
 mesa: typeof search.mesa === "string" ? search.mesa : undefined,
 orderId: typeof search.orderId === "string" ? search.orderId : undefined,
 }),
 head: () => ({ meta: [{ title: "Frente de Caixa (PDV) Pro | Waesy" }] }),
 loader: async () => {
   try {
 const activeRegister = await getActiveRegister();
 if (!activeRegister) {
 throw new Error("CAIXA_FECHADO");
 }

 if (activeRegister.isExpired) {
 throw new Error("CAIXA_EXPIRADO");
 }

 const [catalog, priceTables, store] = await Promise.all([
 listAdminProducts().catch(() => []),
 listPriceTables().catch(() => []),
 getStoreSettings().catch(() => null),
 ]);

 return { activeRegister, catalog: catalog || [], priceTables: priceTables || [], store };
   } catch (err) {
     console.error("[loader:workspace.pdv.index] Unhandled loader error:", err);
     return { activeRegister: null, catalog: null, priceTables: null, store: null };
   }
 },
 errorComponent: ({ error }) => {
 if (isRedirect(error)) {
 throw error;
 }
 if ((error instanceof Error ? error.message : String(error)) === "CAIXA_FECHADO") {
 return <QuickOpenRegisterInlineCard />;
 }
 if (
 (error instanceof Error ? error.message : String(error)) === "CAIXA_EXPIRADO" ||
 (error instanceof Error ? error.message : String(error)).includes("CAIXA_EXPIRADO")
 ) {
 return (
 <div className="flex h-[80vh] items-center justify-center p-4 bg-muted/20">
 <div className="w-full max-w-md text-center bg-card border border-destructive/40 p-8 rounded-2xl space-y-4">
 <div className="size-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
 <MonitorPause className="size-8" />
 </div>
 <div className="space-y-1">
 <h2 className="text-xl font-bold text-foreground">Turno Expirado (+24h)</h2>
 <p className="text-muted-foreground text-xs">
 Este caixa está aberto há mais de 24 horas. Feche o turno atual para auditar os valores e continuar operando.
 </p>
 </div>
 <Button
 size="lg"
 className="w-full text-xs font-bold rounded-xl h-11"
 asChild
 >
 <Link to="/workspace/financeiro/caixa">Ir para Fechamento de Turno</Link>
 </Button>
 </div>
 </div>
 );
 }
 return (
 <div className="p-6 text-sm text-destructive font-medium">
 Erro no PDV: {error instanceof Error ? error.message : String(error)}
 </div>
 );
 },
 component: PdvTerminal,
});

interface CartItem {
 id: string;
 product: any;
 variant: any;
 qty: number;
 selectedModifiers: SelectedModifier[];
 notes?: string;
 unitPriceCents: number;
}

interface SplitPayment {
 method: "cash" | "pix" | "credit" | "debit" | "other";
 amountCents: number;
 payerLabel?: string;
}

function PdvTerminal() {
 const { activeRegister, catalog, priceTables, store } = ((Route.useLoaderData?.() as any) || {});
 const search = Route.useSearch() as { mesa?: string; orderId?: string };
 const semantics = useMemo(() => getNicheSemantics(store), [store]);
 const availableModes = useMemo(
 () =>
 semantics.posServiceModes && semantics.posServiceModes.length > 0
 ? semantics.posServiceModes
 : [
 { id: "counter", label: "Balcão (Takeout)", placeholder: "Nome do Cliente" },
 { id: "table", label: "Mesa / Salão", placeholder: "Nº da Mesa" },
 { id: "delivery", label: "Delivery", placeholder: "Endereço / Telefone" },
 ],
 [semantics],
 );

 const [cart, setCart] = useState<CartItem[]>([]);
 const [searchQuery, setSearchQuery] = useState("");
 const [selectedCategory, setSelectedCategory] = useState<string>("all");
 const [serviceMode, setServiceMode] = useState<string>(() => (search.mesa ? "table" : (availableModes[0]?.id || "counter")));
 const [tableOrComandaNumber, setTableOrComandaNumber] = useState(search.mesa || "");

 const [isProcessing, setIsProcessing] = useState(false);
 const [checkoutOpen, setCheckoutOpen] = useState(false);
 const [modifiersModalOpen, setModifiersModalOpen] = useState(false);
 const [receiptModalOpen, setReceiptModalOpen] = useState(false);
 const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);
 const [quickMovementModalOpen, setQuickMovementModalOpen] = useState(false);
 const [quickMovementType, setQuickMovementType] = useState<"sangria" | "suprimento">("sangria");
 const [quickMovementAmount, setQuickMovementAmount] = useState("");
 const [quickMovementReason, setQuickMovementReason] = useState("");

 const [isFullscreen, setIsFullscreen] = useState(false);
 const [lastSaleReceipt, setLastSaleReceipt] = useState<any | null>(null);

 const [selectedItemForModifiers, setSelectedItemForModifiers] = useState<{
 product: any;
 variant: any;
 } | null>(null);

 const searchInputRef = useRef<HTMLInputElement>(null);

 // Tabelas de Preço & Cliente
 const defaultTable = (priceTables || []).find((t: any) => t.is_default) || (priceTables || [])[0];
 const [selectedTableId, setSelectedTableId] = useState<string>(defaultTable?.id || "default");
 const [customerDoc, setCustomerDoc] = useState("");

 const activeTable = useMemo(() => {
 return (priceTables || []).find((t: any) => t.id === selectedTableId) || defaultTable;
 }, [priceTables, selectedTableId, defaultTable]);

 // Função para calcular o preço ajustado de acordo com a tabela
 const calculateTablePrice = (baseCents: number) => {
 if (!activeTable) return baseCents;
 if (activeTable.adjustment_type === "percentage_discount") {
 const discount = (baseCents * Number(activeTable.adjustment_value || 0)) / 100;
 return Math.max(0, Math.round(baseCents - discount));
 }
 if (activeTable.adjustment_type === "percentage_markup") {
 const markup = (baseCents * Number(activeTable.adjustment_value || 0)) / 100;
 return Math.round(baseCents + markup);
 }
 return baseCents;
 };

 // Múltiplos pagamentos no checkout
 const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<"cash" | "pix" | "credit" | "debit" | "other">("cash");
 const [splitPayments, setSplitPayments] = useState<SplitPayment[]>([]);
 const [paymentAmountInput, setPaymentAmountInput] = useState("");
 const [discountInput, setDiscountInput] = useState("");
 const [splitCount, setSplitCount] = useState<number>(1);

 // Categorias extraídas dos produtos
 const categories = useMemo(() => {
 const set = new Set<string>();
 catalog.forEach((p: any) => {
 if (p.category?.name) set.add(p.category.name);
 else if (p.category_name) set.add(p.category_name);
 });
 return Array.from(set);
 }, [catalog]);

 // Lista achatada de produtos
 const flatProducts = useMemo(() => {
 const flat: any[] = [];
 catalog.forEach((p: any) => {
 const variants = p.product_variants || p.variants || [];
 if (variants.length > 0) {
 variants.forEach((v: any) => {
 flat.push({ product: p, variant: v });
 });
 } else {
 flat.push({
 product: p,
 variant: { id: p.id, sku: p.sku || p.slug, price_override_cents: p.price_cents },
 });
 }
 });
 return flat;
 }, [catalog]);

 // Filtro por busca e categoria
 const filteredProducts = useMemo(() => {
 return flatProducts.filter((item) => {
 const matchCategory =
 selectedCategory === "all" ||
 item.product.category?.name === selectedCategory ||
 item.product.category_name === selectedCategory;

 if (!matchCategory) return false;

 if (!searchQuery) return true;
 const q = searchQuery.toLowerCase();
 return (
 item.product.title.toLowerCase().includes(q) ||
 (item.variant.sku && item.variant.sku.toLowerCase().includes(q))
 );
 });
 }, [flatProducts, searchQuery, selectedCategory]);

 // Atalhos de Teclado Globais (F2, F4, F7, F8, F11, ESC)
 useEffect(() => {
 const handleKeyDown = (e: KeyboardEvent) => {
 if (e.key === "F2") {
 e.preventDefault();
 searchInputRef.current?.focus();
 searchInputRef.current?.select();
 } else if (e.key === "F4") {
 e.preventDefault();
 if (cart.length > 0) {
 handleOpenCheckout();
 }
 } else if (e.key === "F7") {
 e.preventDefault();
 openQuickMovement("sangria");
 } else if (e.key === "F8") {
 e.preventDefault();
 openQuickMovement("suprimento");
 } else if (e.key === "Escape") {
 if (checkoutOpen) setCheckoutOpen(false);
 else if (receiptModalOpen) setReceiptModalOpen(false);
 else if (modifiersModalOpen) setModifiersModalOpen(false);
 else if (shortcutsModalOpen) setShortcutsModalOpen(false);
 }
 };

 window.addEventListener("keydown", handleKeyDown);
 return () => window.removeEventListener("keydown", handleKeyDown);
 }, [cart, checkoutOpen, receiptModalOpen, modifiersModalOpen, shortcutsModalOpen]);

 const toggleFullscreen = () => {
 if (!document.fullscreenElement) {
 document.documentElement.requestFullscreen().catch(() => {});
 setIsFullscreen(true);
 } else {
 if (document.exitFullscreen) {
 document.exitFullscreen().catch(() => {});
 setIsFullscreen(false);
 }
 }
 };

 const handleProductClick = (product: any, variant: any) => {
 const hasModifiers =
 Array.isArray(product.option_groups) && product.option_groups.length > 0;
 if (hasModifiers) {
 setSelectedItemForModifiers({ product, variant });
 setModifiersModalOpen(true);
 } else {
 handleConfirmModifiers(product, variant, []);
 }
 };

 const handleConfirmModifiers = (
 product: any,
 variant: any,
 selectedModifiers: SelectedModifier[],
 notes?: string,
 ) => {
 const rawPrice = variant.price_override_cents ?? product.price_cents ?? 0;
 const basePrice = calculateTablePrice(rawPrice);
 const modifiersDelta = selectedModifiers.reduce((acc, m) => acc + m.priceDeltaCents, 0);
 const unitPriceCents = basePrice + modifiersDelta;

 setCart((prev) => {
 const existingIdx = prev.findIndex(
 (i) =>
 i.product.id === product.id &&
 i.variant.id === variant.id &&
 !notes &&
 selectedModifiers.length === 0,
 );
 if (existingIdx >= 0) {
 const updated = [...prev];
 updated[existingIdx].qty += 1;
 return updated;
 }
 return [
 ...prev,
 {
 id: crypto.randomUUID(),
 product,
 variant,
 qty: 1,
 selectedModifiers,
 notes,
 unitPriceCents,
 },
 ];
 });
 };

 const updateQty = (id: string, delta: number) => {
 setCart((prev) =>
 prev
 .map((i) => {
 if (i.id === id) {
 const next = i.qty + delta;
 return next > 0 ? { ...i, qty: next } : null;
 }
 return i;
 })
 .filter(Boolean) as CartItem[],
 );
 };

 const removeItem = (id: string) => {
 setCart((prev) => prev.filter((i) => i.id !== id));
 };

 // Totais do Carrinho
 const cartSubtotal = useMemo(() => {
 return cart.reduce((acc, item) => acc + item.unitPriceCents * item.qty, 0);
 }, [cart]);

 const discountCents = useMemo(() => {
 if (!discountInput) return 0;
 return parseCurrencyInputToCents(discountInput);
 }, [discountInput]);

 const cartTotal = Math.max(0, cartSubtotal - discountCents);

 // Múltiplos pagamentos: valor total pago acumulado
 const totalPaidSoFar = useMemo(() => {
 return splitPayments.reduce((acc, p) => acc + p.amountCents, 0);
 }, [splitPayments]);

 const remainingToPay = Math.max(0, cartTotal - totalPaidSoFar);

 const handleOpenCheckout = () => {
   setSplitPayments([]);
   setSplitCount(1);
   setPaymentAmountInput((cartTotal / 100).toFixed(2).replace(".", ","));
   setCheckoutOpen(true);
 };

 const handleSplitBillByPeople = (count: number) => {
   const countClamped = Math.max(1, count);
   setSplitCount(countClamped);
   if (countClamped === 1) {
     setPaymentAmountInput((remainingToPay / 100).toFixed(2).replace(".", ","));
     return;
   }
   const baseTotal = splitPayments.length === 0 ? cartTotal : remainingToPay;
   const remainingSlots = Math.max(1, countClamped - splitPayments.length);
   const shareCents = Math.floor(baseTotal / remainingSlots);
   setPaymentAmountInput((shareCents / 100).toFixed(2).replace(".", ","));
 };

 const handleAddSplitPayment = (customLabel?: string) => {
   const cents = parseCurrencyInputToCents(paymentAmountInput);
   if (cents <= 0) {
     toast.error("Informe um valor válido de pagamento.");
     return;
   }

   const payerLabel =
     customLabel ||
     (splitCount > 1 ? `Pagador ${splitPayments.length + 1}` : undefined);

   setSplitPayments((prev) => [
     ...prev,
     { method: selectedPaymentMethod, amountCents: cents, payerLabel },
   ]);

   const nextRemaining = Math.max(0, remainingToPay - cents);
   if (nextRemaining > 0 && splitCount > 1) {
     const remainingSlots = Math.max(1, splitCount - (splitPayments.length + 1));
     const nextShare = Math.floor(nextRemaining / remainingSlots);
     setPaymentAmountInput((nextShare / 100).toFixed(2).replace(".", ","));
   } else {
     setPaymentAmountInput((nextRemaining / 100).toFixed(2).replace(".", ","));
   }
 };

 const handleRemoveSplitPayment = (index: number) => {
   setSplitPayments((prev) => prev.filter((_, i) => i !== index));
 };

 const handlePrintThermal = (paperWidth: "80mm" | "58mm" = "80mm") => {
   if (!lastSaleReceipt) return;
   const receiptData: ThermalReceiptData = {
     storeName: store?.name || "Waesy Comércio Local",
     storeCnpj: store?.cnpj || undefined,
     storeAddress: store?.address || undefined,
     storePhone: store?.phone || undefined,
     saleId: lastSaleReceipt.saleId,
     date: lastSaleReceipt.date,
     serviceMode: lastSaleReceipt.serviceMode,
     tableOrComanda: lastSaleReceipt.tableOrComandaNumber,
     customerDoc: lastSaleReceipt.customerDoc,
     customerName: lastSaleReceipt.customerName,
     items: (lastSaleReceipt.items || []).map((i: any) => ({
       title: i.product?.title || "Item",
       qty: i.qty,
       unitPriceCents: i.unitPriceCents,
       totalCents: i.unitPriceCents * i.qty,
       sku: i.variant?.sku,
       modifiers: (i.selectedModifiers || []).map((m: any) => ({
         label: m.title || m.label,
         priceDeltaCents: m.priceDeltaCents || 0,
       })),
     })),
     subtotalCents: lastSaleReceipt.subtotal,
     discountCents: lastSaleReceipt.discount,
     totalCents: lastSaleReceipt.total,
     amountPaidCents: lastSaleReceipt.amountPaid,
     changeCents: lastSaleReceipt.change,
     payments: (lastSaleReceipt.effectivePayments || []).map((p: any) => ({
       method: p.method,
       amountCents: p.amountCents,
       payerLabel: p.payerLabel,
     })),
   };
   printThermalReceipt(receiptData, paperWidth);
 };

 // Finalizar Venda
 const handleFinalizeSale = async () => {
 if (cart.length === 0) {
 toast.error("O ticket está vazio.");
 return;
 }

 const effectivePayments =
 splitPayments.length > 0
 ? splitPayments
 : [{ method: selectedPaymentMethod, amountCents: cartTotal }];

 const totalPaid = effectivePayments.reduce((acc, p) => acc + p.amountCents, 0);

 if (totalPaid < cartTotal) {
 toast.error(
 `Faltam ${formatMoney(cartTotal - totalPaid)} para cobrir o total da venda.`,
 );
 return;
 }

 const primaryPaymentMethod = effectivePayments[0].method;
 const changeCents = primaryPaymentMethod === "cash" ? Math.max(0, totalPaid - cartTotal) : 0;

 setIsProcessing(true);
 try {
 const itemsPayload = cart.map((i) => ({
 variantId: i.variant.id,
 qty: i.qty,
 priceCents: i.unitPriceCents,
 title: i.product.title,
 sku: i.variant.sku || i.product.slug,
 }));

 const res = await processPOSSale({
 data: {
 registerId: activeRegister?.id,
 items: itemsPayload,
 paymentMethod: primaryPaymentMethod,
 discountCents: discountCents,
 amountPaidCents: totalPaid,
 customerName: customerDoc.trim()
 ? `${serviceMode.toUpperCase()}: ${tableOrComandaNumber || "Balcão"} | CPF: ${customerDoc}`
 : serviceMode !== "takeout"
 ? `${serviceMode.toUpperCase()} ${tableOrComandaNumber}`
 : "Cliente Avulso Balcão",
 },
 });

 toast.success("Venda finalizada com sucesso!");

 setLastSaleReceipt({
 saleId: res?.receiptId || res?.orderId || `PDV${Date.now().toString(36).toUpperCase().slice(-6)}`,
 items: cart,
 subtotal: cartSubtotal,
 discount: discountCents,
 total: cartTotal,
 paymentMethod: primaryPaymentMethod,
 effectivePayments,
 amountPaid: totalPaid,
 change: changeCents,
 customerDoc,
 serviceMode,
 tableOrComandaNumber,
 date: new Date().toISOString(),
 });

 // Limpar ticket
 setCart([]);
 setDiscountInput("");
 setTableOrComandaNumber("");
 setCustomerDoc("");
 setSplitPayments([]);
 setCheckoutOpen(false);
 setReceiptModalOpen(true);
 } catch (err: any) {
 toast.error(err.message || "Erro ao processar venda no PDV.");
 } finally {
 setIsProcessing(false);
 }
 };

 // Envia itens para a comanda de mesa / cozinha sem cobrar agora
 const handleSendItemsToTable = async () => {
 if (cart.length === 0) return;
 if (!tableOrComandaNumber.trim()) {
 toast.error("Informe o número da mesa antes de enviar.");
 return;
 }

 setIsProcessing(true);
 try {
 const itemsPayload = cart.map((i) => ({
 productId: i.product.id,
 variantId: i.variant?.id && i.variant.id !== i.product.id ? i.variant.id : null,
 productTitle: i.product.title,
 qty: i.qty,
 unitPriceCents: i.unitPriceCents,
 totalCents: i.unitPriceCents * i.qty,
 selectedOptions: i.selectedModifiers?.reduce((acc: any, m: any) => {
 acc[m.id] = { label: m.label, price_modifier_cents: m.priceModifierCents };
 return acc;
 }, {}),
 notes: null,
 }));

 await addItemsToTableComanda({
 data: {
 tableNumber: tableOrComandaNumber,
 orderId: search.orderId,
 items: itemsPayload,
 },
 });

 toast.success(`Itens enviados para a cozinha na Mesa ${tableOrComandaNumber}!`);
 setCart([]);
 } catch (err: any) {
 toast.error(err.message || "Erro ao lançar itens na mesa.");
 } finally {
 setIsProcessing(false);
 }
 };

 // Movimentação Rápida (Sangria / Suprimento)
 const openQuickMovement = (type: "sangria" | "suprimento") => {
 setQuickMovementType(type);
 setQuickMovementAmount("");
 setQuickMovementReason("");
 setQuickMovementModalOpen(true);
 };

 const handleQuickMovementSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 const cents = parseCurrencyInputToCents(quickMovementAmount);
 if (cents <= 0) {
 toast.error("Informe um valor válido.");
 return;
 }
 if (!quickMovementReason.trim()) {
 toast.error("Informe a justificativa.");
 return;
 }

 try {
 const finalCents = quickMovementType === "sangria" ? -Math.abs(cents) : Math.abs(cents);
 await addRegisterEntry({
 data: {
 registerId: activeRegister.id,
 amountCents: finalCents,
 method: "cash",
 description: `[${quickMovementType.toUpperCase()}] ${quickMovementReason.trim()}`,
 },
 });

 toast.success(
 quickMovementType === "sangria"
 ? "Sangria realizada com sucesso!"
 : "Suprimento inserido com sucesso!",
 );
 setQuickMovementModalOpen(false);
 } catch (err: any) {
 toast.error(err.message || "Erro na movimentação.");
 }
 };

 const handlePrintBlindClosing = () => {
    if (!activeRegister) {
      toast.error("Nenhum caixa aberto no momento.");
      return;
    }
    const receiptData: ThermalReceiptData = {
      storeName: store?.name || "Terminal PDV Waesy",
      headerLines: [
        "CONFERENCIA CEGA DE TURNO",
        `Caixa #${activeRegister.id?.slice(0, 8) || "01"}`,
        `Abertura: ${formatDateTime(activeRegister.opened_at || new Date().toISOString())}`,
        `Impressao: ${formatDateTime(new Date().toISOString())}`,
      ],
      items: [
        { name: "Total Vendas do Turno", quantity: 1, totalPriceCents: activeRegister.total_sales_cents || 0 },
      ],
      totalCents: activeRegister.total_sales_cents || 0,
      paymentMethod: "Apuracao Cega (Dinheiro / Cartao / Pix)",
      footerLines: [
        "--------------------------------",
        "Conferencia fisica obrigatoria",
        "Assinatura do Operador:",
        "",
        "________________________________",
        "Waesy PDV - Operacao Segura",
      ],
    };
    printThermalReceipt(receiptData);
    toast.success("Conferência cega enviada para impressão térmica!");
  };

 return (
 <div className="flex flex-col h-[calc(100vh-2rem)] max-h-[calc(100vh-2rem)] overflow-hidden bg-background rounded-2xl border border-border/80 shadow-xs">
 {/* ── BARRA SUPERIOR OPERACIONAL (POS Header) ── */}
 <header className="p-3 px-4 border-b border-border/70 bg-card flex flex-wrap items-center justify-between gap-3 shrink-0">
 <div className="flex items-center gap-3 flex-1 min-w-[280px] max-w-xl">
 <div className="relative w-full">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
 <Input
 ref={searchInputRef}
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 placeholder={semantics.searchItemPlaceholder || "Buscar por nome ou código de barras... [F2]"}
 className="pl-9 h-10 text-xs rounded-xl bg-background border-border/80 focus-visible:ring-1"
 autoFocus
 />
 </div>
 </div>

 {/* Seletor de Modo de Atendimento Dinâmico por Nicho */}
 <div className="flex items-center gap-1.5 p-1 bg-muted/40 rounded-xl border border-border/60">
 {availableModes.map((mode: any) => {
 const isSelected = serviceMode === mode.id;
 return (
 <button
 key={mode.id}
 type="button"
 onClick={() => setServiceMode(mode.id)}
 className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
 isSelected
 ? "bg-primary text-primary-foreground shadow-xs"
 : "text-muted-foreground hover:text-foreground"
 }`}
 >
 <span>{mode.label}</span>
 </button>
 );
 })}
 </div>

 {/* Identificador Dinâmico (ex: Mesa, Comanda, Nome do Viajante, Reserva) */}
 {(() => {
 const currentModeObj = availableModes.find((m: any) => m.id === serviceMode);
 if (currentModeObj && currentModeObj.placeholder) {
 return (
 <div className="w-40">
 <Input
 placeholder={currentModeObj.placeholder}
 value={tableOrComandaNumber}
 onChange={(e) => setTableOrComandaNumber(e.target.value)}
 className="h-9 text-xs rounded-xl font-mono text-center bg-background"
 />
 </div>
 );
 }
 return null;
 })()}

 {/* Ações Rápidas de Operação */}
 <div className="flex items-center gap-2">
 <Button
 variant="outline"
 size="sm"
 onClick={() => openQuickMovement("sangria")}
 className="h-9 rounded-xl text-xs font-bold gap-1 px-2.5"
 title="Sangria Rápida [F7]"
 >
 <ArrowUpRight className="size-3.5 text-rose-500" />
 <span className="hidden xl:inline">Sangria (F7)</span>
 </Button>

 <Button
 variant="outline"
 size="sm"
 onClick={() => openQuickMovement("suprimento")}
 className="h-9 rounded-xl text-xs font-bold gap-1 px-2.5"
 title="Suprimento Rápido [F8]"
 >
 <ArrowDownLeft className="size-3.5 text-emerald-500" />
 <span className="hidden xl:inline">Suprimento (F8)</span>
 </Button>

 <Button
 variant="outline"
 size="sm"
 onClick={handlePrintBlindClosing}
 className="h-9 rounded-xl text-xs font-bold gap-1 px-2.5 border-border/80 text-foreground hover:bg-muted"
 title="Conferência Cega / Fechamento de Turno"
 >
 <Printer className="size-3.5 text-primary" />
 <span className="hidden xl:inline">Conferência Cega</span>
 </Button>

 <Button
 variant="ghost"
 size="icon"
 onClick={() => setShortcutsModalOpen(true)}
 className="size-9 rounded-xl text-muted-foreground hover:text-foreground"
 title="Atalhos de Teclado"
 >
 <Keyboard className="size-4" />
 </Button>

 <Button
 variant="ghost"
 size="icon"
 onClick={toggleFullscreen}
 className="size-9 rounded-xl text-muted-foreground hover:text-foreground"
 title="Alternar Tela Cheia"
 >
 {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
 </Button>

 <Button
 asChild
 variant="outline"
 size="sm"
 className="h-9 rounded-xl text-xs font-bold gap-1"
 title="KDS — Estações de Preparo"
 >
 <Link to="/workspace/pdv/cozinha">
 <ChefHat className="size-3.5 text-orange-500" />
 <span className="hidden xl:inline">Cozinha</span>
 </Link>
 </Button>

 <Button
 asChild
 variant="outline"
 size="sm"
 className="h-9 rounded-xl text-xs font-bold gap-1"
 title="Salão & Mesas / Comandas"
 >
 <Link to="/workspace/pdv/comandas">
 <Utensils className="size-3.5 text-amber-500" />
 <span className="hidden xl:inline">Comandas</span>
 </Link>
 </Button>

 <Button
 asChild
 variant="outline"
 size="sm"
 className="h-9 rounded-xl text-xs font-bold gap-1"
 title="Mapa de Reservas do Salão"
 >
 <Link to="/workspace/reservas">
 <Armchair className="size-3.5 text-blue-500" />
 <span className="hidden xl:inline">Reservas</span>
 </Link>
 </Button>

 <Button
 asChild
 variant="outline"
 size="sm"
 className="h-9 rounded-xl text-xs font-bold gap-1"
 >
 <Link to="/workspace/financeiro/caixa">
 <Clock className="size-3.5 text-emerald-500" />
 <span>Turno</span>
 </Link>
 </Button>
 </div>
 </header>

 {/* ── ÁREA PRINCIPAL DO PDV ── */}
 <div className="flex-1 flex flex-row min-h-0 overflow-hidden">
 {/* Coluna Esquerda: Catálogo Tátil de Produtos */}
 <div className="flex-1 flex flex-col min-w-0 border-r border-border/70 overflow-hidden">
 {/* Carrossel Tátil de Categorias */}
 <div className="p-3 border-b border-border/70 bg-card/60 overflow-x-auto no-scrollbar flex items-center gap-2 shrink-0">
 <button
 type="button"
 onClick={() => setSelectedCategory("all")}
 className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
 selectedCategory === "all"
 ? "bg-foreground text-background shadow-xs"
 : "bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted/70"
 }`}
 >
 Todos ({flatProducts.length})
 </button>
 {categories.map((cat) => {
 const count = flatProducts.filter(
 (p) => p.product.category?.name === cat || p.product.category_name === cat,
 ).length;
 return (
 <button
 key={cat}
 type="button"
 onClick={() => setSelectedCategory(cat)}
 className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
 selectedCategory === cat
 ? "bg-primary text-primary-foreground shadow-xs"
 : "bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted/70"
 }`}
 >
 {cat} ({count})
 </button>
 );
 })}
 </div>

 {/* Grid de Produtos Táteis com Fotos 1:1 */}
 <div className="flex-1 p-4 overflow-y-auto no-scrollbar">
 {filteredProducts.length === 0 ? (
 <div className="py-24 text-center space-y-3 text-muted-foreground">
 <Search className="size-10 opacity-30 mx-auto" />
 <p className="text-sm font-bold text-foreground">Nenhum produto encontrado</p>
 <p className="text-xs">Tente buscar por outro termo ou mude a categoria acima.</p>
 </div>
 ) : (
 <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
 {filteredProducts.map(({ product, variant }) => {
 const rawPrice = variant.price_override_cents ?? product.price_cents ?? 0;
 const displayPrice = calculateTablePrice(rawPrice);
 const imageUrl = product.images?.[0] || product.image_url;

 // Quantidade já adicionada no carrinho para este produto
 const inCartQty = cart
 .filter((i) => i.product.id === product.id && i.variant.id === variant.id)
 .reduce((acc, i) => acc + i.qty, 0);

 return (
 <div
 key={`${product.id}-${variant.id || "def"}`}
 onClick={() => handleProductClick(product, variant)}
 className={`relative rounded-2xl bg-card border transition-all cursor-pointer flex flex-col justify-between overflow-hidden group select-none hover:shadow-md hover:border-primary/50 active:scale-[0.98] ${
 inCartQty > 0 ? "border-primary ring-1 ring-primary/40" : "border-border/80"
 }`}
 >
 {/* Foto 1:1 do Produto */}
 <div className="relative aspect-square w-full bg-muted/40 overflow-hidden flex items-center justify-center">
 {imageUrl ? (
 <img
 src={imageUrl}
 alt={product.title}
 className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
 loading="lazy"
 />
 ) : (
 <div className="size-full flex flex-col items-center justify-center text-muted-foreground/40 bg-muted/20">
 <ImageIcon className="size-8 stroke-[1.5]" />
 </div>
 )}

 {/* Badge de Quantidade no Carrinho */}
 {inCartQty > 0 && (
 <span className="absolute top-2 right-2 size-6 rounded-full bg-primary text-primary-foreground font-black text-xs flex items-center justify-center shadow-md animate-in zoom-in-50">
 {inCartQty}
 </span>
 )}
 </div>

 {/* Informações e Preço */}
 <div className="p-3 space-y-1.5">
 <h3 className="font-bold text-xs text-foreground line-clamp-2 leading-snug">
 {product.title}
 </h3>
 {variant.sku && variant.sku !== "DEFAULT" && (
 <p className="text-[10px] text-muted-foreground font-mono truncate">
 {variant.sku}
 </p>
 )}
 <div className="flex items-center justify-between pt-1">
 <span className="font-black text-sm text-foreground font-mono">
 {formatMoney(displayPrice)}
 </span>
 <span className="size-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
 <Plus className="size-3.5" />
 </span>
 </div>
 </div>
 </div>
 );
 })}
 </div>
 )}
 </div>
 </div>

 {/* ── COLUNA DIREITA: PAINEL TÁTIL DO TICKET / CARRINHO ── */}
 <div className="w-80 lg:w-96 flex flex-col h-full bg-card shrink-0">
 {/* Header do Ticket */}
 <div className="p-4 border-b border-border/70 flex items-center justify-between bg-muted/20">
 <div className="flex items-center gap-2">
 <ShoppingCart className="size-4 text-primary" />
 <div>
 <h2 className="text-xs font-bold text-foreground">Ticket de Venda</h2>
 <p className="text-[10px] text-muted-foreground">
 {serviceMode === "takeout"
 ? "Balcão"
 : `${serviceMode.toUpperCase()}: ${tableOrComandaNumber || "Sem nº"}`}
 </p>
 </div>
 </div>
 {cart.length > 0 && (
 <Button
 variant="ghost"
 size="sm"
 onClick={() => setCart([])}
 className="h-7 text-xs text-destructive hover:bg-destructive/10"
 >
 Limpar
 </Button>
 )}
 </div>

 {/* Lista de Itens do Ticket */}
 <ScrollArea className="flex-1 p-3">
 {cart.length === 0 ? (
 <div className="py-24 text-center text-muted-foreground space-y-2">
 <ShoppingCart className="size-10 opacity-20 mx-auto" />
 <p className="text-xs font-bold text-foreground">Ticket Vazio</p>
 <p className="text-[11px] opacity-70">Toque nos produtos ao lado para adicionar</p>
 </div>
 ) : (
 <div className="space-y-2.5">
 {cart.map((item) => (
 <div
 key={item.id}
 className="p-3 rounded-xl bg-muted/30 border border-border/60 space-y-2 text-xs"
 >
 <div className="flex items-start justify-between gap-2">
 <div className="flex-1 truncate">
 <span className="font-bold text-foreground">{item.product.title}</span>
 {item.variant.sku && item.variant.sku !== "DEFAULT" && (
 <p className="text-[10px] text-muted-foreground font-mono">
 {item.variant.sku}
 </p>
 )}
 {item.selectedModifiers.length > 0 && (
 <p className="text-[10px] text-primary font-medium mt-0.5">
 + {item.selectedModifiers.map((m) => m.title).join(", ")}
 </p>
 )}
 </div>
 <span className="font-bold text-foreground font-mono">
 {formatMoney(item.unitPriceCents * item.qty)}
 </span>
 </div>

 <div className="flex items-center justify-between pt-1">
 <div className="flex items-center gap-1 bg-background border border-border rounded-xl p-0.5">
 <Button
 variant="ghost"
 size="icon"
 className="size-7 rounded-lg cursor-pointer"
 onClick={() => updateQty(item.id, -1)}
 >
 <Minus className="size-3.5" />
 </Button>
 <span className="w-8 text-center font-bold font-mono text-xs">{item.qty}</span>
 <Button
 variant="ghost"
 size="icon"
 className="size-7 rounded-lg cursor-pointer"
 onClick={() => updateQty(item.id, 1)}
 >
 <Plus className="size-3.5" />
 </Button>
 </div>

 <Button
 variant="ghost"
 size="icon"
 className="size-7 text-destructive hover:bg-destructive/10 cursor-pointer"
 onClick={() => removeItem(item.id)}
 >
 <X className="size-3.5" />
 </Button>
 </div>
 </div>
 ))}
 </div>
 )}
 </ScrollArea>

 {/* Resumo Financeiro & Botão de Cobrança */}
 <div className="p-4 border-t border-border/70 space-y-3 bg-muted/20 shrink-0">
 <div className="space-y-1.5 text-xs">
 <div className="flex items-center justify-between text-muted-foreground">
 <span>Subtotal</span>
 <span className="font-mono">{formatMoney(cartSubtotal)}</span>
 </div>
 {discountCents > 0 && (
 <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-bold">
 <span>Desconto</span>
 <span className="font-mono">-{formatMoney(discountCents)}</span>
 </div>
 )}
 <div className="flex items-center justify-between text-base font-black text-foreground pt-1.5 border-t border-border/40">
 <span>Total a Cobrar</span>
 <span className="font-mono text-lg">{formatMoney(cartTotal)}</span>
 </div>
 </div>

 {serviceMode === "table" && tableOrComandaNumber ? (
 <div className="space-y-2">
 <Button
 size="lg"
 onClick={handleSendItemsToTable}
 disabled={cart.length === 0 || isProcessing}
 className="w-full h-12 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-700 text-white gap-2 cursor-pointer shadow-md"
 >
 <Utensils className="size-4" />
 <span>Enviar para a Cozinha (Mesa {tableOrComandaNumber})</span>
 <span className="font-mono ml-auto text-sm">{formatMoney(cartTotal)}</span>
 </Button>
 <Button
 variant="outline"
 size="sm"
 onClick={handleOpenCheckout}
 disabled={cart.length === 0}
 className="w-full h-9 rounded-xl font-bold text-xs gap-1.5"
 >
 <CreditCard className="size-3.5" />
 <span>Receber / Cobrar no Balcão [F4]</span>
 </Button>
 </div>
 ) : (
 <Button
 size="lg"
 onClick={handleOpenCheckout}
 disabled={cart.length === 0}
 className="w-full h-12 rounded-xl font-bold text-xs bg-primary text-primary-foreground gap-2 cursor-pointer shadow-md"
 >
 <CreditCard className="size-4" />
 <span>Cobrar [F4]</span>
 <span className="font-mono ml-auto text-sm">{formatMoney(cartTotal)}</span>
 </Button>
 )}
 </div>
 </div>
 </div>

 {/* ── MODAL TÁTIL DE PAGAMENTO & MÚLTIPLOS MEIOS ── */}
 <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
 <DialogContent className="sm:max-w-xl w-full p-0 gap-0 overflow-hidden rounded-2xl bg-card border border-border">
 <DialogHeader className="p-6 pb-4 border-b border-border/80 bg-muted/20">
 <div className="flex items-center justify-between">
 <div>
 <DialogTitle className="text-lg font-bold text-foreground">
 Finalizar Pagamento
 </DialogTitle>
 <DialogDescription className="text-xs text-muted-foreground mt-0.5">
 Total da Venda: <strong className="text-foreground font-mono">{formatMoney(cartTotal)}</strong>
 </DialogDescription>
 </div>
 <div className="text-right">
 <span className="text-[10px] uppercase font-bold text-muted-foreground block">
 Restante
 </span>
 <span className="text-lg font-mono font-black text-primary">
 {formatMoney(remainingToPay)}
 </span>
 </div>
 </div>
 </DialogHeader>

 <div className="p-6 space-y-5">
 {/* Barra de Divisão Rápida de Conta (Split Bill) */}
 <div className="p-3 bg-muted/40 rounded-xl border border-border/70 space-y-2">
 <div className="flex items-center justify-between">
 <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
 <Users className="size-3.5 text-primary" />
 <span>Dividir Conta entre Pessoas (Split Bill)</span>
 </span>
 {splitCount > 1 && (
 <Badge variant="outline" className="text-[10px] font-mono border-primary/40 text-primary">
 {splitCount} pessoas (~{formatMoney(Math.round(cartTotal / splitCount))} cada)
 </Badge>
 )}
 </div>
 <div className="flex items-center gap-1.5">
 {[1, 2, 3, 4, 5].map((count) => (
 <button
 key={count}
 type="button"
 onClick={() => handleSplitBillByPeople(count)}
 className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer border ${
 splitCount === count
 ? "bg-primary text-primary-foreground border-primary shadow-xs"
 : "bg-card border-border/70 hover:bg-muted text-muted-foreground hover:text-foreground"
 }`}
 >
 {count === 1 ? "1x (Total)" : `${count}x`}
 </button>
 ))}
 </div>
 </div>

 {/* Seletor de Meio de Pagamento */}
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
 {[
 { id: "cash", label: "Dinheiro", icon: Banknote },
 { id: "pix", label: "PIX", icon: QrCode },
 { id: "debit", label: "Débito", icon: CreditCard },
 { id: "credit", label: "Crédito", icon: CreditCard },
 ].map((m) => {
 const Icon = m.icon;
 const active = selectedPaymentMethod === m.id;
 return (
 <button
 key={m.id}
 type="button"
 onClick={() => setSelectedPaymentMethod(m.id as any)}
 className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
 active
 ? "border-primary bg-primary/10 text-primary shadow-xs"
 : "border-border/70 hover:bg-muted/40 text-foreground"
 }`}
 >
 <Icon className="size-4" />
 <span>{m.label}</span>
 </button>
 );
 })}
 </div>

 {/* Input de Valor para este Meio */}
 <div className="space-y-1.5">
 <label className="text-xs font-bold text-foreground">
 Valor para {selectedPaymentMethod.toUpperCase()} (R$)
 </label>
 <div className="flex items-center gap-2">
 <Input
 value={paymentAmountInput}
 onChange={(e) => setPaymentAmountInput(e.target.value)}
 className="h-11 text-base font-mono font-bold rounded-xl"
 placeholder="0,00"
 />
 <Button
 type="button"
 onClick={() => handleAddSplitPayment()}
 className="h-11 px-4 rounded-xl text-xs font-bold bg-primary text-primary-foreground shrink-0"
 >
 Adicionar Pagamento
 </Button>
 </div>
 </div>

 {/* Botões Rápidos de Cédulas */}
 {selectedPaymentMethod === "cash" && (
 <div className="flex items-center gap-2">
 {[10, 20, 50, 100, 200].map((val) => (
 <button
 key={val}
 type="button"
 onClick={() => setPaymentAmountInput(`${val},00`)}
 className="flex-1 py-1.5 rounded-lg border border-border/80 text-xs font-bold font-mono hover:bg-muted transition-colors cursor-pointer"
 >
 R$ {val}
 </button>
 ))}
 </div>
 )}

 {/* Lista de Pagamentos Lançados (Divisão de Conta) */}
 {splitPayments.length > 0 && (
 <div className="space-y-2 p-3 bg-muted/40 rounded-xl border border-border/60">
 <span className="text-[11px] font-bold text-muted-foreground block">
 Pagamentos Adicionados ({splitPayments.length}):
 </span>
 <div className="space-y-1.5">
 {splitPayments.map((p, idx) => (
 <div
 key={idx}
 className="flex items-center justify-between text-xs p-2 bg-card rounded-lg border border-border/50"
 >
 <div className="flex items-center gap-1.5">
 {p.payerLabel && (
 <Badge variant="outline" className="text-[10px] font-bold py-0 h-4 border-primary/30 text-primary">
 {p.payerLabel}
 </Badge>
 )}
 <span className="font-bold uppercase font-mono">{p.method}</span>
 </div>
 <div className="flex items-center gap-2">
 <span className="font-mono font-bold">{formatMoney(p.amountCents)}</span>
 <Button
 variant="ghost"
 size="icon"
 className="size-6 text-destructive cursor-pointer"
 onClick={() => handleRemoveSplitPayment(idx)}
 >
 <Trash2 className="size-3" />
 </Button>
 </div>
 </div>
 ))}
 </div>
 </div>
 )}

 {/* CPF / CNPJ do Cliente */}
 <div className="space-y-1.5">
 <label className="text-xs font-bold text-foreground">
 CPF / CNPJ na Nota (Opcional)
 </label>
 <Input
 placeholder="Ex: 000.000.000-00"
 value={customerDoc}
 onChange={(e) => setCustomerDoc(e.target.value)}
 className="h-10 text-xs rounded-xl font-mono"
 />
 </div>
 </div>

 <DialogFooter className="p-4 border-t border-border/80 bg-muted/10 gap-2 sm:gap-0">
 <Button
 variant="outline"
 onClick={() => setCheckoutOpen(false)}
 className="h-11 rounded-xl text-xs font-bold"
 >
 Cancelar
 </Button>
 <Button
 onClick={handleFinalizeSale}
 disabled={isProcessing || (splitPayments.length === 0 && !paymentAmountInput)}
 className="h-11 px-6 rounded-xl font-bold text-xs bg-primary text-primary-foreground"
 >
 {isProcessing ? "Concluindo Venda..." : "Confirmar & Emitir Recibo"}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {/* ── MODAL DE RECIBO & IMPRESSÃO TÉRMICA ── */}
 <Dialog open={receiptModalOpen} onOpenChange={setReceiptModalOpen}>
 <DialogContent className="sm:max-w-md w-full p-6 rounded-2xl bg-card border border-border space-y-4">
 <div className="text-center space-y-2">
 <div className="size-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
 <CheckCircle2 className="size-6" />
 </div>
 <DialogTitle className="text-lg font-bold text-foreground">
 Venda Concluída!
 </DialogTitle>
 <DialogDescription className="text-xs text-muted-foreground">
 Cupom emitido sob o código #{lastSaleReceipt?.saleId}
 </DialogDescription>
 </div>

 {/* Mini Preview do Cupom Térmico */}
 <div className="p-4 rounded-xl bg-muted/30 border border-dashed border-border font-mono text-xs space-y-2">
 <div className="text-center border-b border-border/60 pb-2">
 <p className="font-bold">WAESY PDV</p>
 <p className="text-[10px] text-muted-foreground">CUPOM NÃO FISCAL</p>
 <p className="text-[10px] text-muted-foreground">{lastSaleReceipt?.date && formatDateTime(lastSaleReceipt.date)}</p>
 </div>

 <div className="space-y-1 py-1 border-b border-border/60">
 {lastSaleReceipt?.items?.map((item: any, idx: number) => (
 <div key={idx} className="flex justify-between text-[11px]">
 <span>{item.qty}x {item.product?.title || item.title}</span>
 <span>{formatMoney(item.unitPriceCents * item.qty)}</span>
 </div>
 ))}
 </div>

 <div className="space-y-0.5 pt-1 text-[11px]">
 <div className="flex justify-between">
 <span>Subtotal:</span>
 <span>{formatMoney(lastSaleReceipt?.subtotal || 0)}</span>
 </div>
 {lastSaleReceipt?.discount > 0 && (
 <div className="flex justify-between text-emerald-600">
 <span>Desconto:</span>
 <span>-{formatMoney(lastSaleReceipt.discount)}</span>
 </div>
 )}
 <div className="flex justify-between font-bold text-xs pt-1 border-t border-border/60">
 <span>TOTAL:</span>
 <span>{formatMoney(lastSaleReceipt?.total || 0)}</span>
 </div>
 {lastSaleReceipt?.change > 0 && (
 <div className="flex justify-between text-muted-foreground">
 <span>Troco:</span>
 <span>{formatMoney(lastSaleReceipt.change)}</span>
 </div>
 )}
 </div>
 </div>

 <div className="space-y-2 pt-2">
 <div className="grid grid-cols-2 gap-2">
 <Button
 onClick={() => handlePrintThermal("80mm")}
 variant="outline"
 className="h-11 rounded-xl text-xs font-bold gap-1.5 cursor-pointer"
 >
 <Printer className="size-4 text-primary" />
 <span>Imprimir 80mm</span>
 </Button>
 <Button
 onClick={() => handlePrintThermal("58mm")}
 variant="outline"
 className="h-11 rounded-xl text-xs font-bold gap-1.5 cursor-pointer"
 >
 <Printer className="size-4" />
 <span>Imprimir 58mm</span>
 </Button>
 </div>
 <Button
 onClick={() => setReceiptModalOpen(false)}
 className="w-full h-11 rounded-xl text-xs font-bold bg-primary text-primary-foreground cursor-pointer"
 >
 Nova Venda (ESC)
 </Button>
 </div>
 </DialogContent>
 </Dialog>

 {/* ── MODAL DE ATALHOS DE TECLADO ── */}
 <Dialog open={shortcutsModalOpen} onOpenChange={setShortcutsModalOpen}>
 <DialogContent className="sm:max-w-md w-full p-6 rounded-2xl bg-card border border-border space-y-4">
 <DialogHeader>
 <DialogTitle className="text-base font-bold flex items-center gap-2">
 <Keyboard className="size-4 text-primary" />
 <span>Atalhos Rápidos de Teclado (PDV)</span>
 </DialogTitle>
 </DialogHeader>

 <div className="space-y-2 text-xs">
 {[
 { key: "F2", action: "Focar na barra de busca / Leitor de código de barras" },
 { key: "F4", action: "Abrir cobrança / Finalizar pagamento" },
 { key: "F7", action: "Realizar sangria rápida de dinheiro" },
 { key: "F8", action: "Inserir suprimento rápido de troco" },
 { key: "F11", action: "Alternar modo tela cheia (Fullscreen)" },
 { key: "ESC", action: "Fechar modais abertos / Cancelar ação" },
 ].map((s) => (
 <div
 key={s.key}
 className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border/50"
 >
 <kbd className="px-2.5 py-1 rounded-lg bg-background border border-border font-mono font-bold text-xs shadow-2xs">
 {s.key}
 </kbd>
 <span className="text-muted-foreground">{s.action}</span>
 </div>
 ))}
 </div>

 <DialogFooter>
 <Button
 onClick={() => setShortcutsModalOpen(false)}
 className="w-full h-10 rounded-xl text-xs font-bold"
 >
 Fechar
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {/* ── MODAL DE MOVIMENTAÇÃO RÁPIDA (SANGRIA / SUPRIMENTO) ── */}
 <Dialog open={quickMovementModalOpen} onOpenChange={setQuickMovementModalOpen}>
 <DialogContent className="sm:max-w-md w-full p-6 rounded-2xl bg-card border border-border space-y-4">
 <DialogHeader>
 <DialogTitle className="text-base font-bold">
 {quickMovementType === "sangria" ? "Sangria Rápida [F7]" : "Suprimento Rápido [F8]"}
 </DialogTitle>
 <DialogDescription className="text-xs text-muted-foreground">
 {quickMovementType === "sangria"
 ? "Retirada de dinheiro da gaveta para sangria/despesa."
 : "Entrada de troco/reforço na gaveta."}
 </DialogDescription>
 </DialogHeader>

 <form onSubmit={handleQuickMovementSubmit} className="space-y-4">
 <div className="space-y-1.5">
 <label className="text-xs font-bold text-foreground">Valor (R$) *</label>
 <Input
 placeholder="Ex: 50,00"
 value={quickMovementAmount}
 onChange={(e) => setQuickMovementAmount(e.target.value)}
 className="h-10 text-sm font-mono rounded-xl"
 autoFocus
 />
 </div>

 <div className="space-y-1.5">
 <label className="text-xs font-bold text-foreground">Justificativa *</label>
 <Input
 placeholder={
 quickMovementType === "sangria"
 ? "Ex: Pagamento fornecedor, depósito cofre..."
 : "Ex: Troco moedas 1 real..."
 }
 value={quickMovementReason}
 onChange={(e) => setQuickMovementReason(e.target.value)}
 className="h-10 text-xs rounded-xl"
 />
 </div>

 <DialogFooter className="gap-2 sm:gap-0 pt-2">
 <Button
 type="button"
 variant="outline"
 onClick={() => setQuickMovementModalOpen(false)}
 className="h-10 rounded-xl text-xs"
 >
 Cancelar
 </Button>
 <Button
 type="submit"
 className="h-10 rounded-xl text-xs font-bold bg-primary text-primary-foreground"
 >
 Confirmar {quickMovementType === "sangria" ? "Sangria" : "Suprimento"}
 </Button>
 </DialogFooter>
 </form>
 </DialogContent>
 </Dialog>

 {/* ── MODAL DE MODIFICADORES / ADICIONAIS ── */}
 {selectedItemForModifiers && (
 <ProductModifiersModal
 open={modifiersModalOpen}
 onOpenChange={setModifiersModalOpen}
 product={selectedItemForModifiers.product}
 variant={selectedItemForModifiers.variant}
 store={store}
 onConfirm={(selectedModifiers, notes) => {
 handleConfirmModifiers(
 selectedItemForModifiers.product,
 selectedItemForModifiers.variant,
 selectedModifiers,
 notes,
 );
 setModifiersModalOpen(false);
 }}
 />
 )}
 </div>
 );
}
