import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
 Clock,
 ChefHat,
 Check,
 UtensilsCrossed,
 PackageCheck,
 AlertCircle,
 Maximize,
 Minimize,
 Volume2,
 VolumeX,
 Flame,
 CheckSquare,
 Square,
 ArrowLeft,
 Printer,
 Layers,
 Thermometer,
 Coffee,
 Beer,
 CakeSlice,
 Utensils,
} from "lucide-react";
import { toast } from "sonner";

import { listOrders, updateOrderStatus } from "@/services/order.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatTimeOnly, formatDateTime } from "@/lib/datetime";
import { cn } from "@/lib/utils";
import { playNewOrderAlert } from "@/lib/audio-chimes";
import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
 DialogFooter,
} from "@/components/ui/dialog";
import {
 Sheet,
 SheetContent,
 SheetHeader,
 SheetTitle,
} from "@/components/ui/sheet";
import { getStoreSettings } from "@/services/store.functions";
import { NicheOperationalGuard } from "@/components/workspace/niche-operational-guard";

// ─── Estações de Preparo ──────────────────────────────────────────
type PrepStation = "all" | "chapa" | "forno" | "bebidas" | "sobremesas";

const STATIONS: Array<{ id: PrepStation; label: string; icon: any; color: string }> = [
 { id: "all", label: "Todas", icon: Utensils, color: "text-foreground" },
 { id: "chapa", label: "Chapa", icon: Thermometer, color: "text-amber-600 dark:text-amber-400" },
 { id: "forno", label: "Forno", icon: Flame, color: "text-destructive" },
 { id: "bebidas", label: "Bebidas", icon: Beer, color: "text-primary" },
 { id: "sobremesas", label: "Sobremesas", icon: CakeSlice, color: "text-accent-foreground" },
];

// Keywords simples para classificação automática de itens por estação
const STATION_KEYWORDS: Record<Exclude<PrepStation, "all">, string[]> = {
 chapa: ["hambúrg", "burger", "frango", "carne", "costela", "bife", "x-", "smash", "grelhado", "churrasco"],
 forno: ["pizza", "lasanha", "massa", "pão", "bolo", "batata frita", "empanado", "assado", "gratinado"],
 bebidas: ["suco", "coca", "refri", "água", "cerveja", "caipirinha", "drink", "shake", "vitamina", "café", "chá"],
 sobremesas: ["sorvete", "pudim", "brigadeiro", "crepe", "waffle", "torta", "mousse", "cheesecake"],
};

function classifyItemStation(productTitle: string): Exclude<PrepStation, "all"> | null {
 const lower = (productTitle || "").toLowerCase();
 for (const [station, keywords] of Object.entries(STATION_KEYWORDS)) {
 if (keywords.some((kw) => lower.includes(kw))) {
 return station as Exclude<PrepStation, "all">;
 }
 }
 return null;
}

// ─── SLA de Tempo ─────────────────────────────────────────────────
type UrgencyLevel = "normal" | "warning" | "critical";

function getUrgency(createdAt: string, status: string): UrgencyLevel {
 const mins = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
 if (status === "processing") {
 if (mins >= 20) return "critical";
 if (mins >= 10) return "warning";
 return "normal";
 }
 // Em fila (pending)
 if (mins >= 15) return "critical";
 if (mins >= 8) return "warning";
 return "normal";
}

// ─── Audio Chime ───────────────────────────────────────────────────
function playKitchenChime() {
  playNewOrderAlert();
}

export const Route = createFileRoute("/workspace/pdv/cozinha")({
 head: () => ({ meta: [{ title: "KDS Cozinha — Estação de Preparo | Waesy" }] }),
 loader: async () => {
 try {
 const store = await getStoreSettings().catch(() => null);
 return { store };
 } catch {
 return { store: null };
 }
 },
 component: KDSDashboard,
});

function KDSDashboard() {
 const { store } = ((Route.useLoaderData?.() as any) || {});
 const queryClient = useQueryClient();
 const [previousPendingCount, setPreviousPendingCount] = useState<number | null>(null);
 const [isFullscreen, setIsFullscreen] = useState(false);
 const [soundEnabled, setSoundEnabled] = useState(() => {
 try {
 return localStorage.getItem("kds_sound") !== "false";
 } catch {
 return true;
 }
 });
 const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
 const [originFilter, setOriginFilter] = useState<"all" | "table" | "delivery" | "counter">("all");
 const [stationFilter, setStationFilter] = useState<PrepStation>("all");
 const [itemsSummaryOpen, setItemsSummaryOpen] = useState(false);
 const [orderToPrint, setOrderToPrint] = useState<any | null>(null);

 // Polling a cada 3s para atualização em tempo real
 const { data: orders } = useQuery({
 queryKey: ["kds-orders"],
 queryFn: () => listOrders(),
 refetchInterval: 3000,
 });

 const { mutate: changeStatus, isPending } = useMutation({
 mutationFn: updateOrderStatus,
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ["kds-orders"] });
 },
 onError: (err: any) => {
 toast.error(err.message || "Erro ao atualizar status");
 },
 });

 // Pedidos ativos para a cozinha
 const activeOrders = useMemo(() => {
 return (
 orders?.filter((o: any) =>
 ["pending", "paid", "awaiting_payment", "processing", "ready_for_pickup", "shipped"].includes(o.status),
 ) || []
 );
 }, [orders]);

 // Filtro por origem
 const originFiltered = useMemo(() => {
 if (originFilter === "all") return activeOrders;
 return activeOrders.filter((o: any) => {
 if (originFilter === "table") return o.origin_type === "table" || Boolean(o.table_identifier);
 if (originFilter === "delivery") return o.shipping_method === "delivery";
 if (originFilter === "counter") return !o.table_identifier && o.shipping_method !== "delivery";
 return true;
 });
 }, [activeOrders, originFilter]);

 // Filtro por estação de preparo: filtra pedidos que tenham ao menos 1 item da estação
 const filteredOrders = useMemo(() => {
 if (stationFilter === "all") return originFiltered;
 return originFiltered.filter((o: any) => {
 const items = o.order_items || o.items || [];
 return items.some((it: any) => {
 const station = classifyItemStation(it.product_title || it.product_name || "");
 return station === stationFilter;
 });
 });
 }, [originFiltered, stationFilter]);

 // Colunas do Kanban
 const colPending = useMemo(
 () => filteredOrders.filter((o: any) => ["pending", "paid", "awaiting_payment"].includes(o.status)),
 [filteredOrders],
 );
 const colProcessing = useMemo(
 () => filteredOrders.filter((o: any) => o.status === "processing"),
 [filteredOrders],
 );
 const colReady = useMemo(
 () => filteredOrders.filter((o: any) => ["ready_for_pickup", "shipped"].includes(o.status)),
 [filteredOrders],
 );

 // Sumário por estação
 const stationCounts = useMemo(() => {
 const counts: Record<string, number> = { chapa: 0, forno: 0, bebidas: 0, sobremesas: 0 };
 [...colPending, ...colProcessing].forEach((o: any) => {
 const items = o.order_items || o.items || [];
 items.forEach((it: any) => {
 const station = classifyItemStation(it.product_title || it.product_name || "");
 if (station) counts[station] += it.qty ?? it.quantity ?? 1;
 });
 });
 return counts;
 }, [colPending, colProcessing]);

 // Sumário de Itens agrupados para produção em lote
 const itemsSummary = useMemo(() => {
 const summaryMap: Record<string, { title: string; count: number; station: string | null }> = {};
 [...colPending, ...colProcessing].forEach((order: any) => {
 const items = order.order_items || order.items || [];
 items.forEach((it: any) => {
 const title = it.product_title || it.product_name || "Item";
 const qty = it.qty ?? it.quantity ?? 1;
 if (!summaryMap[title]) {
 summaryMap[title] = { title, count: 0, station: classifyItemStation(title) };
 }
 summaryMap[title].count += qty;
 });
 });
 return Object.values(summaryMap).sort((a, b) => b.count - a.count);
 }, [colPending, colProcessing]);

 // Tocar sino quando novo pedido entrar na fila
 useEffect(() => {
 if (soundEnabled && previousPendingCount !== null && colPending.length > previousPendingCount) {
 playKitchenChime();
 }
 setPreviousPendingCount(colPending.length);
 }, [colPending.length, soundEnabled]);

 // Persistir preferência de som
 useEffect(() => {
 try {
 localStorage.setItem("kds_sound", soundEnabled ? "true" : "false");
 } catch {}
 }, [soundEnabled]);

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

 const toggleItemCheck = (itemKey: string) => {
 setCheckedItems((prev) => ({ ...prev, [itemKey]: !prev[itemKey] }));
 };

 const moveOrder = (orderId: string, currentStatus: string) => {
 let nextStatus: any = "processing";
 if (["pending", "paid", "awaiting_payment"].includes(currentStatus)) {
 nextStatus = "processing";
 } else if (currentStatus === "processing") {
 nextStatus = "ready_for_pickup";
 } else if (currentStatus === "ready_for_pickup") {
 nextStatus = "completed";
 }
 changeStatus({ data: { orderId, status: nextStatus } });
 };

 // Bump Bar por teclado
 useEffect(() => {
 const handleKeyDown = (e: KeyboardEvent) => {
 if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

 if (e.code === "Space") {
 e.preventDefault();
 if (colPending.length > 0) {
 const firstOrder = colPending[0];
 moveOrder(firstOrder.id, firstOrder.status);
 toast.success(`⚡ [Bump Bar] Pedido #${firstOrder.id.split("-")[0].toUpperCase()} iniciado!`);
 } else if (colProcessing.length > 0) {
 const firstOrder = colProcessing[0];
 moveOrder(firstOrder.id, firstOrder.status);
 toast.success(`⚡ [Bump Bar] Pedido #${firstOrder.id.split("-")[0].toUpperCase()} finalizado!`);
 }
 }

 if (e.key.toLowerCase() === "f" && !e.ctrlKey && !e.metaKey) toggleFullscreen();
 if (e.key.toLowerCase() === "s" && !e.ctrlKey && !e.metaKey) setSoundEnabled((prev) => !prev);
 if (e.key.toLowerCase() === "r" && !e.ctrlKey && !e.metaKey) {
 queryClient.invalidateQueries({ queryKey: ["kds-orders"] });
 toast.info("Fila da cozinha sincronizada!");
 }
 };

 window.addEventListener("keydown", handleKeyDown);
 return () => window.removeEventListener("keydown", handleKeyDown);
 }, [colPending, colProcessing]);

 return (
 <NicheOperationalGuard
 targetNiche="gastronomy"
 toolTitle="KDS Cozinha & Estação de Preparo"
 toolDescription="O painel KDS (Kitchen Display System) com tempos de cocção, alertas sonoros e divisão por estações de cozinha é desenhado especificamente para restaurantes e gastronomia."
 store={store}
 >
 <div className="flex flex-col h-[calc(100dvh-4rem)] max-w-full overflow-hidden bg-muted/15 text-foreground font-sans">
 {/* ── Topbar da Cozinha ── */}
 <header className="flex flex-col gap-2 px-4 sm:px-6 pt-3 pb-2 bg-card border-b border-border/80 shrink-0">
 {/* Linha 1: Identidade + Ações */}
 <div className="flex items-center justify-between gap-3 flex-wrap">
 <div className="flex items-center gap-3">
 <Button variant="ghost" size="icon" asChild className="size-9 rounded-xl">
 <Link to="/workspace/pdv">
 <ArrowLeft className="size-5" />
 </Link>
 </Button>

 <div className="size-10 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
 <ChefHat className="size-6" />
 </div>
 <div>
 <div className="flex items-center gap-2">
 <h1 className="font-black text-xl tracking-tight leading-none">Cozinha (KDS)</h1>
 <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[10px] font-mono uppercase">
 Estação de Produção
 </Badge>
 </div>
 <p className="text-xs text-muted-foreground mt-0.5">
 {activeOrders.length} pedido{activeOrders.length !== 1 ? "s" : ""} ativos • Atualiza a cada 3s
 </p>
 </div>
 </div>

 {/* Controles */}
 <div className="flex items-center gap-2">
 <Button
 variant="outline"
 size="sm"
 onClick={() => setItemsSummaryOpen(true)}
 className="gap-1.5 text-xs font-bold rounded-xl min-h-[44px] px-3.5"
 >
 <Layers className="size-3.5 text-primary" />
 <span>Lote ({itemsSummary.reduce((acc, i) => acc + i.count, 0)})</span>
 </Button>

 <Button
 variant="outline"
 size="sm"
 className="gap-1.5 text-xs font-bold rounded-xl min-h-[44px] px-3.5"
 onClick={() => setSoundEnabled(!soundEnabled)}
 title={soundEnabled ? "Desativar som (S)" : "Ativar som (S)"}
 >
 {soundEnabled ? <Volume2 className="size-3.5 text-primary" /> : <VolumeX className="size-3.5 text-muted-foreground" />}
 <span className="hidden sm:inline">{soundEnabled ? "Som" : "Mudo"}</span>
 </Button>

 <Button
 variant="outline"
 size="sm"
 className="gap-1.5 text-xs font-bold rounded-xl min-h-[44px] px-3.5"
 onClick={toggleFullscreen}
 title="Tela cheia (F)"
 >
 {isFullscreen ? <Minimize className="size-3.5" /> : <Maximize className="size-3.5" />}
 <span className="hidden sm:inline">{isFullscreen ? "Sair" : "Tela Cheia"}</span>
 </Button>
 </div>
 </div>

 {/* Linha 2: Filtros de Origem + Estação */}
 <div className="flex items-center gap-3 flex-wrap pb-1">
 {/* Filtro por Origem */}
 <div className="flex items-center bg-muted/60 p-0.5 rounded-xl border border-border/60 text-xs font-semibold">
 {(["all", "table", "delivery", "counter"] as const).map((f) => {
 const labels: Record<typeof f, string> = {
 all: `Todos (${activeOrders.length})`,
 table: "Salão",
 delivery: "Delivery",
 counter: "Balcão",
 };
 return (
 <button
 key={f}
 type="button"
 onClick={() => setOriginFilter(f)}
 className={cn(
 "px-2.5 py-1 rounded-lg transition-colors cursor-pointer",
 originFilter === f
 ? "bg-background text-foreground shadow-2xs"
 : "text-muted-foreground hover:text-foreground",
 )}
 >
 {labels[f]}
 </button>
 );
 })}
 </div>

 {/* Separador visual */}
 <div className="w-px h-5 bg-border/60 hidden sm:block" />

 {/* Filtro por Estação de Preparo */}
 <div className="flex items-center gap-1">
 {STATIONS.map((station) => {
 const StationIcon = station.icon;
 const count = station.id === "all"
 ? Object.values(stationCounts).reduce((a, b) => a + b, 0)
 : stationCounts[station.id] ?? 0;
 const isActive = stationFilter === station.id;

 return (
 <button
 key={station.id}
 type="button"
 onClick={() => setStationFilter(station.id)}
 className={cn(
 "flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-bold transition-all cursor-pointer",
 isActive
 ? "bg-background border-border shadow-2xs text-foreground"
 : "border-transparent text-muted-foreground hover:text-foreground hover:border-border/60",
 )}
 >
 <StationIcon className={cn("size-3.5", isActive ? station.color : "")} />
 <span>{station.label}</span>
 {station.id !== "all" && count > 0 && (
 <span className={cn("font-mono text-[10px]", station.color)}>
 {count}
 </span>
 )}
 </button>
 );
 })}
 </div>
 </div>
 </header>

 {/* ── Kanban Board de Produção ── */}
 <main className="flex-1 overflow-x-auto no-scrollbar overflow-y-hidden p-4 md:p-6">
 <div className="flex gap-4 md:gap-6 h-full items-start min-w-[1080px]">
 <KitchenColumn
 title="Recebidos (Fila)"
 count={colPending.length}
 icon={UtensilsCrossed}
 headerClass="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
 orders={colPending}
 onAction={moveOrder}
 actionLabel="Iniciar Preparo"
 actionIcon={ChefHat}
 isPending={isPending}
 checkedItems={checkedItems}
 onToggleCheck={toggleItemCheck}
 onPrint={(ord: any) => setOrderToPrint(ord)}
 stationFilter={stationFilter}
 />

 <KitchenColumn
 title="Em Preparo"
 count={colProcessing.length}
 icon={Flame}
 headerClass="bg-primary/10 text-primary border-primary/30"
 orders={colProcessing}
 onAction={moveOrder}
 actionLabel="Marcar como Pronto"
 actionIcon={Check}
 isPending={isPending}
 checkedItems={checkedItems}
 onToggleCheck={toggleItemCheck}
 onPrint={(ord: any) => setOrderToPrint(ord)}
 stationFilter={stationFilter}
 />

 <KitchenColumn
 title="Pronto p/ Expedição"
 count={colReady.length}
 icon={PackageCheck}
 headerClass="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
 orders={colReady}
 onAction={moveOrder}
 actionLabel="Despachar Pedido"
 actionIcon={Check}
 isPending={isPending}
 checkedItems={checkedItems}
 onToggleCheck={toggleItemCheck}
 onPrint={(ord: any) => setOrderToPrint(ord)}
 stationFilter={stationFilter}
 />
 </div>
 </main>

 {/* ── SHEET: SUMÁRIO DE ITENS POR LOTE ── */}
 <Sheet open={itemsSummaryOpen} onOpenChange={setItemsSummaryOpen}>
 <SheetContent size="wide" className="w-full sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw] flex flex-col">
 <SheetHeader className="pb-3 border-b border-border/70">
 <SheetTitle className="text-lg font-bold flex items-center gap-2">
 <Layers className="size-5 text-primary" />
 Fila de Produção em Lote
 </SheetTitle>
 </SheetHeader>

 <div className="flex-1 overflow-y-auto no-scrollbar py-4 space-y-3">
 {/* Resumo por estação */}
 {Object.entries(stationCounts).some(([, v]) => v > 0) && (
 <div className="grid grid-cols-2 gap-2">
 {STATIONS.filter((s) => s.id !== "all").map((station) => {
 const StationIcon = station.icon;
 const count = stationCounts[station.id] ?? 0;
 if (!count) return null;
 return (
 <div
 key={station.id}
 className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/40 border border-border/60"
 >
 <StationIcon className={cn("size-4 shrink-0", station.color)} />
 <span className="text-xs font-bold text-foreground">{station.label}</span>
 <span className={cn("ml-auto text-sm font-black font-mono", station.color)}>{count}</span>
 </div>
 );
 })}
 </div>
 )}

 {itemsSummary.length === 0 ? (
 <div className="p-8 text-center text-muted-foreground text-xs">
 Nenhum item pendente de preparo no momento.
 </div>
 ) : (
 <div className="space-y-2">
 {itemsSummary.map((item, idx) => {
 const station = STATIONS.find((s) => s.id === item.station);
 const StIcon = station?.icon;
 return (
 <div
 key={idx}
 className="flex items-center justify-between p-3 rounded-xl bg-card border border-border/70 gap-2"
 >
 {StIcon && <StIcon className={cn("size-4 shrink-0", station?.color)} />}
 <span className="font-bold text-sm text-foreground flex-1 min-w-0 truncate">{item.title}</span>
 <Badge variant="default" className="text-sm font-mono font-black px-2.5 py-0.5 shrink-0">
 {item.count}x
 </Badge>
 </div>
 );
 })}
 </div>
 )}
 </div>
 </SheetContent>
 </Sheet>

 {/* ── DIALOG: IMPRESSÃO TÉRMICA DE COMANDA DA COZINHA (80mm) ── */}
 <Dialog open={Boolean(orderToPrint)} onOpenChange={(open) => !open && setOrderToPrint(null)}>
 <DialogContent className="sm:max-w-sm">
 <DialogHeader>
 <DialogTitle className="text-center font-bold text-base flex items-center justify-center gap-2">
 <Printer className="size-4" />
 Comanda Térmica de Produção
 </DialogTitle>
 </DialogHeader>

 {orderToPrint && (
 <div className="py-2 flex flex-col items-center">
 <div
 id="printable-kitchen-ticket"
 className="w-full bg-white text-black p-4 rounded-lg font-mono text-xs border border-neutral-300 space-y-3 shadow-inner"
 >
 <div className="text-center border-b border-dashed border-neutral-400 pb-2">
 <h3 className="font-black text-sm uppercase tracking-wider">PRODUÇÃO COZINHA</h3>
 <p className="text-[10px] text-neutral-600 font-bold">{formatDateTime(orderToPrint.created_at)}</p>
 </div>

 <div className="flex justify-between items-center text-sm font-black border-b border-dashed border-neutral-400 pb-2">
 <span>PEDIDO #{orderToPrint.id.split("-")[0].toUpperCase()}</span>
 <span>
 {orderToPrint.table_identifier
 ? `MESA ${orderToPrint.table_identifier.replace(/^Mesa\s+/i, "")}`
 : orderToPrint.shipping_method === "delivery"
 ? "DELIVERY"
 : "BALCÃO"}
 </span>
 </div>

 <div className="space-y-2 py-1">
 {(orderToPrint.order_items || orderToPrint.items || []).map((it: any, i: number) => {
 const rawOptions = it.selected_options || it.options;
 const optionsList = Array.isArray(rawOptions)
 ? rawOptions
 : typeof rawOptions === "object"
 ? Object.values(rawOptions as object)
 : [];
 const station = classifyItemStation(it.product_title || it.product_name || "");
 const stationInfo = STATIONS.find((s) => s.id === station);

 return (
 <div key={i} className="space-y-0.5">
 <div className="flex justify-between font-black text-sm">
 <span>{it.qty ?? it.quantity ?? 1}x {it.product_title || it.product_name}</span>
 {stationInfo && stationInfo.id !== "all" && (
 <span className="text-[9px] font-bold text-neutral-500 uppercase">
 [{stationInfo.label}]
 </span>
 )}
 </div>
 {optionsList.map((opt: any, oIdx: number) => (
 <p key={oIdx} className="text-[11px] font-bold text-neutral-700 pl-3">
 + {typeof opt === "string" ? opt : opt?.label || opt?.name}
 </p>
 ))}
 {it.notes && (
 <p className="text-[11px] font-black bg-neutral-200 px-1 py-0.5 mt-0.5 uppercase">
 * OBS: {it.notes}
 </p>
 )}
 </div>
 );
 })}
 </div>

 <div className="border-t border-dashed border-neutral-400 pt-2 text-center text-[10px] text-neutral-500">
 Impresso via Waesy Cozinha Inteligente
 </div>
 </div>
 </div>
 )}

 <DialogFooter className="flex gap-2 sm:justify-between items-center">
 <Button variant="ghost" size="sm" onClick={() => setOrderToPrint(null)} className="text-xs">
 Fechar
 </Button>
 <Button size="sm" onClick={() => window.print()} className="font-bold text-xs gap-1.5">
 <Printer className="size-3.5" />
 Imprimir
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </div>
 </NicheOperationalGuard>
 );
}

// ─── Componente KitchenColumn ────────────────────────────────────
function KitchenColumn({
 title,
 count,
 icon: Icon,
 headerClass,
 orders,
 onAction,
 actionLabel,
 actionIcon: ActionIcon,
 isPending,
 checkedItems,
 onToggleCheck,
 onPrint,
 stationFilter,
}: any) {
 return (
 <div className="flex flex-col w-[380px] shrink-0 h-full max-h-full rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
 <div className={cn("p-3.5 border-b flex items-center justify-between shrink-0 font-bold", headerClass)}>
 <h2 className="text-sm flex items-center gap-2 font-bold">
 <Icon className="size-4" /> {title}
 </h2>
 <Badge variant="secondary" className="text-xs font-mono px-2 py-0.5 font-bold">
 {count}
 </Badge>
 </div>

 <div className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-3">
 {orders.map((o: any) => (
 <KitchenTicketCard
 key={o.id}
 order={o}
 onAction={() => onAction(o.id, o.status)}
 actionLabel={actionLabel}
 actionIcon={ActionIcon}
 isPending={isPending}
 checkedItems={checkedItems}
 onToggleCheck={onToggleCheck}
 onPrint={() => onPrint(o)}
 highlightStation={stationFilter !== "all" ? stationFilter : null}
 />
 ))}
 {orders.length === 0 && (
 <div className="h-40 flex flex-col items-center justify-center text-muted-foreground opacity-50 border border-dashed border-border/60 rounded-xl m-2">
 <AlertCircle className="size-7 mb-1.5" />
 <p className="text-xs font-medium">Nenhum pedido nesta etapa</p>
 </div>
 )}
 </div>
 </div>
 );
}

// ─── Componente KitchenTicketCard ────────────────────────────────
function KitchenTicketCard({
 order,
 onAction,
 actionLabel,
 actionIcon: ActionIcon,
 isPending,
 checkedItems,
 onToggleCheck,
 onPrint,
 highlightStation,
}: any) {
 const ticketNumber = order.id.split("-")[0].toUpperCase();
 const waitMinutes = Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000);
 const urgency = getUrgency(order.created_at, order.status);

 const itemsList = order.order_items || order.items || [];

 const originLabel =
 order.origin_type === "table" || order.table_identifier
 ? `Mesa ${(order.table_identifier || "").replace(/^Mesa\s+/i, "")}`
 : order.shipping_method === "delivery"
 ? "Delivery"
 : "Balcão";

 // Classe de urgência para o card inteiro
 const cardUrgencyClass = {
 normal: "border-border/80",
 warning: "border-amber-500/70 ring-1 ring-amber-500/20",
 critical: "border-destructive ring-2 ring-destructive/30",
 }[urgency];

 // Classe do header do ticket
 const headerUrgencyClass = {
 normal: "bg-slate-900 dark:bg-slate-800",
 warning: "bg-amber-600",
 critical: "bg-destructive animate-pulse",
 }[urgency];

 return (
 <div className={cn("rounded-xl border bg-card overflow-hidden flex flex-col transition-all shadow-2xs", cardUrgencyClass)}>
 {/* Topo do Ticket */}
 <div className={cn("p-3 text-white flex justify-between items-center", headerUrgencyClass)}>
 <div className="flex items-center gap-2">
 <span className="font-black text-xl font-mono">#{ticketNumber}</span>
 <Badge
 variant="outline"
 className="text-[10px] uppercase font-mono font-bold bg-white/10 text-white border-white/20"
 >
 {originLabel}
 </Badge>
 </div>

 <div className="flex items-center gap-2">
 <button
 type="button"
 onClick={(e) => { e.stopPropagation(); onPrint(); }}
 title="Imprimir comanda térmica"
 className="size-10 sm:size-8 rounded-xl bg-white/15 hover:bg-white/30 flex items-center justify-center text-white transition-colors cursor-pointer"
 >
 <Printer className="size-4" />
 </button>

 {/* Timer de urgência */}
 <div className="text-right">
 <div className={cn(
 "text-xs font-black font-mono flex items-center gap-1",
 urgency === "critical" ? "text-white" : urgency === "warning" ? "text-white" : "text-white/90"
 )}>
 <Clock className="size-3.5" />
 {waitMinutes}min
 </div>
 <span className="text-[9px] text-white/70 font-mono">{formatTimeOnly(order.created_at)}</span>
 </div>
 </div>
 </div>

 {/* SLA Bar visual */}
 <div className="h-1 w-full bg-border/30 shrink-0">
 <div
 className={cn(
 "h-full transition-all",
 urgency === "critical" ? "bg-destructive" : urgency === "warning" ? "bg-amber-500" : "bg-emerald-500",
 )}
 style={{
 width: urgency === "critical" ? "100%" : urgency === "warning" ? "65%" : `${Math.min((waitMinutes / 8) * 40, 40)}%`,
 }}
 />
 </div>

 {/* Lista de Itens */}
 <div className="p-3.5 flex-1 space-y-3">
 <ul className="space-y-3">
 {itemsList.map((item: any, idx: number) => {
 const itemKey = `${order.id}-item-${idx}`;
 const isChecked = Boolean(checkedItems[itemKey]);

 const rawOptions = item.selected_options || item.options;
 const optionsArray = rawOptions
 ? Array.isArray(rawOptions)
 ? rawOptions
 : typeof rawOptions === "object"
 ? Object.values(rawOptions as object)
 : []
 : [];

 const itemStation = classifyItemStation(item.product_title || item.product_name || "");
 const isHighlighted = highlightStation && itemStation === highlightStation;
 const stationInfo = STATIONS.find((s) => s.id === itemStation);

 return (
 <li
 key={itemKey}
 className={cn(
 "p-2.5 rounded-xl border transition-colors select-none",
 isChecked
 ? "bg-muted/40 border-border/40 opacity-40 line-through"
 : isHighlighted
 ? "bg-primary/5 border-primary/30"
 : "bg-muted/15 border-border/70 hover:bg-muted/30",
 )}
 >
 <div className="flex items-start gap-2.5">
 <button
 type="button"
 className="p-1 -m-1 text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
 onClick={(e) => { e.stopPropagation(); onToggleCheck(itemKey); }}
 aria-label="Marcar item preparado"
 >
 {isChecked ? (
 <CheckSquare className="size-5 text-emerald-500" />
 ) : (
 <Square className="size-5" />
 )}
 </button>

 <div className="min-w-0 flex-1">
 <div className="flex items-baseline gap-1.5">
 <span className="text-base font-black text-primary font-mono leading-none">
 {item.qty ?? item.quantity ?? 1}x
 </span>
 <h3 className="text-sm font-bold text-foreground leading-tight tracking-tight">
 {item.product_title || item.product_name || "Item sem título"}
 </h3>
 {stationInfo && stationInfo.id !== "all" && (
 <span className={cn("text-[9px] font-bold uppercase", stationInfo.color)}>
 [{stationInfo.label}]
 </span>
 )}
 </div>

 {optionsArray.length > 0 && (
 <div className="mt-1.5 flex flex-wrap gap-1">
 {optionsArray.map((opt: any, oIdx: number) => {
 const label =
 typeof opt === "string" ? opt : opt?.label || opt?.name || JSON.stringify(opt);
 return (
 <span
 key={oIdx}
 className="text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded-md"
 >
 + {label}
 </span>
 );
 })}
 </div>
 )}

 {item.notes && (
 <div className="mt-1.5 text-[10px] font-black text-destructive bg-destructive/10 border border-destructive/20 p-1 rounded-md uppercase">
 ⚠️ OBS: {item.notes}
 </div>
 )}
 </div>
 </div>
 </li>
 );
 })}
 </ul>
 </div>

 {/* Ação de Avanço de Etapa */}
 <div className="p-3 bg-muted/20 border-t border-border/80">
 <Button
 className="w-full font-bold h-12 sm:h-11 text-sm sm:text-xs rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs cursor-pointer"
 onClick={onAction}
 disabled={isPending}
 >
 <ActionIcon className="size-4 mr-2" />
 {actionLabel}
 </Button>
 </div>
 </div>
 );
}
