import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { ShoppingBag, Search, MoreVertical, Eye, CheckCircle2, Truck, PackageCheck, XCircle, ReceiptText, Clock, Filter, Volume2, VolumeX, Printer, LayoutGrid, List, ChefHat, ArrowRight, Plane, Compass, FileText, Layers, Users, Calendar, MessageCircle, Store, Ticket, BadgeAlert, ArrowUpRight } from 'lucide-react';

import { PageHeader } from "@/components/commerce/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
 Table,
 TableBody,
 TableCell,
 TableHead,
 TableHeader,
 TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ChannelBadge } from "@/components/commerce/channel-badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
 DropdownMenu,
 DropdownMenuContent,
 DropdownMenuItem,
 DropdownMenuLabel,
 DropdownMenuSeparator,
 DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/state/states";
import { listOrders, updateOrderStatus } from "@/services/order.functions";
import { approvePayment } from "@/services/payment.functions";
import { getStoreSettings } from "@/services/store.functions";
import { getNicheSemantics } from "@/lib/niche-semantics";
import { formatMoney } from "@/lib/money";
import { formatDateTime } from "@/lib/datetime";

export const Route = createFileRoute("/workspace/pedidos/")({
 head: () => ({ meta: [{ title: "Emissões & Vendas | Workspace Waesy" }] }),
 loader: async () => {
   try {
 const [orders, store] = await Promise.all([
 listOrders().catch(() => []),
 getStoreSettings().catch(() => null),
 ]);
 return { orders: orders || [], store };
   } catch (err) {
     console.error("[loader:workspace.pedidos.index] Unhandled loader error:", err);
     return { orders: [], store: null };
   }
 },
 component: AdminOrdersPage,
});

type ViewMode = "emissions" | "kitchen" | "picking" | "service_flow" | "table";

function getStatusLabel(status: string, semantics?: any) {
 const isGastro = semantics?.nicheId === "gastronomy";
 const isTourism = semantics?.nicheId === "tourism";
 const isServices = semantics?.nicheId === "services";

 const map: Record<
 string,
 {
 label: string;
 variant: "default" | "secondary" | "destructive" | "outline" | "info" | "success" | "warning";
 }
 > = {
 draft: { label: "Rascunho", variant: "secondary" },
 awaiting_payment: { label: isTourism ? "Aguardando Pagamento" : "Aguardando Pagto", variant: "warning" },
 payment_processing: { label: "Processando Pagto", variant: "info" },
 paid: { label: isTourism ? "Confirmado / Pago" : "Pago", variant: "success" },
 processing: {
 label: isGastro ? "Em Preparo" : isTourism ? "Em Emissão de Vouchers" : isServices ? "Em Execução" : "Em Separação",
 variant: "secondary",
 },
 ready_for_pickup: {
 label: isGastro ? "Pronto p/ Retirada" : isTourism ? "Voucher Pronto / Embarque" : isServices ? "Concluído" : "Pronto p/ Retirada",
 variant: "success",
 },
 shipped: {
 label: isGastro ? "Em Entrega" : isTourism ? "Viagem em Andamento" : isServices ? "Em Atendimento" : "Em Transporte",
 variant: "info",
 },
 delivered: {
 label: isTourism ? "Viagem Concluída" : isServices ? "Finalizado" : "Entregue",
 variant: "success",
 },
 cancelled: { label: "Cancelado", variant: "destructive" },
 };
 return map[status] || { label: status, variant: "outline" };
}

function AdminOrdersPage() {
  const { orders: initialOrders = [], store = null } = ((Route.useLoaderData() as any) || {});
  const semantics = useMemo(() => getNicheSemantics(store), [store]);
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>(initialOrders);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusTab, setStatusTab] = useState<string>("all");
  const [channelFilter, setChannelFilter] = useState<string>("all");

  const isTourism = semantics.nicheId === "tourism";
  const isGastro = semantics.nicheId === "gastronomy";
  const isServices = semantics.nicheId === "services";
  const isRetail = semantics.nicheId === "retail" || semantics.nicheId === "supermarket" || semantics.nicheId === "wholesale";

  // Determina os modos de visualização permitidos para o nicho
  const availableViewModes = useMemo(() => {
    if (isTourism) {
      return [
        { id: "emissions" as ViewMode, label: "Kanban de Emissões", icon: Compass },
        { id: "table" as ViewMode, label: "Tabela de Vendas", icon: List },
      ];
    }
    if (isGastro) {
      return [
        { id: "kitchen" as ViewMode, label: "Cozinha (KDS)", icon: ChefHat },
        { id: "table" as ViewMode, label: "Tabela de Pedidos", icon: List },
      ];
    }
    if (isRetail) {
      return [
        { id: "picking" as ViewMode, label: "Separação & Expedição", icon: ShoppingBag },
        { id: "table" as ViewMode, label: "Tabela de Vendas", icon: List },
      ];
    }
    if (isServices) {
      return [
        { id: "service_flow" as ViewMode, label: "Fila de Atendimento", icon: Layers },
        { id: "table" as ViewMode, label: "Tabela de Atendimentos", icon: List },
      ];
    }
    return [
      { id: "table" as ViewMode, label: "Tabela Geral", icon: List },
    ];
  }, [isTourism, isGastro, isRetail, isServices]);

  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (isTourism) return "emissions";
    if (isGastro) return "kitchen";
    if (isRetail) return "picking";
    if (isServices) return "service_flow";
    return "table";
  });

  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Filter orders by search, status tab & sales channel
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const tokenStr = `#${order.public_token || ""}`.toLowerCase();
      const customerName = (order.customer_snapshot?.name || "").toLowerCase();
      const customerEmail = (order.customer_snapshot?.email || "").toLowerCase();
      const customerPhone = (order.customer_snapshot?.phone || "").toLowerCase();
      const itemsStr = (order.items_snapshot || [])
        .map((i: any) => i.title || i.product_name || "")
        .join(" ")
        .toLowerCase();
      const query = searchQuery.toLowerCase();

      const matchesSearch =
        tokenStr.includes(query) ||
        customerName.includes(query) ||
        customerEmail.includes(query) ||
        customerPhone.includes(query) ||
        itemsStr.includes(query);

      let matchesTab = true;
      if (statusTab === "awaiting")
        matchesTab = order.status === "awaiting_payment" || order.status === "payment_processing";
      else if (statusTab === "processing")
        matchesTab = order.status === "processing" || order.status === "paid";
      else if (statusTab === "shipped")
        matchesTab = order.status === "shipped" || order.status === "ready_for_pickup";
      else if (statusTab === "delivered") matchesTab = order.status === "delivered";
      else if (statusTab === "cancelled") matchesTab = order.status === "cancelled";

      let matchesChannel = true;
      if (channelFilter !== "all") {
        const rawChannel = (order.channel_source || order.metadata?.channel || "pos").toLowerCase();
        if (channelFilter === "mercadolivre") matchesChannel = rawChannel.includes("mercado");
        else if (channelFilter === "ifood") matchesChannel = rawChannel.includes("ifood");
        else if (channelFilter === "shopee") matchesChannel = rawChannel.includes("shopee");
        else if (channelFilter === "amazon") matchesChannel = rawChannel.includes("amazon");
        else if (channelFilter === "magalu") matchesChannel = rawChannel.includes("magalu") || rawChannel.includes("luiza");
        else if (channelFilter === "online_store") matchesChannel = rawChannel.includes("online") || rawChannel.includes("store") || rawChannel.includes("vitrine");
        else if (channelFilter === "pos") matchesChannel = rawChannel.includes("pos") || rawChannel.includes("pdv") || rawChannel.includes("balcao") || rawChannel === "manual";
      }

      return matchesSearch && matchesTab && matchesChannel;
    });
  }, [orders, searchQuery, statusTab, channelFilter]);

 // Update status action
 const handleStatusChange = async (orderId: string, newStatus: any) => {
 setIsProcessing(true);
 try {
 const res = await updateOrderStatus({ data: { orderId, status: newStatus } });
 if (res) {
 setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)));
 toast.success(`Status alterado para ${getStatusLabel(newStatus, semantics).label}!`);
 router.invalidate();
 } else {
 toast.error((res as any).message || "Erro ao atualizar status.");
 }
 } catch {
 toast.error("Erro ao atualizar o pedido.");
 } finally {
 setIsProcessing(false);
 }
 };

 // Quick Approve Payment
 const handleQuickApprove = async (orderId: string) => {
 setIsProcessing(true);
 try {
 const res = await approvePayment({ data: { orderId, receivedMethod: "cash" } });
 if (res) {
 toast.success(
 isTourism
 ? "Reserva confirmada e enviada para emissão de bilhetes!"
 : "Pedido aceito e enviado para preparo!",
 );
 setOrders((prev) =>
 prev.map((o) => (o.id === orderId ? { ...o, status: "processing" } : o)),
 );
 router.invalidate();
 } else {
 toast.error((res as any).message || "Erro ao aprovar pagamento.");
 }
 } catch {
 toast.error("Erro ao aprovar pagamento.");
 } finally {
 setIsProcessing(false);
 }
 };

 // Grupos de pedidos para Kanban de Turismo e Cozinha
 const newOrders = orders.filter(
 (o) => o.status === "awaiting_payment" || o.status === "payment_processing",
 );
 const processingOrders = orders.filter(
 (o) => o.status === "processing" || o.status === "paid",
 );
 const readyOrders = orders.filter(
 (o) => o.status === "ready_for_pickup" || o.status === "shipped",
 );
 const completedOrders = orders.filter((o) => o.status === "delivered");

 // Título e Eyebrow contextuais por nicho
 const pageTitle = isTourism
 ? "Emissões & Vendas de Viagens"
 : isGastro
 ? "Pedidos & Cozinha"
 : isServices
 ? "Ordens de Serviço & Atendimentos"
 : semantics.ordersLabel || "Pedidos & Vendas";

 const pageEyebrow = isTourism
 ? "Turismo & Emissões"
 : isGastro
 ? "Gastronomia & Delivery"
 : isServices
 ? "Serviços & Atendimento"
 : "Vendas";

 return (
    <div className="w-full max-w-7xl mx-auto px-0 sm:px-0 space-y-6 pb-12 overflow-x-hidden">
 {/* ── Header da Página ── */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
 <PageHeader
 eyebrow={pageEyebrow}
 title={pageTitle}
 actions={
 isTourism ? (
 <div className="flex items-center gap-2">
 <Button
 asChild
 variant="outline"
 size="sm"
 className="rounded-xl font-bold text-xs gap-1.5 border-border bg-card hover:bg-muted"
 >
 <Link to="/workspace/turismo/grupos">
 <Users className="size-3.5 text-primary" />
 <span>Grupos & Excursões</span>
 </Link>
 </Button>
 <Button
 asChild
 size="sm"
 className="rounded-xl font-bold text-xs gap-1.5 bg-primary text-primary-foreground"
 >
 <Link to="/workspace/turismo/propostas" search={{ new: true }}>
 <Layers className="size-3.5" />
 <span>+ Nova Proposta</span>
 </Link>
 </Button>
 </div>
 ) : isServices ? (
 <Button
 asChild
 size="sm"
 className="rounded-xl font-bold text-xs gap-1.5 bg-primary text-primary-foreground"
 >
 <Link to="/workspace/agenda">
 <Calendar className="size-3.5" />
 <span>Grade de Agendamentos</span>
 </Link>
 </Button>
 ) : (
 <Button
 asChild
 variant="outline"
 size="sm"
 className="rounded-xl font-bold text-xs gap-1.5 border-border bg-card hover:bg-muted"
 >
 <Link to="/workspace/pdv">
 <Store className="size-3.5 text-primary" />
 <span>Frente de Caixa (PDV)</span>
 </Link>
 </Button>
 )
 }
 />

 {/* Action Controls & Seletor de Modo Contextual */}
 <div className="flex items-center gap-2 shrink-0">
 <Button
 variant="outline"
 size="sm"
 onClick={() => setSoundEnabled(!soundEnabled)}
 className={`rounded-xl text-xs gap-1.5 font-bold ${soundEnabled ? "border-primary/40 text-primary" : "text-muted-foreground"}`}
 >
 {soundEnabled ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
 <span>{soundEnabled ? "Notificações On" : "Mudo"}</span>
 </Button>

 {availableViewModes.length > 1 && (
 <div className="flex items-center rounded-xl p-0.5 bg-muted/40 border border-border/60 overflow-x-auto no-scrollbar max-w-full">
 {availableViewModes.map((mode) => {
 const Icon = mode.icon;
 const isActive = viewMode === mode.id;
 return (
 <button
 key={mode.id}
 onClick={() => setViewMode(mode.id)}
 className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
 isActive
 ? "bg-card text-foreground shadow-xs"
 : "text-muted-foreground hover:text-foreground"
 }`}
 >
 <Icon className={`size-3.5 ${isActive ? "text-primary" : ""}`} />
 <span>{mode.label}</span>
 </button>
 );
 })}
 </div>
 )}
 </div>
 </div>

 {/* ── MODO 1: KANBAN DE EMISSÕES & VIAGENS (TURISMO & TRAVELOS) ── */}
 {viewMode === "emissions" && isTourism ? (
 <div className="space-y-4">
 <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
 {/* Coluna 1: Novas Reservas & Pendentes de Pagamento */}
 <div className="space-y-3 p-4 rounded-2xl border border-border/70 bg-card/60 flex flex-col justify-between">
 <div className="space-y-3">
 <div className="flex items-center justify-between pb-2 border-b border-border/40">
 <div className="flex items-center gap-2">
 <span className="size-2.5 rounded-full bg-amber-500 animate-pulse" />
 <h3 className="text-sm font-bold text-foreground">Novas Reservas</h3>
 </div>
 <Badge variant="secondary" className="font-bold text-xs">
 {newOrders.length}
 </Badge>
 </div>

 <div className="space-y-3">
 {newOrders.length === 0 ? (
 <div className="py-12 text-center text-xs text-muted-foreground">
 Nenhuma nova reserva pendente de pagamento
 </div>
 ) : (
 newOrders.map((order) => {
 const customerPhone = order.customer_snapshot?.phone;
 const items = order.items_snapshot || [];
 const firstItem = items[0]?.title || items[0]?.product_name || "Pacote de Viagem";

 return (
 <div
 key={order.id}
 className="p-4 rounded-2xl border border-border bg-card space-y-3 hover:border-primary/50 transition-colors shadow-2xs"
 >
 <div className="flex items-start justify-between gap-2">
 <div>
 <div className="flex items-center gap-2">
 <span className="font-mono font-black text-sm text-foreground">
 #{order.public_token || order.id.slice(0, 6)}
 </span>
 <Badge variant="outline" className="text-[10px] font-bold">
 {order.payment_method?.toUpperCase() || "PIX / RESERVA"}
 </Badge>
 </div>
 <p className="font-bold text-xs text-foreground mt-1">
 {order.customer_snapshot?.name || "Passageiro Titular"}
 </p>
 <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
 {firstItem}
 </p>
 </div>

 <div className="text-right">
 <span className="text-xs font-black text-foreground">
 {formatMoney(order.total_cents)}
 </span>
 <div className="flex items-center justify-end gap-1 text-[10px] text-muted-foreground mt-0.5">
 <Clock className="size-3" />
 <span>Hoje</span>
 </div>
 </div>
 </div>

 <div className="flex items-center gap-2 pt-2 border-t border-border/40">
 <Button
 size="sm"
 onClick={() => handleQuickApprove(order.id)}
 disabled={isProcessing}
 className="flex-1 rounded-xl font-bold bg-foreground text-background text-xs h-9"
 >
 Confirmar Reserva
 </Button>
 {customerPhone && (
 <Button
 asChild
 variant="outline"
 size="icon"
 className="size-9 rounded-xl shrink-0 text-emerald-600 hover:bg-emerald-500/10"
 title="WhatsApp do Passageiro"
 >
 <a
 href={`https://wa.me/55${customerPhone.replace(/\D/g, "")}?text=${encodeURIComponent(`Olá ${order.customer_snapshot?.name}, confirmamos o recebimento da sua reserva #${order.public_token} na Excelência Tour!`)}`}
 target="_blank"
 rel="noopener noreferrer"
 >
 <MessageCircle className="size-4" />
 </a>
 </Button>
 )}
 <Button
 asChild
 variant="outline"
 size="icon"
 className="size-9 rounded-xl shrink-0"
 title="Ver Ficha do Passageiro"
 >
 <Link to={`/workspace/pedidos/${order.id}` as never}>
 <Eye className="size-4" />
 </Link>
 </Button>
 </div>
 </div>
 );
 })
 )}
 </div>
 </div>
 </div>

 {/* Coluna 2: Em Emissão (Aéreo & Hospedagem) */}
 <div className="space-y-3 p-4 rounded-2xl border border-border/70 bg-card/60 flex flex-col justify-between">
 <div className="space-y-3">
 <div className="flex items-center justify-between pb-2 border-b border-border/40">
 <div className="flex items-center gap-2">
 <span className="size-2.5 rounded-full bg-primary" />
 <h3 className="text-sm font-bold text-foreground">Em Emissão</h3>
 </div>
 <Badge variant="secondary" className="font-bold text-xs">
 {processingOrders.length}
 </Badge>
 </div>

 <div className="space-y-3">
 {processingOrders.length === 0 ? (
 <div className="py-12 text-center text-xs text-muted-foreground">
 Nenhuma viagem em processo de emissão
 </div>
 ) : (
 processingOrders.map((order) => {
 const items = order.items_snapshot || [];
 const firstItem = items[0]?.title || items[0]?.product_name || "Pacote & Roteiro";

 return (
 <div
 key={order.id}
 className="p-4 rounded-2xl border border-border bg-card space-y-3 hover:border-primary/50 transition-colors shadow-2xs"
 >
 <div className="flex items-start justify-between gap-2">
 <div>
 <div className="flex items-center gap-2">
 <span className="font-mono font-black text-sm text-foreground">
 #{order.public_token || order.id.slice(0, 6)}
 </span>
 <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary uppercase">
 Emitindo Bilhetes
 </span>
 </div>
 <p className="font-bold text-xs text-foreground mt-1">
 {order.customer_snapshot?.name || "Passageiro"}
 </p>
 <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
 {firstItem}
 </p>
 </div>

 <span className="text-xs font-black text-foreground">
 {formatMoney(order.total_cents)}
 </span>
 </div>

 <div className="flex items-center gap-2 pt-2 border-t border-border/40">
 <Button
 size="sm"
 onClick={() => handleStatusChange(order.id, "ready_for_pickup")}
 disabled={isProcessing}
 className="flex-1 rounded-xl font-bold bg-primary text-primary-foreground text-xs h-9 gap-1"
 >
 <span>Liberar Voucher</span>
 <ArrowRight className="size-3.5" />
 </Button>
 <Button
 asChild
 variant="outline"
 size="icon"
 className="size-9 rounded-xl shrink-0"
 title="Imprimir Contrato & Voucher"
 >
 <Link to={`/workspace/pedidos/${order.id}/recibo` as never} target="_blank">
 <Printer className="size-4" />
 </Link>
 </Button>
 </div>
 </div>
 );
 })
 )}
 </div>
 </div>
 </div>

 {/* Coluna 3: Vouchers Emitidos & Prontos p/ Embarque */}
 <div className="space-y-3 p-4 rounded-2xl border border-border/70 bg-card/60 flex flex-col justify-between">
 <div className="space-y-3">
 <div className="flex items-center justify-between pb-2 border-b border-border/40">
 <div className="flex items-center gap-2">
 <span className="size-2.5 rounded-full bg-emerald-500" />
 <h3 className="text-sm font-bold text-foreground">Vouchers Emitidos</h3>
 </div>
 <Badge variant="secondary" className="font-bold text-xs">
 {readyOrders.length}
 </Badge>
 </div>

 <div className="space-y-3">
 {readyOrders.length === 0 ? (
 <div className="py-12 text-center text-xs text-muted-foreground">
 Nenhum voucher aguardando embarque
 </div>
 ) : (
 readyOrders.map((order) => (
 <div
 key={order.id}
 className="p-4 rounded-2xl border border-border bg-card space-y-3 shadow-2xs"
 >
 <div className="flex items-start justify-between gap-2">
 <div>
 <div className="flex items-center gap-2">
 <span className="font-mono font-black text-sm text-foreground">
 #{order.public_token || order.id.slice(0, 6)}
 </span>
 <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 uppercase">
 Pronto p/ Embarque
 </span>
 </div>
 <p className="font-bold text-xs text-foreground mt-1">
 {order.customer_snapshot?.name || "Passageiro"}
 </p>
 </div>

 <span className="text-xs font-black text-foreground">
 {formatMoney(order.total_cents)}
 </span>
 </div>

 <div className="flex items-center gap-2 pt-2 border-t border-border/40">
 <Button
 size="sm"
 variant="outline"
 onClick={() => handleStatusChange(order.id, "delivered")}
 disabled={isProcessing}
 className="flex-1 rounded-xl font-bold text-xs h-9 border-success/40 text-success hover:bg-success/10"
 >
 <CheckCircle2 className="size-3.5 mr-1" />
 Concluir Viagem
 </Button>
 <Button
 asChild
 variant="outline"
 size="icon"
 className="size-9 rounded-xl shrink-0"
 title="Ver Voucher Digital"
 >
 <Link to={`/workspace/pedidos/${order.id}` as never}>
 <Eye className="size-4" />
 </Link>
 </Button>
 </div>
 </div>
 ))
 )}
 </div>
 </div>
 </div>

 {/* Coluna 4: Viagens Concluídas & Pós-Venda */}
 <div className="space-y-3 p-4 rounded-2xl border border-border/70 bg-card/60 flex flex-col justify-between">
 <div className="space-y-3">
 <div className="flex items-center justify-between pb-2 border-b border-border/40">
 <div className="flex items-center gap-2">
 <span className="size-2.5 rounded-full bg-blue-500" />
 <h3 className="text-sm font-bold text-foreground">Viagens Concluídas</h3>
 </div>
 <Badge variant="secondary" className="font-bold text-xs">
 {completedOrders.length}
 </Badge>
 </div>

 <div className="space-y-3">
 {completedOrders.length === 0 ? (
 <div className="py-12 text-center text-xs text-muted-foreground">
 Nenhuma viagem concluída recentemente
 </div>
 ) : (
 completedOrders.slice(0, 5).map((order) => (
 <div
 key={order.id}
 className="p-3.5 rounded-2xl border border-border bg-card space-y-2 opacity-90 hover:opacity-100 transition-opacity"
 >
 <div className="flex items-start justify-between gap-2">
 <div>
 <span className="font-mono font-bold text-xs text-muted-foreground">
 #{order.public_token || order.id.slice(0, 6)}
 </span>
 <p className="font-bold text-xs text-foreground mt-0.5">
 {order.customer_snapshot?.name || "Passageiro"}
 </p>
 </div>
 <span className="text-xs font-black text-foreground">
 {formatMoney(order.total_cents)}
 </span>
 </div>
 <div className="flex items-center justify-between pt-1 text-[11px] text-muted-foreground">
 <span>Realizada com sucesso</span>
 <Link
 to={`/workspace/pedidos/${order.id}` as never}
 className="text-primary font-bold hover:underline"
 >
 Ver Detalhes →
 </Link>
 </div>
 </div>
 ))
 )}
 </div>
 </div>
 </div>
 </div>
 </div>
 ) : null}

 {/* ── MODO 2: COCKPIT DE COZINHA (EXCLUSIVO PARA GASTRONOMIA) ── */}
 {viewMode === "kitchen" && isGastro ? (
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 {/* Coluna 1: Novos Pedidos */}
 <div className="space-y-3 p-4 rounded-2xl border border-border/70 bg-card/60">
 <div className="flex items-center justify-between pb-2 border-b border-border/40">
 <div className="flex items-center gap-2">
 <span className="size-2.5 rounded-full bg-destructive animate-pulse" />
 <h3 className="text-sm font-bold text-foreground">Novos Pedidos</h3>
 </div>
 <Badge variant="secondary" className="font-bold text-xs">
 {newOrders.length}
 </Badge>
 </div>

 <div className="space-y-3">
 {newOrders.length === 0 ? (
 <div className="py-8 text-center text-xs text-muted-foreground">
 Nenhum pedido novo pendente
 </div>
 ) : (
 newOrders.map((order) => (
 <div
 key={order.id}
 className="p-4 rounded-2xl border border-border bg-card space-y-3 hover:border-primary/50 transition-colors"
 >
 <div className="flex items-start justify-between gap-2">
 <div>
 <div className="flex items-center gap-2">
 <span className="font-mono font-black text-sm text-foreground">
 #{order.public_token || order.id.slice(0, 6)}
 </span>
 <span className="font-bold text-xs text-foreground">
 {order.customer_snapshot?.name || "Cliente"}
 </span>
 </div>
 <span className="inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-primary/10 text-primary uppercase">
 {order.shipping_method === "pickup" ? "Retirada Balcão" : "Entrega Parceira"}
 </span>
 </div>

 <div className="text-right">
 <span className="text-xs font-black text-foreground">
 {formatMoney(order.total_cents)}
 </span>
 <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
 <Clock className="size-3" />
 <span>Hoje</span>
 </div>
 </div>
 </div>

 <div className="flex items-center gap-2 pt-2 border-t border-border/40">
 <Button
 size="sm"
 onClick={() => handleQuickApprove(order.id)}
 disabled={isProcessing}
 className="flex-1 rounded-xl font-bold bg-foreground text-background text-xs h-9"
 >
 Aceitar Pedido
 </Button>
 <Button
 asChild
 variant="outline"
 size="icon"
 className="size-9 rounded-xl shrink-0"
 title="Ver Comanda"
 >
 <Link to={`/workspace/pedidos/${order.id}/recibo` as never} target="_blank">
 <Printer className="size-4" />
 </Link>
 </Button>
 </div>
 </div>
 ))
 )}
 </div>
 </div>

 {/* Coluna 2: Em Preparo na Cozinha */}
 <div className="space-y-3 p-4 rounded-2xl border border-border/70 bg-card/60">
 <div className="flex items-center justify-between pb-2 border-b border-border/40">
 <div className="flex items-center gap-2">
 <span className="size-2.5 rounded-full bg-amber-500" />
 <h3 className="text-sm font-bold text-foreground">Em Preparo</h3>
 </div>
 <Badge variant="secondary" className="font-bold text-xs">
 {processingOrders.length}
 </Badge>
 </div>

 <div className="space-y-3">
 {processingOrders.length === 0 ? (
 <div className="py-8 text-center text-xs text-muted-foreground">
 Nenhum pedido em produção na cozinha
 </div>
 ) : (
 processingOrders.map((order) => (
 <div
 key={order.id}
 className="p-4 rounded-2xl border border-border bg-card space-y-3 hover:border-primary/50 transition-colors"
 >
 <div className="flex items-start justify-between gap-2">
 <div>
 <div className="flex items-center gap-2">
 <span className="font-mono font-black text-sm text-foreground">
 #{order.public_token || order.id.slice(0, 6)}
 </span>
 <span className="font-bold text-xs text-foreground">
 {order.customer_snapshot?.name || "Cliente"}
 </span>
 </div>
 <span className="inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-600 uppercase">
 Cozinha Produzindo
 </span>
 </div>

 <span className="text-xs font-black text-foreground">
 {formatMoney(order.total_cents)}
 </span>
 </div>

 <div className="flex items-center gap-2 pt-2 border-t border-border/40">
 <Button
 size="sm"
 onClick={() =>
 handleStatusChange(
 order.id,
 order.shipping_method === "pickup" ? "ready_for_pickup" : "shipped",
 )
 }
 disabled={isProcessing}
 className="flex-1 rounded-xl font-bold bg-primary text-primary-foreground text-xs h-9 gap-1"
 >
 <span>Pronto p/ Despacho</span>
 <ArrowRight className="size-3.5" />
 </Button>
 <Button
 asChild
 variant="outline"
 size="icon"
 className="size-9 rounded-xl shrink-0"
 >
 <Link to={`/workspace/pedidos/${order.id}/recibo` as never} target="_blank">
 <Printer className="size-4" />
 </Link>
 </Button>
 {(order as any).danfe_pdf_url && (
 <Button
 asChild
 variant="outline"
 size="icon"
 className="size-9 rounded-xl shrink-0 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10"
 title="Baixar DANFE (PDF da Nota Fiscal)"
 >
 <a href={(order as any).danfe_pdf_url} target="_blank" rel="noopener noreferrer">
 <FileText className="size-4" />
 </a>
 </Button>
 )}
 </div>
 </div>
 ))
 )}
 </div>
 </div>

 {/* Coluna 3: Prontos / Em Rota */}
 <div className="space-y-3 p-4 rounded-2xl border border-border/70 bg-card/60">
 <div className="flex items-center justify-between pb-2 border-b border-border/40">
 <div className="flex items-center gap-2">
 <span className="size-2.5 rounded-full bg-emerald-500" />
 <h3 className="text-sm font-bold text-foreground">Prontos / Em Rota</h3>
 </div>
 <Badge variant="secondary" className="font-bold text-xs">
 {readyOrders.length}
 </Badge>
 </div>

 <div className="space-y-3">
 {readyOrders.length === 0 ? (
 <div className="py-8 text-center text-xs text-muted-foreground">
 Nenhum pedido despachado
 </div>
 ) : (
 readyOrders.map((order) => (
 <div
 key={order.id}
 className="p-4 rounded-2xl border border-border bg-card space-y-3"
 >
 <div className="flex items-start justify-between gap-2">
 <div>
 <div className="flex items-center gap-2">
 <span className="font-mono font-black text-sm text-foreground">
 #{order.public_token || order.id.slice(0, 6)}
 </span>
 <span className="font-bold text-xs text-foreground">
 {order.customer_snapshot?.name || "Cliente"}
 </span>
 </div>
 <span className="inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-600 uppercase">
 {order.status === "ready_for_pickup"
 ? "Aguardando Retirada"
 : "Entregador a Caminho"}
 </span>
 </div>

 <span className="text-xs font-black text-foreground">
 {formatMoney(order.total_cents)}
 </span>
 </div>

 <div className="flex items-center gap-2 pt-2 border-t border-border/40">
 <Button
 size="sm"
 variant="outline"
 onClick={() => handleStatusChange(order.id, "delivered")}
 disabled={isProcessing}
 className="flex-1 rounded-xl font-bold text-xs h-9 border-success/40 text-success hover:bg-success/10"
 >
 Confirmar Entrega
 </Button>
 <Button
 asChild
 variant="outline"
 size="icon"
 className="size-9 rounded-xl shrink-0"
 >
 <Link to={`/workspace/pedidos/${order.id}` as never}>
 <Eye className="size-4" />
 </Link>
 </Button>
 </div>
 </div>
 ))
 )}
 </div>
 </div>
 </div>
 ) : null}

 {/* ── MODO 3: SEPARAÇÃO & PICKING WMS (EXCLUSIVO PARA VAREJO / MERCADO) ── */}
 {viewMode === "picking" && isRetail ? (
 <div className="space-y-6">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-card border border-border">
 <div className="flex items-center gap-3">
 <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
 <ShoppingBag className="size-5" />
 </div>
 <div>
 <h2 className="text-sm font-bold text-foreground">
 Separação de Gôndola & Conferência de Itens
 </h2>
 <p className="text-xs text-muted-foreground">
 Confira cada produto na prateleira antes de fechar a embalagem de entrega
 </p>
 </div>
 </div>

 <Badge variant="outline" className="font-mono text-xs font-bold">
 {processingOrders.length + newOrders.length} pedidos pendentes de separação
 </Badge>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 {[...newOrders, ...processingOrders].length === 0 ? (
 <div className="col-span-2 py-16 text-center space-y-2 bg-muted/10 rounded-2xl p-8">
 <PackageCheck className="size-10 text-muted-foreground/40 mx-auto" />
 <p className="text-sm font-bold text-foreground">Todos os pedidos foram separados!</p>
 <p className="text-xs text-muted-foreground">Nenhuma encomenda pendente de conferência no momento.</p>
 </div>
 ) : (
 [...newOrders, ...processingOrders].map((order) => {
 const items = order.items_snapshot || [];
 const totalItems = items.length || 1;
 const checkedCount = items.filter((_: any, idx: number) => checkedItems[`${order.id}-${idx}`]).length;
 const isAllChecked = checkedCount === totalItems && totalItems > 0;
 const customerPhone = order.customer_snapshot?.phone;

 return (
 <div
 key={order.id}
 className="p-5 rounded-2xl bg-card border border-border space-y-4 flex flex-col justify-between"
 >
 <div className="space-y-3">
 <div className="flex items-start justify-between gap-3 pb-3 border-b border-border/40">
 <div>
 <div className="flex items-center gap-2">
 <span className="font-mono font-black text-base text-foreground">
 #{order.public_token || order.id.slice(0, 6)}
 </span>
 <Badge variant="secondary" className="font-mono text-[10px] uppercase">
 {order.shipping_method === "pickup" ? "Retirada Balcão" : "Entrega Agendada"}
 </Badge>
 </div>
 <p className="text-xs font-bold text-foreground mt-1">
 {order.customer_snapshot?.name || "Cliente Waesy"}
 </p>
 <p className="text-[11px] text-muted-foreground">
 {order.customer_snapshot?.address_city || "Localidade não informada"}
 </p>
 </div>

 <div className="text-right">
 <span className="font-mono font-black text-sm text-foreground">
 {formatMoney(order.total_cents)}
 </span>
 <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
 {checkedCount}/{totalItems} itens conferidos
 </p>
 </div>
 </div>

 <div className="space-y-2 max-h-60 overflow-y-auto no-scrollbar pr-1">
 {items.length > 0 ? (
 items.map((item: any, idx: number) => {
 const itemKey = `${order.id}-${idx}`;
 const isChecked = !!checkedItems[itemKey];

 return (
 <div
 key={idx}
 onClick={() =>
 setCheckedItems((prev) => ({
 ...prev,
 [itemKey]: !prev[itemKey],
 }))
 }
 className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
 isChecked
 ? "bg-emerald-500/10 border-emerald-500/30 text-foreground"
 : "bg-muted/30 border-border text-muted-foreground hover:bg-muted/60"
 }`}
 >
 <div className="flex items-center gap-2.5 min-w-0">
 <div
 className={`size-5 rounded-md border flex items-center justify-center transition-colors shrink-0 ${
 isChecked
 ? "bg-emerald-600 border-emerald-600 text-white"
 : "border-border bg-card"
 }`}
 >
 {isChecked && <CheckCircle2 className="size-3.5" />}
 </div>
 <div className="min-w-0">
 <p
 className={`text-xs font-bold truncate ${
 isChecked ? "line-through opacity-70" : "text-foreground"
 }`}
 >
 {item.title || item.product_name || `Item #${idx + 1}`}
 </p>
 <p className="text-[10px] text-muted-foreground font-mono">
 Qtd: {item.quantity || 1} • {formatMoney(item.unit_price_cents || item.price_cents || 0)}
 </p>
 </div>
 </div>

 <Button
 type="button"
 variant="ghost"
 size="sm"
 onClick={(e) => {
 e.stopPropagation();
 if (customerPhone) {
 window.open(
 `https://wa.me/55${customerPhone.replace(/\D/g, "")}?text=${encodeURIComponent(`Olá ${order.customer_snapshot?.name}, sobre o item "${item.title || "produto"}" do seu pedido #${order.public_token}: gostaríamos de propor uma substituição.`)}`,
 "_blank",
 );
 } else {
 toast.info(`Item ${item.title} marcado para substituição.`);
 }
 }}
 className="h-7 px-2 text-[10px] font-bold text-primary hover:bg-primary/10 rounded-lg shrink-0"
 >
 Substituir
 </Button>
 </div>
 );
 })
 ) : (
 <div className="p-3 bg-muted/20 rounded-xl text-xs text-muted-foreground text-center">
 Ver detalhes do pedido na comanda
 </div>
 )}
 </div>
 </div>

 <div className="pt-3 border-t border-border/40 flex items-center gap-2">
 <Button
 size="sm"
 onClick={() => handleStatusChange(order.id, "ready_for_pickup")}
 disabled={isProcessing}
 className={`flex-1 rounded-xl font-bold text-xs h-10 transition-all ${
 isAllChecked
 ? "bg-emerald-600 hover:bg-emerald-700 text-white"
 : "bg-foreground text-background"
 }`}
 >
 <CheckCircle2 className="size-4 mr-1.5" />
 <span>
 {isAllChecked
 ? "Concluir Separação & Despachar"
 : `Concluir (${checkedCount}/${totalItems})`}
 </span>
 </Button>

 <Button
 asChild
 variant="outline"
 size="icon"
 className="size-10 rounded-xl shrink-0"
 title="Ver Comanda Completa"
 >
 <Link to={`/workspace/pedidos/${order.id}` as never}>
 <Eye className="size-4" />
 </Link>
 </Button>
 </div>
 </div>
 );
 })
 )}
 </div>
 </div>
 ) : null}

 {/* ── MODO 4: TABELA ANALÍTICA (DISPONÍVEL EM TODOS OS NICHOS) ── */}
 {viewMode === "table" ? (
 <div className="space-y-4">
 {/* Barra de Filtros e Busca */}
 <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-card border border-border rounded-2xl px-4 py-3">
 <Tabs
 defaultValue="all"
 value={statusTab}
 onValueChange={setStatusTab}
 >
 <TabsList className="flex overflow-x-auto no-scrollbar h-8">
 <TabsTrigger value="all" className="text-xs shrink-0">
 Todos ({orders.length})
 </TabsTrigger>
 <TabsTrigger value="awaiting" className="text-xs shrink-0">
 {isTourism ? "Reservas Pendentes" : "Aguardando Pagto"} ({newOrders.length})
 </TabsTrigger>
 <TabsTrigger value="processing" className="text-xs shrink-0">
 {isTourism ? "Em Emissão" : "Em Preparo / Pago"} ({processingOrders.length})
 </TabsTrigger>
 <TabsTrigger value="shipped" className="text-xs shrink-0">
 {isTourism ? "Vouchers Prontos" : "Prontos / Em Rota"} ({readyOrders.length})
 </TabsTrigger>
 <TabsTrigger value="delivered" className="text-xs shrink-0">
 {isTourism ? "Viagens Concluídas" : "Entregues"} ({completedOrders.length})
 </TabsTrigger>
 </TabsList>
 </Tabs>

 <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
 <select
 value={channelFilter}
 onChange={(e) => setChannelFilter(e.target.value)}
 className="h-8 rounded-xl border border-border bg-card px-2.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary w-full sm:w-40 shrink-0"
 >
 <option value="all">Todos os Canais</option>
 <option value="mercadolivre">Mercado Livre</option>
 <option value="ifood">iFood</option>
 <option value="shopee">Shopee</option>
 <option value="amazon">Amazon</option>
 <option value="magalu">Magalu</option>
 <option value="online_store">Loja Online</option>
 <option value="pos">Balcão / PDV</option>
 </select>

 <div className="relative w-full sm:w-64">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
 <Input
 placeholder={isTourism ? "Buscar passageiro, roteiro ou token..." : "Buscar por código, cliente ou item..."}
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="pl-9 h-8 text-xs rounded-xl"
 />
 </div>
 </div>
 </div>

 <div className="bg-card overflow-hidden rounded-2xl border border-border">
 <Table>
 <TableHeader>
 <TableRow className="bg-muted/40">
 <TableHead>{isTourism ? "Reserva / Token" : "Pedido"}</TableHead>
 <TableHead>Canal</TableHead>
 <TableHead>Data & Hora</TableHead>
 <TableHead>{isTourism ? "Passageiro / Titular" : "Cliente"}</TableHead>
 <TableHead>{isTourism ? "Roteiro / Detalhes" : "Meio / Envio"}</TableHead>
 <TableHead className="text-right">Total Final</TableHead>
 <TableHead className="text-center">Status da Emissão</TableHead>
 <TableHead className="text-right">Ações</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {filteredOrders.length === 0 ? (
 <TableRow>
 <TableCell colSpan={8} className="h-32 text-center text-xs text-muted-foreground">
 Nenhum registro encontrado para este filtro.
 </TableCell>
 </TableRow>
 ) : (
 filteredOrders.map((order) => {
 const badgeInfo = getStatusLabel(order.status, semantics);
 const items = order.items_snapshot || [];
 const firstItem = items[0]?.title || items[0]?.product_name || "Serviço / Pacote";

 return (
 <TableRow key={order.id} className="hover:bg-muted/30 transition-colors">
 <TableCell className="font-mono text-xs font-bold text-foreground">
 #{order.public_token || order.id.slice(0, 6)}
 </TableCell>

 <TableCell>
 <ChannelBadge source={order.channel_source || order.metadata?.channel} />
 </TableCell>

 <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
 {formatDateTime(order.created_at)}
 </TableCell>

 <TableCell>
 <div className="flex flex-col">
 <span className="font-bold text-sm text-foreground">
 {order.customer_snapshot?.name || "Passageiro Titular"}
 </span>
 <span className="text-xs text-muted-foreground">
 {order.customer_snapshot?.email ||
 order.customer_snapshot?.phone ||
 "Sem contato informado"}
 </span>
 </div>
 </TableCell>

 <TableCell className="text-xs text-muted-foreground">
 <div className="flex flex-col max-w-[200px]">
 <span className="font-semibold text-foreground truncate">
 {firstItem}
 </span>
 <span className="text-[11px] text-muted-foreground uppercase">
 {order.payment_method || "Pix / Boleto"}
 </span>
 </div>
 </TableCell>

 <TableCell className="text-right font-extrabold text-sm text-foreground">
 {formatMoney(order.total_cents)}
 </TableCell>

 <TableCell className="text-center">
 <Badge variant={badgeInfo.variant} className="text-[10px] font-bold">
 {badgeInfo.label}
 </Badge>
 </TableCell>

 <TableCell className="text-right">
 <DropdownMenu>
 <DropdownMenuTrigger asChild>
 <Button variant="ghost" size="icon" aria-label="Ações do pedido">
 <MoreVertical className="size-4" />
 </Button>
 </DropdownMenuTrigger>
 <DropdownMenuContent align="end" className="w-56">
 <DropdownMenuLabel className="text-xs">
 Ações de Gestão
 </DropdownMenuLabel>
 <DropdownMenuItem asChild>
 <Link to={`/workspace/pedidos/${order.id}` as never}>
 <Eye className="size-3.5 mr-2" />
 {isTourism ? "Ver Ficha do Passageiro" : "Ver Ficha 360 do Pedido"}
 </Link>
 </DropdownMenuItem>
 <DropdownMenuItem asChild>
 <Link
 to={`/workspace/pedidos/${order.id}/recibo` as never}
 target="_blank"
 >
 <ReceiptText className="size-3.5 mr-2" />
 {isTourism ? "Imprimir Contrato / Voucher" : "Imprimir Recibo / Comprovante"}
 </Link>
 </DropdownMenuItem>
 <DropdownMenuSeparator />

 {order.status === "awaiting_payment" && (
 <DropdownMenuItem onClick={() => handleQuickApprove(order.id)}>
 <CheckCircle2 className="size-3.5 mr-2 text-success" />
 {isTourism ? "Aprovar Pagamento da Reserva" : "Aprovar Pagamento"}
 </DropdownMenuItem>
 )}

 {(order.status === "paid" || order.status === "processing") && (
 <DropdownMenuItem
 onClick={() => handleStatusChange(order.id, "ready_for_pickup")}
 >
 <CheckCircle2 className="size-3.5 mr-2 text-primary" />
 {isTourism ? "Liberar Voucher p/ Embarque" : "Pronto p/ Retirada"}
 </DropdownMenuItem>
 )}

 {(order.status === "shipped" || order.status === "ready_for_pickup") && (
 <DropdownMenuItem
 onClick={() => handleStatusChange(order.id, "delivered")}
 >
 <PackageCheck className="size-3.5 mr-2 text-success" />
 {isTourism ? "Confirmar Viagem Concluída" : "Confirmar Entrega"}
 </DropdownMenuItem>
 )}

 {order.status !== "cancelled" && order.status !== "delivered" && (
 <DropdownMenuItem
 onClick={() => handleStatusChange(order.id, "cancelled")}
 className="text-destructive focus:text-destructive"
 >
 <XCircle className="size-3.5 mr-2" />
 Cancelar Reserva
 </DropdownMenuItem>
 )}
 </DropdownMenuContent>
 </DropdownMenu>
 </TableCell>
 </TableRow>
 );
 })
 )}
 </TableBody>
 </Table>
 </div>
 </div>
 ) : null}
 </div>
 );
}
