import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Zap, GitBranch, MessageSquare, Mail, Tag, Plus, Play, Trash2, ToggleLeft, ToggleRight, CheckCircle2, ArrowRight, Settings2, Clock, ShoppingCart, UserPlus, TrendingUp, Package, Calendar } from "lucide-react";
import { PageHeader } from "@/components/commerce/page-header";
import { Button } from "@/components/ui/button";
import { CrudActionsMenu } from "@/components/ui/crud-actions-menu";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { EmptyState } from "@/components/state/states";
import { listWorkflows, createWorkflow, toggleWorkflowStatus, deleteWorkflow, triggerWorkflowExecution, seedCanonicalAutomationWorkflows } from "@/services/automation.functions";

export const Route = createFileRoute("/workspace/automacoes")({
  head: () => ({ meta: [{ title: "Workflows e Automações | Waesy" }] }),
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

const TRIGGER_META: Record<string, { label: string; icon: any; color: string; defaultTemplate?: string }> = {
  greeting_message: {
    label: "Mensagem de Saudação (1º Contato)",
    icon: MessageSquare,
    color: "text-success bg-success/10 border-success/30",
    defaultTemplate: "Olá {nome}! Seja bem-vindo ao nosso atendimento oficial. Como podemos ajudar hoje?",
  },
  away_hours: {
    label: "Ausência / Fora de Horário Comercial",
    icon: Clock,
    color: "text-warning-strong bg-warning/10 border-warning/30",
    defaultTemplate: "Olá {nome}, recebemos sua mensagem! Nosso expediente encerrou, mas retornaremos no próximo horário útil.",
  },
  keyword_auto_reply: {
    label: "Resposta Rápida por Palavra-Chave",
    icon: Zap,
    color: "text-primary bg-primary/10 border-primary/30",
    defaultTemplate: "Olá {nome}! Seguem as informações solicitadas e o link oficial: {link_dossie}",
  },
  funnel_stage_changed: {
    label: "Mudança de Etapa do Funil CRM",
    icon: GitBranch,
    color: "text-primary bg-primary/10 border-primary/30",
    defaultTemplate: "Olá {nome}, seu atendimento avançou para a etapa de proposta! Confira os detalhes em: {link_dossie}",
  },
  customer_birthday: {
    label: "Aniversário do Cliente",
    icon: Calendar,
    color: "text-primary bg-primary/10 border-primary/30",
    defaultTemplate: "Olá {nome}, parabéns pelo seu dia! Preparamos uma condição especial para sua próxima viagem rumo a {destino}. Acesse: {link_dossie}",
  },
  travel_approaching_d7: {
    label: "Viagem se Aproximando (D-7 / D-2 / D-1)",
    icon: Clock,
    color: "text-warning-strong bg-warning/10 border-warning/30",
    defaultTemplate: "Olá {nome}, faltam poucos dias para seu embarque rumo a {destino} em {data_viagem} às {hora}. Confira seu dossiê: {link_dossie}",
  },
  travel_reminder_24h: {
    label: "Lembrete de Embarque (D-1 / 24h)",
    icon: Clock,
    color: "text-warning-strong bg-warning/10 border-warning/30",
    defaultTemplate: "Olá {nome}, sua viagem para {destino} parte amanhã ({data_viagem}) às {hora}. Confira seus vouchers: {link_dossie}",
  },
  post_checkin_welcome: {
    label: "Boas-Vindas Pós-Embarque / Check-in",
    icon: CheckCircle2,
    color: "text-success bg-success/10 border-success/30",
    defaultTemplate: "Olá {nome}, desejamos uma excelente chegada em {destino}! Seu roteiro completo está em: {link_dossie}",
  },
  post_return_nps: {
    label: "Pesquisa de Satisfação Pós-Retorno (D+1)",
    icon: MessageSquare,
    color: "text-primary bg-primary/10 border-primary/30",
    defaultTemplate: "Olá {nome}, bem-vindo de volta de {destino}! De 0 a 10, como foi sua experiência conosco? Avalie em: {link_dossie}",
  },
  quote_followup_24h: {
    label: "Follow-up de Orçamento Aberto (24h/48h)",
    icon: TrendingUp,
    color: "text-warning-strong bg-warning/10 border-warning/30",
    defaultTemplate: "Olá {nome}, conseguimos manter a tarifa da sua cotação para {destino} em {data_viagem}. Confira os detalhes: {link_dossie}",
  },
  payment_due_reminder: {
    label: "Cobrança Preventiva / Amigável (Pix)",
    icon: Tag,
    color: "text-primary bg-primary/10 border-primary/30",
    defaultTemplate: "Olá {nome}, lembramos que a parcela referente a {destino} ({data_viagem}) vence hoje. Acesse seu dossiê: {link_dossie}",
  },
  order_paid: {
    label: "Pedido Pago",
    icon: CheckCircle2,
    color: "text-success bg-success/10 border-success/30",
  },
  order_created: {
    label: "Pedido Criado",
    icon: ShoppingCart,
    color: "text-primary bg-primary/10 border-primary/30",
  },
  order_cancelled: {
    label: "Pedido Cancelado",
    icon: Trash2,
    color: "text-destructive bg-destructive/10 border-destructive/30",
  },
  customer_created: {
    label: "Novo Cliente",
    icon: UserPlus,
    color: "text-primary bg-primary/10 border-primary/30",
  },
  lead_created: {
    label: "Lead Criado",
    icon: TrendingUp,
    color: "text-warning-strong bg-warning/10 border-warning/30",
  },
  lead_won: {
    label: "Lead Ganho",
    icon: CheckCircle2,
    color: "text-success bg-success/10 border-success/30",
  },
  lead_lost: {
    label: "Lead Perdido",
    icon: Trash2,
    color: "text-destructive bg-destructive/10 border-destructive/30",
  },
  booking_confirmed: {
    label: "Reserva Confirmada",
    icon: Calendar,
    color: "text-primary bg-primary/10 border-primary/30",
  },
  booking_cancelled: {
    label: "Reserva Cancelada",
    icon: Calendar,
    color: "text-destructive bg-destructive/10 border-destructive/30",
  },
  cart_abandoned: {
    label: "Carrinho Abandonado",
    icon: ShoppingCart,
    color: "text-warning-strong bg-warning/10 border-warning/30",
  },
  product_low_stock: {
    label: "Estoque Baixo",
    icon: Package,
    color: "text-warning-strong bg-warning/10 border-warning/30",
  },
  manual: {
    label: "Manual / API",
    icon: Settings2,
    color: "text-muted-foreground bg-muted border-border",
  },
};

const DYNAMIC_VARIABLES = ["{nome}", "{destino}", "{data_viagem}", "{hora}", "{link_dossie}"];

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
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleRunTest = async (wf: any) => {
    setExecutingId(wf.id);
    try {
      const res = await triggerWorkflowExecution({ data: { id: wf.id } });
      toast.success(
        `Workflow "${wf.title}" executado (${res.result.actions_dispatched} ação WhatsApp disparada).`
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

  const handleSeedCanonical = async () => {
    setIsSeeding(true);
    try {
      const res = await seedCanonicalAutomationWorkflows();
      setWorkflows(res.workflows || []);
      toast.success(
        res.inserted > 0
          ? `${res.inserted} gatilhos canônicos instalados com sucesso.`
          : "Todos os 6 gatilhos canônicos já estão configurados."
      );
    } catch (err: any) {
      toast.error(err?.message || "Erro ao instalar gatilhos canônicos.");
    } finally {
      setIsSeeding(false);
    }
  };

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [triggerType, setTriggerType] = useState<string>("customer_birthday");
  const [sendTime, setSendTime] = useState<string>("09:00");
  const [delayMinutes, setDelayMinutes] = useState<number>(0);
  const [messageTemplate, setMessageTemplate] = useState<string>(
    TRIGGER_META.customer_birthday.defaultTemplate || ""
  );

  const handleTriggerChange = (val: string) => {
    setTriggerType(val);
    const meta = TRIGGER_META[val];
    if (meta?.defaultTemplate) {
      setMessageTemplate(meta.defaultTemplate);
    }
  };

  const handleInsertVariable = (variable: string) => {
    setMessageTemplate((prev) => `${prev}${prev.endsWith(" ") || !prev ? "" : " "}${variable}`);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { toast.error("Dê um nome ao workflow."); return; }
    setIsSaving(true);
    try {
      const created = await createWorkflow({
        data: {
          title: title.trim(),
          description: description.trim() || null,
          triggerType: triggerType as any,
          sendTime: sendTime || "09:00",
          delayMinutes: Number(delayMinutes) || 0,
          messageTemplate: messageTemplate.trim() || null,
        },
      });
      toast.success("Workflow criado com sucesso.");
      setWorkflows((prev) => [created, ...prev]);
      setIsCreateOpen(false);
      setTitle("");
      setDescription("");
      setTriggerType("customer_birthday");
      setSendTime("09:00");
      setDelayMinutes(0);
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
      toast.success(isActive ? "Workflow desativado." : "Workflow ativado.");
    } catch {
      toast.error("Erro ao alterar status.");
    } finally {
      setLoadingId(null);
    }
  };

  const handleDelete = async (id: string) => {
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
    <div className="w-full px-0 sm:px-4 md:px-0 space-y-6 pb-20 animate-in fade-in duration-200">
      {/* ── Header ── */}
      <PageHeader /* design-lint-ignore DL-15 reason:"onClick pertence a controle interno do slot; o elemento em si nao e interativo" expiry:"2027-12-31" */
        title="Automações Visuais"
        description="Réguas de relacionamento, disparos e integrações automáticas."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isSeeding}
              onClick={handleSeedCanonical}
              className="rounded-lg min-h-11 font-bold gap-2"
            >
              <Zap className="h-4 w-4" />
              {isSeeding ? "Instalando..." : "Gatilhos Canônicos"}
            </Button>
            <Button asChild variant="outline" className="rounded-lg min-h-11 font-bold gap-2">
              <Link to="/workspace/whatsapp/automacoes">
                <MessageSquare className="h-4 w-4" />
                WhatsApp
              </Link>
            </Button>
            <Button
              onClick={() => setIsCreateOpen(true)}
              className="rounded-lg min-h-11 font-bold gap-2"
            >
              <Plus className="h-4 w-4" />
              Novo Workflow
            </Button>
          </div>
        }
      />

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-card rounded-lg border border-border/60 p-4 space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Total de Workflows
          </span>
          <div className="text-2xl font-black text-foreground">{workflows.length}</div>
        </div>
        <div className="bg-card rounded-lg border border-border/60 p-4 space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ativos</span>
          <div className="text-2xl font-black text-success">{activeCount}</div>
        </div>
        <div className="bg-card rounded-lg border border-border/60 p-4 space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Rascunhos</span>
          <div className="text-2xl font-black text-warning-strong">
            {workflows.filter((w) => w.status === "draft").length}
          </div>
        </div>
        <div className="bg-card rounded-lg border border-border/60 p-4 space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Execuções</span>
          <div className="text-2xl font-black text-foreground">
            {workflows.reduce((sum, w) => sum + (w.execution_count || 0), 0)}
          </div>
        </div>
      </div>

      {/* ── Preview Visual do Motor de Automação ── */}
      <div className="bg-card border border-border/50 p-8 rounded-lg space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-foreground">Motor de Automação Visual em Nós</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Arraste triggers, condições e ações para criar fluxos inteligentes.
            </p>
          </div>
          <Badge variant="outline" className="text-xs font-bold uppercase px-3 py-1 gap-1 border-success/30 text-success bg-success/10">
            <Zap className="size-3 text-success" />
            Motor de Disparo Ativo
          </Badge>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 justify-center py-4">
          {WORKFLOW_PREVIEW_NODES.map((node, idx) => {
            const Icon = node.icon;
            const colors = [
              "text-warning-strong bg-warning/10 border-warning/30",
              "text-primary bg-primary/10 border-primary/30",
              "text-success bg-success/10 border-success/30",
              "text-primary bg-primary/10 border-primary/30",
            ];
            return (
              <div key={node.id} className="flex flex-col sm:flex-row items-center gap-4">
                <div
                  className={`p-4 rounded-lg border w-52 text-center space-y-2 ${colors[idx]} transition-transform duration-200 hover:scale-105 cursor-default`}
                >
                  <div className="flex items-center justify-center">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h4 className="font-bold text-sm text-foreground">{node.label}</h4>
                  <Badge variant="outline" className="text-xs uppercase font-bold py-1 px-2">
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
              const actionNode = Array.isArray(wf.nodes)
                ? wf.nodes.find((n: any) => n.type === "action") || wf.nodes[0]
                : null;
              const wfSendTime = actionNode?.config?.sendTime;
              const wfDelayMinutes = actionNode?.config?.delayMinutes;

              return (
                <div
                  key={wf.id}
                  className="bg-card rounded-lg border border-border/60 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 group hover:border-primary/30 transition-colors duration-200"
                >
                  <div className="flex items-center gap-4 sm:gap-4 min-w-0">
                    <div
                      className={`size-11 rounded-lg border flex items-center justify-center shrink-0 ${meta.color}`}
                    >
                      <Icon className="size-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm text-foreground truncate">{wf.title}</h4>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant="outline" className="text-xs font-semibold px-2 py-0">
                          {meta.label}
                        </Badge>
                        <Badge
                          variant={isActive ? "default" : "secondary"}
                          className={`text-xs font-bold px-2 py-0 ${isActive ? "bg-success text-foreground" : ""}`}
                        >
                          {isActive ? "Ativo" : wf.status === "draft" ? "Rascunho" : "Inativo"}
                        </Badge>
                        {wfSendTime && (
                          <Badge variant="outline" className="text-xs font-mono px-2 py-0">
                            Disparo: {wfSendTime}
                          </Badge>
                        )}
                        {typeof wfDelayMinutes === "number" && wfDelayMinutes > 0 && (
                          <Badge variant="outline" className="text-xs font-mono px-2 py-0">
                            Delay: +{wfDelayMinutes}min
                          </Badge>
                        )}
                        {wf.execution_count > 0 && (
                          <span className="text-xs text-muted-foreground font-mono">
                            {wf.execution_count} execuções
                          </span>
                        )}
                        {wf.last_run_at && (
                          <span className="text-xs text-muted-foreground hidden sm:inline">
                            Última: {new Date(wf.last_run_at).toLocaleDateString("pt-BR")}
                          </span>
                        )}
                      </div>
                      {wf.description && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">{wf.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t border-border/40 sm:border-0 w-full sm:w-auto">
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={isLoading || executingId === wf.id}
                      onClick={() => handleRunTest(wf)}
                      className="size-11 sm:size-9 rounded-lg text-primary hover:bg-primary/10 cursor-pointer min-h-11 sm:min-h-0 min-w-11 sm:min-w-0"
                      title="Disparar Teste Manual do Workflow"
                    >
                      {executingId === wf.id ? (
                        <Clock className="size-4 animate-spin motion-reduce:animate-none text-primary" />
                      ) : (
                        <Play className="size-4 fill-primary/20 text-primary" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={isLoading || executingId === wf.id}
                      onClick={() => handleToggle(wf)}
                      className={`size-11 sm:size-9 rounded-lg cursor-pointer ${isActive ? "text-success" : "text-muted-foreground"} min-h-11 sm:min-h-0 min-w-11 sm:min-w-0`}
                      title={isActive ? "Desativar" : "Ativar"}
                    >
                      {isActive ? <ToggleRight className="size-5" /> : <ToggleLeft className="size-5" />}
                    </Button>
                    <CrudActionsMenu
                      entityName="Automação"
                      onToggleStatus={() => handleToggle(wf)}
                      statusLabel={isActive ? "Pausar Workflow" : "Ativar Workflow"}
                      onDelete={() => handleDelete(wf.id)}
                      deleteConfirmTitle={`Excluir automação "${wf.title || wf.name}"?`}
                      deleteConfirmDescription="Esta ação removerá permanentemente o gatilho, as condições e as ações automatizadas deste fluxo."
                      customActions={[
                        {
                          id: "execute-now",
                          label: "Disparar Teste Manual",
                          icon: Play,
                          onClick: () => handleRunTest(wf),
                          disabled: isLoading || executingId === wf.id,
                        },
                      ]}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Sheet: Criar Novo Workflow ── */}
      <Sheet open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <SheetContent side="right" size="wide" className="w-full sm:max-w-3xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl flex flex-col justify-between overflow-y-auto overscroll-contain">
          <div>
            <SheetHeader className="pb-4">
              <SheetTitle>Novo Workflow</SheetTitle>
              <SheetDescription>
                Configure o gatilho, horário de envio, delay e template com variáveis dinâmicas.
              </SheetDescription>
            </SheetHeader>
            <form id="create-workflow-form" onSubmit={handleCreate} className="space-y-4 py-2">
              <div className="space-y-2">
                <Label className="text-xs">Nome do Workflow</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Check-list Pré-Embarque D-7"
                  className="text-xs min-h-11"
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2 sm:col-span-1">
                  <Label className="text-xs">Gatilho Disparador</Label>
                  <Select value={triggerType} onValueChange={handleTriggerChange}>
                    <SelectTrigger className="text-xs min-h-11">
                      <SelectValue placeholder="Selecione o gatilho..." />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TRIGGER_META).map(([key, meta]) => {
                        const Icon = meta.icon;
                        return (
                          <SelectItem key={key} value={key} className="text-xs">
                            <div className="flex items-center gap-2">
                              <Icon className="size-4" />
                              {meta.label}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Horário de Envio</Label>
                  <Input
                    type="time"
                    value={sendTime}
                    onChange={(e) => setSendTime(e.target.value)}
                    className="text-xs min-h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Delay após Evento (minutos)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={5}
                    value={delayMinutes}
                    onChange={(e) => setDelayMinutes(Number(e.target.value))}
                    className="text-xs min-h-11"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <Label className="text-xs">Template da Mensagem WhatsApp</Label>
                  <div className="flex flex-wrap gap-2">
                    {DYNAMIC_VARIABLES.map((v) => (
                      <Button
                        key={v}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleInsertVariable(v)}
                        className="min-h-11 px-3 text-xs font-mono"
                      >
                        {v}
                      </Button>
                    ))}
                  </div>
                </div>
                <Textarea
                  value={messageTemplate}
                  onChange={(e) => setMessageTemplate(e.target.value)}
                  placeholder="Olá {nome}, sua viagem para {destino} em {data_viagem} às {hora} está confirmada. Acesse: {link_dossie}"
                  rows={3}
                  className="text-xs font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Descrição Interna (opcional)</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descreva o objetivo deste workflow para sua equipe..."
                  rows={2}
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
              className="text-xs min-h-11"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form="create-workflow-form"
              variant="outline"
              disabled={isSaving}
              className="text-xs font-bold min-h-11 border-primary/40 text-primary hover:bg-primary/10"
            >
              {isSaving ? "Criando..." : "Criar Workflow"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
