import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
 ArrowLeft,
 Bus,
 CheckCircle2,
 Clock,
 AlertTriangle,
 Search,
 Plus,
 Phone,
 UserCheck,
 UserX,
 MapPin,
 Filter,
 Check,
 Trash2,
 Download,
 Printer,
} from "lucide-react";

import { PageHeader } from "@/components/commerce/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

import { getStoreSettings } from "@/services/store.functions";
import { getGroupTourById } from "@/services/group-tours.functions";
import {
 getTourBoardingOverview,
 togglePassengerCheckin,
 createTourBoardingPoint,
 deleteTourBoardingPoint,
} from "@/services/group-tour-boarding.functions";

export const Route = createFileRoute("/workspace/turismo/grupos/$id/embarque")({
 head: () => ({ meta: [{ title: "Central de Embarque & Check-in | Workspace" }] }),
 loader: async ({ params }: { params: { id: string } }) => {
   try {
 const store = await getStoreSettings().catch(() => null);
 const storeId = store?.id || "";
 const [tour, overview] = await Promise.all([
 getGroupTourById({ data: { id: params.id } }).catch(() => null),
 storeId
 ? getTourBoardingOverview({ data: { store_id: storeId, tour_id: params.id } }).catch(
 () => null
 )
 : null,
 ]);
 return {
 store,
 tour,
 initialOverview: overview,
 };
   } catch (err) {
     console.error("[loader:workspace.turismo.grupos.$id.embarque] Unhandled loader error:", err);
     return { store: null, tour: null, initialOverview: null };
   }
 },
 component: GroupTourBoardingPage,
});

function GroupTourBoardingPage() {
 const { store, tour, initialOverview } = (Route.useLoaderData as any)();
 const storeId = store?.id || "";

 const [overview, setOverview] = useState(initialOverview);
 const [searchQuery, setSearchQuery] = useState("");
 const [selectedPointFilter, setSelectedPointFilter] = useState("all");
 const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "checked_in" | "no_show">(
 "all"
 );

 // Modal de Novo Ponto
 const [pointModalOpen, setPointModalOpen] = useState(false);
 const [pointName, setPointName] = useState("");
 const [scheduledTime, setScheduledTime] = useState("05:30");
 const [address, setAddress] = useState("");
 const [submittingPoint, setSubmittingPoint] = useState(false);

 const reload = async () => {
 if (!storeId || !tour.id) return;
 try {
 const data = await getTourBoardingOverview({
 data: { store_id: storeId, tour_id: tour.id },
 });
 setOverview(data);
 } catch (err: any) {
 toast.error(err?.message || "Erro ao atualizar dados de embarque");
 }
 };

 const handleToggleCheckin = async (
 seatNumber: number,
 passengerName: string,
 targetStatus: "checked_in" | "no_show"
 ) => {
 try {
 await togglePassengerCheckin({
 data: {
 store_id: storeId,
 tour_id: tour.id,
 seat_number: seatNumber,
 passenger_name: passengerName,
 status: targetStatus,
 },
 });
 reload();
 } catch (err: any) {
 toast.error(err?.message || "Erro ao atualizar check-in");
 }
 };

 const handleCreatePoint = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!pointName.trim()) return toast.error("Informe o nome do ponto de embarque");

 try {
 setSubmittingPoint(true);
 await createTourBoardingPoint({
 data: {
 store_id: storeId,
 tour_id: tour.id,
 point_name: pointName.trim(),
 scheduled_time: scheduledTime,
 address: address.trim() || null,
 },
 });

 toast.success("Ponto de embarque cadastrado!");
 setPointModalOpen(false);
 setPointName("");
 setAddress("");
 reload();
 } catch (err: any) {
 toast.error(err?.message || "Erro ao criar ponto de embarque");
 } finally {
 setSubmittingPoint(false);
 }
 };

 const handleDeletePoint = async (pointId: string) => {
 if (!window.confirm("Deseja excluir este ponto de embarque?")) return;
 try {
 await deleteTourBoardingPoint({ data: { store_id: storeId, point_id: pointId } });
 toast.success("Ponto de embarque removido");
 reload();
 } catch (err: any) {
 toast.error(err?.message || "Erro ao remover ponto");
 }
 };

 const checkinMap = useMemo(() => {
 const map = new Map<number, any>();
 (overview?.checkinLogs || []).forEach((l: any) => {
 map.set(l.seat_number, l);
 });
 return map;
 }, [overview?.checkinLogs]);

 // Filtragem de passageiros
 const filteredPassengers = useMemo(() => {
 const list = overview?.reservedSeats || [];
 return list.filter((s: any) => {
 const checkin = checkinMap.get(s.seat_number);
 const currentStatus = checkin ? checkin.status : "pending";

 if (statusFilter !== "all" && currentStatus !== statusFilter) return false;

 if (searchQuery.trim()) {
 const q = searchQuery.toLowerCase();
 const matchesName = s.passenger_name?.toLowerCase().includes(q);
 const matchesDoc = s.passenger_document?.toLowerCase().includes(q);
 const matchesSeat = String(s.seat_number).includes(q);
 if (!matchesName && !matchesDoc && !matchesSeat) return false;
 }

 if (selectedPointFilter !== "all") {
 if (s.boarding_point !== selectedPointFilter) return false;
 }

 return true;
 });
 }, [overview?.reservedSeats, checkinMap, statusFilter, searchQuery, selectedPointFilter]);

 const handleExportCsv = () => {
 const list = overview?.reservedSeats || [];
 if (list.length === 0) {
 toast.error("Nenhum passageiro na lista de embarque.");
 return;
 }

 const headers = ["Poltrona", "Passageiro", "Documento", "Telefone", "Local de Embarque", "Status Embarque"];
 const rows = list.map((s: any) => {
 const checkin = checkinMap.get(s.seat_number);
 const statusText =
 checkin?.status === "checked_in"
 ? "Embarcado"
 : checkin?.status === "no_show"
 ? "Não Compareceu"
 : "Aguardando";
 return [
 s.seat_number,
 `"${s.passenger_name || ""}"`,
 `"${s.passenger_document || ""}"`,
 `"${s.passenger_phone || ""}"`,
 `"${s.boarding_point || "Padrão"}"`,
 statusText,
 ].join(",");
 });

 const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\n");
 const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
 const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `lista_embarque_${tour?.destination ? tour.destination.toLowerCase().replace(/\s+/g, "_") : "excursao"}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Planilha de embarque exportada com sucesso!");
  };

  if (!tour) {
    return (
      <div className="p-8 text-center space-y-3">
        <p className="text-sm text-muted-foreground">Excursão não encontrada.</p>
        <Button asChild variant="outline">
          <Link to={"/workspace/turismo/grupos" as any}>Voltar</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-0 sm:px-4 md:px-0 space-y-6 pb-20 animate-in fade-in duration-200">
      {/* ── 1. Top Bar & Ações ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="icon" className="size-11 sm:size-10 rounded-xl cursor-pointer shrink-0">
            <Link to={"/workspace/turismo/grupos/$id" as any} params={{ id: tour.id } as any}>
              <ArrowLeft className="size-4" />
            </Link>
          </Button>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-bold text-foreground tracking-tight truncate">
                Embarque: {tour.title}
              </h1>
              <Badge variant="outline" className="text-[10px] font-mono font-bold">
                {tour.destination}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Saída: {tour.departure_date} às {tour.departure_time} • Controle em tempo real na porta do ônibus.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            type="button"
            variant="outline"
            onClick={handleExportCsv}
            className="h-11 sm:h-10 px-4 sm:px-3 rounded-xl text-xs font-bold gap-1.5 cursor-pointer"
          >
            <Download className="size-4 sm:size-3.5" /> Planilha CSV
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => window.print()}
            className="h-11 sm:h-10 px-4 sm:px-3 rounded-xl text-xs font-bold gap-1.5 cursor-pointer hidden sm:inline-flex"
          >
            <Printer className="size-4 sm:size-3.5" /> Imprimir
          </Button>

          <Button
            type="button"
            onClick={() => setPointModalOpen(true)}
            className="h-11 sm:h-10 px-4 rounded-xl text-xs font-bold gap-2 cursor-pointer shadow-xs"
          >
            <Plus className="size-4 sm:size-3.5" /> Pontos de Parada
          </Button>
        </div>
      </div>

      {/* ── 2. Cards de Métricas de Embarque ── */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-card border border-border/70 space-y-0.5">
          <span className="text-[11px] font-semibold text-muted-foreground">Total de Vagas</span>
          <p className="text-xl font-extrabold text-foreground font-mono">
            {overview?.totalReserved ?? 0}
          </p>
          <p className="text-[10px] text-muted-foreground">Confirmados na lista</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-0.5">
          <span className="text-[11px] font-semibold text-emerald-700">Embarcados</span>
          <p className="text-xl font-extrabold text-emerald-700 font-mono">
            {overview?.checkedInCount ?? 0}
          </p>
          <p className="text-[10px] text-emerald-600 font-semibold">Dentro do veículo</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-0.5">
          <span className="text-[11px] font-semibold text-amber-700">Aguardando</span>
          <p className="text-xl font-extrabold text-amber-700 font-mono">
            {overview?.pendingCount ?? 0}
          </p>
          <p className="text-[10px] text-amber-600">Ainda não chegaram</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-0.5 col-span-3 sm:col-span-1">
          <span className="text-[11px] font-semibold text-rose-700">Ausentes (No-show)</span>
          <p className="text-xl font-extrabold text-rose-700 font-mono">
            {overview?.noShowCount ?? 0}
          </p>
          <p className="text-[10px] text-rose-600">Não compareceram</p>
        </div>
      </div>

      {/* ── 3. Barra de Busca & Filtros ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nome, CPF ou nº da poltrona..."
            className="h-11 pl-10 rounded-xl text-xs sm:text-sm"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto no-scrollbar pb-1 sm:pb-0">
          <Button
            type="button"
            variant={statusFilter === "all" ? "default" : "outline"}
            onClick={() => setStatusFilter("all")}
            className="min-h-[44px] sm:min-h-[36px] h-11 sm:h-9 px-4 sm:px-3 rounded-xl text-xs font-semibold cursor-pointer"
          >
            Todos
          </Button>
          <Button
            type="button"
            variant={statusFilter === "pending" ? "default" : "outline"}
            onClick={() => setStatusFilter("pending")}
            className="min-h-[44px] sm:min-h-[36px] h-11 sm:h-9 px-4 sm:px-3 rounded-xl text-xs font-semibold cursor-pointer"
          >
            Aguardando ({overview?.pendingCount ?? 0})
          </Button>
          <Button
            type="button"
            variant={statusFilter === "checked_in" ? "default" : "outline"}
            onClick={() => setStatusFilter("checked_in")}
            className="min-h-[44px] sm:min-h-[36px] h-11 sm:h-9 px-4 sm:px-3 rounded-xl text-xs font-semibold cursor-pointer"
          >
            Embarcados ({overview?.checkedInCount ?? 0})
          </Button>
        </div>
      </div>

 {/* ── 4. Lista Rápida de Passageiros ── */}
 <div className="space-y-2.5">
 {filteredPassengers.map((passenger: any) => {
 const checkin = checkinMap.get(passenger.seat_number);
 const isCheckedIn = checkin?.status === "checked_in";
 const isNoShow = checkin?.status === "no_show";

 return (
 <div
 key={passenger.seat_number}
 className={cn(
 "flex items-center justify-between gap-3 p-3.5 rounded-2xl border transition-all",
 isCheckedIn
 ? "bg-emerald-500/5 border-emerald-500/30"
 : isNoShow
 ? "bg-rose-500/5 border-rose-500/30 opacity-70"
 : "bg-card border-border/70 hover:border-primary/40"
 )}
 >
 {/* Lado Esquerdo: Poltrona & Identificação */}
 <div className="flex items-center gap-3 min-w-0 flex-1">
 <div
 className={cn(
 "size-11 rounded-xl flex items-center justify-center font-mono font-bold text-sm shrink-0 border",
 isCheckedIn
 ? "bg-emerald-600 text-white border-emerald-600"
 : isNoShow
 ? "bg-rose-600 text-white border-rose-600"
 : "bg-muted text-foreground border-border/80"
 )}
 >
 #{passenger.seat_number}
 </div>

 <div className="space-y-0.5 min-w-0 flex-1">
 <div className="flex items-center gap-2">
 <p className="text-xs sm:text-sm font-bold text-foreground truncate">
 {passenger.passenger_name || "Nome não informado"}
 </p>
 {isCheckedIn && (
 <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-[10px] px-1.5 py-0 h-4">
 A bordo
 </Badge>
 )}
 {isNoShow && (
 <Badge className="bg-rose-600 hover:bg-rose-600 text-white text-[10px] px-1.5 py-0 h-4">
 Ausente
 </Badge>
 )}
 </div>

 <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground font-mono">
 <span>Doc: {passenger.passenger_document || "S/ Doc"}</span>
 {passenger.passenger_phone && (
 <a
 href={`tel:${passenger.passenger_phone}`}
 className="flex items-center gap-1 text-primary hover:underline"
 >
 <Phone className="size-3" />
 {passenger.passenger_phone}
 </a>
 )}
 {passenger.boarding_point && (
 <span className="flex items-center gap-1 text-foreground/70">
 <MapPin className="size-3" />
 {passenger.boarding_point}
 </span>
 )}
 </div>
 </div>
 </div>

 {/* Lado Direito: Ações de Check-in em 1 Toque */}
 <div className="flex items-center gap-1.5 shrink-0">
 <Button
 type="button"
 variant={isCheckedIn ? "default" : "outline"}
 onClick={() =>
 handleToggleCheckin(
 passenger.seat_number,
 passenger.passenger_name,
 "checked_in"
 )
 }
 className={cn(
 "h-11 sm:h-10 px-4 sm:px-3.5 rounded-xl text-xs font-bold gap-1.5 cursor-pointer",
 isCheckedIn
 ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600"
 : "border-border/80 hover:border-emerald-500 hover:text-emerald-600"
 )}
 >
 <UserCheck className="size-4" />
 <span className="hidden sm:inline">
 {isCheckedIn ? "Embarcado" : "Embarcar"}
 </span>
 </Button>

 <Button
 type="button"
 size="icon"
 variant={isNoShow ? "destructive" : "ghost"}
 onClick={() =>
 handleToggleCheckin(
 passenger.seat_number,
 passenger.passenger_name,
 "no_show"
 )
 }
 title={isNoShow ? "Cancelar ausência" : "Marcar como ausente"}
 className="size-11 sm:size-10 rounded-xl cursor-pointer text-muted-foreground hover:text-rose-600 shrink-0"
 >
 <UserX className="size-4" />
 </Button>
 </div>
 </div>
 );
 })}

 {filteredPassengers.length === 0 && (
 <div className="p-8 text-center rounded-2xl border border-dashed border-border/70 text-xs text-muted-foreground">
 Nenhum passageiro encontrado com os filtros selecionados.
 </div>
 )}
 </div>

 {/* ── 5. Sheet de Gerenciar Pontos de Embarque ── */}
 <Sheet open={pointModalOpen} onOpenChange={setPointModalOpen}>
   <SheetContent
     side="right"
     size="wide"
     className="w-full max-sm:!max-w-full max-sm:!w-screen sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw] p-6 flex flex-col justify-between overflow-y-auto"
   >
     <div>
       <SheetHeader>
         <SheetTitle className="text-base font-bold text-foreground">
           Pontos de Embarque e Paradas
         </SheetTitle>
         <SheetDescription className="text-xs text-muted-foreground">
           Cadastre e gerencie os pontos de encontro e horários para o grupo.
         </SheetDescription>
       </SheetHeader>

       {/* Lista de Pontos Atuais */}
       {overview?.points && overview.points.length > 0 && (
         <div className="space-y-2 border-b border-border/60 py-4">
           <span className="text-[11px] font-mono text-muted-foreground uppercase font-bold">
             Paradas Cadastradas
           </span>
           <div className="space-y-1.5 max-h-48 overflow-y-auto no-scrollbar">
             {overview.points.map((p: any) => (
               <div
                 key={p.id}
                 className="flex items-center justify-between p-2.5 rounded-xl bg-muted/20 border border-border/50 text-xs"
               >
                 <div>
                   <strong className="text-foreground">{p.point_name}</strong>
                   <span className="text-muted-foreground font-mono ml-2">
                     ({p.scheduled_time})
                   </span>
                 </div>
                 <Button
                   type="button"
                   variant="ghost"
                   size="icon"
                   onClick={() => handleDeletePoint(p.id)}
                   className="size-6 text-muted-foreground hover:text-rose-600 rounded cursor-pointer"
                 >
                   <Trash2 className="size-3" />
                 </Button>
               </div>
             ))}
           </div>
         </div>
       )}

       {/* Form de Novo Ponto */}
       <form id="new-boarding-point-form" onSubmit={handleCreatePoint} className="space-y-3.5 pt-4">
         <div className="space-y-1.5">
           <label className="text-xs font-semibold text-foreground">Nome do Local *</label>
           <Input
             value={pointName}
             onChange={(e) => setPointName(e.target.value)}
             placeholder="Ex: Posto Ipiranga Centro"
             className="h-9 text-xs rounded-xl"
             autoFocus
           />
         </div>

         <div className="space-y-1.5">
           <label className="text-xs font-semibold text-foreground">Horário Previsto *</label>
           <Input
             type="time"
             value={scheduledTime}
             onChange={(e) => setScheduledTime(e.target.value)}
             className="h-9 text-xs rounded-xl font-mono"
           />
         </div>

         <div className="space-y-1.5">
           <label className="text-xs font-semibold text-foreground">Endereço (opcional)</label>
           <Input
             value={address}
             onChange={(e) => setAddress(e.target.value)}
             placeholder="Ex: Av. Getúlio Vargas, 120"
             className="h-9 text-xs rounded-xl"
           />
         </div>
       </form>
     </div>

     <SheetFooter className="pt-4 border-t border-border/60">
        <Button
          type="submit"
          form="new-boarding-point-form"
          disabled={submittingPoint || !pointName.trim()}
          className="w-full h-11 sm:h-9 rounded-xl text-xs font-bold cursor-pointer shadow-xs"
        >
          {submittingPoint ? "Cadastrando..." : "Cadastrar Ponto de Embarque"}
        </Button>
     </SheetFooter>
   </SheetContent>
 </Sheet>
    </div>
  );
}
