import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  Zap, GitBranch, MessageSquare, Mail, Tag, Plus, Play, Trash2,
  ToggleLeft, ToggleRight, CheckCircle2, ArrowRight, Settings2,
  Clock, ShoppingCart, UserPlus, TrendingUp, Package, Calendar,
} from "lucide-react";
import { PageHeader } from "@/components/commerce/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from "@/components/ui/sheet";
import { EmptyState } from "@/components/state/states";
import {
  listWorkflows,
  createWorkflow,
  toggleWorkflowStatus,
  deleteWorkflow,
  triggerWorkflowExecution,
} from "@/services/automation.functions";

export const Route = createFileRoute("/workspace/automacoes")({
  head: () => ({ meta: [{ title: "Workflows & Automações | Waesy" }] }),
  loader: async () => {
    try {
      const workflows = await listWorkflows();
      return { workflows };
    } catch (err) {
      console.error("[loader:workspace.automacoes] Unhandled loader error:", err);
      return { workflows: [] };
    }
  },
  component: AutomacoesWorkflowsPage,
});

const TRIGGER_META: Record<string, { label: string; icon: any; color: string }> = {
  order_paid: {
    label: "Pedido Pago",
    icon: CheckCircle2,
    color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/30",
  },
  order_created: {
    label: "Pedido Criado",
    icon: ShoppingCart,
    color: "text-blue-500 bg-blue-500/10 border-blue-500/30",
  },
  order_cancelled: {
    label: "Pedido Cancelado",
    icon: Trash2,
    color: "text-rose-500 bg-rose-500/10 border-rose-500/30",
  },
  customer_created: {
    label: "Novo Cliente",
    icon: UserPlus,
    color: "text-violet-500 bg-violet-500/10 border-violet-500/30",
  },
  lead_created: {
    label: "Lead Criado",
    icon: TrendingUp,
    color: "text-amber-500 bg-amber-500/10 border-amber-500/30",
  },
  lead_won: {
    label: "Lead Ganho",
    icon: CheckCircle2,
    color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/30",
  },
  lead_lost: {
    label: "Lead Perdido",
    icon: Trash2,
    color: "text-rose-500 bg-rose-500/10 border-rose-500/30",
  },
  booking_confirmed: {
    label: "Reserva Confirmada",
    icon: Calendar,
    color: "text-sky-500 bg-sky-500/10 border-sky-500/30",
  },
  booking_cancelled: {
    label: "Reserva Cancelada",
    icon: Calendar,
    color: "text-rose-500 bg-rose-500/10 border-rose-500/30",
  },
  cart_abandoned: {
    label: "Carrinho Abandonado",
    icon: ShoppingCart,
    color: "text-amber-500 bg-amber-500/10 border-amber-500/30",
  },
  product_low_stock: {
    label: "Estoque Baixo",
    icon: Package,
    color: "text-orange-500 bg-orange-500/10 border-orange-500/30",
  },
  manual: {
    label: "Manual / API",
    icon: Settings2,
    color: "text-muted-foreground bg-muted border-border",
  },
};

// Preview visual de nós canônicos do workflow
const WORKFLOW_PREVIEW_NODES = [
  { id: "1", type: "trigger", icon: Zap, label: "Gatilho" },
  { id: "2", type: "condition", icon: GitBranch, label: "Condição" },
  { id: "3", type: "action", icon: MessageSquare, label: "Ação WhatsApp" },
  { id: "4", type: "action", icon: Tag, label: "Adicionar Tag" },
];

function AutomacoesWorkflowsPage() {
  const { workflows: initialWorkflows } = ((Route.useLoaderData?.() as any) || {});
  const router = useRouter();

  const [workflows, setWorkflows] = useState<any[]>(initialWorkflows || []);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [executingId, setExecutingId] = useState<string | null>(null);

  const handleRunTest = async (wf: any) => {
    setExecutingId(wf.id);
    try {
      const res = await triggerWorkflowExecution({ data: { id: wf.id } });
      toast.success(
        `Workflow "${wf.title}" executado com sucesso! (${res.result.actions_dispatched} nós acionados)`
      );
      setWorkflows((prev) =>
        prev.map((w) =>
          w.id === wf.id
            ? { ...w, execution_count: res.execution_count, last_run_at: res.last_run_at }
            : w
        )
      );
    } catch (err: any) {
      toast.error(err?.message || "Erro ao executar teste do workflow.");
    } finally {
      setExecutingId(null);
    }
  };

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [triggerType, setTriggerType] = useState<string>("order_paid");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { toast.error("Dê um nome ao workflow."); return; }
    setIsSaving(true);
    try {
      const created = await createWorkflow({
        data: { title: title.trim(), description: description.trim() || null, triggerType: triggerType as any },
      });
      toast.success("Workflow criado com sucesso!");
      setWorkflows((prev) => [created, ...prev]);
      setIsCreateOpen(false);
      setTitle("");
      setDescription("");
      setTriggerType("order_paid");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao criar workflow.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = async (wf: any) => {
    setLoadingId(wf.id);
    try {
      const isActive = wf.status === "active";
      await toggleWorkflowStatus({ data: { id: wf.id, active: !isActive } });
      setWorkflows((prev) =>
        prev.map((w) => w.id === wf.id ? { ...w, status: !isActive ? "active" : "inactive" } : w)
      );
      toast.success(isActive ? "Workflow desativado." : "Workflow ativado!");
    } catch {
      toast.error("Erro ao alterar status.");
    } finally {
      setLoadingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deletar este workflow permanentemente?")) return;
    setLoadingId(id);
    try {
      await deleteWorkflow({ data: { id } });
      setWorkflows((prev) => prev.filter((w) => w.id !== id));
      toast.success("Workflow removido.");
    } catch {
      toast.error("Erro ao deletar workflow.");
    } finally {
      setLoadingId(null);
    }
  };

  const activeCount = workflows.filter((w) => w.status === "active").length;

  return (
    <div className="w-full max-w-7xl mx-auto px-0 sm:px-4 md:px-0 space-y-6 pb-20 animate-in fade-in duration-200">
      {/* ── Header ── */}
      <PageHeader
        title="Automações Visuais"
        description="Réguas de relacionamento, disparos e integrações automáticas."
        actions={
          <Button
            onClick={() => setIsCreateOpen(true)}
            className="rounded-2xl min-h-[44px] font-bold gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Novo Workflow
          </Button>
        }
      />

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-card rounded-2xl border border-border/60 p-4 space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Total de Workflows
          </span>
          <div className="text-2xl font-black text-foreground">{workflows.length}</div>
        </div>
        <div className="bg-card rounded-2xl border border-border/60 p-4 space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Ativos</span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{activeCount}</div>
        </div>
        <div className="bg-card rounded-2xl border border-border/60 p-4 space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Rascunhos</span>
          <div className="text-2xl font-black text-amber-500">
            {workflows.filter((w) => w.status === "draft").length}
          </div>
        </div>
        <div className="bg-card rounded-2xl border border-border/60 p-4 space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Execuções</span>
          <div className="text-2xl font-black text-foreground">
            {workflows.reduce((sum, w) => sum + (w.execution_count || 0), 0)}
          </div>
        </div>
      </div>

      {/* ── Preview Visual do Motor de Automação ── */}
      <div className="bg-card/70 backdrop-blur-xl border border-border/50 p-8 rounded-3xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-foreground">Motor de Automação Visual em Nós</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Arraste triggers, condições e ações para criar fluxos inteligentes.
            </p>
          </div>
          <Badge variant="outline" className="text-[10px] font-bold uppercase px-2.5 py-1 gap-1 border-emerald-500/30 text-emerald-600 bg-emerald-500/10">
            <Zap className="size-3 text-emerald-500" />
            Motor de Disparo Ativo
          </Badge>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 justify-center py-4">
          {WORKFLOW_PREVIEW_NODES.map((node, idx) => {
            const Icon = node.icon;
            const colors = [
              "text-amber-500 bg-amber-500/10 border-amber-500/30",
              "text-blue-500 bg-blue-500/10 border-blue-500/30",
              "text-emerald-500 bg-emerald-500/10 border-emerald-500/30",
              "text-violet-500 bg-violet-500/10 border-violet-500/30",
            ];
            return (
              <div key={node.id} className="flex flex-col sm:flex-row items-center gap-4">
                <div
                  className={`p-4 rounded-2xl border w-52 text-center space-y-2 ${colors[idx]} transition-all hover:scale-105 cursor-default`}
                >
                  <div className="flex items-center justify-center">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h4 className="font-bold text-sm text-foreground">{node.label}</h4>
                  <Badge variant="outline" className="text-[10px] uppercase font-bold py-0.5 px-2">
                    {node.type}
                  </Badge>
                </div>
                {idx < WORKFLOW_PREVIEW_NODES.length - 1 && (
                  <ArrowRight className="h-5 w-5 text-muted-foreground rotate-90 sm:rotate-0 shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Lista de Workflows Reais ── */}
      <div className="space-y-3">
        <h3 className="font-bold text-sm text-foreground px-1">Seus Workflows</h3>

        {workflows.length === 0 ? (
          <EmptyState
            title="Nenhum workflow criado ainda"
            description="Crie seu primeiro workflow para automatizar réguas de CRM, disparo de mensagens e integrações."
          />
        ) : (
          <div className="space-y-3">
            {workflows.map((wf: any) => {
              const meta = TRIGGER_META[wf.trigger_type] || TRIGGER_META.manual;
              const Icon = meta.icon;
              const isActive = wf.status === "active";
              const isLoading = loadingId === wf.id;

              return (
                <div
                  key={wf.id}
                  className="bg-card rounded-2xl border border-border/60 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 group hover:border-primary/30 transition-all"
                >
                  <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
                    <div
                      className={`size-11 rounded-xl border flex items-center justify-center shrink-0 ${meta.color}`}
                    >
                      <Icon className="size-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm text-foreground truncate">{wf.title}</h4>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant="outline" className="text-[10px] font-semibold px-1.5 py-0">
                          {meta.label}
                        </Badge>
                        <Badge
                          variant={isActive ? "default" : "secondary"}
                          className={`text-[10px] font-bold px-1.5 py-0 ${isActive ? "bg-emerald-600 text-white" : ""}`}
                        >
                          {isActive ? "Ativo" : wf.status === "draft" ? "Rascunho" : "Inativo"}
                        </Badge>
                        {wf.execution_count > 0 && (
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {wf.execution_count} execuções
                          </span>
                        )}
                        {wf.last_run_at && (
                          <span className="text-[10px] text-muted-foreground hidden sm:inline">
                            Última: {new Date(wf.last_run_at).toLocaleDateString("pt-BR")}
                          </span>
                        )}
                      </div>
                      {wf.description && (
                        <p className="text-[11px] text-muted-foreground mt-1 truncate">{wf.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t border-border/40 sm:border-0 w-full sm:w-auto">
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={isLoading || executingId === wf.id}
                      onClick={() => handleRunTest(wf)}
                      className="size-11 sm:size-9 rounded-xl text-primary hover:bg-primary/10 cursor-pointer"
                      title="Disparar Teste Manual do Workflow"
                    >
                      {executingId === wf.id ? (
                        <Clock className="size-4 animate-spin text-primary" />
                      ) : (
                        <Play className="size-4 fill-primary/20 text-primary" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={isLoading || executingId === wf.id}
                      onClick={() => handleToggle(wf)}
                      className={`size-11 sm:size-9 rounded-xl cursor-pointer ${isActive ? "text-emerald-600" : "text-muted-foreground"}`}
                      title={isActive ? "Desativar" : "Ativar"}
                    >
                      {isActive ? <ToggleRight className="size-5" /> : <ToggleLeft className="size-5" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={isLoading || executingId === wf.id}
                      onClick={() => handleDelete(wf.id)}
                      className="size-11 sm:size-9 rounded-xl text-muted-foreground hover:text-destructive cursor-pointer"
                      title="Deletar"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Sheet: Criar Novo Workflow ── */}
      <Sheet open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <SheetContent side="right" size="wide" className="w-full sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw] flex flex-col justify-between overflow-y-auto">
          <div>
            <SheetHeader className="pb-4">
              <SheetTitle>Novo Workflow</SheetTitle>
              <SheetDescription>
                Configure o gatilho e nomeie seu workflow. Os nós de ação serão configurados no editor visual.
              </SheetDescription>
            </SheetHeader>
            <form id="create-workflow-form" onSubmit={handleCreate} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Nome do Workflow</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Pós-Venda VIP — Pedido Acima de R$ 200"
                  className="text-xs"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Gatilho Disparador</Label>
                <Select value={triggerType} onValueChange={setTriggerType}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Selecione o gatilho..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TRIGGER_META).map(([key, meta]) => {
                      const Icon = meta.icon;
                      return (
                        <SelectItem key={key} value={key} className="text-xs">
                          <div className="flex items-center gap-2">
                            <Icon className="size-3.5" />
                            {meta.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Descrição (opcional)</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descreva o objetivo deste workflow para sua equipe..."
                  rows={3}
                  className="text-xs"
                />
              </div>
            </form>
          </div>
          <SheetFooter className="pt-4 border-t border-border/40">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateOpen(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form="create-workflow-form"
              disabled={isSaving}
              className="text-xs font-bold"
            >
              {isSaving ? "Criando..." : "Criar Workflow"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
