import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
 ArrowLeft,
 Receipt,
 Check,
 CreditCard,
 Banknote,
 QrCode,
 Printer,
 Download,
 UtensilsCrossed,
 Clock,
 Plus,
 ShoppingBag,
 AlertTriangle,
 Users,
 LayoutGrid,
 ListFilter,
 ExternalLink,
} from "lucide-react";
import {
 getSalonTablesOverview,
 closePdvComanda,
 openTableComanda,
 requestTableBill,
} from "@/services/order.functions";
import { getStoreSettings } from "@/services/store.functions";
import { NicheOperationalGuard } from "@/components/workspace/niche-operational-guard";
import { QuickWaiterOrderModal } from "@/components/pos/quick-waiter-order-modal";
import { formatMoney } from "@/lib/money";
import { formatDateTime } from "@/lib/datetime";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
 Sheet,
 SheetContent,
 SheetHeader,
 SheetTitle,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/workspace/pdv/comandas")({
 head: () => ({ meta: [{ title: "Salão & Comandas | PDV | Workspace Waesy" }] }),
 loader: async () => {
 try {
 const [tables, store] = await Promise.all([
 getSalonTablesOverview().catch(() => null),
 getStoreSettings().catch(() => null),
 ]);
 return { tables: tables || null, store };
 } catch {
 return { tables: null, store: null };
 }
 },
 component: PdvComandasPage,
});

type TableStatus = "free" | "occupied" | "awaiting_payment" | "delayed" | "reserved";

const STATUS_CONFIG: Record<
 TableStatus,
 { label: string; badgeVariant: "default" | "secondary" | "outline" | "destructive"; cardClass: string; textClass: string; dotClass: string }
> = {
 free: {
 label: "Livre",
 badgeVariant: "outline",
 cardClass: "border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/60",
 textClass: "text-emerald-700 dark:text-emerald-400",
 dotClass: "bg-emerald-500",
 },
 occupied: {
 label: "Ocupada",
 badgeVariant: "default",
 cardClass: "border-blue-500/40 bg-blue-500/5 hover:border-blue-500/70",
 textClass: "text-blue-700 dark:text-blue-400",
 dotClass: "bg-blue-500",
 },
 awaiting_payment: {
 label: "Conta Solicitada",
 badgeVariant: "secondary",
 cardClass: "border-amber-500/50 bg-amber-500/10 hover:border-amber-500/80 animate-pulse",
 textClass: "text-amber-700 dark:text-amber-400",
 dotClass: "bg-amber-500",
 },
 delayed: {
 label: "Atraso (>40m)",
 badgeVariant: "destructive",
 cardClass: "border-rose-500/50 bg-rose-500/10 hover:border-rose-500/80",
 textClass: "text-rose-700 dark:text-rose-400",
 dotClass: "bg-rose-500",
 },
 reserved: {
 label: "Reservada",
 badgeVariant: "outline",
 cardClass: "border-purple-500/30 bg-purple-500/5 hover:border-purple-500/60",
 textClass: "text-purple-700 dark:text-purple-400",
 dotClass: "bg-purple-500",
 },
};

function PdvComandasPage() {
 const { tables: initialData, store } = ((Route.useLoaderData?.() as any) || {});
 const queryClient = useQueryClient();
 const navigate = useNavigate();

 const [activeView, setActiveView] = useState<"grid" | "list">("grid");
 const [selectedTable, setSelectedTable] = useState<any | null>(null);
 const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
 const [comandaToCheckout, setComandaToCheckout] = useState<any | null>(null);
 const [paymentMethod, setPaymentMethod] = useState<"cash" | "pix" | "card">("cash");
 const [splitCount, setSplitCount] = useState(1);

 // State para o Gerador de QR Code / Displays de Mesa
 const [qrModalOpen, setQrModalOpen] = useState(false);
 const [qrTableNumber, setQrTableNumber] = useState("01");

 // State para o Lançador Rápido de Salão / Garçom
 const [quickWaiterModalOpen, setQuickWaiterModalOpen] = useState(false);

 const { data: salonData, refetch } = useQuery({
 queryKey: ["salon-tables-overview"],
 queryFn: () => getSalonTablesOverview(),
 initialData,
 refetchInterval: 5000,
 });

 const { tables = [], summary, store_info, activeComandas = [] } = salonData || {};

 // Estado dinâmico do Wi-Fi e Loja baseado no retorno real do banco
 const [qrStoreName, setQrStoreName] = useState(store_info?.name || "Estabelecimento");
 const [qrWifiName, setQrWifiName] = useState(store_info?.wifi_ssid || "");
 const [qrWifiPassword, setQrWifiPassword] = useState(store_info?.wifi_password || "");

 const payMutation = useMutation({
 mutationFn: async ({ orderId, method }: { orderId: string; method: "cash" | "pix" | "card" }) => {
 return await closePdvComanda({
 data: {
 orderId,
 paymentMethod: method,
 },
 });
 },
 onSuccess: () => {
 toast.success("Comanda liquidada com sucesso!");
 setCheckoutModalOpen(false);
 setSelectedTable(null);
 setComandaToCheckout(null);
 queryClient.invalidateQueries({ queryKey: ["salon-tables-overview"] });
 refetch();
 },
 onError: (err: any) => {
 toast.error(err.message || "Erro ao liquidar comanda.");
 },
 });

 const openTableMutation = useMutation({
 mutationFn: (tableNumber: string) => openTableComanda({ data: { tableNumber } }),
 onSuccess: (res) => {
 toast.success(res.isExisting ? "Comanda vinculada à mesa!" : "Mesa aberta com sucesso!");
 queryClient.invalidateQueries({ queryKey: ["salon-tables-overview"] });
 },
 onError: (err: any) => {
 toast.error(err.message || "Erro ao abrir mesa");
 },
 });

 const requestBillMutation = useMutation({
 mutationFn: (tableNumber: string) => requestTableBill({ data: { tableNumber } }),
 onSuccess: () => {
 toast.success("Conta solicitada! Alerta emitido no salão.");
 queryClient.invalidateQueries({ queryKey: ["salon-tables-overview"] });
 setSelectedTable(null);
 },
 onError: (err: any) => {
 toast.error(err.message || "Erro ao solicitar conta");
 },
 });

 const handleTableClick = (table: any) => {
 if (table.status === "free") {
 // Abre confirmação para abrir atendimento na mesa
 if (confirm(`Deseja abrir atendimento para a Mesa ${table.table_number}?`)) {
 openTableMutation.mutate(table.table_number);
 }
 } else {
 setSelectedTable(table);
 }
 };

 const handleOpenCheckout = (order: any) => {
 setComandaToCheckout(order);
 setSplitCount(1);
 setCheckoutModalOpen(true);
 };

 const handleConfirmPayment = () => {
 if (!comandaToCheckout) return;
 payMutation.mutate({ orderId: comandaToCheckout.id, method: paymentMethod });
 };

 const currentHost = typeof window !== "undefined" ? window.location.host : "usewaesy.com";
 const publicMenuTableUrl = `https://${currentHost}/m/${store_info?.slug || "loja"}?mesa=${encodeURIComponent(qrTableNumber)}`;

 return (
 <NicheOperationalGuard
 targetNiche="gastronomy"
 toolTitle="Salão & Comandas por Mesa"
 toolDescription="O controle de mesas físicas, consumo aberto e chamadas de garçom foi projetado especificamente para operações de bares, restaurantes e estabelecimentos gastronômicos."
 store={store}
 >
      <div className="flex flex-col min-h-[calc(100vh-4rem)] bg-background text-foreground pb-20 w-full max-w-7xl mx-auto px-0 sm:px-4 md:px-0">
        {/* ── Top Bar ── */}
        <div className="border-b border-border/80 bg-card/60 backdrop-blur-md px-3 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-4 rounded-2xl">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" asChild className="size-11 sm:size-9 rounded-xl cursor-pointer shrink-0">
              <Link to="/workspace/pdv">
                <ArrowLeft className="size-4" />
              </Link>
            </Button>
 <div>
 <div className="flex items-center gap-2">
 <h1 className="text-xl font-bold tracking-tight text-foreground">Comandas & Mesas</h1>
 <Badge variant="outline" className="text-[10px] font-mono font-bold">
 {summary?.occupied_count || 0}/{summary?.total_tables || 0} Ocupadas
 </Badge>
 </div>
 <p className="text-xs text-muted-foreground">
 Monitoramento tátil de mesas, comandas e fechamento de conta.
 </p>
 </div>
 </div>

 <div className="flex items-center gap-2">
 {/* Alternador de Visão */}
 <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border/60">
 <Button
 size="sm"
 variant={activeView === "grid" ? "default" : "ghost"}
 className="h-7 px-2.5 text-xs font-semibold rounded-lg gap-1.5"
 onClick={() => setActiveView("grid")}
 >
 <LayoutGrid className="size-3.5" />
 Mesas
 </Button>
 <Button
 size="sm"
 variant={activeView === "list" ? "default" : "ghost"}
 className="h-7 px-2.5 text-xs font-semibold rounded-lg gap-1.5"
 onClick={() => setActiveView("list")}
 >
 <ListFilter className="size-3.5" />
 Comandas ({activeComandas.length})
 </Button>
 </div>

 <Button
 variant="outline"
 size="sm"
 className="h-9 gap-2 rounded-xl border-border/80 bg-card hover:bg-muted font-bold text-xs shadow-2xs cursor-pointer"
 onClick={() => setQrModalOpen(true)}
 >
 <QrCode className="size-4 text-primary" />
 <span className="hidden sm:inline">Displays de Mesa / QR</span>
 </Button>
 </div>
 </div>

 {/* ── KPI Strip ── */}
 <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-4 sm:px-6">
 <div className="p-3 rounded-xl bg-card border border-border/70 flex items-center justify-between">
 <div className="space-y-0.5">
 <span className="text-[10px] font-bold text-muted-foreground uppercase">Livres</span>
 <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">
 {summary?.free_count || 0}
 </p>
 </div>
 <div className="size-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" />
 </div>

 <div className="p-3 rounded-xl bg-card border border-border/70 flex items-center justify-between">
 <div className="space-y-0.5">
 <span className="text-[10px] font-bold text-muted-foreground uppercase">Ocupadas</span>
 <p className="text-xl font-black text-blue-600 dark:text-blue-400">
 {summary?.occupied_count || 0}
 </p>
 </div>
 <div className="size-2.5 rounded-full bg-blue-500 ring-4 ring-blue-500/20" />
 </div>

 <div className="p-3 rounded-xl bg-card border border-border/70 flex items-center justify-between">
 <div className="space-y-0.5">
 <span className="text-[10px] font-bold text-muted-foreground uppercase">Pediram Conta</span>
 <p className="text-xl font-black text-amber-600 dark:text-amber-400">
 {summary?.awaiting_payment_count || 0}
 </p>
 </div>
 <div className="size-2.5 rounded-full bg-amber-500 ring-4 ring-amber-500/20" />
 </div>

 <div className="p-3 rounded-xl bg-card border border-border/70 flex items-center justify-between">
 <div className="space-y-0.5">
 <span className="text-[10px] font-bold text-muted-foreground uppercase">Reservadas</span>
 <p className="text-xl font-black text-purple-600 dark:text-purple-400">
 {summary?.reserved_count || 0}
 </p>
 </div>
 <div className="size-2.5 rounded-full bg-purple-500 ring-4 ring-purple-500/20" />
 </div>

 <div className="p-3 rounded-xl bg-card border border-border/70 col-span-2 sm:col-span-1 flex items-center justify-between">
 <div className="space-y-0.5">
 <span className="text-[10px] font-bold text-muted-foreground uppercase">Total Salão</span>
 <p className="text-xl font-black text-foreground">
 {formatMoney(summary?.total_active_cents || 0)}
 </p>
 </div>
 <UtensilsCrossed className="size-4 text-muted-foreground" />
 </div>
 </div>

 {/* ── Main Content Area ── */}
 <div className="flex-1 p-4 sm:px-6">
 {activeView === "grid" ? (
 /* ── GRID VISUAL DE MESAS (1 a 30) ── */
 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
 {tables.map((table: any) => {
 const config = STATUS_CONFIG[table.status as TableStatus] || STATUS_CONFIG.free;

 return (
 <button
 key={table.table_number}
 type="button"
 onClick={() => handleTableClick(table)}
 className={cn(
 "relative flex flex-col justify-between p-3.5 sm:p-4 rounded-xl border text-left transition-all cursor-pointer min-h-[120px] select-none group active:scale-98",
 config.cardClass,
 )}
 >
 <div className="flex items-start justify-between w-full">
 <div className="flex items-baseline gap-1">
 <span className="text-xs text-muted-foreground font-mono">#</span>
 <span className="text-2xl font-black text-foreground tracking-tight font-mono">
 {table.table_number}
 </span>
 </div>

 <div className="flex items-center gap-1.5">
 <span className={cn("size-2 rounded-full", config.dotClass)} />
 <span className={cn("text-[10px] font-bold uppercase", config.textClass)}>
 {config.label}
 </span>
 </div>
 </div>

 <div className="w-full space-y-1 mt-3">
 {table.status === "free" ? (
 <div className="flex items-center gap-1 text-xs text-muted-foreground/80 group-hover:text-foreground transition-colors">
 <Plus className="size-3.5" />
 <span>Abrir Mesa</span>
 </div>
 ) : table.status === "reserved" ? (
 <div className="text-xs space-y-0.5">
 <span className="font-bold text-foreground line-clamp-1">
 {table.reservation?.customer_name}
 </span>
 <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
 <Clock className="size-3" />
 <span>{table.reservation?.reservation_time}</span>
 <span>•</span>
 <span>{table.reservation?.party_size} pess.</span>
 </div>
 </div>
 ) : (
 <div className="space-y-0.5">
 <div className="flex items-center justify-between text-xs">
 <span className="font-black text-foreground font-mono">
 {formatMoney(table.total_cents)}
 </span>
 <span className="text-[10px] text-muted-foreground font-mono">
 {table.items_count} it.
 </span>
 </div>
 <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
 <Clock className="size-3" />
 <span>{table.elapsed_minutes} min</span>
 </div>
 </div>
 )}
 </div>
 </button>
 );
 })}
 </div>
 ) : (
 /* ── VISÃO CLÁSSICA EM LISTA DE COMANDAS ── */
 activeComandas.length === 0 ? (
 <div className="flex flex-col items-center justify-center p-12 text-center rounded-xl bg-card border border-border/60">
 <Receipt className="size-12 text-muted-foreground mb-3" />
 <h3 className="text-base font-bold text-foreground">Nenhuma comanda aberta</h3>
 <p className="text-xs text-muted-foreground mt-1">
 Todas as mesas e contas do salão estão livres ou liquidadas.
 </p>
 </div>
 ) : (
 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
 {activeComandas.map((comanda: any) => (
 <div
 key={comanda.id}
 className="overflow-hidden bg-card rounded-xl border border-border/80 flex flex-col justify-between"
 >
 <div className="p-3.5 border-b border-border/60 flex items-center justify-between bg-muted/20">
 <span className="font-black text-foreground text-sm uppercase tracking-wide font-mono">
 {comanda.table_identifier}
 </span>
 <Badge variant="outline" className="text-[10px] font-mono">
 {formatDateTime(comanda.created_at)}
 </Badge>
 </div>

 <div className="p-4 space-y-3 flex-1">
 <div className="space-y-1.5 max-h-48 overflow-y-auto no-scrollbar pr-1">
 {comanda.order_items?.map((item: any) => (
 <div key={item.id} className="flex justify-between text-xs">
 <span className="text-muted-foreground truncate mr-2">
 {item.qty}x {item.product_title}
 </span>
 <span className="font-bold text-foreground font-mono whitespace-nowrap">
 {formatMoney(item.total_cents)}
 </span>
 </div>
 ))}
 </div>

 <div className="pt-3 border-t border-dashed border-border/80 flex items-end justify-between">
 <span className="text-xs text-muted-foreground font-medium">Total</span>
 <span className="text-lg font-black text-foreground font-mono">
 {formatMoney(comanda.total_cents)}
 </span>
 </div>
 </div>

                    <div className="p-3 bg-muted/10 border-t border-border/60 flex gap-2">
                      <Button
                        size="sm"
                        className="w-full font-bold text-xs h-11 sm:h-9 rounded-xl cursor-pointer"
                        onClick={() => handleOpenCheckout(comanda)}
                      >
                        <Check className="mr-1.5 size-3.5" />
                        Fechar Conta
                      </Button>
                    </div>
 </div>
 ))}
 </div>
 )
 )}
 </div>

 {/* ── SHEET LATERAL DE DETALHES DA MESA ── */}
 <Sheet open={Boolean(selectedTable)} onOpenChange={(open) => !open && setSelectedTable(null)}>
 <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col p-0 gap-0 overflow-hidden bg-card border-l border-border">
 <SheetHeader className="p-4 sm:p-5 pb-4 border-b border-border/70">
 <div className="flex items-center justify-between">
 <SheetTitle className="text-lg font-bold flex items-center gap-2 font-mono">
 <UtensilsCrossed className="size-5 text-primary" />
 Mesa {selectedTable?.table_number}
 </SheetTitle>
 {selectedTable && (
 <Badge
 variant={STATUS_CONFIG[selectedTable.status as TableStatus]?.badgeVariant || "outline"}
 className="text-[10px] font-bold"
 >
 {STATUS_CONFIG[selectedTable.status as TableStatus]?.label}
 </Badge>
 )}
 </div>
 </SheetHeader>

 {selectedTable?.order ? (
 <div className="flex-1 overflow-y-auto no-scrollbar py-4 space-y-4">
 <div className="p-3 rounded-xl bg-muted/30 border border-border/60 flex items-center justify-between text-xs">
 <div className="space-y-0.5">
 <span className="text-[10px] text-muted-foreground font-bold uppercase">Tempo no Salão</span>
 <p className="font-mono font-bold text-foreground">
 {selectedTable.elapsed_minutes} minutos
 </p>
 </div>
 <div className="space-y-0.5 text-right">
 <span className="text-[10px] text-muted-foreground font-bold uppercase">Itens Lançados</span>
 <p className="font-mono font-bold text-foreground">
 {selectedTable.items_count} produtos
 </p>
 </div>
 </div>

 {/* Lista de Itens */}
 <div className="space-y-2">
 <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
 Consumo da Mesa
 </h4>
 <div className="space-y-2 border border-border/70 rounded-xl p-3 bg-card">
 {selectedTable.order?.order_items?.map((it: any) => (
 <div key={it.id} className="flex items-start justify-between text-xs py-1 border-b border-border/40 last:border-0">
 <div>
 <span className="font-semibold text-foreground">
 {it.qty}x {it.product_title}
 </span>
 {it.selected_options && Array.isArray(it.selected_options) && it.selected_options.length > 0 && (
 <p className="text-[10px] text-muted-foreground">
 {it.selected_options.map((o: any) => o.name || o.value).join(", ")}
 </p>
 )}
 </div>
 <span className="font-mono font-bold text-foreground">
 {formatMoney(it.total_cents)}
 </span>
 </div>
 ))}
 </div>
 </div>

 {/* Subtotal e Total */}
 <div className="p-4 rounded-xl bg-card border border-border/80 space-y-1.5">
 <div className="flex justify-between text-xs text-muted-foreground">
 <span>Subtotal</span>
 <span className="font-mono">{formatMoney(selectedTable.total_cents)}</span>
 </div>
 <div className="flex justify-between text-sm font-black text-foreground pt-1 border-t border-border/60">
 <span>Total a Pagar</span>
 <span className="font-mono text-base">{formatMoney(selectedTable.total_cents)}</span>
 </div>
 </div>

 {/* Ações Rápidas */}
 <div className="space-y-2 pt-2">
 <Button
 className="w-full font-bold text-xs h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white gap-2 shadow-xs cursor-pointer"
 onClick={() => setQuickWaiterModalOpen(true)}
 >
 <UtensilsCrossed className="size-4" />
 Lançar Itens na Mesa (Garçom / Salão)
 </Button>

                  {selectedTable.status !== "awaiting_payment" && (
                    <Button
                      variant="outline"
                      className="w-full font-bold text-xs h-11 rounded-xl text-amber-600 border-amber-500/30 hover:bg-amber-500/10 cursor-pointer"
                      onClick={() => requestBillMutation.mutate(selectedTable.table_number)}
                      disabled={requestBillMutation.isPending}
                    >
                      <Receipt className="size-4 mr-2" />
                      Solicitar Fechamento / Conta
                    </Button>
                  )}

                  <Button
                    className="w-full font-bold text-xs h-11 rounded-xl cursor-pointer"
                    onClick={() => handleOpenCheckout(selectedTable.order)}
                  >
                    <Check className="size-4 mr-2" />
                    Fechar Conta / Receber
                  </Button>

                  <Button
                    variant="outline"
                    asChild
                    className="w-full font-bold text-xs h-11 rounded-xl cursor-pointer"
                  >
                    <Link
                      to="/workspace/pdv"
                      search={{
                        mesa: selectedTable.table_number,
                        orderId: selectedTable.order?.id,
                      }}
                    >
                      <Plus className="size-4 mr-2" />
                      Lançar Mais Itens no PDV
                    </Link>
                  </Button>
 </div>
 </div>
 ) : selectedTable?.reservation ? (
 <div className="flex-1 py-4 space-y-4">
 <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30 space-y-2">
 <h4 className="text-xs font-bold text-purple-700 dark:text-purple-300 uppercase">
 Reserva Confirmada
 </h4>
 <p className="text-sm font-bold text-foreground">
 {selectedTable.reservation.customer_name}
 </p>
 <div className="flex items-center gap-3 text-xs text-muted-foreground">
 <span className="flex items-center gap-1 font-mono">
 <Clock className="size-3.5" />
 {selectedTable.reservation.reservation_time}
 </span>
 <span className="flex items-center gap-1 font-mono">
 <Users className="size-3.5" />
 {selectedTable.reservation.party_size} lugares
 </span>
 </div>
 </div>

 <Button
 className="w-full font-bold text-xs h-10 rounded-xl"
 onClick={() => openTableMutation.mutate(selectedTable.table_number)}
 >
 Acomodar Cliente e Iniciar Comanda
 </Button>
 </div>
 ) : null}
 </SheetContent>
 </Sheet>

 {/* ── SHEET DE CHECKOUT / FECHAMENTO DE CONTA ── */}
 <Sheet open={checkoutModalOpen} onOpenChange={setCheckoutModalOpen}>
 <SheetContent
 side="right"
 className="w-full sm:max-w-xl border-l p-0 overflow-hidden bg-card flex flex-col"
 >
 <SheetHeader className="p-4 sm:p-5 border-b border-border/80 bg-muted/20 text-left">
 <SheetTitle className="font-bold text-base sm:text-lg text-foreground">
 Fechar Conta — {comandaToCheckout?.table_identifier || "Comanda"}
 </SheetTitle>
 </SheetHeader>

 {comandaToCheckout && (
 <div className="flex-1 overflow-y-auto no-scrollbar p-4 sm:p-5 space-y-4">
 <div className="p-4 rounded-xl bg-muted/30 border border-border/70 text-center space-y-1">
 <span className="text-xs text-muted-foreground uppercase font-bold">Valor Total</span>
 <p className="text-3xl font-black text-foreground font-mono">
 {formatMoney(comandaToCheckout.total_cents)}
 </p>
 </div>

 {/* Rateio / Divisão de Conta */}
 <div className="p-3 rounded-xl bg-card border border-border/80 space-y-2">
 <div className="flex items-center justify-between text-xs">
 <span className="font-bold text-foreground flex items-center gap-1.5">
 <Users className="size-3.5 text-primary" />
 Divisão da Conta
 </span>
 {splitCount > 1 && (
 <span className="font-mono font-bold text-primary text-xs">
 {formatMoney(Math.ceil(comandaToCheckout.total_cents / splitCount))} / pessoa
 </span>
 )}
 </div>
 <div className="grid grid-cols-5 sm:grid-cols-5 gap-1.5">
 {[1, 2, 3, 4, 5].map((count) => (
 <button
 key={count}
 type="button"
 onClick={() => setSplitCount(count)}
 className={cn(
 "py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer text-center",
 splitCount === count
 ? "bg-primary text-primary-foreground border-primary"
 : "bg-muted/30 text-muted-foreground border-border/70 hover:text-foreground"
 )}
 >
 {count === 1 ? "1x Total" : `${count}x`}
 </button>
 ))}
 </div>
 </div>

 <div className="space-y-2">
 <Label className="text-xs font-bold text-muted-foreground">Forma de Pagamento</Label>
 <div className="grid grid-cols-3 sm:grid-cols-3 gap-2">
 <Button
 type="button"
 variant={paymentMethod === "cash" ? "default" : "outline"}
 className="flex flex-col h-16 gap-1 rounded-xl text-xs font-bold"
 onClick={() => setPaymentMethod("cash")}
 >
 <Banknote className="size-5" />
 Dinheiro
 </Button>
 <Button
 type="button"
 variant={paymentMethod === "pix" ? "default" : "outline"}
 className="flex flex-col h-16 gap-1 rounded-xl text-xs font-bold"
 onClick={() => setPaymentMethod("pix")}
 >
 <QrCode className="size-5" />
 Pix
 </Button>
 <Button
 type="button"
 variant={paymentMethod === "card" ? "default" : "outline"}
 className="flex flex-col h-16 gap-1 rounded-xl text-xs font-bold"
 onClick={() => setPaymentMethod("card")}
 >
 <CreditCard className="size-5" />
 Cartão
 </Button>
 </div>
 </div>
 </div>
 )}

 <div className="p-4 border-t border-border/80 bg-card flex items-center justify-end gap-2 shrink-0">
 <Button
 variant="ghost"
 size="sm"
 onClick={() => setCheckoutModalOpen(false)}
 className="rounded-xl text-xs font-semibold"
 >
 Cancelar
 </Button>
 <Button
 size="sm"
 onClick={handleConfirmPayment}
 disabled={payMutation.isPending}
 className="h-11 px-5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
 >
 {payMutation.isPending ? "Processando..." : "Confirmar Recebimento"}
 </Button>
 </div>
 </SheetContent>
 </Sheet>

 {/* ── SHEET GERADOR DE DISPLAYS DE MESA / QR CODE ── */}
 <Sheet open={qrModalOpen} onOpenChange={setQrModalOpen}>
 <SheetContent
 side="right"
 size="wide"
 className="w-full sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw] max-sm:!h-[100dvh] max-sm:!inset-0 max-sm:!rounded-none border-l p-0 overflow-hidden bg-card flex flex-col"
 >
 <SheetHeader className="p-4 sm:p-5 border-b border-border/80 bg-muted/20 text-left">
 <SheetTitle className="font-bold text-base sm:text-lg flex items-center gap-2 text-foreground">
 <QrCode className="size-5 text-primary" />
 Displays de Mesa & QR Code para Impressão
 </SheetTitle>
 </SheetHeader>

 <div className="flex-1 overflow-y-auto no-scrollbar p-4 sm:p-6">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div className="space-y-4">
 <div className="space-y-1.5">
 <Label className="text-xs font-bold text-muted-foreground">Número da Mesa</Label>
 <Input
 value={qrTableNumber}
 onChange={(e) => setQrTableNumber(e.target.value)}
 placeholder="Ex: 01"
 className="font-mono font-bold text-base"
 />
 <div className="flex flex-wrap gap-1 pt-1">
 {["01", "02", "03", "04", "05", "06", "10", "12", "15"].map((num) => (
 <Button
 key={num}
 type="button"
 size="sm"
 variant={qrTableNumber === num ? "default" : "outline"}
 className="h-7 px-2 text-xs font-mono rounded-lg"
 onClick={() => setQrTableNumber(num)}
 >
 {num}
 </Button>
 ))}
 </div>
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-bold text-muted-foreground">Nome da Loja</Label>
 <Input
 value={qrStoreName}
 onChange={(e) => setQrStoreName(e.target.value)}
 placeholder="Nome exibido no display"
 />
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-1.5">
 <Label className="text-xs font-bold text-muted-foreground">Wi-Fi (SSID)</Label>
 <Input
 value={qrWifiName}
 onChange={(e) => setQrWifiName(e.target.value)}
 placeholder="Rede Wi-Fi"
 />
 </div>
 <div className="space-y-1.5">
 <Label className="text-xs font-bold text-muted-foreground">Senha Wi-Fi</Label>
 <Input
 value={qrWifiPassword}
 onChange={(e) => setQrWifiPassword(e.target.value)}
 placeholder="Senha"
 />
 </div>
 </div>

 <div className="p-3 rounded-xl bg-muted/30 border border-border/60 text-xs text-muted-foreground space-y-1">
 <span className="font-bold text-foreground">Link de Autoatendimento:</span>
 <p className="font-mono text-[11px] break-all select-all text-primary">
 {publicMenuTableUrl}
 </p>
 </div>
 </div>

 {/* Preview do Display de Mesa */}
 <div className="flex flex-col items-center justify-center">
 <div
 id="printable-table-tent"
 className="w-full max-w-[240px] p-5 rounded-2xl bg-card border border-border/80 shadow-md text-center space-y-3"
 >
 <Badge variant="outline" className="text-[9px] font-mono border-border/80 text-muted-foreground uppercase">
 Cardápio Digital no Salão
 </Badge>
 <h3 className="text-xs font-bold text-foreground leading-tight line-clamp-1">
 {qrStoreName}
 </h3>

 <div className="py-1">
 <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest block">
 Mesa
 </span>
 <span className="text-4xl font-black text-foreground font-mono tracking-tighter">
 {qrTableNumber || "01"}
 </span>
 </div>

 <div className="p-3 rounded-xl bg-white border border-border/60 flex flex-col items-center justify-center space-y-1 shadow-2xs">
 <img
 src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(publicMenuTableUrl)}`}
 alt={`QR Code Mesa ${qrTableNumber}`}
 className="size-28 object-contain"
 />
 <span className="text-[9px] font-mono text-neutral-600 font-bold">
 Aponte a câmera para pedir
 </span>
 </div>

 {qrWifiName && (
 <div className="p-2 rounded-lg bg-muted/40 border border-border/60 text-[10px] text-left space-y-0.5">
 <div className="flex items-center justify-between">
 <span className="text-muted-foreground">Wi-Fi:</span>
 <span className="font-semibold text-foreground font-mono">{qrWifiName}</span>
 </div>
 {qrWifiPassword && (
 <div className="flex items-center justify-between">
 <span className="text-muted-foreground">Senha:</span>
 <span className="font-semibold text-foreground font-mono">{qrWifiPassword}</span>
 </div>
 )}
 </div>
 )}
 </div>
 </div>
 </div>
 </div>

 <div className="p-4 border-t border-border/80 bg-muted/10 flex flex-col sm:flex-row sm:justify-between items-center gap-3 shrink-0">
 <span className="text-xs text-muted-foreground">Tamanho otimizado para display A6</span>
 <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
 <Button
 variant="outline"
 size="sm"
 className="gap-1.5 text-xs font-bold rounded-xl h-10 px-4"
 onClick={() => {
 const link = document.createElement("a");
 link.href = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(publicMenuTableUrl)}`;
 link.download = `qrcode-mesa-${qrTableNumber}.png`;
 link.target = "_blank";
 link.click();
 toast.success("Download do QR Code iniciado!");
 }}
 >
 <Download className="size-3.5" />
 Baixar Imagem
 </Button>
 <Button
 size="sm"
 className="gap-1.5 text-xs font-bold rounded-xl h-10 px-4"
 onClick={() => window.print()}
 >
 <Printer className="size-3.5" />
 Imprimir Display
 </Button>
 </div>
 </div>
 </SheetContent>
 </Sheet>
 {/* Botão Flutuante Mobile: Abrir Comanda Rápida (Thumb Zone) */}
 <div className="md:hidden fixed bottom-6 right-6 z-40">
 <Button
 className="size-14 rounded-full shadow-2xl bg-primary text-primary-foreground flex items-center justify-center p-0"
 onClick={() => {
 const firstFree = salonData?.tables?.find((t: any) => t.status === "free");
 if (firstFree) {
 openTableMutation.mutate(firstFree.table_number);
 } else {
 toast.error("Nenhuma mesa livre no momento");
 }
 }}
 title="Abrir Próxima Mesa Livre"
 >
 <Plus className="size-6" />
 </Button>
 </div>

 {/* ── MODAL DE LANÇAMENTO RÁPIDO PARA GARÇOM ── */}
 <QuickWaiterOrderModal
 open={quickWaiterModalOpen}
 onOpenChange={setQuickWaiterModalOpen}
 tableNumber={selectedTable?.table_number || ""}
 orderId={selectedTable?.order?.id}
 store={store}
 onSuccess={() => refetch()}
 />
 </div>
 </NicheOperationalGuard>
 );
}
