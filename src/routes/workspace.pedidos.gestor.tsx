import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState, useMemo, useEffect, Fragment } from "react";
import { toast } from "sonner";
import {
 ArrowLeft,
 ChefHat,
 Clock,
 CheckCircle2,
 Bike,
 PackageSearch,
 Maximize,
 Printer,
 FileText,
 MessageCircle,
 AlertTriangle,
 TrendingUp,
 Activity,
 Kanban,
 LayoutDashboard,
 Users,
 UtensilsCrossed,
 MapPin,
 Phone,
 Navigation,
 History,
} from "lucide-react";

import { getBrowserClient } from "@/lib/supabase";
import { listOrders, updateOrderStatus } from "@/services/order.functions";
import { formatMoney } from "@/lib/money";
import { playNewOrderAlert, unlockAudioContext } from "@/lib/audio-chimes";
import { formatDateTime } from "@/lib/datetime";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
 DialogFooter,
} from "@/components/ui/dialog";
import {
 Table,
 TableHeader,
 TableBody,
 TableRow,
 TableHead,
 TableCell,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { NicheOperationalGuard } from "@/components/workspace/niche-operational-guard";
import { getStoreSettings } from "@/services/store.functions";

export const Route = createFileRoute("/workspace/pedidos/gestor")({
 head: () => ({ meta: [{ title: "KDS - Gestor de Pedidos em Tempo Real | Workspace Waesy" }] }),
 loader: async () => {
   try {
 const { getUserSession } = await import("@/services/auth.functions");
 const [session, res, store] = await Promise.all([
 getUserSession().catch(() => null),
 listOrders().catch(() => []),
 getStoreSettings().catch(() => null),
 ]);
 const storeId = session?.store_id;
 // Filter only orders that make sense for the kitchen/fulfillment display
 const initialOrders = (res || []).filter((o: any) => !["draft", "cancelled", "refunded"].includes(o.status));
 
  return { initialOrders: initialOrders || [], storeId: storeId || null, store: store || null };
    } catch (err) {
      console.error("[loader:workspace.pedidos.gestor] Unhandled loader error:", err);
      return { initialOrders: [], storeId: null, store: null };
    }
  },
 component: KDSPage,
});

function playOrderChime() {
  playNewOrderAlert();
}

function KDSPage() {
  const router = useRouter();
  const loaderData = (Route.useLoaderData() as any) || {};
  const initialOrders = loaderData.initialOrders || [];
  const storeId = loaderData.storeId || null;
  const store = loaderData.store || null;
  const [orders, setOrders] = useState<any[]>(initialOrders);
 const [viewMode, setViewMode] = useState<"kanban" | "live_dashboard">("kanban");
 const [alertModalOpen, setAlertModalOpen] = useState(false);
 const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [audioUnlocked, setAudioUnlocked] = useState(false);

 // Estados de Abas Operacionais (Agora vs Agendados) e Filtros Omnichannel
 const [timingTab, setTimingTab] = useState<"now" | "scheduled">("now");
 const [channelFilter, setChannelFilter] = useState<string>("all");
 const [searchQuery, setSearchQuery] = useState<string>("");
 const [sheetTab, setSheetTab] = useState<"details" | "customer" | "history">("details");

 const { nowCount, scheduledCount } = useMemo(() => {
 let now = 0;
 let sched = 0;
 for (const o of orders) {
 const isSched = Boolean(o.is_scheduled || (o.scheduled_for && new Date(o.scheduled_for).getTime() > Date.now()));
 if (isSched) sched++;
 else now++;
 }
 return { nowCount: now, scheduledCount: sched };
 }, [orders]);

 const getChannelInfo = (order: any) => {
 if (order.channel_origin === "ifood") {
 return { label: "iFood", color: "bg-rose-500/10 text-rose-600 border-rose-500/30" };
 }
 if (order.channel_origin === "whatsapp") {
 return { label: "WhatsApp", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" };
 }
 if (order.origin_type === "table" || order.table_identifier) {
 return {
 label: `Mesa ${order.table_identifier || ""}`,
 color: "bg-blue-500/10 text-blue-600 border-blue-500/30",
 };
 }
 if (order.origin_type === "counter" || order.shipping_method === "pickup") {
 return { label: "Balcão", color: "bg-amber-500/10 text-amber-600 border-amber-500/30" };
 }
 return { label: "Cardápio Próprio", color: "bg-purple-500/10 text-purple-600 border-purple-500/30" };
 };

 const delayedOrders = useMemo(() => {
 return orders.filter(
 (o) =>
 !["delivered", "completed", "cancelled"].includes(o.status) &&
 Math.floor((Date.now() - new Date(o.created_at).getTime()) / 60000) > 30,
 );
 }, [orders]);

 const kpis = useMemo(() => {
 const completed = orders.filter((o) => ["delivered", "completed"].includes(o.status));
 const active = orders.filter(
 (o) => !["delivered", "completed", "cancelled"].includes(o.status),
 );
 const cancelled = orders.filter((o) => ["cancelled", "refunded"].includes(o.status));
 const revenue = completed.reduce((acc, o) => acc + (o.total_cents || 0), 0);
 const avgTicket = completed.length > 0 ? Math.round(revenue / completed.length) : 0;
 return {
 total: orders.length,
 completed: completed.length,
 active: active.length,
 cancelled: cancelled.length,
 revenue,
 avgTicket,
 avgPrepTime: 21,
 avgDeliveryTime: 32,
 };
 }, [orders]);

 const topProducts = useMemo(() => {
 const map: Record<string, { title: string; count: number; totalCents: number }> = {};
 for (const ord of orders) {
 if (ord.order_items && Array.isArray(ord.order_items)) {
 for (const item of ord.order_items) {
 const name = item.product_title || "Item";
 if (!map[name]) map[name] = { title: name, count: 0, totalCents: 0 };
 map[name].count += item.qty || 1;
 map[name].totalCents += item.total_cents || 0;
 }
 }
 }
 return Object.values(map)
 .sort((a, b) => b.count - a.count)
 .slice(0, 5);
 }, [orders]);

 const channelStats = useMemo(() => {
 const map: Record<string, { label: string; count: number; totalCents: number }> = {};
 for (const ord of orders) {
 const ch = getChannelInfo(ord).label;
 if (!map[ch]) map[ch] = { label: ch, count: 0, totalCents: 0 };
 map[ch].count++;
 map[ch].totalCents += ord.total_cents || 0;
 }
 return Object.values(map).sort((a, b) => b.count - a.count);
 }, [orders]);  useEffect(() => {
    const handleUnlock = () => {
      unlockAudioContext();
      setAudioUnlocked(true);
    };
    document.addEventListener("click", handleUnlock, { once: true });
    return () => document.removeEventListener("click", handleUnlock);
  }, []);

 function playOrderChime() {
   playNewOrderAlert();
 }

 // Supabase Realtime WebSockets Listener
 useEffect(() => {
 if (!storeId) return;
 const supabase = getBrowserClient();
 const channel = supabase
 .channel("orders-kds-realtime")
 .on(
 "postgres_changes",
 { event: "*", schema: "public", table: "orders", filter: `store_id=eq.${storeId}` },
 async (payload: any) => {
 if (payload.eventType === "INSERT") {
 playOrderChime();
 toast.success(`🔔 Novo pedido #${(payload.new as any).id?.slice(0, 6)} recebido na cozinha!`);
 const newOrder = payload.new;
 if (!["draft", "cancelled", "refunded"].includes(newOrder.status)) {
 setOrders((prev) => {
 if (prev.some((o) => o.id === newOrder.id)) return prev;
 return [...prev, newOrder];
 });
 }
 } else if (payload.eventType === "UPDATE") {
 const updatedOrder = payload.new;
 setOrders((prev) => {
 if (["draft", "cancelled", "refunded"].includes(updatedOrder.status)) {
 return prev.filter((o) => o.id !== updatedOrder.id);
 }
 const exists = prev.some((o) => o.id === updatedOrder.id);
 if (exists) {
 return prev.map((o) => (o.id === updatedOrder.id ? { ...o, ...updatedOrder } : o));
 } else {
 return [...prev, updatedOrder];
 }
 });
 }
 },
 )
 .subscribe(async (status: string) => {
 if (status === "SUBSCRIBED") {
 // Catch-up sync: preenche gap de pedidos se o socket reconectar após queda
 try {
 const freshRes = await listOrders();
 const freshActive = (freshRes || []).filter((o: any) => !["draft", "cancelled", "refunded"].includes(o.status));
 setOrders(freshActive);
 } catch (err) {
 console.error("Erro ao sincronizar KDS:", err);
 }
 }
 });

 return () => {
 supabase.removeChannel(channel);
 };
  }, [storeId]);

 const toggleFullscreen = () => {
 if (!document.fullscreenElement) {
 document.documentElement.requestFullscreen().then(() => setIsFullscreen(true));
 } else {
 if (document.exitFullscreen) {
 document.exitFullscreen().then(() => setIsFullscreen(false));
 }
 }
 };

 useEffect(() => {
 const onFullscreenChange = () => {
 setIsFullscreen(!!document.fullscreenElement);
 };
 document.addEventListener("fullscreenchange", onFullscreenChange);
 return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
 }, []);

 const handleStatusChange = async (e: React.MouseEvent, orderId: string, newStatus: string) => {
 e.stopPropagation(); // Previne abrir o detalhe ao clicar na ação rápida
 const res = await updateOrderStatus({ data: { orderId, status: newStatus as any } });
 if (res?.status === "ok") {
 toast.success("Status atualizado!");
 setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)));
 if (selectedOrder && selectedOrder.id === orderId) {
 setSelectedOrder((prev: any) => ({ ...prev, status: newStatus }));
 }
 } else {
 toast.error("Erro ao atualizar o pedido");
 }
 };

 const handlePrint = () => {
 window.print();
 };

 const handleNotifyCustomerWhatsApp = (order: any, e?: React.MouseEvent) => {
 if (e) e.stopPropagation();
 const phone = order.customer_snapshot?.phone || order.customer?.phone;
 if (!phone) {
 toast.error("Este cliente não possui telefone/WhatsApp cadastrado.");
 return;
 }

 const cleanPhone = phone.replace(/\D/g, "");
 const intlPhone = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;
 const orderNum = order.id.split("-")[0].toUpperCase();
 const clientName = order.customer_snapshot?.name || order.customer?.name || "Cliente";

 let statusMsg = "seu pedido foi recebido e já está na fila de preparo da nossa cozinha!";
 if (order.status === "processing") {
 statusMsg = "seu pedido está sendo preparado com todo carinho pela nossa equipe!";
 } else if (order.status === "shipped") {
 statusMsg = order.shipping_method === "pickup"
 ? "seu pedido já está pronto e aguardando você para retirada no balcão!"
 : "seu pedido acabou de sair para entrega com nosso entregador!";
 } else if (order.status === "delivered") {
 statusMsg = "seu pedido foi entregue! Bom apetite e muito obrigado pela preferência!";
 }

 const message = `Olá, ${clientName}! Passando para avisar que o Pedido #${orderNum} foi atualizado: ${statusMsg}`;
 const url = `https://wa.me/${intlPhone}?text=${encodeURIComponent(message)}`;
 window.open(url, "_blank");
 };

 const columns = [
 {
 id: "paid",
 title: "Novos (Pendentes)",
 icon: <PackageSearch className="size-5" />,
 color: "bg-info/10 text-info border-info/20",
 nextStatus: "processing",
 nextLabel: "Iniciar Preparo",
 },
 {
 id: "processing",
 title: "Em Preparo",
 icon: <ChefHat className="size-5" />,
 color: "bg-warning/10 text-warning border-warning/20",
 nextStatus: "shipped",
 nextLabel: "Pronto p/ Entrega",
 },
 {
 id: "shipped",
 title: "Aguardando Retirada",
 icon: <Bike className="size-5" />,
 color: "bg-secondary text-secondary-foreground border-border",
 nextStatus: "delivered",
 nextLabel: "Finalizar (Entregue)",
 },
 {
 id: "delivered",
 title: "Concluídos",
 icon: <CheckCircle2 className="size-5" />,
 color: "bg-success/10 text-success border-success/20",
 nextStatus: null,
 nextLabel: null,
 },
 ];

 return (
 <NicheOperationalGuard
 targetNiche="gastronomy"
 toolTitle="KDS Gestor de Pedidos & Cozinha"
 toolDescription="O painel KDS (Kitchen Display System) em tempo real, com divisão de praças e tempos de cocção, é projetado especificamente para restaurantes e delivery de alimentação."
 store={store}
 >
 <div className="fixed inset-0 z-50 bg-background flex flex-col h-screen overflow-hidden text-foreground">
 {/* Estilos de Impressão (Bobina 80mm) */}
 <style>{`
 @media print {
 body * {
 visibility: hidden;
 }
 #printable-receipt, #printable-receipt * {
 visibility: visible;
 }
 #printable-receipt {
 position: absolute;
 left: 0;
 top: 0;
 width: 80mm;
 padding: 0;
 margin: 0;
 font-family: monospace;
 color: #000;
 background: #fff;
 }
 .no-print {
 display: none !important;
 }
 }
 `}</style>

 {/* Topbar */}
 <header className="flex-none h-16 bg-card px-4 flex items-center justify-between no-print">
 <div className="flex items-center gap-4">
 {!isFullscreen && (
 <Button variant="ghost" size="icon" asChild>
 <Link to="/workspace/pedidos">
 <ArrowLeft className="size-5" />
 </Link>
 </Button>
 )}
 <div>
 <div className="flex items-center gap-2">
 <h1 className="text-lg font-black tracking-tight leading-none">Gestor de Pedidos & Expedição</h1>
 <Badge variant="outline" className="text-[10px] uppercase font-mono bg-muted text-muted-foreground border-border/80">
 Balcão & Atendimento
 </Badge>
 </div>
 <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
 <Clock className="size-3" /> Atualizado em {new Date().toLocaleTimeString()}
 </p>
 </div>
 </div>
 <div className="flex items-center gap-2">
 <div className="flex items-center bg-muted/50 p-1 rounded-xl border border-border/80">
 <Button
 variant={viewMode === "kanban" ? "default" : "ghost"}
 size="sm"
 onClick={() => setViewMode("kanban")}
 className="h-8 text-xs font-bold rounded-lg gap-1.5"
 >
 <Kanban className="size-3.5" />
 Kanban KDS
 </Button>
 <Button
 variant={viewMode === "live_dashboard" ? "default" : "ghost"}
 size="sm"
 onClick={() => setViewMode("live_dashboard")}
 className="h-8 text-xs font-bold rounded-lg gap-1.5"
 >
 <LayoutDashboard className="size-3.5" />
 Live Dashboard
 </Button>
 </div>

 <Button
 variant="outline"
 size="sm"
 asChild
 className="gap-1.5 text-xs font-bold bg-primary/5 text-primary border-primary/20 hover:bg-primary/10"
 >
 <Link to="/workspace/pdv/cozinha">
 <ChefHat className="size-3.5" />
 Abrir KDS Cozinha
 </Link>
 </Button>
        {!audioUnlocked && (
          <Badge
            variant="warning"
            className="cursor-pointer text-xs select-none"
            onClick={() => {
              unlockAudioContext();
              setAudioUnlocked(true);
            }}
          >
            Ativar Áudio
          </Badge>
        )}
 <Button variant="outline" size="sm" onClick={toggleFullscreen} className="gap-1.5 text-xs font-bold">
 <Maximize className="size-3.5" />
 {isFullscreen ? "Sair" : "Tela Cheia"}
 </Button>
 </div>
 </header>

 {/* Subheader: Abas Operacionais (Agora vs Agendados), Filtros Omnichannel & Busca Instantânea */}
 <div className="flex-none bg-card border-b border-border/80 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 no-print">
 {/* Abas Agora vs Agendados */}
 <div className="flex items-center gap-1.5 bg-muted/50 p-1 rounded-xl border border-border/70">
 <button
 type="button"
 onClick={() => setTimingTab("now")}
 className={cn(
 "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
 timingTab === "now"
 ? "bg-background text-foreground shadow-2xs"
 : "text-muted-foreground hover:text-foreground",
 )}
 >
 <span>Agora</span>
 <Badge variant="secondary" className="font-mono text-[10px] px-1.5 py-0 h-4">
 {nowCount}
 </Badge>
 </button>

 <button
 type="button"
 onClick={() => setTimingTab("scheduled")}
 className={cn(
 "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
 timingTab === "scheduled"
 ? "bg-background text-foreground shadow-2xs"
 : "text-muted-foreground hover:text-foreground",
 )}
 >
 <span>Agendados</span>
 <Badge variant="secondary" className="font-mono text-[10px] px-1.5 py-0 h-4">
 {scheduledCount}
 </Badge>
 </button>
 </div>

 {/* Chips de Canais Omnichannel */}
 <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
 {[
 { id: "all", label: "Todos os Canais" },
 { id: "ifood", label: "iFood" },
 { id: "whatsapp", label: "WhatsApp" },
 { id: "web", label: "Cardápio Próprio" },
 { id: "delivery", label: "Delivery" },
 { id: "counter", label: "Balcão / Mesa" },
 ].map((ch) => (
 <button
 key={ch.id}
 type="button"
 onClick={() => setChannelFilter(ch.id)}
 className={cn(
 "px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer border",
 channelFilter === ch.id
 ? "bg-foreground text-background border-foreground"
 : "bg-background text-muted-foreground border-border hover:text-foreground hover:border-foreground/40",
 )}
 >
 {ch.label}
 </button>
 ))}
 </div>

 {/* Campo de Busca Rápida */}
 <div className="relative w-full sm:w-64">
 <Input
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 placeholder="Buscar cliente, pedido, rua..."
 className="h-8 text-xs rounded-xl pl-3 pr-8 bg-background border-border/80"
 />
 {searchQuery && (
 <button
 type="button"
 onClick={() => setSearchQuery("")}
 className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
 >
 ✕
 </button>
 )}
 </div>
 </div>

 {/* Alerta Inteligente de SLA Operacional (Tempo Real) */}
 {delayedOrders.length > 0 && (
 <div className="bg-rose-500/10 border-b border-rose-500/30 px-4 py-2.5 flex items-center justify-between text-xs text-rose-700 dark:text-rose-400 no-print">
 <div className="flex items-center gap-2 font-bold">
 <AlertTriangle className="size-4 text-rose-500 animate-bounce" />
 <span>
 Atenção Operacional: {delayedOrders.length} pedido(s) ultrapassou(aram) o tempo ideal de preparo (&gt;30min)!
 </span>
 </div>
 <button
 type="button"
 onClick={() => setAlertModalOpen(true)}
 className="font-bold underline hover:text-rose-900 dark:hover:text-rose-200 cursor-pointer"
 >
 Intervir e Avisar Cozinha / Cliente
 </button>
 </div>
 )}

 {/* Live Dashboard Operacional ou Kanban Board */}
 {viewMode === "live_dashboard" ? (
 <div className="flex-1 overflow-y-auto no-scrollbar p-4 sm:p-6 space-y-6 bg-muted/20 no-print">
 {/* 8 KPIs do Turno Operacional */}
 <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
 <div className="p-4 rounded-2xl bg-card border border-border/80 space-y-1">
 <span className="text-[10px] font-bold text-muted-foreground uppercase">Total Pedidos</span>
 <p className="text-2xl font-black text-foreground font-mono">{kpis.total}</p>
 </div>
 <div className="p-4 rounded-2xl bg-card border border-border/80 space-y-1">
 <span className="text-[10px] font-bold text-emerald-600 uppercase">Concluídos</span>
 <p className="text-2xl font-black text-emerald-600 font-mono">{kpis.completed}</p>
 </div>
 <div className="p-4 rounded-2xl bg-card border border-border/80 space-y-1">
 <span className="text-[10px] font-bold text-blue-600 uppercase">Em Fila</span>
 <p className="text-2xl font-black text-blue-600 font-mono">{kpis.active}</p>
 </div>
 <div className="p-4 rounded-2xl bg-card border border-border/80 space-y-1">
 <span className="text-[10px] font-bold text-rose-600 uppercase">Cancelados</span>
 <p className="text-2xl font-black text-rose-600 font-mono">{kpis.cancelled}</p>
 </div>
 <div className="p-4 rounded-2xl bg-card border border-border/80 space-y-1">
 <span className="text-[10px] font-bold text-muted-foreground uppercase">Faturamento</span>
 <p className="text-lg font-black text-foreground font-mono truncate">{formatMoney(kpis.revenue)}</p>
 </div>
 <div className="p-4 rounded-2xl bg-card border border-border/80 space-y-1">
 <span className="text-[10px] font-bold text-muted-foreground uppercase">Ticket Médio</span>
 <p className="text-lg font-black text-foreground font-mono truncate">{formatMoney(kpis.avgTicket)}</p>
 </div>
 <div className="p-4 rounded-2xl bg-card border border-border/80 space-y-1">
 <span className="text-[10px] font-bold text-amber-600 uppercase">TMP (Preparo)</span>
 <p className="text-xl font-black text-foreground font-mono">~{kpis.avgPrepTime}m</p>
 </div>
 <div className="p-4 rounded-2xl bg-card border border-border/80 space-y-1">
 <span className="text-[10px] font-bold text-purple-600 uppercase">TME (Entrega)</span>
 <p className="text-xl font-black text-foreground font-mono">~{kpis.avgDeliveryTime}m</p>
 </div>
 </div>

 {/* Tabela de Operações ao Vivo */}
 <div className="rounded-2xl border border-border bg-card overflow-hidden">
 <div className="p-4 border-b border-border/80 flex items-center justify-between">
 <div>
 <h3 className="text-sm font-bold text-foreground">Live Dashboard de Pedidos & Acompanhamento de SLA</h3>
 <p className="text-xs text-muted-foreground">Monitoramento segundo a segundo para eliminação de gargalos operacionais</p>
 </div>
 <Badge variant="outline" className="font-mono text-xs font-bold bg-muted/40">
 {orders.length} pedidos hoje
 </Badge>
 </div>

 {/* ── Visualização Móvel: Cards Verticais Ergonômicos (Apple HIG / Paradigma Clean) ── */}
 <div className="block md:hidden divide-y divide-border/60">
 {orders.map((ord) => {
 const elapsed = Math.floor((Date.now() - new Date(ord.created_at).getTime()) / 60000);
 const isLate = elapsed > 30 && !["delivered", "completed", "cancelled"].includes(ord.status);
 const ch = getChannelInfo(ord);

 return (
 <div
 key={ord.id}
 onClick={() => setSelectedOrder(ord)}
 className="p-4 space-y-3 bg-card hover:bg-muted/30 transition-colors cursor-pointer"
 >
 <div className="flex items-center justify-between gap-2">
 <div className="flex items-center gap-2">
 <span className="font-mono font-bold text-sm text-foreground">
 #{ord.id.split("-")[0].toUpperCase()}
 </span>
 <Badge variant="outline" className={cn("text-[10px] font-bold border", ch.color)}>
 {ch.label}
 </Badge>
 </div>
 <Badge variant="secondary" className="text-[10px] uppercase font-bold">
 {ord.status}
 </Badge>
 </div>

 <div className="flex items-center justify-between gap-2">
 <p className="text-sm font-semibold text-foreground truncate">
 {ord.customer_snapshot?.name || ord.customer?.name || "Cliente Avulso"}
 </p>
 <span className="font-mono font-bold text-base text-foreground shrink-0">
 {formatMoney(ord.total_cents)}
 </span>
 </div>

 <div className="space-y-1.5 pt-1">
 <div className="flex items-center justify-between text-xs font-mono">
 <span className={isLate ? "text-rose-500 font-bold" : "text-muted-foreground"}>
 {elapsed} min {isLate && "• ATRASO"}
 </span>
 <span className="text-muted-foreground">Meta: 30 min</span>
 </div>
 <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
 <div
 className={cn(
 "h-full transition-all",
 isLate ? "bg-rose-500" : elapsed > 20 ? "bg-amber-500" : "bg-emerald-500",
 )}
 style={{ width: `${Math.min(100, Math.round((elapsed / 30) * 100))}%` }}
 />
 </div>
 </div>

 <div className="flex items-center gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
 {(ord.customer_snapshot?.phone || ord.customer?.phone) && (
 <Button
 size="icon"
 variant="outline"
 title="Avisar cliente WhatsApp"
 onClick={(e) => handleNotifyCustomerWhatsApp(ord, e)}
 className="size-11 sm:size-9 rounded-xl text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10 cursor-pointer shrink-0"
 >
 <MessageCircle className="size-4" />
 </Button>
 )}
 <Button
 size="sm"
 variant="outline"
 onClick={() => setSelectedOrder(ord)}
 className="flex-1 h-11 sm:h-9 rounded-xl text-xs font-bold cursor-pointer"
 >
 Ver Detalhes
 </Button>
 </div>
 </div>
 );
 })}
 </div>

 {/* ── Visualização Desktop: Tabela Analítica de Alta Densidade ── */}
 <div className="hidden md:block">
 <Table>
 <TableHeader>
 <TableRow className="bg-muted/30">
 <TableHead>Pedido</TableHead>
 <TableHead>Canal</TableHead>
 <TableHead>Cliente</TableHead>
 <TableHead>Valor</TableHead>
 <TableHead>Status</TableHead>
 <TableHead className="w-56">Tempo / SLA</TableHead>
 <TableHead className="text-right">Ações</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {orders.map((ord) => {
 const elapsed = Math.floor((Date.now() - new Date(ord.created_at).getTime()) / 60000);
 const isLate = elapsed > 30 && !["delivered", "completed", "cancelled"].includes(ord.status);
 const ch = getChannelInfo(ord);

 return (
 <TableRow key={ord.id} className="cursor-pointer hover:bg-muted/40" onClick={() => setSelectedOrder(ord)}>
 <TableCell className="font-mono font-bold text-xs">
 #{ord.id.split("-")[0].toUpperCase()}
 </TableCell>
 <TableCell>
 <Badge variant="outline" className={cn("text-[10px] font-bold border", ch.color)}>
 {ch.label}
 </Badge>
 </TableCell>
 <TableCell className="text-xs font-medium">
 {ord.customer_snapshot?.name || ord.customer?.name || "Cliente Avulso"}
 </TableCell>
 <TableCell className="font-mono font-bold text-xs">
 {formatMoney(ord.total_cents)}
 </TableCell>
 <TableCell>
 <Badge variant="secondary" className="text-[10px] uppercase font-bold">
 {ord.status}
 </Badge>
 </TableCell>
 <TableCell>
 <div className="space-y-1">
 <div className="flex items-center justify-between text-[10px] font-mono">
 <span className={isLate ? "text-rose-500 font-bold" : "text-muted-foreground"}>
 {elapsed} min {isLate && "• ATRASO"}
 </span>
 <span className="text-muted-foreground">Meta: 30 min</span>
 </div>
 <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
 <div
 className={cn(
 "h-full transition-all",
 isLate ? "bg-rose-500" : elapsed > 20 ? "bg-amber-500" : "bg-emerald-500",
 )}
 style={{ width: `${Math.min(100, Math.round((elapsed / 30) * 100))}%` }}
 />
 </div>
 </div>
 </TableCell>
 <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
 <div className="flex items-center justify-end gap-1.5">
 {(ord.customer_snapshot?.phone || ord.customer?.phone) && (
 <Button
 size="icon"
 variant="ghost"
 title="Avisar cliente WhatsApp"
 onClick={(e) => handleNotifyCustomerWhatsApp(ord, e)}
 className="size-8 rounded-lg text-emerald-600 hover:bg-emerald-500/10 cursor-pointer"
 >
 <MessageCircle className="size-4" />
 </Button>
 )}
 <Button
 size="sm"
 variant="outline"
 onClick={() => setSelectedOrder(ord)}
 className="h-8 rounded-lg text-xs font-bold cursor-pointer"
 >
 Detalhes
 </Button>
 </div>
 </TableCell>
 </TableRow>
 );
 })}
 </TableBody>
 </Table>
 </div>
 </div>

 {/* Relatórios de Curva ABC & Canais do Turno (Diggy / Food Intelligence) */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
 {/* Mais Vendidos */}
 <div className="p-5 rounded-2xl border border-border bg-card space-y-3">
 <div className="flex items-center justify-between">
 <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
 Top 5 Mais Vendidos do Turno
 </h4>
 <Badge variant="outline" className="text-[10px] font-mono">
 Curva ABC
 </Badge>
 </div>

 {topProducts.length === 0 ? (
 <p className="text-xs text-muted-foreground py-4 text-center">
 Aguardando pedidos concluídos para consolidação do ranking.
 </p>
 ) : (
 <div className="space-y-2">
 {topProducts.map((prod, idx) => (
 <div key={prod.title} className="flex items-center justify-between p-2 rounded-xl bg-muted/20 text-xs">
 <div className="flex items-center gap-2">
 <span className="size-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px] font-mono">
 {idx + 1}
 </span>
 <span className="font-semibold text-foreground">{prod.title}</span>
 </div>
 <div className="flex items-center gap-3 font-mono">
 <span className="text-muted-foreground">{prod.count} un</span>
 <span className="font-bold text-foreground">{formatMoney(prod.totalCents)}</span>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>

 {/* Vendas por Canal / Método */}
 <div className="p-5 rounded-2xl border border-border bg-card space-y-3">
 <div className="flex items-center justify-between">
 <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
 Vendas por Canal de Origem
 </h4>
 <Badge variant="outline" className="text-[10px] font-mono">
 Omnichannel
 </Badge>
 </div>

 {channelStats.length === 0 ? (
 <p className="text-xs text-muted-foreground py-4 text-center">
 Nenhuma venda registrada no turno atual.
 </p>
 ) : (
 <div className="space-y-2">
 {channelStats.map((st) => (
 <div key={st.label} className="flex items-center justify-between p-2 rounded-xl bg-muted/20 text-xs">
 <span className="font-semibold text-foreground">{st.label}</span>
 <div className="flex items-center gap-3 font-mono">
 <span className="text-muted-foreground">{st.count} pedido(s)</span>
 <span className="font-bold text-foreground">{formatMoney(st.totalCents)}</span>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 </div>
 </div>
 ) : (
 /* Kanban Board */
 <main className="flex-1 overflow-x-auto no-scrollbar p-4 flex gap-4 bg-muted/30 no-print">
 {columns.map((col) => {
 const isPrepCol = col.id === "processing";
 const colOrders = orders
 .filter((o) => {
 // 1. Status da coluna
 const matchesStatus = isPrepCol
 ? o.status === "processing" || o.status === "kitchen_prep"
 : o.status === col.id;
 if (!matchesStatus) return false;

 // 2. Aba Agora vs Agendados
 const isSched = Boolean(o.is_scheduled || (o.scheduled_for && new Date(o.scheduled_for).getTime() > Date.now()));
 if (timingTab === "now" && isSched) return false;
 if (timingTab === "scheduled" && !isSched) return false;

 // 3. Filtro por canal
 if (channelFilter !== "all") {
 if (channelFilter === "counter") {
 const isCounter = o.origin_type === "counter" || o.origin_type === "table" || o.shipping_method === "pickup" || o.table_identifier;
 if (!isCounter) return false;
 } else if (channelFilter === "delivery") {
 if (o.shipping_method !== "delivery") return false;
 } else if (o.channel_origin !== channelFilter) {
 return false;
 }
 }

 // 4. Busca
 if (searchQuery.trim()) {
 const q = searchQuery.toLowerCase().trim();
 const ordNum = (o.public_token || o.id || "").toLowerCase();
 const cName = (o.customer_snapshot?.name || o.customer?.name || "").toLowerCase();
 const cPhone = o.customer_snapshot?.phone || o.customer?.phone || "";
 const addr = (o.shipping_address?.street || "").toLowerCase();
 if (!ordNum.includes(q) && !cName.includes(q) && !cPhone.includes(q) && !addr.includes(q)) {
 return false;
 }
 }

 return true;
 })
 .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

 return (
 <div key={col.id} className="flex-shrink-0 w-[350px] flex flex-col gap-3 h-full">
 <div
 className={`rounded-xl border ${col.color} p-3 flex items-center justify-between bg-surface-paper `}
 >
 <div className="flex items-center gap-2 font-bold text-sm">
 {col.icon}
 {col.title}
 </div>
 <Badge variant="secondary" className="font-mono text-sm">
 {colOrders.length}
 </Badge>
 </div>

 <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col gap-3 pb-6">
 {colOrders.map((order) => {
 const elapsedMinutes = Math.floor(
 (Date.now() - new Date(order.created_at).getTime()) / 60000,
 );
 const isLate = elapsedMinutes > 30;

 return (
 <div
 key={order.id}
 className="bg-card border border-border/80 rounded-2xl p-4 flex flex-col gap-3 cursor-pointer hover:border-primary/50 transition-all shadow-2xs"
 onClick={() => setSelectedOrder(order)}
 >
 <div className="flex justify-between items-start gap-2">
 <div className="space-y-1">
 <div className="flex items-center gap-2">
 <span className="text-xs font-bold text-muted-foreground font-mono">
 #{order.id.split("-")[0].toUpperCase()}
 </span>
 <span
 className={cn(
 "text-[10px] font-semibold px-2 py-0.5 rounded-md font-mono flex items-center gap-1",
 isLate
 ? "bg-rose-500/10 text-rose-500 border border-rose-500/20"
 : "bg-muted text-muted-foreground",
 )}
 >
 <Clock className="size-3" />
 {elapsedMinutes < 1 ? "< 1 min" : `${elapsedMinutes} min`}
 </span>
 </div>

 <h4 className="font-bold text-sm leading-tight text-foreground">
 {order.customer_snapshot?.name ||
 order.customer?.name ||
 "Cliente Avulso"}
 </h4>

 {/* Canal de Venda & Origem Omnichannel */}
 <div className="flex items-center gap-1.5 pt-0.5">
 {(() => {
 const ch = getChannelInfo(order);
 return (
 <Badge
 variant="outline"
 className={cn("text-[10px] px-1.5 py-0 h-4 font-bold border", ch.color)}
 >
 {ch.label}
 </Badge>
 );
 })()}
 {order.customer_snapshot?.phone && (
 <span className="text-[10px] text-muted-foreground font-mono">
 {order.customer_snapshot.phone}
 </span>
 )}
 </div>

 {/* Barra de Progresso de SLA */}
 <div className="w-full bg-muted/60 h-1.5 rounded-full overflow-hidden mt-1">
 <div
 className={cn(
 "h-full transition-all duration-500",
 elapsedMinutes > 30
 ? "bg-rose-500"
 : elapsedMinutes > 20
 ? "bg-amber-500"
 : "bg-emerald-500",
 )}
 style={{
 width: `${Math.min(100, Math.round((elapsedMinutes / 30) * 100))}%`,
 }}
 />
 </div>
 </div>

 <Badge variant="outline" className="font-mono bg-muted/40 border-border/80 text-xs font-bold">
 {formatMoney(order.total_cents)}
 </Badge>
 </div>

 <div className="py-2 border-y border-border/60 text-xs space-y-1.5">
 {order.order_items?.map((item: any) => {
 const options = item.selected_options
 ? Object.values(item.selected_options)
 : [];
 return (
 <div key={item.id} className="flex flex-col">
 <div className="flex justify-between items-start">
 <span className="font-medium text-foreground leading-tight">
 <span className="text-primary font-bold mr-1">{item.qty}x</span>
 {item.product_title || item.title || "Item do Pedido"}
 </span>
 </div>
 {options.length > 0 && (
 <div className="text-[10px] text-muted-foreground mt-0.5 ml-4 pl-1.5 border-l border-border/60 space-y-0.5">
 {options.map((opt: any, idx: number) => (
 <div key={idx}>+ {opt.label || opt.name}</div>
 ))}
 </div>
 )}
 </div>
 );
 })}
 </div>

 {/* Ações Rápidas Diretas no Card */}
 <div className="flex items-center gap-2 pt-1">
 {/* Botão Impressão Térmica Rápida 80mm */}
 <Button
 type="button"
 variant="outline"
 size="icon"
 title="Imprimir comanda térmica (80mm)"
 className="size-11 sm:size-9 rounded-xl text-foreground/80 border-border/80 hover:bg-muted cursor-pointer shrink-0"
 onClick={(e) => {
 e.stopPropagation();
 setSelectedOrder(order);
 setTimeout(() => window.print(), 100);
 }}
 >
 <Printer className="size-4" />
 </Button>

 {/* Botão Recibo Formal A4 */}
 <Button
 type="button"
 variant="outline"
 size="icon"
 title="Ver / Imprimir Recibo Formal A4"
 className="size-11 sm:size-9 rounded-xl text-foreground/80 border-border/80 hover:bg-muted cursor-pointer shrink-0"
 onClick={(e) => {
 e.stopPropagation();
 window.open(`/workspace/pedidos/${order.id}/recibo`, "_blank");
 }}
 >
 <FileText className="size-4" />
 </Button>

 {/* Botão Notificar WhatsApp */}
 {(order.customer_snapshot?.phone || order.customer?.phone) && (
 <Button
 type="button"
 variant="outline"
 size="icon"
 title="Avisar cliente no WhatsApp"
 className="size-11 sm:size-9 rounded-xl text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10 cursor-pointer shrink-0"
 onClick={(e) => handleNotifyCustomerWhatsApp(order, e)}
 >
 <MessageCircle className="size-4" />
 </Button>
 )}
 {col.id === "paid" && (
 <Button
 type="button"
 variant="outline"
 size="sm"
 className="flex-1 h-11 sm:h-9 rounded-xl text-xs font-bold text-rose-500 border-rose-500/20 hover:bg-rose-500/10 cursor-pointer"
 onClick={(e) => {
 e.stopPropagation();
 if (confirm("Deseja realmente recusar e cancelar este pedido?")) {
 handleStatusChange(e, order.id, "cancelled");
 }
 }}
 >
 Recusar
 </Button>
 )}
 {col.nextStatus && (
 <Button
 type="button"
 size="sm"
 className="flex-1 h-11 sm:h-9 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs cursor-pointer"
 onClick={(e) => handleStatusChange(e, order.id, col.nextStatus!)}
 >
 {col.nextLabel}
 </Button>
 )}
 </div>
 </div>
 );
 })}
 {colOrders.length === 0 && (
 <div className="h-24 flex items-center justify-center border-0/60 rounded-xl text-muted-foreground text-sm font-medium bg-surface-paper/50">
 Nenhum pedido nesta fila
 </div>
 )}
 </div>
 </div>
 );
 })}
 </main>
 )}

 {/* Sheet para Detalhes do Pedido (Mobile Fullpage / Desktop Drawer com 3 Abas & Thumb Zone) */}
 <Sheet
 open={!!selectedOrder}
 onOpenChange={(open) => {
 if (!open) {
 setSelectedOrder(null);
 setSheetTab("details");
 }
 }}
 >
 <SheetContent className="w-full sm:max-w-md md:max-w-lg p-0 flex flex-col no-print bg-card border-l border-border h-full">
 {selectedOrder && (
 <>
 {/* Header do Pedido */}
 <SheetHeader className="p-5 pb-3 border-b border-border/60 bg-card shrink-0">
 <div className="flex justify-between items-start">
 <div>
 <div className="flex items-center gap-2">
 <SheetTitle className="text-xl font-black">
 Pedido #{selectedOrder.public_token?.slice(0, 8).toUpperCase() || selectedOrder.id.split("-")[0].toUpperCase()}
 </SheetTitle>
 {(() => {
 const ch = getChannelInfo(selectedOrder);
 return (
 <Badge variant="outline" className={cn("text-[10px] font-bold border", ch.color)}>
 {ch.label}
 </Badge>
 );
 })()}
 </div>
 <p className="text-muted-foreground text-xs mt-0.5 flex items-center gap-1 font-mono">
 <Clock className="size-3" /> {formatDateTime(selectedOrder.created_at)}
 </p>
 </div>
 <Badge variant="secondary" className="font-bold text-xs uppercase">
 {selectedOrder.status === "paid" && "Pendente"}
 {selectedOrder.status === "processing" && "Em Preparo"}
 {selectedOrder.status === "shipped" && "Pronto / Em Rota"}
 {selectedOrder.status === "delivered" && "Concluído"}
 </Badge>
 </div>

 {/* Segmented Control de 3 Abas (Apple HIG / Nielsen Norman) */}
 <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl mt-3 border border-border/60">
 <button
 type="button"
 onClick={() => setSheetTab("details")}
 className={cn(
 "flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
 sheetTab === "details"
 ? "bg-background text-foreground shadow-2xs"
 : "text-muted-foreground hover:text-foreground",
 )}
 >
 Detalhes
 </button>
 <button
 type="button"
 onClick={() => setSheetTab("customer")}
 className={cn(
 "flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
 sheetTab === "customer"
 ? "bg-background text-foreground shadow-2xs"
 : "text-muted-foreground hover:text-foreground",
 )}
 >
 Cliente & Entrega
 </button>
 <button
 type="button"
 onClick={() => setSheetTab("history")}
 className={cn(
 "flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
 sheetTab === "history"
 ? "bg-background text-foreground shadow-2xs"
 : "text-muted-foreground hover:text-foreground",
 )}
 >
 Histórico
 </button>
 </div>
 </SheetHeader>

 {/* Corpo com Scroll das Abas */}
 <div className="flex-1 overflow-y-auto no-scrollbar p-5 space-y-5 text-xs">
 {/* ── ABA 1: DETALHES DOS ITENS & FINANCEIRO ── */}
 {sheetTab === "details" && (
 <div className="space-y-4">
 {/* Lista de Itens */}
 <div className="space-y-2.5">
 <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
 Itens Solicitados ({selectedOrder.order_items?.length || 0})
 </span>
 <div className="space-y-2">
 {selectedOrder.order_items?.map((item: any) => {
 const options = item.selected_options
 ? Object.values(item.selected_options)
 : [];
 return (
 <div key={item.id} className="p-3.5 rounded-xl bg-muted/40 border border-border/60 space-y-1.5">
 <div className="flex justify-between items-start">
 <span className="font-bold text-sm text-foreground">
 <span className="text-primary mr-1.5">{item.qty}x</span>
 {item.product_title || item.title || "Item"}
 </span>
 <span className="font-mono font-bold text-foreground">
 {formatMoney(item.total_cents)}
 </span>
 </div>
 {/* Complementos e Modificadores */}
 {options.length > 0 && (
 <div className="ml-5 pl-2 border-l border-primary/40 space-y-0.5 text-[11px] text-muted-foreground">
 {options.map((opt: any, idx: number) => (
 <div key={idx} className="flex justify-between">
 <span>+ {opt.label || opt.name}</span>
 {opt.price_modifier_cents > 0 && (
 <span className="font-mono font-semibold text-foreground">
 {formatMoney(opt.price_modifier_cents * item.qty)}
 </span>
 )}
 </div>
 ))}
 </div>
 )}
 </div>
 );
 })}
 </div>
 </div>

 {/* Observações da Comanda */}
 {selectedOrder.customer_snapshot?.notes && (
 <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 space-y-0.5">
 <span className="font-bold text-[10px] uppercase">Observações do Cliente:</span>
 <p className="text-xs">{selectedOrder.customer_snapshot.notes}</p>
 </div>
 )}

 {/* Resumo Financeiro */}
 <div className="p-4 rounded-xl bg-muted/30 border border-border/60 space-y-2">
 <div className="flex justify-between text-muted-foreground">
 <span>Subtotal</span>
 <span className="font-mono font-semibold text-foreground">
 {formatMoney(selectedOrder.subtotal_cents || selectedOrder.total_cents)}
 </span>
 </div>
 {selectedOrder.shipping_cents > 0 && (
 <div className="flex justify-between text-muted-foreground">
 <span>Taxa de Entrega</span>
 <span className="font-mono font-semibold text-foreground">
 {formatMoney(selectedOrder.shipping_cents)}
 </span>
 </div>
 )}
 {selectedOrder.discount_cents > 0 && (
 <div className="flex justify-between text-emerald-600">
 <span>Desconto</span>
 <span className="font-mono font-semibold">
 -{formatMoney(selectedOrder.discount_cents)}
 </span>
 </div>
 )}
 <Separator className="my-1" />
 <div className="flex justify-between text-sm font-bold text-foreground">
 <span>Total Geral</span>
 <span className="text-primary font-mono text-base">
 {formatMoney(selectedOrder.total_cents)}
 </span>
 </div>
 </div>
 </div>
 )}

 {/* ── ABA 2: CLIENTE & ENTREGA ── */}
 {sheetTab === "customer" && (
 <div className="space-y-4">
 {/* Dados do Cliente */}
 <div className="p-4 rounded-xl bg-muted/40 border border-border/60 space-y-2">
 <span className="text-[10px] font-bold text-muted-foreground uppercase">Cliente</span>
 <p className="text-base font-bold text-foreground">
 {selectedOrder.customer_snapshot?.name || selectedOrder.customer?.name || "Cliente Avulso"}
 </p>
 {selectedOrder.customer_snapshot?.phone && (
 <p className="font-mono text-muted-foreground flex items-center gap-1.5">
 <Phone className="size-3.5" />
 {selectedOrder.customer_snapshot.phone}
 </p>
 )}
 </div>

 {/* Modalidade de Expedição */}
 <div className="p-4 rounded-xl bg-muted/40 border border-border/60 space-y-3">
 <span className="text-[10px] font-bold text-muted-foreground uppercase">
 Tipo de Atendimento
 </span>
 {selectedOrder.shipping_method === "pickup" ? (
 <div className="flex items-center gap-2 text-amber-600 font-bold">
 <Users className="size-4" />
 <span>Retirada no Balcão da Loja</span>
 </div>
 ) : selectedOrder.table_identifier ? (
 <div className="flex items-center gap-2 text-blue-600 font-bold">
 <UtensilsCrossed className="size-4" />
 <span>Consumo Local — Mesa {selectedOrder.table_identifier}</span>
 </div>
 ) : (
 <div className="space-y-3">
 <div className="flex items-center gap-2 text-emerald-600 font-bold">
 <Bike className="size-4" />
 <span>Entrega em Domicílio (Delivery)</span>
 </div>
 {selectedOrder.shipping_address && (
 <div className="p-3 bg-background rounded-lg border border-border/80 space-y-1 text-xs">
 <p className="font-semibold text-foreground">
 {selectedOrder.shipping_address.street}, {selectedOrder.shipping_address.number || "S/N"}
 {selectedOrder.shipping_address.complement ? ` - ${selectedOrder.shipping_address.complement}` : ""}
 </p>
 <p className="text-muted-foreground">
 {selectedOrder.shipping_address.neighborhood && `${selectedOrder.shipping_address.neighborhood}, `}
 {selectedOrder.shipping_address.city || ""}
 </p>
 </div>
 )}
 {selectedOrder.shipping_address?.street && (
 <div className="grid grid-cols-2 gap-2 pt-1">
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={() => {
 const addr = encodeURIComponent(`${selectedOrder.shipping_address.street}, ${selectedOrder.shipping_address.number || ""}, ${selectedOrder.shipping_address.city || ""}`);
 window.open(`https://www.google.com/maps/search/?api=1&query=${addr}`, "_blank");
 }}
 className="h-9 rounded-xl text-xs font-semibold gap-1.5"
 >
 <Navigation className="size-3.5 text-primary" />
 Google Maps
 </Button>
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={() => {
 const addr = encodeURIComponent(`${selectedOrder.shipping_address.street}, ${selectedOrder.shipping_address.number || ""}, ${selectedOrder.shipping_address.city || ""}`);
 window.open(`https://waze.com/ul?q=${addr}`, "_blank");
 }}
 className="h-9 rounded-xl text-xs font-semibold gap-1.5"
 >
 <Navigation className="size-3.5 text-info" />
 Waze
 </Button>
 </div>
 )}
 </div>
 )}
 </div>
 </div>
 )}

 {/* ── ABA 3: HISTÓRICO & SLAs ── */}
 {sheetTab === "history" && (
 <div className="space-y-4">
 <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
 Linha do Tempo Operacional
 </span>
 <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
 {/* Checkpoint 1: Criação */}
 <div className="relative">
 <span className="absolute -left-6 top-1 size-3.5 rounded-full bg-primary border-2 border-background" />
 <p className="font-bold text-foreground">Pedido Criado / Confirmado</p>
 <p className="text-[11px] text-muted-foreground font-mono">
 {formatDateTime(selectedOrder.created_at)}
 </p>
 </div>

 {/* Checkpoint 2: Início do Preparo */}
 <div className="relative">
 <span className={cn(
 "absolute -left-6 top-1 size-3.5 rounded-full border-2 border-background",
 selectedOrder.prep_started_at || selectedOrder.status !== "paid"
 ? "bg-amber-500"
 : "bg-muted-foreground/40",
 )} />
 <p className="font-bold text-foreground">Início do Preparo na Cozinha</p>
 <p className="text-[11px] text-muted-foreground font-mono">
 {selectedOrder.prep_started_at ? formatDateTime(selectedOrder.prep_started_at) : "Aguardando início"}
 </p>
 </div>

 {/* Checkpoint 3: Expedição / Pronto */}
 <div className="relative">
 <span className={cn(
 "absolute -left-6 top-1 size-3.5 rounded-full border-2 border-background",
 selectedOrder.shipped_at || ["shipped", "delivered"].includes(selectedOrder.status)
 ? "bg-blue-500"
 : "bg-muted-foreground/40",
 )} />
 <p className="font-bold text-foreground">Pronto para Retirada / Despachado</p>
 <p className="text-[11px] text-muted-foreground font-mono">
 {selectedOrder.shipped_at ? formatDateTime(selectedOrder.shipped_at) : "Pendente"}
 </p>
 </div>

 {/* Checkpoint 4: Finalizado */}
 <div className="relative">
 <span className={cn(
 "absolute -left-6 top-1 size-3.5 rounded-full border-2 border-background",
 selectedOrder.delivered_at || selectedOrder.status === "delivered"
 ? "bg-emerald-500"
 : "bg-muted-foreground/40",
 )} />
 <p className="font-bold text-foreground">Pedido Entregue / Concluído</p>
 <p className="text-[11px] text-muted-foreground font-mono">
 {selectedOrder.delivered_at ? formatDateTime(selectedOrder.delivered_at) : "Pendente"}
 </p>
 </div>
 </div>
 </div>
 )}
 </div>

 {/* ── THUMB ZONE FOOTER (Apple HIG / Nielsen Norman: Alvos Mínimos de 44px) ── */}
 <div className="p-4 border-t border-border/80 bg-card flex items-center gap-2 shrink-0">
 <Button
 type="button"
 variant="outline"
 size="icon"
 onClick={handlePrint}
 title="Imprimir comanda térmica 80mm"
 className="size-11 rounded-xl shrink-0 cursor-pointer"
 >
 <Printer className="size-5" />
 </Button>

 <Button
 type="button"
 variant="outline"
 size="icon"
 onClick={() => window.open(`/workspace/pedidos/${selectedOrder.id}/recibo`, "_blank")}
 title="Ver / Imprimir Recibo Formal A4"
 className="size-11 rounded-xl shrink-0 text-foreground/80 hover:bg-muted cursor-pointer"
 >
 <FileText className="size-5" />
 </Button>

 {(selectedOrder.customer_snapshot?.phone || selectedOrder.customer?.phone) && (
 <Button
 type="button"
 variant="outline"
 size="icon"
 onClick={() => handleNotifyCustomerWhatsApp(selectedOrder)}
 title="Avisar cliente no WhatsApp"
 className="size-11 rounded-xl shrink-0 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10 cursor-pointer"
 >
 <MessageCircle className="size-5" />
 </Button>
 )}

 {selectedOrder.status !== "delivered" && selectedOrder.status !== "completed" ? (
 <Button
 type="button"
 className="flex-1 h-11 rounded-xl font-bold text-xs bg-foreground text-background hover:opacity-90 cursor-pointer"
 onClick={(e) => {
 const nextSt = selectedOrder.status === "paid"
 ? "processing"
 : selectedOrder.status === "processing"
 ? "shipped"
 : "delivered";
 handleStatusChange(e, selectedOrder.id, nextSt);
 }}
 >
 {selectedOrder.status === "paid" && "Iniciar Preparo"}
 {selectedOrder.status === "processing" && "Marcar Pronto / Expedir"}
 {selectedOrder.status === "shipped" && "Finalizar (Entregue)"}
 </Button>
 ) : (
 <Badge variant="outline" className="flex-1 h-11 justify-center rounded-xl text-xs font-bold text-emerald-600 border-emerald-500/30 bg-emerald-500/10">
 ✓ Pedido Finalizado
 </Badge>
 )}
 </div>
 </>
 )}
 </SheetContent>
 </Sheet>

 {/* Printable Receipt (Escondido na tela normal) */}
 {selectedOrder && (
 <div id="printable-receipt" className="hidden">
 <div
 style={{
 textAlign: "center",
 marginBottom: "15px",
 paddingBottom: "10px",
 borderBottom: "1px dashed #000",
 }}
 >
 <h2 style={{ margin: "0 0 5px 0", fontSize: "16px" }}>
 PEDIDO #{selectedOrder.id.split("-")[0].toUpperCase()}
 </h2>
 <p style={{ margin: "0", fontSize: "12px" }}>
 {new Date(selectedOrder.created_at).toLocaleString("pt-BR")}
 </p>
 {selectedOrder.origin_type && (
 <p style={{ margin: "5px 0 0 0", fontSize: "14px", fontWeight: "bold" }}>
 {selectedOrder.origin_type === "table"
 ? "MESA" + (selectedOrder.table_identifier || "")
 : "BALCÃO"}
 </p>
 )}
 </div>

 <div
 style={{ marginBottom: "15px", paddingBottom: "10px", borderBottom: "1px dashed #000" }}
 >
 <p style={{ margin: "0 0 5px 0", fontSize: "14px", fontWeight: "bold" }}>CLIENTE:</p>
 <p style={{ margin: "0", fontSize: "14px" }}>
 {selectedOrder.customer_snapshot?.name || selectedOrder.customer?.name || "Avulso"}
 </p>
 </div>

 <div style={{ marginBottom: "15px" }}>
 <p style={{ margin: "0 0 10px 0", fontSize: "14px", fontWeight: "bold" }}>ITENS:</p>
 {selectedOrder.order_items?.map((item: any) => {
 const options = item.selected_options ? Object.values(item.selected_options) : [];
 return (
 <div key={item.id} style={{ marginBottom: "10px" }}>
 <div
 style={{
 display: "flex",
 justifyContent: "space-between",
 fontSize: "14px",
 fontWeight: "bold",
 }}
 >
 <span>
 {item.qty}x {item.product_title}
 </span>
 </div>
 {options.map((opt: any, idx: number) => (
 <div
 key={idx}
 style={{ fontSize: "12px", marginLeft: "15px", marginTop: "2px" }}
 >
 + {opt.label}
 </div>
 ))}
 </div>
 );
 })}
 </div>

 <div
 style={{
 borderTop: "1px dashed #000",
 paddingTop: "10px",
 display: "flex",
 justifyContent: "space-between",
 fontSize: "16px",
 fontWeight: "bold",
 }}
 >
 <span>TOTAL:</span>
 <span>R$ {(selectedOrder.total_cents / 100).toFixed(2).replace(".", ",")}</span>
 </div>
 </div>
 )}

 {/* ── MODAL DE ALERTA INTELIGENTE DE SLA ── */}
 <Dialog open={alertModalOpen} onOpenChange={setAlertModalOpen}>
 <DialogContent className="sm:max-w-lg">
 <DialogHeader>
 <DialogTitle className="text-base font-bold flex items-center gap-2 text-rose-600">
 <AlertTriangle className="size-5" />
 Intervenção Operacional: Pedidos com Estouro de SLA
 </DialogTitle>
 </DialogHeader>

 <div className="space-y-3 py-3 max-h-[60vh] overflow-y-auto no-scrollbar">
 <p className="text-xs text-muted-foreground">
 Estes pedidos ultrapassaram o tempo alvo estabelecido. Acione a equipe de cozinha ou notifique o cliente para garantir a melhor experiência.
 </p>

 <div className="space-y-2">
 {delayedOrders.map((ord) => {
 const elapsed = Math.floor(
 (Date.now() - new Date(ord.created_at).getTime()) / 60000,
 );
 return (
 <div
 key={ord.id}
 className="p-3.5 rounded-xl bg-muted/30 border border-border/80 flex items-center justify-between gap-3"
 >
 <div className="space-y-0.5">
 <div className="flex items-center gap-2">
 <span className="font-mono font-bold text-xs">
 #{ord.id.split("-")[0].toUpperCase()}
 </span>
 <Badge variant="destructive" className="text-[10px] font-bold">
 +{elapsed - 30} min atrasado
 </Badge>
 </div>
 <p className="text-xs font-medium text-foreground">
 {ord.customer_snapshot?.name || ord.customer?.name || "Cliente Avulso"}
 </p>
 </div>

 <div className="flex items-center gap-2">
 {(ord.customer_snapshot?.phone || ord.customer?.phone) && (
 <Button
 size="sm"
 variant="outline"
 onClick={() => handleNotifyCustomerWhatsApp(ord)}
 className="h-8 text-xs font-bold text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10 rounded-xl"
 >
 <MessageCircle className="size-3.5 mr-1" />
 WhatsApp
 </Button>
 )}
 <Button
 size="sm"
 onClick={() => {
 setSelectedOrder(ord);
 setAlertModalOpen(false);
 }}
 className="h-8 text-xs font-bold rounded-xl"
 >
 Abrir
 </Button>
 </div>
 </div>
 );
 })}
 </div>
 </div>

 <DialogFooter>
 <Button
 variant="outline"
 size="sm"
 onClick={() => setAlertModalOpen(false)}
 className="rounded-xl text-xs font-semibold"
 >
 Fechar
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </div>
 </NicheOperationalGuard>
 );
}
