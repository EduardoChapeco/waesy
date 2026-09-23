import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
 Calendar,
 Ticket,
 QrCode,
 Users,
 DollarSign,
 Plus,
 ArrowLeft,
 ExternalLink,
 Clock,
 MapPin,
 CheckCircle2,
 Utensils,
 Megaphone,
 Settings,
 Edit,
 Trash2,
 Gift,
 Search,
 Receipt,
 TrendingUp,
 Percent,
 Kanban,
 FileSpreadsheet,
 Layers,
 Mic2,
 ShieldCheck,
 FileText,
} from "lucide-react";
import { EventoKanban } from "@/components/eventos/evento-kanban";
import { EventoOrcamentos } from "@/components/eventos/evento-orcamentos";
import { EventoCustos } from "@/components/eventos/evento-custos";
import { EventoSubpaineis } from "@/components/eventos/evento-subpaineis";
import { EventoSetores } from "@/components/eventos/evento-setores";
import { EventoLineup } from "@/components/eventos/evento-lineup";
import { EventoParceiros } from "@/components/eventos/evento-parceiros";
import { EventoDocumentos } from "@/components/eventos/evento-documentos";
import { EventoAuditoria } from "@/components/eventos/evento-auditoria";
import { EventoCredenciais } from "@/components/eventos/evento-credenciais";
import { AlocarEquipeSheet } from "@/components/eventos/alocar-equipe-sheet";
import { PageHeader } from "@/components/commerce/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
 DialogDescription,
 DialogFooter,
} from "@/components/ui/dialog";
import {
 Table,
 TableBody,
 TableCell,
 TableHead,
 TableHeader,
 TableRow,
} from "@/components/ui/table";
import { CurrencyField } from "@/components/ui/currency-field";
import { EmptyState } from "@/components/state/states";
import {
 getAdminEventById,
 listEventLots,
 listEventTickets,
 upsertEventLot,
 deleteEventLot,
 issueComplimentaryTicket,
 validateTicketCheckin,
} from "@/services/events.functions";
import { formatMoney } from "@/lib/money";

export const Route = createFileRoute("/workspace/eventos/$id")({
 head: ({ loaderData }: { loaderData?: any }) => ({
 meta: [
 {
 title: loaderData?.event?.title
 ? `${loaderData.event.title} — Gestão do Evento`
 : "Gestão do Evento | Workspace Waesy",
 },
 ],
 }),
 loader: async ({ params }) => {
 try {
 const [event, lots, tickets] = await Promise.all([
 getAdminEventById({ data: params.id }),
 listEventLots({ data: params.id }),
 listEventTickets({ data: params.id }),
 ]);
 return { event, lots: lots || [], tickets: tickets || [] };
 } catch {
 return { event: null, lots: [], tickets: [] };
 }
 },
 component: SubPainelEventoPage,
});

function SubPainelEventoPage() {
 const { event, lots: initialLots, tickets: initialTickets } = ((Route.useLoaderData?.() as any) || {});
 const router = useRouter();

 const [activeTab, setActiveTab] = useState("ingressos");
 const [lots, setLots] = useState<any[]>(initialLots);
 const [tickets, setTickets] = useState<any[]>(initialTickets);
 const [isTeamSheetOpen, setIsTeamSheetOpen] = useState(false);

 // Lot Creation Modal
 const [isLotModalOpen, setIsLotModalOpen] = useState(false);
 const [isSavingLot, setIsSavingLot] = useState(false);
 const [lotForm, setLotForm] = useState({
 name: "",
 priceCents: 5000,
 capacity: 100,
 status: "active" as const,
 });

 // Complimentary Modal State
 const [isCompModalOpen, setIsCompModalOpen] = useState(false);
 const [isSavingComp, setIsSavingComp] = useState(false);
 const [compForm, setCompForm] = useState({
 lotId: "",
 recipientName: "",
 recipientEmail: "",
 recipientTaxId: "",
 });

 // Checkin in-place state
 const [quickCheckinInput, setQuickCheckinInput] = useState("");
 const [isValidating, setIsValidating] = useState(false);

 // Custos / Despesas State (DRE in-memory do evento)
 const [costs, setCosts] = useState<{ id: string; name: string; amountCents: number }[]>([
 { id: "1", name: "Sonorização & Iluminação de Palco", amountCents: 350000 },
 { id: "2", name: "Equipe de Segurança & Ambulância", amountCents: 180000 },
 { id: "3", name: "Gerador de Energia & Combustível", amountCents: 90000 },
 ]);
 const [newCostName, setNewCostName] = useState("");
 const [newCostCents, setNewCostCents] = useState(50000);

 if (!event) {
 return (
 <div className="space-y-6">
 <PageHeader title="Evento não encontrado" />
 <EmptyState
 title="Evento não localizado"
 description="O evento solicitado não existe ou você não possui permissão de acesso."
 />
 </div>
 );
 }

 // Métricas calculadas
 const totalCapacity = lots.reduce((acc, l) => acc + (l.capacity || 0), 0);
 const totalSold = lots.reduce((acc, l) => acc + (l.sold_count || 0), 0);
 const totalRevenueCents = lots.reduce(
 (acc, l) => acc + (l.sold_count || 0) * (l.price_cents || 0),
 0
 );
 const totalCheckins = tickets.filter((t) => t.status === "used").length;
 const totalCostsCents = costs.reduce((acc, c) => acc + c.amountCents, 0);
 const netProfitCents = totalRevenueCents - totalCostsCents;

 const handleCreateLot = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!lotForm.name.trim()) {
 toast.error("Informe o nome do lote.");
 return;
 }

 setIsSavingLot(true);
 try {
 const newLot = await upsertEventLot({
 data: {
 event_id: event.id,
 name: lotForm.name,
 price_cents: lotForm.priceCents,
 capacity: lotForm.capacity,
 status: lotForm.status,
 },
 });

 toast.success("Lote de ingressos criado com sucesso!");
 setLots((prev) => [...prev, newLot]);
 setIsLotModalOpen(false);
 setLotForm({
 name: "",
 priceCents: 5000,
 capacity: 100,
 status: "active",
 });
 router.invalidate();
 } catch (err: any) {
 toast.error(err?.message || "Erro ao salvar lote.");
 } finally {
 setIsSavingLot(false);
 }
 };

 const handleDeleteLot = async (lotId: string) => {
 if (!confirm("Tem certeza que deseja excluir este lote?")) return;
 try {
 await deleteEventLot({ data: { lotId } });
 toast.success("Lote excluído.");
 setLots((prev) => prev.filter((l) => l.id !== lotId));
 router.invalidate();
 } catch (err: any) {
 toast.error(err?.message || "Erro ao excluir lote.");
 }
 };

 const handleIssueComplimentary = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!compForm.lotId || !compForm.recipientName.trim()) {
 toast.error("Preencha o lote e o nome do convidado.");
 return;
 }

 setIsSavingComp(true);
 try {
 await issueComplimentaryTicket({
 data: {
 eventId: event.id,
 lotId: compForm.lotId,
 recipientName: compForm.recipientName,
 recipientEmail: compForm.recipientEmail || undefined,
 recipientTaxId: compForm.recipientTaxId || undefined,
 },
 });

 toast.success("Cortesia emitida com sucesso!");
 setIsCompModalOpen(false);
 setCompForm({
 lotId: "",
 recipientName: "",
 recipientEmail: "",
 recipientTaxId: "",
 });
 router.invalidate();
 } catch (err: any) {
 toast.error(err?.message || "Erro ao emitir cortesia.");
 } finally {
 setIsSavingComp(false);
 }
 };

 const handleQuickCheckin = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!quickCheckinInput.trim()) return;

 setIsValidating(true);
 try {
 const res = await validateTicketCheckin({
 data: { eventId: event.id, ticketCode: quickCheckinInput },
 });
 toast.success(`${res.name} validado(a) com sucesso! [${res.lotName}]`);
 setQuickCheckinInput("");
 router.invalidate();
 } catch (err: any) {
 toast.error(err?.message || "Código inválido ou já utilizado.");
 } finally {
 setIsValidating(false);
 }
 };

 const handleAddCost = (e: React.FormEvent) => {
 e.preventDefault();
 if (!newCostName.trim()) return;
 setCosts((prev) => [
 ...prev,
 { id: crypto.randomUUID(), name: newCostName, amountCents: newCostCents },
 ]);
 setNewCostName("");
 setNewCostCents(50000);
 toast.success("Custo lançado com sucesso!");
 };

 return (
 <div className="space-y-6">
 {/* Topbar & Breadcrumb */}
 <div className="flex items-center justify-between gap-4">
 <div className="flex items-center gap-3">
 <Button variant="ghost" size="icon" asChild>
 <Link to="/workspace/eventos">
 <ArrowLeft className="size-4" />
 </Link>
 </Button>
 <div>
 <div className="flex items-center gap-2">
 <h1 className="text-xl font-bold text-foreground">{event.title}</h1>
 <Badge variant="outline" className="text-xs">
 {event.category || "Evento"}
 </Badge>
 </div>
 <p className="text-xs text-muted-foreground">
 {event.location} • {new Date(event.event_date).toLocaleDateString("pt-BR")}
 </p>
 </div>
 </div>

 <div className="flex items-center gap-2">
 <Button
 variant="outline"
 size="sm"
 onClick={() => setIsTeamSheetOpen(true)}
 className="gap-1.5"
 >
 <Users className="size-4" />
 Escalar Equipe
 </Button>

 <Button asChild variant="outline" size="sm" className="gap-1.5">
 <Link to="/workspace/eventos/$id/checkin" params={{ id: event.id }}>
 <QrCode className="size-4" />
 Portaria Fullscreen
 </Link>
 </Button>

 <Button asChild variant="ghost" size="sm" className="gap-1.5">
 <Link to="/evento/$id" params={{ id: event.id }} target="_blank">
 <ExternalLink className="size-4" />
 Vitrine Pública
 </Link>
 </Button>
 </div>
 </div>

 {/* KPI Cards do Evento */}
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
 <div className="bg-card rounded-2xl p-4 border border-border/60">
 <span className="text-xs font-semibold text-muted-foreground">Ingressos Vendidos</span>
 <div className="text-2xl font-bold text-foreground mt-1">
 {totalSold} / {totalCapacity || "∞"}
 </div>
 </div>

 <div className="bg-card rounded-2xl p-4 border border-border/60">
 <span className="text-xs font-semibold text-muted-foreground">Faturamento Bruto</span>
 <div className="text-2xl font-bold text-foreground mt-1">
 {formatMoney(totalRevenueCents)}
 </div>
 </div>

 <div className="bg-card rounded-2xl p-4 border border-border/60">
 <span className="text-xs font-semibold text-muted-foreground">Entradas Validadas</span>
 <div className="text-2xl font-bold text-foreground mt-1">
 {totalCheckins} ({totalSold > 0 ? Math.round((totalCheckins / totalSold) * 100) : 0}%)
 </div>
 </div>

 <div className="bg-card rounded-2xl p-4 border border-border/60">
 <span className="text-xs font-semibold text-muted-foreground">Lucro Líquido Estimado</span>
 <div
 className={`text-2xl font-bold mt-1 ${
 netProfitCents >= 0 ? "text-emerald-600" : "text-rose-600"
 }`}
 >
 {formatMoney(netProfitCents)}
 </div>
 </div>
 </div>

 {/* Abas do Sub-Painel Recursivo */}
 <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
 <TabsList className="flex items-center gap-1.5 w-full overflow-x-auto no-scrollbar p-1.5 rounded-2xl h-auto mb-6 bg-muted/40 border border-border/40">
 <TabsTrigger value="ingressos" className="text-xs font-semibold gap-1.5 py-2 px-3 shrink-0">
 <Ticket className="size-3.5" />
 Lotes ({lots.length})
 </TabsTrigger>
 <TabsTrigger value="participantes" className="text-xs font-semibold gap-1.5 py-2 px-3 shrink-0">
 <Users className="size-3.5" />
 Inscritos ({tickets.length})
 </TabsTrigger>
 <TabsTrigger value="portaria" className="text-xs font-semibold gap-1.5 py-2 px-3 shrink-0">
 <QrCode className="size-3.5" />
 Portaria
 </TabsTrigger>
 <TabsTrigger value="kanban" className="text-xs font-semibold gap-1.5 py-2 px-3 shrink-0">
 <Kanban className="size-3.5" />
 Produção
 </TabsTrigger>
 <TabsTrigger value="lineup" className="text-xs font-semibold gap-1.5 py-2 px-3 shrink-0">
 <Mic2 className="size-3.5" />
 Line-up
 </TabsTrigger>
 <TabsTrigger value="setores" className="text-xs font-semibold gap-1.5 py-2 px-3 shrink-0">
 <Layers className="size-3.5" />
 Setores & Mapa
 </TabsTrigger>
 <TabsTrigger value="subpaineis" className="text-xs font-semibold gap-1.5 py-2 px-3 shrink-0">
 <Utensils className="size-3.5" />
 Bares & PDVs
 </TabsTrigger>
 <TabsTrigger value="orcamentos" className="text-xs font-semibold gap-1.5 py-2 px-3 shrink-0">
 <FileSpreadsheet className="size-3.5" />
 Orçamentos
 </TabsTrigger>
 <TabsTrigger value="custos" className="text-xs font-semibold gap-1.5 py-2 px-3 shrink-0">
 <TrendingUp className="size-3.5" />
 DRE / Custos
 </TabsTrigger>
 <TabsTrigger value="patrocinadores" className="text-xs font-semibold gap-1.5 py-2 px-3 shrink-0">
 <Megaphone className="size-3.5" />
 Patrocínio
 </TabsTrigger>
 <TabsTrigger value="documentos" className="text-xs font-semibold gap-1.5 py-2 px-3 shrink-0">
 <FileText className="size-3.5" />
 Alvarás & Legal
 </TabsTrigger>
 <TabsTrigger value="credenciais" className="text-xs font-semibold gap-1.5 py-2 px-3 shrink-0">
 <QrCode className="size-3.5" />
 Credenciais & Staff
 </TabsTrigger>
 <TabsTrigger value="auditoria" className="text-xs font-semibold gap-1.5 py-2 px-3 shrink-0">
 <ShieldCheck className="size-3.5" />
 Auditoria
 </TabsTrigger>
 </TabsList>

 {/* ── Aba 1: Lotes de Ingressos ── */}
 <TabsContent value="ingressos" className="space-y-4">
 <div className="flex items-center justify-between">
 <h3 className="text-sm font-bold text-foreground">Lotes & Setores de Ingressos</h3>
 <div className="flex items-center gap-2">
 <Button
 variant="outline"
 size="sm"
 onClick={() => setIsCompModalOpen(true)}
 className="gap-1.5"
 disabled={lots.length === 0}
 >
 <Gift className="size-4" />
 Emitir Cortesia
 </Button>
 <Button size="sm" onClick={() => setIsLotModalOpen(true)} className="gap-1.5">
 <Plus className="size-4" />
 Novo Lote
 </Button>
 </div>
 </div>

 {lots.length === 0 ? (
 <EmptyState
 title="Nenhum lote cadastrado"
 description="Crie o 1º lote de ingressos para abrir as vendas ao público."
 />
 ) : (
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 {lots.map((lot) => (
 <div
 key={lot.id}
 className="bg-card rounded-2xl p-4 border border-border/60 space-y-3"
 >
 <div className="flex items-center justify-between">
 <Badge variant="outline" className="text-[10px] uppercase font-mono">
 {lot.status === "active" ? "Ativo" : "Pausado"}
 </Badge>
 <div className="flex items-center gap-2">
 <span className="text-sm font-bold font-mono text-foreground">
 {formatMoney(lot.price_cents || 0)}
 </span>
 {(lot.sold_count || 0) === 0 && (
 <button
 onClick={() => handleDeleteLot(lot.id)}
 className="text-muted-foreground hover:text-destructive transition-colors"
 title="Excluir Lote"
 >
 <Trash2 className="size-3.5" />
 </button>
 )}
 </div>
 </div>

 <div>
 <h4 className="font-bold text-base text-foreground">{lot.name}</h4>
 <p className="text-xs text-muted-foreground mt-0.5">
 Capacidade: {lot.capacity || "Ilimitada"} ingressos
 </p>
 </div>

 <div className="pt-2 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
 <span>Vendidos: {lot.sold_count || 0}</span>
 <span>Disponíveis: {Math.max(0, (lot.capacity || 0) - (lot.sold_count || 0))}</span>
 </div>
 </div>
 ))}
 </div>
 )}
 </TabsContent>

 {/* ── Aba 2: Lista de Inscritos / Ingressos Emitidos ── */}
 <TabsContent value="participantes" className="space-y-4">
 <div className="flex items-center justify-between">
 <h3 className="text-sm font-bold text-foreground">Participantes & Ingressos Emitidos</h3>
 <span className="text-xs text-muted-foreground">
 Total: {tickets.length} ingressos gerados
 </span>
 </div>

 {tickets.length === 0 ? (
 <EmptyState
 title="Nenhum ingresso emitido ainda"
 description="Quando os participantes comprarem na vitrine ou receberem cortesias, eles aparecerão aqui."
 />
 ) : (
 <div className="bg-card rounded-2xl border border-border/60 overflow-hidden">
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead>Participante</TableHead>
 <TableHead>Setor / Lote</TableHead>
 <TableHead>Código / QR</TableHead>
 <TableHead>Status</TableHead>
 <TableHead>Data Emissão</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {tickets.map((t) => (
 <TableRow key={t.id}>
 <TableCell className="font-medium text-xs">
 {t.profiles?.full_name || "Participante"}
 {t.profiles?.tax_id && (
 <span className="block text-[10px] text-muted-foreground font-mono">
 CPF: {t.profiles.tax_id}
 </span>
 )}
 </TableCell>
 <TableCell className="text-xs font-medium">
 {t.ticket_lots?.name || "Lote Geral"}
 </TableCell>
 <TableCell className="text-xs font-mono text-muted-foreground">
 {t.qr_hash || t.id.substring(0, 8)}
 </TableCell>
 <TableCell>
 <Badge
 variant={
 t.status === "used"
 ? "secondary"
 : t.status === "valid"
 ? "default"
 : "outline"
 }
 className="text-[10px]"
 >
 {t.status === "used"
 ? "Entrada Realizada"
 : t.status === "valid"
 ? "Válido / Pendente"
 : t.status}
 </Badge>
 </TableCell>
 <TableCell className="text-xs text-muted-foreground">
 {new Date(t.created_at).toLocaleDateString("pt-BR")}
 </TableCell>
 </TableRow>
 ))}
 </TableBody>
 </Table>
 </div>
 )}
 </TabsContent>

 {/* ── Aba 3: Portaria & Check-in Rápido ── */}
 <TabsContent value="portaria" className="space-y-4">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
 {/* Validador In-Place */}
 <div className="bg-card rounded-2xl p-6 border border-border/60 space-y-4">
 <div>
 <h3 className="text-base font-bold text-foreground">Validador Rápido de Portaria</h3>
 <p className="text-xs text-muted-foreground mt-1">
 Digite o código do ingresso (ex: TKT-XXXX), CPF ou nome do titular para validar a entrada.
 </p>
 </div>

 <form onSubmit={handleQuickCheckin} className="flex gap-2">
 <Input
 required
 placeholder="Código, CPF ou QR Hash..."
 value={quickCheckinInput}
 onChange={(e) => setQuickCheckinInput(e.target.value)}
 className="font-mono text-xs"
 />
 <Button type="submit" disabled={isValidating} className="font-bold shrink-0">
 {isValidating ? "Validando..." : "Validar"}
 </Button>
 </form>

 <div className="pt-3 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
 <span>Check-ins Realizados: {totalCheckins}</span>
 <span>Pendentes: {Math.max(0, totalSold - totalCheckins)}</span>
 </div>
 </div>

 {/* Acesso Câmera Fullscreen */}
 <div className="bg-card rounded-2xl p-6 border border-border/60 space-y-4 flex flex-col justify-between">
 <div>
 <h3 className="text-base font-bold text-foreground">Scanner com Câmera ao Vivo</h3>
 <p className="text-xs text-muted-foreground mt-1">
 Abra a tela dedicada com scanner contínuo de QR Code via câmera para portarias de alta velocidade.
 </p>
 </div>

 <Button asChild variant="outline" className="gap-2 w-full">
 <Link to="/workspace/eventos/$id/checkin" params={{ id: event.id }}>
 <QrCode className="size-4" />
 Abrir Scanner em Tela Cheia
 </Link>
 </Button>
 </div>
 </div>
 </TabsContent>

        {/* ── Aba 4: Produção & Tarefas (Kanban) ── */}
        <TabsContent value="kanban" className="space-y-4">
          <EventoKanban eventId={event.id} />
        </TabsContent>

        {/* ── Aba 5: Line-up & Atrações ── */}
        <TabsContent value="lineup" className="space-y-4">
          <EventoLineup eventId={event.id} />
        </TabsContent>

        {/* ── Aba 6: Setores & Mapa de Capacidade ── */}
        <TabsContent value="setores" className="space-y-4">
          <EventoSetores eventId={event.id} />
        </TabsContent>

        {/* ── Aba 7: Bares, Caixas & PDVs Subpainéis ── */}
        <TabsContent value="subpaineis" className="space-y-4">
          <EventoSubpaineis eventId={event.id} />
        </TabsContent>

        {/* ── Aba 8: Orçamentos de Fornecedores ── */}
        <TabsContent value="orcamentos" className="space-y-4">
          <EventoOrcamentos eventId={event.id} />
        </TabsContent>

        {/* ── Aba 9: DRE & Custos Operacionais Reais ── */}
        <TabsContent value="custos" className="space-y-4">
          <EventoCustos eventId={event.id} />
        </TabsContent>

        {/* ── Aba 10: Marcas Patrocinadoras & Cotas ── */}
        <TabsContent value="patrocinadores" className="space-y-4">
          <EventoParceiros eventId={event.id} />
        </TabsContent>

        {/* ── Aba 11: Alvarás, Licenças & Documentação Legal ── */}
        <TabsContent value="documentos" className="space-y-4">
          <EventoDocumentos eventId={event.id} />
        </TabsContent>

        {/* ── Aba 12: Trilha de Auditoria & Segurança ── */}
        <TabsContent value="auditoria" className="space-y-4">
          <EventoAuditoria eventId={event.id} />
        </TabsContent>

        {/* ── Aba 13: Credenciais, Crachás & Staff (Persona Nexus) ── */}
        <TabsContent value="credenciais" className="space-y-4">
          <EventoCredenciais eventId={event.id} eventTitle={event.title} />
        </TabsContent>
      </Tabs>

      {/* Alocação de Equipe e Staff */}
      <AlocarEquipeSheet
        eventId={event.id}
        open={isTeamSheetOpen}
        onOpenChange={setIsTeamSheetOpen}
      />

 {/* Modal de Criação de Lote de Ingressos */}
 <Dialog open={isLotModalOpen} onOpenChange={setIsLotModalOpen}>
 <DialogContent className="sm:max-w-xl md:max-w-2xl">
 <DialogHeader>
 <DialogTitle>Novo Lote de Ingressos</DialogTitle>
 <DialogDescription>
 Defina o nome do setor/lote, preço em BRL e capacidade de ingressos.
 </DialogDescription>
 </DialogHeader>

 <form onSubmit={handleCreateLot} className="space-y-4">
 <div className="space-y-2">
 <Label htmlFor="lot-name">Nome do Lote / Setor *</Label>
 <Input
 id="lot-name"
 required
 value={lotForm.name}
 onChange={(e) => setLotForm({ ...lotForm, name: e.target.value })}
 placeholder="Ex: Pista — 1º Lote ou Camarote VIP"
 />
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-2">
 <Label htmlFor="lot-price">Valor (R$) *</Label>
 <CurrencyField
 value={lotForm.priceCents}
 onChange={(val) => setLotForm({ ...lotForm, priceCents: val || 0 })}
 />
 </div>

 <div className="space-y-2">
 <Label htmlFor="lot-cap">Capacidade (Qtd) *</Label>
 <Input
 id="lot-cap"
 type="number"
 required
 min={1}
 value={lotForm.capacity}
 onChange={(e) =>
 setLotForm({ ...lotForm, capacity: parseInt(e.target.value, 10) || 0 })
 }
 />
 </div>
 </div>

 <DialogFooter className="pt-2">
 <Button
 type="button"
 variant="ghost"
 onClick={() => setIsLotModalOpen(false)}
 >
 Cancelar
 </Button>
 <Button type="submit" disabled={isSavingLot} className="font-bold">
 {isSavingLot ? "Salvando..." : "Criar Lote"}
 </Button>
 </DialogFooter>
 </form>
 </DialogContent>
 </Dialog>

 {/* Modal de Emissão de Cortesia */}
 <Dialog open={isCompModalOpen} onOpenChange={setIsCompModalOpen}>
 <DialogContent className="sm:max-w-xl md:max-w-2xl">
 <DialogHeader>
 <DialogTitle>Emitir Ingresso Cortesia</DialogTitle>
 <DialogDescription>
 Gere um ingresso nominal gratuito com QR Code para convidados ou imprensa.
 </DialogDescription>
 </DialogHeader>

 <form onSubmit={handleIssueComplimentary} className="space-y-4">
 <div className="space-y-2">
 <Label htmlFor="comp-lot">Setor / Lote *</Label>
 <select
 id="comp-lot"
 required
 value={compForm.lotId}
 onChange={(e) => setCompForm({ ...compForm, lotId: e.target.value })}
 className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm"
 >
 <option value="">Selecione o Lote...</option>
 {lots.map((l) => (
 <option key={l.id} value={l.id}>
 {l.name}
 </option>
 ))}
 </select>
 </div>

 <div className="space-y-2">
 <Label htmlFor="comp-name">Nome do Convidado *</Label>
 <Input
 id="comp-name"
 required
 value={compForm.recipientName}
 onChange={(e) => setCompForm({ ...compForm, recipientName: e.target.value })}
 placeholder="Ex: João da Silva"
 />
 </div>

 <div className="space-y-2">
 <Label htmlFor="comp-cpf">CPF do Convidado (Opcional)</Label>
 <Input
 id="comp-cpf"
 value={compForm.recipientTaxId}
 onChange={(e) => setCompForm({ ...compForm, recipientTaxId: e.target.value })}
 placeholder="000.000.000-00"
 />
 </div>

 <DialogFooter className="pt-2">
 <Button
 type="button"
 variant="ghost"
 onClick={() => setIsCompModalOpen(false)}
 >
 Cancelar
 </Button>
 <Button type="submit" disabled={isSavingComp} className="font-bold">
 {isSavingComp ? "Emitindo..." : "Emitir Cortesia"}
 </Button>
 </DialogFooter>
 </form>
 </DialogContent>
 </Dialog>
 </div>
 );
}
