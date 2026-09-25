import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/commerce/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
 Table,
 TableBody,
 TableCell,
 TableHead,
 TableHeader,
 TableRow,
} from "@/components/ui/table";
import {
 Sheet,
 SheetContent,
 SheetHeader,
 SheetTitle,
 SheetTrigger,
} from "@/components/ui/sheet";
import {
 CalendarDays,
 Clock,
 Users,
 Plus,
 CheckCircle2,
 XCircle,
 Armchair,
 Share2,
 Utensils,
 Phone,
 MessageSquare,
 LayoutGrid,
 List,
 MapPin,
 Receipt,
} from "lucide-react";
import {
 listStoreReservations,
 createStoreReservation,
 updateReservationStatus,
 getStoreFloorPlan,
 saveStoreFloorPlan,
} from "@/services/reservations.functions";
import { openTableComanda } from "@/services/order.functions";
import { listCustomers } from "@/services/crm.functions";
import { FloorPlanEditorSheet } from "@/components/reservations/floor-plan-editor-sheet";
import { NicheOperationalGuard } from "@/components/workspace/niche-operational-guard";
import { getStoreSettings } from "@/services/store.functions";
import { formatDate } from "@/lib/datetime";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/workspace/reservas")({
 head: () => ({ meta: [{ title: "Reservas de Mesas & Salão | Workspace Waesy" }] }),
 loader: async () => {
 try {
 const store = await getStoreSettings().catch(() => null);
 return { store };
 } catch {
 return { store: null };
 }
 },
 component: TableReservationsPage,
});

// ─── Tipos ─────────────────────────────────────────────────────────────
type TableStatus = "free" | "reserved" | "seated" | "pending";

interface SalonTable {
 id: string;
 label: string;
 seats: number;
 // Posição no grid (col, row)
 col: number;
 row: number;
 shape: "square" | "round" | "wide";
}

// Layout padrão do salão (customizável futuramente via DB)
const DEFAULT_SALON_TABLES: SalonTable[] = [
 // Área central — mesas quadradas de 4 lugares
 { id: "t01", label: "Mesa 01", seats: 4, col: 1, row: 1, shape: "square" },
 { id: "t02", label: "Mesa 02", seats: 4, col: 2, row: 1, shape: "square" },
 { id: "t03", label: "Mesa 03", seats: 4, col: 3, row: 1, shape: "square" },
 { id: "t04", label: "Mesa 04", seats: 4, col: 4, row: 1, shape: "square" },
 { id: "t05", label: "Mesa 05", seats: 4, col: 1, row: 2, shape: "square" },
 { id: "t06", label: "Mesa 06", seats: 4, col: 2, row: 2, shape: "square" },
 { id: "t07", label: "Mesa 07", seats: 4, col: 3, row: 2, shape: "square" },
 { id: "t08", label: "Mesa 08", seats: 4, col: 4, row: 2, shape: "square" },
 // Mesas redondas — área privê
 { id: "t09", label: "Mesa 09", seats: 2, col: 1, row: 3, shape: "round" },
 { id: "t10", label: "Mesa 10", seats: 2, col: 2, row: 3, shape: "round" },
 { id: "t11", label: "Mesa 11", seats: 2, col: 3, row: 3, shape: "round" },
 // Mesa grande — varanda/eventos
 { id: "t12", label: "Varanda", seats: 10, col: 4, row: 3, shape: "wide" },
];

// ─── Cores por status de mesa ───────────────────────────────────────────
const TABLE_STATUS_STYLE: Record<TableStatus, {
 border: string; bg: string; text: string; badgeCn: string; label: string;
}> = {
 free: {
 border: "border-emerald-500/50",
 bg: "bg-emerald-500/10 hover:bg-emerald-500/20",
 text: "text-emerald-700 dark:text-emerald-400",
 badgeCn: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
 label: "Livre",
 },
 reserved: {
 border: "border-blue-500/60",
 bg: "bg-blue-500/10 hover:bg-blue-500/20",
 text: "text-blue-700 dark:text-blue-400",
 badgeCn: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30",
 label: "Reservada",
 },
 pending: {
 border: "border-amber-500/60",
 bg: "bg-amber-500/10 hover:bg-amber-500/20",
 text: "text-amber-700 dark:text-amber-400",
 badgeCn: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
 label: "Pendente",
 },
 seated: {
 border: "border-purple-500/60",
 bg: "bg-purple-500/10 hover:bg-purple-500/20",
 text: "text-purple-700 dark:text-purple-400",
 badgeCn: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30",
 label: "Acomodado",
 },
};

export default function TableReservationsPage() {
 const { store } = ((Route.useLoaderData?.() as any) || {});
 const navigate = useNavigate();
 const queryClient = useQueryClient();
 const [activeView, setActiveView] = useState<"map" | "list">("map");
 const [listFilter, setListFilter] = useState<"upcoming" | "past" | "all">("upcoming");
 const [selectedTable, setSelectedTable] = useState<SalonTable | null>(null);
 const [sheetOpen, setSheetOpen] = useState(false);
 const [dialogOpen, setDialogOpen] = useState(false);
 const [isFloorPlanEditorOpen, setIsFloorPlanEditorOpen] = useState(false);

 // Form state
 const [customerName, setCustomerName] = useState("");
 const [customerPhone, setCustomerPhone] = useState("");
 const [partySize, setPartySize] = useState(2);
 const [reservationDate, setReservationDate] = useState(new Date().toISOString().split("T")[0]);
 const [reservationTime, setReservationTime] = useState("20:00");
 const [assignedTable, setAssignedTable] = useState("");
 const [specialRequests, setSpecialRequests] = useState("");

 // Queries
 const { data: reservations = [], isLoading } = useQuery({
 queryKey: ["table-reservations", listFilter],
 queryFn: () => listStoreReservations({ data: { filter: listFilter } }),
 });

 // Planta do Salão Persistida no Banco
 const { data: floorPlanData, refetch: refetchFloorPlan } = useQuery({
 queryKey: ["store-floor-plan"],
 queryFn: () => getStoreFloorPlan(),
 });

 const salonTables = useMemo<SalonTable[]>(() => {
 return (floorPlanData?.tables as SalonTable[]) || DEFAULT_SALON_TABLES;
 }, [floorPlanData]);

 // Reservas ativas hoje para o mapa
 const todayReservations = useMemo(() => {
 const today = new Date().toISOString().split("T")[0];
 return (reservations as any[]).filter(
 (r) => r.reservation_date === today && r.status !== "cancelled",
 );
 }, [reservations]);

 // Calcula status de cada mesa com base nas reservas de hoje
 const tableStatuses = useMemo(() => {
 const map: Record<string, { status: TableStatus; reservation?: any }> = {};
 salonTables.forEach((t) => {
 map[t.id] = { status: "free" };
 });

 todayReservations.forEach((r: any) => {
 const matched = salonTables.find((t) =>
 (r.assigned_table || "").toLowerCase().includes(t.label.toLowerCase()) ||
 t.label.toLowerCase().includes((r.assigned_table || "").toLowerCase()),
 );
 if (matched) {
 const status: TableStatus =
 r.status === "seated" ? "seated" : r.status === "confirmed" ? "reserved" : "pending";
 map[matched.id] = { status, reservation: r };
 }
 });

 return map;
 }, [todayReservations, salonTables]);

 // Mutations
 const { mutate: handleCreate, isPending: isCreating } = useMutation({
 mutationFn: createStoreReservation,
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ["table-reservations"] });
 toast.success("Reserva cadastrada com sucesso!");
 setDialogOpen(false);
 resetForm();
 },
 onError: (err: any) => toast.error(err.message || "Erro ao criar reserva."),
 });

 const { mutate: handleUpdateStatus } = useMutation({
 mutationFn: updateReservationStatus,
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ["table-reservations"] });
 toast.success("Status da reserva atualizado!");
 setSheetOpen(false);
 },
 onError: (err: any) => toast.error(err.message || "Erro ao atualizar status."),
 });

 // Conexão Sistêmica: Abertura Direta de Comanda no PDV via Reserva
 const { mutate: handleOpenComanda, isPending: isOpeningComanda } = useMutation({
 mutationFn: async ({ tableNumber, guestName, reservationId }: { tableNumber: string; guestName?: string; reservationId?: string }) => {
 const res = await openTableComanda({ data: { tableNumber, guestName } });
 if (reservationId) {
 await updateReservationStatus({ data: { reservation_id: reservationId, status: "seated" } }).catch(() => null);
 }
 return res;
 },
 onSuccess: (_, vars) => {
 toast.success(`Comanda aberta para ${vars.tableNumber}! Redirecionando ao PDV...`);
 queryClient.invalidateQueries({ queryKey: ["table-reservations"] });
 queryClient.invalidateQueries({ queryKey: ["salon-tables-overview"] });
 setSheetOpen(false);
 navigate({ to: "/workspace/pdv/comandas" });
 },
 onError: (err: any) => {
 toast.error(err?.message || "Erro ao abrir comanda no salão.");
 },
 });

 const resetForm = () => {
 setCustomerName("");
 setCustomerPhone("");
 setPartySize(2);
 setReservationTime("20:00");
 setAssignedTable("");
 setSpecialRequests("");
 };

 const handleTableClick = (table: SalonTable) => {
 setSelectedTable(table);
 setSheetOpen(true);
 };

 const copyShareLink = () => {
 navigator.clipboard.writeText(`${window.location.origin}/reservas`);
 toast.success("Link público de reservas copiado!");
 };

 // Legenda de status
 const statusCounts = useMemo(() => {
 const counts: Record<TableStatus, number> = { free: 0, reserved: 0, seated: 0, pending: 0 };
 DEFAULT_SALON_TABLES.forEach((t) => {
 const s = tableStatuses[t.id]?.status ?? "free";
 counts[s]++;
 });
 return counts;
 }, [tableStatuses]);

 return (
 <NicheOperationalGuard
 targetNiche="gastronomy"
 toolTitle="Reservas de Mesas & Mapa do Salão"
 toolDescription="O mapa de salão, disposição de mesas físicas e gestão de comandas presenciais foi projetado especificamente para restaurantes, bares e estabelecimentos gastronômicos."
 store={store}
 >
 <div className="w-full space-y-6">
 <PageHeader
 title="Reservas & Salão"
 actions={
 <div className="flex items-center gap-2">
 <Button variant="outline" size="sm" onClick={copyShareLink} className="gap-1.5 font-bold text-xs">
 <Share2 className="size-3.5" />
 Link Público
 </Button>

 <Button
 variant="outline"
 size="sm"
 onClick={() => setIsFloorPlanEditorOpen(true)}
 className="gap-1.5 font-bold text-xs"
 >
 <LayoutGrid className="size-3.5 text-primary" />
 <span>Editar Planta</span>
 </Button>

 {/* Toggle vista */}
 <div className="flex items-center bg-muted/60 p-0.5 rounded-xl border border-border/60">
 <button
 type="button"
 onClick={() => setActiveView("map")}
 className={cn(
 "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
 activeView === "map"
 ? "bg-background text-foreground shadow-2xs"
 : "text-muted-foreground hover:text-foreground",
 )}
 >
 <LayoutGrid className="size-3.5" />
 Mapa
 </button>
 <button
 type="button"
 onClick={() => setActiveView("list")}
 className={cn(
 "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
 activeView === "list"
 ? "bg-background text-foreground shadow-2xs"
 : "text-muted-foreground hover:text-foreground",
 )}
 >
 <List className="size-3.5" />
 Lista
 </button>
 </div>

 <Sheet open={dialogOpen} onOpenChange={setDialogOpen}>
 <SheetTrigger asChild>
 <Button size="sm" className="gap-1.5 font-bold text-xs shadow-xs">
 <Plus className="size-4" />
 Nova Reserva
 </Button>
 </SheetTrigger>
 <SheetContent side="right" size="wide" className="w-full sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw] md:max-w-3xl lg:max-w-[70vw] border-l p-6 overflow-y-auto no-scrollbar bg-card">
 <SheetHeader className="pb-4 border-b border-border/70 mb-4">
 <SheetTitle className="font-bold flex items-center gap-2">
 <Utensils className="size-5 text-primary" />
 Cadastrar Nova Reserva
 </SheetTitle>
 </SheetHeader>
 <ReservationForm
 customerName={customerName}
 setCustomerName={setCustomerName}
 customerPhone={customerPhone}
 setCustomerPhone={setCustomerPhone}
 partySize={partySize}
 setPartySize={setPartySize}
 reservationDate={reservationDate}
 setReservationDate={setReservationDate}
 reservationTime={reservationTime}
 setReservationTime={setReservationTime}
 assignedTable={assignedTable}
 setAssignedTable={setAssignedTable}
 specialRequests={specialRequests}
 setSpecialRequests={setSpecialRequests}
 onSubmit={() =>
 handleCreate({
 data: {
 customer_name: customerName,
 customer_phone: customerPhone,
 party_size: partySize,
 reservation_date: reservationDate,
 reservation_time: reservationTime,
 assigned_table: assignedTable,
 special_requests: specialRequests,
 },
 })
 }
 isSubmitting={isCreating}
 />
 </SheetContent>
 </Sheet>
 </div>
 }
 />

 {/* Vista: Mapa de Salão */}
 {activeView === "map" && (
 <div className="space-y-4">
 {/* Legenda + KPIs do dia */}
 <div className="flex items-center flex-wrap gap-3">
 <p className="text-xs font-bold text-muted-foreground">Hoje —</p>
 {(Object.entries(TABLE_STATUS_STYLE) as [TableStatus, typeof TABLE_STATUS_STYLE[TableStatus]][]).map(
 ([status, style]) => (
 <div key={status} className="flex items-center gap-1.5">
 <div className={cn("size-2.5 rounded-full", status === "free" ? "bg-emerald-500" : status === "reserved" ? "bg-blue-500" : status === "pending" ? "bg-amber-500" : "bg-purple-500")} />
 <span className="text-xs font-semibold text-muted-foreground">
 {style.label} ({statusCounts[status]})
 </span>
 </div>
 ),
 )}
 <div className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
 <MapPin className="size-3.5" />
 {todayReservations.length} reservas hoje
 </div>
 </div>

 {/* Grid do Salão */}
 <div className="bg-card rounded-2xl border border-border/80 shadow-2xs p-5 sm:p-8 overflow-auto">
 {/* Área de layout representando o salão */}
 <div
 className="relative grid gap-4"
 style={{
 gridTemplateColumns: "repeat(4, minmax(130px, 1fr))",
 gridTemplateRows: "repeat(3, auto)",
 }}
 >
 {salonTables.map((table) => {
 const { status, reservation } = tableStatuses[table.id] ?? { status: "free" as TableStatus };
 const style = TABLE_STATUS_STYLE[status];
 const isWide = table.shape === "wide";

 return (
 <button
 key={table.id}
 type="button"
 onClick={() => handleTableClick(table)}
 style={{
 gridColumn: isWide ? "span 1" : "span 1",
 gridRow: "span 1",
 }}
 className={cn(
 "relative flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 transition-all cursor-pointer group",
 "p-4 min-h-[110px] text-center",
 style.border,
 style.bg,
 table.shape === "round" && "rounded-full aspect-square",
 table.shape === "wide" && "col-span-1",
 )}
 >
 {/* Ícone central */}
 <Armchair
 className={cn("size-8 transition-transform group-hover:scale-110", style.text)}
 />

 {/* Label + lugares */}
 <div>
 <p className={cn("text-xs font-black leading-none", style.text)}>{table.label}</p>
 <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
 {table.seats} lugares
 </p>
 </div>

 {/* Badge de status */}
 <span
 className={cn(
 "absolute top-2 right-2 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full border",
 style.badgeCn,
 )}
 >
 {style.label}
 </span>

 {/* Nome do cliente (se reservada/acomodada) */}
 {reservation && (
 <p className={cn("text-[10px] font-bold truncate max-w-full px-1", style.text)}>
 {reservation.customer_name?.split(" ")[0]}
 {" · "}
 {reservation.reservation_time}
 </p>
 )}
 </button>
 );
 })}
 </div>

 {/* Legenda de área */}
 <div className="mt-6 pt-4 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
 <span className="font-mono">↑ Norte — Entrada principal</span>
 <span className="font-bold">{salonTables.length} mesas · {salonTables.reduce((a, b) => a + b.seats, 0)} lugares total</span>
 </div>
 </div>
 </div>
 )}

 {/* Vista: Lista de Reservas */}
 {activeView === "list" && (
 <Tabs value={listFilter} onValueChange={(v: any) => setListFilter(v)} className="w-full">
 <TabsList className="bg-muted/60 p-1 rounded-xl mb-4">
 <TabsTrigger value="upcoming" className="rounded-lg font-bold text-xs gap-1.5">
 <Clock className="size-3.5" /> Próximas
 </TabsTrigger>
 <TabsTrigger value="past" className="rounded-lg font-bold text-xs gap-1.5">
 <CalendarDays className="size-3.5" /> Passadas
 </TabsTrigger>
 <TabsTrigger value="all" className="rounded-lg font-bold text-xs gap-1.5">
 Todas
 </TabsTrigger>
 </TabsList>

 <TabsContent value={listFilter} className="mt-0">
 <div className="bg-card rounded-2xl border border-border/80 overflow-hidden shadow-2xs">
 {isLoading ? (
 <div className="p-12 text-center text-muted-foreground text-sm">Carregando reservas...</div>
 ) : reservations.length === 0 ? (
 <div className="p-12 text-center text-muted-foreground">
 <Utensils className="size-10 mx-auto text-muted-foreground/40 mb-3" />
 <h4 className="font-bold text-base text-foreground">Nenhuma reserva encontrada</h4>
 <p className="text-xs mt-1">Crie uma nova reserva ou compartilhe o link público.</p>
 </div>
 ) : (
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead>Horário & Data</TableHead>
 <TableHead>Cliente</TableHead>
 <TableHead>Pessoas & Mesa</TableHead>
 <TableHead>Status</TableHead>
 <TableHead>Observações</TableHead>
 <TableHead className="text-right">Ações</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {(reservations as any[]).map((r) => {
 const isPendingR = r.status === "pending";
 const isConfirmed = r.status === "confirmed";

 return (
 <TableRow key={r.id}>
 <TableCell>
 <div className="font-black text-sm">{r.reservation_time}</div>
 <div className="text-xs text-muted-foreground font-mono">{formatDate(r.reservation_date)}</div>
 </TableCell>
 <TableCell>
 <div className="font-bold text-sm">{r.customer_name}</div>
 <div className="text-xs text-muted-foreground flex items-center gap-1 font-mono">
 <Phone className="size-3" /> {r.customer_phone}
 </div>
 </TableCell>
 <TableCell>
 <div className="flex items-center gap-1.5 font-bold text-sm">
 <Users className="size-3.5 text-muted-foreground" />
 {r.party_size} {r.party_size === 1 ? "pessoa" : "pessoas"}
 </div>
 {r.assigned_table ? (
 <Badge variant="outline" className="text-[10px] font-mono mt-0.5">
 {r.assigned_table}
 </Badge>
 ) : (
 <span className="text-[11px] text-muted-foreground italic">Sem mesa definida</span>
 )}
 </TableCell>
 <TableCell>
 <ReservationStatusBadge status={r.status} />
 </TableCell>
 <TableCell className="max-w-[180px] truncate text-xs text-muted-foreground">
 {r.special_requests ? (
 <span className="flex items-center gap-1">
 <MessageSquare className="size-3 shrink-0" />
 {r.special_requests}
 </span>
 ) : "—"}
 </TableCell>
 <TableCell className="text-right">
 <div className="flex items-center justify-end gap-1.5">
 {isPendingR && (
 <Button
 variant="outline"
 size="sm"
 onClick={() => handleUpdateStatus({ data: { reservation_id: r.id, status: "confirmed" } })}
 className="text-xs font-bold gap-1 text-emerald-600 hover:text-emerald-700"
 >
 <CheckCircle2 className="size-3.5" /> Confirmar
 </Button>
 )}
 {(isPendingR || isConfirmed) && (
 <Button
 variant="default"
 size="sm"
 onClick={() => handleUpdateStatus({ data: { reservation_id: r.id, status: "seated" } })}
 className="text-xs font-bold gap-1"
 >
 <Armchair className="size-3.5" /> Acomodar
 </Button>
 )}
 {(r.status === "seated" || isConfirmed) && (
 <Button
 variant="outline"
 size="sm"
 onClick={() =>
 handleOpenComanda({
 tableNumber: r.assigned_table || "01",
 guestName: r.customer_name,
 reservationId: r.id,
 })
 }
 disabled={isOpeningComanda}
 className="text-xs font-bold gap-1 text-primary border-primary/30 hover:bg-primary/5 cursor-pointer"
 title="Abrir comanda no PDV e lançar pedidos"
 >
 <Receipt className="size-3.5" /> Comanda PDV
 </Button>
 )}
 {(isPendingR || isConfirmed) && (
 <Button
 variant="ghost"
 size="sm"
 onClick={() => handleUpdateStatus({ data: { reservation_id: r.id, status: "cancelled" } })}
 className="text-xs text-destructive hover:bg-destructive/10"
 >
 <XCircle className="size-3.5" />
 </Button>
 )}
 </div>
 </TableCell>
 </TableRow>
 );
 })}
 </TableBody>
 </Table>
 )}
 </div>
 </TabsContent>
 </Tabs>
 )}

 {/* Sheet Lateral: Detalhe da Mesa Clicada */}
 <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
 <SheetContent size="wide" className="w-full sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw] md:max-w-3xl lg:max-w-[70vw] flex flex-col gap-0">
 {selectedTable && (() => {
 const { status, reservation } = tableStatuses[selectedTable.id] ?? { status: "free" as TableStatus };
 const style = TABLE_STATUS_STYLE[status];

 return (
 <>
 <SheetHeader className="pb-4 border-b border-border/70">
 <SheetTitle className="flex items-center gap-3">
 <div className={cn("size-10 rounded-2xl flex items-center justify-center border-2", style.border, style.bg)}>
 <Armchair className={cn("size-5", style.text)} />
 </div>
 <div>
 <p className="font-black text-lg leading-none">{selectedTable.label}</p>
 <p className="text-xs text-muted-foreground font-mono mt-0.5">
 {selectedTable.seats} lugares · {selectedTable.shape === "round" ? "Redonda" : selectedTable.shape === "wide" ? "Comprida" : "Quadrada"}
 </p>
 </div>
 </SheetTitle>
 </SheetHeader>

 <div className="flex-1 overflow-y-auto no-scrollbar py-4 space-y-4">
 {/* Badge de status */}
 <div className="flex items-center justify-between">
 <span className="text-xs font-bold text-muted-foreground">Status agora</span>
 <span className={cn("text-xs font-black uppercase px-2.5 py-1 rounded-xl border", style.badgeCn)}>
 {style.label}
 </span>
 </div>

 {reservation ? (
 <div className="space-y-3 p-4 rounded-xl bg-muted/30 border border-border/60">
 <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Reserva ativa</p>
 <div className="space-y-2">
 <div className="flex justify-between items-start">
 <span className="text-xs text-muted-foreground">Cliente</span>
 <span className="font-bold text-sm text-right">{reservation.customer_name}</span>
 </div>
 <div className="flex justify-between items-center">
 <span className="text-xs text-muted-foreground">Telefone</span>
 <span className="font-mono text-xs">{reservation.customer_phone}</span>
 </div>
 <div className="flex justify-between items-center">
 <span className="text-xs text-muted-foreground">Horário</span>
 <span className="font-bold text-sm">{reservation.reservation_time}</span>
 </div>
 <div className="flex justify-between items-center">
 <span className="text-xs text-muted-foreground">Pessoas</span>
 <span className="font-bold">{reservation.party_size}</span>
 </div>
 {reservation.special_requests && (
 <div className="pt-2 border-t border-border/50">
 <p className="text-xs text-muted-foreground">Obs</p>
 <p className="text-xs font-medium mt-0.5">{reservation.special_requests}</p>
 </div>
 )}
 </div>

 {/* Ações da reserva com conexão direta ao PDV de Comandas */}
 <div className="flex flex-col gap-2 pt-2">
 {reservation.status === "pending" && (
 <Button
 size="sm"
 variant="outline"
 className="w-full font-bold text-xs text-emerald-600 border-emerald-500/40 gap-1.5"
 onClick={() => handleUpdateStatus({ data: { reservation_id: reservation.id, status: "confirmed" } })}
 >
 <CheckCircle2 className="size-3.5" /> Confirmar Reserva
 </Button>
 )}
 {["pending", "confirmed"].includes(reservation.status) && (
 <Button
 size="sm"
 className="w-full font-bold text-xs gap-1.5"
 onClick={() => handleUpdateStatus({ data: { reservation_id: reservation.id, status: "seated" } })}
 >
 <Armchair className="size-3.5" /> Acomodar Cliente
 </Button>
 )}
 {["pending", "confirmed", "seated"].includes(reservation.status) && (
 <Button
 size="sm"
 variant="outline"
 className="w-full font-bold text-xs gap-1.5 border-primary/40 text-primary hover:bg-primary/5 cursor-pointer"
 onClick={() =>
 handleOpenComanda({
 tableNumber: selectedTable.label,
 guestName: reservation.customer_name,
 reservationId: reservation.id,
 })
 }
 disabled={isOpeningComanda}
 >
 <Receipt className="size-3.5" /> Abrir Comanda no PDV & Lançar Pedidos
 </Button>
 )}
 {["pending", "confirmed"].includes(reservation.status) && (
 <Button
 size="sm"
 variant="ghost"
 className="w-full text-xs text-destructive hover:bg-destructive/10 gap-1.5"
 onClick={() => handleUpdateStatus({ data: { reservation_id: reservation.id, status: "cancelled" } })}
 >
 Cancelar Reserva
 </Button>
 )}
 </div>
 </div>
 ) : (
 <div className="p-4 rounded-xl bg-muted/20 border border-dashed border-border/60 text-center space-y-2">
 <Armchair className="size-8 mx-auto text-muted-foreground/40" />
 <p className="text-sm font-bold text-muted-foreground">Mesa disponível</p>
 <p className="text-xs text-muted-foreground">Sem reserva ativa para hoje.</p>
 <div className="flex gap-2 justify-center pt-2">
 <Button
 size="sm"
 variant="outline"
 className="font-bold text-xs gap-1.5 cursor-pointer"
 onClick={() =>
 handleOpenComanda({
 tableNumber: selectedTable.label,
 })
 }
 disabled={isOpeningComanda}
 >
 <Receipt className="size-3.5" /> Abrir Comanda
 </Button>
 <Button
 size="sm"
 className="font-bold text-xs gap-1.5 cursor-pointer"
 onClick={() => {
 setAssignedTable(selectedTable.label);
 setSheetOpen(false);
 setDialogOpen(true);
 }}
 >
 <Plus className="size-3.5" /> Reservar
 </Button>
 </div>
 </div>
 )}
 </div>
 </>
 );
 })()}
 </SheetContent>
 </Sheet>

 {/* Editor da Planta do Salão */}
 <FloorPlanEditorSheet
 open={isFloorPlanEditorOpen}
 onOpenChange={setIsFloorPlanEditorOpen}
 currentTables={salonTables}
 onSaveSuccess={() => refetchFloorPlan()}
 />
 </div>
 </NicheOperationalGuard>
 );
}

// ─── Sub-componentes ───────────────────────────────────────────────────

function ReservationStatusBadge({ status }: { status: string }) {
 const map: Record<string, { label: string; cn: string }> = {
 pending: { label: "Pendente", cn: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30" },
 confirmed: { label: "Confirmada", cn: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" },
 seated: { label: "Acomodado", cn: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30" },
 cancelled: { label: "Cancelada", cn: "bg-destructive/10 text-destructive border-destructive/30" },
 no_show: { label: "Não compareceu", cn: "bg-muted/60 text-muted-foreground border-border/60" },
 };
 const cfg = map[status] || { label: status, cn: "bg-muted/60 text-muted-foreground border-border/60" };
 return (
 <span className={cn("text-[10px] font-bold uppercase px-2 py-0.5 rounded-lg border", cfg.cn)}>
 {cfg.label}
 </span>
 );
}

function ReservationForm({
 customerName, setCustomerName,
 customerPhone, setCustomerPhone,
 partySize, setPartySize,
 reservationDate, setReservationDate,
 reservationTime, setReservationTime,
 assignedTable, setAssignedTable,
 specialRequests, setSpecialRequests,
 onSubmit, isSubmitting,
}: any) {
 const [customerSearch, setCustomerSearch] = useState("");
 const [isDropdownOpen, setIsDropdownOpen] = useState(false);
 const [isCrmLinked, setIsCrmLinked] = useState(false);

 const { data: searchResults = [], isLoading } = useQuery({
 queryKey: ["crm-customers-reservations", customerSearch],
 queryFn: () => listCustomers({ data: { query: customerSearch.trim() } }),
 enabled: customerSearch.trim().length >= 1,
 staleTime: 30_000,
 });

 const handleSelectCustomer = (c: any) => {
 const name = c.fullName || c.name || "";
 setCustomerName(name);
 setCustomerPhone(c.phone || "");
 setIsCrmLinked(true);
 setIsDropdownOpen(false);
 setCustomerSearch("");
 toast.success(`Cliente ${name} selecionado!`);
 };

 return (
 <div className="space-y-4 py-2">
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div>
 <Label className="text-xs font-bold text-muted-foreground">Data *</Label>
 <Input type="date" value={reservationDate} onChange={(e) => setReservationDate(e.target.value)} className="mt-1 font-mono text-xs" />
 </div>
 <div>
 <Label className="text-xs font-bold text-muted-foreground">Horário *</Label>
 <Input type="time" value={reservationTime} onChange={(e) => setReservationTime(e.target.value)} className="mt-1 font-mono text-xs" />
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div>
 <Label className="text-xs font-bold text-muted-foreground">Pessoas *</Label>
 <Input
 type="number"
 min={1}
 max={30}
 value={partySize}
 onChange={(e) => setPartySize(parseInt(e.target.value, 10) || 2)}
 className="mt-1"
 />
 </div>
 <div>
 <Label className="text-xs font-bold text-muted-foreground">Mesa</Label>
 <Input placeholder="Ex: Mesa 04" value={assignedTable} onChange={(e) => setAssignedTable(e.target.value)} className="mt-1" />
 </div>
 </div>

 {/* Autocomplete de Cliente integrado ao CRM */}
 <div className="space-y-1 relative">
 <div className="flex items-center justify-between">
 <Label className="text-xs font-bold text-muted-foreground">Nome do Cliente *</Label>
 {isCrmLinked && (
 <Badge variant="secondary" className="text-[10px] font-bold bg-primary/10 text-primary border-primary/20">
 ✓ Vinculado ao CRM
 </Badge>
 )}
 </div>
 <Input
 placeholder="Digite para buscar no CRM ou novo cliente..."
 value={customerName}
 onChange={(e) => {
 const val = e.target.value;
 setCustomerName(val);
 setCustomerSearch(val);
 setIsDropdownOpen(val.trim().length >= 1);
 if (isCrmLinked) setIsCrmLinked(false);
 }}
 onFocus={() => {
 if (customerName.trim().length >= 1) setIsDropdownOpen(true);
 }}
 className="mt-1"
 />

 {/* Dropdown de Clientes Encontrados */}
 {isDropdownOpen && searchResults.length > 0 && (
 <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-card border border-border/80 rounded-xl shadow-xs max-h-48 overflow-y-auto no-scrollbar divide-y divide-border/40">
 {searchResults.map((c: any) => (
 <div
 key={c.id}
 onClick={() => handleSelectCustomer(c)}
 className="p-2.5 hover:bg-muted/40 transition-colors cursor-pointer text-xs flex items-center justify-between"
 >
 <div>
 <p className="font-bold text-foreground">{c.fullName || c.name}</p>
 <p className="text-[11px] text-muted-foreground font-mono">
 {c.phone ? `Whats: ${c.phone}` : "Sem telefone"} {c.document && `• CPF: ${c.document}`}
 </p>
 </div>
 <Badge variant="outline" className="text-[9px] font-mono">
 Usar
 </Badge>
 </div>
 ))}
 </div>
 )}
 </div>

 <div>
 <Label className="text-xs font-bold text-muted-foreground">WhatsApp / Telefone *</Label>
 <Input
 placeholder="(49) 99999-9999"
 value={customerPhone}
 onChange={(e) => setCustomerPhone(e.target.value)}
 className="mt-1 font-mono"
 />
 </div>

 <div>
 <Label className="text-xs font-bold text-muted-foreground">Observações Especiais</Label>
 <Input
 placeholder="Ex: Aniversário, cadeira de bebê, mesa com vista..."
 value={specialRequests}
 onChange={(e) => setSpecialRequests(e.target.value)}
 className="mt-1"
 />
 </div>

 <Button
 onClick={onSubmit}
 disabled={!customerName || !customerPhone || isSubmitting}
 className="w-full font-bold mt-2 h-10"
 >
 {isSubmitting ? "Salvando..." : "Salvar Reserva"}
 </Button>
 </div>
 );
}
