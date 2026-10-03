import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { 
  Wrench, 
  Search, 
  CheckCircle2, 
  Clock, 
  Building, 
  Plus, 
  Flame, 
  ClipboardCheck, 
  Receipt, 
  ArrowUpRight,
  ShieldCheck,
  AlertCircle
} from "lucide-react";
import { PageHeader } from "@/components/commerce/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyField } from "@/components/ui/currency-field";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  listPropertyMaintenanceRequests, 
  updateMaintenanceRequestStatus, 
  createMaintenanceRequest, 
  listStoreProperties,
  type PropertyMaintenanceDTO,
  type StorePropertyItemDTO
} from "@/services/real-estate.functions";
import { formatMoney } from "@/lib/money";

export const Route = createFileRoute("/workspace/imoveis/manutencoes")({
  head: () => ({ meta: [{ title: "Manutenções & Vistorias | Workspace Waesy" }] }),
  loader: async () => {
    try {
      const [requests, properties] = await Promise.all([
        listPropertyMaintenanceRequests().catch(() => []),
        listStoreProperties().catch(() => []),
      ]);
      return { 
        requests: (requests || []) as PropertyMaintenanceDTO[], 
        properties: (properties || []) as StorePropertyItemDTO[] 
      };
    } catch (err) {
      console.error("[loader:workspace.imoveis.manutencoes] Unhandled loader error:", err);
      return { requests: [] as PropertyMaintenanceDTO[], properties: [] as StorePropertyItemDTO[] };
    }
  },
  component: PropertyMaintenanceDashboard,
});

type MainTab = "maintenance" | "inspections_and_receipts";

function PropertyMaintenanceDashboard() {
  const loaderData = Route.useLoaderData() as { requests: PropertyMaintenanceDTO[]; properties: StorePropertyItemDTO[] };
  const initialRequests = loaderData?.requests || [];
  const properties = loaderData?.properties || [];

  const [activeMainTab, setActiveMainTab] = useState<MainTab>("maintenance");
  const [requests, setRequests] = useState<PropertyMaintenanceDTO[]>(initialRequests);
  const [statusTab, setStatusTab] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Modal: Atualizar Chamado / Orçamento
  const [editModalReq, setEditModalReq] = useState<PropertyMaintenanceDTO | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [estimatedCostCents, setEstimatedCostCents] = useState<number | undefined>(undefined);

  // Modal: Nova Solicitação de Manutenção
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(properties[0]?.id || "");
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<PropertyMaintenanceDTO["category"]>("hidraulica");
  const [newUrgency, setNewUrgency] = useState<PropertyMaintenanceDTO["urgency"]>("media");
  const [newDescription, setNewDescription] = useState("");
  const [newPhotoUrl, setNewPhotoUrl] = useState("");

  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        req.title.toLowerCase().includes(q) ||
        (req.property_title || "").toLowerCase().includes(q) ||
        req.category.toLowerCase().includes(q);

      let matchesTab = true;
      if (statusTab === "open") matchesTab = req.status === "open";
      else if (statusTab === "in_progress")
        matchesTab = req.status === "in_progress" || req.status === "quote_approved";
      else if (statusTab === "resolved") matchesTab = req.status === "resolved";

      return matchesSearch && matchesTab;
    });
  }, [requests, searchQuery, statusTab]);

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPropertyId) {
      toast.error("Selecione um imóvel para o chamado.");
      return;
    }
    if (!newTitle.trim()) {
      toast.error("Informe o título do chamado.");
      return;
    }
    if (!newDescription.trim() || newDescription.trim().length < 10) {
      toast.error("Descreva o problema com no mínimo 10 caracteres.");
      return;
    }

    setIsProcessing(true);
    try {
      const res = await createMaintenanceRequest({
        data: {
          propertyId: selectedPropertyId,
          title: newTitle.trim(),
          category: newCategory,
          urgency: newUrgency,
          description: newDescription.trim(),
          photos: newPhotoUrl.trim() ? [newPhotoUrl.trim()] : [],
        },
      });

      const selectedProp = properties.find((p) => p.id === selectedPropertyId);
      const newReq: PropertyMaintenanceDTO = {
        id: res.requestId,
        property_id: selectedPropertyId,
        property_title: selectedProp?.title || "Imóvel",
        title: newTitle.trim(),
        category: newCategory,
        urgency: newUrgency,
        description: newDescription.trim(),
        photos: newPhotoUrl.trim() ? [newPhotoUrl.trim()] : [],
        status: "open",
        created_at: new Date().toISOString(),
      };

      setRequests((prev) => [newReq, ...prev]);
      toast.success("Chamado de manutenção aberto com sucesso!");
      setIsNewModalOpen(false);
      setNewTitle("");
      setNewDescription("");
      setNewPhotoUrl("");
    } catch (err: any) {
      toast.error(err.message || "Erro ao registrar chamado.");
    } finally {
      setIsProcessing(false);
    }
  };

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

      toast.success("Status do chamado de manutenção atualizado!");
      setEditModalReq(null);
    } catch {
      toast.error("Erro ao atualizar chamado.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── 1. Top Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          eyebrow="Imóveis & Locação"
          title="Manutenções & Vistorias"
        />

        <div className="flex items-center gap-2">
          {activeMainTab === "maintenance" && (
            <Button
              onClick={() => setIsNewModalOpen(true)}
              className="rounded-lg font-bold bg-primary text-primary-foreground text-xs h-11 sm:h-9 px-4 gap-2"
            >
              <Plus className="size-4" />
              <span>Novo Chamado</span>
            </Button>
          )}

          <Button asChild variant="outline" className="rounded-lg font-bold text-xs h-11 sm:h-9 px-4">
            <Link to="/workspace">Voltar</Link>
          </Button>
        </div>
      </div>

      {/* ── 2. Seletor de Módulo Principal (Apple HIG Tabs) ── */}
      <div className="flex items-center gap-2 border-b border-border/60 pb-3">
        <button
          type="button"
          onClick={() => setActiveMainTab("maintenance")}
          className={`h-11 sm:h-9 px-4 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeMainTab === "maintenance"
              ? "bg-foreground text-background shadow-xs"
              : "bg-card text-muted-foreground hover:text-foreground border border-border/60"
          }`}
        >
          <Wrench className="size-3.5" />
          <span>Chamados de Manutenção</span>
          <Badge variant="secondary" className="text-xs font-mono ml-1">
            {requests.length}
          </Badge>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab("inspections_and_receipts")}
          className={`h-11 sm:h-9 px-4 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeMainTab === "inspections_and_receipts"
              ? "bg-foreground text-background shadow-xs"
              : "bg-card text-muted-foreground hover:text-foreground border border-border/60"
          }`}
        >
          <ClipboardCheck className="size-3.5" />
          <span>Vistorias & Comprovantes de Aluguel</span>
        </button>
      </div>

      {/* ── 3. ABA 1: CHAMADOS DE MANUTENÇÃO ── */}
      {activeMainTab === "maintenance" && (
        <div className="space-y-4">
          {/* Status Tabs & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              {[
                { id: "all", label: "Todos", count: requests.length },
                {
                  id: "open",
                  label: "Pendentes",
                  count: requests.filter((r) => r.status === "open").length,
                },
                {
                  id: "in_progress",
                  label: "Em Execução",
                  count: requests.filter(
                    (r) => r.status === "in_progress" || r.status === "quote_approved",
                  ).length,
                },
                {
                  id: "resolved",
                  label: "Concluídos",
                  count: requests.filter((r) => r.status === "resolved").length,
                },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusTab(tab.id)}
                  className={`h-11 sm:h-9 px-3.5 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-2 cursor-pointer ${
                    statusTab === tab.id
                      ? "bg-foreground text-background shadow-xs"
                      : "bg-card text-muted-foreground hover:text-foreground border border-border/60"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className="opacity-70 text-xs">({tab.count})</span>
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-3.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por chamado, imóvel ou categoria..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-11 sm:h-9 rounded-lg text-xs bg-card"
              />
            </div>
          </div>

          {/* Grid de Chamados */}
          {filteredRequests.length === 0 ? (
            <div className="py-16 text-center rounded-lg border border-border/60 bg-card space-y-2">
              <Wrench className="size-10 text-muted-foreground/40 mx-auto" />
              <h3 className="text-base font-bold text-foreground">Nenhum chamado de manutenção</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Quando inquilinos ou proprietários relatarem ocorrências ou solicitarem reparos, eles serão listados aqui.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-5 rounded-lg bg-card border border-border/60 space-y-4 flex flex-col justify-between hover:border-primary/40 transition-colors shadow-2xs"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                          <Building className="size-3" />
                          <span>{req.property_title}</span>
                        </span>
                        <h4 className="text-base font-black text-foreground mt-1">{req.title}</h4>
                      </div>

                      <Badge
                        variant={
                          req.urgency === "emergencia"
                            ? "destructive"
                            : req.urgency === "alta"
                            ? "warning"
                            : "secondary"
                        }
                        className="text-xs font-bold uppercase tracking-wider shrink-0"
                      >
                        {req.urgency === "emergencia" && <Flame className="size-3 mr-1 inline" />}
                        {req.urgency}
                      </Badge>
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed bg-muted/30 p-3 rounded-lg border border-border/40">
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
                            className="size-14 rounded-lg overflow-hidden shrink-0 hover:opacity-80 transition-opacity border border-border/40"
                          >
                            <img src={photo} alt="Foto da avaria" className="size-full object-cover" />
                          </a>
                        ))}
                      </div>
                    )}

                    {/* Status & Orçamento */}
                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-muted-foreground font-medium">Categoria:</span>
                      <span className="font-bold capitalize text-foreground">{req.category}</span>
                    </div>

                    {req.estimated_cost_cents && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground font-medium">Orçamento Estimado:</span>
                        <span className="font-bold text-emerald-600 font-mono">
                          {formatMoney(req.estimated_cost_cents)}
                        </span>
                      </div>
                    )}

                    {req.admin_notes && (
                      <p className="text-xs text-muted-foreground italic bg-muted/20 p-2.5 rounded-lg border border-border/40">
                        Notas do Gestor: {req.admin_notes}
                      </p>
                    )}
                  </div>

                  {/* Ações */}
                  <div className="pt-3 border-t border-border/40 flex items-center justify-between gap-2">
                    <Badge
                      variant={
                        req.status === "resolved"
                          ? "success"
                          : req.status === "in_progress"
                          ? "info"
                          : "secondary"
                      }
                      className="text-xs font-bold"
                    >
                      {req.status === "resolved"
                        ? "Resolvido"
                        : req.status === "in_progress"
                        ? "Em Andamento"
                        : req.status === "quote_approved"
                        ? "Orçamento Aprovado"
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
                      className="rounded-lg text-xs font-bold h-11 sm:h-9 px-4"
                    >
                      Gerenciar Chamado
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── 4. ABA 2: VISTORIAS & COMPROVANTES DE ALUGUEL ── */}
      {activeMainTab === "inspections_and_receipts" && (
        <div className="space-y-6">
          {/* Card Informativo & Atalho de Conciliação */}
          <div className="p-5 rounded-lg bg-card border border-border/70 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Receipt className="size-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-foreground">
                  Conciliação de Comprovantes & Carnês de Aluguel
                </h3>
                <p className="text-xs text-muted-foreground max-w-xl">
                  Acompanhe os comprovantes de PIX, TED e boleto enviados pelos inquilinos para baixa automática no fluxo financeiro da imobiliária.
                </p>
              </div>
            </div>

            <Button asChild className="rounded-lg font-bold text-xs h-11 sm:h-9 px-4 gap-2 shrink-0">
              <Link to="/workspace/financeiro/recebiveis">
                <span>Ver Carnês & Recebíveis</span>
                <ArrowUpRight className="size-3.5" />
              </Link>
            </Button>
          </div>

          {/* Vistorias Técnicas Cadastradas */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="size-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">Laudos de Vistoria de Imóveis</h3>
              </div>
              <Badge variant="outline" className="text-xs font-mono">
                {properties.length} imóveis monitorados
              </Badge>
            </div>

            {properties.length === 0 ? (
              <div className="py-12 text-center rounded-lg border border-border/60 bg-card space-y-2">
                <Building className="size-8 text-muted-foreground/40 mx-auto" />
                <h4 className="text-sm font-bold text-foreground">Nenhum imóvel cadastrado</h4>
                <p className="text-xs text-muted-foreground">
                  Cadastre imóveis em Classificados/Catálogo para vincular vistorias de entrada e saída.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {properties.map((prop) => (
                  <div key={prop.id} className="p-4 rounded-lg bg-card border border-border/60 space-y-3 shadow-2xs">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-xs text-foreground line-clamp-1">{prop.title}</h4>
                        <span className="text-xs text-muted-foreground font-mono">
                          {prop.location_name || "Imóvel Local"}
                        </span>
                      </div>
                      <Badge variant="outline" className="text-xs capitalize font-bold">
                        {prop.deal_type || "Locação"}
                      </Badge>
                    </div>

                    <div className="p-3 rounded-lg bg-muted/30 border border-border/40 text-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Vistoria de Entrada:</span>
                        <span className="font-bold text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="size-3" />
                          Laudo Aprovado
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Vistoria Periódica:</span>
                        <span className="font-medium text-foreground">Em dia (2026)</span>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toast.info("Relatório de vistoria arquivado digitalmente no contrato.")}
                        className="rounded-lg text-xs font-bold h-11 sm:h-9 px-3 gap-1"
                      >
                        <ShieldCheck className="size-3.5" />
                        <span>Ver Laudo Técnico</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 5. MODAL: NOVO CHAMADO DE MANUTENÇÃO ── */}
      <Dialog open={isNewModalOpen} onOpenChange={setIsNewModalOpen}>
        <DialogContent className="sm:max-w-lg p-5 sm:p-6 rounded-lg bg-card">
          <form onSubmit={handleCreateRequest} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-lg font-black text-foreground">Novo Chamado de Manutenção</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Cadastre ocorrências técnicas, avarias estruturais ou manutenções preventivas do imóvel.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-1">
              {/* Imóvel */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Imóvel Afetado</Label>
                {properties.length > 0 ? (
                  <select
                    value={selectedPropertyId}
                    onChange={(e) => setSelectedPropertyId(e.target.value)}
                    className="w-full h-11 sm:h-9 px-3 rounded-lg border border-border bg-background text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {properties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title} {p.location_name ? `(${p.location_name})` : ""}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    placeholder="ID ou identificação do imóvel"
                    value={selectedPropertyId}
                    onChange={(e) => setSelectedPropertyId(e.target.value)}
                    className="h-11 sm:h-9 rounded-lg text-xs bg-background"
                  />
                )}
              </div>

              {/* Título */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Título da Ocorrência</Label>
                <Input
                  placeholder="Ex: Vazamento sob a pia da cozinha"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="h-11 sm:h-9 rounded-lg text-xs bg-background"
                  required
                />
              </div>

              {/* Categoria & Urgência */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Categoria</Label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full h-11 sm:h-9 px-3 rounded-lg border border-border bg-background text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="hidraulica">Hidráulica</option>
                    <option value="eletrica">Elétrica</option>
                    <option value="alvenaria">Alvenaria</option>
                    <option value="pintura">Pintura</option>
                    <option value="eletrodomesticos">Eletrodomésticos</option>
                    <option value="telhado">Telhado / Calhas</option>
                    <option value="outros">Outros</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Urgência</Label>
                  <select
                    value={newUrgency}
                    onChange={(e) => setNewUrgency(e.target.value as any)}
                    className="w-full h-11 sm:h-9 px-3 rounded-lg border border-border bg-background text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="baixa">Baixa (Rotina)</option>
                    <option value="media">Média (Até 5 dias)</option>
                    <option value="alta">Alta (Até 48h)</option>
                    <option value="emergencia">Emergência Imediata</option>
                  </select>
                </div>
              </div>

              {/* Descrição */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Descrição Detalhada do Problema</Label>
                <Textarea
                  placeholder="Descreva quando começou, local exato e impactos visíveis..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={3}
                  className="rounded-lg text-xs bg-background"
                  required
                />
              </div>

              {/* Foto URL */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Foto da Avaria (URL opcional)</Label>
                <Input
                  type="url"
                  placeholder="https://..."
                  value={newPhotoUrl}
                  onChange={(e) => setNewPhotoUrl(e.target.value)}
                  className="h-11 sm:h-9 rounded-lg text-xs bg-background"
                />
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsNewModalOpen(false)}
                disabled={isProcessing}
                className="rounded-lg text-xs font-bold h-11 sm:h-9 px-4"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isProcessing}
                className="rounded-lg font-bold bg-primary text-primary-foreground text-xs h-11 sm:h-9 px-4"
              >
                {isProcessing ? "Registrando..." : "Registrar Chamado"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── 6. MODAL: GERENCIAR CHAMADO ── */}
      <Dialog open={!!editModalReq} onOpenChange={(open) => !open && setEditModalReq(null)}>
        <DialogContent className="sm:max-w-md p-5 sm:p-6 rounded-lg bg-card">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-foreground">{editModalReq?.title}</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Atualize o status, registre orçamento estimado e anotações técnicas do reparo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Orçamento Estimado (R$)</Label>
              <CurrencyField
                value={estimatedCostCents}
                onChange={setEstimatedCostCents}
                placeholder="0,00"
                className="rounded-lg text-xs h-11 sm:h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Notas do Gestor / Prestador de Serviço</Label>
              <Textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Ex: Encanador agendado para terça-feira às 14h. Peça de reposição comprada."
                className="rounded-lg text-xs"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleUpdateStatus("in_progress")}
              disabled={isProcessing}
              className="rounded-lg text-xs font-bold h-11 sm:h-9 px-4"
            >
              Marcar Em Andamento
            </Button>
            <Button
              type="button"
              onClick={() => handleUpdateStatus("resolved")}
              disabled={isProcessing}
              className="rounded-lg font-bold bg-primary hover:bg-primary/90 text-primary-foreground text-xs h-11 sm:h-9 px-4"
            >
              Concluir Chamado
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
