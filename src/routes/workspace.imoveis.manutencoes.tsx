import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Wrench, Search, CheckCircle2, Clock, AlertTriangle, FileText, DollarSign, Building, Image as ImageIcon, ExternalLink, Plus, Flame } from "lucide-react";
import { PageHeader } from "@/components/commerce/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyField } from "@/components/ui/currency-field";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { listPropertyMaintenanceRequests, updateMaintenanceRequestStatus, createMaintenanceRequest, type PropertyMaintenanceDTO } from "@/services/real-estate.functions";
import { formatMoney } from "@/lib/money";

export const Route = createFileRoute("/workspace/imoveis/manutencoes")({
  head: () => ({ meta: [{ title: "Manutenções | Workspace Waesy" }] }),
  loader: async () => {
    try {
      return (await listPropertyMaintenanceRequests().catch(() => [])) || [];
    } catch (err) {
      console.error("[loader:workspace.imoveis.manutencoes] Unhandled loader error:", err);
      return [];
    }
  },
  component: PropertyMaintenanceDashboard,
});

function PropertyMaintenanceDashboard() {
 const initialData = Route.useLoaderData();
 const router = useRouter();
 const [requests, setRequests] = useState<PropertyMaintenanceDTO[]>(initialData);
 const [statusTab, setStatusTab] = useState<string>("all");
 const [searchQuery, setSearchQuery] = useState("");
 const [isProcessing, setIsProcessing] = useState(false);

 // Modal: Atualizar Chamado / OrÃ§amento
 const [editModalReq, setEditModalReq] = useState<PropertyMaintenanceDTO | null>(null);
 const [adminNotes, setAdminNotes] = useState("");
 const [estimatedCostCents, setEstimatedCostCents] = useState<number | undefined>(undefined);

 // Modal: Nova SolicitaÃ§Ã£o de ManutenÃ§Ã£o
 const [isNewModalOpen, setIsNewModalOpen] = useState(false);
 const [newTitle, setNewTitle] = useState("");
 const [newCategory, setNewCategory] = useState<any>("hidraulica");
 const [newUrgency, setNewUrgency] = useState<any>("media");
 const [newDescription, setNewDescription] = useState("");
 const [newPhotoUrl, setNewPhotoUrl] = useState("");

 const filteredRequests = useMemo(() => {
 return requests.filter((req) => {
 const q = searchQuery.toLowerCase();
 const matchesSearch =
 req.title.toLowerCase().includes(q) ||
 req.property_title?.toLowerCase().includes(q) ||
 req.category.toLowerCase().includes(q);

 let matchesTab = true;
 if (statusTab === "open") matchesTab = req.status === "open";
 else if (statusTab === "in_progress")
 matchesTab = req.status === "in_progress" || req.status === "quote_approved";
 else if (statusTab === "resolved") matchesTab = req.status === "resolved";

 return matchesSearch && matchesTab;
 });
 }, [requests, searchQuery, statusTab]);

 const handleUpdateStatus = async (status: PropertyMaintenanceDTO["status"]) => {
 if (!editModalReq) return;
 setIsProcessing(true);
 try {
 const costCents = estimatedCostCents;

 await updateMaintenanceRequestStatus({
 data: {
 requestId: editModalReq.id,
 status,
 adminNotes: adminNotes.trim() || undefined,
 estimatedCostCents: costCents,
 },
 });

 setRequests((prev) =>
 prev.map((r) =>
 r.id === editModalReq.id
 ? {
 ...r,
 status,
 admin_notes: adminNotes.trim() || r.admin_notes,
 estimated_cost_cents: costCents || r.estimated_cost_cents,
 }
 : r,
 ),
 );

 toast.success("Status do chamado de manutenÃ§Ã£o atualizado!");
 setEditModalReq(null);
 } catch {
 toast.error("Erro ao atualizar chamado.");
 } finally {
 setIsProcessing(false);
 }
 };

 return (
 <div className="space-y-6">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
 <PageHeader
 eyebrow="ImÃ³veis"
 title="ManutenÃ§Ãµes"
 />

 <div className="flex items-center gap-2">
 <Button
 onClick={() => setIsNewModalOpen(true)}
 className="rounded-xl font-bold bg-primary text-primary-foreground text-xs gap-1.5"
 >
 <Plus className="size-4" />
 <span>Novo Chamado</span>
 </Button>
 <Button asChild variant="outline" className="rounded-xl font-bold text-xs">
 <Link to="/workspace">Voltar</Link>
 </Button>
 </div>
 </div>

 {/* Tabs & Search */}
 <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
 <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 ">
 {[
 { id: "all", label: "Todos", count: requests.length },
 {
 id: "open",
 label: "Pendentes",
 count: requests.filter((r) => r.status === "open").length,
 },
 {
 id: "in_progress",
 label: "Em ExecuÃ§Ã£o",
 count: requests.filter(
 (r) => r.status === "in_progress" || r.status === "quote_approved",
 ).length,
 },
 {
 id: "resolved",
 label: "ConcluÃ­dos",
 count: requests.filter((r) => r.status === "resolved").length,
 },
 ].map((tab) => (
 <button
 key={tab.id}
 onClick={() => setStatusTab(tab.id)}
 className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
 statusTab === tab.id
 ? "bg-foreground text-background "
 : "bg-card text-muted-foreground hover:text-foreground"
 }`}
 >
 <span>{tab.label}</span>
 <span className="opacity-70 text-[10px]">({tab.count})</span>
 </button>
 ))}
 </div>

 <div className="relative w-full sm:w-72">
 <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
 <Input
 placeholder="Buscar por chamado, imÃ³vel ou categoria..."
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="pl-9 h-9 rounded-xl text-xs bg-card"
 />
 </div>
 </div>

 {/* Grid de Chamados */}
 {filteredRequests.length === 0 ? (
 <div className="py-16 text-center rounded-2xl border border-border/60 bg-card space-y-2">
 <Wrench className="size-10 text-muted-foreground/40 mx-auto" />
 <h3 className="text-base font-bold text-foreground">Nenhum chamado de manutenÃ§Ã£o</h3>
 <p className="text-xs text-muted-foreground max-w-sm mx-auto">
 Quando inquilinos ou proprietÃ¡rios relatarem ocorrÃªncias ou solicitarem reparos, eles serÃ£o listados aqui.
 </p>
 </div>
 ) : (
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 {filteredRequests.map((req) => (
 <div
 key={req.id}
 className="p-5 rounded-2xl bg-card border border-border/60 space-y-4 flex flex-col justify-between hover:border-primary/40 transition-colors"
 >
 <div className="space-y-3">
 <div className="flex items-start justify-between gap-2">
 <div>
 <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
 <Building className="size-3" />
 <span>{req.property_title}</span>
 </span>
 <h4 className="text-base font-black text-foreground mt-0.5">{req.title}</h4>
 </div>

 <Badge
 variant={
 req.urgency === "emergencia"
 ? "destructive"
 : req.urgency === "alta"
 ? "warning"
 : "secondary"
 }
 className="text-[10px] font-bold uppercase tracking-wider shrink-0"
 >
 {req.urgency === "emergencia" && <Flame className="size-3 mr-1 inline" />}
 {req.urgency}
 </Badge>
 </div>

 <p className="text-xs text-muted-foreground leading-relaxed bg-muted/30 p-2.5 rounded-xl border border-border/40">
 {req.description}
 </p>

 {/* Fotos */}
 {req.photos && req.photos.length > 0 && (
 <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
 {req.photos.map((photo, i) => (
 <a
 key={i}
 href={photo}
 target="_blank"
 rel="noreferrer"
 className="size-14 rounded-xl overflow-hidden shrink-0 hover:opacity-80 transition-opacity border border-border/40"
 >
 <img src={photo} alt="Foto da avaria" className="size-full object-cover" />
 </a>
 ))}
 </div>
 )}

 {/* Status & OrÃ§amento */}
 <div className="flex items-center justify-between text-xs pt-1">
 <span className="text-muted-foreground font-medium">Categoria:</span>
 <span className="font-bold capitalize text-foreground">{req.category}</span>
 </div>

 {req.estimated_cost_cents && (
 <div className="flex items-center justify-between text-xs">
 <span className="text-muted-foreground font-medium">OrÃ§amento Estimado:</span>
 <span className="font-bold text-emerald-600 font-mono">
 {formatMoney(req.estimated_cost_cents)}
 </span>
 </div>
 )}

 {req.admin_notes && (
 <p className="text-[11px] text-muted-foreground italic bg-info/10 p-2 rounded-lg border border-info/20">
 Notas do Gestor: {req.admin_notes}
 </p>
 )}
 </div>

 {/* AÃ§Ãµes */}
 <div className="pt-3 border-t border-border/40 flex items-center justify-between gap-2">
 <Badge
 variant={
 req.status === "resolved"
 ? "success"
 : req.status === "in_progress"
 ? "info"
 : "secondary"
 }
 className="text-[10px] font-bold"
 >
 {req.status === "resolved"
 ? "Resolvido âœ“"
 : req.status === "in_progress"
 ? "Em Andamento"
 : req.status === "quote_approved"
 ? "OrÃ§amento Aprovado"
 : "Aberto"}
 </Badge>

 <Button
 size="sm"
 variant="outline"
 onClick={() => {
 setEditModalReq(req);
 setAdminNotes(req.admin_notes || "");
 setEstimatedCostCents(req.estimated_cost_cents || undefined);
 }}
 className="rounded-xl text-xs font-bold h-8"
 >
 Gerenciar Chamado
 </Button>
 </div>
 </div>
 ))}
 </div>
 )}

 {/* Modal: Gerenciar Chamado */}
 <Dialog open={!!editModalReq} onOpenChange={(open) => !open && setEditModalReq(null)}>
 <DialogContent className="sm:max-w-md sm:p-6 sm:rounded-2xl bg-card">
 <DialogHeader>
 <DialogTitle className="text-lg font-black">{editModalReq?.title}</DialogTitle>
 <DialogDescription className="text-xs">
 Atualize o status, registre orÃ§amento e anotaÃ§Ãµes tÃ©cnicas do reparo.
 </DialogDescription>
 </DialogHeader>

 <div className="space-y-4 py-2">
 <div className="space-y-1.5">
 <Label className="text-xs font-bold">OrÃ§amento Estimado (R$)</Label>
 <CurrencyField
 value={estimatedCostCents}
 onChange={setEstimatedCostCents}
 placeholder="0,00"
 className="rounded-xl text-xs"
 />
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-bold">Notas do Gestor / Prestador de ServiÃ§o</Label>
 <Textarea
 value={adminNotes}
 onChange={(e) => setAdminNotes(e.target.value)}
 placeholder="Ex: Encanador agendado para terÃ§a-feira Ã s 14h. PeÃ§a de reposiÃ§Ã£o comprada."
 className="rounded-xl text-xs"
 rows={3}
 />
 </div>
 </div>

 <DialogFooter className="flex-col sm:flex-row gap-2">
 <Button
 variant="outline"
 onClick={() => handleUpdateStatus("in_progress")}
 disabled={isProcessing}
 className="rounded-xl text-xs font-bold"
 >
 Marcar Em Andamento
 </Button>
 <Button
 onClick={() => handleUpdateStatus("resolved")}
 disabled={isProcessing}
 className="rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
 >
 Concluir e Baixar Chamado
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </div>
 );
}
