import { BusFleetSelectorModal } from "@/components/tourism/groups/bus-fleet-selector-modal";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import {
 ArrowLeft,
 Bus,
 Users,
 Building,
 FileText,
 Download,
 Check,
 Loader2,
 Calendar,
 MapPin,
 Phone,
 ShieldCheck,
 DollarSign,
 Link2,
 UserCheck,
 Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
 getGroupTourById,
 updateGroupTourAllocations,
 type GroupTourDTO,
 type BusSeatDTO,
 type HotelRoomAllocationDTO,
} from "@/services/group-tours.functions";
import { BusSeatMap } from "@/components/tourism/groups/bus-seat-map";
import { RoomingListManager } from "@/components/tourism/groups/rooming-list-manager";
import { GroupTourBudgetManager } from "@/components/tourism/groups/group-tour-budget";
import { GroupTourCashLedger } from "@/components/tourism/groups/group-tour-cash-ledger";
import { GenerateMagicLinkModal } from "@/components/tourism/groups/generate-magic-link-modal";
import { exportElementAsPdf } from "@/lib/pdf-export";

export const Route = createFileRoute("/workspace/turismo/grupos/$id")({
 head: () => ({ meta: [{ title: "Gestão da Excursão & Ônibus | Workspace" }] }),
 loader: async ({ params }) => {
   try {
 const tour = await getGroupTourById({ data: { id: params.id } });
 return { tour };
   } catch (err) {
     console.error("[loader:workspace.turismo.grupos.$id] Unhandled loader error:", err);
     return { tour: null };
   }
 },
 component: WorkspaceGroupTourDetailPage,
});

function WorkspaceGroupTourDetailPage() {
 const { tour: initialTour } = ((Route.useLoaderData?.() as any) || {});
 const [tour, setTour] = useState<GroupTourDTO | null>(initialTour);
 const [isSaving, setIsSaving] = useState(false);
 const [isExportingManifest, setIsExportingManifest] = useState(false);
 const [magicLinkModalOpen, setMagicLinkModalOpen] = useState(false);
 const [fleetModalOpen, setFleetModalOpen] = useState(false);

 // Operacional do Ônibus
 const [busCompany, setBusCompany] = useState(tour?.bus_company_name || "");
 const [busPlate, setBusPlate] = useState(tour?.bus_plate || "");
 const [driverName, setDriverName] = useState(tour?.driver_name || "");
 const [driverPhone, setDriverPhone] = useState(tour?.driver_phone || "");

 const saveMutation = useMutation({
 mutationFn: (patch: any) =>
 updateGroupTourAllocations({
 data: {
 id: tour!.id,
 ...patch,
 },
 }),
 onMutate: () => setIsSaving(true),
 onSettled: () => setIsSaving(false),
 onError: (err: any) => toast.error(err?.message || "Erro ao salvar alterações."),
 });

 const handleSeatsChange = useCallback(
 (updatedSeats: BusSeatDTO[]) => {
 if (!tour) return;
 setTour({ ...tour, seats: updatedSeats });
 saveMutation.mutate({ seats: updatedSeats });
 },
 [tour, saveMutation]
 );

 const handleRoomsChange = useCallback(
 (updatedRooms: HotelRoomAllocationDTO[]) => {
 if (!tour) return;
 setTour({ ...tour, rooms: updatedRooms });
 saveMutation.mutate({ rooms: updatedRooms });
 },
 [tour, saveMutation]
 );

 
 const handleSelectFleetVehicle = (data: {
 busCompanyName: string;
 busPlate: string;
 driverName: string;
 driverPhone: string;
 newSeats: BusSeatDTO[];
 }) => {
 setBusCompany(data.busCompanyName);
 setBusPlate(data.busPlate);
 setDriverName(data.driverName);
 setDriverPhone(data.driverPhone);
 if (tour) {
 setTour({ ...tour, seats: data.newSeats });
 }
 saveMutation.mutate({
 busCompanyName: data.busCompanyName,
 busPlate: data.busPlate,
 driverName: data.driverName,
 driverPhone: data.driverPhone,
 seats: data.newSeats,
 });
 toast.success('Ônibus vinculado da Frota 2D e mapa de poltronas atualizado!');
 };
 
 const handleSaveOperational = () => {
 saveMutation.mutate({
 busCompanyName: busCompany || null,
 busPlate: busPlate || null,
 driverName: driverName || null,
 driverPhone: driverPhone || null,
 });
 toast.success("Dados operacionais do transporte salvos!");
 };

 if (!tour) {
 return (
 <div className="py-20 text-center space-y-4">
 <h2 className="text-sm font-bold text-foreground">Excursão não encontrada</h2>
 <Button asChild size="sm" variant="outline" className="rounded-xl">
 <Link to="/workspace/turismo/grupos">Voltar para Grupos</Link>
 </Button>
 </div>
 );
 }

 const occupiedSeats = tour.seats.filter((s) => s.status === "reserved");

 const handleExportManifest = async () => {
 try {
 setIsExportingManifest(true);
 await exportElementAsPdf(
 "manifesto-antt-view",
 `Manifesto_ANTT_${tour.destination.replace(/\s+/g, "_")}.pdf`
 );
 toast.success("Manifesto de passageiros baixado com sucesso!");
 } catch (err: any) {
 toast.error(err?.message || "Erro ao exportar manifesto.");
 } finally {
 setIsExportingManifest(false);
 }
 };

 return (
 <div className="w-full max-w-7xl mx-auto px-0 sm:px-4 md:px-0 space-y-6 pb-20 animate-in fade-in duration-200">
 {/* ── 1. TOP HEADER DA VIAGEM ── */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-card border border-border/80">
 <div className="flex items-center gap-3">
 <Button asChild size="icon" variant="ghost" className="size-11 sm:size-8 p-0 rounded-xl shrink-0 cursor-pointer">
 <Link to="/workspace/turismo/grupos">
 <ArrowLeft className="size-4" />
 </Link>
 </Button>

 <div className="space-y-0.5 min-w-0">
 <div className="flex items-center gap-2 flex-wrap">
 <h1 className="text-sm font-bold text-foreground truncate max-w-xs sm:max-w-md">
 {tour.title}
 </h1>
 <Badge variant="outline" className="text-[10px] font-mono font-bold">
 {tour.destination}
 </Badge>
 {isSaving ? (
 <span className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
 <Loader2 className="size-3 animate-spin text-primary" /> Salvando...
 </span>
 ) : (
 <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-mono">
 <Check className="size-3" /> Atualizado
 </span>
 )}
 </div>
 <p className="text-[11px] text-muted-foreground">
 Saída: {tour.departure_date} às {tour.departure_time} de {tour.departure_city} • Retorno: {tour.return_date}
 </p>
 </div>
 </div>

 <div className="flex flex-wrap items-center gap-2">
 <Button
 asChild
 variant="outline"
 className="rounded-xl text-xs font-bold gap-1.5 h-11 sm:h-9 px-4 sm:px-3 cursor-pointer"
 >
 <Link
 to={"/workspace/turismo/grupos/$id/embarque" as any}
 params={{ id: tour.id } as any}
 >
 <UserCheck className="size-4 sm:size-3.5 text-emerald-600" />
 <span>Embarque</span>
 </Link>
 </Button>

 <Button
 type="button"
 variant="outline"
 onClick={() => setMagicLinkModalOpen(true)}
 className="rounded-xl text-xs font-bold gap-1.5 h-11 sm:h-9 px-4 sm:px-3 cursor-pointer"
 >
 <Link2 className="size-4 sm:size-3.5" />
 <span>Link Mágico</span>
 </Button>

 <Button
 type="button"
 variant="outline"
 disabled={isExportingManifest}
 onClick={handleExportManifest}
 className="rounded-xl text-xs font-bold gap-1.5 h-11 sm:h-9 px-4 sm:px-3 cursor-pointer"
 >
 <Download className="size-4 sm:size-3.5" />
 <span>{isExportingManifest ? "Gerando..." : "Manifesto ANTT (PDF)"}</span>
 </Button>
 </div>
 </div>

 {/* ── 2. ABAS DE GESTÃO DA VIAGEM ── */}
 <Tabs defaultValue="onibus" className="space-y-4">
 <TabsList className="flex items-center gap-1.5 w-full overflow-x-auto no-scrollbar p-1 rounded-xl min-h-[48px] h-auto sm:h-11">
 <TabsTrigger value="onibus" className="min-h-[44px] sm:min-h-[36px] text-xs rounded-xl font-bold gap-1.5 py-2.5 sm:py-2 cursor-pointer flex items-center justify-center">
 <Bus className="size-3.5" />
 <span>Mapa do Ônibus</span>
 </TabsTrigger>
 <TabsTrigger value="hoteis" className="min-h-[44px] sm:min-h-[36px] text-xs rounded-xl font-bold gap-1.5 py-2.5 sm:py-2 cursor-pointer flex items-center justify-center">
 <Building className="size-3.5" />
 <span>Rooming List</span>
 </TabsTrigger>
 <TabsTrigger value="orcamento" className="min-h-[44px] sm:min-h-[36px] text-xs rounded-xl font-bold gap-1.5 py-2.5 sm:py-2 cursor-pointer flex items-center justify-center">
 <DollarSign className="size-3.5" />
 <span>Orçamento</span>
 </TabsTrigger>
 <TabsTrigger value="caixa" className="min-h-[44px] sm:min-h-[36px] text-xs rounded-xl font-bold gap-1.5 py-2.5 sm:py-2 cursor-pointer flex items-center justify-center">
 <Wallet className="size-3.5" />
 <span>Caixa da Viagem</span>
 </TabsTrigger>
 <TabsTrigger value="transporte" className="min-h-[44px] sm:min-h-[36px] text-xs rounded-xl font-bold gap-1.5 py-2.5 sm:py-2 cursor-pointer flex items-center justify-center">
 <ShieldCheck className="size-3.5" />
 <span>Veículo / ANTT</span>
 </TabsTrigger>
 </TabsList>

 {/* ABA 1: MAPA DO ÔNIBUS */}
 <TabsContent value="onibus" className="space-y-4">
 <BusSeatMap seats={tour.seats} onSeatsChange={handleSeatsChange} />
 </TabsContent>

 {/* ABA 2: ROOMING LIST DE HOTÉIS */}
 <TabsContent value="hoteis" className="space-y-4">
 <RoomingListManager rooms={tour.rooms} onRoomsChange={handleRoomsChange} tourTitle={tour.title} />
 </TabsContent>

 {/* ABA 3: CUSTOS & FINANCEIRO */}
 <TabsContent value="orcamento" className="space-y-4">
 <GroupTourBudgetManager
 tourId={tour.id}
 tourPriceCents={tour.price_cents}
 totalSeats={tour.total_seats}
 passengersCount={occupiedSeats.length}
 />
 </TabsContent>

 {/* ABA 4: CAIXA EM TRÂNSITO DA VIAGEM */}
 <TabsContent value="caixa" className="space-y-4">
 <GroupTourCashLedger tourId={tour.id} storeId={tour.store_id || ""} />
 </TabsContent>

 {/* ABA 5: DADOS OPERACIONAIS DO TRANSPORTE */}
 <TabsContent value="transporte" className="space-y-4">
 <div className="p-6 rounded-2xl bg-card border border-border/80 space-y-4 max-w-xl">
 <h3 className="text-sm font-bold text-foreground">
 Identificação do Transporte Rodoviário
 </h3>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
 <div className="space-y-1">
 <Label className="text-xs font-bold">Empresa de Fretamento</Label>
 <Input
 placeholder="Ex: Viação Catarinense"
 value={busCompany}
 onChange={(e) => setBusCompany(e.target.value)}
 className="h-10 text-xs rounded-xl"
 />
 </div>

 <div className="space-y-1">
 <Label className="text-xs font-bold">Placa do Ônibus</Label>
 <Input
 placeholder="ABC-1D23"
 value={busPlate}
 onChange={(e) => setBusPlate(e.target.value)}
 className="h-10 text-xs rounded-xl font-mono uppercase"
 />
 </div>

 <div className="space-y-1">
 <Label className="text-xs font-bold">Nome do Motorista Principal</Label>
 <Input
 placeholder="Nome completo"
 value={driverName}
 onChange={(e) => setDriverName(e.target.value)}
 className="h-10 text-xs rounded-xl"
 />
 </div>

 <div className="space-y-1">
 <Label className="text-xs font-bold">Telefone do Motorista</Label>
 <Input
 placeholder="(49) 99999-9999"
 value={driverPhone}
 onChange={(e) => setDriverPhone(e.target.value)}
 className="h-10 text-xs rounded-xl"
 />
 </div>
 </div>

            <Button
              type="button"
              onClick={handleSaveOperational}
              className="h-11 sm:h-10 px-5 rounded-xl text-xs font-bold bg-foreground text-background cursor-pointer shadow-xs"
            >
              Salvar Dados do Transporte
            </Button>
 </div>
 </TabsContent>
 </Tabs>

 {/* ── 3. VISUALIZADOR OCULTO PARA EXPORTAÇÃO DO MANIFESTO ANTT ── */}
 <div className="hidden">
 <div id="manifesto-antt-view" className="p-10 bg-white text-slate-900 font-sans space-y-6">
 <div className="text-center pb-4 border-b-2 border-slate-900 space-y-1">
 <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500">
 Agência Nacional de Transportes Terrestres (ANTT) / DER
 </span>
 <h1 className="text-xl font-black uppercase text-slate-900">
 Manifesto de Passageiros
 </h1>
 <p className="text-xs font-mono text-slate-600">
 Viagem: {tour.title} • Origem: {tour.departure_city} ➔ Destino: {tour.destination}
 </p>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
 <div>
 <span className="text-slate-500 block text-[10px]">Data e Hora Saída:</span>
 <strong>{tour.departure_date} às {tour.departure_time}</strong>
 </div>
 <div>
 <span className="text-slate-500 block text-[10px]">Empresa / Placa:</span>
 <strong>{busCompany || "A Definir"} ({busPlate || "S/ Placa"})</strong>
 </div>
 <div>
 <span className="text-slate-500 block text-[10px]">Motorista:</span>
 <strong>{driverName || "A Definir"}</strong>
 </div>
 </div>

 <table className="w-full text-xs text-left border border-slate-200">
 <thead className="bg-slate-100 font-bold border-b border-slate-200 text-[10px] uppercase font-mono">
 <tr>
 <th className="p-2 border-r">Poltrona</th>
 <th className="p-2 border-r">Nome Completo do Passageiro</th>
 <th className="p-2 border-r">Documento (RG/CPF)</th>
 <th className="p-2 border-r">Telefone</th>
 <th className="p-2">Local de Embarque</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-200">
 {occupiedSeats.map((s) => (
 <tr key={s.seat_number} className="text-slate-800">
 <td className="p-2 font-mono font-bold border-r text-center">#{s.seat_number}</td>
 <td className="p-2 font-bold border-r">{s.passenger_name}</td>
 <td className="p-2 font-mono border-r">{s.passenger_document || "-"}</td>
 <td className="p-2 font-mono border-r">{s.passenger_phone || "-"}</td>
 <td className="p-2">{s.boarding_point || tour.departure_city}</td>
 </tr>
 ))}
 </tbody>
 </table>

 <div className="pt-6 border-t border-slate-200 flex justify-between text-[10px] text-slate-500 font-mono">
 <span>Total de Passageiros Embarcados: {occupiedSeats.length}</span>
 <span>Documento emitido digitalmente pela plataforma Waesy</span>
 </div>
 </div>
 </div>

 {/* ── 4. MODAL DE GERAR LINK MÁGICO ── */}
 <GenerateMagicLinkModal
 open={magicLinkModalOpen}
 onOpenChange={setMagicLinkModalOpen}
 storeId={tour.store_id || ""}
 tourId={tour.id}
 />
 </div>
 );
}
