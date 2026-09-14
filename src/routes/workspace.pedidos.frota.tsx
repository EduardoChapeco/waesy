import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
 Truck,
 Plus,
 Copy,
 ExternalLink,
 MapPin,
 Clock,
 KeyRound,
 DollarSign,
 Loader2,
 Trash2,
 Settings2,
 Car,
 Bike,
 Zap,
 Boxes,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
 Sheet,
 SheetContent,
 SheetHeader,
 SheetTitle,
 SheetDescription,
 SheetTrigger,
} from "@/components/ui/sheet";
import {
 listDispatches,
 createDispatch,
 listPendingDeliveryOrders,
 type DispatchRecord,
} from "@/services/dispatch.functions";
import { listCouriers, type CourierSummaryDTO } from "@/services/fleet.functions";
import {
 listLogisticsPriceTables,
 saveLogisticsPriceTable,
 deleteLogisticsPriceTable,
 type MobilityServiceType,
} from "@/services/mobility.functions";
import { formatMoney } from "@/lib/money";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/workspace/pedidos/frota")({
 head: () => ({ meta: [{ title: "Frota & Despacho de Entregas | Waesy" }] }),
 loader: async () => {
   try {
 const [dispatches, priceTables, pendingOrders, couriers] = await Promise.all([
 listDispatches().catch(() => []),
 listLogisticsPriceTables().catch(() => []),
 listPendingDeliveryOrders().catch(() => []),
 listCouriers({ data: {} }).catch(() => []),
 ]);
 return { dispatches, priceTables, pendingOrders, couriers };
   } catch (err) {
     console.error("[loader:workspace.pedidos.frota] Unhandled loader error:", err);
     return { dispatches: null, priceTables: null, pendingOrders: null, couriers: null };
   }
 },
 component: FrotaEntregasPage,
});

function FrotaEntregasPage() {
 const { dispatches: initialDispatches,
 priceTables: initialPriceTables,
 pendingOrders: initialPendingOrders,
 couriers: initialCouriers, } = ((Route.useLoaderData?.() as any) || {});
 const router = useRouter();
 const [activeTab, setActiveTab] = useState<"dispatches" | "pricing">("dispatches");

 // Dispatches state
 const [dispatches, setDispatches] = useState<DispatchRecord[]>(initialDispatches);
 const [pendingOrders, setPendingOrders] = useState<any[]>(initialPendingOrders);
 const [couriers, setCouriers] = useState<CourierSummaryDTO[]>(initialCouriers);
 const [isOpen, setIsOpen] = useState(false);
 const [isSubmitting, setIsSubmitting] = useState(false);

 // Form states for dispatch
 const [selectedOrderId, setSelectedOrderId] = useState<string>("");
 const [selectedCourierId, setSelectedCourierId] = useState<string>("");
 const [orderNumber, setOrderNumber] = useState("");
 const [courierName, setCourierName] = useState("");
 const [courierPhone, setCourierPhone] = useState("");
 const [recipientName, setRecipientName] = useState("");
 const [recipientPhone, setRecipientPhone] = useState("");
 const [deliveryAddress, setDeliveryAddress] = useState("");
 const [feeReal, setFeeReal] = useState("10.00");

 const handleSelectPendingOrder = (orderId: string) => {
 setSelectedOrderId(orderId);
 if (!orderId || orderId === "manual") {
 return;
 }
 const found = pendingOrders.find((o) => o.id === orderId);
 if (found) {
 setOrderNumber(found.public_token ? found.public_token.slice(0, 8).toUpperCase() : found.id.slice(0, 8).toUpperCase());
 const cName = found.customer_snapshot?.name || "Cliente";
 setRecipientName(cName);
 setRecipientPhone(found.customer_snapshot?.phone || "");
 const addr = found.shipping_address;
 const formatted = addr
 ? `${addr.street || ""}, ${addr.number || "S/N"}${addr.complement ? ` - ${addr.complement}` : ""}${addr.neighborhood ? ` (${addr.neighborhood})` : ""}, ${addr.city || ""}`
 : "";
 setDeliveryAddress(formatted);
 setFeeReal(found.shipping_cents ? (found.shipping_cents / 100).toFixed(2) : "10.00");
 }
 };

 const handleSelectCourier = (courierId: string) => {
 setSelectedCourierId(courierId);
 if (!courierId || courierId === "manual") return;
 const found = couriers.find((c) => c.id === courierId);
 if (found) {
 setCourierName(found.name);
 setCourierPhone(found.phone || "");
 }
 };

 const openDispatchForOrder = (ord: any) => {
 handleSelectPendingOrder(ord.id);
 setIsOpen(true);
 };

 // Pricing Table states
 const [priceTables, setPriceTables] = useState<any[]>(initialPriceTables);
 const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
 const [isSavingPrice, setIsSavingPrice] = useState(false);

 const [priceFormName, setPriceFormName] = useState("Tarifa Padrão");
 const [priceFormServiceType, setPriceFormServiceType] = useState<MobilityServiceType>("delivery_express");
 const [priceFormBaseFee, setPriceFormBaseFee] = useState("5.00");
 const [priceFormKmRate, setPriceFormKmRate] = useState("2.50");
 const [priceFormMinuteRate, setPriceFormMinuteRate] = useState("0.30");
 const [priceFormHelperFee, setPriceFormHelperFee] = useState("50.00");
 const [priceFormMinFare, setPriceFormMinFare] = useState("10.00");

 const handleCreateDispatch = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!orderNumber || !courierName || !deliveryAddress || !recipientName) {
 toast.error("Preencha todos os campos obrigatórios.");
 return;
 }

 setIsSubmitting(true);
 try {
 const feeCents = Math.round(parseFloat(feeReal || "0") * 100);
 const created = await createDispatch({
 data: {
 orderId: selectedOrderId && selectedOrderId !== "manual" ? selectedOrderId : `ord_${orderNumber}`,
 orderNumber,
 courierName,
 courierPhone: courierPhone || undefined,
 deliveryAddress,
 recipientName,
 recipientPhone: recipientPhone || undefined,
 deliveryFeeCents: feeCents,
 },
 });

 setDispatches([created, ...dispatches]);
 if (selectedOrderId) {
 setPendingOrders(pendingOrders.filter((o) => o.id !== selectedOrderId));
 }
 setIsOpen(false);
 setSelectedOrderId("");
 setSelectedCourierId("");
 setOrderNumber("");
 setCourierName("");
 setCourierPhone("");
 setRecipientName("");
 setRecipientPhone("");
 setDeliveryAddress("");
 toast.success("Despacho criado com sucesso! Link Mágico gerado.");
 } catch (e: unknown) {
 toast.error((e instanceof Error ? e.message : String(e)) || "Erro ao criar despacho.");
 } finally {
 setIsSubmitting(false);
 }
 };

 const handleSavePriceTable = async (e: React.FormEvent) => {
 e.preventDefault();
 setIsSavingPrice(true);
 try {
 const baseFeeCents = Math.round(parseFloat(priceFormBaseFee || "0") * 100);
 const kmRateCents = Math.round(parseFloat(priceFormKmRate || "0") * 100);
 const minuteRateCents = Math.round(parseFloat(priceFormMinuteRate || "0") * 100);
 const helperFeeCents = Math.round(parseFloat(priceFormHelperFee || "0") * 100);
 const minFareCents = Math.round(parseFloat(priceFormMinFare || "0") * 100);

 const saved = await saveLogisticsPriceTable({
 data: {
 name: priceFormName,
 service_type: priceFormServiceType,
 base_fee_cents: baseFeeCents,
 km_rate_cents: kmRateCents,
 minute_rate_cents: minuteRateCents,
 helper_fee_cents: helperFeeCents,
 min_fare_cents: minFareCents,
 is_active: true,
 },
 });

 setPriceTables([...priceTables.filter((p) => p.id !== saved.id), saved]);
 setIsPriceModalOpen(false);
 toast.success("Tabela de tarifas salva no banco com sucesso!");
 router.invalidate();
 } catch (err: any) {
 toast.error(err.message || "Erro ao salvar tabela de preço.");
 } finally {
 setIsSavingPrice(false);
 }
 };

 const handleDeletePriceTable = async (id: string) => {
 try {
 await deleteLogisticsPriceTable({ data: { id } });
 setPriceTables(priceTables.filter((p) => p.id !== id));
 toast.success("Tabela de tarifas removida.");
 router.invalidate();
 } catch (err: any) {
 toast.error(err.message || "Erro ao remover.");
 }
 };

 const handleCopyLink = (token: string) => {
 const origin = typeof window !== "undefined" ? window.location.origin : "";
 const url = `${origin}/entrega/${token}`;
 navigator.clipboard.writeText(url);
 toast.success("Link Mágico do Entregador copiado!");
 };

 return (
 <div className="w-full max-w-7xl mx-auto px-0 sm:px-0 space-y-6 pb-20 animate-in fade-in duration-200">
 {/* Header */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
 <div>
 <h1 className="text-xl font-semibold text-foreground tracking-tight">
 Frota, Entregadores & Mobilidade
 </h1>
 <p className="text-xs text-muted-foreground">
 Gerencie despachos em tempo real e tabelas de preços de frete e corridas.
 </p>
 </div>

 {/* Tab Switcher */}
 <div className="flex items-center gap-2">
 <div className="bg-muted p-1 rounded-xl flex items-center gap-1 ">
 <button
 type="button"
 onClick={() => setActiveTab("dispatches")}
 className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
 activeTab === "dispatches"
 ? "bg-background text-foreground "
 : "text-muted-foreground hover:text-foreground"
 }`}
 >
 Despachos Ativos
 </button>
 <button
 type="button"
 onClick={() => setActiveTab("pricing")}
 className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
 activeTab === "pricing"
 ? "bg-background text-foreground "
 : "text-muted-foreground hover:text-foreground"
 }`}
 >
 Tabelas de Tarifas ({priceTables.length})
 </button>
 </div>
 </div>
 </div>

 {/* ── ABA 1: DESPACHOS ATIVOS ─────────────────────────────────── */}
 {activeTab === "dispatches" && (
 <div className="space-y-6">
 {/* Seção de Pedidos Pendentes de Despacho */}
 {pendingOrders.length > 0 && (
 <div className="p-4 rounded-2xl bg-card border border-border/60 space-y-3">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2 text-foreground font-bold text-sm">
 <Bike className="size-4 text-primary" />
 <span>Pedidos Prontos para Entrega ({pendingOrders.length})</span>
 </div>
 <Badge variant="outline" className="text-[10px] uppercase font-mono">
 Fila de Expedição
 </Badge>
 </div>
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
 {pendingOrders.map((ord) => (
 <div key={ord.id} className="p-3.5 rounded-xl bg-muted/40 border border-border/60 flex flex-col justify-between gap-3">
 <div>
 <div className="flex items-center justify-between">
 <span className="font-mono font-bold text-xs text-foreground">
 #{ord.public_token?.slice(0, 8).toUpperCase()}
 </span>
 <span className="font-bold text-xs text-primary font-mono">
 {formatMoney(ord.total_cents)}
 </span>
 </div>
 <p className="text-xs font-semibold text-foreground mt-1">
 {ord.customer_snapshot?.name || "Cliente"}
 </p>
 <p className="text-[11px] text-muted-foreground truncate mt-0.5">
 {ord.shipping_address?.street ? `${ord.shipping_address.street}, ${ord.shipping_address.number || ""}` : "Entrega Delivery"}
 </p>
 </div>
 <Button
 size="sm"
 onClick={() => openDispatchForOrder(ord)}
 className="w-full h-8 rounded-lg font-bold text-xs gap-1.5"
 >
 <Truck className="size-3.5" />
 <span>Despachar Este Pedido</span>
 </Button>
 </div>
 ))}
 </div>
 </div>
 )}

 <div className="flex items-center justify-between">
 <h2 className="text-sm font-bold text-foreground">Despachos & Rotas Ativas ({dispatches.length})</h2>
 <Sheet open={isOpen} onOpenChange={setIsOpen}>
 <SheetTrigger asChild>
 <Button className="rounded-xl h-10 px-4 font-semibold text-xs bg-foreground text-background hover:opacity-90 gap-1.5 cursor-pointer">
 <Plus className="size-4" />
 <span>Novo Despacho</span>
 </Button>
 </SheetTrigger>
 <SheetContent side="right" size="wide" className="w-full sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw] flex flex-col p-0 gap-0 overflow-hidden bg-card border-l border-border">
 <SheetHeader className="p-6 pb-4 border-b border-border/60 bg-card">
 <SheetTitle className="text-base font-semibold text-foreground">
 Despachar Pedido para Entrega
 </SheetTitle>
 <SheetDescription className="text-xs text-muted-foreground mt-1">
 Gera um Link Mágico com mapa e PIN de confirmação para o entregador.
 </SheetDescription>
 </SheetHeader>

 <form onSubmit={handleCreateDispatch} className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-4 text-xs">
 {/* Seletor de Pedido Pendente */}
 <div className="space-y-1.5">
 <Label className="text-xs font-bold text-foreground">Vincular a Pedido da Loja</Label>
 <Select value={selectedOrderId} onValueChange={handleSelectPendingOrder}>
 <SelectTrigger className="h-10 rounded-xl text-xs bg-background">
 <SelectValue placeholder="Escolha um pedido ou preencha manual..." />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="manual">-- Pedido Manual / Avulso --</SelectItem>
 {pendingOrders.map((ord) => (
 <SelectItem key={ord.id} value={ord.id}>
 #{ord.public_token?.slice(0, 8).toUpperCase()} • {ord.customer_snapshot?.name || "Cliente"} ({formatMoney(ord.total_cents)})
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 {/* Seletor de Entregador Cadastrado */}
 {couriers.length > 0 && (
 <div className="space-y-1.5">
 <Label className="text-xs font-bold text-foreground">Entregador da Frota</Label>
 <Select value={selectedCourierId} onValueChange={handleSelectCourier}>
 <SelectTrigger className="h-10 rounded-xl text-xs bg-background">
 <SelectValue placeholder="Escolha um entregador ou digite abaixo..." />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="manual">-- Entregador Avulso / Não cadastrado --</SelectItem>
 {couriers.map((c) => (
 <SelectItem key={c.id} value={c.id}>
 {c.name} {c.phone ? `(${c.phone})` : ""}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 )}

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div>
 <Label className="text-xs font-bold text-foreground">Nº do Pedido *</Label>
 <Input
 value={orderNumber}
 onChange={(e) => setOrderNumber(e.target.value)}
 placeholder="Ex: 1042"
 className="h-10 rounded-xl text-xs bg-background mt-1 font-mono"
 required
 />
 </div>
 <div>
 <Label className="text-xs font-bold text-foreground">Taxa da Entrega (R$)</Label>
 <Input
 value={feeReal}
 onChange={(e) => setFeeReal(e.target.value)}
 placeholder="10.00"
 className="h-10 rounded-xl text-xs bg-background mt-1 font-mono"
 />
 </div>
 </div>

 <div>
 <Label className="text-xs font-bold text-foreground">Endereço de Entrega *</Label>
 <Input
 value={deliveryAddress}
 onChange={(e) => setDeliveryAddress(e.target.value)}
 placeholder="Rua, Número, Bairro"
 className="h-10 rounded-xl text-xs bg-background mt-1"
 required
 />
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div>
 <Label className="text-xs font-bold text-foreground">Nome do Cliente *</Label>
 <Input
 value={recipientName}
 onChange={(e) => setRecipientName(e.target.value)}
 placeholder="Nome do cliente"
 className="h-10 rounded-xl text-xs bg-background mt-1"
 required
 />
 </div>
 <div>
 <Label className="text-xs font-bold text-foreground">WhatsApp Cliente</Label>
 <Input
 value={recipientPhone}
 onChange={(e) => setRecipientPhone(e.target.value)}
 placeholder="(49) 99999-9999"
 className="h-10 rounded-xl text-xs bg-background mt-1"
 />
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div>
 <Label className="text-xs font-bold text-foreground">Nome do Entregador *</Label>
 <Input
 value={courierName}
 onChange={(e) => setCourierName(e.target.value)}
 placeholder="Motoboy / Motorista"
 className="h-10 rounded-xl text-xs bg-background mt-1"
 required
 />
 </div>
 <div>
 <Label className="text-xs font-bold text-foreground">WhatsApp Entregador</Label>
 <Input
 value={courierPhone}
 onChange={(e) => setCourierPhone(e.target.value)}
 placeholder="(49) 98888-8888"
 className="h-10 rounded-xl text-xs bg-background mt-1"
 />
 </div>
 </div>

 <div className="pt-2">
 <Button
 type="submit"
 disabled={isSubmitting}
 className="w-full h-11 rounded-xl bg-foreground text-background font-bold text-xs hover:opacity-90 cursor-pointer"
 >
 {isSubmitting ? (
 <div className="flex items-center gap-2">
 <Loader2 className="size-4 animate-spin" />
 <span>Gerando Despacho...</span>
 </div>
 ) : (
 <span>Criar Despacho & Link Mágico</span>
 )}
 </Button>
 </div>
 </form>
 </SheetContent>
 </Sheet>
 </div>

 {dispatches.length === 0 ? (
 <div className="p-12 text-center border-0 rounded-2xl bg-muted/20 space-y-2">
 <Truck className="size-8 mx-auto text-muted-foreground opacity-40" />
 <h3 className="text-sm font-semibold text-foreground">Nenhum despacho ativo</h3>
 <p className="text-xs text-muted-foreground max-w-sm mx-auto">
 Despache pedidos para motoboys e acompanhe as entregas com confirmação de PIN em tempo real.
 </p>
 </div>
 ) : (
 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
 {dispatches.map((d) => (
 <div key={d.id} className="rounded-2xl bg-card p-4 space-y-3 ">
 <div className="flex items-start justify-between">
 <div>
 <span className="text-xs font-mono font-bold text-foreground">
 Pedido #{d.order_number}
 </span>
 <h3 className="text-sm font-semibold text-foreground">{d.recipient_name}</h3>
 <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
 <MapPin className="size-3" />
 {d.delivery_address}
 </p>
 </div>
 <Badge variant={d.status === "delivered" ? "outline" : "secondary"} className="text-xs">
 {d.status === "delivered" ? "Entregue" : "Em Trânsito"}
 </Badge>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-muted/40 p-2.5 rounded-xl text-xs">
 <div>
 <span className="text-[10px] text-muted-foreground">Entregador</span>
 <p className="font-semibold text-foreground truncate">{d.courier_name}</p>
 </div>
 <div>
 <span className="text-[10px] text-muted-foreground">Taxa</span>
 <p className="font-semibold text-foreground">{formatMoney(d.delivery_fee_cents)}</p>
 </div>
 <div>
 <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
 <KeyRound className="size-2.5" /> PIN Cliente
 </span>
 <p className="font-mono font-bold text-foreground">{d.pin_code}</p>
 </div>
 </div>

 <div className="flex items-center gap-2 pt-1">
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={() => handleCopyLink(d.delivery_token)}
 className="flex-1 rounded-xl text-xs font-semibold gap-1.5 h-8"
 >
 <Copy className="size-3.5" />
 Copiar Link Mágico
 </Button>
 <Button asChild variant="ghost" size="icon" className="rounded-xl size-8">
 <Link to="/entrega/$token" params={{ token: d.delivery_token }} target="_blank">
 <ExternalLink className="size-3.5" />
 </Link>
 </Button>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 )}

 {/* ── ABA 2: TABELAS DE PREÇO & TARIFAS ────────────────────────── */}
 {activeTab === "pricing" && (
 <div className="space-y-4">
 <div className="flex items-center justify-between">
 <p className="text-xs text-muted-foreground">
 Configure as tarifas de saída, valor por KM e ajudantes que alimentam a precificação real do app.
 </p>

 <Sheet open={isPriceModalOpen} onOpenChange={setIsPriceModalOpen}>
 <SheetTrigger asChild>
 <Button className="rounded-xl h-10 px-4 font-semibold text-xs bg-foreground text-background hover:opacity-90 gap-1.5 cursor-pointer">
 <Plus className="size-4" />
 <span>Adicionar Tabela de Tarifa</span>
 </Button>
 </SheetTrigger>
 <SheetContent side="right" size="wide" className="w-full sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw] flex flex-col p-0 gap-0 overflow-hidden bg-card border-l border-border">
 <SheetHeader className="p-6 pb-4 border-b border-border/60 bg-card">
 <SheetTitle className="text-base font-semibold text-foreground">
 Nova Tabela de Tarifa de Mobilidade / Frete
 </SheetTitle>
 <SheetDescription className="text-xs text-muted-foreground mt-1">
 Define o cálculo exato de saída, km rodado e ajudantes para o modal selecionado.
 </SheetDescription>
 </SheetHeader>

 <form onSubmit={handleSavePriceTable} className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-4 text-xs">
 <div>
 <Label className="text-xs font-bold text-foreground">Nome da Tabela *</Label>
 <Input
 value={priceFormName}
 onChange={(e) => setPriceFormName(e.target.value)}
 placeholder="Ex: Tarifa Chapecó Centro"
 className="h-10 rounded-xl text-xs bg-background mt-1"
 required
 />
 </div>

 <div>
 <Label className="text-xs font-bold text-foreground">Modalidade do Veículo</Label>
 <select
 value={priceFormServiceType}
 onChange={(e: any) => setPriceFormServiceType(e.target.value)}
 className="w-full h-10 rounded-xl text-xs bg-background border border-border px-3 text-foreground mt-1"
 >
 <option value="delivery_express">Entrega Flash (Moto / Bike)</option>
 <option value="ride_moto">Moto Passageiro</option>
 <option value="ride_car">Carro / Motorista Privado</option>
 <option value="freight_van">Utilitário / Fiorino / Van</option>
 <option value="moving_truck">Caminhão de Mudança</option>
 </select>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div>
 <Label className="text-xs font-bold text-foreground">Taxa de Partida (R$) *</Label>
 <Input
 value={priceFormBaseFee}
 onChange={(e) => setPriceFormBaseFee(e.target.value)}
 placeholder="5.00"
 className="h-10 rounded-xl text-xs bg-background mt-1"
 required
 />
 </div>
 <div>
 <Label className="text-xs font-bold text-foreground">Valor por KM (R$) *</Label>
 <Input
 value={priceFormKmRate}
 onChange={(e) => setPriceFormKmRate(e.target.value)}
 placeholder="2.50"
 className="h-10 rounded-xl text-xs bg-background mt-1"
 required
 />
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
 <div>
 <Label className="text-xs font-bold text-foreground">Tarifa Mínima</Label>
 <Input
 value={priceFormMinFare}
 onChange={(e) => setPriceFormMinFare(e.target.value)}
 placeholder="10.00"
 className="h-10 rounded-xl text-xs bg-background mt-1"
 />
 </div>
 <div>
 <Label className="text-xs font-bold text-foreground">Por Minuto</Label>
 <Input
 value={priceFormMinuteRate}
 onChange={(e) => setPriceFormMinuteRate(e.target.value)}
 placeholder="0.30"
 className="h-10 rounded-xl text-xs bg-background mt-1"
 />
 </div>
 <div>
 <Label className="text-xs font-bold text-foreground">Ajudante</Label>
 <Input
 value={priceFormHelperFee}
 onChange={(e) => setPriceFormHelperFee(e.target.value)}
 placeholder="50.00"
 className="h-10 rounded-xl text-xs bg-background mt-1"
 />
 </div>
 </div>

 <div className="pt-2">
 <Button
 type="submit"
 disabled={isSavingPrice}
 className="w-full h-11 rounded-xl bg-foreground text-background font-bold text-xs hover:opacity-90 cursor-pointer"
 >
 {isSavingPrice ? (
 <div className="flex items-center gap-2">
 <Loader2 className="size-4 animate-spin" />
 <span>Salvando no Banco...</span>
 </div>
 ) : (
 <span>Salvar Tabela de Tarifas</span>
 )}
 </Button>
 </div>
 </form>
 </SheetContent>
 </Sheet>
 </div>

 {priceTables.length === 0 ? (
 <div className="p-12 text-center border-0 rounded-2xl bg-muted/20 space-y-2">
 <DollarSign className="size-8 mx-auto text-muted-foreground opacity-40" />
 <h3 className="text-sm font-semibold text-foreground">Nenhuma tabela de tarifa ativa</h3>
 <p className="text-xs text-muted-foreground max-w-sm mx-auto">
 Adicione tabelas de preços por modalidade para ativar a cobertura e o cálculo dinâmico no app.
 </p>
 </div>
 ) : (
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
 {priceTables.map((tbl) => (
 <div key={tbl.id} className="rounded-2xl bg-card p-4 space-y-3 ">
 <div className="flex items-start justify-between">
 <div>
 <Badge variant="outline" className="text-[10px] uppercase font-mono mb-1">
 {tbl.service_type}
 </Badge>
 <h4 className="text-sm font-semibold text-foreground">{tbl.name}</h4>
 </div>
 <Button
 type="button"
 variant="ghost"
 size="icon"
 onClick={() => handleDeletePriceTable(tbl.id)}
 className="size-7 rounded-lg text-muted-foreground hover:text-destructive"
 aria-label="Remover tabela de tarifa"
 >
 <Trash2 className="size-3.5" />
 </Button>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-muted/40 p-2.5 rounded-xl text-xs">
 <div>
 <span className="text-[10px] text-muted-foreground">Taxa Partida</span>
 <p className="font-semibold text-foreground">{formatMoney(tbl.base_fee_cents)}</p>
 </div>
 <div>
 <span className="text-[10px] text-muted-foreground">Por KM</span>
 <p className="font-semibold text-foreground">{formatMoney(tbl.km_rate_cents)}/km</p>
 </div>
 <div>
 <span className="text-[10px] text-muted-foreground">Tarifa Mínima</span>
 <p className="font-semibold text-foreground">{formatMoney(tbl.min_fare_cents)}</p>
 </div>
 <div>
 <span className="text-[10px] text-muted-foreground">Ajudante</span>
 <p className="font-semibold text-foreground">{formatMoney(tbl.helper_fee_cents)}</p>
 </div>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 )}
 </div>
 );
}
